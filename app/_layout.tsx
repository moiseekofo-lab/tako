import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useStore } from './store';

const LAST_ACTIVITY_KEY = 'tako:lastActivityAt';
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 10 * 1000;

const APP_FONT_FAMILY = Platform.select({
  android: 'Roboto',
  ios: 'System',
  web: 'Inter',
  default: 'Arial',
});

type FontPatchGlobal = typeof globalThis & {
  __takoFontPatchApplied?: boolean;
};

const normalizeFontSize = (fontSize: number, styleName: string, hasCustomFont: boolean) => {
  if (hasCustomFont) return fontSize;

  const name = styleName.toLowerCase();
  if (/menu|navigation|navtext/.test(name)) return 14;
  if (/secondary|subtitle|hint|meta|caption|description|muted|date|email/.test(name)) return 14;
  if (/buttontext|buttonlabel|ctatext|actiontext|entertext|continuetext/.test(name)) return 17;
  if (/sectiontitle/.test(name)) return 22;
  if (/cardtitle|optiontitle|itemtitle|providertitle|providertext|internaltitle/.test(name)) return 18;
  if (/headertitle|pagetitle|logintitle|recoverytitle|greeting|profiletitle/.test(name) || name === 'title') return 24;

  if (fontSize >= 24) return 24;
  if (fontSize >= 21) return 22;
  if (fontSize >= 18) return 18;
  if (fontSize >= 16) return 16;
  return 14;
};

const patchFontSizes = (value: unknown, styleName = ''): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => patchFontSizes(item, styleName));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const style = value as Record<string, unknown>;
  const nextStyle: Record<string, unknown> = {};
  const hasCustomFont = typeof style.fontFamily === 'string';

  Object.entries(style).forEach(([key, item]) => {
    if (key === 'fontSize' && typeof item === 'number') {
      nextStyle[key] = normalizeFontSize(item, styleName, hasCustomFont);
      return;
    }

    nextStyle[key] = patchFontSizes(item, key);
  });

  if (
    APP_FONT_FAMILY &&
    typeof nextStyle.fontSize === 'number' &&
    typeof nextStyle.fontFamily !== 'string'
  ) {
    nextStyle.fontFamily = APP_FONT_FAMILY;
  }

  return nextStyle;
};

const globalState = globalThis as FontPatchGlobal;
const ADMIN_DESKTOP_MIN_WIDTH = 1024;

if (!globalState.__takoFontPatchApplied) {
  const originalCreate = StyleSheet.create as unknown as (styles: any) => any;

  StyleSheet.create = ((styles: any) => originalCreate(patchFontSizes(styles))) as typeof StyleSheet.create;

  const PatchedText = Text as typeof Text & { defaultProps?: Record<string, unknown> };
  const PatchedTextInput = TextInput as typeof TextInput & { defaultProps?: Record<string, unknown> };

  PatchedText.defaultProps = {
    ...PatchedText.defaultProps,
    maxFontSizeMultiplier: 1.2,
  };
  PatchedTextInput.defaultProps = {
    ...PatchedTextInput.defaultProps,
    maxFontSizeMultiplier: 1.2,
  };

  globalState.__takoFontPatchApplied = true;
}

function AdminDesktopGate({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const [browserReady, setBrowserReady] = useState(false);

  useEffect(() => {
    setBrowserReady(true);
  }, []);

  const isAdminDomain =
    Platform.OS === 'web' &&
    browserReady &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'admin.takotransport.online' ||
      window.location.hostname.startsWith('admin.'));
  const isMobileDevice =
    Platform.OS === 'web' &&
    browserReady &&
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
  const isDriverLogin =
    Platform.OS === 'web' &&
    browserReady &&
    typeof window !== 'undefined' &&
    (window.location.pathname === '/driver-login' ||
      (window.location.pathname === '/login' &&
        new URLSearchParams(window.location.search).get('access') === 'chauffeur'));
  const isPublicActivation =
    Platform.OS === 'web' &&
    browserReady &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/agent-prepaid' &&
    Boolean(new URLSearchParams(window.location.search).get('uid'));

  if (isAdminDomain && !isDriverLogin && !isPublicActivation && (isMobileDevice || width < ADMIN_DESKTOP_MIN_WIDTH)) {
    return (
      <View style={gateStyles.page}>
        <View style={gateStyles.card}>
          <View style={gateStyles.icon}>
            <Text style={gateStyles.iconText}>🖥️</Text>
          </View>
          <Text style={gateStyles.title}>Accès sur ordinateur uniquement</Text>
          <Text style={gateStyles.message}>
            L’espace d’administration TaKo n’est pas disponible sur téléphone ou tablette.
            Veuillez ouvrir cette page depuis un ordinateur.
          </Text>
          <Text style={gateStyles.address}>admin.takotransport.online</Text>
        </View>
      </View>
    );
  }

  return children;
}

function SessionIdleGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const currentRole = useStore((state) => state.currentUser.role);
  const clearSession = useStore((state) => state.clearSession);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastPersistedRef = useRef(0);
  const loggingOutRef = useRef(false);

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const logoutForInactivity = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    clearIdleTimer();

    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
    clearSession();
    router.replace('/login' as any);

    loggingOutRef.current = false;
  }, [clearIdleTimer, clearSession, router]);

  const scheduleLogout = useCallback((lastActivity: number) => {
    clearIdleTimer();
    const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);

    if (remaining <= 0) {
      void logoutForInactivity();
      return;
    }

    timerRef.current = setTimeout(() => {
      void logoutForInactivity();
    }, remaining);
  }, [clearIdleTimer, logoutForInactivity]);

  const registerActivity = useCallback(() => {
    const idleLogoutEnabled = currentRole === 'passager' || currentRole === 'agent';
    if (!isAuthenticated || !idleLogoutEnabled) return;

    const now = Date.now();
    lastActivityRef.current = now;
    scheduleLogout(now);

    if (now - lastPersistedRef.current >= ACTIVITY_WRITE_THROTTLE_MS) {
      lastPersistedRef.current = now;
      void AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    }
  }, [currentRole, isAuthenticated, scheduleLogout]);

  useEffect(() => {
    let active = true;

    const restoreSessionTimer = async () => {
      const storedActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
      if (!active) return;

      const idleLogoutEnabled = currentRole === 'passager' || currentRole === 'agent';
      const sessionExists = isAuthenticated && idleLogoutEnabled;

      if (!sessionExists) {
        clearIdleTimer();
        lastActivityRef.current = Date.now();
        lastPersistedRef.current = 0;
        await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
        return;
      }

      const parsedActivity = Number(storedActivity);
      const lastActivity = Number.isFinite(parsedActivity) && parsedActivity > 0
        ? parsedActivity
        : Date.now();
      lastActivityRef.current = lastActivity;

      if (!storedActivity) {
        await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivity));
      }
      scheduleLogout(lastActivity);
    };

    void restoreSessionTimer();
    return () => {
      active = false;
    };
  }, [clearIdleTimer, currentRole, isAuthenticated, pathname, scheduleLogout]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const idleLogoutEnabled = currentRole === 'passager' || currentRole === 'agent';
      if (state === 'active' && isAuthenticated && idleLogoutEnabled) {
        const inactiveFor = Date.now() - lastActivityRef.current;
        if (inactiveFor >= IDLE_TIMEOUT_MS) {
          void logoutForInactivity();
        } else {
          scheduleLogout(lastActivityRef.current);
        }
      }
    });

    return () => subscription.remove();
  }, [currentRole, isAuthenticated, logoutForInactivity, scheduleLogout]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const events: Array<keyof DocumentEventMap> = [
      'pointerdown',
      'keydown',
      'mousemove',
      'wheel',
      'touchstart',
      'scroll',
    ];
    events.forEach((event) => document.addEventListener(event, registerActivity, { passive: true }));

    return () => {
      events.forEach((event) => document.removeEventListener(event, registerActivity));
    };
  }, [registerActivity]);

  useEffect(() => clearIdleTimer, [clearIdleTimer]);

  return (
    <View
      style={idleStyles.container}
      onTouchStart={registerActivity}
      onStartShouldSetResponderCapture={() => {
        registerActivity();
        return false;
      }}
    >
      {children}
    </View>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Alkatra: require('../assets/fonts/Alkatra.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AdminDesktopGate>
      <SessionIdleGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="driver-login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="home" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="agent" />
          <Stack.Screen name="qr" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="nfc" />
          <Stack.Screen name="recharge" />
          <Stack.Screen name="internal-recharge-scan" />
          <Stack.Screen name="client-nfc-qr" />
          <Stack.Screen name="client-nfc" />
          <Stack.Screen name="my-data" />
          <Stack.Screen name="history" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="travel-tickets" />
          <Stack.Screen name="travel-results" />
          <Stack.Screen name="travel-booking" />
          <Stack.Screen name="travel-payment" />
          <Stack.Screen name="my-reservations" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SessionIdleGuard>
    </AdminDesktopGate>
  );
}

const idleStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const gateStyles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: '100vh' as any,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8FF',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 40,
    shadowColor: '#061F68',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  icon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: '#EAF3FF',
    marginBottom: 22,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    color: '#061F68',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#5D6B82',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 14,
  },
  address: {
    color: '#139DFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 24,
  },
});

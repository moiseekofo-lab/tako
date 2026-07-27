import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const FONT_SCALE = 0.88;
const APP_FONT_FAMILY = Platform.select({
  android: 'Roboto',
  ios: 'System',
  web: 'Roboto, Arial, sans-serif',
  default: 'Arial',
});

type FontPatchGlobal = typeof globalThis & {
  __takoFontPatchApplied?: boolean;
};

const patchFontSizes = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(patchFontSizes);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const style = value as Record<string, unknown>;
  const nextStyle: Record<string, unknown> = {};

  Object.entries(style).forEach(([key, item]) => {
    if (key === 'fontSize' && typeof item === 'number') {
      nextStyle[key] = Math.max(12, Math.round(item * FONT_SCALE));
      return;
    }

    nextStyle[key] = patchFontSizes(item);
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

  if (isAdminDomain && !isDriverLogin && (isMobileDevice || width < ADMIN_DESKTOP_MIN_WIDTH)) {
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

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Alkatra: require('../assets/fonts/Alkatra.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AdminDesktopGate>
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
        <Stack.Screen name="client-nfc" />
        <Stack.Screen name="my-data" />
        <Stack.Screen name="history" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AdminDesktopGate>
  );
}

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

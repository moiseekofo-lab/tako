import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { getAgentAccount } from '../services/api';
import { useStore } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';

export default function Agent() {
  const router = useRouter();
  const currentUser = useStore((state: any) => state.currentUser);
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const clearSession = useStore((state: any) => state.clearSession);
  const balance = useStore((state: any) => state.balance);
  const setBalance = useStore((state: any) => state.setBalance);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const menuTranslateX = useRef(new Animated.Value(380)).current;

  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      router.replace('/login' as any);
    }
  }, [isAuthenticated, router]);

  const refreshAgentAccount = async (silent = false) => {
    const agentId = currentUser?.id;
    if (!agentId || agentId === '1000000001') {
      return;
    }

    try {
      if (!silent) {
        setRefreshingBalance(true);
      }
      const result = await getAgentAccount(agentId);
      if (result?.agent) {
        setCurrentUser(result.agent);
        setBalance(Number(result.agent.balance || 0));
        setLastSync(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      // Le compte reste utilisable même si le réseau tombe pendant quelques secondes.
    } finally {
      if (!silent) {
        setRefreshingBalance(false);
      }
    }
  };

  useEffect(() => {
    refreshAgentAccount(true);
    const interval = setInterval(() => refreshAgentAccount(true), 3000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const openMenu = () => {
    setMenuOpen(true);
    menuTranslateX.setValue(380);
    Animated.spring(menuTranslateX, {
      toValue: 0,
      damping: 20,
      stiffness: 140,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuTranslateX, {
      toValue: 380,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const openMenuRoute = (route: string) => {
    closeMenu();
    router.push(route as any);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TakoLogo />
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.85}
            onPress={menuOpen ? closeMenu : openMenu}>
            <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color={TAKO_BLUE} />
          </TouchableOpacity>
        </View>

        <Text style={styles.kicker}>Mode agent</Text>
        <Text style={styles.title}>Compte agent</Text>
        <Text style={styles.subtitle}>Ouvrez le menu pour accéder aux recharges et aux cartes prépayées.</Text>

        <View style={styles.agentBalanceCard}>
          <View>
            <Text style={styles.agentLabel}>ID agent</Text>
            <Text style={styles.agentValue}>{currentUser?.id || 'AGENT'}</Text>
          </View>
          <View style={styles.agentBalanceBox}>
            <Text style={styles.agentLabel}>Solde disponible</Text>
            <Text style={styles.agentBalance}>{balance} FC</Text>
          </View>
          <Text style={styles.agentHint}>
            Ce solde est crédité uniquement par l’administrateur. L’espèce est remise en fin de journée.
            {lastSync ? ` Dernière actualisation : ${lastSync}.` : ''}
          </Text>
        </View>

      </ScrollView>

      {menuOpen ? (
        <View style={styles.menuLayer}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View style={[styles.sideMenu, { transform: [{ translateX: menuTranslateX }] }]}>
            <LinearGradient colors={[TAKO_BLUE, '#0A2D8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.menuProfile}>
              <View pointerEvents="none" style={styles.menuProfilePattern}>
                <View style={[styles.menuPatternMark, styles.menuPatternMarkOne]} />
                <View style={[styles.menuPatternMark, styles.menuPatternMarkTwo]} />
                <View style={[styles.menuPatternMark, styles.menuPatternMarkThree]} />
                <View style={[styles.menuPatternDot, styles.menuPatternDotOne]} />
                <View style={[styles.menuPatternDot, styles.menuPatternDotTwo]} />
              </View>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={42} color="white" />
                </View>
                <View style={styles.editAvatarButton}>
                  <Ionicons name="pencil" size={16} color="#8B8B8B" />
                </View>
              </View>
              <Text style={styles.profileName}>{String(currentUser?.fullName || 'Agent TaKo').toUpperCase()}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email || currentUser?.phone || currentUser?.id}</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.menuList} showsVerticalScrollIndicator={false}>
              <View style={styles.menuBalanceBox}>
                <Text style={styles.menuBalanceLabel}>Solde disponible</Text>
                <Text style={styles.menuBalanceValue}>{balance} FC</Text>
                <Text style={styles.menuBalanceMeta}>ID agent : {currentUser?.id || 'AGENT'}</Text>
              </View>

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.78} onPress={() => openMenuRoute('/agent-recharge-menu')}>
                <Ionicons name="wallet-outline" size={30} color={TAKO_ACTION} />
                <View style={styles.menuTextBox}>
                  <Text style={styles.menuItemTitle}>Recharge client</Text>
                  <Text style={styles.menuItemSubtitle}>Par QR code, NFC ou ID client</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.78} onPress={() => openMenuRoute('/agent-prepaid')}>
                <MaterialCommunityIcons name="credit-card-plus-outline" size={30} color={TAKO_ACTION} />
                <View style={styles.menuTextBox}>
                  <Text style={styles.menuItemTitle}>Carte prépayée</Text>
                  <Text style={styles.menuItemSubtitle}>Activer une carte pour un client sans smartphone</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.78}
                onPress={() => {
                  clearSession();
                  router.replace('/login' as any);
                }}>
                <Ionicons name="log-out-outline" size={30} color={TAKO_ACTION} />
                <View style={styles.menuTextBox}>
                  <Text style={styles.menuItemTitle}>Déconnexion</Text>
                  <Text style={styles.menuItemSubtitle}>Fermer la session agent</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 54,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '73%',
    maxWidth: 430,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    backgroundColor: '#F5F8FF',
  },
  menuProfile: {
    minHeight: 226,
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  menuProfilePattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  menuPatternMark: {
    position: 'absolute',
    width: 12,
    height: 96,
    borderRadius: 8,
    backgroundColor: 'white',
    transform: [{ rotate: '38deg' }],
  },
  menuPatternMarkOne: {
    right: 42,
    top: 18,
  },
  menuPatternMarkTwo: {
    right: 112,
    top: -22,
    height: 74,
  },
  menuPatternMarkThree: {
    left: 26,
    top: 42,
    height: 68,
  },
  menuPatternDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'white',
  },
  menuPatternDotOne: {
    right: 24,
    top: 128,
  },
  menuPatternDotTwo: {
    right: 88,
    top: 88,
  },
  avatarWrap: {
    width: 86,
    height: 86,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#09D457',
    backgroundColor: TAKO_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: -2,
    bottom: 3,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: 'white',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 1,
  },
  profileEmail: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 9,
  },
  menuList: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 42,
  },
  menuBalanceBox: {
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    padding: 14,
    marginBottom: 12,
  },
  menuBalanceLabel: {
    color: '#8A93A3',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  menuBalanceValue: {
    color: TAKO_BLUE,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  menuBalanceMeta: {
    color: '#8A93A3',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  menuItem: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  menuTextBox: {
    flex: 1,
  },
  menuItemTitle: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '800',
  },
  menuItemSubtitle: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  menuCard: {
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    padding: 16,
    marginTop: -18,
    marginBottom: 24,
    shadowColor: '#061F68',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  menuUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: TAKO_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuUserText: {
    flex: 1,
  },
  menuName: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  menuMeta: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  menuInfoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  menuInfoItem: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F5F8FF',
    padding: 12,
  },
  menuInfoLabel: {
    color: '#7B8798',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  menuInfoValue: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  menuSectionList: {
    gap: 8,
    marginBottom: 12,
  },
  menuSectionButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#F5F8FF',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  menuSectionText: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  kicker: {
    color: TAKO_ACTION,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TAKO_BLUE,
    fontSize: 31,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 24,
  },
  agentBalanceCard: {
    borderRadius: 18,
    backgroundColor: TAKO_BLUE,
    padding: 18,
    marginBottom: 18,
    gap: 14,
    shadowColor: '#061F68',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  agentBalanceBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 14,
  },
  agentLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  agentValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  agentBalance: {
    color: '#09D457',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 4,
  },
  agentHint: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});

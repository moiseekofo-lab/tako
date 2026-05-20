import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TakoLogo />
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.85}
            onPress={() => setMenuOpen((value) => !value)}>
            <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color={TAKO_BLUE} />
          </TouchableOpacity>
        </View>

        {menuOpen ? (
          <View style={styles.menuCard}>
            <View style={styles.menuUserRow}>
              <View style={styles.menuAvatar}>
                <Ionicons name="person" size={22} color="white" />
              </View>
              <View style={styles.menuUserText}>
                <Text style={styles.menuName}>{currentUser?.fullName || 'Agent TaKo'}</Text>
                <Text style={styles.menuMeta}>{currentUser?.email || currentUser?.phone || currentUser?.id}</Text>
              </View>
            </View>

            <View style={styles.menuInfoGrid}>
              <View style={styles.menuInfoItem}>
                <Text style={styles.menuInfoLabel}>ID agent</Text>
                <Text style={styles.menuInfoValue}>{currentUser?.id || 'AGENT'}</Text>
              </View>
              <View style={styles.menuInfoItem}>
                <Text style={styles.menuInfoLabel}>Solde</Text>
                <Text style={styles.menuInfoValue}>{balance} FC</Text>
              </View>
            </View>

            <View style={styles.menuSectionList}>
              <TouchableOpacity
                style={styles.menuSectionButton}
                activeOpacity={0.85}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/agent-recharge-menu' as any);
                }}>
                <Ionicons name="wallet-outline" size={24} color={TAKO_BLUE} />
                <Text style={styles.menuSectionText}>Recharge client</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuSectionButton}
                activeOpacity={0.85}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/agent-prepaid' as any);
                }}>
                <MaterialCommunityIcons name="credit-card-plus-outline" size={25} color={TAKO_BLUE} />
                <Text style={styles.menuSectionText}>Carte prépayée</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuSectionButton}
                activeOpacity={0.85}
                onPress={() => {
                  clearSession();
                  router.replace('/login' as any);
                }}>
                <Ionicons name="log-out-outline" size={24} color={TAKO_BLUE} />
                <Text style={styles.menuSectionText}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <Text style={styles.kicker}>Mode agent</Text>
        <Text style={styles.title}>Compte agent</Text>
        <Text style={styles.subtitle}>Choisissez une option dans le menu pour ouvrir une page séparée.</Text>

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

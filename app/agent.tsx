import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { createInternalRecharge, getAgentAccount } from '../services/api';
import { useStore } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';
type NfcTag = { id?: string; type?: string } | null;

export default function Agent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const currentUser = useStore((state: any) => state.currentUser);
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const clearSession = useStore((state: any) => state.clearSession);
  const balance = useStore((state: any) => state.balance);
  const setBalance = useStore((state: any) => state.setBalance);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const [clientId, setClientId] = useState(String(params.clientId || ''));
  const [amount, setAmount] = useState('');
  const [cardId, setCardId] = useState('');
  const [isReadingNfc, setIsReadingNfc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      router.replace('/login' as any);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    let mounted = true;
    let manager: any = null;

    const startNfc = async () => {
      try {
        const module = await import('react-native-nfc-manager');
        manager = module.default;
        const supported = await manager.isSupported();
        if (mounted && supported) {
          await manager.start();
        }
      } catch {
        manager = null;
      }
    };

    startNfc();

    return () => {
      mounted = false;
      manager?.cancelTechnologyRequest?.().catch?.(() => {});
    };
  }, []);

  useEffect(() => {
    if (params.clientId) {
      setClientId(String(params.clientId));
      setCardId('');
    }
  }, [params.clientId]);

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

  const getCardId = (tag: NfcTag) => tag?.id || tag?.type || '';

  const readNfcCard = async () => {
    let manager: { cancelTechnologyRequest?: () => Promise<void> } | null = null;

    try {
      if (Platform.OS === 'web') {
        Alert.alert('NFC indisponible', 'La lecture NFC fonctionne sur l’application mobile installée.');
        return;
      }

      setIsReadingNfc(true);
      const module = await import('react-native-nfc-manager');
      const NfcManager = module.default;
      const { NfcTech } = module;
      manager = NfcManager;
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez la carte du passager',
      });
      const tag = await NfcManager.getTag();
      const nextCardId = getCardId(tag);

      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      setCardId(nextCardId);
      setClientId('');
      Alert.alert('Carte lue', 'Ajoutez le montant puis confirmez la recharge.');
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReadingNfc(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  const confirmRecharge = async () => {
    const value = Number.parseInt(amount, 10);
    const cleanClientId = clientId.trim();
    const cleanCardId = cardId.trim();

    if ((!cleanClientId && !cleanCardId) || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Informations obligatoires', 'Scannez le QR, lisez la carte NFC ou entrez l’ID, puis ajoutez le montant.');
      return;
    }

    try {
      setLoading(true);
      const result = await createInternalRecharge({
        clientId: cleanClientId || undefined,
        cardId: cleanCardId || undefined,
        amount: value,
        agentId: currentUser?.id || 'AGENT',
      });

      setAmount('');
      setCardId('');
      setClientId(result?.client?.id || cleanClientId);
      if (result?.agent?.balance !== undefined) {
        setBalance(Number(result.agent.balance || 0));
        setCurrentUser(result.agent);
      }
      setLastSync(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      Alert.alert('Crédit envoyé', `${value} FC ajouté au compte ${result?.client?.id || cleanClientId}.`);
    } catch (error) {
      Alert.alert('Recharge impossible', error instanceof Error ? error.message : 'Vérifiez le compte ou la carte.');
    } finally {
      setLoading(false);
    }
  };

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

            <TouchableOpacity style={styles.menuRefreshButton} activeOpacity={0.85} disabled={refreshingBalance} onPress={() => refreshAgentAccount(false)}>
              {refreshingBalance ? <ActivityIndicator color={TAKO_BLUE} /> : <Ionicons name="refresh" size={19} color={TAKO_BLUE} />}
              <Text style={styles.menuRefreshText}>{refreshingBalance ? 'Actualisation...' : 'Actualiser mes données'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuLogoutButton}
              activeOpacity={0.85}
              onPress={() => {
                clearSession();
                router.replace('/login' as any);
              }}>
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text style={styles.menuLogoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.kicker}>Mode agent</Text>
        <Text style={styles.title}>Recharge interne</Text>
        <Text style={styles.subtitle}>Scannez le QR, lisez la carte NFC ou saisissez l’ID du passager.</Text>

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

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.scanButton}
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/internal-recharge-scan',
                params: { returnTo: 'agent' },
              } as any)
            }>
            <Ionicons name="qr-code-outline" size={24} color="white" />
            <Text style={styles.scanButtonText}>Scanner QR client</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={isReadingNfc} onPress={readNfcCard}>
            {isReadingNfc ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={25} color={TAKO_BLUE} />}
            <Text style={styles.nfcButtonText}>{isReadingNfc ? 'Lecture NFC...' : 'Lire carte NFC'}</Text>
          </TouchableOpacity>

          {!!cardId && (
            <View style={styles.cardReadBox}>
              <MaterialCommunityIcons name="credit-card-check" size={21} color={TAKO_GREEN} />
              <Text style={styles.cardReadText}>Carte lue : {cardId}</Text>
            </View>
          )}

          <View style={styles.inputBox}>
            <Ionicons name="finger-print" size={24} color="#7B8798" />
            <TextInput
              placeholder="ID du passager"
              placeholderTextColor="#8B95A5"
              value={clientId}
              onChangeText={(value) => {
                setClientId(value);
                if (value.trim()) {
                  setCardId('');
                }
              }}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.inputBox}>
            <Text style={styles.currency}>FC</Text>
            <TextInput
              placeholder="Montant"
              placeholderTextColor="#8B95A5"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.confirmButton} activeOpacity={0.9} disabled={loading} onPress={confirmRecharge}>
            {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={24} color="white" />}
            <Text style={styles.confirmButtonText}>Confirmer la recharge</Text>
          </TouchableOpacity>
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
    fontSize: 17,
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
  menuRefreshButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BBDFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  menuRefreshText: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  menuLogoutButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: TAKO_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  menuLogoutText: {
    color: 'white',
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
  card: {
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    padding: 18,
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
    color: TAKO_GREEN,
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
  scanButton: {
    height: 62,
    borderRadius: 12,
    backgroundColor: TAKO_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  nfcButton: {
    height: 60,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BBDFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  nfcButtonText: {
    color: TAKO_BLUE,
    fontSize: 17,
    fontWeight: '900',
  },
  cardReadBox: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#E9FFF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  cardReadText: {
    flex: 1,
    color: '#087B35',
    fontSize: 13,
    fontWeight: '900',
  },
  inputBox: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#F4F5F9',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  currency: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 18,
    fontWeight: '800',
  },
  confirmButton: {
    height: 66,
    borderRadius: 14,
    backgroundColor: TAKO_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
});

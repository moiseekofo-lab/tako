import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import {
  activatePrepaidCard,
  approveUser,
  createInternalRecharge,
  findClientById,
  getAgentAccount,
  getPendingUsers,
  rechargeAgent,
  requestPrepaidCardCode,
  updateClientByAdmin,
} from '../services/api';
import { useStore, type TransactionNotification, type TripHistoryItem } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';
const PAGE_BG = '#F5F8FF';
const WEB_SCROLLBAR_STYLE = Platform.OS === 'web'
  ? ({
      overflowY: 'scroll',
    } as any)
  : null;
type NfcTag = { id?: string; type?: string } | null;

type AdminSection = 'dashboard' | 'clients' | 'drivers' | 'agents' | 'transactions' | 'settings';

const navItems: Array<{ key: AdminSection; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'grid-outline' },
  { key: 'clients', label: 'Clients', icon: 'people-outline' },
  { key: 'drivers', label: 'Chauffeurs', icon: 'bus-outline' },
  { key: 'agents', label: 'Agents', icon: 'person-add-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'receipt-outline' },
  { key: 'settings', label: 'Paramètres', icon: 'settings-outline' },
];

const formatDate = (date?: string) => {
  if (!date) {
    return 'Non disponible';
  }

  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Admin() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const currentUser = useStore((state: any) => state.currentUser);
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const clearSession = useStore((state: any) => state.clearSession);
  const trips = useStore((state: any) => state.trips) as TripHistoryItem[];
  const notifications = useStore((state: any) => state.notifications) as TransactionNotification[];
  const balance = useStore((state: any) => state.balance);
  const driverTripInfo = useStore((state: any) => state.driverTripInfo);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [clientId, setClientId] = useState('');
  const [rechargeClientId, setRechargeClientId] = useState(String(params.clientId || ''));
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeCardId, setRechargeCardId] = useState('');
  const [prepaidCardId, setPrepaidCardId] = useState('');
  const [prepaidPhone, setPrepaidPhone] = useState('');
  const [prepaidCode, setPrepaidCode] = useState('');
  const [agentRechargeId, setAgentRechargeId] = useState('');
  const [agentRechargeAmount, setAgentRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [isReadingNfc, setIsReadingNfc] = useState(false);
  const [isReadingPrepaidNfc, setIsReadingPrepaidNfc] = useState(false);
  const [prepaidLoading, setPrepaidLoading] = useState(false);
  const [prepaidFeedback, setPrepaidFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rechargeFeedback, setRechargeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [clientUpdateLoading, setClientUpdateLoading] = useState(false);
  const [clientFeedback, setClientFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [agentRechargeLoading, setAgentRechargeLoading] = useState(false);
  const [agentLookupLoading, setAgentLookupLoading] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [trackedAgent, setTrackedAgent] = useState<any>(null);
  const [trackedAgentStats, setTrackedAgentStats] = useState<any>(null);
  const [driverStatus, setDriverStatus] = useState<'En attente' | 'Actif'>('En attente');
  const [pendingAgents, setPendingAgents] = useState<any[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.clientId) {
      setRechargeClientId(String(params.clientId));
      setRechargeCardId('');
      setClientId(String(params.clientId));
      setActiveSection('clients');
    }
  }, [params.clientId]);

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

  const loadPendingUsers = async () => {
    try {
      const [agentsResult, driversResult] = await Promise.all([
        getPendingUsers('agent'),
        getPendingUsers('chauffeur'),
      ]);
      setPendingAgents(agentsResult?.users || []);
      setPendingDrivers(driversResult?.users || []);
    } catch {
      setPendingAgents([]);
      setPendingDrivers([]);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      router.replace('/login' as any);
      return;
    }

    loadPendingUsers();
  }, [isAuthenticated, router]);

  const totalTripAmount = useMemo(() => trips.reduce((sum, trip) => sum + Number(trip.amount || 0), 0), [trips]);
  const qrTransactions = notifications.filter((item) => item.type === 'qr').length;
  const nfcTransactions = notifications.filter((item) => item.type === 'nfc').length;
  const rechargeTransactions = notifications.filter((item) => item.type === 'recharge').length;
  const activeClient = selectedClient;

  const approve = () => {
    setDriverStatus('Actif');
    Alert.alert('Chauffeur validé', 'Le chauffeur peut maintenant utiliser son compte.');
  };

  const logout = () => {
    setSelectedClient(null);
    setClientId('');
    clearSession();
    router.replace('/login' as any);
  };

  const findClient = async () => {
    const cleanClientId = clientId.trim();
    setClientFeedback(null);
    if (!cleanClientId) {
      const message = 'Entrez l’ID du client.';
      setSelectedClient(null);
      setClientFeedback({ type: 'error', message });
      Alert.alert('ID obligatoire', message);
      return;
    }

    try {
      setClientLookupLoading(true);
      const result = await findClientById(cleanClientId);
      if (!result?.client) {
        throw new Error('Client introuvable.');
      }

      setSelectedClient(result.client);
      setRechargeClientId(result.client.id || cleanClientId);
      setClientFeedback({ type: 'success', message: `Compte client trouvé : ${result.client.fullName || result.client.id}.` });
      setActiveSection('clients');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Aucun compte client trouvé avec cet ID.';
      setSelectedClient(null);
      setClientFeedback({ type: 'error', message });
      Alert.alert('Client introuvable', message);
    } finally {
      setClientLookupLoading(false);
    }
  };

  const updateSelectedClient = async (nextClient: { fullName: string; email: string; phone: string; birthDate: string }) => {
    if (!selectedClient?.id) {
      Alert.alert('Client introuvable', 'Sélectionnez d’abord un compte client.');
      return;
    }

    try {
      setClientUpdateLoading(true);
      const result = await updateClientByAdmin(selectedClient.id, nextClient);
      if (!result?.client) {
        throw new Error('Mise à jour non confirmée.');
      }

      setSelectedClient(result.client);
      setClientId(result.client.id);
      setRechargeClientId(result.client.id);
      setClientFeedback({ type: 'success', message: 'Données client mises à jour.' });
      Alert.alert('Mise à jour confirmée', 'Les informations du client ont été modifiées.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de modifier ce compte client.';
      setClientFeedback({ type: 'error', message });
      Alert.alert('Mise à jour impossible', message);
    } finally {
      setClientUpdateLoading(false);
    }
  };

  const getCardId = (tag: NfcTag) => tag?.id || tag?.type || '';

  const readAdminNfcCard = async () => {
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
        alertMessage: 'Approchez la carte du client',
      });
      const tag = await NfcManager.getTag();
      const nextCardId = getCardId(tag);

      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      setRechargeCardId(nextCardId);
      setRechargeClientId('');
      setRechargeFeedback({ type: 'success', message: 'Carte NFC lue. Ajoutez le montant puis confirmez.' });
      Alert.alert('Carte lue', 'Ajoutez le montant puis confirmez la recharge.');
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReadingNfc(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  const readPrepaidNfcCard = async () => {
    let manager: { cancelTechnologyRequest?: () => Promise<void> } | null = null;

    try {
      if (Platform.OS === 'web') {
        Alert.alert('NFC indisponible', 'La lecture NFC fonctionne sur l’application mobile installée.');
        return;
      }

      setIsReadingPrepaidNfc(true);
      const module = await import('react-native-nfc-manager');
      const NfcManager = module.default;
      const { NfcTech } = module;
      manager = NfcManager;
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez la carte NFC vierge',
      });
      const tag = await NfcManager.getTag();
      const nextCardId = getCardId(tag);

      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      setPrepaidCardId(nextCardId);
      setPrepaidFeedback({ type: 'success', message: 'Carte NFC vierge lue. Entrez le numéro puis envoyez le code.' });
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReadingPrepaidNfc(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  const sendPrepaidCode = async () => {
    const cleanPhone = prepaidPhone.trim();
    setPrepaidFeedback(null);

    if (!cleanPhone) {
      const message = 'Entrez le numéro de téléphone du client.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Téléphone obligatoire', message);
      return;
    }

    try {
      setPrepaidLoading(true);
      const result = await requestPrepaidCardCode(cleanPhone);
      setPrepaidFeedback({
        type: 'success',
        message: result?.code
          ? `Code généré : ${result.code}. Entrez-le pour confirmer le numéro.`
          : 'Code envoyé. Entrez le code reçu pour confirmer le numéro.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d’envoyer le code.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Code non envoyé', message);
    } finally {
      setPrepaidLoading(false);
    }
  };

  const confirmPrepaidCard = async () => {
    const cleanPhone = prepaidPhone.trim();
    const cleanCode = prepaidCode.trim();
    const cleanCardId = prepaidCardId.trim();
    setPrepaidFeedback(null);

    if (!cleanPhone || !cleanCode || !cleanCardId) {
      const message = 'Lisez la carte NFC, entrez le téléphone et le code reçu.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Informations obligatoires', message);
      return;
    }

    try {
      setPrepaidLoading(true);
      const result = await activatePrepaidCard({
        phone: cleanPhone,
        code: cleanCode,
        cardId: cleanCardId,
        operatorId: currentUser?.id || 'ADMIN',
      });

      setSelectedClient(result.client);
      setClientId(result.client.id);
      setRechargeClientId(result.client.id);
      setPrepaidCode('');
      setPrepaidCardId('');
      setPrepaidFeedback({ type: 'success', message: `Carte activée pour le compte ${result.client.id}.` });
      Alert.alert('Carte activée', `Carte prépayée associée au compte ${result.client.id}.`);
      setActiveSection('clients');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d’activer cette carte.';
      setPrepaidFeedback({ type: 'error', message });
      Alert.alert('Activation impossible', message);
    } finally {
      setPrepaidLoading(false);
    }
  };

  const confirmInternalRecharge = async () => {
    const cleanClientId = rechargeClientId.trim();
    const cleanCardId = rechargeCardId.trim();
    const value = Number.parseInt(rechargeAmount, 10);
    setRechargeFeedback(null);

    if ((!cleanClientId && !cleanCardId) || !Number.isFinite(value) || value <= 0) {
      const message = 'Entrez l’ID du client, scannez la carte NFC, puis ajoutez le montant.';
      setRechargeFeedback({ type: 'error', message });
      Alert.alert('Informations obligatoires', message);
      return;
    }

    try {
      setRechargeLoading(true);
      const result = await createInternalRecharge({
        clientId: cleanClientId || undefined,
        cardId: cleanCardId || undefined,
        amount: value,
        agentId: 'ADMIN',
      });

      if (!result?.client) {
        throw new Error('Recharge non confirmée. Vérifiez l’ID du client.');
      }

      setSelectedClient(result.client);
      setClientId(result.client.id || cleanClientId);
      setRechargeClientId(result.client.id || cleanClientId);
      setClientFeedback({ type: 'success', message: `Compte client trouvé : ${result.client.fullName || result.client.id}.` });

      setRechargeAmount('');
      setRechargeCardId('');
      setRechargeFeedback({ type: 'success', message: `Recharge confirmée : ${value} FC ajouté au compte ${result.client.id || cleanClientId}.` });
      Alert.alert('Recharge confirmée', `${value} FC ajouté au compte ${result.client.id || cleanClientId}.`);
      setActiveSection('clients');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vérifiez l’ID du client.';
      setRechargeFeedback({ type: 'error', message });
      Alert.alert('Recharge impossible', message);
    } finally {
      setRechargeLoading(false);
    }
  };

  const confirmAgentRecharge = async () => {
    const cleanAgentId = agentRechargeId.trim();
    const value = Number.parseInt(agentRechargeAmount, 10);
    setAgentFeedback(null);

    if (!cleanAgentId || !Number.isFinite(value) || value <= 0) {
      const message = 'Entrez l’ID de l’agent et le montant à lui envoyer.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('Informations obligatoires', message);
      return;
    }

    try {
      setAgentRechargeLoading(true);
      const result = await rechargeAgent(cleanAgentId, value);
      if (!result?.agent) {
        throw new Error('Agent actif introuvable. Vérifiez l’ID agent.');
      }
      setAgentRechargeAmount('');
      if (result?.agent) {
        setTrackedAgent(result.agent);
        setTrackedAgentStats(null);
      }
      setAgentFeedback({
        type: 'success',
        message: `Crédit envoyé : ${value} FC au compte agent ${result.agent.id}. Solde : ${result.agent.balance} FC.`,
      });
      Alert.alert(
        'Crédit envoyé',
        `${value} FC envoyé au compte agent ${result.agent.id}. Solde : ${result.agent.balance} FC.`
      );
      setActiveSection('agents');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vérifiez l’ID de l’agent.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('Recharge agent impossible', message);
    } finally {
      setAgentRechargeLoading(false);
    }
  };

  const findAgentAccount = async () => {
    const cleanAgentId = agentRechargeId.trim();
    setAgentFeedback(null);

    if (!cleanAgentId) {
      const message = 'Entrez l’ID de l’agent à suivre.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('ID obligatoire', message);
      return;
    }

    try {
      setAgentLookupLoading(true);
      const result = await getAgentAccount(cleanAgentId);
      if (!result?.agent) {
        throw new Error('Compte agent introuvable.');
      }
      setTrackedAgent(result?.agent || null);
      setTrackedAgentStats(result?.stats || null);
      setAgentFeedback({ type: 'success', message: `Compte agent trouvé : ${result.agent.fullName || result.agent.id}.` });
      setActiveSection('agents');
    } catch (error) {
      setTrackedAgent(null);
      setTrackedAgentStats(null);
      const message = error instanceof Error ? error.message : 'Vérifiez l’ID de l’agent.';
      setAgentFeedback({ type: 'error', message });
      Alert.alert('Compte agent introuvable', message);
    } finally {
      setAgentLookupLoading(false);
    }
  };

  const refreshPage = () => {
    setRefreshing(true);
    loadPendingUsers().finally(() => setRefreshing(false));
  };

  const approvePendingUser = async (userId: string) => {
    try {
      setApprovingUserId(userId);
      const result = await approveUser(userId);
      Alert.alert('Compte validé', `${result?.user?.fullName || 'Le compte'} peut maintenant se connecter.`);
      await loadPendingUsers();
    } catch (error) {
      Alert.alert('Validation impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setApprovingUserId(null);
    }
  };

  return (
    <View style={styles.page}>
      <View style={[styles.shell, isNarrow && styles.mobileShell]}>
        <View style={[styles.sidebar, isNarrow && styles.mobileSidebar]}>
          <View style={styles.brandBlock}>
            <TakoLogo size="small" color="white" />
            <Text style={styles.brandSubtitle}>Administration</Text>
          </View>

          <View style={[styles.navList, isNarrow && styles.mobileNavList]}>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, isNarrow && styles.mobileNavItem, activeSection === item.key && styles.navItemActive]}
                activeOpacity={0.82}
                onPress={() => setActiveSection(item.key)}>
                <Ionicons name={item.icon} size={22} color={activeSection === item.key ? TAKO_BLUE : 'white'} />
                <Text style={[styles.navText, activeSection === item.key && styles.navTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.privateBox, isNarrow && styles.mobileHidden]}>
            <Ionicons name="shield-checkmark" size={22} color={TAKO_GREEN} />
            <Text style={styles.privateTitle}>Accès privé</Text>
            <Text style={styles.privateText}>Réservé aux administrateurs et travailleurs TaKo.</Text>
          </View>

          <TouchableOpacity style={[styles.sidebarLogout, isNarrow && styles.mobileSidebarLogout]} activeOpacity={0.85} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="white" />
            <Text style={styles.sidebarLogoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={[styles.contentScroller, WEB_SCROLLBAR_STYLE]}
          contentContainerStyle={[styles.content, isNarrow && styles.mobileContent]}
          showsVerticalScrollIndicator
          persistentScrollbar
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshPage} tintColor={TAKO_BLUE} colors={[TAKO_BLUE]} />
          }>
          <View style={[styles.topBar, isNarrow && styles.mobileTopBar]}>
            <View>
              <Text style={styles.kicker}>Espace administrateur</Text>
              <Text style={styles.title}>Centre de contrôle TaKo</Text>
              <Text style={styles.subtitle}>Clients, chauffeurs, paiements et sécurité opérationnelle.</Text>
            </View>

            <View style={[styles.topActions, isNarrow && styles.mobileTopActions]}>
              <View style={styles.adminBadge}>
                <Ionicons name="person-circle-outline" size={24} color={TAKO_BLUE} />
                <View>
                  <Text style={styles.adminName}>Administrateur</Text>
                  <Text style={styles.adminEmail}>{currentUser?.email || 'contact@takotransport.online'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color="white" />
                <Text style={styles.logoutButtonText}>Déconnecter</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statsGrid, isNarrow && styles.mobileStatsGrid]}>
            <StatCard icon="wallet-outline" label="Solde suivi" value={`${balance} FC`} tone="blue" />
            <StatCard icon="bus-outline" label="Trajets" value={`${trips.length}`} tone="green" />
            <StatCard icon="receipt-outline" label="Transactions" value={`${notifications.length}`} tone="blue" />
            <StatCard icon="cash-outline" label="Volume transport" value={`${totalTripAmount} FC`} tone="green" />
          </View>

          {activeSection === 'dashboard' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <ClientSearchCard
                clientId={clientId}
                setClientId={setClientId}
                findClient={findClient}
                loading={clientLookupLoading}
                feedback={clientFeedback}
              />
              <PendingApprovalsCard
                title="Agents en attente"
                users={pendingAgents}
                approvingUserId={approvingUserId}
                approve={approvePendingUser}
              />
              <AgentRechargeCard
                agentId={agentRechargeId}
                setAgentId={setAgentRechargeId}
                amount={agentRechargeAmount}
                setAmount={setAgentRechargeAmount}
                loading={agentRechargeLoading}
                confirm={confirmAgentRecharge}
                lookupLoading={agentLookupLoading}
                lookup={findAgentAccount}
                feedback={agentFeedback}
              />
              <AgentAccountCard agent={trackedAgent} stats={trackedAgentStats} />
              <InternalRechargeCard
                clientId={rechargeClientId}
                setClientId={setRechargeClientId}
                cardId={rechargeCardId}
                clearCardId={() => setRechargeCardId('')}
                amount={rechargeAmount}
                setAmount={setRechargeAmount}
                loading={rechargeLoading}
                confirm={confirmInternalRecharge}
                scan={() => router.push('/internal-recharge-scan' as any)}
                nfcLoading={isReadingNfc}
                readNfc={readAdminNfcCard}
                feedback={rechargeFeedback}
              />
              <PrepaidCardActivationCard
                phone={prepaidPhone}
                setPhone={setPrepaidPhone}
                code={prepaidCode}
                setCode={setPrepaidCode}
                cardId={prepaidCardId}
                readNfc={readPrepaidNfcCard}
                nfcLoading={isReadingPrepaidNfc}
                loading={prepaidLoading}
                sendCode={sendPrepaidCode}
                confirm={confirmPrepaidCard}
                feedback={prepaidFeedback}
              />
              <DriverCard driverStatus={driverStatus} approve={approve} />
              <OperationsCard
                route={driverTripInfo.route}
                bus={driverTripInfo.bus}
                amount={driverTripInfo.amount}
              />
              <TransactionSummary qr={qrTransactions} nfc={nfcTransactions} recharge={rechargeTransactions} />
            </View>
          ) : null}

          {activeSection === 'clients' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <ClientSearchCard
                clientId={clientId}
                setClientId={setClientId}
                findClient={findClient}
                loading={clientLookupLoading}
                feedback={clientFeedback}
              />
              <InternalRechargeCard
                clientId={rechargeClientId}
                setClientId={setRechargeClientId}
                cardId={rechargeCardId}
                clearCardId={() => setRechargeCardId('')}
                amount={rechargeAmount}
                setAmount={setRechargeAmount}
                loading={rechargeLoading}
                confirm={confirmInternalRecharge}
                scan={() => router.push('/internal-recharge-scan' as any)}
                nfcLoading={isReadingNfc}
                readNfc={readAdminNfcCard}
                feedback={rechargeFeedback}
              />
              <PrepaidCardActivationCard
                phone={prepaidPhone}
                setPhone={setPrepaidPhone}
                code={prepaidCode}
                setCode={setPrepaidCode}
                cardId={prepaidCardId}
                readNfc={readPrepaidNfcCard}
                nfcLoading={isReadingPrepaidNfc}
                loading={prepaidLoading}
                sendCode={sendPrepaidCode}
                confirm={confirmPrepaidCard}
                feedback={prepaidFeedback}
              />
              <ClientDetails
                client={activeClient}
                balance={balance}
                trips={trips.length}
                notifications={notifications.length}
                updating={clientUpdateLoading}
                updateClient={updateSelectedClient}
              />
            </View>
          ) : null}

          {activeSection === 'drivers' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <PendingApprovalsCard
                title="Chauffeurs en attente"
                users={pendingDrivers}
                approvingUserId={approvingUserId}
                approve={approvePendingUser}
              />
              <DriverCard driverStatus={driverStatus} approve={approve} />
              <OperationsCard
                route={driverTripInfo.route}
                bus={driverTripInfo.bus}
                amount={driverTripInfo.amount}
              />
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Contrôles chauffeur</Text>
                <ChecklistItem label="Plaque du bus enregistrée" done={!!driverTripInfo.bus} />
                <ChecklistItem label="Trajet enregistré" done={!!driverTripInfo.route} />
                <ChecklistItem label="Montant enregistré" done={!!driverTripInfo.amount} />
                <ChecklistItem label="QR et NFC disponibles" done />
              </View>
            </View>
          ) : null}

          {activeSection === 'agents' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <PendingApprovalsCard
                title="Agents en attente"
                users={pendingAgents}
                approvingUserId={approvingUserId}
                approve={approvePendingUser}
              />
              <AgentRechargeCard
                agentId={agentRechargeId}
                setAgentId={setAgentRechargeId}
                amount={agentRechargeAmount}
                setAmount={setAgentRechargeAmount}
                loading={agentRechargeLoading}
                confirm={confirmAgentRecharge}
                lookupLoading={agentLookupLoading}
                lookup={findAgentAccount}
                feedback={agentFeedback}
              />
              <AgentAccountCard agent={trackedAgent} stats={trackedAgentStats} />
              <InternalRechargeCard
                clientId={rechargeClientId}
                setClientId={setRechargeClientId}
                cardId={rechargeCardId}
                clearCardId={() => setRechargeCardId('')}
                amount={rechargeAmount}
                setAmount={setRechargeAmount}
                loading={rechargeLoading}
                confirm={confirmInternalRecharge}
                scan={() => router.push('/internal-recharge-scan' as any)}
                nfcLoading={isReadingNfc}
                readNfc={readAdminNfcCard}
                feedback={rechargeFeedback}
              />
              <PrepaidCardActivationCard
                phone={prepaidPhone}
                setPhone={setPrepaidPhone}
                code={prepaidCode}
                setCode={setPrepaidCode}
                cardId={prepaidCardId}
                readNfc={readPrepaidNfcCard}
                nfcLoading={isReadingPrepaidNfc}
                loading={prepaidLoading}
                sendCode={sendPrepaidCode}
                confirm={confirmPrepaidCard}
                feedback={prepaidFeedback}
              />
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Compte agent</Text>
                <ChecklistItem label="Inscription agent disponible" done />
                <ChecklistItem label="Validation administrateur obligatoire" done />
                <ChecklistItem label="Solde agent crédité uniquement par administrateur" done />
                <ChecklistItem label="Recharge par QR client" done />
                <ChecklistItem label="Recharge par carte NFC dans le mode agent" done />
                <ChecklistItem label="Remise espèce en fin de journée" done />
              </View>
            </View>
          ) : null}

          {activeSection === 'transactions' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <TransactionSummary qr={qrTransactions} nfc={nfcTransactions} recharge={rechargeTransactions} />
              <View style={[styles.card, styles.fullCard]}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardTitle}>Activité récente</Text>
                    <Text style={styles.cardText}>Dernières opérations connues par l’application.</Text>
                  </View>
                  <View style={styles.clientPill}>
                    <Text style={styles.clientPillText}>{notifications.length} lignes</Text>
                  </View>
                </View>

                {notifications.length === 0 ? (
                  <EmptyState icon="receipt-outline" title="Aucune transaction récente" text="Les paiements QR, NFC et recharges apparaîtront ici." />
                ) : (
                  notifications.slice(0, 8).map((item) => <TransactionRow key={item.id} item={item} />)
                )}
              </View>
            </View>
          ) : null}

          {activeSection === 'settings' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sécurité</Text>
                <ChecklistItem label="Web non public pour les clients" done />
                <ChecklistItem label="Accès administrateur par email fixe" done />
                <ChecklistItem label="ID client permanent non modifiable" done />
                <ChecklistItem label="Recherche client par ID" done />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Services paiement</Text>
                <ChecklistItem label="QR code transport" done />
                <ChecklistItem label="Carte NFC client" done />
                <ChecklistItem label="M-Pesa, Airtel Money, Orange Money" done />
                <ChecklistItem label="Notifications transaction" done />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: 'blue' | 'green' }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, tone === 'green' && styles.statIconGreen]}>
        <Ionicons name={icon} size={22} color={tone === 'green' ? '#087B35' : TAKO_BLUE} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ClientSearchCard({
  clientId,
  setClientId,
  findClient,
  loading,
  feedback,
}: {
  clientId: string;
  setClientId: (value: string) => void;
  findClient: () => void;
  loading: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.searchCard]}>
      <Text style={styles.cardTitle}>Accès compte client</Text>
      <Text style={styles.cardText}>Entrez l’ID numérique permanent du client.</Text>

      <View style={styles.inputBox}>
        <Ionicons name="id-card-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="Ex: 1000000001"
          placeholderTextColor="#8B95A5"
          value={clientId}
          onChangeText={setClientId}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} disabled={loading} onPress={findClient}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="search" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Voir le compte client</Text>
      </TouchableOpacity>
    </View>
  );
}

function PendingApprovalsCard({
  title,
  users,
  approvingUserId,
  approve,
}: {
  title: string;
  users: any[];
  approvingUserId: string | null;
  approve: (userId: string) => void;
}) {
  return (
    <View style={[styles.card, styles.fullCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>Validez les comptes avant qu’ils puissent accéder à leur mode.</Text>

      {users.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="Aucune demande" text="Les nouveaux comptes apparaîtront ici." />
      ) : (
        users.map((user) => (
          <View key={user.id} style={styles.pendingRow}>
            <View style={styles.pendingIcon}>
              <Ionicons name={user.role === 'agent' ? 'person-add-outline' : 'bus-outline'} size={22} color={TAKO_BLUE} />
            </View>
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingName}>{user.fullName}</Text>
              <Text style={styles.pendingMeta}>{user.email || user.phone || user.id}</Text>
            </View>
            <TouchableOpacity
              style={styles.pendingButton}
              activeOpacity={0.9}
              disabled={approvingUserId === user.id}
              onPress={() => approve(user.id)}>
              {approvingUserId === user.id ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.pendingButtonText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

function InternalRechargeCard({
  clientId,
  setClientId,
  cardId,
  clearCardId,
  amount,
  setAmount,
  loading,
  confirm,
  scan,
  nfcLoading,
  readNfc,
  feedback,
}: {
  clientId: string;
  setClientId: (value: string) => void;
  cardId: string;
  clearCardId: () => void;
  amount: string;
  setAmount: (value: string) => void;
  loading: boolean;
  confirm: () => void;
  scan: () => void;
  nfcLoading: boolean;
  readNfc: () => void;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.internalRechargeCard]}>
      <Text style={styles.cardTitle}>Recharge interne</Text>
      <Text style={styles.cardText}>Scannez le QR, lisez la carte NFC ou entrez l’ID du client, puis confirmez le montant.</Text>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={scan}>
        <Ionicons name="qr-code-outline" size={22} color={TAKO_BLUE} />
        <Text style={styles.secondaryButtonText}>Scanner le QR client</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={nfcLoading} onPress={readNfc}>
        {nfcLoading ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={23} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>{nfcLoading ? 'Lecture NFC...' : 'Lire carte NFC'}</Text>
      </TouchableOpacity>

      {!!cardId && (
        <View style={styles.cardReadBox}>
          <MaterialCommunityIcons name="credit-card-check" size={20} color={TAKO_GREEN} />
          <Text style={styles.cardReadText}>Carte lue : {cardId}</Text>
        </View>
      )}

      <View style={styles.inputBox}>
        <Ionicons name="finger-print" size={24} color="#7B8798" />
        <TextInput
          placeholder="ID client"
          placeholderTextColor="#8B95A5"
          value={clientId}
          onChangeText={(value) => {
            setClientId(value);
            if (value.trim()) {
              clearCardId();
            }
          }}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.currencyLabel}>FC</Text>
        <TextInput
          placeholder="Montant"
          placeholderTextColor="#8B95A5"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.successButton} activeOpacity={0.9} disabled={loading} onPress={confirm}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Confirmer la recharge</Text>
      </TouchableOpacity>
    </View>
  );
}

function AgentRechargeCard({
  agentId,
  setAgentId,
  amount,
  setAmount,
  loading,
  confirm,
  lookupLoading,
  lookup,
  feedback,
}: {
  agentId: string;
  setAgentId: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  loading: boolean;
  confirm: () => void;
  lookupLoading: boolean;
  lookup: () => void;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.internalRechargeCard]}>
      <Text style={styles.cardTitle}>Créditer un agent</Text>
      <Text style={styles.cardText}>
        Envoyez un solde à l’agent. Chaque recharge client débitera ce solde, puis l’agent remettra l’espèce en fin de journée.
      </Text>

      <View style={styles.inputBox}>
        <Ionicons name="person-circle-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="ID agent"
          placeholderTextColor="#8B95A5"
          value={agentId}
          onChangeText={setAgentId}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} disabled={lookupLoading} onPress={lookup}>
        {lookupLoading ? <ActivityIndicator color={TAKO_BLUE} /> : <Ionicons name="analytics-outline" size={22} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>Suivre le compte agent</Text>
      </TouchableOpacity>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <View style={styles.inputBox}>
        <Text style={styles.currencyLabel}>FC</Text>
        <TextInput
          placeholder="Montant à envoyer"
          placeholderTextColor="#8B95A5"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} disabled={loading} onPress={confirm}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="wallet-outline" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Envoyer au compte agent</Text>
      </TouchableOpacity>
    </View>
  );
}

function PrepaidCardActivationCard({
  phone,
  setPhone,
  code,
  setCode,
  cardId,
  readNfc,
  nfcLoading,
  loading,
  sendCode,
  confirm,
  feedback,
}: {
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  cardId: string;
  readNfc: () => void;
  nfcLoading: boolean;
  loading: boolean;
  sendCode: () => void;
  confirm: () => void;
  feedback: { type: 'success' | 'error'; message: string } | null;
}) {
  return (
    <View style={[styles.card, styles.prepaidCard]}>
      <Text style={styles.cardTitle}>Carte prépayée</Text>
      <Text style={styles.cardText}>
        Pour un client sans smartphone : lisez une carte NFC vierge, confirmez son numéro par code, puis activez la carte.
      </Text>

      <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={nfcLoading} onPress={readNfc}>
        {nfcLoading ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={23} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>{nfcLoading ? 'Lecture NFC...' : 'Lire carte vierge NFC'}</Text>
      </TouchableOpacity>

      {!!cardId && (
        <View style={styles.cardReadBox}>
          <MaterialCommunityIcons name="credit-card-check" size={20} color={TAKO_GREEN} />
          <Text style={styles.cardReadText}>Carte vierge lue : {cardId}</Text>
        </View>
      )}

      <View style={styles.inputBox}>
        <Ionicons name="call-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="Numéro de téléphone"
          placeholderTextColor="#8B95A5"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} disabled={loading} onPress={sendCode}>
        {loading ? <ActivityIndicator color={TAKO_BLUE} /> : <Ionicons name="send-outline" size={22} color={TAKO_BLUE} />}
        <Text style={styles.secondaryButtonText}>Envoyer le code</Text>
      </TouchableOpacity>

      <View style={styles.inputBox}>
        <Ionicons name="keypad-outline" size={24} color="#7B8798" />
        <TextInput
          placeholder="Code reçu"
          placeholderTextColor="#8B95A5"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={feedback.type === 'error' ? '#B42318' : '#087B35'}
          />
          <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText]}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.successButton} activeOpacity={0.9} disabled={loading} onPress={confirm}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Activer la carte</Text>
      </TouchableOpacity>
    </View>
  );
}

function AgentAccountCard({ agent, stats }: { agent: any; stats: any }) {
  const displayBalance = Number(agent?.balance || 0);
  const lastActivity = stats?.lastActivity ? formatDate(stats.lastActivity) : 'Aucune activité';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Suivi compte agent</Text>
          <Text style={styles.cardText}>Consultez le solde et l’activité de l’agent en temps réel.</Text>
        </View>
        <View style={styles.clientPill}>
          <Ionicons name="radio-outline" size={16} color={TAKO_BLUE} />
          <Text style={styles.clientPillText}>Instantané</Text>
        </View>
      </View>

      {!agent ? (
        <EmptyState icon="person-circle-outline" title="Aucun agent sélectionné" text="Entrez l’ID agent puis cliquez sur suivre." />
      ) : (
        <View style={styles.detailsGrid}>
          <InfoItem icon="person-outline" label="Agent" value={agent.fullName || 'Agent TaKo'} />
          <InfoItem icon="finger-print-outline" label="ID agent" value={agent.id} />
          <InfoItem icon="shield-checkmark-outline" label="Statut" value={agent.status === 'active' ? 'Actif' : 'En attente'} />
          <InfoItem icon="wallet-outline" label="Solde agent" value={`${displayBalance} FC`} />
          <InfoItem icon="swap-horizontal-outline" label="Transactions" value={`${stats?.transactionCount || 0}`} />
          <InfoItem icon="time-outline" label="Dernière activité" value={lastActivity} />
        </View>
      )}
    </View>
  );
}

function ClientDetails({
  client,
  balance,
  trips,
  notifications,
  updating,
  updateClient,
}: {
  client: any;
  balance: number;
  trips: number;
  notifications: number;
  updating: boolean;
  updateClient: (client: { fullName: string; email: string; phone: string; birthDate: string }) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    setFullName(client?.fullName || '');
    setEmail(client?.email || '');
    setPhone(client?.phone || '');
    setBirthDate(client?.birthDate || '');
  }, [client?.id, client?.fullName, client?.email, client?.phone, client?.birthDate]);

  if (!client) {
    return (
      <View style={[styles.card, styles.fullCard]}>
        <EmptyState icon="id-card-outline" title="Aucun client sélectionné" text="Entrez l’ID du client puis cliquez sur voir le compte client." />
      </View>
    );
  }

  const displayedBalance = Number(client?.balance ?? balance ?? 0);
  const save = () => {
    const cleanFullName = fullName.trim();
    const cleanBirthDate = birthDate.trim();

    if (!cleanFullName || !cleanBirthDate) {
      Alert.alert('Informations obligatoires', 'Le nom complet et la date de naissance sont obligatoires.');
      return;
    }

    Alert.alert(
      'Confirmer la modification',
      'Voulez-vous mettre à jour les informations de ce client ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Mettre à jour',
          onPress: () =>
            updateClient({
              fullName: cleanFullName,
              email: email.trim(),
              phone: phone.trim(),
              birthDate: cleanBirthDate,
            }),
        },
      ],
    );
  };

  return (
    <View style={[styles.card, styles.fullCard]}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Fiche client</Text>
          <Text style={styles.cardText}>Données principales et statut du compte.</Text>
        </View>
        <View style={styles.clientPill}>
          <Ionicons name="finger-print" size={18} color={TAKO_BLUE} />
          <Text style={styles.clientPillText}>{client?.id || '1000000001'}</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <EditableInfoItem icon="person-outline" label="Nom complet" value={fullName} setValue={setFullName} />
        <EditableInfoItem icon="mail-outline" label="Email" value={email} setValue={setEmail} keyboardType="email-address" />
        <EditableInfoItem icon="call-outline" label="Téléphone" value={phone} setValue={setPhone} keyboardType="phone-pad" />
        <EditableInfoItem icon="calendar-outline" label="Date de naissance" value={birthDate} setValue={setBirthDate} placeholder="JJ/MM/AAAA" />
        <InfoItem icon="wallet-outline" label="Solde" value={`${displayedBalance} FC`} />
        <InfoItem icon="bus-outline" label="Trajets" value={`${trips}`} />
        <InfoItem icon="notifications-outline" label="Notifications" value={`${notifications}`} />
      </View>

      <TouchableOpacity style={styles.successButton} activeOpacity={0.9} disabled={updating} onPress={save}>
        {updating ? <ActivityIndicator color="white" /> : <Ionicons name="save-outline" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Mettre à jour</Text>
      </TouchableOpacity>

      <View style={styles.lockedBox}>
        <Ionicons name="lock-closed-outline" size={21} color={TAKO_BLUE} />
        <Text style={styles.lockedText}>ID permanent : non modifiable. Les autres informations verrouillées côté client peuvent être modifiées ici.</Text>
      </View>
    </View>
  );
}

function DriverCard({ driverStatus, approve }: { driverStatus: 'En attente' | 'Actif'; approve: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Validation chauffeur</Text>
      <View style={styles.infoRow}>
        <Ionicons name="person-circle-outline" size={24} color={TAKO_ACTION} />
        <Text style={styles.infoText}>Nom : John</Text>
      </View>
      <View style={styles.infoRow}>
        <MaterialCommunityIcons name="timer-sand" size={24} color={TAKO_ACTION} />
        <Text style={styles.infoText}>Statut : {driverStatus}</Text>
      </View>

      {driverStatus === 'En attente' ? (
        <TouchableOpacity style={styles.successButton} activeOpacity={0.9} onPress={approve}>
          <Ionicons name="checkmark-circle" size={22} color="white" />
          <Text style={styles.primaryButtonText}>Valider le chauffeur</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.activeState}>
          <Ionicons name="checkmark-circle" size={23} color={TAKO_GREEN} />
          <Text style={styles.activeText}>Chauffeur actif</Text>
        </View>
      )}
    </View>
  );
}

function OperationsCard({ route, bus, amount }: { route?: string; bus?: string; amount?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Exploitation transport</Text>
      <InfoItem icon="map-outline" label="Trajet courant" value={route || 'Non configuré'} />
      <InfoItem icon="bus-outline" label="Plaque bus" value={bus || 'Non configurée'} />
      <InfoItem icon="cash-outline" label="Montant" value={amount ? `${amount} FC` : 'Non configuré'} />
    </View>
  );
}

function TransactionSummary({ qr, nfc, recharge }: { qr: number; nfc: number; recharge: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Canaux de paiement</Text>
      <ChannelRow icon="qr-code-outline" label="Paiement QR" value={qr} />
      <ChannelRow icon="phone-portrait-outline" label="Paiement NFC" value={nfc} />
      <ChannelRow icon="card-outline" label="Recharges" value={recharge} />
    </View>
  );
}

function ChannelRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View style={styles.channelRow}>
      <View style={styles.channelLeft}>
        <Ionicons name={icon} size={22} color={TAKO_ACTION} />
        <Text style={styles.infoText}>{label}</Text>
      </View>
      <Text style={styles.channelValue}>{value}</Text>
    </View>
  );
}

function TransactionRow({ item }: { item: TransactionNotification }) {
  const icon = item.type === 'nfc' ? 'phone-portrait-outline' : item.type === 'recharge' ? 'card-outline' : 'qr-code-outline';

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionIcon}>
        <Ionicons name={icon} size={20} color={TAKO_BLUE} />
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle}>{item.title}</Text>
        <Text style={styles.transactionMessage}>{item.message}</Text>
      </View>
      <View style={styles.transactionMeta}>
        <Text style={styles.transactionAmount}>{item.amount} FC</Text>
        <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? TAKO_GREEN : '#9AA6B2'} />
      <Text style={styles.infoText}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={44} color={TAKO_ACTION} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function EditableInfoItem({
  icon,
  label,
  value,
  setValue,
  keyboardType = 'default',
  placeholder,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  setValue: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  placeholder?: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={22} color={TAKO_ACTION} />
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder || 'Non renseigné'}
          placeholderTextColor="#8B95A5"
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          style={styles.detailInput}
        />
      </View>
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={22} color={TAKO_ACTION} />
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  contentScroller: {
    flex: 1,
  },
  mobileShell: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 292,
    backgroundColor: TAKO_BLUE,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 24,
  },
  mobileSidebar: {
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 14,
  },
  brandBlock: {
    marginBottom: 38,
  },
  brandSubtitle: {
    color: '#BFE4FF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  navList: {
    gap: 10,
  },
  mobileNavList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  mobileNavItem: {
    width: '48%',
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  navItemActive: {
    backgroundColor: 'white',
  },
  navText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },
  navTextActive: {
    color: TAKO_BLUE,
  },
  privateBox: {
    marginTop: 'auto',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  mobileHidden: {
    display: 'none',
  },
  privateTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  privateText: {
    color: '#BFE4FF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
  },
  sidebarLogout: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    marginTop: 14,
  },
  mobileSidebarLogout: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
  sidebarLogoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    flexGrow: 1,
    padding: 34,
  },
  mobileContent: {
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 24,
  },
  mobileTopBar: {
    flexDirection: 'column',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileTopActions: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  kicker: {
    color: TAKO_ACTION,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TAKO_BLUE,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 15,
    fontWeight: '700',
  },
  adminBadge: {
    minWidth: 0,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    backgroundColor: 'white',
    paddingHorizontal: 14,
  },
  adminName: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  adminEmail: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  logoutButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: TAKO_BLUE,
    paddingHorizontal: 16,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 18,
  },
  mobileStatsGrid: {
    flexDirection: 'column',
  },
  statCard: {
    minWidth: 0,
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: 'white',
    padding: 18,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statIconGreen: {
    backgroundColor: '#E9FFF1',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  statValue: {
    color: TAKO_BLUE,
    fontSize: 24,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'stretch',
  },
  mobileGrid: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: 14,
  },
  card: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: 'white',
    padding: 22,
  },
  searchCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  internalRechargeCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_GREEN,
  },
  prepaidCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  fullCard: {
    flexBasis: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    color: TAKO_BLUE,
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 18,
  },
  inputBox: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCD6E3',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    height: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: TAKO_BLUE,
  },
  secondaryButton: {
    height: 52,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDFFF',
    backgroundColor: '#EAF3FF',
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  nfcButton: {
    height: 52,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDFFF',
    backgroundColor: '#F6FAFF',
    marginBottom: 14,
  },
  cardReadBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAF0C8',
    backgroundColor: '#E9FFF1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  cardReadText: {
    flex: 1,
    color: '#087B35',
    fontSize: 13,
    fontWeight: '900',
  },
  pendingRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingVertical: 10,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  pendingMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  pendingButton: {
    minWidth: 88,
    height: 42,
    borderRadius: 8,
    backgroundColor: TAKO_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pendingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  currencyLabel: {
    color: TAKO_BLUE,
    fontSize: 17,
    fontWeight: '900',
  },
  successButton: {
    height: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: TAKO_GREEN,
    marginTop: 18,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  infoText: {
    color: '#263247',
    fontSize: 15,
    fontWeight: '800',
  },
  activeState: {
    height: 56,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E9FFF1',
    marginTop: 18,
  },
  activeText: {
    color: '#087B35',
    fontSize: 16,
    fontWeight: '900',
  },
  feedbackBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  feedbackSuccess: {
    backgroundColor: '#E9FFF1',
    borderWidth: 1,
    borderColor: '#BAF0C8',
  },
  feedbackError: {
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFCDC9',
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  feedbackSuccessText: {
    color: '#087B35',
  },
  feedbackErrorText: {
    color: '#B42318',
  },
  clientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clientPillText: {
    color: TAKO_BLUE,
    fontSize: 13,
    fontWeight: '900',
  },
  detailsGrid: {
    flexDirection: 'column',
    gap: 14,
    marginTop: 12,
  },
  detailItem: {
    minWidth: 0,
    flexGrow: 1,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#F6F9FE',
    padding: 14,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: '#7B8798',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  detailValue: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '900',
  },
  detailInput: {
    minHeight: 34,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '900',
    borderBottomWidth: 1,
    borderBottomColor: '#D7E0EF',
    paddingVertical: 4,
  },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    padding: 14,
    marginTop: 18,
  },
  lockedText: {
    flex: 1,
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '900',
  },
  channelRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelValue: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '900',
  },
  transactionRow: {
    minHeight: 74,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingVertical: 12,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionBody: {
    flex: 1,
  },
  transactionTitle: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  transactionMessage: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  transactionMeta: {
    alignItems: 'flex-start',
    marginLeft: 0,
  },
  transactionAmount: {
    color: TAKO_GREEN,
    fontSize: 15,
    fontWeight: '900',
  },
  transactionDate: {
    color: '#8B95A5',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  checkRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyState: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F6F9FE',
    padding: 22,
  },
  emptyTitle: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
});

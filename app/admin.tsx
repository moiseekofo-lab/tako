import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import {
  activatePrepaidCard,
  approveUser,
  createInternalRecharge,
  findClientById,
  getAdminClients,
  getAdminDashboard,
  getAgentAccount,
  getPendingUsers,
  rechargeAgent,
  requestPrepaidCardCode,
  saveNfcCard,
  setNfcCardBlocked,
  updateClientByAdmin,
  updateClientStatus,
  validateAdminSession,
} from '../services/api';
import { useStore, type TransactionNotification, type TripHistoryItem } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';
const PAGE_BG = '#F5F8FF';
const ADMIN_SESSION_KEY = 'tako:adminSession';
const WEB_SCROLLBAR_STYLE = Platform.OS === 'web'
  ? ({
      overflowY: 'auto',
    } as any)
  : null;
type NfcTag = { id?: string; type?: string } | null;

type AdminSection =
  | 'dashboard'
  | 'clients'
  | 'drivers'
  | 'agents'
  | 'nfcCards'
  | 'transactions'
  | 'recharges'
  | 'payouts'
  | 'treasury'
  | 'reconciliation'
  | 'claims'
  | 'notifications'
  | 'reports'
  | 'roles'
  | 'audit'
  | 'settings';

const navItems: Array<{ key: AdminSection; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'grid-outline' },
  { key: 'clients', label: 'Clients', icon: 'people-outline' },
  { key: 'drivers', label: 'Chauffeurs', icon: 'bus-outline' },
  { key: 'agents', label: 'Agents', icon: 'person-add-outline' },
  { key: 'nfcCards', label: 'Cartes NFC', icon: 'card-outline' },
  { key: 'transactions', label: 'Transactions', icon: 'receipt-outline' },
  { key: 'recharges', label: 'Recharges', icon: 'add-circle-outline' },
  { key: 'payouts', label: 'Versements', icon: 'cash-outline' },
  { key: 'treasury', label: 'Trésorerie', icon: 'wallet-outline' },
  { key: 'reconciliation', label: 'Rapprochement', icon: 'git-compare-outline' },
  { key: 'claims', label: 'Réclamations', icon: 'chatbox-ellipses-outline' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { key: 'reports', label: 'Rapports', icon: 'bar-chart-outline' },
  { key: 'roles', label: 'Administrateurs et rôles', icon: 'shield-checkmark-outline' },
  { key: 'audit', label: 'Journal d’activité', icon: 'list-outline' },
  { key: 'settings', label: 'Paramètres', icon: 'settings-outline' },
];

type ModuleDefinition = {
  title: string;
  description: string;
  columns: string[];
  primaryAction: string;
  kind?: 'table' | 'treasury' | 'notifications' | 'reports';
};

const moduleContent: Partial<Record<AdminSection, ModuleDefinition>> = {
  nfcCards: {
    title: 'Cartes NFC',
    description: 'Gérez les cartes, leur association et leur cycle de vie.',
    columns: ['N° de série', 'UID NFC', 'Client', 'Statut', 'Activation', 'Actions'],
    primaryAction: 'Ajouter des cartes',
  },
  recharges: {
    title: 'Recharges',
    description: 'Suivez les recharges clients et les confirmations opérateurs.',
    columns: ['Client', 'Montant', 'Opérateur', 'Référence', 'Date', 'Statut'],
    primaryAction: 'Nouvelle recharge',
  },
  payouts: {
    title: 'Versements',
    description: 'Validez et suivez les versements destinés aux chauffeurs.',
    columns: ['Chauffeur', 'Montant', 'Opérateur', 'Référence', 'Date', 'Statut'],
    primaryAction: 'Nouveau versement',
  },
  treasury: {
    title: 'Trésorerie',
    description: 'Soldes Mobile Money et fonds réellement disponibles.',
    columns: ['Date', 'Opérateur', 'Type', 'Description', 'Montant', 'Solde'],
    primaryAction: 'Actualiser',
    kind: 'treasury',
  },
  reconciliation: {
    title: 'Rapprochement financier',
    description: 'Comparaison entre les opérations TaKo et les relevés des opérateurs.',
    columns: ['Date', 'Opérateur', 'Type d’écart', 'Référence TaKo', 'Montant', 'Statut'],
    primaryAction: 'Lancer le rapprochement',
  },
  claims: {
    title: 'Réclamations',
    description: 'Traitez les réclamations et litiges des utilisateurs.',
    columns: ['N° dossier', 'Utilisateur', 'Catégorie', 'Description', 'Statut', 'Date'],
    primaryAction: 'Nouvelle réclamation',
  },
  notifications: {
    title: 'Notifications',
    description: 'Envoyez un message dans l’application, par SMS ou par e-mail.',
    columns: [],
    primaryAction: 'Envoyer la notification',
    kind: 'notifications',
  },
  reports: {
    title: 'Rapports',
    description: 'Analyse financière et opérationnelle de TaKo.',
    columns: [],
    primaryAction: 'Exporter',
    kind: 'reports',
  },
  roles: {
    title: 'Administrateurs et rôles',
    description: 'Gérez les accès et permissions de l’équipe.',
    columns: ['Utilisateur', 'Rôle', 'Permissions', 'Dernière connexion', 'Statut', 'Actions'],
    primaryAction: 'Ajouter un administrateur',
  },
  audit: {
    title: 'Journal d’activité',
    description: 'Historique inaltérable des actions administratives.',
    columns: ['Date et heure', 'Utilisateur', 'Action', 'Objet', 'Description', 'Adresse IP'],
    primaryAction: 'Exporter',
  },
};

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
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
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
  const [checkingAdminSession, setCheckingAdminSession] = useState(Platform.OS === 'web');
  const [dashboardPeriod, setDashboardPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState('');
  const [clientCardFilter, setClientCardFilter] = useState<'' | 'with' | 'without'>('');
  const [clientPage, setClientPage] = useState(1);
  const [clientDirectory, setClientDirectory] = useState<any>({ clients: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
  const [clientDirectoryLoading, setClientDirectoryLoading] = useState(false);
  const [clientDirectoryVersion, setClientDirectoryVersion] = useState(0);
  const [cardManagerClient, setCardManagerClient] = useState<any>(null);
  const [managedCardId, setManagedCardId] = useState('');
  const [clientActionLoading, setClientActionLoading] = useState(false);

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
    let active = true;

    const restoreAdminSession = async () => {
      if (Platform.OS !== 'web' || isAuthenticated) {
        if (active) {
          setCheckingAdminSession(false);
          loadPendingUsers();
        }
        return;
      }

      try {
        const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
        if (!sessionToken) {
          throw new Error('Session absente');
        }

        const result = await validateAdminSession(sessionToken);
        if (!result?.user) {
          throw new Error('Session invalide');
        }

        if (active) {
          setCurrentUser(result.user);
          setCheckingAdminSession(false);
          loadPendingUsers();
        }
      } catch {
        await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
        if (active) {
          setCheckingAdminSession(false);
          router.replace('/login' as any);
        }
      }
    };

    restoreAdminSession();
    return () => {
      active = false;
    };
  }, [isAuthenticated, router, setCurrentUser]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || activeSection !== 'dashboard') {
      return;
    }

    let active = true;
    const loadDashboard = () => {
      AsyncStorage.getItem(ADMIN_SESSION_KEY)
        .then((sessionToken) => {
          if (!sessionToken) {
            throw new Error('Session absente');
          }
          return getAdminDashboard(sessionToken, dashboardPeriod);
        })
        .then((result) => {
          if (active) {
            setDashboardData(result?.dashboard || null);
          }
        })
        .catch(() => {
          if (active) {
            setDashboardData(null);
          }
        })
        .finally(() => {
          if (active) {
            setDashboardLoading(false);
          }
        });
    };

    setDashboardLoading(true);
    loadDashboard();
    const refreshTimer = setInterval(loadDashboard, 30000);

    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  }, [activeSection, dashboardPeriod, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || activeSection !== 'clients') {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setClientDirectoryLoading(true);
      AsyncStorage.getItem(ADMIN_SESSION_KEY)
        .then((sessionToken) => {
          if (!sessionToken) {
            throw new Error('Session absente');
          }
          return getAdminClients({
            sessionToken,
            search: clientSearch,
            status: clientStatusFilter,
            cardFilter: clientCardFilter,
            page: clientPage,
          });
        })
        .then((result) => {
          if (active) {
            setClientDirectory(result || { clients: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
          }
        })
        .catch(() => {
          if (active) {
            setClientDirectory({ clients: [], stats: {}, pagination: { page: 1, total: 0, limit: 20 } });
          }
        })
        .finally(() => {
          if (active) {
            setClientDirectoryLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeSection, clientCardFilter, clientDirectoryVersion, clientPage, clientSearch, clientStatusFilter, isAuthenticated]);

  const qrTransactions = notifications.filter((item) => item.type === 'qr').length;
  const nfcTransactions = notifications.filter((item) => item.type === 'nfc').length;
  const rechargeTransactions = notifications.filter((item) => item.type === 'recharge').length;
  const activeClient = selectedClient;

  const approve = () => {
    setDriverStatus('Actif');
    Alert.alert('Chauffeur validé', 'Le chauffeur peut maintenant utiliser son compte.');
  };

  const logout = async () => {
    setSelectedClient(null);
    setClientId('');
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
    clearSession();
    router.replace('/login' as any);
  };

  const openClientProfile = async (clientIdToOpen: string) => {
    try {
      setClientActionLoading(true);
      const result = await findClientById(clientIdToOpen);
      if (!result?.client) {
        throw new Error('Client introuvable');
      }
      setSelectedClient(result.client);
      setClientId(clientIdToOpen);
    } catch (error) {
      Alert.alert('Profil indisponible', error instanceof Error ? error.message : 'Impossible de charger ce client.');
    } finally {
      setClientActionLoading(false);
    }
  };

  const changeClientStatus = async (client: any, status: 'active' | 'blocked' | 'closed') => {
    try {
      setClientActionLoading(true);
      const sessionToken = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionToken) {
        throw new Error('Session administrateur expirée');
      }
      await updateClientStatus(client.id, sessionToken, status);
      setClientDirectoryVersion((value) => value + 1);
      if (selectedClient?.id === client.id) {
        setSelectedClient((current: any) => current ? { ...current, status } : current);
      }
      Alert.alert('Compte mis à jour', status === 'closed' ? 'Le compte est fermé et son historique est conservé.' : status === 'blocked' ? 'Le compte est bloqué.' : 'Le compte est réactivé.');
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setClientActionLoading(false);
    }
  };

  const saveManagedCard = async () => {
    if (!cardManagerClient || !managedCardId.trim()) {
      Alert.alert('Carte obligatoire', 'Entrez ou scannez l’identifiant de la carte NFC.');
      return;
    }
    try {
      setClientActionLoading(true);
      await saveNfcCard(cardManagerClient.id, managedCardId.trim());
      setCardManagerClient((client: any) => ({ ...client, nfcCard: { cardId: managedCardId.trim(), blocked: false } }));
      setClientDirectoryVersion((value) => value + 1);
      Alert.alert('Carte associée', 'La carte NFC est maintenant associée à ce client.');
    } catch (error) {
      Alert.alert('Association impossible', error instanceof Error ? error.message : 'Cette carte est peut-être déjà utilisée.');
    } finally {
      setClientActionLoading(false);
    }
  };

  const toggleManagedCard = async () => {
    if (!cardManagerClient?.nfcCard) {
      return;
    }
    try {
      setClientActionLoading(true);
      const blocked = !cardManagerClient.nfcCard.blocked;
      await setNfcCardBlocked(cardManagerClient.id, blocked);
      setCardManagerClient((client: any) => ({ ...client, nfcCard: { ...client.nfcCard, blocked } }));
      setClientDirectoryVersion((value) => value + 1);
    } catch (error) {
      Alert.alert('Action impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setClientActionLoading(false);
    }
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

  if (checkingAdminSession) {
    return (
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={TAKO_BLUE} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.shell, isNarrow && styles.mobileShell]}>
        <View style={[styles.sidebar, isNarrow && styles.mobileSidebar]}>
          <View style={styles.brandBlock}>
            <TakoLogo size="login" color="white" />
          </View>

          <ScrollView
            style={!isNarrow ? styles.navScroller : undefined}
            contentContainerStyle={[styles.navList, isNarrow && styles.mobileNavList]}
            showsVerticalScrollIndicator={false}>
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
          </ScrollView>

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
              <Text style={styles.kicker}>Administration TaKo</Text>
              <Text style={styles.title}>{navItems.find((item) => item.key === activeSection)?.label || 'Tableau de bord'}</Text>
              <Text style={styles.subtitle}>
                {activeSection === 'dashboard' ? 'Vue générale de l’activité TaKo.' : 'Gestion et suivi des opérations.'}
              </Text>
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

          {activeSection === 'dashboard' ? (
            <>
              <View style={styles.dashboardToolbar}>
                <View>
                  <Text style={styles.cardText}>Vue d’ensemble de l’activité de TaKo</Text>
                </View>
                <View style={styles.periodFilters}>
                  {([
                    ['day', 'Jour'],
                    ['week', 'Semaine'],
                    ['month', 'Mois'],
                  ] as const).map(([period, label]) => (
                    <TouchableOpacity
                      key={period}
                      style={[styles.periodButton, dashboardPeriod === period && styles.periodButtonActive]}
                      onPress={() => setDashboardPeriod(period)}>
                      <Text style={[styles.periodButtonText, dashboardPeriod === period && styles.periodButtonTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {dashboardLoading ? (
                <ActivityIndicator size="large" color={TAKO_BLUE} style={styles.dashboardLoader} />
              ) : (
                <View style={[styles.statsGrid, isNarrow && styles.mobileStatsGrid]}>
                  <StatCard icon="people-outline" label="Clients" value={`${dashboardData?.clients ?? 0}`} tone="blue" change={dashboardData?.changes?.clients} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="bus-outline" label="Chauffeurs" value={`${dashboardData?.drivers ?? 0}`} tone="green" change={dashboardData?.changes?.drivers} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="person-add-outline" label="Agents" value={`${dashboardData?.agents ?? 0}`} tone="blue" change={dashboardData?.changes?.agents} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="swap-horizontal-outline" label="Transactions (période)" value={`${dashboardData?.transactions ?? 0}`} tone="blue" change={dashboardData?.changes?.transactions} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="cash-outline" label="Montant collecté" value={`${dashboardData?.collected ?? 0} FC`} tone="green" change={dashboardData?.changes?.collected} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="car-outline" label="À verser aux chauffeurs" value={`${dashboardData?.driverAmount ?? 0} FC`} tone="blue" change={dashboardData?.changes?.driverAmount} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="trending-up-outline" label="Commission TaKo" value={`${dashboardData?.commission ?? 0} FC`} tone="green" change={dashboardData?.changes?.commission} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="checkmark-circle-outline" label="Recharges réussies" value={`${dashboardData?.recharges?.successful ?? 0}`} tone="green" change={dashboardData?.changes?.recharges} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="checkmark-done-outline" label="Versements réussis" value={`${dashboardData?.payouts?.successful ?? 0}`} tone="blue" change={dashboardData?.changes?.payouts} comparison={dashboardData?.comparisonLabel} />
                  <StatCard icon="wallet-outline" label="Solde disponible total" value={`${balance} FC`} tone="green" change={dashboardData?.changes?.balance} comparison={dashboardData?.comparisonLabel} />
                </View>
              )}

              <View style={styles.dashboardCharts}>
                <View style={[styles.card, styles.dashboardChartWide]}>
                  <Text style={styles.cardTitle}>Évolution des transactions</Text>
                  <View style={styles.lineChart}>
                    {[28, 52, 40, 64, 46, 72, 58, 91].map((height, index) => (
                      <View key={index} style={[styles.linePoint, { marginTop: 100 - height }]} />
                    ))}
                  </View>
                </View>
                <View style={[styles.card, styles.dashboardChartCard]}>
                  <Text style={styles.cardTitle}>Répartition des transactions</Text>
                  <View style={styles.donutChart}>
                    <View style={styles.donutCenter}><Text style={styles.donutValue}>{dashboardData?.transactions ?? 0}</Text></View>
                  </View>
                  <View style={styles.chartLegend}>
                    <Text style={styles.legendBlue}>● QR</Text>
                    <Text style={styles.legendGreen}>● NFC</Text>
                    <Text style={styles.legendOrange}>● Recharge</Text>
                  </View>
                </View>
                <View style={[styles.card, styles.dashboardActivityCard]}>
                  <Text style={styles.cardTitle}>Activité en temps réel</Text>
                  {notifications.length ? notifications.slice(0, 5).map((item) => (
                    <View key={item.id} style={styles.activityRow}>
                      <View style={styles.activityIcon}><Ionicons name="flash-outline" size={15} color={TAKO_ACTION} /></View>
                      <View style={styles.activityBody}>
                        <Text style={styles.activityMessage} numberOfLines={1}>{item.message}</Text>
                        <Text style={styles.activityDate}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </View>
                  )) : <Text style={styles.cardText}>Aucune activité récente.</Text>}
                </View>
              </View>

              <View style={styles.dashboardRecentGrid}>
                <DashboardRecentTable
                  title="Dernières recharges"
                  headers={['Client', 'Montant', 'Type', 'Statut', 'Date']}
                  items={notifications.filter((item) => item.type === 'recharge').slice(0, 5)}
                />
                <DashboardRecentTable
                  title="Derniers versements"
                  headers={['Chauffeur', 'Montant', 'Type', 'Statut', 'Date']}
                  items={[]}
                />
              </View>
            </>
          ) : null}

          {activeSection === 'clients' ? (
            <>
              <ClientDirectoryScreen
                directory={clientDirectory}
                loading={clientDirectoryLoading}
                search={clientSearch}
                setSearch={(value) => { setClientSearch(value); setClientPage(1); }}
                status={clientStatusFilter}
                setStatus={(value) => { setClientStatusFilter(value); setClientPage(1); }}
                cardFilter={clientCardFilter}
                setCardFilter={(value) => { setClientCardFilter(value); setClientPage(1); }}
                page={clientPage}
                setPage={setClientPage}
                addClient={() => router.push('/register' as any)}
                viewClient={(client) => openClientProfile(client.id)}
                editClient={(client) => openClientProfile(client.id)}
                manageCard={(client) => {
                  setCardManagerClient(client);
                  setManagedCardId(client.nfcCard?.cardId || '');
                }}
                closeClient={(client) => Alert.alert(
                  'Fermer le compte',
                  `Fermer le compte de ${client.fullName} ? Son historique financier sera conservé.`,
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Fermer', style: 'destructive', onPress: () => changeClientStatus(client, 'closed') },
                  ],
                )}
                actionLoading={clientActionLoading}
              />
              {cardManagerClient ? (
                <View style={[styles.card, styles.cardManager]}>
                  <View style={styles.referenceHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Carte NFC — {cardManagerClient.fullName}</Text>
                      <Text style={styles.cardText}>Une carte ne peut être associée qu’à un seul client.</Text>
                    </View>
                    <TouchableOpacity onPress={() => setCardManagerClient(null)}><Ionicons name="close" size={24} color={TAKO_BLUE} /></TouchableOpacity>
                  </View>
                  <View style={styles.cardManagerRow}>
                    <TextInput
                      value={managedCardId}
                      onChangeText={setManagedCardId}
                      placeholder="UID ou numéro de série NFC"
                      placeholderTextColor="#94A3B8"
                      style={styles.cardManagerInput}
                    />
                    <TouchableOpacity style={styles.referencePrimary} disabled={clientActionLoading} onPress={saveManagedCard}>
                      <Text style={styles.referencePrimaryText}>Associer la carte</Text>
                    </TouchableOpacity>
                    {cardManagerClient.nfcCard ? (
                      <TouchableOpacity style={styles.secondaryAction} disabled={clientActionLoading} onPress={toggleManagedCard}>
                        <Text style={styles.secondaryActionText}>{cardManagerClient.nfcCard.blocked ? 'Réactiver la carte' : 'Suspendre la carte'}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {activeClient ? (
                <View style={[styles.grid, styles.clientProfilePanel, isNarrow && styles.mobileGrid]}>
                  <ClientDetails
                    client={activeClient}
                    balance={Number(activeClient.balance || 0)}
                    trips={trips.length}
                    notifications={notifications.length}
                    updating={clientUpdateLoading}
                    updateClient={updateSelectedClient}
                  />
                </View>
              ) : null}
            </>
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

          {moduleContent[activeSection] ? <AdminModuleSection module={moduleContent[activeSection]!} dashboard={dashboardData} /> : null}
        </ScrollView>
      </View>
    </View>
  );
}

function ClientDirectoryScreen({
  directory,
  loading,
  search,
  setSearch,
  status,
  setStatus,
  cardFilter,
  setCardFilter,
  page,
  setPage,
  addClient,
  viewClient,
  editClient,
  manageCard,
  closeClient,
  actionLoading,
}: {
  directory: any;
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  cardFilter: '' | 'with' | 'without';
  setCardFilter: (value: '' | 'with' | 'without') => void;
  page: number;
  setPage: (value: number) => void;
  addClient: () => void;
  viewClient: (client: any) => void;
  editClient: (client: any) => void;
  manageCard: (client: any) => void;
  closeClient: (client: any) => void;
  actionLoading: boolean;
}) {
  const stats = directory?.stats || {};
  const clients = directory?.clients || [];
  const pagination = directory?.pagination || { total: 0, limit: 20 };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 20)));

  return (
    <View style={styles.clientDirectory}>
      <View style={styles.referenceHeader}>
        <View>
          <Text style={styles.referenceTitle}>Clients</Text>
          <Text style={styles.cardText}>Accueil / Clients</Text>
        </View>
        <TouchableOpacity style={styles.referencePrimary} onPress={addClient}>
          <Ionicons name="add-outline" size={18} color="white" />
          <Text style={styles.referencePrimaryText}>Ajouter un client</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clientStats}>
        <ClientStat icon="people-outline" label="Total clients" value={Number(stats.total || 0)} tone="blue" />
        <ClientStat icon="checkmark-circle-outline" label="Clients actifs" value={Number(stats.active || 0)} tone="green" total={Number(stats.total || 0)} />
        <ClientStat icon="pause-circle-outline" label="Clients inactifs" value={Number(stats.inactive || 0)} tone="orange" total={Number(stats.total || 0)} />
        <ClientStat icon="lock-closed-outline" label="Clients bloqués" value={Number(stats.blocked || 0)} tone="red" total={Number(stats.total || 0)} />
      </View>

      <View style={styles.clientFilters}>
        <View style={styles.clientSearchBox}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par nom, téléphone, e-mail ou ID…"
            placeholderTextColor="#94A3B8"
            style={styles.clientSearchInput}
          />
        </View>
        <View style={styles.filterChoices}>
          {[
            ['', 'Tous'],
            ['active', 'Actifs'],
            ['inactive', 'Inactifs'],
            ['blocked', 'Bloqués'],
          ].map(([value, label]) => (
            <TouchableOpacity key={label} style={[styles.filterChip, status === value && styles.filterChipActive]} onPress={() => setStatus(value)}>
              <Text style={[styles.filterChipText, status === value && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterChoices}>
          {[
            ['', 'Toutes cartes'],
            ['with', 'Avec NFC'],
            ['without', 'Sans NFC'],
          ].map(([value, label]) => (
            <TouchableOpacity key={label} style={[styles.filterChip, cardFilter === value && styles.filterChipActive]} onPress={() => setCardFilter(value as '' | 'with' | 'without')}>
              <Text style={[styles.filterChipText, cardFilter === value && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.clientTable}>
          <View style={[styles.clientTableRow, styles.clientTableHeader]}>
            {['Client', 'Téléphone', 'E-mail', 'Solde (CDF)', 'Carte NFC', 'Statut', 'Inscription', 'Dernière connexion', 'Actions'].map((header) => (
              <Text key={header} style={[styles.clientTableCell, styles.clientTableHeaderText]}>{header}</Text>
            ))}
          </View>
          {loading ? (
            <View style={styles.clientTableLoading}><ActivityIndicator color={TAKO_BLUE} /></View>
          ) : clients.length ? clients.map((client: any) => (
            <View key={client.id} style={styles.clientTableRow}>
              <View style={styles.clientTableCell}>
                <Text style={styles.clientName}>{client.fullName}</Text>
                <Text style={styles.clientSubtext}>{client.id}</Text>
              </View>
              <Text style={styles.clientTableCellText}>{client.phone || 'Non disponible'}</Text>
              <Text style={styles.clientTableCellText}>{client.email || 'Non disponible'}</Text>
              <Text style={styles.clientBalance}>{Number(client.balance || 0).toLocaleString('fr-FR')} CDF</Text>
              <View style={styles.clientTableCell}>
                <Text style={styles.clientTableCellText}>{client.nfcCard?.cardId || 'Aucune'}</Text>
                {client.nfcCard ? <Text style={client.nfcCard.blocked ? styles.statusBlocked : styles.statusActive}>{client.nfcCard.blocked ? 'Suspendue' : 'Active'}</Text> : null}
              </View>
              <View style={styles.clientTableCell}><Text style={client.status === 'active' ? styles.statusActive : client.status === 'blocked' ? styles.statusBlocked : styles.statusInactive}>{client.status || 'Non disponible'}</Text></View>
              <Text style={styles.clientTableCellText}>{formatDate(client.createdAt)}</Text>
              <Text style={styles.clientTableCellText}>{client.lastLoginAt ? formatDate(client.lastLoginAt) : 'Non disponible'}</Text>
              <View style={[styles.clientTableCell, styles.clientActions]}>
                <TouchableOpacity disabled={actionLoading} onPress={() => viewClient(client)} accessibilityLabel={`Voir ${client.fullName}`}><Ionicons name="eye-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity disabled={actionLoading} onPress={() => editClient(client)} accessibilityLabel={`Modifier ${client.fullName}`}><Ionicons name="create-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity disabled={actionLoading} onPress={() => manageCard(client)} accessibilityLabel={`Gérer la carte de ${client.fullName}`}><Ionicons name="card-outline" size={19} color={TAKO_BLUE} /></TouchableOpacity>
                <TouchableOpacity disabled={actionLoading || client.status === 'closed'} onPress={() => closeClient(client)} accessibilityLabel={`Fermer le compte de ${client.fullName}`}><Ionicons name="trash-outline" size={19} color={client.status === 'closed' ? '#CBD5E1' : '#DC2626'} /></TouchableOpacity>
              </View>
            </View>
          )) : (
            <View style={styles.clientTableLoading}><Text style={styles.cardText}>Aucun client trouvé.</Text></View>
          )}
        </View>
      </ScrollView>

      <View style={styles.clientPagination}>
        <Text style={styles.cardText}>{pagination.total || 0} client(s)</Text>
        <View style={styles.paginationButtons}>
          <TouchableOpacity disabled={page <= 1} style={styles.pageButton} onPress={() => setPage(Math.max(1, page - 1))}><Ionicons name="chevron-back" size={17} color={TAKO_BLUE} /></TouchableOpacity>
          <Text style={styles.pageCurrent}>{page} / {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} style={styles.pageButton} onPress={() => setPage(Math.min(totalPages, page + 1))}><Ionicons name="chevron-forward" size={17} color={TAKO_BLUE} /></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ClientStat({ icon, label, value, tone, total }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; tone: 'blue' | 'green' | 'orange' | 'red'; total?: number }) {
  const percentage = total && total > 0 ? `${Math.round((value / total) * 1000) / 10}% du total` : 'Données réelles';
  const toneColor = tone === 'green' ? '#087B35' : tone === 'orange' ? '#B45309' : tone === 'red' ? '#B91C1C' : TAKO_BLUE;
  return (
    <View style={styles.clientStat}>
      <View style={styles.clientStatIcon}><Ionicons name={icon} size={25} color={toneColor} /></View>
      <View>
        <Text style={styles.clientStatLabel}>{label}</Text>
        <Text style={styles.clientStatValue}>{value.toLocaleString('fr-FR')}</Text>
        <Text style={styles.clientSubtext}>{total ? percentage : 'Tous les clients'}</Text>
      </View>
    </View>
  );
}

function DashboardRecentTable({
  title,
  headers,
  items,
}: {
  title: string;
  headers: string[];
  items: TransactionNotification[];
}) {
  return (
    <View style={[styles.card, styles.recentTableCard]}>
      <View style={styles.recentTableTitleRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.moreLink}>Voir tout</Text>
      </View>
      <View style={styles.recentHeader}>
        {headers.map((header) => <Text key={header} style={styles.recentHeaderCell}>{header}</Text>)}
      </View>
      {items.length ? items.map((item) => (
        <View key={item.id} style={styles.recentRow}>
          <Text style={styles.recentCell}>Client TaKo</Text>
          <Text style={styles.recentCell}>{item.amount || 0} FC</Text>
          <Text style={styles.recentCell}>Recharge</Text>
          <Text style={styles.recentStatus}>Réussie</Text>
          <Text style={styles.recentCell}>{formatDate(item.createdAt)}</Text>
        </View>
      )) : (
        <View style={styles.recentEmpty}><Text style={styles.cardText}>Aucune opération enregistrée.</Text></View>
      )}
    </View>
  );
}

function AdminModuleSection({ module, dashboard }: { module: ModuleDefinition; dashboard?: any }) {
  if (module.kind === 'notifications') {
    return (
      <View style={styles.referencePage}>
        <View style={styles.referenceHeader}>
          <View><Text style={styles.referenceTitle}>{module.title}</Text><Text style={styles.cardText}>{module.description}</Text></View>
        </View>
        <View style={[styles.card, styles.notificationComposer]}>
          <Text style={styles.cardTitle}>Envoyer une notification</Text>
          <Text style={styles.formLabel}>Type de notification</Text>
          <View style={styles.channelChoices}>
            {['Notification in-app', 'SMS', 'E-mail', 'WhatsApp'].map((channel, index) => (
              <View key={channel} style={[styles.channelChoice, index === 0 && styles.channelChoiceActive]}>
                <Ionicons name={index === 0 ? 'notifications-outline' : index === 1 ? 'chatbubble-outline' : index === 2 ? 'mail-outline' : 'logo-whatsapp'} size={22} color={TAKO_BLUE} />
                <Text style={styles.channelChoiceText}>{channel}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.formLabel}>Destinataires</Text>
          <View style={styles.referenceSearch}><Ionicons name="people-outline" size={18} color="#64748B" /><Text style={styles.referencePlaceholder}>Tous les clients</Text></View>
          <Text style={styles.formLabel}>Message</Text>
          <TextInput multiline placeholder="Votre message…" placeholderTextColor="#94A3B8" style={styles.messageInput} />
          <TouchableOpacity style={styles.referencePrimary}><Text style={styles.referencePrimaryText}>{module.primaryAction}</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (module.kind === 'reports') {
    return (
      <View style={styles.referencePage}>
        <View style={styles.referenceHeader}>
          <View><Text style={styles.referenceTitle}>{module.title}</Text><Text style={styles.cardText}>{module.description}</Text></View>
          <TouchableOpacity style={styles.referencePrimary}><Ionicons name="download-outline" size={17} color="white" /><Text style={styles.referencePrimaryText}>{module.primaryAction}</Text></TouchableOpacity>
        </View>
        <View style={styles.reportMetrics}>
          <MiniMetric label="Chiffre d’affaires" value={`${dashboard?.collected ?? 0} FC`} />
          <MiniMetric label="Commissions gagnées" value={`${dashboard?.commission ?? 0} FC`} />
          <MiniMetric label="Montants chauffeurs" value={`${dashboard?.driverAmount ?? 0} FC`} />
          <MiniMetric label="Transactions totales" value={`${dashboard?.transactions ?? 0}`} />
        </View>
        <View style={[styles.card, styles.chartCard]}>
          <Text style={styles.cardTitle}>Évolution de l’activité</Text>
          <View style={styles.chartPlaceholder}>
            {[35, 58, 44, 72, 63, 86, 55, 92].map((height, index) => <View key={index} style={[styles.chartBar, { height }]} />)}
          </View>
        </View>
      </View>
    );
  }

  const treasuryAccounts = module.kind === 'treasury' ? ['M-Pesa', 'Orange Money', 'Airtel Money', 'Afrimoney'] : [];
  return (
    <View style={styles.referencePage}>
      <View style={styles.referenceHeader}>
        <View>
          <Text style={styles.referenceTitle}>{module.title}</Text>
          <Text style={styles.cardText}>{module.description}</Text>
        </View>
        <TouchableOpacity style={styles.referencePrimary}>
          <Ionicons name={module.kind === 'treasury' ? 'refresh-outline' : 'add-outline'} size={17} color="white" />
          <Text style={styles.referencePrimaryText}>{module.primaryAction}</Text>
        </TouchableOpacity>
      </View>

      {treasuryAccounts.length ? (
        <View style={styles.treasuryGrid}>
          {treasuryAccounts.map((account) => <MiniMetric key={account} label={account} value="0 CDF" />)}
        </View>
      ) : null}

      <View style={styles.referenceSearch}>
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <Text style={styles.referencePlaceholder}>Rechercher dans {module.title.toLowerCase()}…</Text>
      </View>

      <View style={styles.referenceTable}>
        <View style={styles.referenceTableHeader}>
          {module.columns.map((column) => <Text key={column} style={styles.referenceHeaderCell}>{column}</Text>)}
        </View>
        <View style={styles.referenceEmpty}>
          <Ionicons name="file-tray-outline" size={30} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Aucune donnée enregistrée</Text>
          <Text style={styles.emptyText}>Les informations réelles apparaîtront ici dès leur enregistrement.</Text>
        </View>
      </View>
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text style={styles.miniMetricValue}>{value}</Text>
      <Text style={styles.miniMetricStatus}>Disponible</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  change,
  comparison,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: 'blue' | 'green';
  change?: number | null;
  comparison?: string;
}) {
  const hasComparison = typeof change === 'number';
  const changeText = hasComparison ? `${change >= 0 ? '+' : ''}${change}%` : '—';
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, tone === 'green' && styles.statIconGreen]}>
        <Ionicons name={icon} size={22} color={tone === 'green' ? '#087B35' : TAKO_BLUE} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statComparison}>
        <Text style={[styles.statChange, hasComparison && change < 0 && styles.statChangeNegative]}>{changeText}</Text>
        <Text style={styles.statComparisonLabel}>{hasComparison ? comparison : 'Donnée indisponible'}</Text>
      </View>
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
    width: 250,
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
    marginBottom: 24,
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
    gap: 4,
  },
  navScroller: {
    flex: 1,
  },
  mobileNavList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navItem: {
    minHeight: 40,
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
    fontSize: 13,
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
  dashboardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    marginBottom: 18,
  },
  periodFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  periodButtonActive: {
    borderColor: TAKO_BLUE,
    backgroundColor: TAKO_BLUE,
  },
  periodButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  dashboardLoader: {
    marginVertical: 36,
  },
  dashboardCharts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 18,
  },
  dashboardChartCard: {
    minWidth: 260,
    flex: 1,
  },
  dashboardChartWide: {
    minWidth: 440,
    flexGrow: 2,
    flexBasis: 420,
  },
  dashboardActivityCard: {
    minWidth: 280,
    flex: 1,
  },
  activityRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  activityIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
  },
  activityBody: {
    flex: 1,
  },
  activityMessage: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  activityDate: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 3,
  },
  dashboardRecentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 20,
  },
  recentTableCard: {
    minWidth: 440,
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  recentTableTitleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  moreLink: {
    color: TAKO_ACTION,
    fontSize: 11,
    fontWeight: '900',
  },
  recentHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  recentHeaderCell: {
    flex: 1,
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
  },
  recentRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 14,
  },
  recentCell: {
    flex: 1,
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  recentStatus: {
    flex: 1,
    color: '#087B35',
    fontSize: 10,
    fontWeight: '900',
  },
  recentEmpty: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutChart: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 75,
    borderWidth: 30,
    borderColor: TAKO_GREEN,
    borderTopColor: TAKO_ACTION,
    borderRightColor: '#FFC35C',
    marginVertical: 20,
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    color: TAKO_BLUE,
    fontSize: 20,
    fontWeight: '900',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendBlue: {
    color: TAKO_ACTION,
    fontSize: 11,
    fontWeight: '800',
  },
  legendGreen: {
    color: TAKO_GREEN,
    fontSize: 11,
    fontWeight: '800',
  },
  legendOrange: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  lineChart: {
    minHeight: 190,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  linePoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TAKO_ACTION,
  },
  statusPanels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 20,
  },
  statusPanel: {
    flexBasis: 220,
  },
  statusLine: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  statusLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  statusSuccess: {
    color: '#087B35',
    fontWeight: '900',
  },
  statusPending: {
    color: '#B45309',
    fontWeight: '900',
  },
  statusFailed: {
    color: '#B91C1C',
    fontWeight: '900',
  },
  alertPanel: {
    flexBasis: 300,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    padding: 12,
    marginTop: 10,
  },
  alertText: {
    flex: 1,
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  mobileStatsGrid: {
    flexDirection: 'column',
  },
  statCard: {
    minWidth: 180,
    flexGrow: 1,
    flexBasis: '18%',
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
  statComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
  },
  statChange: {
    color: '#087B35',
    fontSize: 11,
    fontWeight: '900',
  },
  statChangeNegative: {
    color: '#B91C1C',
  },
  statComparisonLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  referencePage: {
    gap: 18,
  },
  clientDirectory: {
    gap: 18,
  },
  clientStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  clientStat: {
    minWidth: 210,
    flexGrow: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  clientStatIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F1F5FF',
  },
  clientStatLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  clientStatValue: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
    marginVertical: 3,
  },
  clientSubtext: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  clientFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  clientSearchBox: {
    minWidth: 320,
    minHeight: 44,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    paddingHorizontal: 13,
  },
  clientSearchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
  },
  filterChoices: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    paddingHorizontal: 11,
  },
  filterChipActive: {
    borderColor: TAKO_BLUE,
    backgroundColor: TAKO_BLUE,
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clientTable: {
    minWidth: 1320,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  clientTableRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingHorizontal: 14,
  },
  clientTableHeader: {
    minHeight: 48,
    backgroundColor: '#F8FAFC',
  },
  clientTableCell: {
    width: 145,
    paddingRight: 10,
  },
  clientTableHeaderText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '900',
  },
  clientTableCellText: {
    width: 145,
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    paddingRight: 10,
  },
  clientName: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  clientBalance: {
    width: 145,
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '900',
    paddingRight: 10,
  },
  statusActive: {
    alignSelf: 'flex-start',
    color: '#087B35',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#E9FFF1',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusInactive: {
    alignSelf: 'flex-start',
    color: '#B45309',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#FFF7ED',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusBlocked: {
    alignSelf: 'flex-start',
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  clientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientTableLoading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
  },
  pageCurrent: {
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '900',
  },
  clientProfilePanel: {
    marginTop: 20,
  },
  cardManager: {
    marginTop: 20,
  },
  cardManagerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  cardManagerInput: {
    minWidth: 280,
    minHeight: 42,
    flexGrow: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    color: '#111827',
    paddingHorizontal: 13,
  },
  secondaryAction: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: TAKO_BLUE,
    paddingHorizontal: 15,
  },
  secondaryActionText: {
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '900',
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  referenceTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 5,
  },
  referencePrimary: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 6,
    backgroundColor: TAKO_BLUE,
    paddingHorizontal: 16,
  },
  referencePrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  referenceSearch: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  referencePlaceholder: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  referenceTable: {
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
  },
  referenceTableHeader: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    paddingHorizontal: 16,
  },
  referenceHeaderCell: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  referenceEmpty: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  treasuryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  miniMetric: {
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  miniMetricLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  miniMetricValue: {
    color: TAKO_BLUE,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  miniMetricStatus: {
    color: '#087B35',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  reportMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  chartCard: {
    minHeight: 300,
  },
  chartPlaceholder: {
    minHeight: 210,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F2',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  chartBar: {
    width: 24,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: TAKO_ACTION,
  },
  notificationComposer: {
    maxWidth: 720,
  },
  formLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 8,
  },
  channelChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  channelChoice: {
    minWidth: 130,
    alignItems: 'center',
    gap: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    padding: 14,
  },
  channelChoiceActive: {
    borderColor: TAKO_BLUE,
    backgroundColor: '#EAF3FF',
  },
  channelChoiceText: {
    color: TAKO_BLUE,
    fontSize: 12,
    fontWeight: '800',
  },
  messageInput: {
    minHeight: 150,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    color: '#111827',
    padding: 14,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  moduleGrid: {
    marginTop: 4,
  },
  moduleIntro: {
    flexBasis: '100%',
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  moduleTitle: {
    color: TAKO_BLUE,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  moduleAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  moduleActionText: {
    color: TAKO_BLUE,
    fontSize: 14,
    fontWeight: '800',
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

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { createInternalRecharge, findClientById } from '../services/api';
import { useStore, type TransactionNotification, type TripHistoryItem } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';
const PAGE_BG = '#F5F8FF';

type AdminSection = 'dashboard' | 'clients' | 'drivers' | 'transactions' | 'settings';

const navItems: Array<{ key: AdminSection; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'grid-outline' },
  { key: 'clients', label: 'Clients', icon: 'people-outline' },
  { key: 'drivers', label: 'Chauffeurs', icon: 'bus-outline' },
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
  const trips = useStore((state: any) => state.trips) as TripHistoryItem[];
  const notifications = useStore((state: any) => state.notifications) as TransactionNotification[];
  const balance = useStore((state: any) => state.balance);
  const driverTripInfo = useStore((state: any) => state.driverTripInfo);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [clientId, setClientId] = useState('');
  const [rechargeClientId, setRechargeClientId] = useState(String(params.clientId || ''));
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [driverStatus, setDriverStatus] = useState<'En attente' | 'Actif'>('En attente');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.clientId) {
      setRechargeClientId(String(params.clientId));
      setClientId(String(params.clientId));
      setActiveSection('clients');
    }
  }, [params.clientId]);

  const totalTripAmount = useMemo(() => trips.reduce((sum, trip) => sum + Number(trip.amount || 0), 0), [trips]);
  const qrTransactions = notifications.filter((item) => item.type === 'qr').length;
  const nfcTransactions = notifications.filter((item) => item.type === 'nfc').length;
  const rechargeTransactions = notifications.filter((item) => item.type === 'recharge').length;
  const activeClient = selectedClient || currentUser;

  const approve = () => {
    setDriverStatus('Actif');
    Alert.alert('Chauffeur validé', 'Le chauffeur peut maintenant utiliser son compte.');
  };

  const logout = () => {
    setSelectedClient(null);
    setClientId('');
    router.replace('/login' as any);
  };

  const findClient = async () => {
    const cleanClientId = clientId.trim();
    if (!cleanClientId) {
      Alert.alert('ID obligatoire', 'Entrez l’ID du client.');
      return;
    }

    try {
      const result = await findClientById(cleanClientId);
      if (result?.client) {
        setSelectedClient(result.client);
        setActiveSection('clients');
        return;
      }
    } catch {
      // Le mode local reste disponible si le backend n’est pas joignable.
    }

    if (!currentUser?.id || cleanClientId !== currentUser.id) {
      setSelectedClient(null);
      Alert.alert('Client introuvable', 'Aucun compte client trouvé avec cet ID.');
      return;
    }

    setSelectedClient(currentUser);
    setActiveSection('clients');
  };

  const confirmInternalRecharge = async () => {
    const cleanClientId = rechargeClientId.trim();
    const value = Number.parseInt(rechargeAmount, 10);

    if (!cleanClientId || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Informations obligatoires', 'Entrez l’ID du client et le montant.');
      return;
    }

    try {
      setRechargeLoading(true);
      const result = await createInternalRecharge({
        clientId: cleanClientId,
        amount: value,
        agentId: currentUser?.id || 'ADMIN',
      });

      if (result?.client) {
        setSelectedClient(result.client);
        setClientId(cleanClientId);
      }

      setRechargeAmount('');
      Alert.alert('Recharge confirmée', `${value} FC ajouté au compte ${cleanClientId}.`);
      setActiveSection('clients');
    } catch (error) {
      Alert.alert('Recharge impossible', error instanceof Error ? error.message : 'Vérifiez l’ID du client.');
    } finally {
      setRechargeLoading(false);
    }
  };

  const refreshPage = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 750);
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
          contentContainerStyle={[styles.content, isNarrow && styles.mobileContent]}
          showsVerticalScrollIndicator={false}
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
              <ClientSearchCard clientId={clientId} setClientId={setClientId} findClient={findClient} />
              <InternalRechargeCard
                clientId={rechargeClientId}
                setClientId={setRechargeClientId}
                amount={rechargeAmount}
                setAmount={setRechargeAmount}
                loading={rechargeLoading}
                confirm={confirmInternalRecharge}
                scan={() => router.push('/internal-recharge-scan' as any)}
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
              <ClientSearchCard clientId={clientId} setClientId={setClientId} findClient={findClient} />
              <InternalRechargeCard
                clientId={rechargeClientId}
                setClientId={setRechargeClientId}
                amount={rechargeAmount}
                setAmount={setRechargeAmount}
                loading={rechargeLoading}
                confirm={confirmInternalRecharge}
                scan={() => router.push('/internal-recharge-scan' as any)}
              />
              <ClientDetails client={activeClient} balance={balance} trips={trips.length} notifications={notifications.length} />
            </View>
          ) : null}

          {activeSection === 'drivers' ? (
            <View style={[styles.grid, isNarrow && styles.mobileGrid]}>
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
}: {
  clientId: string;
  setClientId: (value: string) => void;
  findClient: () => void;
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

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={findClient}>
        <Ionicons name="search" size={22} color="white" />
        <Text style={styles.primaryButtonText}>Voir le compte client</Text>
      </TouchableOpacity>
    </View>
  );
}

function InternalRechargeCard({
  clientId,
  setClientId,
  amount,
  setAmount,
  loading,
  confirm,
  scan,
}: {
  clientId: string;
  setClientId: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  loading: boolean;
  confirm: () => void;
  scan: () => void;
}) {
  return (
    <View style={[styles.card, styles.internalRechargeCard]}>
      <Text style={styles.cardTitle}>Recharge interne</Text>
      <Text style={styles.cardText}>Scannez le QR du client ou entrez son ID, puis confirmez le montant.</Text>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={scan}>
        <Ionicons name="qr-code-outline" size={22} color={TAKO_BLUE} />
        <Text style={styles.secondaryButtonText}>Scanner le QR client</Text>
      </TouchableOpacity>

      <View style={styles.inputBox}>
        <Ionicons name="finger-print" size={24} color="#7B8798" />
        <TextInput
          placeholder="ID client"
          placeholderTextColor="#8B95A5"
          value={clientId}
          onChangeText={setClientId}
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

      <TouchableOpacity style={styles.successButton} activeOpacity={0.9} disabled={loading} onPress={confirm}>
        {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={22} color="white" />}
        <Text style={styles.primaryButtonText}>Confirmer la recharge</Text>
      </TouchableOpacity>
    </View>
  );
}

function ClientDetails({ client, balance, trips, notifications }: { client: any; balance: number; trips: number; notifications: number }) {
  const displayedBalance = Number(client?.balance ?? balance ?? 0);

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
        <InfoItem icon="person-outline" label="Nom" value={client?.fullName || 'Non renseigné'} />
        <InfoItem icon="mail-outline" label="Email" value={client?.email || 'Non renseigné'} />
        <InfoItem icon="call-outline" label="Téléphone" value={client?.phone || 'Non renseigné'} />
        <InfoItem icon="calendar-outline" label="Naissance" value={client?.birthDate || 'Non renseignée'} />
        <InfoItem icon="wallet-outline" label="Solde" value={`${displayedBalance} FC`} />
        <InfoItem icon="bus-outline" label="Trajets" value={`${trips}`} />
        <InfoItem icon="notifications-outline" label="Notifications" value={`${notifications}`} />
      </View>

      <View style={styles.lockedBox}>
        <Ionicons name="lock-closed-outline" size={21} color={TAKO_BLUE} />
        <Text style={styles.lockedText}>ID permanent : non modifiable, même par administrateur.</Text>
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

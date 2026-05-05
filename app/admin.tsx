import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { findClientById } from '../services/api';
import { useStore } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';

export default function Admin() {
  const isWeb = Platform.OS === 'web';
  const currentUser = useStore((state: any) => state.currentUser);
  const trips = useStore((state: any) => state.trips);
  const notifications = useStore((state: any) => state.notifications);
  const balance = useStore((state: any) => state.balance);
  const [clientId, setClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [driverStatus, setDriverStatus] = useState<'En attente' | 'Actif'>('En attente');

  const approve = () => {
    setDriverStatus('Actif');
    Alert.alert('Chauffeur validé', 'Le chauffeur peut maintenant utiliser son compte.');
  };

  const findClient = async () => {
    const cleanClientId = clientId.trim().toUpperCase();
    if (!cleanClientId) {
      Alert.alert('ID obligatoire', 'Entrez l’ID du client.');
      return;
    }

    try {
      const result = await findClientById(cleanClientId);
      if (result?.client) {
        setSelectedClient(result.client);
        return;
      }
    } catch {
      // Le mode local reste disponible si le backend n’est pas joignable.
    }

    if (!currentUser?.id || cleanClientId !== currentUser.id.toUpperCase()) {
      setSelectedClient(null);
      Alert.alert('Client introuvable', 'Aucun compte client trouvé avec cet ID.');
      return;
    }

    setSelectedClient(currentUser);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, isWeb && styles.webContainer]} keyboardShouldPersistTaps="always">
      <View style={[styles.shell, isWeb && styles.webShell]}>
        <View style={styles.brandRow}>
          <TakoLogo size={isWeb ? 'small' : 'login'} color={TAKO_BLUE} />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.kicker}>Espace privé</Text>
              <Text style={styles.title}>Compte administrateur</Text>
              <Text style={styles.subtitle}>Gestion interne des clients, chauffeurs et paiements TaKo.</Text>
            </View>

            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={20} color={TAKO_BLUE} />
              <Text style={styles.badgeText}>Travailleurs seulement</Text>
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={24} color={TAKO_BLUE} />
            <Text style={styles.noticeText}>
              Cette version web n’est pas publique. Elle est réservée aux comptes administrateur et chauffeur.
            </Text>
          </View>

          <View style={isWeb ? styles.webGrid : styles.mobileGrid}>
            <View style={[styles.card, styles.searchCard]}>
              <Text style={styles.cardTitle}>Accès au compte client</Text>
              <Text style={styles.cardText}>Recherchez un client avec son ID TaKo permanent.</Text>

              <View style={styles.inputBox}>
                <Ionicons name="id-card-outline" size={24} color="#7B8798" />
                <TextInput
                  placeholder="Entrer l’ID client"
                  placeholderTextColor="#8B95A5"
                  value={clientId}
                  onChangeText={setClientId}
                  autoCapitalize="characters"
                  style={styles.input}
                />
              </View>

              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={findClient}>
                <Ionicons name="search" size={22} color="white" />
                <Text style={styles.primaryButtonText}>Voir le compte client</Text>
              </TouchableOpacity>
            </View>

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

            {selectedClient ? (
              <View style={[styles.card, isWeb && styles.fullCard]}>
                <View style={styles.clientHeader}>
                  <View>
                    <Text style={styles.cardTitle}>Compte client</Text>
                    <Text style={styles.cardText}>Informations enregistrées dans TaKo.</Text>
                  </View>
                  <View style={styles.clientPill}>
                    <Ionicons name="finger-print" size={18} color={TAKO_BLUE} />
                    <Text style={styles.clientPillText}>{selectedClient.id}</Text>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <InfoItem icon="person-outline" label="Nom" value={selectedClient.fullName || 'Non renseigné'} />
                  <InfoItem icon="mail-outline" label="Email" value={selectedClient.email || 'Non renseigné'} />
                  <InfoItem icon="call-outline" label="Téléphone" value={selectedClient.phone || 'Non renseigné'} />
                  <InfoItem icon="calendar-outline" label="Naissance" value={selectedClient.birthDate || 'Non renseignée'} />
                  <InfoItem icon="wallet-outline" label="Solde" value={`${balance} FC`} />
                  <InfoItem icon="bus-outline" label="Trajets" value={`${trips.length}`} />
                  <InfoItem icon="notifications-outline" label="Notifications" value={`${notifications.length}`} />
                </View>

                <View style={styles.lockedBox}>
                  <Ionicons name="lock-closed-outline" size={21} color={TAKO_BLUE} />
                  <Text style={styles.lockedText}>ID permanent : non modifiable, même par administrateur.</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoItem({ icon, label, value }: { icon: any; label: string; value: string }) {
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
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 42,
  },
  webContainer: {
    minHeight: '100%',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 48,
  },
  shell: {
    width: '100%',
  },
  webShell: {
    maxWidth: 1180,
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: 70,
  },
  panel: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    backgroundColor: 'white',
    padding: 34,
    shadowColor: '#061F68',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
    alignItems: 'flex-start',
    marginBottom: 26,
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
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 14,
  },
  badgeText: {
    color: TAKO_BLUE,
    fontSize: 13,
    fontWeight: '900',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFE0F7',
    backgroundColor: '#F7FBFF',
    padding: 16,
    marginBottom: 28,
  },
  noticeText: {
    flex: 1,
    color: '#263247',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'stretch',
  },
  mobileGrid: {
    gap: 18,
  },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 330,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  searchCard: {
    borderTopWidth: 4,
    borderTopColor: TAKO_ACTION,
  },
  fullCard: {
    flexBasis: '100%',
  },
  cardTitle: {
    color: TAKO_BLUE,
    fontSize: 22,
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
    backgroundColor: '#FFFFFF',
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
    fontSize: 16,
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
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'flex-start',
    marginBottom: 6,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },
  detailItem: {
    minWidth: 240,
    flexGrow: 1,
    flexBasis: 0,
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
});

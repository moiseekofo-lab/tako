import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NAVY = '#061F68';
const BLUE = '#0877EA';
type Filter = 'all' | 'upcoming' | 'completed';
type Reservation = {
  id: string; type: 'trip' | 'car'; title: string; date: string; meta: string; status: 'confirmed' | 'pending' | 'completed'; price: string;
};

const initialReservations: Reservation[] = [
  { id: '1', type: 'trip', title: 'Kinshasa  →  Matadi', date: '21/08/2026 à 08:00', meta: '1 passager  •  Aller simple', status: 'confirmed', price: '90 000 FC' },
  { id: '2', type: 'trip', title: 'Matadi  →  Kinshasa', date: '25/08/2026 à 14:00', meta: '1 passager  •  Aller simple', status: 'confirmed', price: '90 000 FC' },
  { id: '3', type: 'trip', title: 'Kinshasa  →  Muanda', date: '03/09/2026 à 07:30', meta: '1 passager  •  Aller simple', status: 'pending', price: '95 000 FC' },
  { id: '4', type: 'car', title: 'Location de voiture', date: 'Du 28/08/2026 à 09:00 au 30/08/2026 à 09:00', meta: 'Toyota RAV4  •  Sans chauffeur', status: 'confirmed', price: '250 000 FC/jour' },
  { id: '5', type: 'trip', title: 'Kinshasa  →  Boma', date: '10/08/2026 à 09:00', meta: '1 passager  •  Aller simple', status: 'completed', price: '85 000 FC' },
];

export default function MyReservations() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [reservations, setReservations] = useState(initialReservations);
  const upcoming = reservations.filter((item) => item.status !== 'completed');
  const completed = reservations.filter((item) => item.status === 'completed');
  const showUpcoming = filter !== 'completed';
  const showCompleted = filter !== 'upcoming';
  const cancel = (id: string) => Alert.alert('Annuler la réservation ?', 'Cette action retirera la réservation de votre liste.', [
    { text: 'Retour', style: 'cancel' },
    { text: 'Annuler la réservation', style: 'destructive', onPress: () => setReservations((items) => items.filter((item) => item.id !== id)) },
  ]);

  return <SafeAreaView style={styles.page}>
    <View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={NAVY} /></TouchableOpacity><Text style={styles.title}>Mes réservations</Text><View style={styles.spacer} /></View>
    <View style={styles.filters}>
      <FilterButton icon="ticket-outline" label="Toutes" active={filter === 'all'} onPress={() => setFilter('all')} />
      <FilterButton icon="time-outline" label="À venir" active={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
      <FilterButton icon="checkmark-circle-outline" label="Terminées" active={filter === 'completed'} onPress={() => setFilter('completed')} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {showUpcoming && <><Text style={styles.section}>Prochaines réservations</Text>{upcoming.map((item) => <ReservationCard key={item.id} item={item} onCancel={() => cancel(item.id)} />)}</>}
      {showCompleted && <><Text style={styles.section}>Réservations terminées</Text>{completed.map((item) => <ReservationCard key={item.id} item={item} />)}</>}
      <TouchableOpacity style={styles.help} onPress={() => Alert.alert('Besoin d’aide ?', 'Contactez le service client TaKo depuis le menu Aide.')}>
        <View style={styles.helpIcon}><Ionicons name="headset-outline" size={27} color={BLUE} /></View><View style={styles.grow}><Text style={styles.helpTitle}>Besoin d’aide ?</Text><Text style={styles.helpText}>Contactez notre service client pour toute question concernant vos réservations.</Text></View><Ionicons name="chevron-forward" size={23} color={NAVY} />
      </TouchableOpacity>
    </ScrollView>
    <View style={styles.navigation}>
      <NavItem icon="wallet-outline" label="Accueil" onPress={() => router.replace('/home')} />
      <NavItem icon="qr-code-outline" label="Payer" onPress={() => router.push('/qr')} />
      <NavItem icon="card-outline" label="Recharge" onPress={() => router.push('/recharge')} />
      <NavItem icon="menu-outline" label="Menu" active onPress={() => router.replace('/home')} />
    </View>
  </SafeAreaView>;
}

function FilterButton({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.filter, active && styles.filterActive]} onPress={onPress}><Ionicons name={icon} size={20} color={active ? '#fff' : NAVY} /><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></TouchableOpacity>;
}

function ReservationCard({ item, onCancel }: { item: Reservation; onCancel?: () => void }) {
  const status = item.status === 'confirmed' ? 'Confirmé' : item.status === 'pending' ? 'En attente' : 'Terminée';
  return <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={styles.transportIcon}><Ionicons name={item.type === 'car' ? 'car' : 'bus'} size={27} color={NAVY} /></View>
      <View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.title}</Text><View style={styles.metaRow}><Ionicons name="calendar-outline" size={15} color="#687184" /><Text style={styles.cardMeta}>{item.date}</Text></View><View style={styles.metaRow}><Ionicons name={item.type === 'car' ? 'car-outline' : 'person-outline'} size={15} color="#687184" /><Text style={styles.cardMeta}>{item.meta}</Text></View></View>
      <View style={styles.cardRight}><View style={[styles.status, item.status === 'confirmed' ? styles.confirmed : item.status === 'pending' ? styles.pending : styles.finished]}><Text style={[styles.statusText, item.status === 'confirmed' ? styles.confirmedText : item.status === 'pending' ? styles.pendingText : styles.finishedText]}>{status}</Text></View><Text style={styles.price}>{item.price}</Text><Ionicons name="chevron-forward" size={23} color={NAVY} /></View>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity style={styles.outlineButton} onPress={() => Alert.alert('Détails', `${item.title}\n${item.date}\n${item.meta}\n${item.price}`)}><Ionicons name="information-circle-outline" size={17} color={BLUE} /><Text style={styles.outlineText}>Détails</Text></TouchableOpacity>
      {item.status === 'completed' ? null : item.status === 'pending' ? <TouchableOpacity style={styles.outlineButton} onPress={onCancel}><Ionicons name="close" size={18} color={BLUE} /><Text style={styles.outlineText}>Annuler</Text></TouchableOpacity> : <TouchableOpacity style={styles.primaryButton} onPress={() => Alert.alert(item.type === 'car' ? 'Réservation de voiture' : 'Billet TaKo', 'Votre réservation est confirmée.')}><Ionicons name={item.type === 'car' ? 'calendar-outline' : 'ticket-outline'} size={18} color="#fff" /><Text style={styles.primaryText}>{item.type === 'car' ? 'Voir la réservation' : 'Voir le billet'}</Text></TouchableOpacity>}
    </View>
  </View>;
}

function NavItem({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean; onPress: () => void }) {
  return <TouchableOpacity style={styles.navItem} onPress={onPress}><Ionicons name={icon} size={24} color={active ? NAVY : '#666D78'} /><Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' }, grow: { flex: 1 }, header: { height: 76, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#E1E5EC', alignItems: 'center', justifyContent: 'center' }, title: { color: NAVY, fontSize: 24, fontWeight: '900' }, spacer: { width: 46 },
  filters: { flexDirection: 'row', gap: 12, paddingHorizontal: 22, paddingBottom: 14 }, filter: { flex: 1, height: 50, borderWidth: 1, borderColor: '#E2E6ED', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, filterActive: { backgroundColor: NAVY, borderColor: NAVY }, filterText: { color: NAVY, fontSize: 14, fontWeight: '800' }, filterTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: 22, paddingBottom: 20 }, section: { color: NAVY, fontSize: 18, fontWeight: '900', marginTop: 14, marginBottom: 11 }, card: { borderWidth: 1, borderColor: '#E8EBF1', borderRadius: 13, padding: 13, marginBottom: 12, backgroundColor: '#fff', shadowColor: NAVY, shadowOpacity: .035, shadowRadius: 8, elevation: 1 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start' }, transportIcon: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#F1F6FF', alignItems: 'center', justifyContent: 'center', marginRight: 11 }, cardCopy: { flex: 1, minWidth: 0 }, cardTitle: { color: NAVY, fontSize: 16, fontWeight: '900', marginBottom: 6 }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }, cardMeta: { flex: 1, color: '#687184', fontSize: 14 }, cardRight: { minWidth: 100, alignItems: 'flex-end', gap: 7 }, status: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6 }, confirmed: { backgroundColor: '#E5F8EF' }, pending: { backgroundColor: '#FFF4DF' }, finished: { backgroundColor: '#F1F3F8' }, statusText: { fontSize: 14, fontWeight: '800' }, confirmedText: { color: '#139760' }, pendingText: { color: '#E09A22' }, finishedText: { color: '#788096' }, price: { color: NAVY, fontSize: 16, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 13 }, outlineButton: { flex: 1, height: 39, borderWidth: 1, borderColor: BLUE, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, outlineText: { color: BLUE, fontSize: 14, fontWeight: '800' }, primaryButton: { flex: 1, height: 39, borderRadius: 7, backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, primaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  help: { minHeight: 88, marginTop: 5, borderRadius: 13, backgroundColor: '#F1F5FF', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, helpIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, helpTitle: { color: NAVY, fontSize: 16, fontWeight: '900' }, helpText: { color: '#596274', fontSize: 14, lineHeight: 19, marginTop: 3 },
  navigation: { height: 72, borderTopWidth: 1, borderTopColor: '#E8EBF1', flexDirection: 'row', backgroundColor: '#fff' }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }, navText: { color: '#666D78', fontSize: 14 }, navTextActive: { color: NAVY, fontWeight: '800' },
});

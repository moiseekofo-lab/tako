import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const NAVY = '#061F68';
const ACTION = '#0877EA';
type Tab = 'upcoming' | 'completed' | 'cancelled';
type Reservation = {
  id: string;
  day: string;
  month: string;
  time: string;
  departureCity: string;
  departurePlace: string;
  arrivalCity: string;
  arrivalPlace: string;
  seatClass: string;
  seat?: string;
  reference: string;
  status: Tab;
};

const initialReservations: Reservation[] = [
  { id: '1', day: '03', month: 'sept.', time: '07:30', departureCity: 'Kinshasa', departurePlace: 'Gare Centrale', arrivalCity: 'Muanda', arrivalPlace: 'Agence Express Muanda', seatClass: 'Confort', seat: 'Siège 2', reference: 'TK9F2A', status: 'upcoming' },
  { id: '2', day: '12', month: 'sept.', time: '09:00', departureCity: 'Kinshasa', departurePlace: 'Gombe', arrivalCity: 'Matadi', arrivalPlace: 'Agence Centrale Matadi', seatClass: 'Standard', seat: 'Siège 8', reference: 'TK4B7M', status: 'upcoming' },
  { id: '3', day: '25', month: 'août', time: '14:00', departureCity: 'Matadi', departurePlace: 'Agence Matadi', arrivalCity: 'Kinshasa', arrivalPlace: 'Gare Centrale', seatClass: 'Confort', seat: 'Siège 5', reference: 'TK8D3P', status: 'completed' },
  { id: '4', day: '10', month: 'août', time: '09:00', departureCity: 'Kinshasa', departurePlace: 'Gare Centrale', arrivalCity: 'Boma', arrivalPlace: 'Agence Boma', seatClass: 'Standard', reference: 'TK2C6R', status: 'completed' },
  { id: '5', day: '18', month: 'août', time: '06:30', departureCity: 'Kinshasa', departurePlace: 'Limete', arrivalCity: 'Matadi', arrivalPlace: 'Agence Centrale Matadi', seatClass: 'Standard', seat: 'Siège 11', reference: 'TK5N1Q', status: 'cancelled' },
];

export default function MyReservations() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [tab, setTab] = useState<Tab>('upcoming');
  const [reservations, setReservations] = useState(initialReservations);
  const visible = reservations.filter((item) => item.status === tab);

  const openReservation = (item: Reservation) => {
    Alert.alert('Réservation TaKo', `${item.departureCity} → ${item.arrivalCity}\n${item.day} ${item.month} à ${item.time}\nRéférence : ${item.reference}`);
  };

  const cancelReservation = (item: Reservation) => {
    Alert.alert('Annuler la réservation ?', `Référence ${item.reference}`, [
      { text: 'Retour', style: 'cancel' },
      { text: 'Annuler la réservation', style: 'destructive', onPress: () => setReservations((items) => items.map((current) => current.id === item.id ? { ...current, status: 'cancelled' } : current)) },
    ]);
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={30} color={ACTION} /></TouchableOpacity>
        <Text style={styles.title}>Mes réservations</Text><View style={styles.back} />
      </View>

      <View style={[styles.tabs, compact && styles.tabsCompact]}>
        <TabButton label="À venir" active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
        <TabButton label="Terminées" active={tab === 'completed'} onPress={() => setTab('completed')} />
        <TabButton label="Annulées" active={tab === 'cancelled'} onPress={() => setTab('cancelled')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
        {visible.length ? visible.map((item) => <ReservationCard compact={compact} key={item.id} item={item} onOpen={() => openReservation(item)} onCancel={item.status === 'upcoming' ? () => cancelReservation(item) : undefined} />) : (
          <View style={styles.empty}><Ionicons name="ticket-outline" size={56} color="#B6C4DB" /><Text style={styles.emptyTitle}>Aucune réservation</Text><Text style={styles.emptyText}>Vos voyages de cette catégorie apparaîtront ici.</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></TouchableOpacity>;
}

function ReservationCard({ item, onOpen, onCancel, compact }: { item: Reservation; onOpen: () => void; onCancel?: () => void; compact: boolean }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.86} onPress={onOpen}>
      <View style={[styles.cardMain, compact && styles.cardMainCompact]}>
        <View style={[styles.dateColumn, compact && styles.dateColumnCompact]}><Text style={styles.date}>{item.day} {item.month}</Text><Text style={styles.time}>{item.time}</Text></View>
        <View style={styles.routeLine}><View style={styles.routeCircle} /><View style={styles.routeVertical} /><Ionicons name="location-outline" size={25} color="#6B7280" /></View>
        <View style={styles.routeCopy}>
          <Text style={styles.city}>{item.departureCity}</Text><Text style={[styles.place, compact && styles.placeCompact]}>{item.departurePlace}</Text>
          <View style={styles.routeGap} />
          <Text style={styles.city}>{item.arrivalCity}</Text><Text style={[styles.place, compact && styles.placeCompact]}>{item.arrivalPlace}</Text>
        </View>
        <Ionicons name="chevron-forward" size={31} color={ACTION} />
      </View>
      <View style={styles.cardFooter}>
        <View><Text style={styles.footerLabel}>Classe</Text><Text style={styles.footerValue}>{item.seatClass}</Text>{item.seat ? <Text style={styles.seat}>{item.seat}</Text> : null}</View>
        <View style={styles.reference}><Text style={styles.footerLabelStrong}>Réservation :</Text><Text style={styles.reservationNumber}>{item.reference}</Text></View>
      </View>
      {onCancel ? <TouchableOpacity style={styles.cancelButton} onPress={onCancel}><Text style={styles.cancelText}>Annuler la réservation</Text></TouchableOpacity> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAFBFD' },
  header: { height: 86, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#20242C', fontFamily: 'Inter_600SemiBold', fontSize: 22, fontWeight: '600' },
  tabs: { width: '92%', maxWidth: 720, alignSelf: 'center', height: 66, flexDirection: 'row', alignItems: 'center', marginBottom: 22, padding: 5, borderWidth: 1, borderColor: '#D8DCE3', borderRadius: 34, backgroundColor: 'white' },
  tabsCompact: { width: '94%', height: 58 },
  tab: { flex: 1, height: '100%', borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: NAVY },
  tabText: { color: ACTION, fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600' },
  tabTextActive: { color: 'white' },
  scroll: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 28 },
  scrollCompact: { paddingHorizontal: 12 },
  card: { borderWidth: 1, borderColor: '#D8DCE3', borderRadius: 20, backgroundColor: 'white', marginBottom: 18, overflow: 'hidden' },
  cardMain: { minHeight: 214, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 22 },
  cardMainCompact: { paddingHorizontal: 13, minHeight: 200 },
  dateColumn: { width: 92 },
  dateColumnCompact: { width: 76 },
  date: { color: '#252A32', fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600' },
  time: { color: '#252A32', fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', marginTop: 8 },
  routeLine: { width: 34, height: 130, alignItems: 'center', justifyContent: 'space-between' },
  routeCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#6B7280', backgroundColor: 'white' },
  routeVertical: { position: 'absolute', top: 17, width: 1.5, height: 88, backgroundColor: '#6B7280' },
  routeCopy: { flex: 1, minWidth: 0, paddingLeft: 8 },
  city: { color: '#313640', fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '400' },
  place: { color: '#282D35', fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 22, fontWeight: '600', marginTop: 3 },
  placeCompact: { fontSize: 16, lineHeight: 21 },
  routeGap: { height: 20 },
  cardFooter: { minHeight: 92, borderTopWidth: 1, borderTopColor: '#D8DCE3', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  footerLabel: { color: '#6B707A', fontFamily: 'Inter_400Regular', fontSize: 13 },
  footerLabelStrong: { color: '#626771', fontFamily: 'Inter_600SemiBold', fontSize: 13, fontWeight: '600' },
  footerValue: { color: '#3B4049', fontFamily: 'Inter_500Medium', fontSize: 16, fontWeight: '500', marginTop: 3 },
  reservationNumber: { color: '#3B4049', fontFamily: 'Inter_500Medium', fontSize: 16, fontWeight: '500', marginTop: 3 },
  seat: { color: ACTION, fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600', marginTop: 2 },
  reference: { alignItems: 'flex-end' },
  cancelButton: { height: 46, borderTopWidth: 1, borderTopColor: '#EEF0F4', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#D64545', fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600' },
  empty: { minHeight: 330, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: NAVY, fontFamily: 'Inter_600SemiBold', fontSize: 20, fontWeight: '600', marginTop: 14 },
  emptyText: { color: '#7A8495', fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', marginTop: 7 },
});

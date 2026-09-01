import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const trips = [
  { departureTime: '06:00', arrivalTime: '08:30', duration: '2h 30min', company: 'Express Trans', category: 'Bus VIP', price: 20000, remaining: 2 },
  { departureTime: '08:00', arrivalTime: '10:45', duration: '2h 45min', company: 'Voyage Plus', category: 'Bus Confort', price: 18000, remaining: 4 },
  { departureTime: '10:30', arrivalTime: '13:00', duration: '2h 30min', company: 'Top Voyage', category: 'Bus VIP', price: 22000, remaining: 3 },
  { departureTime: '15:00', arrivalTime: '17:45', duration: '2h 45min', company: 'Congo Transport', category: 'Bus Confort', price: 18000, remaining: 5 },
];

const first = (value: string | string[] | undefined, fallback: string) => Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;

export default function TravelResults() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const departure = first(params.departure, 'Kinshasa');
  const destination = first(params.destination, 'Matadi');
  const date = first(params.date, new Date().toLocaleDateString('fr-FR'));
  const passengers = first(params.passengers, '1 Passager');

  const selectTrip = (trip: (typeof trips)[number]) => router.push({ pathname: '/travel-booking', params: { departure, destination, date, passengers, ...trip, price: String(trip.price) } });

  return <View style={styles.page}>
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity style={styles.headerAction} onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="#0877EA" /></TouchableOpacity>
      <View style={styles.headerCopy}><Text style={styles.routeTitle}>{departure} › {destination}</Text><Text style={styles.routeDate}>{date}</Text></View>
      <TouchableOpacity style={styles.headerAction} onPress={() => router.back()}><Ionicons name="search" size={24} color="#0877EA" /></TouchableOpacity>
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Tous les horaires</Text>
      <Text style={styles.subtitle}>Voyages disponibles le {date}</Text>

      {trips.map((trip) => <View key={`${trip.departureTime}-${trip.company}`} style={styles.tripCard}>
        <View style={styles.companyHeader}>
          <View style={styles.companyLogo}><Ionicons name="bus" size={20} color="white" /></View><Text style={styles.companyName}>{trip.company}</Text>
          <View style={styles.remaining}><Ionicons name="flame-outline" size={15} color="#D9485F" /><Text style={styles.remainingText}>{trip.remaining} places à ce prix</Text></View>
        </View>
        <View style={styles.journey}>
          <View style={styles.timeRail}><Text style={styles.tripDate}>{date.slice(0, 5)}</Text><Text style={styles.departureTime}>{trip.departureTime}</Text><Text style={styles.arrivalTime}>{trip.arrivalTime}</Text></View>
          <View style={styles.timeline}><View style={styles.startDot} /><View style={styles.line} /><Ionicons name="location-outline" size={19} color="#8B94A3" /></View>
          <View style={styles.locations}><Text style={styles.locationPrimary}>{departure}</Text><Text style={styles.duration}>{trip.duration} · Direct</Text><Text style={styles.locationPrimary}>{destination}</Text></View>
        </View>
        <View style={styles.offerRow}>
          <View style={styles.categoryBlock}><Text style={styles.label}>Classe</Text><Text style={styles.category}>{trip.category}</Text></View>
          <View style={styles.priceBlock}><Text style={styles.price}>{trip.price.toLocaleString('fr-FR')} FC</Text><Text style={styles.priceCaption}>par passager</Text></View>
          <TouchableOpacity style={styles.selectButton} onPress={() => selectTrip(trip)}><Text style={styles.selectText}>Sélectionner</Text></TouchableOpacity>
        </View>
        <View style={styles.detailsRow}><Text style={styles.detailsText}>Voir les détails</Text><Ionicons name="chevron-down" size={18} color="#334155" /></View>
      </View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { minHeight: 118, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E7EBF0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, headerAction: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  routeTitle: { color: '#1D2532', fontFamily: 'Inter_600SemiBold', fontSize: 15, fontWeight: '600' }, routeDate: { color: '#596273', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 3 },
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28 }, title: { color: '#172033', fontFamily: 'Inter_700Bold', fontSize: 25, fontWeight: '700' }, subtitle: { color: '#303847', fontFamily: 'Inter_600SemiBold', fontSize: 15, fontWeight: '600', marginTop: 18, marginBottom: 20 },
  tripCard: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E1E5EB', shadowColor: '#0A1D49', shadowOpacity: .08, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  companyHeader: { height: 40, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center' }, companyLogo: { width: 27, height: 27, borderRadius: 7, backgroundColor: '#061F68', alignItems: 'center', justifyContent: 'center' }, companyName: { color: '#061F68', fontFamily: 'Inter_700Bold', fontSize: 13, fontWeight: '700', marginLeft: 7 }, remaining: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 }, remainingText: { color: '#D9485F', fontFamily: 'Inter_500Medium', fontSize: 10, fontWeight: '500' },
  journey: { height: 84, flexDirection: 'row', paddingHorizontal: 11 }, timeRail: { width: 56 }, tripDate: { color: '#697386', fontFamily: 'Inter_400Regular', fontSize: 9 }, departureTime: { color: '#182131', fontFamily: 'Inter_700Bold', fontSize: 14, fontWeight: '700', marginTop: 1 }, arrivalTime: { color: '#182131', fontFamily: 'Inter_700Bold', fontSize: 14, fontWeight: '700', marginTop: 23 }, timeline: { width: 25, alignItems: 'center', paddingTop: 5 }, startDot: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: '#818A99', backgroundColor: 'white' }, line: { width: 1, flex: 1, backgroundColor: '#AAB1BC' }, locations: { flex: 1, paddingTop: 1 }, locationPrimary: { color: '#242C39', fontFamily: 'Inter_600SemiBold', fontSize: 13, fontWeight: '600' }, duration: { color: '#778090', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 10, marginBottom: 10 },
  offerRow: { height: 54, paddingHorizontal: 11, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#E5E8ED', flexDirection: 'row', alignItems: 'center' }, categoryBlock: { flex: 1 }, label: { color: '#727B8A', fontFamily: 'Inter_400Regular', fontSize: 9 }, category: { color: '#303847', fontFamily: 'Inter_500Medium', fontSize: 11, fontWeight: '500', marginTop: 1 }, priceBlock: { alignItems: 'flex-end', marginRight: 8 }, price: { color: '#061F68', fontFamily: 'Inter_700Bold', fontSize: 14, fontWeight: '700' }, priceCaption: { color: '#0877EA', fontFamily: 'Inter_400Regular', fontSize: 8, marginTop: 1 }, selectButton: { height: 34, borderRadius: 8, backgroundColor: '#0877EA', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }, selectText: { color: 'white', fontFamily: 'Inter_600SemiBold', fontSize: 11, fontWeight: '600' },
  detailsRow: { height: 30, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#E8EBEF', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }, detailsText: { color: '#334155', fontFamily: 'Inter_500Medium', fontSize: 11, fontWeight: '500' },
});

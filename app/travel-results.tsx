import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const trips = [
  { departureTime: '06:00', arrivalTime: '08:30', duration: '2h 30min', company: 'Express Trans', category: 'Bus VIP', price: 20000 },
  { departureTime: '08:00', arrivalTime: '10:45', duration: '2h 45min', company: 'Voyage Plus', category: 'Bus Confort', price: 18000 },
  { departureTime: '10:30', arrivalTime: '13:00', duration: '2h 30min', company: 'Top Voyage', category: 'Bus VIP', price: 22000 },
  { departureTime: '15:00', arrivalTime: '17:45', duration: '2h 45min', company: 'Congo Transport', category: 'Bus Confort', price: 18000 },
];

const first = (value: string | string[] | undefined, fallback: string) =>
  Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;

export default function TravelResults() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const departure = first(params.departure, 'Kinshasa');
  const destination = first(params.destination, 'Matadi');
  const date = first(params.date, new Date().toLocaleDateString('fr-FR'));
  const passengers = first(params.passengers, '1 Passager');

  const selectTrip = (trip: (typeof trips)[number]) => {
    router.push({
      pathname: '/travel-booking',
      params: { departure, destination, date, passengers, ...trip, price: String(trip.price) },
    });
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={25} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Résultats de recherche</Text>
            <Text style={styles.heroSubtitle}>Choisissez votre voyage</Text>
          </View>
          <View style={styles.heroSide} />
        </View>

        <View style={styles.content}>
          <View style={styles.summaryCard}>
            <View style={styles.routeRow}>
              <View style={styles.busIcon}><Ionicons name="bus" size={25} color="#fff" /></View>
              <View style={styles.placeBlock}>
                <Text style={styles.summaryValue}>{departure}</Text>
                <Text style={styles.summaryLabel}>Ville de départ</Text>
              </View>
              <Ionicons name="arrow-forward" size={22} color="#071F67" />
              <View style={styles.placeBlock}>
                <Text style={styles.summaryValue}>{destination}</Text>
                <Text style={styles.summaryLabel}>Destination</Text>
              </View>
              <View style={styles.dateBlock}>
                <Ionicons name="calendar-outline" size={22} color="#082B85" />
                <View>
                  <Text style={styles.summaryValue}>{date}</Text>
                  <Text style={styles.summaryLabel}>Date du voyage</Text>
                </View>
              </View>
            </View>
            <View style={styles.summaryBottom}>
              <View style={styles.passengerRow}><Ionicons name="person-outline" size={21} color="#071F67" /><Text style={styles.passengerText}>{passengers}</Text></View>
              <TouchableOpacity onPress={() => router.back()} style={styles.editButton}>
                <Ionicons name="pencil-outline" size={20} color="#0781DF" />
                <Text style={styles.editText}>Modifier la recherche</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Voyages disponibles</Text>
          <Text style={styles.sectionSubtitle}>Sélectionnez un voyage pour continuer</Text>

          {trips.map((trip) => (
            <View key={`${trip.departureTime}-${trip.company}`} style={styles.tripCard}>
              <View style={styles.tripInfo}>
                <View style={styles.timeColumn}>
                  <Text style={styles.time}>{trip.departureTime}</Text>
                  <Text style={styles.city}>{departure}</Text>
                </View>
                <View style={styles.durationColumn}>
                  <Ionicons name="arrow-forward" size={22} color="#071F67" />
                  <Text style={styles.duration}>{trip.duration}</Text>
                  <Text style={styles.direct}>Direct</Text>
                </View>
                <View style={styles.timeColumn}>
                  <Text style={styles.time}>{trip.arrivalTime}</Text>
                  <Text style={styles.city}>{destination}</Text>
                </View>
                <View style={styles.priceColumn}>
                  <Text style={styles.price}>{trip.price.toLocaleString('fr-FR')} FC</Text>
                  <Text style={styles.priceLabel}>Par passager</Text>
                  <TouchableOpacity style={styles.chooseButton} onPress={() => selectTrip(trip)} activeOpacity={0.85}>
                    <Text style={styles.chooseText} numberOfLines={1}>Choisir</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.companyRow}>
                <Ionicons name="bus-outline" size={17} color="#5D626D" />
                <Text style={styles.company}>{trip.company}</Text>
                <Text style={styles.separator}>|</Text>
                <Text style={styles.company}>{trip.category}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFE' },
  scroll: { paddingBottom: 24 },
  hero: { height: 150, backgroundColor: '#072B84', paddingHorizontal: 22, paddingTop: 12, flexDirection: 'row', alignItems: 'center' },
  back: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.55)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { color: '#fff', fontSize: 14, marginTop: 4 },
  heroSide: { width: 48, height: 48 },
  content: { marginTop: -1, paddingHorizontal: 18, paddingTop: 16, backgroundColor: '#F8FAFE', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, shadowColor: '#10275C', shadowOpacity: .07, shadowRadius: 14, elevation: 2 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  busIcon: { width: 47, height: 47, borderRadius: 9, backgroundColor: '#072B84', alignItems: 'center', justifyContent: 'center' },
  placeBlock: { flex: 1, minWidth: 0 },
  dateBlock: { borderLeftWidth: 1, borderLeftColor: '#E5E8EF', paddingLeft: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryValue: { color: '#101010', fontSize: 15, fontWeight: '800' },
  summaryLabel: { color: '#70737B', fontSize: 11, marginTop: 3 },
  summaryBottom: { marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#E8EBF1', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  passengerText: { color: '#101010', fontSize: 14, fontWeight: '700' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  editText: { color: '#0781DF', fontSize: 13, fontWeight: '800' },
  sectionTitle: { color: '#061F68', fontSize: 22, fontWeight: '900', marginTop: 22 },
  sectionSubtitle: { color: '#6C7078', fontSize: 14, marginTop: 4, marginBottom: 12 },
  tripCard: { backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#EBEDF2', shadowColor: '#10275C', shadowOpacity: .04, shadowRadius: 10, elevation: 1 },
  tripInfo: { flexDirection: 'row', alignItems: 'center' },
  timeColumn: { flex: 1 },
  time: { color: '#0A0A0A', fontSize: 19, fontWeight: '900' },
  city: { color: '#151515', fontSize: 13, marginTop: 3 },
  durationColumn: { width: 75, alignItems: 'center' },
  duration: { color: '#40434A', fontSize: 12, marginTop: 2 },
  direct: { color: '#4F535B', fontSize: 11, borderWidth: 1, borderColor: '#E1E3E8', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 },
  priceColumn: { width: 112, borderLeftWidth: 1, borderLeftColor: '#E6E8EE', paddingLeft: 12, alignItems: 'center' },
  price: { color: '#0759C7', fontSize: 16, fontWeight: '900' },
  priceLabel: { color: '#777A81', fontSize: 11, marginTop: 3 },
  chooseButton: { width: '100%', minHeight: 48, backgroundColor: '#072B84', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8, marginTop: 9, alignItems: 'center', justifyContent: 'center' },
  chooseText: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  company: { color: '#666A73', fontSize: 12 },
  separator: { color: '#777A81', fontSize: 13 },
});

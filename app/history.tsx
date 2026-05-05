import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { translations, type Language } from './i18n';
import { useStore, type TripHistoryItem } from './store';

const formatDate = (date: string, locale: string) =>
  new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function History() {
  const router = useRouter();
  const language = useStore((state: any) => state.language) as Language;
  const trips = useStore((state: any) => state.trips) as TripHistoryItem[];
  const text = translations[language];
  const dateLocale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#061F68" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{text.tripHistory}</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="bus-clock" size={62} color="#139DFF" />
            <Text style={styles.emptyTitle}>{text.noTrips}</Text>
            <Text style={styles.emptyText}>{text.noTripsText}</Text>
          </View>
        ) : (
          trips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="bus" size={31} color="white" />
              </View>
              <View style={styles.tripBody}>
                <Text style={styles.busText}>{text.busUsed} : {trip.bus}</Text>
                <Text style={styles.routeText}>{text.route} : {trip.route}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.amountText}>{trip.amount} FC</Text>
                  <Text style={styles.dateText}>{formatDate(trip.createdAt, dateLocale)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 28,
    paddingTop: 58,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 48,
  },
  headerTitle: {
    color: '#061F68',
    fontSize: 27,
    fontWeight: '900',
  },
  content: {
    paddingBottom: 38,
  },
  emptyBox: {
    minHeight: 260,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  emptyTitle: {
    color: '#061F68',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 16,
  },
  emptyText: {
    color: '#667085',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  tripCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 18,
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 14,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#09D457',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripBody: {
    flex: 1,
  },
  busText: {
    color: '#061F68',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  routeText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  amountText: {
    color: '#09D457',
    fontSize: 17,
    fontWeight: '900',
  },
  dateText: {
    color: '#87909F',
    fontSize: 13,
    fontWeight: '700',
  },
});

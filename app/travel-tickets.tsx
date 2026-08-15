import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ChoiceKey = 'departure' | 'destination' | 'date' | 'passengers' | null;
const cities = ['Kinshasa', 'Matadi', 'Boma', 'Muanda'];

const dateChoices = () => Array.from({ length: 14 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index + 1);
  return date.toLocaleDateString('fr-FR');
});

export default function TravelTickets() {
  const router = useRouter();
  const dates = useMemo(dateChoices, []);
  const [departure, setDeparture] = useState('Kinshasa');
  const [destination, setDestination] = useState('Matadi');
  const [date, setDate] = useState(dates[0]);
  const [passengers, setPassengers] = useState('1 Passager');
  const [choice, setChoice] = useState<ChoiceKey>(null);

  const choices = choice === 'departure'
    ? cities.filter((city) => city !== destination)
    : choice === 'destination'
      ? cities.filter((city) => city !== departure)
      : choice === 'date'
        ? dates
        : ['1 Passager', '2 Passagers', '3 Passagers', '4 Passagers', '5 Passagers'];

  const choose = (value: string) => {
    if (choice === 'departure') setDeparture(value);
    if (choice === 'destination') setDestination(value);
    if (choice === 'date') setDate(value);
    if (choice === 'passengers') setPassengers(value);
    setChoice(null);
  };

  const search = () => {
    router.push({
      pathname: '/travel-results',
      params: { departure, destination, date, passengers },
    });
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={25} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Billet de voyage</Text>
            <Text style={styles.heroSubtitle}>Réserver et consulter vos voyages</Text>
          </View>
          <TouchableOpacity style={styles.ticketShortcut} onPress={() => router.push('/my-reservations')} activeOpacity={0.8}>
            <Ionicons name="ticket" size={27} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Réserver un voyage</Text>
          <Text style={styles.sectionSubtitle}>Recherchez votre trajet et réservez votre place facilement.</Text>

          <Field label="Ville de départ" value={departure} icon="location-outline" onPress={() => setChoice('departure')} />
          <Field label="Destination" value={destination} icon="location-outline" onPress={() => setChoice('destination')} />
          <Field label="Date du voyage" value={date} icon="calendar-outline" onPress={() => setChoice('date')} />
          <Field label="Nombre de passagers" value={passengers} icon="people-outline" onPress={() => setChoice('passengers')} />

          <TouchableOpacity style={styles.searchButton} onPress={search} activeOpacity={0.88}>
            <Ionicons name="search" size={22} color="#fff" />
            <Text style={styles.searchText}>Rechercher un voyage</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}><Ionicons name="information" size={22} color="#fff" /></View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Comment ça fonctionne ?</Text>
            <Text style={styles.infoText}>Recherchez votre trajet, choisissez votre voyage et payez pour recevoir votre billet.</Text>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={choice !== null} animationType="fade" onRequestClose={() => setChoice(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setChoice(null)}>
          <View style={styles.choiceCard}>
            {choices.map((item) => (
              <TouchableOpacity key={item} style={styles.choiceRow} onPress={() => choose(item)}>
                <Text style={styles.choiceText}>{item}</Text>
                <Ionicons name="chevron-forward" size={20} color="#082B85" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, icon, onPress }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity style={styles.field} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={22} color="#082B85" />
      <Text style={styles.fieldValue}>{value}</Text>
      <Ionicons name="chevron-down" size={20} color="#061F68" />
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFE' },
  scroll: { paddingBottom: 22 },
  hero: { height: 150, backgroundColor: '#072B84', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 12 },
  back: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.55)', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSubtitle: { color: '#fff', fontSize: 14, marginTop: 4 },
  ticketShortcut: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  formCard: { marginTop: -1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 23, paddingBottom: 23, shadowColor: '#10275C', shadowOpacity: .08, shadowRadius: 18, elevation: 3 },
  sectionTitle: { color: '#061F68', fontSize: 22, fontWeight: '800' },
  sectionSubtitle: { color: '#707278', fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 12 },
  fieldGroup: { marginTop: 13 },
  label: { fontSize: 15, color: '#101010', fontWeight: '600', marginBottom: 7 },
  field: { height: 57, borderWidth: 1, borderColor: '#D5D8DF', borderRadius: 11, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  fieldValue: { flex: 1, fontSize: 16, color: '#101010', fontWeight: '500' },
  searchButton: { height: 58, marginTop: 20, borderRadius: 10, backgroundColor: '#072B84', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  searchText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  infoBox: { marginHorizontal: 24, marginTop: 22, marginBottom: 20, padding: 17, borderRadius: 14, borderWidth: 1, borderColor: '#D7E3F8', backgroundColor: '#F6F9FF', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#148CEC', alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1 }, infoTitle: { color: '#0781D6', fontSize: 15, fontWeight: '800' },
  infoText: { color: '#46484D', fontSize: 13, lineHeight: 19, marginTop: 5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(1,15,50,.45)', justifyContent: 'flex-end' },
  choiceCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 },
  choiceRow: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: '#EDF0F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choiceText: { color: '#071D59', fontSize: 17, fontWeight: '700' },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TakoLogo } from '../components/tako-logo';

type ChoiceKey = 'departure' | 'destination' | null;
type DateChoice = 'outbound' | 'return' | null;
const cities = ['Kinshasa', 'Matadi', 'Boma', 'Muanda'];

export default function TravelTickets() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [departure, setDeparture] = useState('Kinshasa');
  const [destination, setDestination] = useState('Matadi');
  const [travelDate, setTravelDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 1); return date; });
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [dateChoice, setDateChoice] = useState<DateChoice>(null);
  const [choice, setChoice] = useState<ChoiceKey>(null);

  const choose = (value: string) => {
    if (choice === 'departure') setDeparture(value);
    if (choice === 'destination') setDestination(value);
    setChoice(null);
  };
  const swapCities = () => { setDeparture(destination); setDestination(departure); };
  const search = () => router.push({ pathname: '/travel-results', params: { departure, destination, date: travelDate.toLocaleDateString('fr-FR'), returnDate: returnDate?.toLocaleDateString('fr-FR') || '', passengers: '1 Passager' } });

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { paddingTop: Math.max(insets.top + 12, 32) }]}>
          <View style={styles.heroHeader}>
            <TouchableOpacity style={styles.heroAction} onPress={() => router.back()}><Ionicons name="chevron-back" size={27} color="white" /></TouchableOpacity>
            <TakoLogo color="#ffffff" />
            <View style={styles.heroAction} />
          </View>
          <Image source={require('../assets/images/news-tako-public-transport.jpeg')} style={styles.heroBanner} resizeMode="cover" />
        </View>

        <View style={styles.searchCard}>
          <View style={styles.routeBox}>
            <TouchableOpacity style={styles.routeRow} onPress={() => setChoice('departure')}>
              <Ionicons name="radio-button-on-outline" size={23} color="#0877EA" /><Text style={styles.routeText}>{departure}</Text>
            </TouchableOpacity>
            <View style={styles.routeDivider} />
            <TouchableOpacity style={styles.routeRow} onPress={() => setChoice('destination')}>
              <Ionicons name="location-outline" size={23} color="#0877EA" /><Text style={styles.routeText}>{destination}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.swap} onPress={swapCities}><Ionicons name="swap-vertical" size={23} color="#0877EA" /></TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateField} onPress={() => setDateChoice('outbound')}><Ionicons name="calendar" size={22} color="#0877EA" /><Text style={styles.dateText}>{travelDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dateField} onPress={() => setDateChoice('return')}><Ionicons name="calendar-outline" size={22} color="#596273" /><Text style={[styles.dateText, !returnDate && styles.placeholder]}>{returnDate ? returnDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Retour'}</Text>{returnDate ? <TouchableOpacity onPress={() => setReturnDate(null)}><Ionicons name="close" size={20} color="#0877EA" /></TouchableOpacity> : null}</TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={search}><Ionicons name="search" size={22} color="white" /><Text style={styles.searchText}>Rechercher</Text></TouchableOpacity>
        </View>

        <View style={styles.benefits}><View style={styles.benefit}><Ionicons name="lock-closed-outline" size={17} color="#061F68" /><Text style={styles.benefitText}>Achat 100% sécurisé</Text></View><View style={styles.benefit}><Ionicons name="headset-outline" size={18} color="#061F68" /><Text style={styles.benefitText}>Support 24h</Text></View></View>

        <View style={styles.promoCard}>
          <Image source={require('../assets/images/news-tako-petit-transport.jpeg')} style={styles.promoImage} resizeMode="cover" />
          <View style={styles.promoShade}><Text style={styles.promoKicker}>Voyagez avec TaKo</Text><Text style={styles.promoTitle}>Réservez votre trajet simplement</Text><TouchableOpacity style={styles.promoButton} onPress={search}><Text style={styles.promoButtonText}>Rechercher un voyage</Text></TouchableOpacity></View>
        </View>
      </ScrollView>

      <CityPicker
        visible={choice !== null}
        selected={choice === 'departure' ? departure : destination}
        excluded={choice === 'departure' ? destination : departure}
        onSelect={choose}
        onClose={() => setChoice(null)}
      />
      <CalendarModal visible={dateChoice !== null} value={dateChoice === 'return' ? returnDate || travelDate : travelDate} minimumDate={dateChoice === 'return' ? travelDate : undefined} onSelect={(date) => { if (dateChoice === 'return') setReturnDate(date); else setTravelDate(date); setDateChoice(null); }} onClose={() => setDateChoice(null)} />
    </View>
  );
}

function CityPicker({ visible, selected, excluded, onSelect, onClose }: { visible: boolean; selected: string; excluded: string; onSelect: (city: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (visible) setQuery(selected); }, [visible, selected]);
  const filteredCities = cities.filter((city) => city !== excluded && city.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')));

  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.cityModal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.cityBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.cityPickerCard}>
        <View style={styles.citySearchBox}>
          <Ionicons name="location-outline" size={22} color="#0877EA" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une ville"
            placeholderTextColor="#8A93A3"
            selectionColor="#0877EA"
            style={styles.cityInput}
          />
          {query.length > 0 ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close" size={20} color="#687386" /></TouchableOpacity> : null}
        </View>
        <ScrollView style={styles.cityList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          {filteredCities.map((city) => <TouchableOpacity key={city} style={styles.cityRow} onPress={() => onSelect(city)}>
            <Ionicons name="checkmark" size={22} color={city === selected ? '#0877EA' : 'transparent'} />
            <Text style={styles.cityText}>{city}</Text>
          </TouchableOpacity>)}
          {filteredCities.length === 0 ? <Text style={styles.noCity}>Aucune ville trouvée</Text> : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function CalendarModal({ visible, value, minimumDate, onSelect, onClose }: { visible: boolean; value: Date; minimumDate?: Date; onSelect: (date: Date) => void; onClose: () => void }) {
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => { if (visible) setMonth(new Date(value.getFullYear(), value.getMonth(), 1)); }, [visible, value]);
  const today = minimumDate || new Date();
  const minimum = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const firstDay = (month.getDay() + 6) % 7;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.calendarBackdrop}><View style={styles.calendarCard}>
    <View style={styles.calendarHeader}><TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={26} color="#061F68" /></TouchableOpacity><Text style={styles.calendarTitle}>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text><TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={26} color="#061F68" /></TouchableOpacity></View>
    <View style={styles.weekRow}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View>
    <View style={styles.dayGrid}>{cells.map((day, index) => { if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />; const date = new Date(month.getFullYear(), month.getMonth(), day); const disabled = date < minimum; const selected = date.toDateString() === value.toDateString(); return <TouchableOpacity key={day} style={styles.dayCell} disabled={disabled} onPress={() => onSelect(date)}><View style={[styles.dayCircle, selected && styles.daySelected]}><Text style={[styles.dayText, disabled && styles.dayDisabled, selected && styles.dayTextSelected]}>{day}</Text></View></TouchableOpacity>; })}</View>
    <TouchableOpacity style={styles.closeCalendar} onPress={onClose}><Text style={styles.closeCalendarText}>Fermer</Text></TouchableOpacity>
  </View></View></Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFE' }, scroll: { paddingBottom: 30 },
  hero: { height: 360, backgroundColor: '#061F68', paddingHorizontal: 20 },
  heroHeader: { height: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroBanner: { width: '100%', height: 190, borderRadius: 18 },
  searchCard: { marginHorizontal: 20, marginTop: -82, borderRadius: 18, backgroundColor: 'white', padding: 16, shadowColor: '#061F68', shadowOpacity: .16, shadowRadius: 16, elevation: 8 },
  routeBox: { borderWidth: 1, borderColor: '#DDE2EA', borderRadius: 12, overflow: 'hidden' }, routeRow: { height: 55, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }, routeText: { color: '#303744', fontSize: 16, fontWeight: '600' }, routeDivider: { height: 1, backgroundColor: '#E5E8EE', marginLeft: 50 },
  swap: { position: 'absolute', right: 13, top: 38, width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#E1E5EC', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, dateField: { flex: 1, height: 54, borderWidth: 1, borderColor: '#DDE2EA', borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }, dateText: { flex: 1, color: '#2F3642', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }, placeholder: { color: '#7A8393' },
  searchButton: { height: 56, borderRadius: 12, backgroundColor: '#0877EA', marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, searchText: { color: 'white', fontSize: 17, fontWeight: '800' },
  benefits: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingVertical: 22 }, benefit: { flexDirection: 'row', alignItems: 'center', gap: 6 }, benefitText: { color: '#475064', fontSize: 12, fontWeight: '600' },
  promoCard: { height: 250, marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', backgroundColor: '#061F68' }, promoImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }, promoShade: { flex: 1, justifyContent: 'flex-end', padding: 18, backgroundColor: 'rgba(6,31,104,.55)' }, promoKicker: { color: '#9ED8FF', fontSize: 13, fontWeight: '800' }, promoTitle: { color: 'white', fontSize: 22, lineHeight: 27, fontWeight: '900', marginTop: 5, maxWidth: 290 }, promoButton: { height: 46, borderRadius: 9, backgroundColor: '#0877EA', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, promoButtonText: { color: 'white', fontSize: 14, fontWeight: '800' },
  cityModal: { flex: 1, justifyContent: 'flex-start' }, cityBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(1,15,50,.25)' },
  cityPickerCard: { marginTop: 335, marginHorizontal: 40, maxHeight: 290, borderRadius: 10, backgroundColor: 'white', shadowColor: '#061F68', shadowOpacity: .24, shadowRadius: 14, elevation: 12, overflow: 'hidden' },
  citySearchBox: { height: 57, borderWidth: 1.5, borderColor: '#20A9E8', paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }, cityInput: { flex: 1, height: '100%', color: '#202733', fontSize: 16, fontWeight: '500' },
  cityList: { maxHeight: 232 }, cityRow: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' }, cityText: { color: '#303642', fontSize: 17, fontWeight: '500' }, noCity: { color: '#7A8393', fontSize: 15, textAlign: 'center', paddingVertical: 28 },
  calendarBackdrop: { flex: 1, backgroundColor: 'rgba(1,15,50,.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, calendarCard: { width: '100%', maxWidth: 390, backgroundColor: 'white', borderRadius: 18, padding: 18 }, calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, calendarTitle: { color: '#061F68', fontSize: 18, fontWeight: '900', textTransform: 'capitalize' }, weekRow: { flexDirection: 'row' }, weekDay: { width: '14.285%', color: '#748094', fontSize: 14, fontWeight: '800', textAlign: 'center' }, dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, dayCell: { width: '14.285%', height: 43, alignItems: 'center', justifyContent: 'center' }, dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, daySelected: { backgroundColor: '#0877EA' }, dayText: { color: '#061F68', fontSize: 16, fontWeight: '700' }, dayDisabled: { color: '#C2C7D0' }, dayTextSelected: { color: 'white', fontWeight: '900' }, closeCalendar: { alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 8, paddingVertical: 6 }, closeCalendarText: { color: '#0877EA', fontSize: 16, fontWeight: '800' },
});

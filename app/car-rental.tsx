import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';

const NAVY = '#061F68';
const BLUE = '#0877EA';
const vehicles = [
  { key: 'economy', label: 'Économique', icon: 'car-hatchback', price: 40000 },
  { key: 'suv', label: 'SUV', icon: 'car-estate', price: 70000 },
  { key: 'minibus', label: 'Minibus', icon: 'van-passenger', price: 120000 },
  { key: 'luxury', label: 'Luxe', icon: 'car-sports', price: 150000 },
] as const;
const extras = [
  { key: 'insurance', title: 'Assurance tous risques', subtitle: 'Protégez-vous durant votre trajet', icon: 'shield-check-outline', price: 10000 },
  { key: 'driver', title: 'Avec chauffeur', subtitle: 'Un chauffeur professionnel à votre disposition', icon: 'account-outline', price: 20000 },
  { key: 'wifi', title: 'Wi-Fi à bord', subtitle: 'Restez connecté pendant le trajet', icon: 'wifi', price: 5000 },
] as const;
type Step = 1 | 2 | 3;
type DateTarget = 'pickup' | 'return';
const formatDate = (date: Date) => date.toLocaleDateString('fr-FR');
const daysBetween = (start: Date, end: Date) => Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

export default function CarRental() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useStore((state: any) => state.currentUser);
  const [step, setStep] = useState<Step>(1);
  const [pickup, setPickup] = useState('Kinshasa, Gombe');
  const [destination, setDestination] = useState('Kinshasa, Gombe');
  const [pickupDate, setPickupDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 2); return date; });
  const [calendarTarget, setCalendarTarget] = useState<DateTarget | null>(null);
  const [vehicleKey, setVehicleKey] = useState<(typeof vehicles)[number]['key']>('economy');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const vehicle = vehicles.find((item) => item.key === vehicleKey) ?? vehicles[0];
  const chosenExtras = extras.filter((item) => selectedExtras.includes(item.key));
  const rentalDays = daysBetween(pickupDate, returnDate);
  const total = useMemo(() => vehicle.price * rentalDays + chosenExtras.reduce((sum, item) => sum + item.price, 0), [vehicle.price, rentalDays, chosenExtras]);
  const toggle = (key: string) => setSelectedExtras((list) => list.includes(key) ? list.filter((item) => item !== key) : [...list, key]);
  const cycle = (value: string, setter: (next: string) => void) => setter(value === 'Kinshasa, Gombe' ? 'Aéroport de N’Djili' : 'Kinshasa, Gombe');
  const back = () => step === 1 ? router.back() : setStep((step - 1) as Step);
  const chooseDate = (date: Date) => {
    if (calendarTarget === 'pickup') {
      setPickupDate(date);
      if (date >= returnDate) { const next = new Date(date); next.setDate(next.getDate() + 1); setReturnDate(next); }
    } else if (calendarTarget === 'return') setReturnDate(date);
    setCalendarTarget(null);
  };

  return <View style={styles.screen}>
    <View style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={back}><Ionicons name="chevron-back" size={25} color={BLUE} /></TouchableOpacity>
        <Text style={styles.title}>Louer une voiture</Text><View style={styles.spacer} />
      </View>
      <Stepper step={step} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {step === 1 && <>
          <Text style={styles.section}>Où allez-vous ?</Text>
          <Field icon="location-outline" label="Lieu de prise en charge" value={pickup} onPress={() => cycle(pickup, setPickup)} />
          <Field icon="location-outline" label="Lieu de retour" value={destination} onPress={() => cycle(destination, setDestination)} />
          <Text style={styles.section}>Dates et heures</Text>
          <View style={styles.columns}><View style={styles.half}><Field compact icon="calendar-outline" label="Date de prise en charge" value={formatDate(pickupDate)} onPress={() => setCalendarTarget('pickup')} /></View><View style={styles.half}><Field compact icon="calendar-outline" label="Date de retour" value={formatDate(returnDate)} onPress={() => setCalendarTarget('return')} /></View></View>
          <View style={styles.columns}><View style={styles.half}><Field compact icon="time-outline" label="Heure de prise en charge" value="10:00" /></View><View style={styles.half}><Field compact icon="time-outline" label="Heure de retour" value="10:00" /></View></View>
        </>}
        {step === 2 && <>
          <Text style={styles.section}>Choisissez votre véhicule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleList}>
            {vehicles.map((item) => { const active = item.key === vehicleKey; return <TouchableOpacity key={item.key} style={[styles.vehicle, active && styles.vehicleActive]} onPress={() => setVehicleKey(item.key)}>
              {active && <View style={styles.checkBadge}><Ionicons name="checkmark" size={16} color="white" /></View>}
              <MaterialCommunityIcons name={item.icon} size={55} color={active ? BLUE : '#424B5A'} />
              <Text style={styles.vehicleName}>{item.label}</Text><Text style={styles.muted}>à partir de</Text><Text style={styles.priceSmall}>{item.price.toLocaleString('fr-FR')} FC / jour</Text>
            </TouchableOpacity>; })}
          </ScrollView>
          <Text style={styles.section}>Options (facultatif)</Text>
          <View style={styles.optionCard}>{extras.map((item) => { const active = selectedExtras.includes(item.key); return <TouchableOpacity key={item.key} style={styles.option} onPress={() => toggle(item.key)}>
            <View style={styles.iconBox}><MaterialCommunityIcons name={item.icon} size={25} color={BLUE} /></View><View style={styles.grow}><Text style={styles.optionTitle}>{item.title}</Text><Text style={styles.muted}>{item.subtitle}</Text></View><View style={[styles.checkbox, active && styles.checkboxActive]}>{active && <Ionicons name="checkmark" size={16} color="white" />}</View>
          </TouchableOpacity>; })}</View>
        </>}
        {step === 3 && <>
          <Text style={styles.section}>Récapitulatif de votre réservation</Text>
          <View style={styles.summary}>
            <Summary icon="location-outline" label="Prise en charge" value={pickup} /><Summary icon="location-outline" label="Retour" value={destination} />
            <Summary icon="calendar-outline" label="Du" value={`${formatDate(pickupDate)} à 10:00`} /><Summary icon="calendar-outline" label="Au" value={`${formatDate(returnDate)} à 10:00`} />
            <Summary icon="time-outline" label="Durée" value={`${rentalDays} jour${rentalDays > 1 ? 's' : ''}`} /><Summary icon="car-outline" label="Véhicule" value={vehicle.label} />
            <Summary icon="settings-outline" label="Options" value={chosenExtras.length ? chosenExtras.map((item) => item.title).join(', ') : 'Aucune'} />
          </View>
          <View style={styles.estimate}><View><Text style={styles.optionTitle}>Prix total estimé</Text><Text style={styles.detail}>Détail du prix</Text></View><Text style={styles.total}>{total.toLocaleString('fr-FR')} FC</Text></View>
          <Text style={styles.section}>Informations du client</Text>
          <View style={styles.client}><View style={styles.iconBox}><Ionicons name="person-outline" size={25} color={BLUE} /></View><View><Text style={styles.clientLabel}>Nom complet</Text><Text style={styles.clientName}>{user?.fullName || 'Client TaKo'}</Text></View></View>
        </>}
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={() => step < 3 ? setStep((step + 1) as Step) : Alert.alert('Réservation confirmée', `${vehicle.label} • ${total.toLocaleString('fr-FR')} FC`)}>
        <Text style={styles.buttonText}>{step === 3 ? 'Confirmer la réservation' : 'Continuer'}</Text>
      </TouchableOpacity>
      <CalendarModal visible={calendarTarget !== null} value={calendarTarget === 'return' ? returnDate : pickupDate} minimumDate={calendarTarget === 'return' ? new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate() + 1) : new Date()} onSelect={chooseDate} onClose={() => setCalendarTarget(null)} />
    </View>
  </View>;
}

function CalendarModal({ visible, value, minimumDate, onSelect, onClose }: { visible: boolean; value: Date; minimumDate: Date; onSelect: (date: Date) => void; onClose: () => void }) {
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => { if (visible) setMonth(new Date(value.getFullYear(), value.getMonth(), 1)); }, [visible, value]);
  const firstDay = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const normalizedMinimum = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
  const moveMonth = (offset: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalShade}><View style={styles.calendar}>
      <View style={styles.calendarHeader}><TouchableOpacity onPress={() => moveMonth(-1)}><Ionicons name="chevron-back" size={25} color={NAVY} /></TouchableOpacity><Text style={styles.calendarTitle}>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text><TouchableOpacity onPress={() => moveMonth(1)}><Ionicons name="chevron-forward" size={25} color={NAVY} /></TouchableOpacity></View>
      <View style={styles.week}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View>
      <View style={styles.days}>{cells.map((day, index) => { if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />; const date = new Date(month.getFullYear(), month.getMonth(), day); const disabled = date < normalizedMinimum; const selected = date.toDateString() === value.toDateString(); return <TouchableOpacity key={day} disabled={disabled} style={styles.dayCell} onPress={() => onSelect(date)}><View style={[styles.dayCircle, selected && styles.daySelected]}><Text style={[styles.dayText, disabled && styles.dayDisabled, selected && styles.dayTextSelected]}>{day}</Text></View></TouchableOpacity>; })}</View>
      <TouchableOpacity style={styles.calendarClose} onPress={onClose}><Text style={styles.calendarCloseText}>Fermer</Text></TouchableOpacity>
    </View></View>
  </Modal>;
}

function Stepper({ step }: { step: Step }) {
  return <View style={styles.stepper}>{['Trajet & dates', 'Véhicule', 'Confirmation'].map((label, index) => { const number = (index + 1) as Step; const active = number === step; const done = number < step; return <View key={label} style={styles.stepItem}>
    {index > 0 && <View style={[styles.line, (active || done) && styles.lineActive]} />}<View style={[styles.circle, (active || done) && styles.circleActive]}>{done ? <Ionicons name="checkmark" size={15} color="white" /> : <Text style={[styles.circleText, active && styles.circleTextActive]}>{number}</Text>}</View><Text style={[styles.stepText, active && styles.stepTextActive]}>{label}</Text>
  </View>; })}</View>;
}

function Field({ icon, label, value, onPress, compact }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress?: () => void; compact?: boolean }) {
  return <TouchableOpacity style={[styles.field, compact && styles.fieldCompact]} onPress={onPress}><Ionicons name={icon} size={23} color={BLUE} /><View style={styles.grow}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldValue} numberOfLines={1}>{value}</Text></View><Ionicons name="chevron-down" size={18} color={BLUE} /></TouchableOpacity>;
}

function Summary({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.summaryRow}><Ionicons name={icon} size={21} color={BLUE} /><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' }, page: { flex: 1, paddingHorizontal: 20 }, scroll: { flex: 1 }, scrollBody: { paddingBottom: 12 }, grow: { flex: 1 },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#B7D9FF', alignItems: 'center', justifyContent: 'center' }, spacer: { width: 42 }, title: { color: NAVY, fontSize: 22, fontWeight: '900' },
  stepper: { height: 91, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 17, paddingTop: 12 }, stepItem: { width: '30%', alignItems: 'center' }, line: { position: 'absolute', top: 16, left: '-67%', width: '75%', height: 2, backgroundColor: '#D9DFE9' }, lineActive: { backgroundColor: BLUE }, circle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#ADB6C7', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }, circleActive: { borderColor: BLUE, backgroundColor: BLUE }, circleText: { color: '#596274', fontSize: 14, fontWeight: '800' }, circleTextActive: { color: 'white' }, stepText: { color: '#687184', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 7 }, stepTextActive: { color: BLUE, fontWeight: '900' },
  section: { color: NAVY, fontSize: 18, fontWeight: '900', marginTop: 5, marginBottom: 10 }, field: { minHeight: 76, borderWidth: 1, borderColor: '#D9DDE6', borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 }, fieldCompact: { minHeight: 84, paddingHorizontal: 10, gap: 7 }, fieldLabel: { color: '#667085', fontSize: 14, fontWeight: '700', marginBottom: 5 }, fieldValue: { color: NAVY, fontSize: 16, fontWeight: '900' }, columns: { flexDirection: 'row', gap: 12 }, half: { flex: 1 },
  vehicleList: { gap: 10, paddingBottom: 15 }, vehicle: { width: 142, minHeight: 180, borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' }, vehicleActive: { borderWidth: 2, borderColor: BLUE, backgroundColor: '#F7FAFF' }, checkBadge: { position: 'absolute', top: 7, right: 7, width: 26, height: 26, borderRadius: 13, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }, vehicleName: { color: NAVY, fontSize: 16, fontWeight: '900', marginTop: 6 }, muted: { color: '#737A89', fontSize: 14, marginTop: 3 }, priceSmall: { color: BLUE, fontSize: 14, fontWeight: '900', marginTop: 3 },
  optionCard: { borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, overflow: 'hidden' }, option: { minHeight: 72, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#E7EAF0' }, iconBox: { width: 40, height: 40, borderRadius: 9, backgroundColor: '#F0F6FF', alignItems: 'center', justifyContent: 'center' }, optionTitle: { color: NAVY, fontSize: 16, fontWeight: '800' }, checkbox: { width: 24, height: 24, borderRadius: 5, borderWidth: 1.5, borderColor: '#A8ADB7', alignItems: 'center', justifyContent: 'center' }, checkboxActive: { borderColor: BLUE, backgroundColor: BLUE },
  summary: { borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, padding: 15, gap: 13 }, summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, summaryLabel: { width: 112, color: NAVY, fontSize: 14, fontWeight: '800' }, summaryValue: { flex: 1, color: '#4C5567', fontSize: 14, lineHeight: 19 }, estimate: { minHeight: 86, marginTop: 16, borderRadius: 12, backgroundColor: '#F0F5FF', paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, detail: { color: '#596274', fontSize: 14, marginTop: 8 }, total: { color: BLUE, fontSize: 22, fontWeight: '900' }, client: { minHeight: 72, borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, clientLabel: { color: '#687184', fontSize: 14 }, clientName: { color: NAVY, fontSize: 16, fontWeight: '800', marginTop: 3 },
  button: { height: 58, borderRadius: 11, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, buttonText: { color: 'white', fontSize: 17, fontWeight: '900' },
  modalShade: { flex: 1, backgroundColor: 'rgba(3,15,50,0.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, calendar: { width: '100%', maxWidth: 390, borderRadius: 18, backgroundColor: 'white', padding: 18 }, calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, calendarTitle: { color: NAVY, fontSize: 18, fontWeight: '900', textTransform: 'capitalize' }, week: { flexDirection: 'row' }, weekDay: { width: '14.285%', color: '#748094', fontSize: 14, fontWeight: '800', textAlign: 'center' }, days: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, dayCell: { width: '14.285%', height: 43, alignItems: 'center', justifyContent: 'center' }, dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, daySelected: { backgroundColor: BLUE }, dayText: { color: NAVY, fontSize: 16, fontWeight: '700' }, dayDisabled: { color: '#C2C7D0' }, dayTextSelected: { color: 'white', fontWeight: '900' }, calendarClose: { alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 8, paddingVertical: 6 }, calendarCloseText: { color: BLUE, fontSize: 16, fontWeight: '800' },
});

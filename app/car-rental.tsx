import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text as RNText, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';

const NAVY = '#061F68';
const BLUE = '#0877EA';

const interFamily = (style: unknown) => {
  const weight = String(StyleSheet.flatten(style as any)?.fontWeight ?? '400');
  if (weight === 'bold' || Number.parseInt(weight, 10) >= 700) return 'Inter_700Bold';
  if (Number.parseInt(weight, 10) >= 600) return 'Inter_600SemiBold';
  if (Number.parseInt(weight, 10) >= 500) return 'Inter_500Medium';
  return 'Inter_400Regular';
};

function Text(props: ComponentProps<typeof RNText>) {
  return <RNText {...props} style={[{ fontFamily: interFamily(props.style) }, props.style]} />;
}

function TextInput(props: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={[{ fontFamily: interFamily(props.style) }, props.style]} />;
}
const vehicles = [
  { key: 'economy', label: 'Économique', model: 'Suzuki Swift', details: '5 places • 2 bagages', image: require('../assets/images/car-suzuki-swift-v3.png'), price: 40 },
  { key: 'suv', label: 'SUV', model: 'Nissan Qashqai', details: '5 places • 3 bagages', image: require('../assets/images/car-nissan-qashqai-v3.png'), price: 70 },
  { key: 'minibus', label: 'Minibus', model: 'Toyota Coaster', details: '18 places • 10 bagages', image: require('../assets/images/car-minibus-v3.png'), price: 120 },
  { key: 'luxury', label: 'Luxe', model: 'Mercedes Classe E', details: '5 places • 3 bagages', image: require('../assets/images/car-luxury-v3.png'), price: 150 },
] as const;
const extras = [
  { key: 'insurance', title: 'Assurance tous risques', subtitle: 'Protégez-vous durant votre trajet', icon: 'shield-check-outline', price: 10 },
  { key: 'driver', title: 'Avec chauffeur', subtitle: 'Un chauffeur professionnel à votre disposition', icon: 'account-outline', price: 20 },
  { key: 'wifi', title: 'Wi-Fi à bord', subtitle: 'Restez connecté pendant le trajet', icon: 'wifi', price: 5 },
] as const;
const paymentMethods = [
  { key: 'mpesa', label: 'M-Pesa', subtitle: 'Payer avec votre compte M-Pesa', logo: require('../assets/images/mpesa-logo.png') },
  { key: 'orange', label: 'Orange Money', subtitle: 'Payer avec votre compte Orange Money', logo: require('../assets/images/orange-money-logo.png') },
  { key: 'airtel', label: 'Airtel Money', subtitle: 'Payer avec votre compte Airtel Money', logo: require('../assets/images/airtel-money-logo.png') },
] as const;
type Step = 1 | 2 | 3 | 4;
type DateTarget = 'pickup' | 'return';
type TimeTarget = 'pickup' | 'return';
const formatDate = (date: Date) => date.toLocaleDateString('fr-FR');
const withTime = (date: Date, time: string) => { const [hour, minute] = time.split(':').map(Number); return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute); };
const currentHalfHour = () => {
  const now = new Date();
  const roundedMinutes = Math.round(now.getMinutes() / 30) * 30;
  now.setMinutes(roundedMinutes, 0, 0);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

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
  const [timeTarget, setTimeTarget] = useState<TimeTarget | null>(null);
  const [pickupTime, setPickupTime] = useState(currentHalfHour);
  const [returnTime, setReturnTime] = useState(currentHalfHour);
  const [vehicleKey, setVehicleKey] = useState<(typeof vehicles)[number]['key']>('economy');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]['key']>('mpesa');
  const [mobileNumber, setMobileNumber] = useState(String(user?.phone || '').replace(/^\+243/, ''));
  const vehicle = vehicles.find((item) => item.key === vehicleKey) ?? vehicles[0];
  const chosenExtras = extras.filter((item) => selectedExtras.includes(item.key));
  const durationHours = Math.max(1, Math.ceil((withTime(returnDate, returnTime).getTime() - withTime(pickupDate, pickupTime).getTime()) / 3600000));
  const rentalDays = Math.max(1, Math.ceil(durationHours / 24));
  const durationText = durationHours % 24 === 0 ? `${durationHours / 24} jour${durationHours > 24 ? 's' : ''}` : `${Math.floor(durationHours / 24)} j ${durationHours % 24} h`;
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {step === 1 && <>
          <Text style={styles.section}>Où allez-vous ?</Text>
          <Field icon="location-outline" label="Lieu de prise en charge" value={pickup} onPress={() => cycle(pickup, setPickup)} />
          <Field icon="location-outline" label="Lieu de retour" value={destination} onPress={() => cycle(destination, setDestination)} />
          <Text style={styles.section}>Dates et heures</Text>
          <View style={styles.columns}><View style={styles.half}><Field compact icon="calendar-outline" label="Date de prise en charge" value={formatDate(pickupDate)} onPress={() => setCalendarTarget('pickup')} /></View><View style={styles.half}><Field compact icon="calendar-outline" label="Date de retour" value={formatDate(returnDate)} onPress={() => setCalendarTarget('return')} /></View></View>
          <View style={styles.columns}><View style={styles.half}><Field compact icon="time-outline" label="Heure de prise en charge" value={pickupTime} onPress={() => setTimeTarget('pickup')} /></View><View style={styles.half}><Field compact icon="time-outline" label="Heure de retour" value={returnTime} onPress={() => setTimeTarget('return')} /></View></View>
        </>}
        {step === 2 && <>
          <Text style={styles.section}>Choisissez votre véhicule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleList}>
            {vehicles.map((item) => { const active = item.key === vehicleKey; return <TouchableOpacity key={item.key} style={[styles.vehicle, active && styles.vehicleActive]} onPress={() => setVehicleKey(item.key)}>
              {active && <View style={styles.checkBadge}><Ionicons name="checkmark" size={16} color="white" /></View>}
              <Image source={item.image} style={styles.vehicleImage} resizeMode="contain" />
              <Text style={styles.vehicleName}>{item.label}</Text><Text style={styles.vehicleModel}>{item.model}</Text><Text style={styles.vehicleDetails}>{item.details}</Text><Text style={styles.muted}>à partir de</Text><Text style={styles.priceSmall}>{item.price.toLocaleString('fr-FR')} USD / jour</Text>
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
            <Summary icon="calendar-outline" label="Du" value={`${formatDate(pickupDate)} à ${pickupTime}`} /><Summary icon="calendar-outline" label="Au" value={`${formatDate(returnDate)} à ${returnTime}`} />
            <Summary icon="time-outline" label="Durée" value={durationText} /><Summary icon="car-outline" label="Véhicule" value={`${vehicle.label} • ${vehicle.model}`} />
            <Summary icon="settings-outline" label="Options" value={chosenExtras.length ? chosenExtras.map((item) => item.title).join(', ') : 'Aucune'} />
          </View>
          <View style={styles.estimate}><View><Text style={styles.optionTitle}>Prix total estimé</Text><Text style={styles.detail}>Détail du prix</Text></View><Text style={styles.total}>{total.toLocaleString('fr-FR')} USD</Text></View>
          <Text style={styles.section}>Informations du client</Text>
          <View style={styles.client}><View style={styles.iconBox}><Ionicons name="person-outline" size={25} color={BLUE} /></View><View><Text style={styles.clientLabel}>Nom complet</Text><Text style={styles.clientName}>{user?.fullName || 'Client TaKo'}</Text></View></View>
        </>}
        {step === 4 && <>
          <Text style={styles.paymentTitle}>Moyen de paiement</Text>
          <Text style={styles.paymentSubtitle}>Choisissez votre moyen de paiement</Text>
          <View style={styles.paymentMethods}>{paymentMethods.map((method) => { const active = paymentMethod === method.key; return <TouchableOpacity key={method.key} style={[styles.paymentMethod, active && styles.paymentMethodActive]} onPress={() => setPaymentMethod(method.key)} activeOpacity={0.82}>
            <Image source={method.logo} style={styles.paymentLogo} resizeMode="contain" />
            <View style={styles.grow}><Text style={styles.paymentName}>{method.label}</Text><Text style={styles.paymentHint}>{method.subtitle}</Text></View>
            <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
          </TouchableOpacity>; })}</View>
          <Text style={styles.paymentLabel}>Numéro Mobile Money</Text>
          <Text style={styles.paymentHelper}>Entrez votre numéro pour recevoir la demande de paiement</Text>
          <View style={styles.phoneRow}><View style={styles.countryCode}><Text style={styles.countryCodeText}>+243</Text><Ionicons name="chevron-down" size={18} color={BLUE} /></View><View style={styles.phoneInputWrap}><TextInput value={mobileNumber} onChangeText={(value) => setMobileNumber(value.replace(/[^0-9 ]/g, ''))} keyboardType="phone-pad" placeholder="81 234 5678" placeholderTextColor="#8A91A0" style={styles.phoneInput} /><Ionicons name="person-outline" size={22} color="#596274" /></View></View>
          <Text style={styles.paymentLabel}>Montant à payer</Text>
          <View style={styles.amountBox}><Text style={styles.amountLabel}>Montant total</Text><Text style={styles.amountValue}>{total.toLocaleString('fr-FR')} USD</Text></View>
          <View style={styles.secureRow}><Ionicons name="lock-closed-outline" size={18} color={BLUE} /><Text style={styles.secureText}>Paiement 100% sécurisé</Text></View>
        </>}
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={() => {
        if (step < 4) return setStep((step + 1) as Step);
        if (mobileNumber.replace(/\s/g, '').length < 9) return Alert.alert('Numéro incorrect', 'Entrez un numéro Mobile Money valide.');
        Alert.alert('Paiement envoyé', `Validez la demande ${paymentMethods.find((item) => item.key === paymentMethod)?.label} sur votre téléphone.`, [{ text: 'OK', onPress: () => router.replace('/my-reservations') }]);
      }}>
        {step === 4 && <Ionicons name="lock-closed-outline" size={20} color="white" />}
        <Text style={styles.buttonText}>{step === 4 ? `Payer ${total.toLocaleString('fr-FR')} USD` : step === 3 ? 'Confirmer la réservation' : 'Continuer'}</Text>
      </TouchableOpacity>
      <CalendarModal visible={calendarTarget !== null} value={calendarTarget === 'return' ? returnDate : pickupDate} minimumDate={calendarTarget === 'return' ? new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate() + 1) : new Date()} onSelect={chooseDate} onClose={() => setCalendarTarget(null)} />
      <TimeModal visible={timeTarget !== null} value={timeTarget === 'return' ? returnTime : pickupTime} onSelect={(value) => { if (timeTarget === 'return') setReturnTime(value); else setPickupTime(value); setTimeTarget(null); }} onClose={() => setTimeTarget(null)} />
    </View>
  </View>;
}

function TimeModal({ visible, value, onSelect, onClose }: { visible: boolean; value: string; onSelect: (value: string) => void; onClose: () => void }) {
  const [hour, setHour] = useState(Number(value.split(':')[0]));
  const [minute, setMinute] = useState(Number(value.split(':')[1]));
  useEffect(() => { if (visible) { setHour(Number(value.split(':')[0])); setMinute(Number(value.split(':')[1])); } }, [visible, value]);
  const changeHour = (offset: number) => setHour((current) => (current + offset + 24) % 24);
  const changeMinute = (offset: number) => {
    const total = (hour * 60 + minute + offset + 1440) % 1440;
    setHour(Math.floor(total / 60));
    setMinute(total % 60);
  };
  const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalShade}><View style={styles.timePicker}>
      <Text style={styles.timePickerTitle}>Choisissez l’heure</Text><Text style={styles.timePickerHint}>Créneaux de 30 minutes</Text>
      <View style={styles.timeControls}>
        <View style={styles.timeColumn}><TouchableOpacity style={styles.timeArrow} onPress={() => changeHour(1)}><Ionicons name="chevron-up" size={28} color={BLUE} /></TouchableOpacity><Text style={styles.timeValue}>{String(hour).padStart(2, '0')}</Text><TouchableOpacity style={styles.timeArrow} onPress={() => changeHour(-1)}><Ionicons name="chevron-down" size={28} color={BLUE} /></TouchableOpacity><Text style={styles.timeUnit}>Heure</Text></View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeColumn}><TouchableOpacity style={styles.timeArrow} onPress={() => changeMinute(30)}><Ionicons name="chevron-up" size={28} color={BLUE} /></TouchableOpacity><Text style={styles.timeValue}>{String(minute).padStart(2, '0')}</Text><TouchableOpacity style={styles.timeArrow} onPress={() => changeMinute(-30)}><Ionicons name="chevron-down" size={28} color={BLUE} /></TouchableOpacity><Text style={styles.timeUnit}>Minute</Text></View>
      </View>
      <View style={styles.timeActions}><TouchableOpacity style={styles.timeCancel} onPress={onClose}><Text style={styles.timeCancelText}>Annuler</Text></TouchableOpacity><TouchableOpacity style={styles.timeConfirm} onPress={() => onSelect(formatted)}><Text style={styles.timeConfirmText}>Confirmer</Text></TouchableOpacity></View>
    </View></View>
  </Modal>;
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

function Field({ icon, label, value, onPress, compact }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress?: () => void; compact?: boolean }) {
  return <TouchableOpacity style={[styles.field, compact && styles.fieldCompact]} onPress={onPress}><Ionicons name={icon} size={23} color={BLUE} /><View style={styles.grow}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldValue} numberOfLines={1}>{value}</Text></View><Ionicons name="chevron-down" size={18} color={BLUE} /></TouchableOpacity>;
}

function Summary({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.summaryRow}><Ionicons name={icon} size={21} color={BLUE} /><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' }, page: { flex: 1, paddingHorizontal: 20 }, scroll: { flex: 1 }, scrollBody: { paddingBottom: 12 }, grow: { flex: 1 },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#B7D9FF', alignItems: 'center', justifyContent: 'center' }, spacer: { width: 42 }, title: { color: NAVY, fontSize: 22, fontWeight: '900' },
  section: { color: NAVY, fontSize: 18, fontWeight: '900', marginTop: 5, marginBottom: 10 }, field: { minHeight: 76, borderWidth: 1, borderColor: '#D9DDE6', borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 }, fieldCompact: { minHeight: 84, paddingHorizontal: 10, gap: 7 }, fieldLabel: { color: '#667085', fontSize: 14, fontWeight: '700', marginBottom: 5 }, fieldValue: { color: NAVY, fontSize: 16, fontWeight: '900' }, columns: { flexDirection: 'row', gap: 12 }, half: { flex: 1 },
  vehicleList: { gap: 10, paddingBottom: 15 }, vehicle: { width: 158, minHeight: 226, borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' }, vehicleActive: { borderWidth: 2, borderColor: BLUE, backgroundColor: '#F7FAFF' }, checkBadge: { position: 'absolute', zIndex: 2, top: 7, right: 7, width: 26, height: 26, borderRadius: 13, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }, vehicleImage: { width: 138, height: 76 }, vehicleName: { color: NAVY, fontSize: 16, fontWeight: '900', marginTop: 3 }, vehicleModel: { color: NAVY, fontSize: 14, fontWeight: '800', marginTop: 3 }, vehicleDetails: { color: '#687184', fontSize: 14, marginTop: 3, textAlign: 'center' }, muted: { color: '#737A89', fontSize: 14, marginTop: 3 }, priceSmall: { color: BLUE, fontSize: 14, fontWeight: '900', marginTop: 3 },
  optionCard: { borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, overflow: 'hidden' }, option: { minHeight: 72, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#E7EAF0' }, iconBox: { width: 40, height: 40, borderRadius: 9, backgroundColor: '#F0F6FF', alignItems: 'center', justifyContent: 'center' }, optionTitle: { color: NAVY, fontSize: 16, fontWeight: '800' }, checkbox: { width: 24, height: 24, borderRadius: 5, borderWidth: 1.5, borderColor: '#A8ADB7', alignItems: 'center', justifyContent: 'center' }, checkboxActive: { borderColor: BLUE, backgroundColor: BLUE },
  summary: { borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, padding: 15, gap: 13 }, summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, summaryLabel: { width: 112, color: NAVY, fontSize: 14, fontWeight: '800' }, summaryValue: { flex: 1, color: '#4C5567', fontSize: 14, lineHeight: 19 }, estimate: { minHeight: 86, marginTop: 16, borderRadius: 12, backgroundColor: '#F0F5FF', paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, detail: { color: '#596274', fontSize: 14, marginTop: 8 }, total: { color: BLUE, fontSize: 22, fontWeight: '900' }, client: { minHeight: 72, borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, clientLabel: { color: '#687184', fontSize: 14 }, clientName: { color: NAVY, fontSize: 16, fontWeight: '800', marginTop: 3 },
  paymentTitle: { color: NAVY, fontSize: 22, fontWeight: '900', marginTop: 4 }, paymentSubtitle: { color: '#596274', fontSize: 14, marginTop: 5, marginBottom: 14 }, paymentMethods: { gap: 10 }, paymentMethod: { minHeight: 78, borderWidth: 1, borderColor: '#E0E4EB', borderRadius: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }, paymentMethodActive: { borderColor: BLUE, backgroundColor: '#F3F8FF' }, paymentLogo: { width: 52, height: 52, borderRadius: 8 }, paymentName: { color: NAVY, fontSize: 18, fontWeight: '900' }, paymentHint: { color: '#687184', fontSize: 14, marginTop: 4 }, radio: { width: 27, height: 27, borderRadius: 14, borderWidth: 2, borderColor: '#7A8291', alignItems: 'center', justifyContent: 'center' }, radioActive: { borderColor: BLUE, borderWidth: 6 }, radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' }, paymentLabel: { color: NAVY, fontSize: 18, fontWeight: '900', marginTop: 18 }, paymentHelper: { color: '#687184', fontSize: 14, marginTop: 4, marginBottom: 10 }, phoneRow: { flexDirection: 'row', gap: 10 }, countryCode: { width: 112, height: 57, borderWidth: 1, borderColor: BLUE, borderRadius: 9, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, countryCodeText: { color: '#4D5668', fontSize: 18 }, phoneInputWrap: { flex: 1, height: 57, borderWidth: 1, borderColor: BLUE, borderRadius: 9, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' }, phoneInput: { flex: 1, color: NAVY, fontSize: 18 }, amountBox: { height: 68, marginTop: 10, borderWidth: 1, borderColor: BLUE, borderRadius: 9, backgroundColor: '#F2F7FF', paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, amountLabel: { color: '#687184', fontSize: 14 }, amountValue: { color: BLUE, fontSize: 22, fontWeight: '900' }, secureRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18 }, secureText: { color: '#687184', fontSize: 14, fontWeight: '700' },
  button: { height: 58, borderRadius: 11, backgroundColor: BLUE, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, buttonText: { color: 'white', fontSize: 17, fontWeight: '900' },
  modalShade: { flex: 1, backgroundColor: 'rgba(3,15,50,0.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, calendar: { width: '100%', maxWidth: 390, borderRadius: 18, backgroundColor: 'white', padding: 18 }, calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, calendarTitle: { color: NAVY, fontSize: 18, fontWeight: '900', textTransform: 'capitalize' }, week: { flexDirection: 'row' }, weekDay: { width: '14.285%', color: '#748094', fontSize: 14, fontWeight: '800', textAlign: 'center' }, days: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, dayCell: { width: '14.285%', height: 43, alignItems: 'center', justifyContent: 'center' }, dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, daySelected: { backgroundColor: BLUE }, dayText: { color: NAVY, fontSize: 16, fontWeight: '700' }, dayDisabled: { color: '#C2C7D0' }, dayTextSelected: { color: 'white', fontWeight: '900' }, calendarClose: { alignSelf: 'flex-end', marginTop: 10, paddingHorizontal: 8, paddingVertical: 6 }, calendarCloseText: { color: BLUE, fontSize: 16, fontWeight: '800' },
  timePicker: { width: '100%', maxWidth: 350, borderRadius: 18, backgroundColor: '#fff', padding: 20 }, timePickerTitle: { color: NAVY, fontSize: 22, fontWeight: '900', textAlign: 'center' }, timePickerHint: { color: '#687184', fontSize: 14, textAlign: 'center', marginTop: 4 }, timeControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 12 }, timeColumn: { alignItems: 'center' }, timeArrow: { width: 54, height: 42, alignItems: 'center', justifyContent: 'center' }, timeValue: { minWidth: 80, borderRadius: 12, backgroundColor: '#F1F6FF', color: NAVY, fontSize: 36, fontWeight: '900', textAlign: 'center', paddingVertical: 10 }, timeColon: { color: NAVY, fontSize: 36, fontWeight: '900', marginBottom: 15 }, timeUnit: { color: '#687184', fontSize: 14, marginTop: 4 }, timeActions: { flexDirection: 'row', gap: 10, marginTop: 22 }, timeCancel: { flex: 1, height: 48, borderWidth: 1, borderColor: BLUE, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, timeCancelText: { color: BLUE, fontSize: 16, fontWeight: '800' }, timeConfirm: { flex: 1, height: 48, borderRadius: 9, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }, timeConfirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

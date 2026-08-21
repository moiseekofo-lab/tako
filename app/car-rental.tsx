import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAKO_BLUE = '#061F68';
const ACTION_BLUE = '#0877EA';

const vehicles = [
  { key: 'economy', label: 'Économique', icon: 'car-hatchback', price: 40000 },
  { key: 'suv', label: 'SUV', icon: 'car-estate', price: 70000 },
  { key: 'minibus', label: 'Minibus', icon: 'van-passenger', price: 120000 },
  { key: 'luxury', label: 'Luxe', icon: 'car-sports', price: 150000 },
] as const;

const rentalOptions = [
  { key: 'insurance', title: 'Assurance tous risques', subtitle: 'Protégez-vous durant votre trajet', icon: 'shield-check-outline', price: 10000 },
  { key: 'driver', title: 'Avec chauffeur', subtitle: 'Un chauffeur professionnel à votre disposition', icon: 'account-outline', price: 20000 },
  { key: 'wifi', title: 'Wi-Fi à bord', subtitle: 'Restez connecté pendant le trajet', icon: 'wifi', price: 5000 },
] as const;

export default function CarRental() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pickup, setPickup] = useState('Kinshasa, Gombe');
  const [returnPlace, setReturnPlace] = useState('Kinshasa, Gombe');
  const [vehicle, setVehicle] = useState<(typeof vehicles)[number]['key']>('economy');
  const [options, setOptions] = useState<string[]>([]);

  const selectedVehicle = vehicles.find((item) => item.key === vehicle) ?? vehicles[0];
  const total = useMemo(
    () => selectedVehicle.price * 2 + rentalOptions.filter((item) => options.includes(item.key)).reduce((sum, item) => sum + item.price, 0),
    [options, selectedVehicle.price]
  );

  const toggleOption = (key: string) => {
    setOptions((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const cycleLocation = (current: string, setter: (value: string) => void) => {
    setter(current === 'Kinshasa, Gombe' ? 'Aéroport de N’Djili' : 'Kinshasa, Gombe');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={26} color={ACTION_BLUE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Louer une voiture</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Field label="Lieu de prise en charge" value={pickup} icon="location-outline" onPress={() => cycleLocation(pickup, setPickup)} />
        <Field label="Lieu de retour" value={returnPlace} icon="location-outline" onPress={() => cycleLocation(returnPlace, setReturnPlace)} />

        <View style={styles.twoColumns}>
          <View style={styles.half}><Field label="Date de prise en charge" value="21/08/2026" icon="calendar-outline" /></View>
          <View style={styles.half}><Field label="Date de retour" value="23/08/2026" icon="calendar-outline" /></View>
        </View>
        <Field label="Heure de prise en charge" value="10:00" icon="time-outline" />

        <Text style={styles.sectionLabel}>Type de véhicule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleRow}>
          {vehicles.map((item) => {
            const selected = vehicle === item.key;
            return (
              <TouchableOpacity key={item.key} style={[styles.vehicleCard, selected && styles.vehicleCardSelected]} onPress={() => setVehicle(item.key)} activeOpacity={0.85}>
                {selected ? <View style={styles.selectedBadge}><Ionicons name="checkmark" size={16} color="white" /></View> : null}
                <MaterialCommunityIcons name={item.icon} size={52} color={selected ? ACTION_BLUE : '#424B5A'} />
                <Text style={styles.vehicleTitle}>{item.label}</Text>
                <Text style={styles.vehicleFrom}>à partir de</Text>
                <Text style={styles.vehiclePrice}>{item.price.toLocaleString('fr-FR')} FC / jour</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Options (facultatif)</Text>
        <View style={styles.optionsCard}>
          {rentalOptions.map((item) => {
            const selected = options.includes(item.key);
            return (
              <TouchableOpacity key={item.key} style={styles.optionRow} onPress={() => toggleOption(item.key)} activeOpacity={0.8}>
                <View style={styles.optionIcon}><MaterialCommunityIcons name={item.icon} size={25} color={ACTION_BLUE} /></View>
                <View style={styles.optionCopy}><Text style={styles.optionTitle}>{item.title}</Text><Text style={styles.optionSubtitle}>{item.subtitle}</Text></View>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected ? <Ionicons name="checkmark" size={17} color="white" /> : null}</View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.estimateCard}>
          <MaterialCommunityIcons name="receipt-text-outline" size={28} color={ACTION_BLUE} />
          <View style={styles.estimateCopy}><Text style={styles.estimateTitle}>Estimation du prix</Text><Text style={styles.estimateMeta}>2 jours • 10:00</Text></View>
          <View style={styles.estimateRight}><Text style={styles.estimatePrice}>{total.toLocaleString('fr-FR')} FC</Text><Text style={styles.detailText}>Voir le détail  ›</Text></View>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.88}
          onPress={() => Alert.alert('Location préparée', `${selectedVehicle.label} • ${total.toLocaleString('fr-FR')} FC`)}>
          <Text style={styles.continueText}>Continuer</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, icon, onPress }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name={icon} size={23} color={ACTION_BLUE} />
        <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-down" size={21} color={ACTION_BLUE} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  content: { paddingHorizontal: 20 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#B7D9FF', alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  headerTitle: { color: TAKO_BLUE, fontSize: 24, fontWeight: '900' },
  fieldBlock: { marginBottom: 14 },
  fieldLabel: { color: TAKO_BLUE, fontSize: 14, fontWeight: '800', marginBottom: 7 },
  field: { height: 54, borderWidth: 1, borderColor: '#D9DDE6', borderRadius: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldValue: { flex: 1, color: TAKO_BLUE, fontSize: 16, fontWeight: '800' },
  twoColumns: { flexDirection: 'row', gap: 14 },
  half: { flex: 1 },
  sectionLabel: { color: TAKO_BLUE, fontSize: 18, fontWeight: '900', marginTop: 4, marginBottom: 10 },
  vehicleRow: { gap: 10, paddingBottom: 16 },
  vehicleCard: { width: 142, minHeight: 150, borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' },
  vehicleCardSelected: { borderWidth: 2, borderColor: ACTION_BLUE, backgroundColor: '#F7FAFF' },
  selectedBadge: { position: 'absolute', top: 7, right: 7, width: 26, height: 26, borderRadius: 13, backgroundColor: ACTION_BLUE, alignItems: 'center', justifyContent: 'center' },
  vehicleTitle: { color: TAKO_BLUE, fontSize: 16, fontWeight: '900', marginTop: 5 },
  vehicleFrom: { color: '#777E8E', fontSize: 14, marginTop: 4 },
  vehiclePrice: { color: ACTION_BLUE, fontSize: 14, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  optionsCard: { borderWidth: 1, borderColor: '#DDE1EA', borderRadius: 12, overflow: 'hidden' },
  optionRow: { minHeight: 67, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#E7EAF0' },
  optionIcon: { width: 40, height: 40, borderRadius: 9, backgroundColor: '#F0F6FF', alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1 },
  optionTitle: { color: TAKO_BLUE, fontSize: 16, fontWeight: '800' },
  optionSubtitle: { color: '#737A89', fontSize: 14, marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 5, borderWidth: 1.5, borderColor: '#A8ADB7', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: ACTION_BLUE, backgroundColor: ACTION_BLUE },
  estimateCard: { minHeight: 78, marginTop: 16, borderRadius: 12, backgroundColor: '#F0F5FF', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  estimateCopy: { flex: 1 },
  estimateTitle: { color: TAKO_BLUE, fontSize: 16, fontWeight: '800' },
  estimateMeta: { color: '#687184', fontSize: 14, marginTop: 3 },
  estimateRight: { alignItems: 'flex-end' },
  estimatePrice: { color: ACTION_BLUE, fontSize: 18, fontWeight: '900' },
  detailText: { color: '#596274', fontSize: 14, marginTop: 3 },
  continueButton: { height: 58, borderRadius: 11, backgroundColor: ACTION_BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  continueText: { color: 'white', fontSize: 17, fontWeight: '900' },
});

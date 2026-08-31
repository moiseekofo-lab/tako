import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveDriverTripSettings } from '../services/api';
import { useStore } from './store';

const DRIVER_TRIP_INFO_KEY = 'tako:driverTripInfo';
const splitRoute = (route: string) => {
  const [departure = '', arrival = ''] = String(route || '').split(/\s*(?:→|->)\s*/);
  return { departure, arrival };
};

export default function DriverTrips() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((state: any) => state.currentUser);
  const driverTripInfo = useStore((state: any) => state.driverTripInfo);
  const setDriverTripInfo = useStore((state: any) => state.setDriverTripInfo);
  const initialRoute = splitRoute(driverTripInfo.route);
  const [departure, setDeparture] = useState(initialRoute.departure);
  const [arrival, setArrival] = useState(initialRoute.arrival);
  const [bus, setBus] = useState(driverTripInfo.bus || '');
  const [amount, setAmount] = useState(driverTripInfo.amount || '');
  const [isSaved, setIsSaved] = useState(Boolean(driverTripInfo.route && driverTripInfo.amount));
  const [isEditing, setIsEditing] = useState(!driverTripInfo.route || !driverTripInfo.amount);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DRIVER_TRIP_INFO_KEY).then((stored) => {
      if (!stored) return;
      try {
        const info = JSON.parse(stored);
        const route = splitRoute(info.route);
        setDeparture(route.departure);
        setArrival(route.arrival);
        setBus(String(info.bus || ''));
        setAmount(String(info.amount || ''));
        setDriverTripInfo({ route: String(info.route || ''), bus: String(info.bus || ''), amount: String(info.amount || '') });
        const complete = Boolean(info.route && info.amount);
        setIsSaved(complete);
        setIsEditing(!complete);
      } catch {
        AsyncStorage.removeItem(DRIVER_TRIP_INFO_KEY).catch(() => {});
      }
    }).catch(() => {});
  }, [setDriverTripInfo]);

  const swapLocations = () => {
    if (!isEditing) return;
    setDeparture(arrival);
    setArrival(departure);
  };

  const saveTrip = async () => {
    if (isSaved && !isEditing) {
      setIsEditing(true);
      return;
    }
    const value = Number.parseInt(amount.replace(/\s/g, ''), 10);
    if (!departure.trim() || !arrival.trim()) {
      Alert.alert('Informations incomplètes', 'Entrez le lieu de départ et le lieu d’arrivée.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Montant incorrect', 'Entrez le montant du trajet.');
      return;
    }
    const info = { route: `${departure.trim()} → ${arrival.trim()}`, bus: bus.trim(), amount: String(value) };
    try {
      setSaving(true);
      await AsyncStorage.setItem(DRIVER_TRIP_INFO_KEY, JSON.stringify(info));
      setDriverTripInfo(info);
      await saveDriverTripSettings({ driverId: currentUser?.id, route: info.route, busPlate: info.bus, amount: value }).catch(() => null);
      setIsSaved(true);
      setIsEditing(false);
      Alert.alert('Trajet enregistré', 'Ces informations resteront enregistrées jusqu’à votre prochaine modification.');
    } catch (error) {
      Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.inputBox, !isEditing && styles.inputBoxSaved];
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 18) }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={29} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Trajet</Text><View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 30 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.intro}>
            <View style={styles.introIcon}><MaterialCommunityIcons name="bus" size={31} color="white" /></View>
            <View style={styles.introCopy}><Text style={styles.introTitle}>Informations du trajet</Text><Text style={styles.introText}>{isSaved && !isEditing ? 'Votre trajet est enregistré' : 'Veuillez remplir les informations ci-dessous'}</Text></View>
            {isSaved && !isEditing ? <Ionicons name="checkmark-circle" size={27} color="#09B85A" /> : null}
          </View>
          <View style={styles.locationRow}>
            <View style={styles.locationField}><Text style={styles.label}>Lieu de départ <Text style={styles.required}>*</Text></Text><View style={inputStyle}><Ionicons name="location-outline" size={23} color="#68738B" /><TextInput editable={isEditing} style={styles.input} value={departure} onChangeText={setDeparture} placeholder="Ex : Gare Centrale" placeholderTextColor="#949BAA" /></View></View>
            <TouchableOpacity style={[styles.swapButton, !isEditing && styles.swapButtonDisabled]} disabled={!isEditing} onPress={swapLocations}><Ionicons name="swap-horizontal" size={25} color="#536078" /></TouchableOpacity>
            <View style={styles.locationField}><Text style={styles.label}>Lieu d’arrivée <Text style={styles.required}>*</Text></Text><View style={inputStyle}><Ionicons name="location-outline" size={23} color="#68738B" /><TextInput editable={isEditing} style={styles.input} value={arrival} onChangeText={setArrival} placeholder="Ex : Victoire" placeholderTextColor="#949BAA" /></View></View>
          </View>
          <Text style={styles.label}>Ligne / Bus (facultatif)</Text>
          <View style={inputStyle}><MaterialCommunityIcons name="bus" size={23} color="#68738B" /><TextInput editable={isEditing} style={styles.input} value={bus} onChangeText={setBus} placeholder="Ex : Ligne 10, Bus 23, Express..." placeholderTextColor="#949BAA" /></View>
          <Text style={[styles.label, styles.amountLabel]}>Montant du trajet (CDF) <Text style={styles.required}>*</Text></Text>
          <View style={inputStyle}><MaterialCommunityIcons name="cash" size={24} color="#68738B" /><TextInput editable={isEditing} style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Ex : 500" placeholderTextColor="#949BAA" /></View>
          <TouchableOpacity style={[styles.saveButton, isSaved && !isEditing && styles.editButton, saving && styles.disabled]} disabled={saving} onPress={saveTrip}>
            <Ionicons name={isSaved && !isEditing ? 'create-outline' : 'save-outline'} size={23} color="white" />
            <Text style={styles.saveText}>{saving ? 'Enregistrement...' : isSaved && !isEditing ? 'Modifier le trajet' : 'Enregistrer le trajet'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' },
  header: { minHeight: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#061F68', paddingHorizontal: 22, paddingBottom: 16 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 23, fontWeight: '800' },
  content: { padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 18, shadowColor: '#061F68', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  introCopy: { flex: 1 },
  introIcon: { width: 54, height: 54, borderRadius: 9, backgroundColor: '#0A55D4', alignItems: 'center', justifyContent: 'center' },
  introTitle: { color: '#061F68', fontSize: 19, fontWeight: '900' },
  introText: { color: '#7A8394', fontSize: 13, marginTop: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 18 },
  locationField: { flex: 1 },
  label: { color: '#061F68', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  amountLabel: { marginTop: 20 },
  required: { color: '#E63946' },
  inputBox: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#D8DDEA', borderRadius: 9, paddingHorizontal: 12, backgroundColor: 'white' },
  inputBoxSaved: { backgroundColor: '#F3F6FA', borderColor: '#E4E8EF' },
  input: { flex: 1, color: '#17213B', fontSize: 14, fontWeight: '600', paddingVertical: 0 },
  swapButton: { width: 43, height: 43, borderRadius: 22, borderWidth: 1, borderColor: '#E0E4EC', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  swapButtonDisabled: { opacity: 0.45 },
  saveButton: { height: 60, borderRadius: 8, backgroundColor: '#073CAD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 },
  editButton: { backgroundColor: '#139DFF' },
  disabled: { opacity: 0.7 },
  saveText: { color: 'white', fontSize: 15, fontWeight: '800' },
});

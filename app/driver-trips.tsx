import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';

const paymentMethods = [
  { key: 'balance', label: 'Solde TaKo', icon: 'card-outline' },
  { key: 'qr', label: 'QR Code', icon: 'qr-code-outline' },
  { key: 'nfc', label: 'Carte NFC', icon: 'wifi-outline' },
] as const;

export default function DriverTrips() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addTrip = useStore((state: any) => state.addTrip);
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [bus, setBus] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>(paymentMethods[0]);
  const [showMethods, setShowMethods] = useState(false);

  const swapLocations = () => {
    setDeparture(arrival);
    setArrival(departure);
  };

  const saveTrip = () => {
    const value = Number.parseInt(amount.replace(/\s/g, ''), 10);
    if (!departure.trim() || !arrival.trim()) {
      Alert.alert('Informations incomplètes', 'Entrez le lieu de départ et le lieu d’arrivée.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Montant incorrect', 'Entrez le montant payé pour ce trajet.');
      return;
    }
    addTrip({
      bus: bus.trim() || 'Ligne non renseignée',
      route: `${departure.trim()} → ${arrival.trim()}`,
      amount: value,
      paymentType: paymentMethod.key,
    });
    Alert.alert('Trajet enregistré', 'Le trajet a été ajouté à votre historique.', [
      { text: 'Voir l’historique', onPress: () => router.replace('/history' as any) },
      { text: 'Nouveau trajet', onPress: () => { setDeparture(''); setArrival(''); setBus(''); setAmount(''); setNotes(''); } },
    ]);
  };

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
            <View><Text style={styles.introTitle}>Informations du trajet</Text><Text style={styles.introText}>Veuillez remplir les informations ci-dessous</Text></View>
          </View>

          <View style={styles.locationRow}>
            <View style={styles.locationField}><Text style={styles.label}>Lieu de départ <Text style={styles.required}>*</Text></Text><View style={styles.inputBox}><Ionicons name="location-outline" size={23} color="#68738B" /><TextInput style={styles.input} value={departure} onChangeText={setDeparture} placeholder="Ex : Gare Centrale" placeholderTextColor="#949BAA" /></View></View>
            <TouchableOpacity style={styles.swapButton} onPress={swapLocations}><Ionicons name="swap-horizontal" size={25} color="#536078" /></TouchableOpacity>
            <View style={styles.locationField}><Text style={styles.label}>Lieu d’arrivée <Text style={styles.required}>*</Text></Text><View style={styles.inputBox}><Ionicons name="location-outline" size={23} color="#68738B" /><TextInput style={styles.input} value={arrival} onChangeText={setArrival} placeholder="Ex : Victoire" placeholderTextColor="#949BAA" /></View></View>
          </View>

          <Text style={styles.label}>Ligne / Bus (facultatif)</Text>
          <View style={styles.inputBox}><MaterialCommunityIcons name="bus" size={23} color="#68738B" /><TextInput style={styles.input} value={bus} onChangeText={setBus} placeholder="Ex : Ligne 10, Bus 23, Express..." placeholderTextColor="#949BAA" /></View>

          <View style={styles.twoColumns}>
            <View style={styles.column}><Text style={styles.label}>Montant payé (CDF) <Text style={styles.required}>*</Text></Text><View style={styles.inputBox}><MaterialCommunityIcons name="cash" size={24} color="#68738B" /><TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Ex : 500" placeholderTextColor="#949BAA" /></View></View>
            <View style={styles.column}><Text style={styles.label}>Moyen de paiement <Text style={styles.required}>*</Text></Text><TouchableOpacity style={styles.inputBox} onPress={() => setShowMethods(true)}><Ionicons name={paymentMethod.icon as any} size={23} color="#68738B" /><Text style={styles.methodText}>{paymentMethod.label}</Text><Ionicons name="chevron-down" size={21} color="#68738B" /></TouchableOpacity></View>
          </View>

          <Text style={styles.label}>Notes (facultatif)</Text>
          <View style={styles.notesBox}><MaterialCommunityIcons name="note-text-outline" size={23} color="#68738B" /><TextInput style={styles.notesInput} value={notes} onChangeText={(value) => setNotes(value.slice(0, 200))} multiline placeholder="Ajouter une note..." placeholderTextColor="#949BAA" /><Text style={styles.counter}>{notes.length}/200</Text></View>

          <TouchableOpacity style={styles.saveButton} onPress={saveTrip}><Ionicons name="save-outline" size={23} color="white" /><Text style={styles.saveText}>Enregistrer le trajet</Text></TouchableOpacity>

          <View style={styles.remark}><Ionicons name="information-circle-outline" size={27} color="#0877EA" /><View><Text style={styles.remarkTitle}>Remarque</Text><Text style={styles.remarkText}>Ce trajet apparaîtra dans votre historique.</Text></View></View>
        </View>
      </ScrollView>

      <Modal visible={showMethods} transparent animationType="fade" onRequestClose={() => setShowMethods(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowMethods(false)}>
          <View style={styles.methodCard}><Text style={styles.methodTitle}>Moyen de paiement</Text>{paymentMethods.map((method) => <TouchableOpacity key={method.key} style={styles.methodRow} onPress={() => { setPaymentMethod(method); setShowMethods(false); }}><Ionicons name={method.icon as any} size={24} color="#0877EA" /><Text style={styles.methodRowText}>{method.label}</Text>{paymentMethod.key === method.key ? <Ionicons name="checkmark-circle" size={23} color="#09B85A" /> : null}</TouchableOpacity>)}</View>
        </TouchableOpacity>
      </Modal>
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
  introIcon: { width: 54, height: 54, borderRadius: 9, backgroundColor: '#0A55D4', alignItems: 'center', justifyContent: 'center' },
  introTitle: { color: '#061F68', fontSize: 19, fontWeight: '900' },
  introText: { color: '#7A8394', fontSize: 13, marginTop: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 18 },
  locationField: { flex: 1 },
  twoColumns: { flexDirection: 'row', gap: 12, marginTop: 18 },
  column: { flex: 1 },
  label: { color: '#061F68', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  required: { color: '#E63946' },
  inputBox: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#D8DDEA', borderRadius: 9, paddingHorizontal: 12, backgroundColor: 'white' },
  input: { flex: 1, color: '#17213B', fontSize: 14, fontWeight: '600', paddingVertical: 0 },
  swapButton: { width: 43, height: 43, borderRadius: 22, borderWidth: 1, borderColor: '#E0E4EC', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  methodText: { flex: 1, color: '#4B5568', fontSize: 13, fontWeight: '700' },
  notesBox: { height: 126, flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderWidth: 1, borderColor: '#D8DDEA', borderRadius: 9, padding: 12, marginBottom: 18 },
  notesInput: { flex: 1, height: 92, color: '#17213B', fontSize: 14, textAlignVertical: 'top', paddingVertical: 0 },
  counter: { position: 'absolute', right: 12, bottom: 9, color: '#9098A8', fontSize: 11 },
  saveButton: { height: 60, borderRadius: 8, backgroundColor: '#073CAD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveText: { color: 'white', fontSize: 15, fontWeight: '800' },
  remark: { minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#EEF4FF', borderRadius: 8, padding: 15, marginTop: 18 },
  remarkTitle: { color: '#061F68', fontSize: 15, fontWeight: '900' },
  remarkText: { color: '#667085', fontSize: 12, marginTop: 7 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  methodCard: { width: '100%', maxWidth: 420, borderRadius: 16, backgroundColor: 'white', padding: 18 },
  methodTitle: { color: '#061F68', fontSize: 19, fontWeight: '900', marginBottom: 10 },
  methodRow: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  methodRowText: { flex: 1, color: '#17213B', fontSize: 15, fontWeight: '700' },
});

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { activatePrepaidCard, requestPrepaidCardCode } from '../services/api';
import { useStore } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_GREEN = '#09D457';
type NfcTag = { id?: string; type?: string } | null;

export default function AgentPrepaid() {
  const router = useRouter();
  const currentUser = useStore((state: any) => state.currentUser);
  const [cardId, setCardId] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(false);
  const getCardId = (tag: NfcTag) => tag?.id || tag?.type || '';

  const readCard = async () => {
    let manager: { cancelTechnologyRequest?: () => Promise<void> } | null = null;
    try {
      if (Platform.OS === 'web') {
        Alert.alert('NFC indisponible', 'La lecture NFC fonctionne sur l’application mobile installée.');
        return;
      }
      setReading(true);
      const module = await import('react-native-nfc-manager');
      const NfcManager = module.default;
      const { NfcTech } = module;
      manager = NfcManager;
      await NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage: 'Approchez la carte NFC vierge' });
      const nextCardId = getCardId(await NfcManager.getTag());
      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }
      setCardId(nextCardId);
      setMessage('Carte lue. Entrez le numéro du client.');
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setReading(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  const sendCode = async () => {
    if (!phone.trim()) {
      Alert.alert('Téléphone obligatoire', 'Entrez le numéro du client.');
      return;
    }
    try {
      setLoading(true);
      const result = await requestPrepaidCardCode(phone.trim());
      setMessage(result?.code ? `Code généré : ${result.code}.` : 'Code envoyé au téléphone du client.');
    } catch (error) {
      Alert.alert('Code non envoyé', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCard = async () => {
    if (!cardId || !phone.trim() || !code.trim()) {
      Alert.alert('Informations obligatoires', 'Lisez la carte, entrez le téléphone et le code.');
      return;
    }
    try {
      setLoading(true);
      const result = await activatePrepaidCard({
        phone: phone.trim(),
        code: code.trim(),
        cardId,
        operatorId: currentUser?.id || 'AGENT',
      });
      Alert.alert('Carte activée', `Carte associée au compte ${result?.client?.id}.`, [
        { text: 'OK', onPress: () => router.replace('/agent' as any) },
      ]);
    } catch (error) {
      Alert.alert('Activation impossible', error instanceof Error ? error.message : 'Vérifiez le code ou la carte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.replace('/agent' as any)}>
          <Ionicons name="chevron-back" size={25} color={TAKO_BLUE} />
        </TouchableOpacity>
        <TakoLogo />
      </View>

      <Text style={styles.kicker}>Mode agent</Text>
      <Text style={styles.title}>Carte prépayée</Text>
      <Text style={styles.subtitle}>Activez une carte NFC vierge pour un client sans smartphone.</Text>

      <View style={styles.form}>
        <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={reading} onPress={readCard}>
          {reading ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={24} color={TAKO_BLUE} />}
          <Text style={styles.nfcButtonText}>{reading ? 'Lecture NFC...' : 'Lire carte vierge NFC'}</Text>
        </TouchableOpacity>
        {!!cardId && (
          <View style={styles.readBox}>
            <MaterialCommunityIcons name="credit-card-check" size={20} color={TAKO_GREEN} />
            <Text style={styles.readText}>Carte lue : {cardId}</Text>
          </View>
        )}
        <View style={styles.inputBox}>
          <Ionicons name="call-outline" size={23} color="#7B8798" />
          <TextInput placeholder="Téléphone du client" placeholderTextColor="#8B95A5" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
        </View>
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} disabled={loading} onPress={sendCode}>
          <Text style={styles.secondaryButtonText}>Envoyer le code</Text>
        </TouchableOpacity>
        <View style={styles.inputBox}>
          <Ionicons name="keypad-outline" size={23} color="#7B8798" />
          <TextInput placeholder="Code reçu" placeholderTextColor="#8B95A5" value={code} onChangeText={setCode} keyboardType="number-pad" style={styles.input} />
        </View>
        {!!message && <Text style={styles.message}>{message}</Text>}
        <TouchableOpacity style={styles.button} activeOpacity={0.9} disabled={loading} onPress={confirmCard}>
          {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={23} color="white" />}
          <Text style={styles.buttonText}>Activer la carte</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white', paddingHorizontal: 24, paddingTop: 54, paddingBottom: 34 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 34 },
  backButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EAF3FF', borderWidth: 1, borderColor: '#BBDFFF', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#139DFF', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
  title: { color: TAKO_BLUE, fontSize: 32, fontWeight: '900', marginBottom: 10 },
  subtitle: { color: '#5C667A', fontSize: 16, fontWeight: '700', lineHeight: 23, marginBottom: 24 },
  form: { gap: 14 },
  nfcButton: { minHeight: 58, borderRadius: 16, backgroundColor: '#EAF3FF', borderWidth: 1, borderColor: '#BBDFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nfcButtonText: { color: TAKO_BLUE, fontSize: 16, fontWeight: '900' },
  readBox: { borderRadius: 14, backgroundColor: '#EBFFF3', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  readText: { color: TAKO_BLUE, fontSize: 13, fontWeight: '800', flex: 1 },
  inputBox: { minHeight: 62, borderRadius: 16, backgroundColor: '#F4F6FB', borderWidth: 1, borderColor: '#E0E8F4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, color: '#101828', fontSize: 17, fontWeight: '800' },
  secondaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: TAKO_BLUE, fontSize: 15, fontWeight: '900' },
  message: { color: '#5C667A', fontSize: 13, fontWeight: '800', lineHeight: 19 },
  button: { minHeight: 62, borderRadius: 16, backgroundColor: TAKO_BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { color: 'white', fontSize: 17, fontWeight: '900' },
});

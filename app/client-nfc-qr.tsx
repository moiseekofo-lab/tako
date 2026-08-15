import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { saveNfcCard } from '../services/api';
import { useStore } from './store';

const NFC_CARD_ID_KEY = 'tako:nfcCardId';
const BLUE = '#082A82';

function extractUid(data: string) {
  const value = String(data || '').trim();
  let uid = '';

  try {
    const url = new URL(value);
    if (url.hostname === 'takotransport.com' || url.hostname === 'www.takotransport.com') {
      uid = url.searchParams.get('uid') || '';
    }
  } catch {
    try {
      const payload = JSON.parse(value);
      uid = String(payload.uid || payload.cardId || '');
    } catch {
      uid = value;
    }
  }

  uid = uid.trim();
  return /^[A-Za-z0-9:_-]{4,128}$/.test(uid) ? uid : '';
}

export default function ClientNfcQrScanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentUser = useStore((state: any) => state.currentUser);
  const setNfcCardId = useStore((state: any) => state.setNfcCardId);

  const scanCard = async ({ data }: BarcodeScanningResult) => {
    if (scanned || loading) return;
    setScanned(true);

    const uid = extractUid(data);
    if (!uid) {
      Alert.alert('QR non valide', 'Scannez le QR TaKo contenant le lien d’activation de la carte.', [
        { text: 'Scanner encore', onPress: () => setScanned(false) },
      ]);
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Connexion requise', 'Connectez-vous à votre compte TaKo pour activer cette carte.', [
        { text: 'Se connecter', onPress: () => router.replace('/login' as any) },
      ]);
      return;
    }

    try {
      setLoading(true);
      await saveNfcCard(currentUser.id, uid);
      setNfcCardId(uid);
      await AsyncStorage.setItem(NFC_CARD_ID_KEY, uid);
      Alert.alert('Carte activée', 'La carte est maintenant associée à votre compte TaKo.', [
        { text: 'OK', onPress: () => router.replace('/client-nfc' as any) },
      ]);
    } catch (error) {
      Alert.alert('Activation impossible', error instanceof Error ? error.message : 'Veuillez réessayer.', [
        { text: 'Scanner encore', onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color={BLUE} size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <TakoLogo />
        <Text style={styles.title}>Autoriser la caméra</Text>
        <Text style={styles.subtitle}>La caméra est nécessaire pour scanner le QR d’activation de votre carte.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Ionicons name="camera-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#061F68" />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>Scanner le QR de la carte</Text>
      <Text style={styles.subtitle}>Scannez le QR contenant le lien takotransport.com/activate?uid=...</Text>
      <View style={styles.scanner}>
        {!scanned && (
          <CameraView
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanCard}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {loading && <View style={styles.loading}><ActivityIndicator color="white" size="large" /><Text style={styles.loadingText}>Activation...</Text></View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FF', paddingHorizontal: 30, paddingTop: 56, paddingBottom: 42, alignItems: 'center' },
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  backButton: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#126CDE', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#061F68', fontSize: 29, fontWeight: '900', textAlign: 'center', marginTop: 24 },
  subtitle: { color: '#52627A', fontSize: 16, fontWeight: '700', lineHeight: 23, textAlign: 'center', marginTop: 12, marginBottom: 24 },
  button: { width: '100%', minHeight: 62, borderRadius: 12, backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 26 },
  buttonText: { color: 'white', fontSize: 17, fontWeight: '900' },
  scanner: { width: '100%', maxWidth: 430, aspectRatio: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: '#07143C', borderWidth: 4, borderColor: '#126CDE' },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,20,60,0.78)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'white', fontSize: 18, fontWeight: '900' },
});

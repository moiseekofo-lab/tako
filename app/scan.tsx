import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { savePayment } from '../services/api';
import { translations, type Language } from './i18n';
import { useStore } from './store';

export default function Scan() {
  const router = useRouter();
  const params = useLocalSearchParams<{ montant?: string; trajet?: string; bus?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [amount, setAmount] = useState(params.montant ?? '');
  const [lastQrData, setLastQrData] = useState('');
  const [acceptedAmount, setAcceptedAmount] = useState<number | null>(null);

  const balance = useStore((state: any) => state.balance);
  const increaseBalance = useStore((state: any) => state.increaseBalance);
  const addNotification = useStore((state: any) => state.addNotification);
  const addTrip = useStore((state: any) => state.addTrip);
  const language = useStore((state: any) => state.language) as Language;
  const text = translations[language];

  useEffect(() => {
    if (acceptedAmount === null) {
      return;
    }

    const timeout = setTimeout(() => {
      router.replace({
        pathname: '/home',
        params: { role: 'chauffeur' },
      } as any);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [acceptedAmount, router]);

  const validatePayment = (rawAmount: string) => {
    const value = Number.parseInt(rawAmount, 10);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Erreur', 'Entre le montant !');
      return;
    }

    increaseBalance(value);
    addNotification({
      title: text.qrAccepted,
      message: text.qrMessage(value),
      amount: value,
      type: 'qr',
    });
    addTrip({
      bus: params.bus || 'Bus non renseigné',
      route: params.trajet || 'Trajet non renseigné',
      amount: value,
      paymentType: 'qr',
    });
    savePayment(value, 'qr').catch(() => {});
    Speech.speak('Paiement accepté');
    setAcceptedAmount(value);

    setScanned(true);
    setAmount('');
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) {
      return;
    }

    setScanned(true);
    setLastQrData(data);

    try {
      const qrData = JSON.parse(data);
      validatePayment(amount || String(qrData.amount ?? ''));
    } catch {
      validatePayment(amount);
    }
  };

  if (acceptedAmount !== null) {
    return (
      <View style={styles.acceptedScreen}>
        <View style={styles.acceptedIconCircle}>
          <Ionicons name="checkmark" size={104} color="#09D457" />
        </View>
        <Text style={styles.acceptedTitle}>Paiement accepté</Text>
        <Text style={styles.acceptedAmount}>{acceptedAmount} FC</Text>
        <Text style={styles.acceptedSubtitle}>Transaction confirmée</Text>
        <Text style={styles.acceptedReturnText}>Retour automatique...</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Permission caméra...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <TakoLogo />
        <Text style={styles.title}>Autoriser la caméra</Text>
        <Text style={styles.permissionText}>La caméra est nécessaire pour scanner le QR code.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.text}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Scanner QR</Text>
      <Text style={styles.balance}>Montant : {amount || '0'} FC</Text>

      <View style={styles.scannerBox}>
        {!scanned && acceptedAmount === null ? (
          <CameraView
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => {
              setLastQrData('');
              setScanned(false);
            }}>
            <Ionicons name="scan" size={24} color="white" />
            <Text style={styles.text}>Scanner encore</Text>
          </TouchableOpacity>
        )}
      </View>

      {!!lastQrData && <Text style={styles.qrData}>QR lu</Text>}

      <View style={styles.successBox}>
        <MaterialCommunityIcons name="steering" size={24} color="#09D457" />
        <Text style={styles.successText}>Paiement automatique après lecture QR</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#061F68',
    paddingHorizontal: 30,
    paddingTop: 56,
    paddingBottom: 42,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0,
  },
  logoWhite: {
    color: 'white',
  },
  logoBlue: {
    color: '#129CFF',
  },
  title: {
    color: 'white',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 12,
  },
  balance: {
    color: '#A9D9FF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
  },
  permissionText: {
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    width: 260,
  },
  scannerBox: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#061426',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAgainButton: {
    height: 64,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#139DFF',
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrData: {
    color: '#09D457',
    fontWeight: '800',
    marginBottom: 10,
  },
  inputBox: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 21,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    height: 78,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#09D457',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 21,
    fontWeight: '800',
  },
  successBox: {
    width: '100%',
    height: 62,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  acceptedScreen: {
    flex: 1,
    backgroundColor: '#09D457',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  acceptedIconCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  acceptedTitle: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  acceptedAmount: {
    color: 'white',
    fontSize: 46,
    fontWeight: '900',
    textAlign: 'center',
  },
  acceptedSubtitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 42,
  },
  acceptedReturnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';

export default function InternalRechargeScan() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned) {
      return;
    }

    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      const clientId = String(parsed.clientId || parsed.userId || '').trim();

      if (!clientId) {
        throw new Error('ID client introuvable');
      }

      router.replace({
        pathname: params.returnTo === 'agent' ? '/agent' : '/admin',
        params: { clientId },
      } as any);
    } catch {
      Alert.alert('QR non valide', 'Scannez le QR de recharge interne du client.', [
        {
          text: 'Scanner encore',
          onPress: () => setScanned(false),
        },
      ]);
    }
  };

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
        <Text style={styles.subtitle}>La caméra est nécessaire pour scanner le QR du client.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.buttonText}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#061F68" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Scanner QR client</Text>
      <Text style={styles.subtitle}>Après le scan, ajoutez le montant puis confirmez la recharge.</Text>

      <View style={styles.scannerBox}>
        {!scanned ? (
          <CameraView
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <Text style={styles.scanText}>QR lu...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
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
  title: {
    color: '#061F68',
    fontSize: 31,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#52627A',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 28,
    textAlign: 'center',
  },
  scannerBox: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#061426',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  button: {
    width: '100%',
    height: 66,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#061F68',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 19,
    fontWeight: '900',
  },
});

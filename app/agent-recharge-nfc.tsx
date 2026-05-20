import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';

const TAKO_BLUE = '#061F68';
type NfcTag = { id?: string; type?: string } | null;

export default function AgentRechargeNfc() {
  const router = useRouter();
  const [isReading, setIsReading] = useState(false);
  const getCardId = (tag: NfcTag) => tag?.id || tag?.type || '';

  const readNfcCard = async () => {
    let manager: { cancelTechnologyRequest?: () => Promise<void> } | null = null;

    try {
      if (Platform.OS === 'web') {
        Alert.alert('NFC indisponible', 'La lecture NFC fonctionne sur l’application mobile installée.');
        return;
      }

      setIsReading(true);
      const module = await import('react-native-nfc-manager');
      const NfcManager = module.default;
      const { NfcTech } = module;
      manager = NfcManager;
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez la carte du passager',
      });
      const tag = await NfcManager.getTag();
      const cardId = getCardId(tag);

      if (!cardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      router.push({
        pathname: '/agent-recharge-amount',
        params: { cardId, source: 'nfc' },
      } as any);
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReading(false);
      manager?.cancelTechnologyRequest?.().catch(() => {});
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.replace('/agent' as any)}>
          <Ionicons name="chevron-back" size={25} color={TAKO_BLUE} />
        </TouchableOpacity>
        <TakoLogo />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="nfc" size={54} color={TAKO_BLUE} />
        </View>
        <Text style={styles.kicker}>Recharge interne</Text>
        <Text style={styles.title}>Lire la carte</Text>
        <Text style={styles.subtitle}>Approchez la carte NFC du passager. Après lecture, la page montant s’ouvrira.</Text>

        <TouchableOpacity style={styles.button} activeOpacity={0.9} disabled={isReading} onPress={readNfcCard}>
          {isReading ? <ActivityIndicator color="white" /> : <MaterialCommunityIcons name="nfc" size={25} color="white" />}
          <Text style={styles.buttonText}>{isReading ? 'Lecture de la carte...' : 'Lire carte NFC'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 42,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BBDFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 30,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  kicker: {
    color: '#139DFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TAKO_BLUE,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: TAKO_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
});

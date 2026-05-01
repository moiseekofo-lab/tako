import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import NfcManager, { NfcTech, type TagEvent } from 'react-native-nfc-manager';
import { TakoLogo } from '../components/tako-logo';
import { savePayment } from '../services/api';
import { translations, type Language } from './i18n';
import { useStore } from './store';

export default function NfcPayment() {
  const router = useRouter();
  const params = useLocalSearchParams<{ montant?: string; trajet?: string; bus?: string }>();
  const [amount, setAmount] = useState(params.montant ?? '');
  const [isReading, setIsReading] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [lastTag, setLastTag] = useState('');
  const [acceptedAmount, setAcceptedAmount] = useState<number | null>(null);

  const balance = useStore((state: any) => state.balance);
  const increaseBalance = useStore((state: any) => state.increaseBalance);
  const addNotification = useStore((state: any) => state.addNotification);
  const addTrip = useStore((state: any) => state.addTrip);
  const nfcCardBlocked = useStore((state: any) => state.nfcCardBlocked);
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

  useEffect(() => {
    const startNfc = async () => {
      try {
        const supported = await NfcManager.isSupported();
        setIsSupported(supported);

        if (supported) {
          await NfcManager.start();
        }
      } catch {
        setIsSupported(false);
      }
    };

    startNfc();

    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const getTagLabel = (tag: TagEvent | null) => {
    if (!tag) {
      return 'Carte inconnue';
    }

    return tag.id || tag.type || 'Carte NFC lue';
  };

  const validatePayment = (tag: TagEvent | null) => {
    const value = Number.parseInt(amount, 10);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Erreur', 'Entre le montant !');
      return;
    }

    const tagLabel = getTagLabel(tag);

    if (nfcCardBlocked) {
      Alert.alert('Carte bloquée', 'Cette carte NFC est bloquée et ne peut pas être utilisée pour le paiement transport.');
      Speech.speak('Carte bloquée');
      return;
    }

    increaseBalance(value);
    addNotification({
      title: text.nfcAccepted,
      message: text.nfcMessage(value),
      amount: value,
      type: 'nfc',
    });
    addTrip({
      bus: params.bus || 'Bus non renseigné',
      route: params.trajet || 'Trajet non renseigné',
      amount: value,
      paymentType: 'nfc',
    });
    savePayment(value, 'nfc', undefined, {
      cardId: tagLabel,
      bus: params.bus,
      route: params.trajet,
    }).catch(() => {});
    setLastTag(tagLabel);
    setAcceptedAmount(value);
    setAmount('');
    Speech.speak('Paiement accepté');
  };

  const readNfc = async () => {
    if (isSupported === false) {
      Alert.alert('NFC indisponible', "Ce téléphone ne supporte pas NFC ou l'app n'a pas le module natif.");
      return;
    }

    const value = Number.parseInt(amount, 10);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Erreur', 'Entre le montant !');
      return;
    }

    try {
      setIsReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez la carte NFC du client',
      });
      const tag = await NfcManager.getTag();
      validatePayment(tag);
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReading(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
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
        <Text style={styles.acceptedSubtitle}>Carte NFC validée</Text>

        {!!lastTag && <Text style={styles.acceptedTag}>Carte : {lastTag}</Text>}
        <Text style={styles.acceptedReturnText}>Retour automatique...</Text>
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

      <Text style={styles.title}>Paiement NFC</Text>
      <Text style={styles.balance}>Solde : {balance} FC</Text>

      <View style={styles.nfcBox}>
        <MaterialCommunityIcons name="contactless-payment" size={78} color="#09D457" />
        <Text style={styles.nfcTitle}>
          {isReading ? 'Approchez la carte du client' : 'Prêt à lire la carte NFC'}
        </Text>
        <Text style={styles.nfcSubtitle}>
          Le chauffeur choisit le montant, puis le client approche sa carte ou son téléphone NFC.
        </Text>
      </View>

      <View style={styles.inputBox}>
        <MaterialCommunityIcons name="cash" size={28} color="#87909F" style={styles.inputIcon} />
        <TextInput
          placeholder="Montant"
          placeholderTextColor="#87909F"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={readNfc} disabled={isReading}>
        <MaterialCommunityIcons name="nfc" size={26} color="white" />
        <Text style={styles.text}>{isReading ? 'Lecture...' : 'Lire carte NFC'}</Text>
      </TouchableOpacity>

      {!!lastTag && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={24} color="#09D457" />
          <Text style={styles.successText}>Carte lue : {lastTag}</Text>
        </View>
      )}

      {isSupported === false && (
        <Text style={styles.warning}>
          NFC demande un build natif/dev client. Expo Go peut ne pas lire le NFC.
        </Text>
      )}
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
  nfcBox: {
    width: '100%',
    minHeight: 210,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    backgroundColor: '#082A82',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    marginBottom: 20,
  },
  nfcTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },
  nfcSubtitle: {
    color: '#A9D9FF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
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
    minHeight: 62,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  successText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  warning: {
    color: '#A9D9FF',
    textAlign: 'center',
    marginTop: 18,
    fontWeight: '700',
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
    marginBottom: 18,
  },
  acceptedTag: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 36,
  },
  acceptedReturnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NfcManager, { NfcTech, type TagEvent } from 'react-native-nfc-manager';
import { TakoLogo } from '../components/tako-logo';
import { saveNfcCard } from '../services/api';
import { useStore } from './store';

const NFC_CARD_ID_KEY = 'tako:nfcCardId';

export default function ClientNfcActivation() {
  const router = useRouter();
  const [isReading, setIsReading] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  const nfcCardId = useStore((state: any) => state.nfcCardId);
  const currentUser = useStore((state: any) => state.currentUser);
  const setNfcCardId = useStore((state: any) => state.setNfcCardId);

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
    AsyncStorage.getItem(NFC_CARD_ID_KEY).then((storedCardId) => {
      if (storedCardId) {
        setNfcCardId(storedCardId);
      }
    }).catch(() => {});

    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const getCardId = (tag: TagEvent | null) => {
    if (!tag) {
      return '';
    }

    return tag.id || tag.type || '';
  };

  const activateCard = async () => {
    if (isSupported === false) {
      Alert.alert('NFC indisponible', "Ce téléphone ne supporte pas NFC ou l'app n'a pas le module natif.");
      return;
    }

    try {
      setIsReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez votre carte NFC',
      });
      const tag = await NfcManager.getTag();
      const cardId = getCardId(tag);

      if (!cardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant de cette carte.");
        return;
      }

      setNfcCardId(cardId);
      await AsyncStorage.setItem(NFC_CARD_ID_KEY, cardId);
      await saveNfcCard(currentUser.id, cardId);
      Alert.alert('Carte activée', `Carte NFC enregistrée : ${cardId}`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReading(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#061F68" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Activer carte NFC</Text>

      <View style={styles.nfcBox}>
        <MaterialCommunityIcons name="card-account-details-outline" size={78} color="#09D457" />
        <Text style={styles.nfcTitle}>
          {isReading ? 'Approchez votre carte' : 'Enregistrer votre carte'}
        </Text>
        <Text style={styles.nfcSubtitle}>
          Cliquez sur le bouton, approchez la carte NFC, puis TaKo enregistrera son identifiant pour le paiement transport.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={activateCard} disabled={isReading}>
        <MaterialCommunityIcons name="nfc" size={26} color="white" />
        <Text style={styles.text}>{isReading ? 'Lecture...' : 'Lire ma carte NFC'}</Text>
      </TouchableOpacity>

      <View style={styles.statusBox}>
        <MaterialCommunityIcons
          name={nfcCardId ? 'credit-card-check' : 'credit-card-outline'}
          size={25}
          color="#09D457"
        />
        <Text style={styles.statusText}>
          {nfcCardId ? `Carte enregistrée : ${nfcCardId}` : 'Aucune carte enregistrée'}
        </Text>
      </View>

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
  logo: {
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0,
  },
  logoWhite: {
    color: '#061F68',
  },
  logoBlue: {
    color: '#129CFF',
  },
  title: {
    color: '#061F68',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 24,
  },
  nfcBox: {
    width: '100%',
    minHeight: 230,
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
  statusBox: {
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
  statusText: {
    color: '#061F68',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  warning: {
    color: '#52627A',
    textAlign: 'center',
    marginTop: 18,
    fontWeight: '700',
  },
});

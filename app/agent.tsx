import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import NfcManager, { NfcTech, type TagEvent } from 'react-native-nfc-manager';
import { TakoLogo } from '../components/tako-logo';
import { createInternalRecharge } from '../services/api';
import { useStore } from './store';

const TAKO_BLUE = '#061F68';
const TAKO_ACTION = '#139DFF';
const TAKO_GREEN = '#09D457';

export default function Agent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const currentUser = useStore((state: any) => state.currentUser);
  const [clientId, setClientId] = useState(String(params.clientId || ''));
  const [amount, setAmount] = useState('');
  const [cardId, setCardId] = useState('');
  const [isReadingNfc, setIsReadingNfc] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.clientId) {
      setClientId(String(params.clientId));
      setCardId('');
    }
  }, [params.clientId]);

  useEffect(() => {
    NfcManager.isSupported()
      .then((supported) => {
        if (supported) {
          return NfcManager.start();
        }
        return null;
      })
      .catch(() => {});

    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const getCardId = (tag: TagEvent | null) => tag?.id || tag?.type || '';

  const readNfcCard = async () => {
    try {
      setIsReadingNfc(true);
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approchez la carte du passager',
      });
      const tag = await NfcManager.getTag();
      const nextCardId = getCardId(tag);

      if (!nextCardId) {
        Alert.alert('Carte non reconnue', "Impossible de lire l'identifiant NFC.");
        return;
      }

      setCardId(nextCardId);
      setClientId('');
      Alert.alert('Carte lue', 'Ajoutez le montant puis confirmez la recharge.');
    } catch {
      Alert.alert('Lecture annulée', 'Aucune carte NFC lue.');
    } finally {
      setIsReadingNfc(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const confirmRecharge = async () => {
    const value = Number.parseInt(amount, 10);
    const cleanClientId = clientId.trim();
    const cleanCardId = cardId.trim();

    if ((!cleanClientId && !cleanCardId) || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Informations obligatoires', 'Scannez le QR, lisez la carte NFC ou entrez l’ID, puis ajoutez le montant.');
      return;
    }

    try {
      setLoading(true);
      const result = await createInternalRecharge({
        clientId: cleanClientId || undefined,
        cardId: cleanCardId || undefined,
        amount: value,
        agentId: currentUser?.id || 'AGENT',
      });

      setAmount('');
      setCardId('');
      setClientId(result?.client?.id || cleanClientId);
      Alert.alert('Recharge confirmée', `${value} FC ajouté au compte ${result?.client?.id || cleanClientId}.`);
    } catch (error) {
      Alert.alert('Recharge impossible', error instanceof Error ? error.message : 'Vérifiez le compte ou la carte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TakoLogo />
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.85} onPress={() => router.replace('/login' as any)}>
            <Ionicons name="log-out-outline" size={21} color={TAKO_BLUE} />
          </TouchableOpacity>
        </View>

        <Text style={styles.kicker}>Mode agent</Text>
        <Text style={styles.title}>Recharge interne</Text>
        <Text style={styles.subtitle}>Scannez le QR, lisez la carte NFC ou saisissez l’ID du passager.</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.scanButton}
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/internal-recharge-scan',
                params: { returnTo: 'agent' },
              } as any)
            }>
            <Ionicons name="qr-code-outline" size={24} color="white" />
            <Text style={styles.scanButtonText}>Scanner QR client</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nfcButton} activeOpacity={0.9} disabled={isReadingNfc} onPress={readNfcCard}>
            {isReadingNfc ? <ActivityIndicator color={TAKO_BLUE} /> : <MaterialCommunityIcons name="nfc" size={25} color={TAKO_BLUE} />}
            <Text style={styles.nfcButtonText}>{isReadingNfc ? 'Lecture NFC...' : 'Lire carte NFC'}</Text>
          </TouchableOpacity>

          {!!cardId && (
            <View style={styles.cardReadBox}>
              <MaterialCommunityIcons name="credit-card-check" size={21} color={TAKO_GREEN} />
              <Text style={styles.cardReadText}>Carte lue : {cardId}</Text>
            </View>
          )}

          <View style={styles.inputBox}>
            <Ionicons name="finger-print" size={24} color="#7B8798" />
            <TextInput
              placeholder="ID du passager"
              placeholderTextColor="#8B95A5"
              value={clientId}
              onChangeText={(value) => {
                setClientId(value);
                if (value.trim()) {
                  setCardId('');
                }
              }}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.inputBox}>
            <Text style={styles.currency}>FC</Text>
            <TextInput
              placeholder="Montant"
              placeholderTextColor="#8B95A5"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.confirmButton} activeOpacity={0.9} disabled={loading} onPress={confirmRecharge}>
            {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={24} color="white" />}
            <Text style={styles.confirmButtonText}>Confirmer la recharge</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 54,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  kicker: {
    color: TAKO_ACTION,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TAKO_BLUE,
    fontSize: 31,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    padding: 18,
  },
  scanButton: {
    height: 62,
    borderRadius: 12,
    backgroundColor: TAKO_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  nfcButton: {
    height: 60,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#BBDFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  nfcButtonText: {
    color: TAKO_BLUE,
    fontSize: 17,
    fontWeight: '900',
  },
  cardReadBox: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#E9FFF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  cardReadText: {
    flex: 1,
    color: '#087B35',
    fontSize: 13,
    fontWeight: '900',
  },
  inputBox: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#F4F5F9',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  currency: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 18,
    fontWeight: '800',
  },
  confirmButton: {
    height: 66,
    borderRadius: 14,
    backgroundColor: TAKO_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
});

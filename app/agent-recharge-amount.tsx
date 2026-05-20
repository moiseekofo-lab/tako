import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { createInternalRecharge } from '../services/api';
import { useStore } from './store';

const TAKO_BLUE = '#061F68';

export default function AgentRechargeAmount() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; cardId?: string; source?: string }>();
  const currentUser = useStore((state: any) => state.currentUser);
  const setBalance = useStore((state: any) => state.setBalance);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const clientId = String(params.clientId || '').trim();
  const cardId = String(params.cardId || '').trim();
  const source = String(params.source || '');
  const label = cardId ? 'Carte NFC lue' : source === 'qr' ? 'QR code scanné' : 'Passager confirmé';
  const reference = cardId || clientId;

  const confirmRecharge = async () => {
    const value = Number.parseInt(amount, 10);

    if (!reference || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Informations obligatoires', 'Vérifiez le passager et ajoutez le montant.');
      return;
    }

    try {
      setLoading(true);
      const result = await createInternalRecharge({
        clientId: clientId || undefined,
        cardId: cardId || undefined,
        amount: value,
        agentId: currentUser?.id || 'AGENT',
      });

      if (result?.agent?.balance !== undefined) {
        setBalance(Number(result.agent.balance || 0));
        setCurrentUser(result.agent);
      }

      Alert.alert('Crédit envoyé', `${value} FC ajouté au compte ${result?.client?.id || clientId || 'client'}.`, [
        {
          text: 'OK',
          onPress: () => router.replace('/agent' as any),
        },
      ]);
    } catch (error) {
      Alert.alert('Recharge impossible', error instanceof Error ? error.message : 'Vérifiez le compte ou la carte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} color={TAKO_BLUE} />
        </TouchableOpacity>
        <TakoLogo />
      </View>

      <View style={styles.content}>
        <Text style={styles.kicker}>Recharge interne</Text>
        <Text style={styles.title}>Montant</Text>
        <Text style={styles.subtitle}>Ajoutez le montant reçu en espèces, puis confirmez la recharge du compte.</Text>

        <View style={styles.summary}>
          <Ionicons name={cardId ? 'card-outline' : 'person-circle-outline'} size={25} color={TAKO_BLUE} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>{label}</Text>
            <Text style={styles.summaryValue}>{reference || 'Aucun passager'}</Text>
          </View>
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
            autoFocus
          />
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.9} disabled={loading} onPress={confirmRecharge}>
          {loading ? <ActivityIndicator color="white" /> : <Ionicons name="checkmark-circle" size={23} color="white" />}
          <Text style={styles.buttonText}>Confirmer la recharge</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 44,
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
  kicker: {
    color: '#139DFF',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TAKO_BLUE,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 10,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 24,
  },
  summary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    backgroundColor: '#F7FAFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    color: TAKO_BLUE,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryValue: {
    color: '#6A7486',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  inputBox: {
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: '#E0E8F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
    marginBottom: 18,
  },
  currency: {
    color: TAKO_BLUE,
    fontSize: 18,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
  },
  button: {
    minHeight: 62,
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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';

const TAKO_BLUE = '#061F68';

export default function AgentRechargeId() {
  const router = useRouter();
  const [clientId, setClientId] = useState('');

  const confirmClient = () => {
    const cleanClientId = clientId.trim();
    if (!cleanClientId) {
      return;
    }

    router.push({
      pathname: '/agent-recharge-amount',
      params: { clientId: cleanClientId, source: 'id' },
    } as any);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.replace('/agent' as any)}>
          <Ionicons name="chevron-back" size={25} color={TAKO_BLUE} />
        </TouchableOpacity>
        <TakoLogo />
      </View>

      <View style={styles.content}>
        <Text style={styles.kicker}>Recharge interne</Text>
        <Text style={styles.title}>ID du passager</Text>
        <Text style={styles.subtitle}>Entrez l’ID numérique du client, puis confirmez avant d’ajouter le montant.</Text>

        <View style={styles.inputBox}>
          <Ionicons name="person-circle-outline" size={25} color="#7B8798" />
          <TextInput
            placeholder="ID du passager"
            placeholderTextColor="#8B95A5"
            value={clientId}
            onChangeText={setClientId}
            keyboardType="number-pad"
            style={styles.input}
            autoFocus
          />
        </View>

        <TouchableOpacity style={[styles.button, !clientId.trim() && styles.buttonDisabled]} activeOpacity={0.9} disabled={!clientId.trim()} onPress={confirmClient}>
          <Ionicons name="checkmark-circle" size={23} color="white" />
          <Text style={styles.buttonText}>Confirmer le passager</Text>
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
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  subtitle: {
    color: '#5C667A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 28,
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
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
});

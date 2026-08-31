import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';

const providers = [
  { name: 'M-Pesa', logo: require('../assets/images/mpesa-logo.png') },
  { name: 'Airtel Money', logo: require('../assets/images/airtel-money-logo.png') },
  { name: 'Orange Money', logo: require('../assets/images/orange-money-logo.png') },
];

export default function DriverWithdraw() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const balance = useStore((state: any) => state.balance);
  const setBalance = useStore((state: any) => state.setBalance);
  const currentUser = useStore((state: any) => state.currentUser);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('M-Pesa');
  const [loading, setLoading] = useState(false);
  const hasPrefilledWallet = useRef(false);

  useEffect(() => {
    if (!hasPrefilledWallet.current && currentUser?.phone) {
      hasPrefilledWallet.current = true;
      setWalletId(String(currentUser.phone));
    }
  }, [currentUser?.phone]);

  const requestWithdrawal = () => {
    const value = Number.parseInt(amount.replace(/\s/g, ''), 10);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Montant incorrect', 'Entrez le montant à retirer.');
      return;
    }
    if (value > Number(balance || 0)) {
      Alert.alert('Solde insuffisant', 'Le montant demandé dépasse votre solde disponible.');
      return;
    }
    if (!walletId.trim()) {
      Alert.alert('Numéro requis', 'Entrez votre numéro Mobile Money.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setBalance(Number(balance || 0) - value);
      setLoading(false);
      Alert.alert('Retrait demandé', `${value.toLocaleString('fr-FR')} FC seront envoyés par ${selectedProvider}.`, [
        { text: 'OK', onPress: () => router.replace({ pathname: '/home', params: { role: 'chauffeur' } } as any) },
      ]);
    }, 700);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#061F68" /></TouchableOpacity>
          <Text style={styles.title}>Retirer</Text><View style={styles.placeholder} />
        </View>

        <Text style={styles.balance}>Solde disponible : {Number(balance || 0).toLocaleString('fr-FR')} FC</Text>
        <Text style={styles.label}>Montant à retirer</Text>
        <View style={styles.inputBox}>
          <View style={styles.currency}><Text style={styles.currencyText}>FC</Text><Ionicons name="chevron-down" size={20} color="#59658A" /></View>
          <View style={styles.divider} />
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="10 000" placeholderTextColor="#87909F" />
        </View>

        <Text style={styles.label}>Numéro Mobile Money</Text>
        <View style={styles.inputBox}>
          <MaterialCommunityIcons name="cellphone" size={24} color="#061F68" />
          <TextInput style={styles.input} value={walletId} onChangeText={setWalletId} keyboardType="phone-pad" placeholder="Numéro mobile money" placeholderTextColor="#87909F" />
          <Ionicons name="person-outline" size={25} color="#061F68" />
        </View>

        <Text style={styles.label}>Choisissez le service de retrait</Text>
        <View style={styles.providers}>
          {providers.map((provider, index) => (
            <TouchableOpacity key={provider.name} style={[styles.provider, index === providers.length - 1 && styles.providerLast]} onPress={() => setSelectedProvider(provider.name)}>
              <View style={[styles.radio, selectedProvider === provider.name && styles.radioSelected]} />
              <Image source={provider.logo} style={styles.logo} resizeMode="contain" />
              <Text style={styles.providerText}>{provider.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.disabled]} disabled={loading} onPress={requestWithdrawal}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Continuer</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  content: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 36, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  back: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#139DFF', alignItems: 'center', justifyContent: 'center' },
  placeholder: { width: 46 },
  title: { color: '#061F68', fontSize: 23, fontWeight: '900' },
  balance: { color: '#52627A', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  label: { color: '#061F68', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  inputBox: { height: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D8DDEA', paddingHorizontal: 13, marginBottom: 20 },
  currency: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currencyText: { color: '#061F68', fontSize: 17, fontWeight: '900' },
  divider: { width: 1, height: 34, backgroundColor: '#D8DDEA' },
  input: { flex: 1, color: '#202836', fontSize: 17, fontWeight: '700' },
  providers: { borderWidth: 1, borderColor: '#D8DDEA', borderRadius: 12, paddingHorizontal: 12, marginBottom: 20 },
  provider: { height: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#E6E9F0' },
  providerLast: { borderBottomWidth: 0 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#061F68' },
  radioSelected: { borderColor: '#0877EA', borderWidth: 7 },
  logo: { width: 54, height: 44 },
  providerText: { color: '#061F68', fontSize: 16, fontWeight: '900' },
  button: { height: 60, borderRadius: 12, backgroundColor: '#0877EA', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 17, fontWeight: '900' },
});

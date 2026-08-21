import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { initiateMobileMoneyRecharge } from '../services/api';
import { translations, type Language } from './i18n';
import { useStore } from './store';

const providers = [
  { name: 'M-Pesa', logo: require('../assets/images/mpesa-logo.png') },
  { name: 'Airtel Money', logo: require('../assets/images/airtel-money-logo.png') },
  { name: 'Orange Money', logo: require('../assets/images/orange-money-logo.png') },
];

export default function Recharge() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('M-Pesa');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasPrefilledWallet = useRef(false);
  const increaseBalance = useStore((state: any) => state.increaseBalance);
  const addNotification = useStore((state: any) => state.addNotification);
  const language = useStore((state: any) => state.language) as Language;
  const currentUser = useStore((state: any) => state.currentUser);
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const text = translations[language];

  useEffect(() => {
    if (!hasPrefilledWallet.current && currentUser?.phone) {
      hasPrefilledWallet.current = true;
      setWalletId(String(currentUser.phone));
    }
  }, [currentUser?.phone]);

  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      router.replace('/login' as any);
    }
  }, [isAuthenticated, router]);

  const handleInternalRecharge = () => {
    router.push({
      pathname: '/qr',
      params: { mode: 'recharge' },
    } as any);
  };

  const handleRecharge = async (provider: string) => {
    const value = Number.parseInt(amount, 10);
    const cleanWalletId = walletId.trim();

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert(text.error, text.enterRechargeAmount);
      return;
    }

    if (!cleanWalletId) {
      Alert.alert(text.error, 'Ajoutez le numéro mobile money à recharger.');
      return;
    }

    try {
      setLoadingProvider(provider);
      const result = await initiateMobileMoneyRecharge({
        clientId: currentUser?.id,
        amount: value,
        provider,
        walletId: cleanWalletId,
        customerFullName: currentUser?.fullName,
        customerEmailAddress: currentUser?.email,
      });

      if (result?.recharge) {
        addNotification({
          title: 'Recharge demandée',
          message: `Confirmez la demande ${provider} sur votre téléphone.`,
          amount: value,
          type: 'recharge',
        });
        setAmount('');
        setWalletId('');
        Alert.alert('Recharge envoyée', `Confirmez la demande ${provider} sur votre téléphone.`, [
          {
            text: 'OK',
            onPress: () =>
              router.replace({
                pathname: '/home',
                params: { role: 'passager' },
              } as any),
          },
        ]);
        return;
      }

      increaseBalance(value);
      addNotification({
        title: text.rechargeSuccess,
        message: text.rechargeMessage(value, provider),
        amount: value,
        type: 'recharge',
      });
      setAmount('');
      setWalletId('');
      Alert.alert(text.rechargeSuccess, text.rechargeMessage(value, provider), [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/home',
              params: { role: 'passager' },
            } as any),
        },
      ]);
    } catch (error) {
      Alert.alert(text.error, error instanceof Error ? error.message : 'Recharge impossible pour le moment.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const refreshPage = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 750);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshPage} tintColor="#061F68" colors={['#061F68']} />
        }>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#061F68" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{text.recharge}</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Montant à recharger</Text>
          <View style={styles.inputBox}>
            <View style={styles.currencyBox}>
              <Text style={styles.currency}>FC</Text>
              <Ionicons name="chevron-down" size={20} color="#59658A" />
            </View>
            <View style={styles.inputDivider} />
            <TextInput
              placeholder="10 000"
              placeholderTextColor="#87909F"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.fieldLabel}>Numéro Mobile Money</Text>
          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="cellphone" size={24} color="#061F68" />
            <TextInput
              placeholder="Numéro mobile money"
              placeholderTextColor="#87909F"
              keyboardType="phone-pad"
              value={walletId}
              onChangeText={setWalletId}
              style={styles.input}
              returnKeyType="done"
            />
            <Ionicons name="person-outline" size={25} color="#061F68" />
          </View>

          <Text style={styles.fieldLabel}>Choisissez le service de paiement</Text>
          <View style={styles.providerList}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.name}
                style={styles.providerRow}
                activeOpacity={0.88}
                disabled={Boolean(loadingProvider)}
                onPress={() => setSelectedProvider(provider.name)}>
                <View style={[styles.radio, selectedProvider === provider.name && styles.radioSelected]}>
                  {selectedProvider === provider.name ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.providerLogo}>
                  <Image source={provider.logo} style={styles.providerLogoImage} resizeMode="contain" />
                </View>
                <Text style={styles.providerText}>{provider.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueButton, loadingProvider && styles.providerButtonDisabled]}
            activeOpacity={0.88}
            disabled={Boolean(loadingProvider)}
            onPress={() => handleRecharge(selectedProvider)}>
            {loadingProvider ? <ActivityIndicator color="white" /> : <Text style={styles.continueText}>Continuer</Text>}
          </TouchableOpacity>

          <Text style={styles.orText}>OU</Text>

          <View style={styles.agentCard}>
            <TouchableOpacity style={styles.agentTopRow} activeOpacity={0.88} onPress={handleInternalRecharge}>
              <View style={styles.internalIcon}>
                <MaterialCommunityIcons name="account-plus" size={29} color="#0877EA" />
                <MaterialCommunityIcons name="qrcode" size={18} color="#061F68" />
              </View>
              <View style={styles.internalTextBox}>
                <Text style={styles.internalTitle}>Recharger auprès d’un agent</Text>
                <Text style={styles.internalHint}>Générez votre QR code et présentez-le à un agent TaKo.</Text>
              </View>
              <Ionicons name="chevron-forward" size={28} color="#061F68" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrButton} activeOpacity={0.88} onPress={handleInternalRecharge}>
              <MaterialCommunityIcons name="qrcode" size={25} color="#0877EA" />
              <Text style={styles.qrButtonText}>Afficher mon QR code</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 30,
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    color: '#061F68',
    fontSize: 23,
    fontWeight: '900',
  },
  card: {
    flexGrow: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'white',
    padding: 12,
    shadowColor: '#B7C7E8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  fieldLabel: {
    color: '#061F68',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 3,
  },
  inputBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D8DDEA',
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  currencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#D8DDEA',
  },
  currency: {
    color: '#061F68',
    fontSize: 17,
    fontWeight: '900',
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 17,
    fontWeight: '700',
  },
  providerList: {
    borderWidth: 1,
    borderColor: '#D8DDEA',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  providerRow: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E9F0',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#061F68',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#0877EA',
    borderWidth: 6,
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  providerLogo: {
    width: 52,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerLogoImage: {
    width: 48,
    height: 38,
  },
  continueButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0877EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  orText: {
    color: '#666C80',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 9,
  },
  agentCard: {
    borderRadius: 14,
    backgroundColor: '#F4F8FF',
    padding: 9,
  },
  agentTopRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  internalIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  internalTextBox: {
    flex: 1,
  },
  internalTitle: {
    color: '#061F68',
    fontSize: 13,
    fontWeight: '900',
  },
  internalHint: {
    color: '#667085',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  qrButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0877EA',
    backgroundColor: 'white',
    marginTop: 6,
  },
  qrButtonText: {
    color: '#0877EA',
    fontSize: 13,
    fontWeight: '900',
  },
  providerButtonDisabled: {
    opacity: 0.72,
  },
  providerText: {
    color: '#061F68',
    fontSize: 15,
    fontWeight: '900',
  },
});

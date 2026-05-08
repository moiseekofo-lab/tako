import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const providers = ['M-Pesa', 'Airtel Money', 'Orange Money'];

export default function Recharge() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const increaseBalance = useStore((state: any) => state.increaseBalance);
  const addNotification = useStore((state: any) => state.addNotification);
  const language = useStore((state: any) => state.language) as Language;
  const currentUser = useStore((state: any) => state.currentUser);
  const text = translations[language];

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
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="cash-plus" size={42} color="white" />
          </View>

          <Text style={styles.title}>{text.rechargeAccount}</Text>
          <Text style={styles.subtitle}>{text.chooseRecharge}</Text>

          <View style={styles.inputBox}>
            <Text style={styles.currency}>FC</Text>
            <TextInput
              placeholder={text.amount}
              placeholderTextColor="#87909F"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

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
          </View>

          <View style={styles.providerGrid}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider}
                style={[styles.providerButton, loadingProvider ? styles.providerButtonDisabled : null]}
                activeOpacity={0.88}
                disabled={Boolean(loadingProvider)}
                onPress={() => handleRecharge(provider)}>
                {loadingProvider === provider ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <MaterialCommunityIcons name="cellphone" size={27} color="white" />
                )}
                <Text style={styles.providerText}>{provider}</Text>
              </TouchableOpacity>
            ))}
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
    paddingHorizontal: 28,
    paddingTop: 58,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 48,
  },
  headerTitle: {
    color: '#061F68',
    fontSize: 27,
    fontWeight: '900',
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'white',
    padding: 24,
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#09D457',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#061F68',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#667085',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 28,
  },
  inputBox: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#F4F5F9',
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  currency: {
    color: '#061F68',
    fontSize: 20,
    fontWeight: '900',
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 22,
    fontWeight: '700',
  },
  providerGrid: {
    marginTop: 10,
    gap: 12,
  },
  providerButton: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#139DFF',
  },
  providerButtonDisabled: {
    opacity: 0.72,
  },
  providerText: {
    color: 'white',
    fontSize: 19,
    fontWeight: '900',
  },
});

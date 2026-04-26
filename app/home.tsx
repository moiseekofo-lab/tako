import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { TakoLogo } from '../components/tako-logo';
import { useStore } from './store';

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const balance = useStore((state: any) => state.balance);
  const nfcCardId = useStore((state: any) => state.nfcCardId);
  const increaseBalance = useStore((state: any) => state.increaseBalance);

  const role = params.role === 'passager' ? 'passager' : 'chauffeur';
  const providers = ['M-Pesa', 'Airtel Money', 'Orange Money'];

  const handleRecharge = (provider: string) => {
    const value = Number.parseInt(rechargeAmount, 10);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Erreur', 'Entre le montant à recharger');
      return;
    }

    increaseBalance(value);
    setRechargeAmount('');
    Alert.alert('Recharge réussie', `${value} FC ajouté via ${provider}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.logoutIcon} onPress={() => router.replace('/login')}>
          <Ionicons name="log-out-outline" size={25} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balance}>{balance} FC</Text>
      </View>

      {role === 'chauffeur' && (
        <View style={styles.section}>
          <Text style={styles.title}>Paiement chauffeur</Text>

          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="cash" size={28} color="#87909F" style={styles.inputIcon} />
            <TextInput
              placeholder="Montant du trajet"
              placeholderTextColor="#87909F"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={() => {
              const value = Number.parseInt(paymentAmount, 10);

              if (!Number.isFinite(value) || value <= 0) {
                Alert.alert('Erreur', 'Entre le montant du trajet');
                return;
              }

              router.push({
                pathname: '/scan',
                params: { montant: paymentAmount },
              } as any);
            }}>
            <Ionicons name="scan" size={25} color="white" />
            <Text style={styles.text}>Scanner QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.nfcButton]}
            activeOpacity={0.9}
            onPress={() => {
              const value = Number.parseInt(paymentAmount, 10);

              if (!Number.isFinite(value) || value <= 0) {
                Alert.alert('Erreur', 'Entre le montant du trajet');
                return;
              }

              router.push({
                pathname: '/nfc',
                params: { montant: paymentAmount },
              } as any);
            }}>
            <MaterialCommunityIcons name="contactless-payment" size={27} color="white" />
            <Text style={styles.text}>Paiement NFC</Text>
          </TouchableOpacity>

          <View style={styles.modeBox}>
            <MaterialCommunityIcons name="steering" size={28} color="#09D457" />
            <Text style={styles.modeText}>Mode Chauffeur actif</Text>
          </View>
        </View>
      )}

      {role === 'passager' && (
        <View style={styles.section}>
          <Text style={styles.title}>Espace client</Text>
          <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={() => router.push('/qr')}>
            <Ionicons name="qr-code" size={25} color="white" />
            <Text style={styles.text}>Mon QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.nfcButton]}
            activeOpacity={0.9}
            onPress={() => router.push('/client-nfc' as any)}>
            <MaterialCommunityIcons name="card-account-details-outline" size={27} color="white" />
            <Text style={styles.text}>Activer carte NFC</Text>
          </TouchableOpacity>

          <View style={styles.cardStatusBox}>
            <MaterialCommunityIcons
              name={nfcCardId ? 'credit-card-check' : 'credit-card-outline'}
              size={25}
              color="#09D457"
            />
            <Text style={styles.cardStatusText}>
              {nfcCardId ? `Carte NFC active : ${nfcCardId}` : 'Aucune carte NFC activée'}
            </Text>
          </View>

          <View style={styles.rechargeBox}>
            <Text style={styles.rechargeTitle}>Recharger</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="cash-plus" size={28} color="#87909F" style={styles.inputIcon} />
              <TextInput
                placeholder="Montant à recharger"
                placeholderTextColor="#87909F"
                keyboardType="numeric"
                value={rechargeAmount}
                onChangeText={setRechargeAmount}
                style={styles.input}
              />
            </View>

            <View style={styles.providerGrid}>
              {providers.map((provider) => (
                <TouchableOpacity
                  key={provider}
                  style={styles.providerBtn}
                  activeOpacity={0.85}
                  onPress={() => handleRecharge(provider)}>
                  <MaterialCommunityIcons name="cellphone" size={22} color="white" />
                  <Text style={styles.providerText}>{provider}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.modeBox}>
            <Ionicons name="person" size={26} color="#09D457" />
            <Text style={styles.modeText}>Mode Client actif</Text>
          </View>
        </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 42,
  },
  logo: {
    fontSize: 50,
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
  logoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceBox: {
    backgroundColor: '#082A82',
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    padding: 24,
    marginBottom: 36,
  },
  balanceLabel: {
    color: '#A9D9FF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  balance: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
  },
  section: {
    width: '100%',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
  },
  button: {
    height: 78,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#09D457',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcButton: {
    marginTop: 14,
    backgroundColor: '#139DFF',
  },
  cardStatusBox: {
    minHeight: 62,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cardStatusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  rechargeBox: {
    marginTop: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    backgroundColor: '#082A82',
  },
  rechargeTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputBox: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 18,
    fontWeight: '600',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerBtn: {
    width: '48%',
    minHeight: 64,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  providerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  modeBox: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    marginTop: 22,
  },
  modeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
});

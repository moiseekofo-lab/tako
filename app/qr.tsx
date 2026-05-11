import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { TakoLogo } from '../components/tako-logo';
import { translations, type Language } from './i18n';
import { useStore } from './store';

export default function QR() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const language = useStore((state: any) => state.language) as Language;
  const currentUser = useStore((state: any) => state.currentUser);
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const text = translations[language];
  const userId = currentUser?.id || '1000000001';
  const isInternalRecharge = params.mode === 'recharge';

  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      router.replace('/login' as any);
    }
  }, [isAuthenticated, router]);

  const data = JSON.stringify({
    type: isInternalRecharge ? 'internal_recharge' : 'transport_payment',
    clientId: userId,
    userId,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#061F68" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{isInternalRecharge ? text.internalRecharge : text.myQrCode}</Text>
      <Text style={styles.subtitle}>
        {isInternalRecharge ? text.internalRechargeQrHint : text.showQrDriver}
      </Text>

      <View style={styles.qrBox}>
        <QRCode value={data} size={220} />
      </View>

      <View style={styles.identityBox}>
        <Text style={styles.identityLabel}>{text.clientId}</Text>
        <Text style={styles.identity}>{userId}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 54,
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
    marginBottom: 8,
  },
  subtitle: {
    color: '#52627A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 34,
  },
  qrBox: {
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    padding: 28,
    marginBottom: 32,
  },
  identityBox: {
    width: '100%',
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    backgroundColor: '#082A82',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityLabel: {
    color: '#A9D9FF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  identity: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },
});

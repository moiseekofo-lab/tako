import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { TakoLogo } from '../components/tako-logo';
import { translations, type Language } from './i18n';
import { useStore } from './store';

export default function QR() {
  const router = useRouter();
  const language = useStore((state: any) => state.language) as Language;
  const text = translations[language];
  const userId = "user_123"; // simulé

  const data = JSON.stringify({
    userId,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{text.myQrCode}</Text>
      <Text style={styles.subtitle}>{text.showQrDriver}</Text>

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
    color: 'white',
  },
  logoBlue: {
    color: '#129CFF',
  },
  title: {
    color: 'white',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A9D9FF',
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

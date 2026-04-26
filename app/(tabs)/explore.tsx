import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { TakoLogo } from '../../components/tako-logo';

export default function Explore() {

  const userId = "client_12345";

  return (
    <View style={styles.container}>
      <TakoLogo size="large" />
      <Text style={styles.title}>Mon QR Code</Text>

      <View style={styles.qrBox}>
        <QRCode value={userId} size={220} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#061F68',
    paddingHorizontal: 30,
  },
  logo: {
    fontSize: 62,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0,
    marginBottom: 34,
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
    marginBottom: 28,
  },
  qrBox: {
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    padding: 28,
  },
});

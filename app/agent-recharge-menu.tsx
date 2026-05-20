import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';

const TAKO_BLUE = '#061F68';

export default function AgentRechargeMenu() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.replace('/agent' as any)}>
          <Ionicons name="chevron-back" size={25} color={TAKO_BLUE} />
        </TouchableOpacity>
        <TakoLogo />
      </View>

      <Text style={styles.kicker}>Mode agent</Text>
      <Text style={styles.title}>Recharger un client</Text>
      <Text style={styles.subtitle}>Choisissez la méthode. Chaque option ouvre une page séparée.</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.tile} activeOpacity={0.9} onPress={() => router.push('/agent-recharge-nfc' as any)}>
          <View style={styles.tileIcon}>
            <MaterialCommunityIcons name="nfc" size={30} color={TAKO_BLUE} />
          </View>
          <Text style={styles.tileTitle}>Carte NFC</Text>
          <Text style={styles.tileText}>Lire la carte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '/internal-recharge-scan',
              params: { returnTo: 'agent' },
            } as any)
          }>
          <View style={styles.tileIcon}>
            <Ionicons name="qr-code-outline" size={30} color={TAKO_BLUE} />
          </View>
          <Text style={styles.tileTitle}>QR code</Text>
          <Text style={styles.tileText}>Scanner</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tile} activeOpacity={0.9} onPress={() => router.push('/agent-recharge-id' as any)}>
          <View style={styles.tileIcon}>
            <Ionicons name="finger-print" size={30} color={TAKO_BLUE} />
          </View>
          <Text style={styles.tileTitle}>ID client</Text>
          <Text style={styles.tileText}>Saisir l’ID</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 42,
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
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47%',
    minHeight: 150,
    borderRadius: 18,
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
    borderColor: '#D7E0EF',
    padding: 14,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: TAKO_BLUE,
    fontSize: 17,
    fontWeight: '900',
  },
  tileText: {
    color: '#6A7486',
    fontSize: 13,
    fontWeight: '700',
  },
});

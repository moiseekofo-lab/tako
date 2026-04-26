import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';

export default function Admin() {

  let chauffeur = {
    name: "John",
    status: "pending"
  };

  const approve = () => {
    chauffeur.status = "active";
    alert("✅ Chauffeur validé !");
  };

  return (
    <View style={styles.container}>
      <TakoLogo size="large" />
      <View style={styles.glowLine} />

      <Text style={styles.title}>Admin Panel</Text>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={25} color="#09D457" />
          <Text style={styles.infoText}>Nom: {chauffeur.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="timer-sand" size={25} color="#09D457" />
          <Text style={styles.infoText}>Status: {chauffeur.status}</Text>
        </View>
      </View>

      {chauffeur.status === "pending" && (
        <TouchableOpacity style={styles.btn} activeOpacity={0.9} onPress={approve}>
          <Ionicons name="checkmark-circle" size={25} color="white" />
          <Text style={styles.text}>Valider Chauffeur</Text>
        </TouchableOpacity>
      )}
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
    fontSize: 70,
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
  glowLine: {
    width: '78%',
    height: 2,
    marginTop: 16,
    marginBottom: 48,
    backgroundColor: '#0AA4FF',
    shadowColor: '#0AA4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    alignSelf: 'flex-start',
    color: 'white',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 22,
  },
  infoBox: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    backgroundColor: '#082A82',
    padding: 22,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  infoText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },
  btn: {
    width: '100%',
    height: 78,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#09D457',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 21,
    fontWeight: '800',
  }
});

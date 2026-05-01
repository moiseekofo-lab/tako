import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { useStore } from './store';

export default function Admin() {
  const isWeb = Platform.OS === 'web';
  const currentUser = useStore((state: any) => state.currentUser);
  const trips = useStore((state: any) => state.trips);
  const notifications = useStore((state: any) => state.notifications);
  const balance = useStore((state: any) => state.balance);
  const [clientId, setClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  let chauffeur = {
    name: "John",
    status: "pending"
  };

  const approve = () => {
    chauffeur.status = "active";
    alert("✅ Chauffeur validé !");
  };

  const findClient = () => {
    if (clientId.trim().toUpperCase() !== currentUser.id.toUpperCase()) {
      setSelectedClient(null);
      Alert.alert('Client introuvable', 'Aucun compte client trouvé avec cet ID.');
      return;
    }

    setSelectedClient(currentUser);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, isWeb && styles.webContainer]} keyboardShouldPersistTaps="always">
      <View style={[styles.shell, isWeb && styles.webShell]}>
        <View style={styles.topBar}>
          <TakoLogo size={isWeb ? 'small' : 'login'} />
          <TouchableOpacity style={styles.logoutButton} onPress={() => {}}>
            <Ionicons name="shield-checkmark" size={24} color="white" />
            <Text style={styles.logoutText}>Privé travailleurs</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Compte administrateur</Text>

        <View style={isWeb ? styles.webGrid : undefined}>
      <View style={[styles.infoBox, isWeb && styles.gridBox]}>
        <Text style={styles.boxTitle}>Accès compte client</Text>
        <View style={styles.inputBox}>
          <Ionicons name="id-card-outline" size={25} color="#87909F" />
          <TextInput
            placeholder="Entrer ID client"
            placeholderTextColor="#87909F"
            value={clientId}
            onChangeText={setClientId}
            autoCapitalize="characters"
            style={styles.input}
          />
        </View>

        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.9} onPress={findClient}>
          <Ionicons name="search" size={24} color="white" />
          <Text style={styles.text}>Voir le compte client</Text>
        </TouchableOpacity>
      </View>

      {selectedClient && (
        <View style={[styles.infoBox, isWeb && styles.gridBox]}>
          <Text style={styles.boxTitle}>Compte client</Text>
          <View style={styles.infoRow}>
            <Ionicons name="finger-print" size={25} color="#09D457" />
            <Text style={styles.infoText}>ID: {selectedClient.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={25} color="#09D457" />
            <Text style={styles.infoText}>Nom: {selectedClient.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={25} color="#09D457" />
            <Text style={styles.infoText}>Email: {selectedClient.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={25} color="#09D457" />
            <Text style={styles.infoText}>Téléphone: {selectedClient.phone || 'Non renseigné'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={25} color="#09D457" />
            <Text style={styles.infoText}>Naissance: {selectedClient.birthDate || 'Non renseignée'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="wallet" size={25} color="#09D457" />
            <Text style={styles.infoText}>Solde: {balance} FC</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="bus" size={25} color="#09D457" />
            <Text style={styles.infoText}>Trajets: {trips.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="notifications" size={25} color="#09D457" />
            <Text style={styles.infoText}>Notifications: {notifications.length}</Text>
          </View>
          <Text style={styles.lockedText}>ID permanent : non modifiable, même par administrateur.</Text>
        </View>
      )}

      <View style={[styles.infoBox, isWeb && styles.gridBox]}>
        <Text style={styles.boxTitle}>Validation chauffeur</Text>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#061F68',
    paddingHorizontal: 30,
    paddingTop: 56,
    paddingBottom: 42,
  },
  webContainer: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 42,
  },
  shell: {
    width: '100%',
    alignItems: 'center',
  },
  webShell: {
    maxWidth: 1120,
    alignItems: 'stretch',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutButton: {
    minHeight: 46,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    paddingHorizontal: 14,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  webGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'flex-start',
  },
  gridBox: {
    width: '48%',
    minWidth: 420,
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
  boxTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
  },
  inputBox: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    backgroundColor: '#F4F5F9',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 18,
    fontWeight: '700',
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
  searchBtn: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#139DFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: '#A9D9FF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
  text: {
    color: 'white',
    fontSize: 21,
    fontWeight: '800',
  }
});

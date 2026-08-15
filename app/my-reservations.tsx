import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MyReservations() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={28} color="#061F68" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes réservations</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.emptyCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="ticket-outline" size={42} color="#0B55D5" />
        </View>
        <Text style={styles.emptyTitle}>Aucune réservation</Text>
        <Text style={styles.emptyText}>Vos billets de voyage réservés apparaîtront ici.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/home')}
          activeOpacity={0.85}>
          <Text style={styles.buttonText}>Retour à l’accueil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F8FF', paddingHorizontal: 22 },
  header: { height: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 48, height: 48, borderWidth: 1, borderColor: '#0B55D5', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { color: '#061F68', fontSize: 24, fontWeight: '800' },
  spacer: { width: 48 },
  emptyCard: { marginTop: 70, backgroundColor: '#fff', borderRadius: 22, padding: 30, alignItems: 'center', shadowColor: '#061F68', shadowOpacity: 0.1, shadowRadius: 18, elevation: 4 },
  iconCircle: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 22, color: '#061F68', fontSize: 22, fontWeight: '800' },
  emptyText: { marginTop: 10, color: '#6E778C', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: 28, minWidth: 210, backgroundColor: '#082B85', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 24, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

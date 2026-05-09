import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const sections = [
  {
    title: 'Conditions d’utilisation',
    items: [
      'TaKo permet aux clients d’utiliser un compte transport pour consulter leur solde, recharger leur compte et payer un trajet par QR code ou carte NFC.',
      'L’utilisateur doit fournir des informations exactes lors de la création du compte. L’ID client, le nom complet et la date de naissance sont des informations permanentes.',
      'Le client est responsable de la confidentialité de son mot de passe et de l’accès à son téléphone.',
      'Le chauffeur doit vérifier les informations du trajet, la plaque du bus et le montant avant de demander un paiement.',
      'Toute tentative de fraude, d’utilisation abusive ou de contournement du système peut entraîner la suspension du compte.',
    ],
  },
  {
    title: 'Paiements et recharges',
    items: [
      'Les paiements de transport peuvent être effectués par QR code ou par carte NFC activée dans l’application.',
      'Les recharges peuvent être effectuées via les moyens de paiement disponibles dans l’application, selon la disponibilité des opérateurs.',
      'Une transaction validée peut être enregistrée dans l’historique du compte client et utilisée pour le suivi administratif.',
      'En cas d’erreur de paiement ou de recharge, l’utilisateur doit contacter le support TaKo avec les détails de la transaction.',
    ],
  },
  {
    title: 'Confidentialité',
    items: [
      'TaKo collecte uniquement les informations nécessaires au fonctionnement du service: ID client, nom complet, email ou numéro, date de naissance, solde, historique de transactions et informations NFC si la carte est activée.',
      'Ces données servent à identifier le compte, sécuriser les paiements, afficher l’historique, envoyer des notifications et permettre l’assistance client.',
      'Les informations personnelles ne sont pas vendues à des tiers.',
      'Les travailleurs autorisés peuvent accéder aux données nécessaires uniquement pour l’assistance, la sécurité, le suivi des transactions et l’administration du service.',
      'L’utilisateur peut demander une correction des informations non modifiables auprès du centre d’appel TaKo.',
    ],
  },
  {
    title: 'Sécurité du compte',
    items: [
      'Le client doit signaler rapidement toute perte de téléphone, perte de carte NFC ou activité suspecte.',
      'La carte NFC peut être bloquée depuis l’application afin d’empêcher son utilisation pour le paiement du transport.',
      'TaKo peut renforcer les contrôles de sécurité lorsque cela est nécessaire pour protéger les comptes et les transactions.',
    ],
  },
];

export default function Privacy() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={29} color="#061F68" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conditions et confidentialité</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="shield-checkmark" size={38} color="#09D457" />
          <Text style={styles.heroTitle}>Vos données sont protégées</Text>
          <Text style={styles.heroText}>
            Ce document explique les règles d’utilisation de TaKo et la manière dont les informations des clients sont utilisées.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item} style={styles.itemRow}>
                <View style={styles.dot} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footerBox}>
          <Text style={styles.footerText}>
            Pour toute question ou demande liée à votre compte, contactez le centre d’appel TaKo.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    paddingTop: 54,
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  headerTitle: {
    flex: 1,
    color: '#061F68',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 42,
  },
  hero: {
    borderRadius: 18,
    backgroundColor: '#061F68',
    padding: 22,
    marginBottom: 18,
  },
  heroTitle: {
    color: 'white',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 8,
  },
  heroText: {
    color: '#D8E9FF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  section: {
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4EAF5',
  },
  sectionTitle: {
    color: '#061F68',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#139DFF',
    marginTop: 8,
  },
  itemText: {
    flex: 1,
    color: '#202836',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
  footerBox: {
    borderRadius: 14,
    backgroundColor: '#EAF5FF',
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFE4FF',
  },
  footerText: {
    color: '#061F68',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 23,
    textAlign: 'center',
  },
});

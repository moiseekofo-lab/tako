import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type PageMode = 'menu' | 'terms' | 'privacy';

const termsSections = [
  {
    title: 'Utilisation de TaKo',
    text:
      'TaKo permet aux clients d’utiliser un compte transport pour consulter leur solde, recharger leur compte et payer un trajet par QR code ou carte NFC.',
  },
  {
    title: 'Informations du compte',
    text:
      'L’utilisateur doit fournir des informations exactes lors de la création du compte. L’ID client, le nom complet et la date de naissance sont des informations permanentes.',
  },
  {
    title: 'Sécurité et responsabilité',
    text:
      'Le client est responsable de la confidentialité de son mot de passe et de l’accès à son téléphone. Toute utilisation abusive ou tentative de fraude peut entraîner la suspension du compte.',
  },
  {
    title: 'Paiement transport',
    text:
      'Le chauffeur doit vérifier le trajet, la plaque du bus et le montant avant de demander le paiement. Une transaction validée peut être enregistrée dans l’historique du client.',
  },
];

const privacySections = [
  {
    title: 'Données collectées',
    text:
      'TaKo collecte uniquement les informations nécessaires au fonctionnement du service: ID client, nom complet, email ou numéro, date de naissance, solde, historique de transactions et informations NFC si la carte est activée.',
  },
  {
    title: 'Utilisation des données',
    text:
      'Ces données servent à identifier le compte, sécuriser les paiements, afficher l’historique, envoyer des notifications et permettre l’assistance client.',
  },
  {
    title: 'Protection des informations',
    text:
      'Les informations personnelles ne sont pas vendues à des tiers. Les travailleurs autorisés peuvent accéder aux données nécessaires uniquement pour l’assistance, la sécurité et l’administration du service.',
  },
  {
    title: 'Correction des données',
    text:
      'L’utilisateur peut demander une correction des informations non modifiables auprès du centre d’appel TaKo.',
  },
];

export default function Privacy() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>('menu');
  const isMenu = mode === 'menu';
  const activeSections = mode === 'terms' ? termsSections : privacySections;

  const goBack = () => {
    if (!isMenu) {
      setMode('menu');
      return;
    }

    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.85} onPress={goBack}>
          <Ionicons name="chevron-back" size={34} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isMenu ? 'Confidentialité' : mode === 'terms' ? 'Conditions d’utilisation' : 'Politique de confidentialité'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isMenu ? (
          <>
            <Text style={styles.mainTitle}>Données protégées et confidentielles</Text>

            <TouchableOpacity style={styles.menuRow} activeOpacity={0.78} onPress={() => setMode('terms')}>
              <MaterialCommunityIcons name="format-list-numbered" size={32} color="#139DFF" />
              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>Conditions d’utilisation</Text>
                <Text style={styles.menuSubtitle}>Règles générales d’utilisation</Text>
              </View>
              <Ionicons name="chevron-forward" size={30} color="#A8A8A8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} activeOpacity={0.78} onPress={() => setMode('privacy')}>
              <MaterialCommunityIcons name="shield-key-outline" size={32} color="#139DFF" />
              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>Politique de confidentialité</Text>
                <Text style={styles.menuSubtitle}>Données respectées et sécurisées</Text>
              </View>
              <Ionicons name="chevron-forward" size={30} color="#A8A8A8" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.detailIntro}>
              {mode === 'terms'
                ? 'Ces conditions expliquent les règles principales pour utiliser TaKo.'
                : 'Cette politique explique comment TaKo protège et utilise les données personnelles.'}
            </Text>

            {activeSections.map((section) => (
              <View key={section.title} style={styles.detailSection}>
                <Text style={styles.detailTitle}>{section.title}</Text>
                <Text style={styles.detailText}>{section.text}</Text>
              </View>
            ))}

            <Text style={styles.footerText}>
              Pour toute question ou demande liée à votre compte, contactez le centre d’appel TaKo.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#061F68',
    paddingTop: 54,
  },
  header: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 31,
    fontWeight: '900',
    marginLeft: 14,
  },
  headerSpacer: {
    width: 34,
  },
  content: {
    flexGrow: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 46,
  },
  mainTitle: {
    color: '#111111',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 44,
    textAlign: 'center',
    marginBottom: 50,
  },
  menuRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D5D5D5',
    paddingVertical: 18,
  },
  menuTextBox: {
    flex: 1,
    marginLeft: 18,
  },
  menuTitle: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  menuSubtitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 25,
  },
  detailIntro: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 30,
    marginBottom: 26,
  },
  detailSection: {
    marginBottom: 28,
  },
  detailTitle: {
    color: '#111111',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 8,
  },
  detailText: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 27,
  },
  footerText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
});

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type PageMode = 'menu' | 'terms' | 'privacy';
type LegalSection = {
  title: string;
  paragraphs: string[];
};

const termsSections: LegalSection[] = [
  {
    title: 'Conditions générales d’utilisation (CGU)',
    paragraphs: [
      'Application TaKo',
      'Dernière mise à jour : Mai 2026',
      'Bienvenue sur TaKo.',
      'Les présentes Conditions Générales d’Utilisation (« CGU ») définissent les règles d’accès et d’utilisation de l’application mobile TaKo, de la plateforme web, des services numériques, des solutions de paiement ainsi que des fonctionnalités associées proposées par TaKo.',
      'En accédant à l’application TaKo ou en utilisant nos services, l’utilisateur accepte pleinement et sans réserve les présentes conditions.',
    ],
  },
  {
    title: '1. Présentation de TaKo',
    paragraphs: [
      'TaKo est une plateforme numérique de transport et de paiement développée pour faciliter les déplacements urbains et les transactions électroniques en République Démocratique du Congo.',
      'La plateforme permet notamment : le paiement de transport via QR Code, le paiement via technologie NFC, la recharge du portefeuille électronique, la gestion des comptes utilisateurs, les paiements intégrés Mobile Money, les paiements digitaux liés au transport urbain, la gestion des transactions et historiques de paiement, ainsi que les services associés proposés par les partenaires de TaKo.',
    ],
  },
  {
    title: '2. Acceptation des conditions',
    paragraphs: [
      'L’utilisation des services TaKo implique l’acceptation complète des présentes Conditions Générales d’Utilisation.',
      'Si l’utilisateur refuse tout ou partie des présentes conditions, il doit immédiatement cesser l’utilisation des services TaKo.',
      'TaKo se réserve le droit de modifier les présentes conditions à tout moment afin de s’adapter aux évolutions légales, exigences réglementaires, améliorations techniques, nouveaux services et obligations imposées par les partenaires financiers ou opérateurs Mobile Money.',
    ],
  },
  {
    title: '3. Conditions d’accès aux services',
    paragraphs: [
      'Pour accéder aux services TaKo, l’utilisateur doit disposer d’un smartphone compatible, d’une connexion internet, fournir des informations exactes et à jour, respecter les lois en vigueur dans son pays et utiliser les services de manière légale et responsable.',
      'L’utilisateur est seul responsable des informations transmises lors de son inscription.',
      'Toute fausse déclaration peut entraîner la suspension ou la suppression du compte.',
    ],
  },
  {
    title: '4. Création de compte utilisateur',
    paragraphs: [
      'L’accès à certaines fonctionnalités nécessite la création d’un compte utilisateur.',
      'Lors de l’inscription, l’utilisateur peut être amené à fournir son nom et prénom, numéro de téléphone, adresse email, mot de passe, informations de vérification d’identité et informations complémentaires exigées par la réglementation financière.',
      'L’utilisateur est responsable de la confidentialité de ses identifiants.',
      'Toute activité effectuée depuis le compte utilisateur est présumée avoir été réalisée par le titulaire du compte.',
    ],
  },
  {
    title: '5. Services de paiement',
    paragraphs: [
      'TaKo peut intégrer des solutions de paiement électroniques via des partenaires agréés tels que les opérateurs Mobile Money, établissements financiers ou prestataires de paiement.',
      'Les transactions peuvent inclure les recharges de portefeuille, paiements de transport, transferts internes, validations QR Code, validations NFC et opérations liées aux services partenaires.',
      'Les délais, frais, limites et disponibilités peuvent varier selon les opérateurs et partenaires techniques.',
      'TaKo ne garantit pas l’absence d’interruption temporaire des services de paiement.',
    ],
  },
  {
    title: '6. Responsabilité de l’utilisateur',
    paragraphs: [
      'L’utilisateur s’engage à utiliser les services conformément aux lois applicables, ne pas utiliser TaKo à des fins frauduleuses, ne pas contourner les systèmes de sécurité, ne pas effectuer de transactions illicites, protéger ses identifiants et appareils, et signaler immédiatement toute activité suspecte.',
      'Toute utilisation abusive peut entraîner la suspension du compte, le blocage des transactions, la suppression définitive du compte ou des poursuites judiciaires.',
    ],
  },
  {
    title: '7. Vérification d’identité (KYC)',
    paragraphs: [
      'Dans le cadre des obligations réglementaires de conformité financière et de lutte contre la fraude, TaKo peut exiger des procédures de vérification d’identité (KYC).',
      'Les utilisateurs peuvent être amenés à fournir une pièce d’identité, une photo de vérification, un justificatif de domicile et des informations complémentaires demandées par les partenaires financiers.',
      'Le refus de fournir les informations nécessaires peut limiter l’accès à certains services.',
    ],
  },
  {
    title: '8. Disponibilité des services',
    paragraphs: [
      'TaKo s’efforce d’assurer un accès continu aux services.',
      'Toutefois, des interruptions peuvent survenir en raison de maintenance technique, mises à jour, problèmes réseau, incidents techniques ou défaillances des partenaires tiers.',
      'TaKo ne peut être tenu responsable des interruptions temporaires indépendantes de sa volonté.',
    ],
  },
  {
    title: '9. Protection des données personnelles',
    paragraphs: [
      'TaKo collecte certaines données nécessaires au fonctionnement des services, notamment l’identité, le numéro de téléphone, l’adresse email, l’historique de transactions, les données techniques et les informations de connexion.',
      'Les données sont utilisées exclusivement dans le cadre du fonctionnement de la plateforme, de la sécurité, de la conformité réglementaire, de l’amélioration des services et de la prévention contre la fraude.',
      'TaKo s’engage à protéger les données des utilisateurs conformément aux lois applicables.',
    ],
  },
  {
    title: '10. Propriété intellectuelle',
    paragraphs: [
      'Tous les éléments de TaKo sont protégés par les lois relatives à la propriété intellectuelle.',
      'Sont notamment protégés : le logo TaKo, l’application, les interfaces, les textes, les designs, les codes sources, les contenus numériques et les fonctionnalités.',
      'Toute reproduction, copie ou exploitation non autorisée est interdite.',
    ],
  },
  {
    title: '11. Limitation de responsabilité',
    paragraphs: [
      'TaKo ne saurait être tenu responsable des pertes liées à une mauvaise utilisation, interruptions de réseau, erreurs de partenaires tiers, retards de paiement indépendants de TaKo, pertes indirectes ou dommages causés par des tiers.',
      'L’utilisateur reconnaît utiliser les services sous sa propre responsabilité.',
    ],
  },
  {
    title: '12. Suspension et résiliation',
    paragraphs: [
      'TaKo peut suspendre ou supprimer un compte en cas d’activité suspecte, fraude, violation des présentes conditions, utilisation illégale, tentative de piratage ou non-respect des obligations réglementaires.',
      'L’utilisateur peut également demander la fermeture de son compte.',
    ],
  },
  {
    title: '13. Services tiers',
    paragraphs: [
      'Certaines fonctionnalités peuvent dépendre de services tiers : opérateurs Mobile Money, fournisseurs SMS, prestataires email, services cloud, partenaires financiers et fournisseurs API.',
      'TaKo ne contrôle pas l’ensemble des services tiers et ne peut garantir leur disponibilité permanente.',
    ],
  },
  {
    title: '14. Modification des services',
    paragraphs: [
      'TaKo se réserve le droit de modifier, suspendre ou supprimer certaines fonctionnalités à tout moment afin d’améliorer la plateforme ou de respecter des obligations techniques et réglementaires.',
    ],
  },
  {
    title: '15. Droit applicable',
    paragraphs: [
      'Les présentes Conditions Générales d’Utilisation sont régies par les lois applicables en République Démocratique du Congo.',
      'Tout litige relatif à l’utilisation des services TaKo pourra être soumis aux juridictions compétentes.',
    ],
  },
  {
    title: '16. Contact',
    paragraphs: [
      'Pour toute question, assistance ou réclamation, les utilisateurs peuvent contacter TaKo via :',
      'Email : contact@takotransport.online',
      'Support : support@takotransport.online',
    ],
  },
  {
    title: '17. Acceptation finale',
    paragraphs: [
      'En utilisant TaKo, l’utilisateur reconnaît avoir lu, compris et accepté l’intégralité des présentes Conditions Générales d’Utilisation.',
      '© TaKo – Tous droits réservés.',
    ],
  },
];

const privacySections: LegalSection[] = [
  {
    title: 'Données collectées',
    paragraphs: [
      'TaKo collecte uniquement les informations nécessaires au fonctionnement du service: ID client, nom complet, email ou numéro, date de naissance, solde, historique de transactions et informations NFC si la carte est activée.',
    ],
  },
  {
    title: 'Utilisation des données',
    paragraphs: [
      'Ces données servent à identifier le compte, sécuriser les paiements, afficher l’historique, envoyer des notifications et permettre l’assistance client.',
    ],
  },
  {
    title: 'Protection des informations',
    paragraphs: [
      'Les informations personnelles ne sont pas vendues à des tiers. Les travailleurs autorisés peuvent accéder aux données nécessaires uniquement pour l’assistance, la sécurité et l’administration du service.',
    ],
  },
  {
    title: 'Correction des données',
    paragraphs: [
      'L’utilisateur peut demander une correction des informations non modifiables auprès du centre d’appel TaKo.',
    ],
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
                {section.paragraphs.map((paragraph) => (
                  <Text key={paragraph} style={styles.detailText}>{paragraph}</Text>
                ))}
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
    color: '#061F68',
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
    marginBottom: 10,
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

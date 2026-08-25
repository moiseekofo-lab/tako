import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAdminPreferences, getAdminProfile, getAdminSecurity, requestAdminTwoFactorSetup, updateAdminPreferences, updateAdminProfile, verifyAdminTwoFactorSetup } from '../services/api';

const BLUE = '#061F68';
const ACTION = '#1268E8';
const ADMIN_SESSION_KEY = 'tako:adminSession';
const defaultPreferences = { theme: 'light', primaryColor: '#1268E8', language: 'fr', timezone: 'Africa/Kinshasa', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', rowsPerPage: 10, density: 'comfortable', animations: true, defaultPage: 'dashboard', reportPeriod: '30d', emailLanguage: 'fr', communications: true, emailNotifications: true, pushNotifications: true, smsNotifications: false };

type ProfileTab = 'personal' | 'security' | 'preferences' | 'activity';

export function AdminProfile({ user, initialTab = 'personal', onProfileUpdated, onTabChange }: { user: any; initialTab?: ProfileTab; onProfileUpdated?: (profile: any) => void; onTabChange?: (tab: ProfileTab) => void }) {
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const [editing, setEditing] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [securityData, setSecurityData] = useState<any>(null);
  const [name, setName] = useState(user?.fullName || 'Admin TaKo');
  const [email, setEmail] = useState(user?.email || 'contact@takotransport.online');
  const [phone, setPhone] = useState(user?.phone || '+243 000 000 000');
  const [photoUrl, setPhotoUrl] = useState('');
  const [companyName, setCompanyName] = useState('TaKo Transport');
  const [businessSector, setBusinessSector] = useState('Transport & Mobilité');
  const [country, setCountry] = useState('République Démocratique du Congo');
  const [city, setCity] = useState('Kinshasa');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [preferences, setPreferences] = useState<any>(defaultPreferences);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const browser = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Application TaKo';

  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => onTabChange?.(tab), [onTabChange, tab]);
  useEffect(() => {
    if (tab !== 'personal') return;
    setProfileLoading(true);
    AsyncStorage.getItem(ADMIN_SESSION_KEY)
      .then((token) => token ? getAdminProfile(token) : null)
      .then((result) => {
        const profile = result?.profile;
        if (!profile) return;
        setName(profile.fullName || 'Admin TaKo'); setEmail(profile.email || ''); setPhone(profile.phone || '');
        setPhotoUrl(profile.photoUrl || ''); setCompanyName(profile.companyName || ''); setBusinessSector(profile.businessSector || '');
        setCountry(profile.country || ''); setCity(profile.city || ''); setCreatedAt(profile.createdAt || null);
        onProfileUpdated?.(profile);
      })
      .catch(() => Alert.alert('Profil indisponible', 'Impossible de charger les informations administrateur.'))
      .finally(() => setProfileLoading(false));
  }, [tab, onProfileUpdated]);
  useEffect(() => {
    if (tab !== 'security') return;
    AsyncStorage.getItem(ADMIN_SESSION_KEY)
      .then((token) => token ? getAdminSecurity(token) : null)
      .then((result) => {
        if (result?.security) {
          setSecurityData(result.security);
          setEmailAlerts(Boolean(result.security.loginEmailAlertsEnabled));
        }
      })
      .catch(() => setSecurityData(null));
  }, [tab]);
  useEffect(() => {
    if (tab !== 'preferences') return;
    AsyncStorage.getItem(ADMIN_SESSION_KEY).then((token) => token ? getAdminPreferences(token) : null).then((result) => result?.preferences && setPreferences({ ...defaultPreferences, ...result.preferences })).catch(() => Alert.alert('Préférences indisponibles', 'Impossible de charger les préférences enregistrées.'));
  }, [tab]);

  const savePassword = () => {
    if (!passwords.current || passwords.next.length < 8 || passwords.next !== passwords.confirm) {
      Alert.alert('Mot de passe invalide', 'Vérifiez le mot de passe actuel et utilisez au moins 8 caractères identiques dans les deux nouveaux champs.');
      return;
    }
    Alert.alert('Demande enregistrée', 'La modification du mot de passe doit être confirmée dans la configuration sécurisée du serveur.');
    setPasswords({ current: '', next: '', confirm: '' });
    setChangingPassword(false);
  };

  const choosePhoto = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Photo', 'La modification de la photo administrateur est disponible depuis l’administration Web.');
      return;
    }
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => { const file = input.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { Alert.alert('Photo trop lourde', 'Choisissez une photo de 2 Mo maximum.'); return; } const reader = new FileReader(); reader.onload = () => { const nextPhotoUrl = String(reader.result || ''); setPhotoUrl(nextPhotoUrl); saveProfile({ photoUrl: nextPhotoUrl }, false); }; reader.readAsDataURL(file); };
    input.click();
  };

  const saveProfile = async (overrides: { photoUrl?: string } = {}, showConfirmation = true) => {
    try {
      setProfileSaving(true);
      const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!token) throw new Error('Session administrateur expirée.');
      const result = await updateAdminProfile(token, { fullName: name, email, phone, photoUrl: overrides.photoUrl ?? photoUrl, companyName, businessSector, country, city });
      if (result?.profile) onProfileUpdated?.(result.profile);
      setEditing(false);
      if (showConfirmation) Alert.alert('Profil enregistré', 'Les informations personnelles ont été mises à jour dans la base de données.');
    } catch (error) {
      Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally { setProfileSaving(false); }
  };

  const savePreferences = async () => {
    try { setPreferencesSaving(true); const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY); if (!token) throw new Error('Session administrateur expirée.'); await updateAdminPreferences(token, preferences); Alert.alert('Préférences enregistrées', 'Vos réglages ont été sauvegardés dans la base de données.'); }
    catch (error) { Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Réessayez plus tard.'); }
    finally { setPreferencesSaving(false); }
  };

  const configureTwoFactor = async () => {
    try {
      setTwoFactorLoading(true);
      const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!token) throw new Error('Session administrateur expirée.');
      const requestResult = await requestAdminTwoFactorSetup(token);
      if (Platform.OS !== 'web' || typeof window === 'undefined') throw new Error('Terminez la configuration depuis l’administration Web.');
      const code = window.prompt(`Code Infobip envoyé à ${requestResult.contact}. Entrez les 6 chiffres :`);
      if (!code) return;
      await verifyAdminTwoFactorSetup(token, requestResult.contact, code.trim());
      setSecurityData((current: any) => ({ ...(current || {}), twoFactorEnabled: true }));
      Alert.alert('2FA activée', 'Un code Infobip sera maintenant exigé à chaque connexion administrateur.');
    } catch (error) { Alert.alert('Configuration impossible', error instanceof Error ? error.message : 'Réessayez plus tard.'); }
    finally { setTwoFactorLoading(false); }
  };

  return (
    <View style={styles.page}>
      <View style={styles.tabs}>
        {([['personal', 'Informations personnelles'], ['security', 'Sécurité'], ['preferences', 'Préférences'], ['activity', 'Activité récente']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text></TouchableOpacity>
        ))}
      </View>

      {tab === 'personal' ? (
        <View style={styles.columns}>
          <View style={styles.mainColumn}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Informations personnelles</Text>
              {profileLoading ? <ActivityIndicator size="large" color={ACTION} /> : null}
              <View style={styles.personalLayout}>
                <View style={styles.photoColumn}><View style={styles.avatar}>{photoUrl ? <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" /> : <Ionicons name="person" size={72} color="white" />}</View><TouchableOpacity style={styles.outlineButton} onPress={choosePhoto}><Ionicons name="camera-outline" size={18} color={BLUE} /><Text style={styles.outlineText}>Changer la photo</Text></TouchableOpacity></View>
                <View style={styles.details}>
                  <ProfileField label="Nom complet" value={name} editing={editing} onChange={setName} />
                  <ProfileField label="E-mail" value={email} editing={editing} onChange={setEmail} />
                  <ProfileField label="Téléphone" value={phone} editing={editing} onChange={setPhone} />
                  <View><Text style={styles.fieldLabel}>Rôle</Text><View style={styles.roleBadge}><Text style={styles.roleText}>Super administrateur</Text></View></View>
                  <View><Text style={styles.fieldLabel}>Date de création du compte</Text><Text style={styles.fieldValue}>{createdAt ? new Date(createdAt).toLocaleString('fr-FR') : 'Indisponible'}</Text></View>
                  <TouchableOpacity style={styles.primaryButton} disabled={profileSaving} onPress={() => editing ? saveProfile() : setEditing(true)}><Text style={styles.primaryText}>{profileSaving ? 'Enregistrement…' : editing ? 'Enregistrer les informations' : 'Modifier les informations'}</Text></TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Informations sur l’entreprise</Text>
              <View style={styles.companyGrid}><View style={styles.companyItem}><ProfileField label="Nom de l’entreprise" value={companyName} editing={editing} onChange={setCompanyName} /></View><View style={styles.companyItem}><ProfileField label="Secteur d’activité" value={businessSector} editing={editing} onChange={setBusinessSector} /></View><View style={styles.companyItem}><ProfileField label="Pays" value={country} editing={editing} onChange={setCountry} /></View><View style={styles.companyItem}><ProfileField label="Ville" value={city} editing={editing} onChange={setCity} /></View></View>
            </View>
          </View>

          <View style={styles.sideColumn}>
            <View style={styles.card}><Text style={styles.cardTitle}>À propos du compte</Text><InfoRow label="Rôle" value="Super administrateur" /><InfoRow label="Statut du compte" value="Actif" success /><InfoRow label="Dernière connexion" value={new Date().toLocaleString('fr-FR')} /><InfoRow label="Navigateur" value={browser} /><InfoRow label="Appareil" value={Platform.OS === 'web' ? 'Ordinateur' : Platform.OS} /></View>
            <View style={styles.securityCard}><View style={styles.securityTitle}><Ionicons name="shield-checkmark" size={27} color={ACTION} /><Text style={styles.securityHeading}>Conseils de sécurité</Text></View><Text style={styles.securityIntro}>Pour sécuriser votre compte, nous vous recommandons :</Text>{['Utiliser un mot de passe fort', 'Ne jamais partager vos identifiants', 'Activer la double authentification'].map((text) => <View key={text} style={styles.tip}><Ionicons name="checkmark-circle" size={18} color={ACTION} /><Text style={styles.tipText}>{text}</Text></View>)}</View>
          </View>
        </View>
      ) : tab === 'security' ? (
        <View style={styles.securityColumns}>
          <View style={styles.securityMain}>
            <SecuritySection icon="lock-closed-outline" tone="#EAF3FF" title="Mot de passe" description="Assurez-vous d’utiliser un mot de passe fort pour protéger votre compte.">
              {changingPassword ? <View style={styles.passwordForm}><TextInput style={styles.input} secureTextEntry value={passwords.current} onChangeText={(current) => setPasswords({ ...passwords, current })} placeholder="Mot de passe actuel" /><TextInput style={styles.input} secureTextEntry value={passwords.next} onChangeText={(next) => setPasswords({ ...passwords, next })} placeholder="Nouveau mot de passe" /><TextInput style={styles.input} secureTextEntry value={passwords.confirm} onChangeText={(confirm) => setPasswords({ ...passwords, confirm })} placeholder="Confirmer le nouveau mot de passe" /><View style={styles.inlineActions}><TouchableOpacity style={styles.outlineButton} onPress={() => setChangingPassword(false)}><Text style={styles.outlineText}>Annuler</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={savePassword}><Text style={styles.primaryText}>Enregistrer</Text></TouchableOpacity></View></View> : <View style={styles.securityActionRow}><View><Text style={styles.fieldLabel}>Mot de passe actuel</Text><Text style={styles.passwordDots}>••••••••••••</Text></View><TouchableOpacity style={styles.outlineButton} onPress={() => setChangingPassword(true)}><Ionicons name="lock-closed-outline" size={17} color={ACTION} /><Text style={[styles.outlineText, { color: ACTION }]}>Changer le mot de passe</Text></TouchableOpacity></View>}
            </SecuritySection>
            <SecuritySection icon="shield-checkmark-outline" tone="#E8FAEF" title="Authentification à deux facteurs (2FA)" description="Protection par code OTP e-mail envoyé avec Infobip." badge={securityData?.twoFactorEnabled ? 'Activée' : 'Non configurée'}><View style={styles.securityActionRow}><Text style={styles.fieldValue}>{securityData?.twoFactorEnabled ? 'Infobip OTP e-mail actif' : 'Activez la vérification à chaque connexion'}</Text>{!securityData?.twoFactorEnabled ? <TouchableOpacity style={styles.outlineButton} disabled={twoFactorLoading} onPress={configureTwoFactor}><Ionicons name="settings-outline" size={17} color={ACTION} /><Text style={[styles.outlineText, { color: ACTION }]}>{twoFactorLoading ? 'Envoi…' : 'Configurer'}</Text></TouchableOpacity> : null}</View></SecuritySection>
            <SecuritySection icon="mail-outline" tone="#F3ECFF" title="E-mails de connexion" description="État réel des alertes de nouvelle connexion configurées sur le serveur."><Switch value={emailAlerts} disabled trackColor={{ false: '#CBD5E1', true: ACTION }} /></SecuritySection>
            <SecuritySection icon="desktop-outline" tone="#FFF3E8" title="Session active" description="Informations réelles de la session administrateur actuelle."><View style={styles.sessionRow}><Ionicons name={Platform.OS === 'web' ? 'desktop-outline' : 'phone-portrait-outline'} size={24} color={BLUE} /><View style={{ flex: 1 }}><Text style={styles.fieldValue}>{securityData?.session?.userAgent || 'Indisponible'}</Text><Text style={styles.smallText}>IP : {securityData?.session?.ipAddress || 'Indisponible'} · Connexion : {securityData?.session?.issuedAt ? new Date(securityData.session.issuedAt).toLocaleString('fr-FR') : 'Indisponible'}</Text></View><Text style={styles.activeNow}>Actif maintenant</Text></View></SecuritySection>
          </View>
          <View style={styles.securitySide}><View style={styles.card}><View style={styles.securityTitle}><Ionicons name="shield-checkmark" size={26} color={ACTION} /><Text style={styles.cardTitleInline}>Conseils de sécurité</Text></View>{['Utilisez un mot de passe fort et unique.', 'Ne partagez jamais vos identifiants.', 'Activez l’authentification à deux facteurs.', 'Déconnectez-vous des appareils inutilisés.'].map((text) => <View key={text} style={styles.tip}><Ionicons name="checkmark-circle" size={18} color={ACTION} /><Text style={styles.tipText}>{text}</Text></View>)}</View><View style={styles.card}><Text style={styles.cardTitle}>Activité de sécurité récente</Text>{securityData?.events?.length ? securityData.events.map((event: any) => <View key={event.id} style={styles.activityRow}><Ionicons name="checkmark-circle-outline" size={21} color="#0A9D50" /><View style={{ flex: 1 }}><Text style={styles.activityTitle}>{event.eventType === 'login_success' ? 'Connexion administrateur réussie' : event.eventType}</Text><Text style={styles.smallText}>{event.createdAt ? new Date(event.createdAt).toLocaleString('fr-FR') : 'Date indisponible'} · IP {event.ipAddress || 'indisponible'}</Text><Text style={styles.smallText} numberOfLines={2}>{event.userAgent || 'Appareil indisponible'}</Text></View></View>) : <Text style={styles.placeholder}>Aucune activité de sécurité réelle enregistrée.</Text>}</View></View>
        </View>
      ) : tab === 'preferences' ? (
        <View style={styles.preferencesLayout}>
          <View style={styles.preferencesMain}>
            <PreferenceSection icon="color-palette-outline" title="Apparence" description="Personnalisez l’apparence de l’interface selon vos préférences."><Text style={styles.fieldLabel}>Thème</Text><ChoiceGroup value={preferences.theme} options={[['light', '☀ Clair'], ['dark', '☾ Sombre'], ['system', '▣ Système']]} onChange={(theme) => setPreferences({ ...preferences, theme })} /><Text style={styles.fieldLabel}>Couleur principale</Text><View style={styles.colorRow}>{['#1268E8', '#7C3AED', '#0EAD69', '#F79009', '#EF4444', '#667085'].map((color) => <TouchableOpacity key={color} style={[styles.colorChoice, { backgroundColor: color }, preferences.primaryColor === color && styles.colorChoiceActive]} onPress={() => setPreferences({ ...preferences, primaryColor: color })}>{preferences.primaryColor === color ? <Ionicons name="checkmark" size={19} color="white" /> : null}</TouchableOpacity>)}</View></PreferenceSection>
            <PreferenceSection icon="globe-outline" title="Langue et région" description="Choisissez votre langue et vos préférences régionales."><View style={styles.preferenceGrid}><PreferenceChoice label="Langue de l’interface" value={preferences.language} options={[['fr', 'Français'], ['en', 'English'], ['pt', 'Português']]} onChange={(language) => setPreferences({ ...preferences, language })} /><PreferenceChoice label="Fuseau horaire" value={preferences.timezone} options={[['Africa/Kinshasa', 'Kinshasa (UTC+01:00)'], ['Africa/Lubumbashi', 'Lubumbashi (UTC+02:00)']]} onChange={(timezone) => setPreferences({ ...preferences, timezone })} /><PreferenceChoice label="Format de date" value={preferences.dateFormat} options={[['DD/MM/YYYY', 'DD/MM/YYYY'], ['YYYY-MM-DD', 'YYYY-MM-DD']]} onChange={(dateFormat) => setPreferences({ ...preferences, dateFormat })} /><PreferenceChoice label="Format d’heure" value={preferences.timeFormat} options={[['24h', '24 heures'], ['12h', '12 heures']]} onChange={(timeFormat) => setPreferences({ ...preferences, timeFormat })} /></View></PreferenceSection>
            <PreferenceSection icon="grid-outline" title="Affichage des données" description="Personnalisez la façon dont les données sont affichées dans les tableaux."><SettingToggle label="Animations d’interface" description="Activer les animations et transitions." value={preferences.animations} onChange={(animations) => setPreferences({ ...preferences, animations })} /><PreferenceChoice label="Lignes par page" value={String(preferences.rowsPerPage)} options={[[10, '10 lignes'], [20, '20 lignes'], [50, '50 lignes']]} onChange={(rowsPerPage) => setPreferences({ ...preferences, rowsPerPage: Number(rowsPerPage) })} /><PreferenceChoice label="Densité des tableaux" value={preferences.density} options={[['comfortable', 'Confortable'], ['compact', 'Compacte']]} onChange={(density) => setPreferences({ ...preferences, density })} /></PreferenceSection>
            <PreferenceSection icon="speedometer-outline" title="Tableau de bord" description="Personnalisez votre tableau de bord par défaut."><View style={styles.preferenceGrid}><PreferenceChoice label="Page d’accueil par défaut" value={preferences.defaultPage} options={[['dashboard', 'Tableau de bord'], ['news', 'Actualités'], ['reports', 'Rapports']]} onChange={(defaultPage) => setPreferences({ ...preferences, defaultPage })} /><PreferenceChoice label="Période par défaut des rapports" value={preferences.reportPeriod} options={[['7d', '7 derniers jours'], ['30d', '30 derniers jours'], ['90d', '90 derniers jours']]} onChange={(reportPeriod) => setPreferences({ ...preferences, reportPeriod })} /></View></PreferenceSection>
          </View>
          <View style={styles.preferencesSide}><View style={styles.card}><Text style={styles.cardTitle}>Langue de communication</Text><PreferenceChoice label="Langue des e-mails" value={preferences.emailLanguage} options={[['fr', 'Français'], ['en', 'English'], ['pt', 'Português']]} onChange={(emailLanguage) => setPreferences({ ...preferences, emailLanguage })} /><SettingToggle label="Communications importantes" description="Mises à jour et annonces." value={preferences.communications} onChange={(communications) => setPreferences({ ...preferences, communications })} /></View><View style={styles.card}><Text style={styles.cardTitle}>Notifications</Text><SettingToggle label="Notifications par e-mail" value={preferences.emailNotifications} onChange={(emailNotifications) => setPreferences({ ...preferences, emailNotifications })} /><SettingToggle label="Notifications push" value={preferences.pushNotifications} onChange={(pushNotifications) => setPreferences({ ...preferences, pushNotifications })} /><SettingToggle label="Notifications SMS" value={preferences.smsNotifications} onChange={(smsNotifications) => setPreferences({ ...preferences, smsNotifications })} /></View><View style={styles.preferenceActions}><TouchableOpacity style={styles.outlineButton} onPress={() => setPreferences(defaultPreferences)}><Ionicons name="refresh-outline" size={18} color={BLUE} /><Text style={styles.outlineText}>Réinitialiser</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} disabled={preferencesSaving} onPress={savePreferences}><Text style={styles.primaryText}>{preferencesSaving ? 'Enregistrement…' : 'Enregistrer les préférences'}</Text></TouchableOpacity></View></View>
        </View>
      ) : (
        <View style={styles.card}><Ionicons name="time-outline" size={42} color={ACTION} /><Text style={[styles.cardTitle, { marginTop: 12 }]}>Activité récente</Text><Text style={styles.placeholder}>Consultez les dernières actions réalisées avec votre compte administrateur.</Text></View>
      )}
    </View>
  );
}

function ProfileField({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (value: string) => void }) {
  return <View><Text style={styles.fieldLabel}>{label}</Text>{editing ? <TextInput style={styles.input} value={value} onChangeText={onChange} /> : <Text style={styles.fieldValue}>{value}</Text>}</View>;
}
function InfoRow({ label, value, success }: { label: string; value: string; success?: boolean }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text>{success ? <View style={styles.activeBadge}><Text style={styles.activeText}>{value}</Text></View> : <Text style={styles.infoValue}>{value}</Text>}</View>; }
function SecuritySection({ icon, tone, title, description, badge, children }: { icon: keyof typeof Ionicons.glyphMap; tone: string; title: string; description: string; badge?: string; children: ReactNode }) { return <View style={styles.securitySection}><View style={[styles.sectionIcon, { backgroundColor: tone }]}><Ionicons name={icon} size={25} color={ACTION} /></View><View style={styles.sectionBody}><View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>{title}</Text>{badge ? <View style={styles.activeBadge}><Text style={styles.activeText}>{badge}</Text></View> : null}</View><Text style={styles.sectionDescription}>{description}</Text><View style={styles.sectionContent}>{children}</View></View></View>; }
function PreferenceSection({ icon, title, description, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; children: ReactNode }) { return <View style={styles.preferenceSection}><View style={styles.preferenceIcon}><Ionicons name={icon} size={25} color={ACTION} /></View><View style={styles.sectionBody}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDescription}>{description}</Text><View style={styles.preferenceContent}>{children}</View></View></View>; }
function ChoiceGroup({ value, options, onChange }: { value: any; options: readonly (readonly [any, string])[]; onChange: (value: any) => void }) { return <View style={styles.choiceGroup}>{options.map(([key, label]) => <TouchableOpacity key={String(key)} style={[styles.choice, value === key && styles.choiceActive]} onPress={() => onChange(key)}><Text style={[styles.choiceText, value === key && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>)}</View>; }
function PreferenceChoice({ label, value, options, onChange }: { label: string; value: any; options: readonly (readonly [any, string])[]; onChange: (value: any) => void }) { return <View style={styles.preferenceChoice}><Text style={styles.fieldLabel}>{label}</Text><ChoiceGroup value={value} options={options} onChange={onChange} /></View>; }
function SettingToggle({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.settingToggle}><View style={{ flex: 1 }}><Text style={styles.settingTitle}>{label}</Text>{description ? <Text style={styles.smallText}>{description}</Text> : null}</View><Switch value={value} onValueChange={onChange} trackColor={{ false: '#CBD5E1', true: ACTION }} /></View>; }

const styles = StyleSheet.create({
  preferencesLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' },
  preferencesMain: { flex: 2, minWidth: 520, gap: 14 },
  preferencesSide: { flex: 1, minWidth: 310, gap: 14 },
  preferenceSection: { borderRadius: 10, borderWidth: 1, borderColor: '#E3E9F2', backgroundColor: 'white', padding: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  preferenceIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  preferenceContent: { marginTop: 16, gap: 14 },
  preferenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  preferenceChoice: { flex: 1, minWidth: 220, gap: 4 },
  choiceGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minHeight: 38, borderRadius: 7, borderWidth: 1, borderColor: '#D4DCE8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  choiceActive: { borderColor: ACTION, backgroundColor: '#EAF3FF' },
  choiceText: { color: '#475467', fontSize: 11, fontWeight: '800' },
  choiceTextActive: { color: ACTION },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorChoice: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorChoiceActive: { borderWidth: 3, borderColor: 'white', outlineWidth: 2, outlineColor: ACTION } as any,
  settingToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  settingTitle: { color: BLUE, fontSize: 12, fontWeight: '900' },
  preferenceActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, flexWrap: 'wrap' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 79 },
  securityColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' },
  securityMain: { flex: 2, minWidth: 520, gap: 14 },
  securitySide: { flex: 1, minWidth: 300, gap: 14 },
  securitySection: { borderRadius: 10, borderWidth: 1, borderColor: '#E3E9F2', backgroundColor: 'white', padding: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  sectionIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  sectionBody: { flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { color: BLUE, fontSize: 16, fontWeight: '900' },
  sectionDescription: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionContent: { marginTop: 16 },
  securityActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  passwordDots: { color: BLUE, fontSize: 18, letterSpacing: 2 },
  passwordForm: { gap: 9, maxWidth: 560 },
  inlineActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  smallText: { color: '#667085', fontSize: 11, lineHeight: 17, marginTop: 3 },
  sessionRow: { minHeight: 62, borderRadius: 7, borderWidth: 1, borderColor: '#E3E9F2', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13 },
  activeNow: { color: '#07833C', fontSize: 11, fontWeight: '900' },
  cardTitleInline: { color: BLUE, fontSize: 17, fontWeight: '900' },
  activityRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  activityTitle: { color: BLUE, fontSize: 12, fontWeight: '900' },
  page: { gap: 18 }, tabs: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', borderRadius: 9, borderWidth: 1, borderColor: '#E3E9F2', backgroundColor: 'white', paddingHorizontal: 10 }, tab: { minHeight: 64, paddingHorizontal: 22, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: ACTION }, tabText: { color: '#344054', fontSize: 13, fontWeight: '800' }, tabTextActive: { color: ACTION }, columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }, mainColumn: { flex: 2, minWidth: 520, gap: 18 }, sideColumn: { flex: 1, minWidth: 300, gap: 18 }, card: { borderRadius: 10, borderWidth: 1, borderColor: '#E3E9F2', backgroundColor: 'white', padding: 20 }, cardTitle: { color: BLUE, fontSize: 18, fontWeight: '900', marginBottom: 20 }, personalLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 38, flexWrap: 'wrap' }, photoColumn: { width: 220, alignItems: 'center', gap: 14 }, avatar: { width: 158, height: 158, borderRadius: 79, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }, details: { flex: 1, minWidth: 260, gap: 18 }, fieldLabel: { color: '#344054', fontSize: 12, fontWeight: '800', marginBottom: 6 }, fieldValue: { color: BLUE, fontSize: 14, fontWeight: '800' }, input: { minHeight: 42, borderRadius: 7, borderWidth: 1, borderColor: '#CCD6E5', paddingHorizontal: 11, color: BLUE, fontSize: 13 }, roleBadge: { alignSelf: 'flex-start', borderRadius: 6, backgroundColor: '#E8F1FF', paddingHorizontal: 10, paddingVertical: 6 }, roleText: { color: ACTION, fontSize: 12, fontWeight: '900' }, primaryButton: { alignSelf: 'flex-start', minHeight: 44, borderRadius: 7, backgroundColor: ACTION, justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 }, primaryText: { color: 'white', fontSize: 13, fontWeight: '900' }, outlineButton: { minHeight: 42, borderRadius: 7, borderWidth: 1, borderColor: '#CCD6E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 }, outlineText: { color: BLUE, fontSize: 12, fontWeight: '900' }, companyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 }, companyItem: { width: '46%', minWidth: 230, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', paddingBottom: 12 }, infoRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }, infoLabel: { color: '#475467', fontSize: 12 }, infoValue: { flex: 1, color: BLUE, fontSize: 12, fontWeight: '800', textAlign: 'right' }, activeBadge: { borderRadius: 99, backgroundColor: '#DDF8E8', paddingHorizontal: 10, paddingVertical: 5 }, activeText: { color: '#07833C', fontSize: 11, fontWeight: '900' }, securityCard: { borderRadius: 10, borderWidth: 1, borderColor: '#BDD7FF', backgroundColor: '#F5F9FF', padding: 20, gap: 12 }, securityTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 }, securityHeading: { color: ACTION, fontSize: 17, fontWeight: '900' }, securityIntro: { color: '#475467', fontSize: 12 }, tip: { flexDirection: 'row', alignItems: 'center', gap: 8 }, tipText: { color: '#344054', fontSize: 12, fontWeight: '700' }, placeholder: { color: '#667085', fontSize: 14, lineHeight: 21, marginBottom: 14 },
});

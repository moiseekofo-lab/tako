import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BLUE = '#061F68';
const ACTION = '#1268E8';

export function AdminProfile({ user, onOpenSecurity }: { user: any; onOpenSecurity: () => void }) {
  const [tab, setTab] = useState<'personal' | 'security' | 'preferences' | 'activity'>('personal');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.fullName || 'Admin TaKo');
  const [email, setEmail] = useState(user?.email || 'contact@takotransport.online');
  const [phone, setPhone] = useState(user?.phone || '+243 000 000 000');
  const browser = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Application TaKo';

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
              <View style={styles.personalLayout}>
                <View style={styles.photoColumn}><View style={styles.avatar}><Ionicons name="person" size={72} color="white" /></View><TouchableOpacity style={styles.outlineButton}><Ionicons name="camera-outline" size={18} color={BLUE} /><Text style={styles.outlineText}>Changer la photo</Text></TouchableOpacity></View>
                <View style={styles.details}>
                  <ProfileField label="Nom complet" value={name} editing={editing} onChange={setName} />
                  <ProfileField label="E-mail" value={email} editing={editing} onChange={setEmail} />
                  <ProfileField label="Téléphone" value={phone} editing={editing} onChange={setPhone} />
                  <View><Text style={styles.fieldLabel}>Rôle</Text><View style={styles.roleBadge}><Text style={styles.roleText}>Super administrateur</Text></View></View>
                  <View><Text style={styles.fieldLabel}>Date de création du compte</Text><Text style={styles.fieldValue}>10/08/2026 à 14:35</Text></View>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => setEditing((value) => !value)}><Text style={styles.primaryText}>{editing ? 'Enregistrer les informations' : 'Modifier les informations'}</Text></TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Informations sur l’entreprise</Text>
              <View style={styles.companyGrid}><Info label="Nom de l’entreprise" value="TaKo Transport" /><Info label="Secteur d’activité" value="Transport & Mobilité" /><Info label="Pays" value="République Démocratique du Congo" /><Info label="Ville" value="Kinshasa" /></View>
            </View>
          </View>

          <View style={styles.sideColumn}>
            <View style={styles.card}><Text style={styles.cardTitle}>À propos du compte</Text><InfoRow label="Rôle" value="Super administrateur" /><InfoRow label="Statut du compte" value="Actif" success /><InfoRow label="Dernière connexion" value={new Date().toLocaleString('fr-FR')} /><InfoRow label="Navigateur" value={browser} /><InfoRow label="Appareil" value={Platform.OS === 'web' ? 'Ordinateur' : Platform.OS} /></View>
            <View style={styles.securityCard}><View style={styles.securityTitle}><Ionicons name="shield-checkmark" size={27} color={ACTION} /><Text style={styles.securityHeading}>Conseils de sécurité</Text></View><Text style={styles.securityIntro}>Pour sécuriser votre compte, nous vous recommandons :</Text>{['Utiliser un mot de passe fort', 'Ne jamais partager vos identifiants', 'Activer la double authentification'].map((text) => <View key={text} style={styles.tip}><Ionicons name="checkmark-circle" size={18} color={ACTION} /><Text style={styles.tipText}>{text}</Text></View>)}<TouchableOpacity style={styles.outlineButton} onPress={onOpenSecurity}><Ionicons name="lock-closed-outline" size={18} color={ACTION} /><Text style={[styles.outlineText, { color: ACTION }]}>Changer le mot de passe</Text></TouchableOpacity></View>
          </View>
        </View>
      ) : (
        <View style={styles.card}><Ionicons name={tab === 'security' ? 'shield-checkmark-outline' : tab === 'preferences' ? 'options-outline' : 'time-outline'} size={42} color={ACTION} /><Text style={[styles.cardTitle, { marginTop: 12 }]}>{tab === 'security' ? 'Sécurité du compte' : tab === 'preferences' ? 'Préférences' : 'Activité récente'}</Text><Text style={styles.placeholder}>{tab === 'security' ? 'Gérez votre mot de passe et les options de protection du compte.' : tab === 'preferences' ? 'Configurez la langue et les préférences de l’administration.' : 'Consultez les dernières actions réalisées avec votre compte administrateur.'}</Text>{tab === 'security' ? <TouchableOpacity style={styles.primaryButton} onPress={onOpenSecurity}><Text style={styles.primaryText}>Ouvrir les paramètres de sécurité</Text></TouchableOpacity> : null}</View>
      )}
    </View>
  );
}

function ProfileField({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (value: string) => void }) {
  return <View><Text style={styles.fieldLabel}>{label}</Text>{editing ? <TextInput style={styles.input} value={value} onChangeText={onChange} /> : <Text style={styles.fieldValue}>{value}</Text>}</View>;
}
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.companyItem}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.fieldValue}>{value}</Text></View>; }
function InfoRow({ label, value, success }: { label: string; value: string; success?: boolean }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text>{success ? <View style={styles.activeBadge}><Text style={styles.activeText}>{value}</Text></View> : <Text style={styles.infoValue}>{value}</Text>}</View>; }

const styles = StyleSheet.create({
  page: { gap: 18 }, tabs: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', borderRadius: 9, borderWidth: 1, borderColor: '#E3E9F2', backgroundColor: 'white', paddingHorizontal: 10 }, tab: { minHeight: 64, paddingHorizontal: 22, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: ACTION }, tabText: { color: '#344054', fontSize: 13, fontWeight: '800' }, tabTextActive: { color: ACTION }, columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }, mainColumn: { flex: 2, minWidth: 520, gap: 18 }, sideColumn: { flex: 1, minWidth: 300, gap: 18 }, card: { borderRadius: 10, borderWidth: 1, borderColor: '#E3E9F2', backgroundColor: 'white', padding: 20 }, cardTitle: { color: BLUE, fontSize: 18, fontWeight: '900', marginBottom: 20 }, personalLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 38, flexWrap: 'wrap' }, photoColumn: { width: 220, alignItems: 'center', gap: 14 }, avatar: { width: 158, height: 158, borderRadius: 79, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }, details: { flex: 1, minWidth: 260, gap: 18 }, fieldLabel: { color: '#344054', fontSize: 12, fontWeight: '800', marginBottom: 6 }, fieldValue: { color: BLUE, fontSize: 14, fontWeight: '800' }, input: { minHeight: 42, borderRadius: 7, borderWidth: 1, borderColor: '#CCD6E5', paddingHorizontal: 11, color: BLUE, fontSize: 13 }, roleBadge: { alignSelf: 'flex-start', borderRadius: 6, backgroundColor: '#E8F1FF', paddingHorizontal: 10, paddingVertical: 6 }, roleText: { color: ACTION, fontSize: 12, fontWeight: '900' }, primaryButton: { alignSelf: 'flex-start', minHeight: 44, borderRadius: 7, backgroundColor: ACTION, justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 }, primaryText: { color: 'white', fontSize: 13, fontWeight: '900' }, outlineButton: { minHeight: 42, borderRadius: 7, borderWidth: 1, borderColor: '#CCD6E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 }, outlineText: { color: BLUE, fontSize: 12, fontWeight: '900' }, companyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 }, companyItem: { width: '46%', minWidth: 230, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', paddingBottom: 12 }, infoRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }, infoLabel: { color: '#475467', fontSize: 12 }, infoValue: { flex: 1, color: BLUE, fontSize: 12, fontWeight: '800', textAlign: 'right' }, activeBadge: { borderRadius: 99, backgroundColor: '#DDF8E8', paddingHorizontal: 10, paddingVertical: 5 }, activeText: { color: '#07833C', fontSize: 11, fontWeight: '900' }, securityCard: { borderRadius: 10, borderWidth: 1, borderColor: '#BDD7FF', backgroundColor: '#F5F9FF', padding: 20, gap: 12 }, securityTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 }, securityHeading: { color: ACTION, fontSize: 17, fontWeight: '900' }, securityIntro: { color: '#475467', fontSize: 12 }, tip: { flexDirection: 'row', alignItems: 'center', gap: 8 }, tipText: { color: '#344054', fontSize: 12, fontWeight: '700' }, placeholder: { color: '#667085', fontSize: 14, lineHeight: 21, marginBottom: 14 },
});

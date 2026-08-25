import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createAdminAccount, getAdminAccounts } from '../services/api';

const BLUE = '#061F68';
const ACTION = '#1268E8';
const ADMIN_SESSION_KEY = 'tako:adminSession';

type AdminAccount = { id: string; fullName: string; email: string; role: string; status: 'Actif' | 'En attente' | 'Désactivé'; photoUrl?: string; createdAt?: string };
const roleOptions = ['Super administrateur', 'Administrateur', 'Gestionnaire', 'Agent support', 'Comptable'];

export function AdminRolesManager({ currentAdmin }: { currentAdmin?: any }) {
  const [tab, setTab] = useState<'admins' | 'roles' | 'permissions'>('admins');
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'Administrateur', password: '', status: 'Actif' as 'Actif' | 'Désactivé' });
  const [accounts, setAccounts] = useState<AdminAccount[]>([{ id: 'ADMIN', fullName: currentAdmin?.fullName || 'Admin TaKo', email: currentAdmin?.email || 'contact@takotransport.online', role: 'Super administrateur', status: 'Actif', photoUrl: currentAdmin?.photoUrl, createdAt: currentAdmin?.createdAt }]);
  const filtered = useMemo(() => accounts.filter((item) => `${item.fullName} ${item.email} ${item.role}`.toLowerCase().includes(search.trim().toLowerCase())), [accounts, search]);
  const totals = { all: accounts.length, active: accounts.filter((item) => item.status === 'Actif').length, pending: accounts.filter((item) => item.status === 'En attente').length, disabled: accounts.filter((item) => item.status === 'Désactivé').length };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!token) throw new Error('Session administrateur expirée.');
      const result = await getAdminAccounts(token);
      setAccounts((result.accounts || []).map((item: any) => ({ ...item, status: item.status === 'active' ? 'Actif' : item.status === 'disabled' ? 'Désactivé' : 'En attente' })));
    } catch (error) {
      Alert.alert('Chargement impossible', error instanceof Error ? error.message : 'Impossible de charger les administrateurs.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const createAdministrator = async () => {
    const email = form.email.trim().toLowerCase();
    if (!form.fullName.trim() || !/^\S+@\S+\.\S+$/.test(email) || form.password.length < 8) return Alert.alert('Informations incomplètes', 'Entrez le nom complet, un e-mail valide et un mot de passe temporaire d’au moins 8 caractères.');
    if (accounts.some((item) => item.email.toLowerCase() === email)) return Alert.alert('Compte existant', 'Cette adresse e-mail est déjà utilisée.');
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!token) throw new Error('Session administrateur expirée.');
      await createAdminAccount(token, { fullName: form.fullName.trim(), email, phone: form.phone.trim(), role: form.role, password: form.password, status: form.status });
      setForm({ fullName: '', email: '', phone: '', role: 'Administrateur', password: '', status: 'Actif' });
      await loadAccounts();
      Alert.alert('Administrateur créé', 'Le compte est enregistré et peut maintenant se connecter.');
    } catch (error) {
      Alert.alert('Création impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally { setSaving(false); }
  };

  return <View style={styles.page}>
    <View style={styles.tabs}>{([['admins', 'Administrateurs'], ['roles', 'Rôles'], ['permissions', 'Permissions']] as const).map(([key, label]) => <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View>
    {tab === 'admins' ? <View style={styles.layout}>
      <View style={styles.main}>
        <View style={styles.stats}><Stat icon="people-outline" tone="#F1EAFF" color="#7C3AED" value={totals.all} label="Administrateurs" detail="Total des comptes admins" /><Stat icon="checkmark-circle-outline" tone="#E7F8EE" color="#079455" value={totals.active} label="Actifs" detail="Comptes actifs" /><Stat icon="time-outline" tone="#FFF1E7" color="#F79009" value={totals.pending} label="En attente" detail="Invitations en attente" /><Stat icon="remove-circle-outline" tone="#FEECEC" color="#E5484D" value={totals.disabled} label="Désactivés" detail="Comptes désactivés" /></View>
        <View style={styles.card}>
          <View style={styles.cardHeader}><Text style={styles.cardTitle}>Liste des administrateurs</Text><View style={styles.searchBox}><Ionicons name="search-outline" size={19} color="#667085" /><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher un administrateur…" style={styles.searchInput} /></View></View>
          <View style={[styles.row, styles.tableHead]}><Text style={[styles.headText, styles.adminColumn]}>Administrateur</Text><Text style={[styles.headText, styles.roleColumn]}>Rôle</Text><Text style={[styles.headText, styles.statusColumn]}>Statut</Text><Text style={[styles.headText, styles.dateColumn]}>Créé le</Text><Text style={styles.headText}>Actions</Text></View>
          {loading ? <ActivityIndicator color={ACTION} style={{ marginVertical: 28 }} /> : filtered.map((item) => <View key={item.id} style={styles.row}><View style={[styles.identity, styles.adminColumn]}><View style={styles.avatar}>{item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} /> : <Ionicons name="person" size={21} color="white" />}</View><View style={{ flex: 1 }}><Text style={styles.name}>{item.fullName}</Text><Text style={styles.email}>{item.email}</Text></View></View><View style={styles.roleColumn}><View style={styles.roleBadge}><Text style={styles.roleText}>{item.role}</Text></View></View><View style={styles.statusColumn}><View style={[styles.statusBadge, item.status === 'En attente' && styles.pendingBadge, item.status === 'Désactivé' && styles.disabledBadge]}><Text style={[styles.statusText, item.status === 'En attente' && styles.pendingText, item.status === 'Désactivé' && styles.disabledText]}>● {item.status}</Text></View></View><Text style={[styles.cellText, styles.dateColumn]}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '—'}</Text><TouchableOpacity style={styles.iconButton}><Ionicons name="ellipsis-vertical" size={18} color={BLUE} /></TouchableOpacity></View>)}
          {!loading && !filtered.length ? <Text style={styles.empty}>Aucun administrateur trouvé.</Text> : null}
        </View>
      </View>
      <View style={styles.side}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Créer un administrateur</Text>
          <FormField label="Nom complet *" value={form.fullName} placeholder="Entrez le nom complet" onChange={(fullName) => setForm({ ...form, fullName })} inputMode="text" />
          <FormField label="E-mail *" value={form.email} placeholder="Entrez l’adresse e-mail" onChange={(email) => setForm({ ...form, email })} inputMode="email" />
          <FormField label="Téléphone (optionnel)" value={form.phone} placeholder="Entrez le numéro de téléphone" onChange={(phone) => setForm({ ...form, phone })} inputMode="tel" />
          <Text style={styles.label}>Rôle *</Text><View style={styles.roleChoices}>{roleOptions.map((role) => <TouchableOpacity key={role} style={[styles.roleChoice, form.role === role && styles.roleChoiceActive]} onPress={() => setForm({ ...form, role })}><Text style={[styles.choiceText, form.role === role && styles.choiceTextActive]}>{role}</Text></TouchableOpacity>)}</View>
          <Text style={styles.label}>Mot de passe temporaire *</Text><View style={styles.passwordField}><TextInput style={styles.passwordInput} value={form.password} placeholder="Entrez un mot de passe temporaire" onChangeText={(password) => setForm({ ...form, password })} secureTextEntry={!showPassword} autoComplete="new-password" textContentType="newPassword" importantForAutofill="noExcludeDescendants" /><TouchableOpacity onPress={() => setShowPassword((visible) => !visible)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#667085" /></TouchableOpacity></View>
          <Text style={styles.label}>Statut *</Text><View style={styles.roleChoices}>{(['Actif', 'Désactivé'] as const).map((status) => <TouchableOpacity key={status} style={[styles.roleChoice, form.status === status && styles.roleChoiceActive]} onPress={() => setForm({ ...form, status })}><Text style={[styles.choiceText, form.status === status && styles.choiceTextActive]}>{status}</Text></TouchableOpacity>)}</View>
          <View style={styles.infoBox}><Ionicons name="information-circle-outline" size={22} color={ACTION} /><Text style={styles.infoText}>Le compte sera créé directement. L’administrateur pourra changer son mot de passe après sa première connexion.</Text></View>
          <View style={styles.formActions}><TouchableOpacity style={styles.cancelButton} disabled={saving} onPress={() => setForm({ fullName: '', email: '', phone: '', role: 'Administrateur', password: '', status: 'Actif' })}><Text style={styles.cancelText}>Annuler</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} disabled={saving} onPress={createAdministrator}>{saving ? <ActivityIndicator color="white" /> : <Ionicons name="person-add-outline" size={18} color="white" />}<Text style={styles.primaryText}>{saving ? 'Création…' : 'Créer l’administrateur'}</Text></TouchableOpacity></View>
        </View>
      </View>
    </View> : <RolePanel permissions={tab === 'permissions'} />}
  </View>;
}

function Stat({ icon, tone, color, value, label, detail }: any) { return <View style={styles.stat}><View style={[styles.statIcon, { backgroundColor: tone }]}><Ionicons name={icon} size={27} color={color} /></View><View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text><Text style={styles.statDetail}>{detail}</Text></View></View>; }
function FormField({ label, value, placeholder, onChange, multiline, inputMode }: any) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline && styles.textarea]} value={value} placeholder={placeholder} onChangeText={onChange} multiline={multiline} inputMode={inputMode} autoComplete="off" textContentType="none" importantForAutofill="noExcludeDescendants" /></View>; }
function RolePanel({ permissions }: { permissions: boolean }) { return <View style={styles.card}><Text style={styles.cardTitle}>{permissions ? 'Matrice des permissions' : 'Gestion des rôles'}</Text><Text style={styles.panelIntro}>{permissions ? 'Consultez les droits associés à chaque rôle administrateur.' : 'Les rôles disponibles définissent le niveau d’accès à la plateforme.'}</Text>{roleOptions.map((role, index) => <View key={role} style={styles.permissionRow}><View><Text style={styles.name}>{role}</Text><Text style={styles.email}>{index === 0 ? 'Toutes les fonctionnalités' : 'Accès limité selon les responsabilités'}</Text></View><View style={styles.roleBadge}><Text style={styles.roleText}>{permissions ? (index === 0 ? 'Accès total' : 'Accès contrôlé') : `${index + 1} niveau`}</Text></View></View>)}</View>; }

const styles = StyleSheet.create({
  page: { gap: 18 }, tabs: { minHeight: 58, flexDirection: 'row', backgroundColor: 'white', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 9, paddingHorizontal: 10 }, tab: { justifyContent: 'center', paddingHorizontal: 25, borderBottomWidth: 3, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: ACTION }, tabText: { color: '#475467', fontSize: 13, fontWeight: '600' }, tabTextActive: { color: ACTION },
  layout: { flexDirection: 'row', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }, main: { flex: 3, minWidth: 620, gap: 18 }, side: { flex: 1, minWidth: 300, gap: 18 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { flex: 1, minWidth: 175, minHeight: 108, backgroundColor: 'white', borderRadius: 9, borderWidth: 1, borderColor: '#E5EAF2', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 }, statIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, statValue: { color: BLUE, fontSize: 22, fontWeight: '700' }, statLabel: { color: BLUE, fontSize: 13, fontWeight: '600' }, statDetail: { color: '#667085', fontSize: 10, marginTop: 3 },
  card: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 9, padding: 18 }, cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 14 }, cardTitle: { color: BLUE, fontSize: 17, fontWeight: '700', marginBottom: 14 }, searchBox: { minWidth: 270, height: 40, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 }, searchInput: { flex: 1, color: BLUE, fontSize: 12, outlineStyle: 'none' } as any,
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', paddingVertical: 10 }, tableHead: { minHeight: 42 }, headText: { color: '#344054', fontSize: 11, fontWeight: '700' }, adminColumn: { flex: 2, minWidth: 190 }, roleColumn: { flex: 1.15, minWidth: 120 }, statusColumn: { flex: .8, minWidth: 90 }, dateColumn: { flex: .8, minWidth: 90 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, name: { color: BLUE, fontSize: 12, fontWeight: '700' }, email: { color: '#667085', fontSize: 10, marginTop: 3 }, roleBadge: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#EEE9FF' }, roleText: { color: '#6938EF', fontSize: 10, fontWeight: '600' }, statusBadge: { alignSelf: 'flex-start', borderRadius: 5, backgroundColor: '#E7F8EE', paddingHorizontal: 8, paddingVertical: 5 }, statusText: { color: '#07833C', fontSize: 10, fontWeight: '600' }, pendingBadge: { backgroundColor: '#FFF1E7' }, pendingText: { color: '#DC6803' }, disabledBadge: { backgroundColor: '#FEECEC' }, disabledText: { color: '#D92D20' }, cellText: { color: '#475467', fontSize: 11 }, iconButton: { width: 34, height: 34, borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, empty: { color: '#667085', textAlign: 'center', paddingVertical: 28 },
  field: { gap: 6, marginBottom: 13 }, label: { color: '#344054', fontSize: 11, fontWeight: '700' }, input: { minHeight: 42, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, paddingHorizontal: 11, color: BLUE, fontSize: 12, outlineStyle: 'none' } as any, textarea: { minHeight: 72, paddingTop: 10, textAlignVertical: 'top' }, roleChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 14 }, roleChoice: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: '#D7DFEA' }, roleChoiceActive: { borderColor: ACTION, backgroundColor: '#EAF3FF' }, choiceText: { color: '#475467', fontSize: 10, fontWeight: '500' }, choiceTextActive: { color: ACTION }, primaryButton: { minHeight: 44, borderRadius: 7, backgroundColor: ACTION, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, primaryText: { color: 'white', fontSize: 12, fontWeight: '700' },
  passwordField: { minHeight: 42, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, paddingHorizontal: 11, marginTop: 6, marginBottom: 13, flexDirection: 'row', alignItems: 'center' }, passwordInput: { flex: 1, color: BLUE, fontSize: 12, outlineStyle: 'none' } as any, infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 7, backgroundColor: '#EEF5FF', padding: 12, marginBottom: 15 }, infoText: { flex: 1, color: '#344054', fontSize: 10, lineHeight: 16, fontWeight: '500' }, formActions: { flexDirection: 'row', alignItems: 'center', gap: 9 }, cancelButton: { flex: .7, minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: '#D7DFEA', alignItems: 'center', justifyContent: 'center' }, cancelText: { color: BLUE, fontSize: 12, fontWeight: '700' }, panelIntro: { color: '#667085', fontSize: 12, marginBottom: 16 }, permissionRow: { minHeight: 70, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
});

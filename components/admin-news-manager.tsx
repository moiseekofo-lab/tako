import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { deleteAdminNews, getAdminNews, saveAdminNews, type NewsItem } from '../services/api';

const BLUE = '#061F68';
const ACTION = '#1268E8';
const ADMIN_SESSION_KEY = 'tako:adminSession';
const emptyForm: Partial<NewsItem> = {
  title: '', content: '', category: 'Information', imageUrl: '', status: 'draft',
  publishStart: null, publishEnd: null,
};

export function AdminNewsManager() {
  const { width } = useWindowDimensions();
  const compact = width < 1150;
  const [items, setItems] = useState<NewsItem[]>([]);
  const [form, setForm] = useState<Partial<NewsItem>>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'all' | 'scheduled' | NewsItem['status']>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');

  const categories = ['Toutes', ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))];
  const filteredItems = items.filter((item) => {
    const isScheduled = item.status === 'published' && Boolean(item.publishStart) && new Date(item.publishStart!).getTime() > Date.now();
    const matchesTab = tab === 'all' || (tab === 'scheduled' ? isScheduled : item.status === tab);
    const matchesCategory = categoryFilter === 'Toutes' || item.category === categoryFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${item.title} ${item.content} ${item.category}`.toLowerCase().includes(term);
    return matchesTab && matchesCategory && matchesSearch;
  });

  const load = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!token) throw new Error('Session administrateur expirée.');
      const result = await getAdminNews(token);
      setItems(result?.news || []);
    } catch (error) {
      Alert.alert('Actualités indisponibles', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectImage = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Image', 'Collez l’adresse publique de l’image dans le champ Image / bannière.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        Alert.alert('Image trop lourde', 'Choisissez une image de 2 Mo maximum.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setForm((current) => ({ ...current, imageUrl: String(reader.result || '') }));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const save = async () => {
    if (!form.title?.trim() || !form.imageUrl?.trim()) {
      Alert.alert('Informations manquantes', 'Le titre et l’image sont obligatoires.');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!token) throw new Error('Session administrateur expirée.');
      await saveAdminNews(token, form);
      setForm(emptyForm);
      setEditing(false);
      await load();
      Alert.alert('Actualité enregistrée', form.status === 'published' ? 'Elle est maintenant visible dans l’application.' : 'Elle a été enregistrée comme brouillon.');
    } catch (error) {
      Alert.alert('Enregistrement impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: NewsItem) => {
    setForm(item);
    setEditing(true);
  };

  const remove = async (item: NewsItem) => {
    const execute = async () => {
      try {
        const token = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
        if (!token) throw new Error('Session administrateur expirée.');
        await deleteAdminNews(token, item.id);
        if (form.id === item.id) { setForm(emptyForm); setEditing(false); }
        await load();
      } catch (error) {
        Alert.alert('Suppression impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Supprimer définitivement « ${item.title} » ?`)) await execute();
      return;
    }
    Alert.alert('Supprimer cette actualité ?', item.title, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: execute },
    ]);
  };

  return (
    <View style={styles.page}>
      <View style={styles.heading}>
        <TouchableOpacity style={styles.primary} onPress={() => { setForm(emptyForm); setEditing(true); }}>
          <Ionicons name="add" size={20} color="white" /><Text style={styles.primaryText}>Nouvelle actualité</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.workspace}>
        <View style={styles.mainPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {([
              ['all', 'Toutes'], ['published', 'Publiées'], ['scheduled', 'Programmées'], ['draft', 'Brouillons'], ['archived', 'Archivées'],
            ] as const).map(([key, label]) => <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text></TouchableOpacity>)}
          </ScrollView>

          <View style={styles.filters}>
            <View style={styles.searchBox}><Ionicons name="search-outline" size={20} color="#667085" /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher une actualité…" /></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilters}>
              {categories.map((category) => <TouchableOpacity key={category} style={[styles.filterChip, categoryFilter === category && styles.filterChipActive]} onPress={() => setCategoryFilter(category)}><Text style={[styles.filterChipText, categoryFilter === category && styles.filterChipTextActive]}>{category}</Text></TouchableOpacity>)}
              <TouchableOpacity style={styles.resetButton} onPress={() => { setSearch(''); setCategoryFilter('Toutes'); setTab('all'); }}><Ionicons name="refresh-outline" size={17} color={BLUE} /><Text style={styles.resetText}>Réinitialiser</Text></TouchableOpacity>
            </ScrollView>
          </View>

          {loading ? <ActivityIndicator size="large" color={BLUE} style={{ marginVertical: 60 }} /> : filteredItems.length === 0 ? (
            <View style={styles.empty}><Ionicons name="megaphone-outline" size={40} color={ACTION} /><Text style={styles.emptyTitle}>Aucune actualité trouvée</Text><Text style={styles.emptyText}>Créez une actualité ou modifiez les filtres.</Text></View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}><Text style={[styles.th, styles.newsColumn]}>Actualité</Text><Text style={[styles.th, styles.categoryColumn]}>Catégorie</Text><Text style={[styles.th, styles.statusColumn]}>Statut</Text><Text style={[styles.th, styles.periodColumn]}>Période de publication</Text><Text style={[styles.th, styles.authorColumn]}>Créée par</Text><Text style={[styles.th, styles.actionColumn]}>Actions</Text></View>
                {filteredItems.map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <View style={[styles.newsCell, styles.newsColumn]}><Image source={{ uri: item.imageUrl }} style={styles.thumbnail} resizeMode="cover" /><View style={styles.newsText}><Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.cardContent} numberOfLines={2}>{item.content || 'Aucun contenu'}</Text></View></View>
                    <View style={styles.categoryColumn}><View style={styles.categoryBadge}><Text style={styles.category}>{item.category}</Text></View></View>
                    <View style={styles.statusColumn}><View style={[styles.badge, item.status === 'published' ? styles.published : item.status === 'archived' ? styles.archived : styles.draft]}><Text style={styles.badgeText}>● {item.status === 'published' ? 'Publié' : item.status === 'archived' ? 'Archivé' : 'Brouillon'}</Text></View></View>
                    <Text style={[styles.cellText, styles.periodColumn]}>{item.publishStart ? new Date(item.publishStart).toLocaleString('fr-FR') : 'Immédiatement'}{item.publishEnd ? `\nau ${new Date(item.publishEnd).toLocaleString('fr-FR')}` : ''}</Text>
                    <Text style={[styles.cellText, styles.authorColumn]}>{item.createdBy || 'Admin TaKo'}{item.createdAt ? `\n${new Date(item.createdAt).toLocaleDateString('fr-FR')}` : ''}</Text>
                    <View style={[styles.rowActions, styles.actionColumn]}><TouchableOpacity style={styles.iconButton} onPress={() => edit(item)}><Ionicons name="create-outline" size={18} color={ACTION} /></TouchableOpacity><TouchableOpacity style={styles.iconButton} onPress={() => remove(item)}><Ionicons name="trash-outline" size={18} color="#C92A2A" /></TouchableOpacity></View>
                  </View>
                ))}
                <View style={styles.tableFooter}><Text style={styles.footerText}>Affichage de {filteredItems.length} sur {items.length} actualité(s)</Text></View>
              </View>
            </ScrollView>
          )}
        </View>

        {editing && (
          <View style={[styles.editor, compact && styles.editorCompact]}>
            <View style={styles.editorHead}><Text style={styles.editorTitle}>{form.id ? 'Modifier l’actualité' : 'Nouvelle actualité'}</Text><TouchableOpacity onPress={() => setEditing(false)}><Ionicons name="close" size={23} color={BLUE} /></TouchableOpacity></View>
            <Text style={styles.label}>Titre *</Text><TextInput style={styles.input} value={form.title || ''} maxLength={100} onChangeText={(title) => setForm({ ...form, title })} placeholder="Entrez le titre de l’actualité" /><Text style={styles.counter}>{form.title?.length || 0}/100</Text>
            <Text style={styles.label}>Catégorie *</Text><TextInput style={styles.input} value={form.category || ''} onChangeText={(category) => setForm({ ...form, category })} placeholder="Sélectionner une catégorie" />
            <Text style={styles.label}>Image / Bannière *</Text><TouchableOpacity style={styles.dropzone} onPress={selectImage}>{form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={styles.preview} resizeMode="cover" /> : <><Ionicons name="cloud-upload-outline" size={34} color={ACTION} /><Text style={styles.dropTitle}>Glissez-déposez une image ici</Text><Text style={styles.dropText}>ou cliquez pour parcourir</Text><Text style={styles.dropHint}>Format 16:9 (1200×675) · JPG, PNG, WebP · Max 2 Mo</Text></>}</TouchableOpacity><TextInput style={[styles.input, styles.urlInput]} value={form.imageUrl || ''} onChangeText={(imageUrl) => setForm({ ...form, imageUrl })} placeholder="Ou collez l’URL de l’image" />
            <Text style={styles.label}>Contenu *</Text><TextInput style={[styles.input, styles.textarea]} multiline value={form.content || ''} onChangeText={(content) => setForm({ ...form, content })} placeholder="Écrivez le contenu de l’actualité…" />
            <Text style={styles.label}>Période de publication</Text><View style={styles.row}><TextInput style={[styles.input, styles.dateInput]} value={form.publishStart || ''} onChangeText={(publishStart) => setForm({ ...form, publishStart: publishStart || null })} placeholder="Date de début" /><TextInput style={[styles.input, styles.dateInput]} value={form.publishEnd || ''} onChangeText={(publishEnd) => setForm({ ...form, publishEnd: publishEnd || null })} placeholder="Date de fin" /></View>
            <Text style={styles.label}>Statut</Text><View style={styles.statusRow}>{(['draft', 'published', 'archived'] as const).map((status) => <TouchableOpacity key={status} style={[styles.statusButton, form.status === status && styles.statusButtonActive]} onPress={() => setForm({ ...form, status })}><Text style={[styles.statusText, form.status === status && styles.statusTextActive]}>{status === 'draft' ? 'Brouillon' : status === 'published' ? 'Publié' : 'Archivé'}</Text></TouchableOpacity>)}</View>
            <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={() => setEditing(false)}><Text style={styles.cancelText}>Annuler</Text></TouchableOpacity><TouchableOpacity style={styles.primary} disabled={saving} onPress={save}><Text style={styles.primaryText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text></TouchableOpacity></View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18 },
  heading: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  primary: { minHeight: 46, borderRadius: 8, backgroundColor: ACTION, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: 'white', fontSize: 14, fontWeight: '900' },
  workspace: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  mainPanel: { flex: 1, minWidth: 520, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white', overflow: 'hidden' },
  tabs: { minHeight: 58, alignItems: 'stretch', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E8EDF4' },
  tab: { paddingHorizontal: 20, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: ACTION },
  tabText: { color: '#475467', fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: ACTION },
  filters: { padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E8EDF4' },
  searchBox: { height: 44, maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#D6DEEA', borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 42, color: '#14213D', fontSize: 13, outlineStyle: 'none' } as any,
  categoryFilters: { alignItems: 'center', gap: 8 },
  filterChip: { minHeight: 36, borderWidth: 1, borderColor: '#D6DEEA', borderRadius: 7, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#EAF3FF', borderColor: ACTION },
  filterChipText: { color: '#667085', fontSize: 12, fontWeight: '800' },
  filterChipTextActive: { color: ACTION },
  resetButton: { minHeight: 36, marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  resetText: { color: BLUE, fontSize: 12, fontWeight: '900' },
  table: { minWidth: 1050 },
  tableRow: { minHeight: 94, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEF2F6', paddingHorizontal: 14 },
  tableHeader: { minHeight: 52, backgroundColor: '#FAFBFD' },
  th: { color: BLUE, fontSize: 12, fontWeight: '900' },
  newsColumn: { width: 310 }, categoryColumn: { width: 125 }, statusColumn: { width: 115 }, periodColumn: { width: 190 }, authorColumn: { width: 145 }, actionColumn: { width: 105 },
  newsCell: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnail: { width: 88, height: 58, borderRadius: 7, backgroundColor: '#EAF1FB' },
  newsText: { width: 195 },
  cardTitle: { color: BLUE, fontSize: 13, fontWeight: '900' },
  cardContent: { color: '#667085', fontSize: 11, lineHeight: 16, marginTop: 4 },
  categoryBadge: { alignSelf: 'flex-start', borderRadius: 5, backgroundColor: '#EDF5FF', paddingHorizontal: 8, paddingVertical: 5 },
  category: { color: ACTION, fontSize: 11, fontWeight: '900' },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  published: { backgroundColor: '#DDF8E8' }, draft: { backgroundColor: '#FFF1CF' }, archived: { backgroundColor: '#E8EAF0' },
  badgeText: { color: '#344054', fontSize: 10, fontWeight: '900' },
  cellText: { color: '#475467', fontSize: 11, lineHeight: 17 },
  rowActions: { flexDirection: 'row', gap: 7 },
  iconButton: { width: 36, height: 36, borderRadius: 7, borderWidth: 1, borderColor: '#DCE4F1', alignItems: 'center', justifyContent: 'center' },
  tableFooter: { minHeight: 54, justifyContent: 'center', paddingHorizontal: 14 },
  footerText: { color: '#667085', fontSize: 12 },
  editor: { width: 370, borderRadius: 10, backgroundColor: 'white', padding: 17, borderWidth: 1, borderColor: '#DCE4F1', gap: 8 },
  editorCompact: { width: '100%' },
  editorHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5 },
  editorTitle: { color: BLUE, fontSize: 17, fontWeight: '900' },
  label: { color: BLUE, fontSize: 12, fontWeight: '900', marginTop: 4 },
  input: { minHeight: 42, borderRadius: 7, borderWidth: 1, borderColor: '#D6DEEA', paddingHorizontal: 11, color: '#14213D', fontSize: 12, backgroundColor: 'white', outlineStyle: 'none' } as any,
  counter: { color: '#98A2B3', fontSize: 10, textAlign: 'right', marginTop: -5 },
  textarea: { minHeight: 112, paddingTop: 10, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, minWidth: 0 },
  statusRow: { minHeight: 42, flexDirection: 'row', gap: 5 },
  statusButton: { flex: 1, borderWidth: 1, borderColor: '#D6DEEA', borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  statusButtonActive: { backgroundColor: BLUE, borderColor: BLUE },
  statusText: { color: '#667085', fontSize: 11, fontWeight: '800' }, statusTextActive: { color: 'white' },
  dropzone: { minHeight: 150, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#AFC0D8', backgroundColor: '#FAFCFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 },
  preview: { width: '100%', height: 158, borderRadius: 6 },
  dropTitle: { color: ACTION, fontSize: 12, fontWeight: '900', marginTop: 7 },
  dropText: { color: ACTION, fontSize: 11, marginTop: 2 },
  dropHint: { color: '#98A2B3', fontSize: 9, marginTop: 6, textAlign: 'center' },
  urlInput: { marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  cancel: { minHeight: 46, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: BLUE, fontWeight: '900', fontSize: 13 },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyTitle: { color: BLUE, fontSize: 17, fontWeight: '900', marginTop: 10 },
  emptyText: { color: '#667085', textAlign: 'center', marginTop: 5 },
});

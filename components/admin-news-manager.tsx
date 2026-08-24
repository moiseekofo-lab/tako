import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { deleteAdminNews, getAdminNews, saveAdminNews, type NewsItem } from '../services/api';

const BLUE = '#061F68';
const ACTION = '#1268E8';
const ADMIN_SESSION_KEY = 'tako:adminSession';
const emptyForm: Partial<NewsItem> = {
  title: '', content: '', category: 'Information', imageUrl: '', status: 'draft',
  publishStart: null, publishEnd: null,
};

export function AdminNewsManager() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [form, setForm] = useState<Partial<NewsItem>>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        <View><Text style={styles.title}>Actualités</Text><Text style={styles.subtitle}>Gérez les bannières réellement affichées dans l’application TaKo.</Text></View>
        <TouchableOpacity style={styles.primary} onPress={() => { setForm(emptyForm); setEditing(true); }}>
          <Ionicons name="add" size={20} color="white" /><Text style={styles.primaryText}>Nouvelle actualité</Text>
        </TouchableOpacity>
      </View>

      {editing && (
        <View style={styles.editor}>
          <View style={styles.editorHead}><Text style={styles.editorTitle}>{form.id ? 'Modifier l’actualité' : 'Nouvelle actualité'}</Text><TouchableOpacity onPress={() => setEditing(false)}><Ionicons name="close" size={25} color={BLUE} /></TouchableOpacity></View>
          <Text style={styles.label}>Titre *</Text>
          <TextInput style={styles.input} value={form.title || ''} maxLength={100} onChangeText={(title) => setForm({ ...form, title })} placeholder="Entrez le titre" />
          <View style={styles.row}>
            <View style={styles.flex}><Text style={styles.label}>Catégorie</Text><TextInput style={styles.input} value={form.category || ''} onChangeText={(category) => setForm({ ...form, category })} placeholder="Information, Promotion…" /></View>
            <View style={styles.flex}><Text style={styles.label}>Statut</Text><View style={styles.statusRow}>{(['draft', 'published', 'archived'] as const).map((status) => <TouchableOpacity key={status} style={[styles.statusButton, form.status === status && styles.statusButtonActive]} onPress={() => setForm({ ...form, status })}><Text style={[styles.statusText, form.status === status && styles.statusTextActive]}>{status === 'draft' ? 'Brouillon' : status === 'published' ? 'Publié' : 'Archivé'}</Text></TouchableOpacity>)}</View></View>
          </View>
          <Text style={styles.label}>Image / bannière *</Text>
          <View style={styles.imageRow}><TextInput style={[styles.input, styles.flex]} value={form.imageUrl || ''} onChangeText={(imageUrl) => setForm({ ...form, imageUrl })} placeholder="URL de l’image ou sélectionnez un fichier" /><TouchableOpacity style={styles.upload} onPress={selectImage}><Ionicons name="cloud-upload-outline" size={20} color={ACTION} /><Text style={styles.uploadText}>Parcourir</Text></TouchableOpacity></View>
          {!!form.imageUrl && <Image source={{ uri: form.imageUrl }} style={styles.preview} resizeMode="cover" />}
          <Text style={styles.label}>Contenu</Text>
          <TextInput style={[styles.input, styles.textarea]} multiline value={form.content || ''} onChangeText={(content) => setForm({ ...form, content })} placeholder="Écrivez le contenu de l’actualité…" />
          <View style={styles.row}>
            <View style={styles.flex}><Text style={styles.label}>Début de publication</Text><TextInput style={styles.input} value={form.publishStart || ''} onChangeText={(publishStart) => setForm({ ...form, publishStart: publishStart || null })} placeholder="2026-08-24T18:00:00-03:00" /></View>
            <View style={styles.flex}><Text style={styles.label}>Fin de publication</Text><TextInput style={styles.input} value={form.publishEnd || ''} onChangeText={(publishEnd) => setForm({ ...form, publishEnd: publishEnd || null })} placeholder="Facultatif" /></View>
          </View>
          <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={() => setEditing(false)}><Text style={styles.cancelText}>Annuler</Text></TouchableOpacity><TouchableOpacity style={styles.primary} disabled={saving} onPress={save}><Text style={styles.primaryText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text></TouchableOpacity></View>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color={BLUE} /> : (
        <ScrollView horizontal contentContainerStyle={styles.list}>
          {items.length === 0 ? <View style={styles.empty}><Ionicons name="megaphone-outline" size={40} color={ACTION} /><Text style={styles.emptyTitle}>Aucune actualité enregistrée</Text><Text style={styles.emptyText}>Créez la première bannière qui apparaîtra dans l’application.</Text></View> : items.map((item) => (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.cardBody}><View style={styles.cardTop}><Text style={styles.cardTitle}>{item.title}</Text><View style={[styles.badge, item.status === 'published' ? styles.published : item.status === 'archived' ? styles.archived : styles.draft]}><Text style={styles.badgeText}>{item.status === 'published' ? 'Publié' : item.status === 'archived' ? 'Archivé' : 'Brouillon'}</Text></View></View><Text style={styles.category}>{item.category}</Text><Text style={styles.cardContent} numberOfLines={3}>{item.content || 'Aucun contenu'}</Text><Text style={styles.meta}>Mis à jour : {item.updatedAt ? new Date(item.updatedAt).toLocaleString('fr-FR') : '—'}</Text><View style={styles.cardActions}><TouchableOpacity style={styles.edit} onPress={() => edit(item)}><Ionicons name="create-outline" size={18} color={ACTION} /><Text style={styles.editText}>Modifier</Text></TouchableOpacity><TouchableOpacity style={styles.delete} onPress={() => remove(item)}><Ionicons name="trash-outline" size={18} color="#C92A2A" /><Text style={styles.deleteText}>Effacer</Text></TouchableOpacity></View></View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20 }, heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }, title: { color: BLUE, fontSize: 24, fontWeight: '900' }, subtitle: { color: '#667085', fontSize: 14, marginTop: 4 }, primary: { minHeight: 46, borderRadius: 8, backgroundColor: ACTION, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, primaryText: { color: 'white', fontSize: 14, fontWeight: '900' }, editor: { borderRadius: 12, backgroundColor: 'white', padding: 20, borderWidth: 1, borderColor: '#DCE4F1', gap: 9 }, editorHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, editorTitle: { color: BLUE, fontSize: 20, fontWeight: '900' }, label: { color: BLUE, fontSize: 13, fontWeight: '900', marginTop: 5 }, input: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: '#D6DEEA', paddingHorizontal: 13, color: '#14213D', fontSize: 14, backgroundColor: 'white' }, textarea: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' }, flex: { flex: 1, minWidth: 240 }, statusRow: { minHeight: 46, flexDirection: 'row', gap: 6 }, statusButton: { flex: 1, borderWidth: 1, borderColor: '#D6DEEA', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, statusButtonActive: { backgroundColor: BLUE, borderColor: BLUE }, statusText: { color: '#667085', fontSize: 12, fontWeight: '800' }, statusTextActive: { color: 'white' }, imageRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }, upload: { minHeight: 46, borderWidth: 1, borderColor: ACTION, borderRadius: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 }, uploadText: { color: ACTION, fontWeight: '900' }, preview: { width: '100%', maxWidth: 520, aspectRatio: 16 / 9, borderRadius: 10, marginTop: 5 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }, cancel: { minHeight: 46, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: BLUE, fontWeight: '900' }, list: { gap: 16, paddingBottom: 10 }, card: { width: 330, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', borderWidth: 1, borderColor: '#DCE4F1' }, cardImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#EAF1FB' }, cardBody: { padding: 14 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, cardTitle: { flex: 1, color: BLUE, fontSize: 16, fontWeight: '900' }, badge: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 }, published: { backgroundColor: '#DDF8E8' }, draft: { backgroundColor: '#FFF1CF' }, archived: { backgroundColor: '#E8EAF0' }, badgeText: { color: '#344054', fontSize: 10, fontWeight: '900' }, category: { color: ACTION, fontSize: 12, fontWeight: '900', marginTop: 7 }, cardContent: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 7, minHeight: 55 }, meta: { color: '#98A2B3', fontSize: 11, marginTop: 8 }, cardActions: { flexDirection: 'row', gap: 8, marginTop: 13 }, edit: { flex: 1, minHeight: 40, borderRadius: 7, borderWidth: 1, borderColor: ACTION, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, editText: { color: ACTION, fontWeight: '900' }, delete: { flex: 1, minHeight: 40, borderRadius: 7, borderWidth: 1, borderColor: '#F3B7B7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, deleteText: { color: '#C92A2A', fontWeight: '900' }, empty: { width: 480, minHeight: 230, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#DCE4F1', padding: 30 }, emptyTitle: { color: BLUE, fontSize: 18, fontWeight: '900', marginTop: 10 }, emptyText: { color: '#667085', textAlign: 'center', marginTop: 5 },
});

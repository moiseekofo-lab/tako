import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type AdminAction = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean; disabled?: boolean };
export function AdminActionMenu({ actions, label = 'Actions' }: { actions: AdminAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return <><TouchableOpacity accessibilityLabel={label} style={styles.trigger} onPress={() => setOpen(true)}><Ionicons name="ellipsis-vertical" size={18} color="#061F68" /></TouchableOpacity><Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}><TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={() => setOpen(false)}><View style={styles.menu}>{actions.filter((action) => !action.disabled).map((action) => <TouchableOpacity key={action.label} style={styles.item} onPress={() => { setOpen(false); action.onPress(); }}><Ionicons name={action.icon} size={18} color={action.danger ? '#D92D20' : '#1268E8'} /><Text style={[styles.text, action.danger && styles.danger]}>{action.label}</Text></TouchableOpacity>)}</View></TouchableOpacity></Modal></>;
}
const styles = StyleSheet.create({ trigger: { width: 30, height: 30, alignSelf: 'center', borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, backdrop: { flex: 1, backgroundColor: 'rgba(6,31,104,.18)', alignItems: 'center', justifyContent: 'center', padding: 20 }, menu: { width: 250, borderRadius: 10, backgroundColor: 'white', padding: 7, shadowColor: '#061F68', shadowOpacity: .22, shadowRadius: 18, elevation: 12 }, item: { minHeight: 43, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }, text: { color: '#061F68', fontSize: 12, fontWeight: '600' }, danger: { color: '#D92D20' } });

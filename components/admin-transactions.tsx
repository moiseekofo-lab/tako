import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAdminTransactions } from '../services/api';

const NAVY = '#061F68';
const BLUE = '#1268E8';
const GREEN = '#079455';
const SESSION_KEY = 'tako:adminSession';
type Tab = 'all' | 'payment' | 'recharge' | 'payout' | 'refund';

export function AdminTransactions() {
  const [data, setData] = useState<any>({ transactions: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const load = async () => { try { setLoading(true); const token = await AsyncStorage.getItem(SESSION_KEY); if (token) setData(await getAdminTransactions(token)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const rows = useMemo(() => (data.transactions || []).filter((item: any) => {
    const text = `${item.id} ${item.userName} ${item.phone} ${item.route} ${item.method}`.toLowerCase();
    return text.includes(search.trim().toLowerCase()) && (tab === 'all' || item.type === tab) && (status === 'all' || item.status === status) && (method === 'all' || item.method === method);
  }), [data.transactions, method, search, status, tab]);
  const stats = data.stats || {};
  const tabs: [Tab, string][] = [['all', 'Toutes les transactions'], ['payment', 'Paiements'], ['recharge', 'Recharges'], ['payout', 'Versements'], ['refund', 'Remboursements']];
  return <View style={styles.page}>
    <View style={styles.actions}><TouchableOpacity style={styles.secondary} onPress={() => Alert.alert('Exporter', 'L’export des transactions sera téléchargé depuis cette page.')}><Ionicons name="download-outline" size={18} color={NAVY} /><Text style={styles.secondaryText}>Exporter</Text></TouchableOpacity><TouchableOpacity style={styles.primary} onPress={() => Alert.alert('Rapport des transactions', 'Le rapport utilise les transactions affichées sur cette page.')}><Ionicons name="bar-chart-outline" size={18} color="white" /><Text style={styles.primaryText}>Rapport des transactions</Text></TouchableOpacity></View>
    <View style={styles.metrics}>
      <Metric icon="swap-horizontal-outline" label="Total transactions" value={stats.total} color={BLUE} />
      <Metric icon="arrow-down-outline" label="Paiements" value={stats.payments} color={GREEN} />
      <Metric icon="trending-up-outline" label="Recharges" value={stats.recharges} color="#7C3AED" />
      <Metric icon="business-outline" label="Versements" value={stats.payouts} color="#E97912" />
      <Metric icon="wallet-outline" label="Montant total" value={`${Number(stats.totalAmount || 0).toLocaleString('fr-FR')} FC`} color={GREEN} />
    </View>
    <View style={styles.filters}>
      <View style={styles.search}><Ionicons name="search-outline" size={18} color="#667085" /><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une transaction…" style={styles.searchInput} /></View>
      <Filter label="Statut" value={status} options={[['all', 'Tous'], ['accepted', 'Réussies'], ['pending', 'En attente'], ['failed', 'Échouées']]} onChange={setStatus} />
      <Filter label="Méthode" value={method} options={[['all', 'Toutes'], ['qr', 'QR Code'], ['nfc', 'NFC'], ['internal_recharge', 'Recharge']]} onChange={setMethod} />
      <TouchableOpacity style={styles.secondary} onPress={() => { setSearch(''); setStatus('all'); setMethod('all'); setTab('all'); }}><Ionicons name="refresh-outline" size={17} color={NAVY} /><Text style={styles.secondaryText}>Réinitialiser</Text></TouchableOpacity>
    </View>
    <View style={styles.card}>
      <View style={styles.tabs}>{tabs.map(([key, label]) => <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View>
      <View style={[styles.row, styles.header]}>{['Référence', 'Type', 'Client / Chauffeur', 'Méthode', 'Montant', 'Statut', 'Date et heure', 'Actions'].map((title) => <Text key={title} style={styles.th}>{title}</Text>)}</View>
      {loading ? <ActivityIndicator color={BLUE} style={{ margin: 35 }} /> : rows.length ? rows.map((item: any) => <View key={item.id} style={styles.row}>
        <Text numberOfLines={1} style={styles.cell}>{item.id}</Text><View style={styles.cellBox}><Text style={styles.strong}>{typeLabel(item.type)}</Text><Text style={styles.muted}>{item.route || 'Opération TaKo'}</Text></View><View style={styles.cellBox}><Text style={styles.strong}>{item.userName}</Text><Text style={styles.muted}>{item.phone || item.clientId || item.driverId}</Text></View><Text style={styles.cell}>{methodLabel(item.method)}</Text><Text style={[styles.cell, item.type === 'recharge' ? styles.credit : styles.debit]}>{item.type === 'recharge' ? '+' : '-'} {Number(item.amount).toLocaleString('fr-FR')} FC</Text><View style={styles.cellBox}><Text style={item.status === 'accepted' ? styles.success : item.status === 'pending' ? styles.pending : styles.failed}>● {item.status === 'accepted' ? 'Réussie' : item.status === 'pending' ? 'En attente' : 'Échouée'}</Text></View><Text style={styles.cell}>{new Date(item.createdAt).toLocaleString('fr-FR')}</Text><View style={styles.cellBox}><TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert('Transaction', `${item.id}\n${item.userName}\n${Number(item.amount).toLocaleString('fr-FR')} FC`)}><Ionicons name="eye-outline" size={17} color={NAVY} /></TouchableOpacity></View>
      </View>) : <View style={styles.empty}><Ionicons name="receipt-outline" size={34} color="#98A2B3" /><Text style={styles.muted}>Aucune transaction trouvée.</Text></View>}
    </View>
  </View>;
}

function typeLabel(type: string) { return type === 'recharge' ? 'Recharge' : type === 'payout' ? 'Versement' : type === 'refund' ? 'Remboursement' : 'Paiement'; }
function methodLabel(method: string) { return method === 'nfc' ? 'NFC' : method === 'qr' ? 'QR Code' : method === 'internal_recharge' ? 'Agent TaKo' : method || '—'; }
function Metric({ icon, label, value, color }: any) { return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}><Ionicons name={icon} size={24} color={color} /></View><View><Text style={styles.muted}>{label}</Text><Text style={styles.metricValue}>{Number.isFinite(Number(value)) ? Number(value).toLocaleString('fr-FR') : value}</Text></View></View>; }
function Filter({ label, value, options, onChange }: any) { const index = Math.max(0, options.findIndex(([key]: string[]) => key === value)); return <TouchableOpacity style={styles.filter} onPress={() => onChange(options[(index + 1) % options.length][0])}><View><Text style={styles.filterLabel}>{label}</Text><Text style={styles.filterValue}>{options[index][1]}</Text></View><Ionicons name="chevron-down" size={16} color={NAVY} /></TouchableOpacity>; }

const styles = StyleSheet.create({ page: { gap: 15 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }, primary: { height: 42, paddingHorizontal: 17, borderRadius: 7, backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', gap: 7 }, primaryText: { color: 'white', fontSize: 11, fontWeight: '700' }, secondary: { height: 42, paddingHorizontal: 15, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, secondaryText: { color: NAVY, fontSize: 11, fontWeight: '600' }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flex: 1, minWidth: 185, minHeight: 96, borderWidth: 1, borderColor: '#E5EAF2', backgroundColor: 'white', borderRadius: 9, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, metricIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, metricValue: { color: NAVY, fontSize: 20, fontWeight: '700', marginTop: 4 }, filters: { padding: 13, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 9, flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 11 }, search: { flex: 1, minWidth: 210, height: 42, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 }, searchInput: { flex: 1, color: NAVY, fontSize: 11, outlineStyle: 'none' } as any, filter: { minWidth: 150, height: 42, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, filterLabel: { color: '#98A2B3', fontSize: 8 }, filterValue: { color: NAVY, fontSize: 11, marginTop: 2 }, card: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 9, padding: 12 }, tabs: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: '#E5EAF2' }, tab: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: BLUE }, tabText: { color: '#475467', fontSize: 11 }, tabTextActive: { color: BLUE, fontWeight: '700' }, row: { minWidth: 900, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }, header: { minHeight: 42, backgroundColor: '#FAFCFF' }, th: { flex: 1, color: '#344054', fontSize: 9, fontWeight: '700' }, cell: { flex: 1, color: '#475467', fontSize: 9 }, cellBox: { flex: 1 }, strong: { color: NAVY, fontSize: 10, fontWeight: '600' }, muted: { color: '#667085', fontSize: 9, marginTop: 3 }, credit: { color: GREEN, fontWeight: '700' }, debit: { color: '#D92D20', fontWeight: '700' }, success: { color: GREEN, fontSize: 9, fontWeight: '700' }, pending: { color: '#DC6803', fontSize: 9, fontWeight: '700' }, failed: { color: '#D92D20', fontSize: 9, fontWeight: '700' }, iconButton: { width: 32, height: 32, borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, empty: { height: 130, alignItems: 'center', justifyContent: 'center', gap: 7 } });

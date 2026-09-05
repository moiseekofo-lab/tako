import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAdminRecharges } from '../services/api';

const NAVY = '#061F68';
const BLUE = '#1268E8';
const GREEN = '#079455';
const SESSION_KEY = 'tako:adminSession';
type Filter = 'Toutes' | 'Mobile Money' | 'Agent (Espèces)' | 'Succès' | 'En attente' | 'Échouées';

export function AdminRecharges() {
  const [data, setData] = useState<any>({ recharges: [], stats: {}, trend: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('Toutes');
  const load = async () => {
    try { setLoading(true); const token = await AsyncStorage.getItem(SESSION_KEY); if (token) setData(await getAdminRecharges(token)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const rows = useMemo(() => (data.recharges || []).filter((item: any) => {
    const matchSearch = `${item.id} ${item.clientName} ${item.phone} ${item.agentId}`.toLowerCase().includes(search.toLowerCase());
    const byAgent = item.agentId && item.agentId !== 'ADMIN';
    const matchFilter = filter === 'Toutes' || (filter === 'Mobile Money' && !byAgent) || (filter === 'Agent (Espèces)' && byAgent) || (filter === 'Succès' && item.status === 'accepted') || (filter === 'En attente' && item.status === 'pending') || (filter === 'Échouées' && !['accepted', 'pending'].includes(item.status));
    return matchSearch && matchFilter;
  }), [data.recharges, filter, search]);
  const stats = data.stats || {};
  const totalChannels = Number(stats.mobileMoney || 0) + Number(stats.agent || 0);
  const mobilePercent = totalChannels ? Math.round(Number(stats.mobileMoney || 0) / totalChannels * 100) : 0;
  const trendMax = Math.max(1, ...(data.trend || []).map((item: any) => Number(item.amount || 0)));
  return <View style={styles.page}>
    <View style={styles.stats}>
      <Metric icon="wallet-outline" label="Total rechargé" value={`${Number(stats.totalAmount || 0).toLocaleString('fr-FR')} FC`} color={BLUE} />
      <Metric icon="checkmark-circle-outline" label="Recharges réussies" value={Number(stats.successful || 0).toLocaleString('fr-FR')} color={GREEN} />
      <Metric icon="hourglass-outline" label="En attente" value={Number(stats.pending || 0).toLocaleString('fr-FR')} color="#E97912" />
      <Metric icon="close-circle-outline" label="Échecs" value={Number(stats.failed || 0).toLocaleString('fr-FR')} color="#D92D20" />
    </View>
    <View style={styles.charts}>
      <View style={[styles.card, styles.trendCard]}><Text style={styles.cardTitle}>Évolution des recharges</Text><View style={styles.bars}>{(data.trend || []).map((item: any) => <View key={item.label} style={styles.barColumn}><View style={[styles.bar, { height: 18 + (Number(item.amount || 0) / trendMax) * 105 }]} /><Text style={styles.barLabel}>{item.label}</Text></View>)}</View></View>
      <View style={[styles.card, styles.channelCard]}><Text style={styles.cardTitle}>Répartition par moyen</Text><View style={styles.channelBody}><View style={styles.donut}><View style={styles.donutInner}><Text style={styles.percent}>{mobilePercent}%</Text><Text style={styles.small}>Mobile Money</Text></View></View><View><Text style={styles.legendBlue}>■ Mobile Money {mobilePercent}%</Text><Text style={styles.legendGreen}>■ Agent (Espèces) {100 - mobilePercent}%</Text></View></View></View>
    </View>
    <View style={styles.card}>
      <View style={styles.tools}><View style={styles.tabs}>{(['Toutes', 'Mobile Money', 'Agent (Espèces)', 'Succès', 'En attente', 'Échouées'] as Filter[]).map((name) => <TouchableOpacity key={name} onPress={() => setFilter(name)} style={[styles.tab, filter === name && styles.tabActive]}><Text style={[styles.tabText, filter === name && styles.tabTextActive]}>{name}</Text></TouchableOpacity>)}</View><View style={styles.search}><Ionicons name="search-outline" size={18} color="#667085" /><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une recharge…" style={styles.searchInput} /></View><TouchableOpacity style={styles.export}><Ionicons name="download-outline" size={18} color={NAVY} /><Text style={styles.exportText}>Exporter</Text></TouchableOpacity></View>
      <View style={[styles.row, styles.header]}>{['Référence', 'Client', 'Type / Moyen', 'Montant', 'Statut', 'Date et heure'].map((title) => <Text key={title} style={styles.cellHead}>{title}</Text>)}</View>
      {loading ? <ActivityIndicator color={BLUE} style={{ margin: 30 }} /> : rows.length ? rows.map((item: any) => <View key={item.id} style={styles.row}><Text numberOfLines={1} style={styles.cell}>{item.id}</Text><View style={styles.cellWrap}><Text style={styles.strong}>{item.clientName}</Text><Text style={styles.small}>{item.phone || item.clientId}</Text></View><View style={styles.cellWrap}><Text style={styles.strong}>{item.agentId && item.agentId !== 'ADMIN' ? 'Agent (Espèces)' : 'Mobile Money'}</Text><Text style={styles.small}>{item.agentId || 'TaKo'}</Text></View><Text style={[styles.cell, styles.amount]}>{Number(item.amount).toLocaleString('fr-FR')} FC</Text><View style={styles.cellWrap}><Text style={item.status === 'accepted' ? styles.success : item.status === 'pending' ? styles.pending : styles.failed}>{item.status === 'accepted' ? '● Réussie' : item.status === 'pending' ? '● En attente' : '● Échouée'}</Text></View><Text style={styles.cell}>{new Date(item.createdAt).toLocaleString('fr-FR')}</Text></View>) : <View style={styles.empty}><Ionicons name="file-tray-outline" size={32} color="#98A2B3" /><Text style={styles.small}>Aucune recharge trouvée.</Text></View>}
    </View>
  </View>;
}

function Metric({ icon, label, value, color }: any) { return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}16` }]}><Ionicons name={icon} size={25} color={color} /></View><View><Text style={styles.small}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  page: { gap: 16 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flex: 1, minWidth: 210, minHeight: 95, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 9, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }, metricIcon: { width: 45, height: 45, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, metricValue: { color: NAVY, fontSize: 21, fontWeight: '700', marginTop: 4 }, charts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, card: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 9, padding: 16 }, trendCard: { flex: 2, minWidth: 440 }, channelCard: { flex: 1, minWidth: 300 }, cardTitle: { color: NAVY, fontSize: 15, fontWeight: '700' }, bars: { height: 165, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 18 }, barColumn: { height: '100%', flex: 1, alignItems: 'center', justifyContent: 'flex-end' }, bar: { width: '45%', maxWidth: 42, backgroundColor: BLUE, borderRadius: 5 }, barLabel: { color: '#667085', fontSize: 10, marginTop: 7 }, channelBody: { minHeight: 165, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 15 }, donut: { width: 130, height: 130, borderRadius: 65, borderWidth: 24, borderColor: BLUE, borderRightColor: GREEN, alignItems: 'center', justifyContent: 'center' }, donutInner: { alignItems: 'center' }, percent: { color: NAVY, fontSize: 23, fontWeight: '700' }, legendBlue: { color: BLUE, fontSize: 12, marginBottom: 13 }, legendGreen: { color: GREEN, fontSize: 12 }, tools: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }, tabs: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', minWidth: 440 }, tab: { paddingHorizontal: 11, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: BLUE }, tabText: { color: '#475467', fontSize: 11 }, tabTextActive: { color: BLUE, fontWeight: '700' }, search: { width: 230, height: 39, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 }, searchInput: { flex: 1, fontSize: 11, color: NAVY, outlineStyle: 'none' } as any, export: { height: 39, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 }, exportText: { color: NAVY, fontSize: 11, fontWeight: '600' }, row: { minHeight: 58, borderTopWidth: 1, borderTopColor: '#EEF2F6', flexDirection: 'row', alignItems: 'center', gap: 10 }, header: { minHeight: 40, backgroundColor: '#FAFCFF' }, cellHead: { flex: 1, color: '#344054', fontSize: 10, fontWeight: '700' }, cell: { flex: 1, color: '#475467', fontSize: 10 }, cellWrap: { flex: 1 }, strong: { color: NAVY, fontSize: 10, fontWeight: '600' }, small: { color: '#667085', fontSize: 10, marginTop: 2 }, amount: { color: GREEN, fontWeight: '700' }, success: { color: GREEN, fontSize: 10, fontWeight: '700' }, pending: { color: '#DC6803', fontSize: 10, fontWeight: '700' }, failed: { color: '#D92D20', fontSize: 10, fontWeight: '700' }, empty: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
});

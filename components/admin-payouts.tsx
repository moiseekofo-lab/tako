import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AdminActionMenu } from './admin-action-menu';

const NAVY = '#061F68';
const BLUE = '#1268E8';
const GREEN = '#079455';

const payouts = [
  ['05/09/2026 09:14', 'Jean Mukendi', '+243 812 345 678', 'Chauffeur', '120 000', 'M-Pesa', 'Réussi', 'TRX893745'],
  ['04/09/2026 18:32', 'Trans-Academia', '+243 852 872 128', 'Agence', '850 000', 'Airtel Money', 'Réussi', 'TRX893521'],
  ['04/09/2026 14:20', 'Marie Kabeya', '+243 819 654 321', 'Chauffeur', '95 000', 'Orange Money', 'Réussi', 'TRX893401'],
  ['03/09/2026 16:11', 'Congo Bus', '+243 999 111 222', 'Agence', '1 200 000', 'M-Pesa', 'En attente', 'TRX893210'],
  ['03/09/2026 11:05', 'Patrick Lemba', '+243 823 456 789', 'Chauffeur', '80 000', 'Airtel Money', 'Réussi', 'TRX893108'],
  ['02/09/2026 19:47', 'Express Muanda', '+243 815 678 901', 'Agence', '640 000', 'Orange Money', 'Réussi', 'TRX892990'],
  ['02/09/2026 13:18', 'David Nsele', '+243 812 987 654', 'Chauffeur', '75 000', 'M-Pesa', 'Échoué', 'TRX892871'],
  ['01/09/2026 17:09', 'Best Cars Rental', '+243 813 854 858', 'Agence', '500 000', 'Airtel Money', 'Réussi', 'TRX892743'],
] as const;

export function AdminPayouts() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('Tous');
  const [status, setStatus] = useState('Tous les statuts');
  const rows = useMemo(() => payouts.filter((row) => {
    const matchesSearch = row.join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (type === 'Tous' || row[3] === type) && (status === 'Tous les statuts' || row[6] === status);
  }), [search, status, type]);

  return <View style={styles.page}>
    <View style={styles.topAction}><TouchableOpacity style={styles.primary} onPress={() => Alert.alert('Nouveau versement', 'Le formulaire de versement est prêt à être configuré avec le bénéficiaire.')}><Ionicons name="add" size={19} color="white" /><Text style={styles.primaryText}>Nouveau versement</Text></TouchableOpacity></View>
    <View style={styles.metrics}>
      <Metric icon="wallet-outline" label="Total versé (CDF)" value="12 450 000" color="#6938EF" hint="Ce mois-ci" />
      <Metric icon="checkmark-circle-outline" label="Versements réussis" value="128" color={GREEN} hint="92% du total" />
      <Metric icon="time-outline" label="En attente" value="6" color="#E97912" hint="4% du total" />
      <Metric icon="close-circle-outline" label="Échoués" value="5" color="#D92D20" hint="4% du total" />
    </View>
    <View style={styles.filters}>
      <Filter label="Période" value="01/08/2026 – 05/09/2026" icon="calendar-outline" />
      <View><Text style={styles.filterLabel}>Type de bénéficiaire</Text><View style={styles.selectRow}>{['Tous', 'Chauffeur', 'Agence'].map((item) => <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.chip, type === item && styles.chipActive]}><Text style={[styles.chipText, type === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}</View></View>
      <View style={styles.searchBlock}><Text style={styles.filterLabel}>Bénéficiaire</Text><View style={styles.search}><Ionicons name="search-outline" size={17} color="#667085" /><TextInput value={search} onChangeText={setSearch} placeholder="Nom, téléphone, agence…" style={styles.input} /></View></View>
      <View><Text style={styles.filterLabel}>Statut</Text><View style={styles.selectRow}>{['Tous les statuts', 'Réussi', 'En attente', 'Échoué'].map((item) => <TouchableOpacity key={item} onPress={() => setStatus(item)} style={[styles.chip, status === item && styles.chipActive]}><Text style={[styles.chipText, status === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}</View></View>
      <TouchableOpacity style={styles.reset} onPress={() => { setSearch(''); setType('Tous'); setStatus('Tous les statuts'); }}><Ionicons name="refresh-outline" size={17} color={NAVY} /><Text style={styles.resetText}>Réinitialiser</Text></TouchableOpacity>
    </View>
    <View style={styles.columns}>
      <View style={styles.tableCard}><Text style={styles.sectionTitle}>Liste des versements</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScroll}><View style={styles.table}>
        <View style={[styles.row, styles.head]}>{['Date', 'Bénéficiaire', 'Type', 'Montant (CDF)', 'Méthode', 'Statut', 'Référence', 'Actions'].map((item) => <Text key={item} style={styles.th}>{item}</Text>)}</View>
        {rows.map((row) => <View key={row[7]} style={styles.row}><Text style={styles.cell}>{row[0]}</Text><View style={styles.cell}><Text style={styles.strong}>{row[1]}</Text><Text style={styles.muted}>{row[2]}</Text></View><Text style={styles.cell}>{row[3]}</Text><Text style={[styles.cell, styles.amount]}>{row[4]}</Text><Text style={styles.cell}>{row[5]}</Text><View style={styles.cell}><Text style={row[6] === 'Réussi' ? styles.success : row[6] === 'En attente' ? styles.pending : styles.failed}>● {row[6]}</Text></View><Text style={styles.cell}>{row[7]}</Text><View style={[styles.cell, styles.actions]}><AdminActionMenu actions={[{label:'Voir les détails',icon:'eye-outline',onPress:()=>Alert.alert('Versement',`${row[1]}\n${row[4]} CDF\n${row[7]}`)},{label:'Télécharger le reçu',icon:'download-outline',onPress:()=>Alert.alert('Reçu','Téléchargement du reçu préparé.')},{label:'Relancer le versement',icon:'refresh-outline',onPress:()=>Alert.alert('Versement','Relance enregistrée.'),disabled:row[6]!=='Échoué'}]} /></View></View>)}
      </View></ScrollView><View style={styles.footer}><Text style={styles.muted}>Affichage de 1 à {rows.length} sur 145 versements</Text><Text style={styles.pageNumber}>1</Text></View></View>
      <View style={styles.side}>
        <View style={styles.sideCard}><Text style={styles.sectionTitle}>Répartition des versements</Text><View style={styles.donut}><View style={styles.donutInner}><Text style={styles.donutValue}>12,5M</Text><Text style={styles.muted}>CDF</Text></View></View><Text style={styles.legendBlue}>■ Chauffeurs 5,2M (42%)</Text><Text style={styles.legendPurple}>■ Agences 6,8M (54%)</Text><Text style={styles.muted}>■ Autres 0,5M (4%)</Text></View>
        <View style={styles.sideCard}><Text style={styles.sectionTitle}>Méthodes de paiement</Text><Progress label="M-Pesa" value="40%" width="40%" color="#F04455" /><Progress label="Airtel Money" value="35%" width="35%" color="#F97078" /><Progress label="Orange Money" value="25%" width="25%" color="#F79009" /></View>
        <View style={styles.sideCard}><Text style={styles.sectionTitle}>Derniers versements</Text>{payouts.slice(0, 3).map((row) => <View key={row[7]} style={styles.latest}><View><Text style={styles.strong}>{row[1]}</Text><Text style={styles.muted}>{row[4]} CDF</Text></View><Text style={row[6] === 'Réussi' ? styles.success : styles.pending}>● {row[6]}</Text></View>)}</View>
      </View>
    </View>
  </View>;
}

function Metric({ icon, label, value, color, hint }: any) { return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}16` }]}><Ionicons name={icon} size={25} color={color} /></View><View><Text style={styles.muted}>{label}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{hint}</Text></View></View>; }
function Filter({ label, value, icon }: any) { return <View><Text style={styles.filterLabel}>{label}</Text><View style={styles.filterBox}><Ionicons name={icon} size={17} color={NAVY} /><Text style={styles.filterValue}>{value}</Text></View></View>; }
function Progress({ label, value, width, color }: any) { return <View style={styles.progressRow}><Text style={styles.progressLabel}>{label}</Text><View style={styles.track}><View style={{ height: '100%', width, borderRadius: 4, backgroundColor: color }} /></View><Text style={styles.muted}>{value}</Text></View>; }

const styles = StyleSheet.create({
  page: { gap: 13 }, topAction: { alignItems: 'flex-end', minHeight: 40 }, primary: { height: 40, paddingHorizontal: 18, borderRadius: 7, backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', gap: 7 }, primaryText: { color: 'white', fontSize: 11, fontWeight: '700' }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flex: 1, minWidth: 205, minHeight: 92, padding: 14, borderWidth: 1, borderColor: '#E4EAF2', borderRadius: 9, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 11 }, metricIcon: { width: 44, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, metricValue: { color: NAVY, fontSize: 20, fontWeight: '800', marginVertical: 3 }, filters: { minHeight: 78, padding: 13, borderWidth: 1, borderColor: '#E4EAF2', borderRadius: 9, backgroundColor: 'white', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 13 }, filterLabel: { color: '#344054', fontSize: 10, fontWeight: '700', marginBottom: 5 }, filterBox: { height: 37, minWidth: 190, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 }, filterValue: { color: NAVY, fontSize: 10 }, selectRow: { height: 37, flexDirection: 'row', borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 6, overflow: 'hidden' }, chip: { paddingHorizontal: 8, justifyContent: 'center' }, chipActive: { backgroundColor: '#EAF2FF' }, chipText: { color: '#667085', fontSize: 9 }, chipTextActive: { color: BLUE, fontWeight: '700' }, searchBlock: { flex: 1, minWidth: 190 }, search: { height: 37, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9 }, input: { flex: 1, fontSize: 10, color: NAVY, outlineStyle: 'none' } as any, reset: { height: 37, borderWidth: 1, borderColor: '#D7DFEA', borderRadius: 6, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 }, resetText: { color: NAVY, fontSize: 10, fontWeight: '600' }, columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 }, tableCard: { flex: 1, minWidth: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#E4EAF2', borderRadius: 9, padding: 13 }, sectionTitle: { color: NAVY, fontSize: 14, fontWeight: '800', marginBottom: 10 }, tableScroll: { flexGrow: 1 }, table: { minWidth: 850, flexGrow: 1 }, row: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEF2F6' }, head: { minHeight: 36, backgroundColor: '#FAFCFF' }, th: { flex: 1, minWidth: 96, color: '#344054', fontSize: 9, fontWeight: '700' }, cell: { flex: 1, minWidth: 96, color: '#475467', fontSize: 9 }, strong: { color: NAVY, fontSize: 10, fontWeight: '700' }, muted: { color: '#667085', fontSize: 9, marginTop: 2 }, amount: { color: NAVY, fontWeight: '800' }, success: { color: GREEN, fontSize: 9, fontWeight: '700' }, pending: { color: '#DC6803', fontSize: 9, fontWeight: '700' }, failed: { color: '#D92D20', fontSize: 9, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 13 }, footer: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pageNumber: { color: 'white', backgroundColor: BLUE, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 5, fontSize: 10 }, side: { width: 250, gap: 12 }, sideCard: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E4EAF2', borderRadius: 9, padding: 14 }, donut: { width: 120, height: 120, alignSelf: 'center', borderRadius: 60, borderWidth: 24, borderColor: BLUE, borderRightColor: '#7A2DE2', borderTopColor: '#7A2DE2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, donutInner: { alignItems: 'center' }, donutValue: { color: NAVY, fontSize: 20, fontWeight: '800' }, legendBlue: { color: BLUE, fontSize: 10, marginBottom: 7 }, legendPurple: { color: '#7A2DE2', fontSize: 10, marginBottom: 7 }, progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 7 }, progressLabel: { width: 72, color: NAVY, fontSize: 9 }, track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#EEF2F6' }, latest: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF2F6' },
});

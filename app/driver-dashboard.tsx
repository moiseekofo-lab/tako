import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { useStore } from './store';

const money = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} CDF`;

const menu = [
  ['Tableau de bord', 'home-outline'], ['Mon profil', 'person-outline'], ['Mes transactions', 'card-outline'],
  ['Historique des courses', 'time-outline'], ['Mes véhicules', 'bus-outline'], ['Portefeuille', 'wallet-outline'],
  ['Retrait', 'swap-horizontal-outline'], ['Notifications', 'notifications-outline'], ['Paramètres', 'settings-outline'],
] as const;

function Panel({ children, style }: { children: ReactNode; style?: any }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export default function DriverDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const currentUser = useStore((state: any) => state.currentUser);
  const balance = useStore((state: any) => state.balance) as number;
  const trips = useStore((state: any) => state.trips) as any[];
  const notifications = useStore((state: any) => state.notifications) as any[];
  const driverTripInfo = useStore((state: any) => state.driverTripInfo);
  const clearSession = useStore((state: any) => state.clearSession);
  const [now, setNow] = useState(() => new Date());
  const firstName = String(currentUser?.fullName || 'Chauffeur TaKo').split(/\s+/)[0];
  const tripCount = trips.length;
  const totalGains = trips.reduce((sum, trip) => sum + Number(trip.amount || 0), 0);
  const todayGains = useMemo(() => trips.filter((trip) => {
    const tripDate = new Date(trip.createdAt);
    return tripDate.getFullYear() === now.getFullYear()
      && tripDate.getMonth() === now.getMonth()
      && tripDate.getDate() === now.getDate();
  }).reduce((sum, trip) => sum + Number(trip.amount || 0), 0), [now, trips]);
  const currentDateTime = now.toLocaleString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const chartValues = useMemo(() => [42, 35, 58, 40, 72, 57, 90], []);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const logout = () => {
    clearSession();
    router.replace('/driver-login' as any);
  };

  if (Platform.OS !== 'web' || width < 1100) {
    return <View style={styles.desktopGate}><View style={styles.gateCard}><Text style={styles.gateIcon}>🖥️</Text><Text style={styles.gateTitle}>Accès sur ordinateur uniquement</Text><Text style={styles.gateText}>Le centre de contrôle chauffeur TaKo est disponible uniquement sur ordinateur.</Text><TouchableOpacity style={styles.gateButton} onPress={logout}><Text style={styles.gateButtonText}>Retour à la connexion chauffeur</Text></TouchableOpacity></View></View>;
  }

  return <View style={styles.page}>
    <View style={styles.sidebar}>
      <View style={styles.logo}><TakoLogo color="#ffffff" /><Text style={styles.logoSubtitle}>Centre de contrôle chauffeur</Text></View>
      <View style={styles.menu}>{menu.map(([label, icon], index) => <TouchableOpacity key={label} style={[styles.menuItem, index === 0 && styles.menuActive]} onPress={() => {
        if (label === 'Mon profil') router.push('/my-data' as any);
        if (label === 'Mes transactions' || label === 'Historique des courses') router.push('/history' as any);
        if (label === 'Notifications') router.push('/notifications' as any);
      }}><Ionicons name={icon as any} size={21} color="#fff" /><Text style={styles.menuText}>{label}</Text>{label === 'Notifications' && notifications.length > 0 ? <Text style={styles.badge}>{notifications.length}</Text> : null}</TouchableOpacity>)}</View>
      <TouchableOpacity style={styles.logout} onPress={logout}><Ionicons name="log-out-outline" size={22} color="#fff" /><Text style={styles.menuText}>Déconnexion</Text></TouchableOpacity>
      <View style={styles.support}><Ionicons name="headset-outline" size={28} color="#fff" /><Text style={styles.supportTitle}>Besoin d’aide ?</Text><Text style={styles.supportText}>Notre équipe est disponible 7j/7 pour vous accompagner.</Text><TouchableOpacity style={styles.supportButton}><Text style={styles.supportButtonText}>Contacter le support</Text></TouchableOpacity></View>
    </View>

    <View style={styles.main}>
      <View style={styles.header}><View><Text style={styles.welcome}>Bienvenue, {firstName} 👋</Text><Text style={styles.subtitle}>Centre de contrôle chauffeur</Text></View><View style={styles.headerRight}><View style={styles.status}><Text style={styles.statusLabel}>Statut du compte</Text><Text style={styles.statusPill}>Actif</Text></View><View style={styles.bell}><Ionicons name="notifications-outline" size={24} color="#07143f" />{notifications.length > 0 && <Text style={styles.bellBadge}>{notifications.length}</Text>}</View><View style={styles.avatar}><Ionicons name="person" size={24} color="#135fe8" /></View><View><Text style={styles.userName}>{currentUser.fullName}</Text><Text style={styles.userRole}>Chauffeur</Text></View></View></View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metrics}>
          <View style={styles.balanceCard}><View style={styles.metricIconLight}><Ionicons name="wallet" size={25} color="#fff" /></View><View><Text style={styles.balanceLabel}>Solde disponible</Text><Text style={styles.balanceValue}>{money(balance)}</Text><TouchableOpacity style={styles.withdraw}><Text style={styles.withdrawText}>Retirer de l’argent</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></TouchableOpacity></View></View>
          <Panel style={styles.metric}><View style={[styles.metricIcon,{backgroundColor:'#dff8e9'}]}><MaterialCommunityIcons name="chart-line" size={26} color="#12a85b" /></View><View style={styles.metricContent}><Text style={styles.metricLabel}>Gains du jour</Text><Text style={styles.metricValue}>{money(todayGains)}</Text><Text style={styles.liveDate}>{currentDateTime}</Text></View></Panel>
          <Panel style={styles.metric}><View style={[styles.metricIcon,{backgroundColor:'#eee8ff'}]}><MaterialCommunityIcons name="bus" size={26} color="#5534ce" /></View><View><Text style={styles.metricLabel}>Courses effectuées</Text><Text style={styles.metricValue}>{tripCount}</Text><Text style={styles.muted}>Aujourd’hui</Text></View></Panel>
          <Panel style={styles.metric}><View style={[styles.metricIcon,{backgroundColor:'#fff0c7'}]}><Ionicons name="star" size={26} color="#f5b313" /></View><View><Text style={styles.metricLabel}>Note moyenne</Text><Text style={styles.metricValue}>4.8/5</Text><Text style={styles.muted}>Basé sur les avis</Text></View></Panel>
        </View>

        <View style={styles.dashboardGrid}>
          <View style={styles.leftColumn}>
            <View style={styles.middleRow}>
              <Panel style={styles.transactions}><View style={styles.panelHeader}><Text style={styles.panelTitle}>Transactions récentes</Text><TouchableOpacity onPress={() => router.push('/history' as any)}><Text style={styles.link}>Voir tout</Text></TouchableOpacity></View>{(trips.length ? trips.slice(0,5) : [{id:'empty',amount:0,route:'Aucune transaction récente',paymentType:'qr',createdAt:new Date().toISOString()}]).map((trip) => <View key={trip.id} style={styles.transaction}><View style={styles.transactionIcon}><Ionicons name="person-outline" size={21} color="#13a85c" /></View><View style={styles.transactionCopy}><Text style={styles.transactionTitle}>{trip.amount ? 'Paiement reçu' : trip.route}</Text><Text style={styles.transactionMeta}>{trip.amount ? `${String(trip.paymentType).toUpperCase()} · ${trip.route}` : 'Les nouveaux paiements apparaîtront ici.'}</Text></View><Text style={styles.transactionTime}>{new Date(trip.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</Text><Text style={styles.received}>{trip.amount ? `+${money(trip.amount)}` : ''}</Text></View>)}</Panel>
              <Panel style={styles.chart}><View style={styles.panelHeader}><Text style={styles.panelTitle}>Aperçu des gains</Text><View style={styles.period}><Text style={styles.periodText}>7 derniers jours</Text></View></View><View style={styles.chartArea}>{chartValues.map((value,index) => <View key={index} style={styles.chartColumn}><View style={[styles.chartBar,{height:`${value}%`}]} /><Text style={styles.chartDay}>{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][index]}</Text></View>)}</View><View style={styles.chartTotals}><View><Text style={styles.muted}>Gains totaux</Text><Text style={styles.totalValue}>{money(totalGains)}</Text></View><View><Text style={styles.muted}>Moyenne par jour</Text><Text style={styles.totalValue}>{money(totalGains / 7)}</Text></View></View></Panel>
            </View>
            <View style={styles.bottomRow}>
              <Panel style={styles.stats}><Text style={styles.panelTitle}>Statistiques</Text><View style={styles.statsRow}>{[['Courses cette semaine',tripCount,'+12%'],["Taux d’acceptation",'98%','Excellent'],['Clients satisfaits',Math.max(tripCount,1),'+8%'],['Annulations',0,'0%']].map(([label,value,change]) => <View style={styles.stat} key={String(label)}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.positive}>{change}</Text></View>)}</View></Panel>
              <Panel style={styles.announcements}><View style={styles.panelHeader}><Text style={styles.panelTitle}>Annonces</Text><Text style={styles.link}>Voir tout</Text></View><View style={styles.notice}><Ionicons name="megaphone-outline" size={25} color="#135fe8" /><View><Text style={styles.noticeTitle}>Nouveau !</Text><Text style={styles.noticeText}>Suivez vos gains et vos courses depuis votre centre de contrôle.</Text></View></View><View style={[styles.notice,styles.safety]}><Ionicons name="shield-checkmark-outline" size={25} color="#b57c00" /><View><Text style={styles.safetyTitle}>Rappel sécurité</Text><Text style={styles.noticeText}>Vérifiez toujours le montant avant de confirmer une course.</Text></View></View></Panel>
            </View>
          </View>

          <View style={styles.rightColumn}>
            <Panel><View style={styles.panelHeader}><Text style={styles.panelTitle}>Mon véhicule</Text><Text style={styles.link}>Modifier</Text></View><View style={styles.vehicle}><View style={styles.vehicleIcon}><MaterialCommunityIcons name="bus" size={58} color="#174690" /></View><View><Text style={styles.vehicleName}>{driverTripInfo.bus || 'Véhicule TaKo'}</Text><Text style={styles.muted}>{driverTripInfo.route || 'Ligne non renseignée'}</Text><Text style={styles.verified}>✓ Véhicule vérifié</Text></View></View></Panel>
            <Panel><Text style={styles.panelTitle}>Actions rapides</Text><View style={styles.quickGrid}>{[["Scanner QR",'qr-code-outline','/scan'],['Montant du transport','cash-outline','/home'],['Mes courses','time-outline','/history'],["Retirer de l’argent",'wallet-outline','/home']].map(([label,icon,route]) => <TouchableOpacity key={label} style={styles.quick} onPress={() => router.push(route as any)}><View style={styles.quickIcon}><Ionicons name={icon as any} size={25} color="#135fe8" /></View><Text style={styles.quickText}>{label}</Text></TouchableOpacity>)}</View></Panel>
          </View>
        </View>
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page:{flex:1,flexDirection:'row',backgroundColor:'#f6f8fc'},sidebar:{width:250,backgroundColor:'#061e48',padding:18},logo:{height:76,justifyContent:'center'},logoSubtitle:{color:'#dbe7ff',fontSize:12,marginLeft:32,marginTop:-3},menu:{gap:7},menuItem:{height:46,borderRadius:9,flexDirection:'row',alignItems:'center',gap:13,paddingHorizontal:14},menuActive:{backgroundColor:'#1264ed'},menuText:{color:'#fff',fontSize:14,fontWeight:'600'},badge:{marginLeft:'auto',backgroundColor:'#1169ee',color:'#fff',paddingHorizontal:7,paddingVertical:3,borderRadius:20,fontSize:11},logout:{height:48,flexDirection:'row',alignItems:'center',gap:13,paddingHorizontal:14,marginTop:4},support:{marginTop:'auto',backgroundColor:'#102e5e',borderRadius:12,padding:17},supportTitle:{color:'#fff',fontWeight:'700',fontSize:15,marginTop:8},supportText:{color:'#dce7fb',fontSize:12,lineHeight:19,marginVertical:10},supportButton:{backgroundColor:'#1264ed',borderRadius:7,padding:11,alignItems:'center'},supportButtonText:{color:'#fff',fontWeight:'700',fontSize:12},main:{flex:1},header:{height:90,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#e3e8f1',paddingHorizontal:24,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},welcome:{fontSize:20,fontWeight:'800',color:'#0a173a'},subtitle:{fontSize:13,color:'#536079',marginTop:5},headerRight:{flexDirection:'row',alignItems:'center',gap:14},status:{height:50,borderWidth:1,borderColor:'#e0e5ee',borderRadius:9,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:10},statusLabel:{fontSize:12,fontWeight:'700'},statusPill:{color:'#14964f',backgroundColor:'#e3f6e9',paddingHorizontal:10,paddingVertical:6,borderRadius:16,fontSize:12,fontWeight:'700'},bell:{position:'relative',padding:8},bellBadge:{position:'absolute',right:2,top:0,backgroundColor:'#e63e3e',color:'#fff',fontSize:9,borderRadius:10,paddingHorizontal:5,paddingVertical:2},avatar:{width:42,height:42,borderRadius:23,backgroundColor:'#eef4ff',alignItems:'center',justifyContent:'center'},userName:{fontWeight:'800',fontSize:13},userRole:{color:'#69758c',fontSize:11,marginTop:3},content:{padding:20,paddingBottom:35},metrics:{flexDirection:'row',gap:16},balanceCard:{flex:1,minHeight:145,borderRadius:12,padding:20,backgroundColor:'#0b54d7',flexDirection:'row',gap:15,alignItems:'flex-start'},metricIconLight:{width:50,height:50,borderRadius:9,backgroundColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center'},balanceLabel:{color:'#dbe8ff',fontSize:12},balanceValue:{color:'#fff',fontSize:23,fontWeight:'800',marginTop:7},withdraw:{marginTop:13,backgroundColor:'rgba(255,255,255,.13)',borderRadius:7,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:18},withdrawText:{color:'#fff',fontWeight:'700',fontSize:12},panel:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e4e8f0',borderRadius:12,padding:17},metric:{flex:1,minHeight:145,flexDirection:'row',gap:15,alignItems:'flex-start',paddingTop:20},metricContent:{flex:1},metricIcon:{width:50,height:50,borderRadius:9,alignItems:'center',justifyContent:'center'},metricLabel:{color:'#28344e',fontSize:12},metricValue:{fontSize:22,fontWeight:'800',color:'#111b36',marginVertical:7},liveDate:{color:'#0c9150',fontSize:9,lineHeight:13,textTransform:'capitalize'},positive:{color:'#11a253',fontSize:11,fontWeight:'700'},muted:{color:'#69758c',fontSize:11,marginTop:4},dashboardGrid:{flexDirection:'row',gap:16,marginTop:16},leftColumn:{flex:1,gap:16},rightColumn:{width:290,gap:16},middleRow:{flexDirection:'row',gap:16},transactions:{flex:1},chart:{flex:1.05},panelHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:13},panelTitle:{fontWeight:'800',fontSize:16,color:'#121c37'},link:{color:'#0754ce',fontSize:11,fontWeight:'700'},transaction:{minHeight:58,borderBottomWidth:1,borderBottomColor:'#edf0f5',flexDirection:'row',alignItems:'center',gap:10},transactionIcon:{width:34,height:34,borderRadius:17,backgroundColor:'#e7f8ed',alignItems:'center',justifyContent:'center'},transactionCopy:{flex:1},transactionTitle:{fontSize:12,fontWeight:'800'},transactionMeta:{fontSize:10,color:'#6d7890',marginTop:3},transactionTime:{fontSize:10,color:'#6d7890'},received:{width:76,textAlign:'right',fontSize:11,color:'#087a3c',fontWeight:'800'},period:{borderWidth:1,borderColor:'#e3e7ef',borderRadius:7,padding:9},periodText:{fontSize:10},chartArea:{height:210,flexDirection:'row',alignItems:'flex-end',gap:10,paddingTop:20,borderBottomWidth:1,borderBottomColor:'#dfe5ef'},chartColumn:{flex:1,height:'100%',justifyContent:'flex-end',alignItems:'center'},chartBar:{width:'62%',minHeight:12,backgroundColor:'#1765e7',borderTopLeftRadius:6,borderTopRightRadius:6},chartDay:{fontSize:9,color:'#68738b',marginVertical:7},chartTotals:{flexDirection:'row',justifyContent:'space-around',paddingTop:14},totalValue:{fontSize:16,fontWeight:'800',marginTop:6},bottomRow:{flexDirection:'row',gap:16},stats:{flex:1},announcements:{flex:1},statsRow:{flexDirection:'row',marginTop:20},stat:{flex:1,alignItems:'center',borderRightWidth:1,borderRightColor:'#e7ebf2'},statLabel:{fontSize:10,color:'#667189',textAlign:'center',minHeight:28},statValue:{fontSize:23,fontWeight:'800',marginVertical:8},notice:{backgroundColor:'#edf5ff',padding:14,borderRadius:8,flexDirection:'row',gap:12,marginTop:8},safety:{backgroundColor:'#fff6df'},noticeTitle:{fontSize:12,fontWeight:'800',color:'#1455b8'},safetyTitle:{fontSize:12,fontWeight:'800',color:'#8a6408'},noticeText:{fontSize:10,color:'#4f5b72',marginTop:4,lineHeight:15},vehicle:{flexDirection:'row',gap:14,alignItems:'center'},vehicleIcon:{width:105,height:82,backgroundColor:'#eef4ff',borderRadius:9,alignItems:'center',justifyContent:'center'},vehicleName:{fontWeight:'800',fontSize:13,marginBottom:6},verified:{marginTop:12,color:'#0d9c50',fontSize:11,fontWeight:'700'},quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:16},quick:{width:'48%',height:108,borderWidth:1,borderColor:'#e5e9f0',borderRadius:9,alignItems:'center',justifyContent:'center',padding:8},quickIcon:{width:45,height:45,borderRadius:23,backgroundColor:'#edf3ff',alignItems:'center',justifyContent:'center'},quickText:{fontSize:11,fontWeight:'700',textAlign:'center',marginTop:8},desktopGate:{flex:1,backgroundColor:'#f4f7fd',alignItems:'center',justifyContent:'center',padding:22},gateCard:{width:'100%',maxWidth:470,backgroundColor:'#fff',borderRadius:22,padding:36,alignItems:'center',shadowColor:'#061f68',shadowOpacity:.12,shadowRadius:22},gateIcon:{fontSize:50},gateTitle:{fontSize:25,fontWeight:'800',color:'#061f68',textAlign:'center',marginTop:18},gateText:{fontSize:15,color:'#59667f',textAlign:'center',lineHeight:23,marginVertical:14},gateButton:{backgroundColor:'#0b5fe5',paddingHorizontal:20,paddingVertical:13,borderRadius:9,marginTop:8},gateButtonText:{color:'#fff',fontWeight:'700'},
});

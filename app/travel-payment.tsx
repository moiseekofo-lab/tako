import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { recordBusinessEvent } from '../services/api';
import { useStore } from './store';

const methods = [
  { id: 'mpesa', badge: 'M-PESA', badgeColor: '#fff', textColor: '#18A842', name: 'M-Pesa (Vodacom)' },
  { id: 'orange', badge: 'OM', badgeColor: '#FF7900', textColor: '#fff', name: 'Orange Money' },
  { id: 'airtel', badge: 'Airtel', badgeColor: '#E60000', textColor: '#fff', name: 'Airtel Money' },
  { id: 'africell', badge: 'Africell', badgeColor: '#871080', textColor: '#fff', name: 'Africell Money' },
];

const value = (item: string | string[] | undefined, fallback: string) => Array.isArray(item) ? item[0] ?? fallback : item ?? fallback;

export default function TravelPayment() {
  const router = useRouter();
  const currentUser = useStore((state: any) => state.currentUser);
  const params = useLocalSearchParams();
  const price = Number(value(params.price, '20000'));
  const passengers = Number(value(params.passengers, '1'));
  const total = Number(value(params.total, String(price * passengers + passengers * 500)));
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const selected = useMemo(() => methods.find((item) => item.id === method) ?? methods[0], [method]);
  const money = (amount: number) => `${amount.toLocaleString('fr-FR')} FC`;
  const confirm = () => {
    if (phone.trim().length < 8) {
      Alert.alert('Numéro requis', `Saisissez le numéro associé à votre compte ${selected.name}.`);
      return;
    }
    recordBusinessEvent({ eventType: 'booking', userId: currentUser?.id, userName: currentUser?.fullName, amount: total, details: `${passengers} passager${passengers > 1 ? 's' : ''} · ${selected.name}` }).catch(() => {});
    Alert.alert('Paiement', `Confirmez le paiement de ${money(total)} avec ${selected.name}.`);
  };

  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <View style={styles.topBar}><TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity><Text style={styles.pageTitle}>Paiement</Text><View style={styles.back} /></View>

    <View style={styles.summary}>
      <View style={styles.heading}><Ionicons name="wallet-outline" size={21} color="#0758D0" /><Text style={styles.headingText}>Résumé du paiement</Text></View>
      <Line label={`Prix du billet (${passengers} passager${passengers > 1 ? 's' : ''})`} value={money(price * passengers)} />
      <Line label="Frais de service" value={money(passengers * 500)} />
      <View style={styles.total}><Text style={styles.totalLabel}>Total à payer</Text><Text style={styles.totalValue}>{money(total)}</Text></View>
    </View>

    <View style={styles.paymentCard}>
      <View style={styles.heading}><Ionicons name="card-outline" size={21} color="#0758D0" /><Text style={styles.headingText}>Choisissez votre moyen de paiement</Text></View>
      {methods.map((item) => <TouchableOpacity key={item.id} style={styles.method} onPress={() => setMethod(item.id)} activeOpacity={0.8}>
        <Ionicons name={method === item.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={method === item.id ? '#087AF0' : '#747984'} />
        <View style={[styles.badge, { backgroundColor: item.badgeColor }]}><Text style={[styles.badgeText, { color: item.textColor }]}>{item.badge}</Text></View>
        <Text style={styles.methodName}>{item.name}</Text><Ionicons name="chevron-down" size={20} color="#313741" />
      </TouchableOpacity>)}

      <View style={styles.phoneCard}>
        <View style={styles.phoneTitle}><Ionicons name="phone-portrait-outline" size={19} color="#082B82" /><Text style={styles.phoneTitleText}>Numéro {selected.name.split(' ')[0]}</Text></View>
        <View style={styles.phoneRow}><View style={styles.prefix}><Text style={styles.prefixText}>+243</Text><Ionicons name="chevron-down" size={17} color="#082B82" /></View><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="81 234 56 78" placeholderTextColor="#9A9DA5" style={styles.phoneInput} /></View>
        <Text style={styles.hint}>Entrez le numéro associé à votre compte {selected.name.split(' ')[0]}</Text>
      </View>
    </View>

    <View style={styles.info}><View style={styles.infoIcon}><Ionicons name="information" size={24} color="#fff" /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>Important</Text><Text style={styles.infoText}>Vous serez redirigé vers votre opérateur pour finaliser le paiement.{`\n`}Le billet sera disponible immédiatement après confirmation.</Text></View></View>
    <TouchableOpacity style={styles.pay} onPress={confirm}><Ionicons name="lock-closed-outline" size={23} color="#fff" /><Text style={styles.payText}>Confirmer et payer {money(total)}</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

function Line({ label, value: amount }: { label: string; value: string }) { return <View style={styles.line}><Text style={styles.lineText}>{label}</Text><Text style={styles.lineText}>{amount}</Text></View>; }

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#F8FAFE'},scroll:{padding:14,paddingBottom:24},topBar:{height:96,marginHorizontal:-14,marginTop:-14,marginBottom:14,paddingHorizontal:14,paddingTop:14,backgroundColor:'#072B84',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:42,height:42,alignItems:'center',justifyContent:'center'},pageTitle:{fontSize:21,fontWeight:'900',color:'#fff'},summary:{backgroundColor:'#fff',borderRadius:14,padding:16,borderWidth:1,borderColor:'#EBEEF4'},heading:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:14},headingText:{fontSize:17,fontWeight:'900',color:'#071E65'},line:{flexDirection:'row',justifyContent:'space-between',paddingVertical:7},lineText:{fontSize:13,color:'#575C66'},total:{borderTopWidth:1,borderTopColor:'#E4E6EB',marginTop:5,paddingTop:15,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},totalLabel:{fontSize:16,fontWeight:'900'},totalValue:{fontSize:23,fontWeight:'900',color:'#0862D5'},paymentCard:{backgroundColor:'#fff',borderRadius:14,padding:14,marginTop:12,borderWidth:1,borderColor:'#EBEEF4'},method:{height:54,borderWidth:1,borderColor:'#E2E5EB',borderRadius:9,marginBottom:8,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:11},badge:{width:58,height:32,borderRadius:5,alignItems:'center',justifyContent:'center'},badgeText:{fontSize:11,fontWeight:'900'},methodName:{flex:1,fontSize:14,color:'#17191D'},phoneCard:{borderWidth:1,borderColor:'#E1E4EA',borderRadius:9,padding:12,marginTop:8},phoneTitle:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10},phoneTitleText:{fontSize:14,fontWeight:'900',color:'#082B82'},phoneRow:{flexDirection:'row',height:52},prefix:{width:104,borderWidth:1,borderColor:'#4B8CE9',borderRadius:8,flexDirection:'row',alignItems:'center',justifyContent:'space-around'},prefixText:{fontSize:14},phoneInput:{flex:1,borderWidth:1,borderColor:'#4B8CE9',borderRadius:8,marginLeft:8,paddingHorizontal:14,fontSize:14,color:'#111'},hint:{fontSize:10,color:'#717680',marginTop:9},info:{backgroundColor:'#F1F6FF',borderWidth:1,borderColor:'#DDE9FA',borderRadius:13,padding:16,marginTop:14,flexDirection:'row',gap:12},infoIcon:{width:37,height:37,borderRadius:19,backgroundColor:'#0879F0',alignItems:'center',justifyContent:'center'},infoCopy:{flex:1},infoTitle:{fontSize:14,fontWeight:'900',color:'#0862D5'},infoText:{fontSize:12,lineHeight:19,color:'#282C32',marginTop:5},pay:{height:61,borderRadius:10,backgroundColor:'#06277B',marginTop:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},payText:{color:'#fff',fontSize:17,fontWeight:'800'},
});

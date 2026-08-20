import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Passenger = { name: string; phone: string; email: string; identity: string };
const first = (value: string | string[] | undefined, fallback: string) => Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
const seatColumns = ['A', 'B', 'C', 'D'];
const seatRows = Array.from({ length: 25 }, (_, index) => index + 1);
const seats = seatRows.flatMap((row) => seatColumns.map((column) => `${row}${column}`));
const unavailable = new Set(['3B', '3D', '5B', '5D', '12A', '18C', '27D', '36B', '44C']);

export default function TravelBooking() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const price = Number(first(params.price, '20000'));
  const passengerCount = Math.max(1, Number.parseInt(first(params.passengers, '1'), 10) || 1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(['2C']);
  const [automatic, setAutomatic] = useState(false);
  const [passengers, setPassengers] = useState<Passenger[]>(() => Array.from(
    { length: passengerCount },
    () => ({ name: '', phone: '', email: '', identity: '' }),
  ));
  const serviceFee = passengerCount * 500;
  const total = price * passengerCount + serviceFee;

  const updatePassenger = (index: number, key: keyof Passenger, value: string) => setPassengers((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const toggleSeat = (seat: string) => {
    if (unavailable.has(seat)) return;
    setAutomatic(false);
    setSelectedSeats((current) => current.includes(seat) ? current.filter((item) => item !== seat) : current.length < passengerCount ? [...current, seat] : [...current.slice(1), seat]);
  };
  const selectAutomatically = () => {
    setAutomatic(true);
    setSelectedSeats(seats.filter((seat) => !unavailable.has(seat)).slice(0, passengerCount));
  };
  const ready = useMemo(() => passengers.every((item) => item.name.trim() && item.phone.trim()) && selectedSeats.length === passengerCount, [passengers, selectedSeats, passengerCount]);
  const pay = () => ready ? router.push({ pathname: '/travel-payment', params: { price: String(price), passengers: String(passengerCount), total: String(total) } }) : Alert.alert('Informations incomplètes', 'Complétez les passagers et choisissez un siège pour chacun.');

  return <SafeAreaView style={styles.page}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={25} color="#fff" /></TouchableOpacity>
      <View style={styles.heroCopy}><Text style={styles.heroTitle}>Détails du voyage</Text><Text style={styles.heroSubtitle}>Vérifiez et réservez votre billet</Text></View>
      <View style={styles.heroSide} />
    </View>

    <View style={styles.body}>
      <SectionTitle icon="people" title="Informations passager" />
      {passengers.map((passenger, index) => <View style={styles.passengerCard} key={index}>
        <Text style={styles.passengerTitle}>Passager {index + 1}</Text>
        <View style={styles.inputGrid}>
          <Input label="Nom complet" icon="person-outline" value={passenger.name} onChangeText={(v) => updatePassenger(index, 'name', v)} />
          <Input label="Téléphone" icon="call-outline" value={passenger.phone} keyboardType="phone-pad" onChangeText={(v) => updatePassenger(index, 'phone', v)} />
          <Input label="Pièce d’identité (optionnel)" icon="card-outline" value={passenger.identity} placeholder="Sélectionner" onChangeText={(v) => updatePassenger(index, 'identity', v)} />
          <Input label="Email (optionnel)" icon="mail-outline" value={passenger.email} keyboardType="email-address" onChangeText={(v) => updatePassenger(index, 'email', v)} />
        </View>
      </View>)}

      <SectionTitle icon="bed" title="Choix de siège" />
      <View style={styles.seatCard}>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, styles.tabPlan, !automatic && styles.tabActive]} onPress={() => setAutomatic(false)}>
            <Ionicons name="grid-outline" size={17} color="#0758D0" />
            <Text style={styles.tabText} numberOfLines={1}>Plan du bus</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, styles.tabAutomatic, automatic && styles.tabActive]} onPress={selectAutomatically}>
            <Ionicons name="color-wand-outline" size={17} color="#555B66" />
            <Text style={styles.tabMuted} numberOfLines={1}>Choisir automatiquement</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.seatContent}><View style={styles.busPlan}><View style={styles.windshield} /><View style={styles.columnLabels}><View style={styles.rowNumberSpace} />{seatColumns.map(x => <Text key={x} style={styles.columnLabel}>{x}</Text>)}</View><ScrollView style={styles.seatViewport} contentContainerStyle={styles.seatRows} nestedScrollEnabled showsVerticalScrollIndicator>{seatRows.map((row) => <View key={row} style={styles.seatRow}><Text style={styles.rowNumber}>{row}</Text>{seatColumns.map((column) => { const seat = `${row}${column}`; return <TouchableOpacity key={seat} disabled={unavailable.has(seat)} onPress={() => toggleSeat(seat)} style={[styles.seat, unavailable.has(seat) && styles.seatUnavailable, selectedSeats.includes(seat) && styles.seatSelected]}>{unavailable.has(seat) && <Ionicons name="close" size={12} color="#999" />}</TouchableOpacity>; })}</View>)}</ScrollView></View>
          <View style={styles.legend}><Legend color="#128BF1" text="Disponible" /><Legend color="#D8DADF" text="Indisponible" /><Legend color="#08A56E" text="Sélectionné" /><View style={styles.selectedBox}><Text style={styles.selectedLabel}>Siège sélectionné</Text><Text style={styles.selectedValue}>{selectedSeats.join(', ') || '—'}</Text></View></View>
        </View>
      </View>

      <View style={styles.protected}><Ionicons name="lock-closed-outline" size={14} color="#667080" /><Text style={styles.protectedText}>Vos données sont protégées</Text></View>
      <TouchableOpacity style={[styles.payButton, !ready && styles.payDisabled]} onPress={pay}><Ionicons name="lock-closed-outline" size={20} color="#fff" /><Text style={styles.payText}>Procéder au paiement</Text><Ionicons name="chevron-forward" size={22} color="#fff" /></TouchableOpacity>
    </View>
  </ScrollView></SafeAreaView>;
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) { return <View style={styles.sectionTitle}><Ionicons name={icon} size={21} color="#061F68" /><Text style={styles.sectionTitleText}>{title}</Text></View>; }
function Input(props: any) { return <View style={styles.inputWrap}><Text style={styles.inputLabel}>{props.label}</Text><View style={styles.input}><Ionicons name={props.icon} size={18} color="#071F67" /><TextInput {...props} style={styles.textInput} placeholderTextColor="#9A9DA5" /></View></View>; }
function Legend({ color, text }: { color: string; text: string }) { return <View style={styles.legendRow}><View style={[styles.legendColor, { backgroundColor: color }]} /><Text style={styles.legendText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#F8FAFE'},scroll:{paddingBottom:42},hero:{height:145,backgroundColor:'#072B84',paddingHorizontal:20,paddingTop:10,flexDirection:'row',alignItems:'center'},back:{width:48,height:48,borderRadius:24,borderWidth:1.5,borderColor:'rgba(255,255,255,.55)',alignItems:'center',justifyContent:'center'},heroCopy:{flex:1,alignItems:'center'},heroTitle:{color:'#fff',fontSize:23,fontWeight:'900'},heroSubtitle:{color:'#fff',fontSize:14,marginTop:4},heroSide:{width:48},body:{marginTop:-1,backgroundColor:'#F8FAFE',borderTopLeftRadius:20,borderTopRightRadius:20,paddingHorizontal:18,paddingTop:18,paddingBottom:24},
  tripCard:{backgroundColor:'#fff',borderRadius:15,padding:15,flexDirection:'row',alignItems:'flex-start',gap:10,flexWrap:'wrap',shadowColor:'#10275C',shadowOpacity:.06,shadowRadius:12,elevation:2},busIcon:{width:46,height:46,borderRadius:9,backgroundColor:'#072B84',alignItems:'center',justifyContent:'center'},timeBlock:{flex:1},time:{fontSize:18,fontWeight:'900',color:'#090909'},city:{fontSize:13,fontWeight:'700',color:'#111',marginTop:3},muted:{fontSize:11,color:'#70737B',marginTop:3},middle:{width:62,alignItems:'center'},duration:{fontSize:11,color:'#555B66'},direct:{fontSize:10,borderWidth:1,borderColor:'#E0E3E8',borderRadius:5,paddingHorizontal:6,paddingVertical:2},priceBlock:{alignItems:'flex-end'},price:{fontSize:16,fontWeight:'900',color:'#0759C7'},tripMeta:{width:'100%',borderTopWidth:1,borderTopColor:'#EEF0F4',paddingTop:11,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},metaText:{fontSize:11,color:'#5D626D'},metaDivider:{color:'#888'},
  sectionTitle:{flexDirection:'row',alignItems:'center',gap:10,marginTop:24,marginBottom:12},sectionTitleText:{fontSize:18,fontWeight:'900',color:'#061F68'},passengerCard:{backgroundColor:'#fff',borderRadius:13,padding:18,marginBottom:12,borderWidth:1,borderColor:'#ECEEF3'},passengerTitle:{fontSize:14,fontWeight:'900',marginBottom:12},inputGrid:{flexDirection:'row',flexWrap:'wrap',columnGap:12,rowGap:14},inputWrap:{width:'48%'},inputLabel:{fontSize:11,color:'#555B66',marginBottom:7},input:{height:48,borderWidth:1,borderColor:'#D9DDE5',borderRadius:7,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:8},textInput:{flex:1,fontSize:12,color:'#111',paddingVertical:0},
  seatCard:{backgroundColor:'#fff',borderRadius:13,padding:16,borderWidth:1,borderColor:'#ECEEF3'},tabs:{height:46,borderWidth:1,borderColor:'#E5E8EF',borderRadius:7,flexDirection:'row',overflow:'hidden'},tab:{flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center',paddingHorizontal:8},tabPlan:{width:'44%'},tabAutomatic:{width:'56%'},tabActive:{backgroundColor:'#EAF2FF'},tabText:{fontSize:12,color:'#0758D0',fontWeight:'800'},tabMuted:{fontSize:11,color:'#555B66'},seatContent:{flexDirection:'row',paddingTop:18,alignItems:'flex-start'},busPlan:{width:'62%',backgroundColor:'#F2F6FC',borderRadius:35,padding:12},windshield:{height:25,borderRadius:20,backgroundColor:'#CBD6E9',marginBottom:10},columnLabels:{flexDirection:'row',alignItems:'center',marginBottom:7},rowNumberSpace:{width:24},columnLabel:{flex:1,textAlign:'center',fontSize:10,color:'#394150'},seatViewport:{height:181},seatRows:{gap:6,paddingBottom:4},seatRow:{flexDirection:'row',alignItems:'center',gap:6},rowNumber:{width:19,textAlign:'center',fontSize:9,color:'#394150'},seat:{flex:1,height:31,borderRadius:4,backgroundColor:'#128BF1',alignItems:'center',justifyContent:'center'},seatUnavailable:{backgroundColor:'#D8DADF'},seatSelected:{backgroundColor:'#08A56E'},legend:{flex:1,paddingLeft:16,paddingTop:18},legendRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14},legendColor:{width:15,height:15,borderRadius:4},legendText:{fontSize:10,color:'#181A1F'},selectedBox:{marginTop:20,borderWidth:1,borderColor:'#E2E5EB',borderRadius:8,padding:11},selectedLabel:{fontSize:10,color:'#333'},selectedValue:{fontSize:18,fontWeight:'900',color:'#08A56E',marginTop:6},
  protected:{flexDirection:'row',alignItems:'center',gap:6,marginTop:16,marginLeft:4},protectedText:{fontSize:10,color:'#667080'},payButton:{height:58,borderRadius:10,backgroundColor:'#072B84',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:25,marginTop:10},payDisabled:{opacity:.7},payText:{color:'#fff',fontSize:16,fontWeight:'900'},
});

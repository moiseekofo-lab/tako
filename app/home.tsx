import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { saveDriverTripSettings, setNfcCardBlocked as setRemoteNfcCardBlocked } from '../services/api';
import { translations, type Language } from './i18n';
import { useStore } from './store';

const DRIVER_TRIP_INFO_KEY = 'tako:driverTripInfo';
const NFC_CARD_ID_KEY = 'tako:nfcCardId';
const NFC_CARD_BLOCKED_KEY = 'tako:nfcCardBlocked';

export default function Home() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const params = useLocalSearchParams<{ role?: string }>();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [tripRoute, setTripRoute] = useState('');
  const [busPlate, setBusPlate] = useState('');
  const [isTripInfoSaved, setIsTripInfoSaved] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const heroTranslateY = useRef(new Animated.Value(0)).current;
  const menuTranslateX = useRef(new Animated.Value(380)).current;
  const balance = useStore((state: any) => state.balance);
  const nfcCardId = useStore((state: any) => state.nfcCardId);
  const nfcCardBlocked = useStore((state: any) => state.nfcCardBlocked);
  const setNfcCardId = useStore((state: any) => state.setNfcCardId);
  const setNfcCardBlocked = useStore((state: any) => state.setNfcCardBlocked);
  const language = useStore((state: any) => state.language) as Language;
  const currentUser = useStore((state: any) => state.currentUser);
  const driverTripInfo = useStore((state: any) => state.driverTripInfo);
  const setDriverTripInfo = useStore((state: any) => state.setDriverTripInfo);
  const unreadNotifications = useStore(
    (state: any) => state.notifications.filter((notification: any) => !notification.read).length
  );
  const text = translations[language];

  const role = params.role === 'passager' ? 'passager' : 'chauffeur';
  const now = useMemo(() => new Date(), []);
  const greeting = now.getHours() < 18 ? text.morning : text.evening;
  const dateLocale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';
  const clientDate = now.toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    AsyncStorage.getItem(NFC_CARD_ID_KEY).then((storedCardId) => {
      if (storedCardId) {
        setNfcCardId(storedCardId);
      }
    }).catch(() => {});
    AsyncStorage.getItem(NFC_CARD_BLOCKED_KEY).then((storedBlocked) => {
      setNfcCardBlocked(storedBlocked === 'true');
    }).catch(() => {});
  }, [setNfcCardBlocked, setNfcCardId]);

  const toggleNfcCardBlocked = async () => {
    if (!nfcCardId) {
      Alert.alert(text.physicalCard, 'Activez d’abord votre carte NFC.');
      return;
    }

    const nextBlocked = !nfcCardBlocked;
    setNfcCardBlocked(nextBlocked);
    await AsyncStorage.setItem(NFC_CARD_BLOCKED_KEY, String(nextBlocked));
    setRemoteNfcCardBlocked(currentUser.id, nextBlocked).catch(() => {});
    Alert.alert(
      text.physicalCard,
      nextBlocked
        ? 'Carte bloquée. Elle ne peut plus être utilisée pour le paiement transport.'
        : 'Carte débloquée. Elle peut de nouveau être utilisée pour le paiement transport.'
    );
  };

  useEffect(() => {
    setPaymentAmount(driverTripInfo.amount ?? '');
    setTripRoute(driverTripInfo.route ?? '');
    setBusPlate(driverTripInfo.bus ?? '');
    setIsTripInfoSaved(!!driverTripInfo.amount && !!driverTripInfo.route && !!driverTripInfo.bus);

    AsyncStorage.getItem(DRIVER_TRIP_INFO_KEY).then((storedInfo) => {
      if (!storedInfo) {
        return;
      }

      try {
        const parsedInfo = JSON.parse(storedInfo) as {
          amount?: string;
          route?: string;
          bus?: string;
        };

        setPaymentAmount(parsedInfo.amount ?? '');
        setTripRoute(parsedInfo.route ?? '');
        setBusPlate(parsedInfo.bus ?? '');
        setIsTripInfoSaved(!!parsedInfo.amount && !!parsedInfo.route && !!parsedInfo.bus);
        setDriverTripInfo({
          amount: parsedInfo.amount ?? '',
          route: parsedInfo.route ?? '',
          bus: parsedInfo.bus ?? '',
        });
      } catch {
        AsyncStorage.removeItem(DRIVER_TRIP_INFO_KEY).catch(() => {});
      }
    }).catch(() => {});
  }, [driverTripInfo.amount, driverTripInfo.bus, driverTripInfo.route, setDriverTripInfo]);

  const saveDriverTripInfo = async () => {
    const info = {
      amount: paymentAmount,
      route: tripRoute.trim(),
      bus: busPlate.trim(),
    };

    setDriverTripInfo(info);
    setIsTripInfoSaved(true);
    AsyncStorage.setItem(
      DRIVER_TRIP_INFO_KEY,
      JSON.stringify(info)
    ).catch(() => {});

    await saveDriverTripSettings({
      driverId: currentUser.id || 'driver-demo',
      busPlate: info.bus,
      route: info.route,
      amount: Number.parseInt(info.amount, 10),
    }).catch(() => null);
  };

  const validateDriverTripInfo = () => {
    const value = Number.parseInt(paymentAmount, 10);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert(text.error, text.enterTripAmount);
      return false;
    }

    if (!tripRoute.trim() || !busPlate.trim()) {
      Alert.alert(text.error, text.enterRouteAndBus);
      return false;
    }

    return true;
  };

  const handleSaveDriverTripInfo = async () => {
    if (isTripInfoSaved) {
      setIsTripInfoSaved(false);
      return;
    }

    if (!validateDriverTripInfo()) {
      return;
    }

    await saveDriverTripInfo();
    Alert.alert(text.tripInfoSaved, text.tripInfoSavedText);
  };

  const openDriverPayment = async (pathname: '/scan' | '/nfc') => {
    if (!validateDriverTripInfo()) {
      return;
    }

    await saveDriverTripInfo();
    router.push({
      pathname,
      params: { montant: paymentAmount, trajet: tripRoute.trim(), bus: busPlate.trim() },
    } as any);
  };

  const heroPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderMove: (_, gesture) => {
        const nextPosition = Math.min(Math.max(gesture.dy, -34), 34);
        heroTranslateY.setValue(nextPosition);
      },
      onPanResponderRelease: () => {
        Animated.spring(heroTranslateY, {
          toValue: 0,
          damping: 14,
          stiffness: 130,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const menuItems = [
    { icon: 'account-box-outline', title: text.myData, subtitle: text.myDataSubtitle, route: '/my-data' },
    { icon: 'cog-outline', title: text.settings, subtitle: text.settingsSubtitle },
    { icon: 'help-box-outline', title: text.help, subtitle: text.helpSubtitle },
    { icon: 'shield-check-outline', title: text.privacyTerms, subtitle: text.privacyTermsSubtitle },
    { icon: 'chat-outline', title: text.chat, subtitle: text.chatSubtitle },
  ];

  const openClientMenu = () => {
    setIsMenuOpen(true);
    menuTranslateX.setValue(380);
    Animated.spring(menuTranslateX, {
      toValue: 0,
      damping: 20,
      stiffness: 140,
      useNativeDriver: true,
    }).start();
  };

  const closeClientMenu = () => {
    Animated.timing(menuTranslateX, {
      toValue: 380,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setIsMenuOpen(false));
  };

  if (role === 'passager') {
    return (
      <View style={styles.clientScreen}>
        <View style={styles.clientHero}>
          <View pointerEvents="none" style={styles.heroDecor}>
            <Image
              source={require('../assets/images/decor-kinshasa-illustration.png')}
              style={styles.kinshasaDecorImage}
              resizeMode="cover"
            />
            <Image
              source={require('../assets/images/decor-kinshasa-illustration.png')}
              style={[styles.kinshasaDecorImage, styles.kinshasaDecorImageSecond]}
              resizeMode="cover"
            />
          </View>

          <Animated.View
            style={[styles.clientHeroContent, { transform: [{ translateY: heroTranslateY }] }]}
            {...heroPanResponder.panHandlers}>
            <View style={styles.clientHeader}>
              <Text style={styles.clientGreeting}>{greeting}, {text.client}</Text>
              <View style={styles.clientHeaderIcons}>
                <TouchableOpacity
                  style={styles.notificationButton}
                  activeOpacity={0.85}
                  onPress={() => router.push('/notifications' as any)}>
                  <Ionicons name="notifications-outline" size={29} color="white" />
                  {unreadNotifications > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} onPress={openClientMenu}>
                  <Ionicons name="menu" size={35} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.transportTitle}>{text.transportAccount}</Text>

          <View style={styles.balanceLine}>
            <Text style={styles.clientBalanceLabel}>{text.balance}</Text>
            <TouchableOpacity
              style={styles.statementButton}
              activeOpacity={0.8}
              onPress={() => router.push('/history' as any)}>
              <Text style={styles.statementText}>{text.history}</Text>
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
            </View>

            <Text style={styles.clientDate}>{text.datePrefix} : {clientDate}</Text>
            <View style={styles.hiddenBalanceRow}>
              <Text style={styles.hiddenBalance}>{showBalance ? `${balance} FC` : '******'}</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setShowBalance((value) => !value)}>
                <Ionicons name={showBalance ? 'eye' : 'eye-off'} size={32} color="white" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        <ScrollView contentContainerStyle={styles.clientContent} showsVerticalScrollIndicator={false}>
          <View style={styles.pullIcon}>
            <Ionicons name="arrow-down" size={25} color="#8C8C8C" />
          </View>

          <Text style={styles.clientSectionTitle}>{text.physicalCard}</Text>

          <View style={styles.physicalCardBox}>
            <View style={styles.cardStatusLine}>
              <Ionicons
                name={nfcCardBlocked ? 'lock-closed-outline' : 'happy-outline'}
                size={24}
                color={nfcCardBlocked ? '#E14C4C' : '#55B86A'}
              />
              <Text style={styles.activeCardText}>
                {nfcCardBlocked ? 'Bloquée' : nfcCardId ? text.active : text.inactive}
              </Text>
            </View>

            <View style={styles.cardControlsRow}>
              <TouchableOpacity
                style={styles.miniCard}
                activeOpacity={0.85}
                onPress={() => router.push('/client-nfc' as any)}>
                <Text style={styles.miniCardLogo}>TaKo</Text>
                <MaterialCommunityIcons name="contactless-payment" size={35} color="#F2B624" />
                <Text style={styles.miniCardVisa}>VISA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roundAction, nfcCardBlocked && styles.roundActionBlocked]}
                activeOpacity={0.85}
                onPress={toggleNfcCardBlocked}>
                <Ionicons name={nfcCardBlocked ? 'lock-open-outline' : 'lock-closed-outline'} size={30} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roundAction}
                activeOpacity={0.85}
                onPress={() => Alert.alert(text.physicalCard, text.cardCancelRequested)}>
                <Ionicons name="card-outline" size={30} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.cardLabelsRow}>
              <TouchableOpacity
                style={[styles.cardActionLabelButton, nfcCardId && styles.cardActionLabelButtonDisabled]}
                activeOpacity={0.75}
                disabled={!!nfcCardId}
                onPress={() => router.push('/client-nfc' as any)}>
                <Text style={[styles.cardActionLabelButtonText, nfcCardId && styles.cardActionLabelDisabledText]}>
                  {nfcCardId ? text.active : text.activateCard}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionLabelButton}
                activeOpacity={0.75}
                onPress={toggleNfcCardBlocked}>
                <Text style={styles.cardActionLabelButtonText}>
                  {nfcCardBlocked ? 'Débloquer\ncarte' : text.blockCard}
                </Text>
              </TouchableOpacity>
              <Text style={styles.cardActionLabel}>{text.cancelCard}</Text>
            </View>
          </View>

          <View style={styles.newsHeader}>
            <Text style={styles.newsTitle}>{text.news}</Text>
            <Ionicons name="chevron-forward" size={31} color="#061F68" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsRow}>
            <View style={[styles.newsCard, styles.newsYellow]}>
              <Text style={styles.newsCardTitle}>{text.recharge}</Text>
              <Text style={styles.newsCardText}>{text.addBalanceFast}</Text>
            </View>
            <View style={[styles.newsCard, styles.newsWhite]}>
              <Text style={styles.newsCardTitleDark}>Carte TaKo</Text>
              <Text style={styles.newsCardTextDark}>{text.payQrNfc}</Text>
            </View>
            <View style={[styles.newsCard, styles.newsBlue]}>
              <Text style={styles.newsCardTitle}>{text.transport}</Text>
              <Text style={styles.newsCardText}>{text.travelSimple}</Text>
            </View>
          </ScrollView>

        </ScrollView>

        <View style={styles.clientBottomNav}>
          <TouchableOpacity
            style={styles.bottomNavItem}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/recharge',
              } as any)
            }>
            <MaterialCommunityIcons name="cash-plus" size={31} color="#061F68" />
            <Text style={styles.bottomNavText}>{text.recharge}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.payButton} activeOpacity={0.9} onPress={() => router.push('/qr')}>
            <Ionicons name="qr-code" size={34} color="white" />
            <Text style={styles.payButtonText}>{text.pay}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomNavItem} activeOpacity={0.85}>
            <Ionicons name="help-circle-outline" size={32} color="#061F68" />
            <Text style={styles.bottomNavText}>{text.help}</Text>
          </TouchableOpacity>
        </View>

        {isMenuOpen && (
          <View style={styles.menuLayer}>
            <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={closeClientMenu} />
            <Animated.View style={[styles.sideMenu, { transform: [{ translateX: menuTranslateX }] }]}>
              <View style={styles.menuProfile}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={46} color="white" />
                  </View>
                  <View style={styles.editAvatarButton}>
                    <Ionicons name="pencil" size={18} color="#8B8B8B" />
                  </View>
                </View>
                <Text style={styles.profileName}>{currentUser.fullName}</Text>
                <Text style={styles.profileEmail}>{currentUser.email}</Text>
              </View>

              <ScrollView contentContainerStyle={styles.menuList} showsVerticalScrollIndicator={false}>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.title}
                    style={styles.menuItem}
                    activeOpacity={0.78}
                    onPress={() => {
                      if (item.route) {
                        closeClientMenu();
                        router.push(item.route as any);
                      }
                    }}>
                    <MaterialCommunityIcons name={item.icon as any} size={30} color="#139DFF" />
                    <View style={styles.menuTextBox}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.78}
                  onPress={() => router.replace('/login' as any)}>
                  <MaterialCommunityIcons name="logout" size={30} color="#139DFF" />
                  <View style={styles.menuTextBox}>
                    <Text style={styles.menuItemTitle}>{text.logout}</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, isWeb && styles.webContainer]} keyboardShouldPersistTaps="always">
      <View style={[styles.webShell, !isWeb && styles.mobileShell]}>
      <View style={styles.header}>
        <TakoLogo />
        <TouchableOpacity style={styles.logoutIcon} onPress={() => router.replace('/login')}>
          <Ionicons name="log-out-outline" size={25} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>{text.availableBalance}</Text>
        <Text style={styles.balance}>{balance} FC</Text>
      </View>

      {role === 'chauffeur' && (
        <View style={styles.section}>
          <Text style={styles.title}>{text.driverPayment}</Text>

          <View style={[styles.inputBox, isTripInfoSaved && styles.savedInputBox]}>
            <MaterialCommunityIcons name="cash" size={28} color="#87909F" style={styles.inputIcon} />
            <TextInput
              placeholder={text.tripAmount}
              placeholderTextColor="#87909F"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              editable={!isTripInfoSaved}
              style={styles.input}
            />
          </View>

          <View style={[styles.inputBox, isTripInfoSaved && styles.savedInputBox]}>
            <MaterialCommunityIcons name="map-marker-path" size={28} color="#87909F" style={styles.inputIcon} />
            <TextInput
              placeholder={text.routeInput}
              placeholderTextColor="#87909F"
              value={tripRoute}
              onChangeText={setTripRoute}
              editable={!isTripInfoSaved}
              style={styles.input}
            />
          </View>

          <View style={[styles.inputBox, isTripInfoSaved && styles.savedInputBox]}>
            <MaterialCommunityIcons name="bus" size={28} color="#87909F" style={styles.inputIcon} />
            <TextInput
              placeholder={text.busPlate}
              placeholderTextColor="#87909F"
              value={busPlate}
              onChangeText={setBusPlate}
              autoCapitalize="characters"
              editable={!isTripInfoSaved}
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveInfoButton, isTripInfoSaved && styles.editInfoButton]}
            activeOpacity={0.88}
            onPress={handleSaveDriverTripInfo}>
            <Ionicons name={isTripInfoSaved ? 'create-outline' : 'save-outline'} size={23} color="white" />
            <Text style={styles.saveInfoText}>{isTripInfoSaved ? text.editTripInfo : text.saveTripInfo}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={() => openDriverPayment('/scan')}>
            <Ionicons name="scan" size={25} color="white" />
            <Text style={styles.text}>{text.scanQr}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.nfcButton]}
            activeOpacity={0.9}
            onPress={() => openDriverPayment('/nfc')}>
            <MaterialCommunityIcons name="contactless-payment" size={27} color="white" />
            <Text style={styles.text}>{text.nfcPayment}</Text>
          </TouchableOpacity>

          <View style={styles.modeBox}>
            <MaterialCommunityIcons name="steering" size={28} color="#09D457" />
            <Text style={styles.modeText}>{text.driverMode}</Text>
          </View>
        </View>
      )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  clientScreen: {
    flex: 1,
    backgroundColor: 'white',
  },
  clientHero: {
    minHeight: 320,
    backgroundColor: '#061F68',
    paddingHorizontal: 28,
    paddingTop: 58,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  heroDecor: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  kinshasaDecorImage: {
    position: 'absolute',
    left: -26,
    top: -42,
    width: '112%',
    height: '118%',
  },
  kinshasaDecorImageSecond: {
    left: 118,
    top: 82,
    width: '78%',
    height: '82%',
    transform: [{ rotate: '7deg' }],
  },
  clientHeroContent: {
    flex: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  clientGreeting: {
    color: 'white',
    fontSize: 29,
    fontWeight: '600',
  },
  clientHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  notificationButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#09D457',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
  },
  transportTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 22,
  },
  balanceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  clientBalanceLabel: {
    color: 'white',
    fontSize: 21,
    fontWeight: '800',
  },
  statementButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statementText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  clientDate: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 7,
  },
  hiddenBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  hiddenBalance: {
    color: 'white',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: 2,
  },
  clientContent: {
    flexGrow: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 150,
    marginTop: -24,
  },
  pullIcon: {
    alignItems: 'center',
    marginBottom: 22,
  },
  clientSectionTitle: {
    color: '#061F68',
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 34,
  },
  physicalCardBox: {
    minHeight: 202,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    padding: 20,
    marginBottom: 58,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  cardStatusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 30,
    marginBottom: 14,
  },
  activeCardText: {
    color: '#4B4B4B',
    fontSize: 16,
    fontWeight: '700',
  },
  cardControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    height: 104,
    borderRadius: 9,
    backgroundColor: '#061F68',
    padding: 14,
    justifyContent: 'space-between',
  },
  miniCardLogo: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },
  miniCardVisa: {
    color: 'white',
    alignSelf: 'flex-end',
    fontSize: 17,
    fontWeight: '900',
  },
  roundAction: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#061F68',
    borderWidth: 5,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundActionBlocked: {
    backgroundColor: '#E14C4C',
  },
  cardLabelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  cardActionLabel: {
    flex: 1,
    color: '#3A3A3A',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  cardActionLabelButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cardActionLabelButtonDisabled: {
    opacity: 0.55,
  },
  cardActionLabelButtonText: {
    color: '#061F68',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
  },
  cardActionLabelDisabledText: {
    color: '#55B86A',
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  newsTitle: {
    color: '#061F68',
    fontSize: 25,
    fontWeight: '900',
  },
  newsRow: {
    gap: 18,
    paddingRight: 28,
    marginBottom: 28,
  },
  newsCard: {
    width: 265,
    height: 160,
    borderRadius: 8,
    padding: 18,
    justifyContent: 'center',
  },
  newsYellow: {
    backgroundColor: '#F2B624',
  },
  newsWhite: {
    backgroundColor: '#F4F5F9',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  newsBlue: {
    backgroundColor: '#139DFF',
  },
  newsCardTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
  },
  newsCardText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  newsCardTitleDark: {
    color: '#061F68',
    fontSize: 27,
    fontWeight: '900',
  },
  newsCardTextDark: {
    color: '#061F68',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  rechargePanel: {
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    padding: 18,
  },
  rechargePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rechargePanelTitle: {
    color: '#061F68',
    fontSize: 22,
    fontWeight: '900',
  },
  clientBottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    paddingBottom: 18,
    zIndex: 20,
    elevation: 20,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 86,
  },
  bottomNavText: {
    color: '#9B9B9B',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 6,
  },
  payButton: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#061F68',
    borderWidth: 5,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  payButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '74%',
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    backgroundColor: '#F4F5F9',
  },
  menuProfile: {
    minHeight: 260,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 28,
    backgroundColor: '#061F68',
  },
  avatarWrap: {
    width: 95,
    height: 95,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 5,
    borderColor: '#09D457',
    backgroundColor: '#061F68',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  profileEmail: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 10,
  },
  menuList: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 34,
  },
  menuItem: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  menuTextBox: {
    flex: 1,
  },
  menuItemTitle: {
    color: '#061F68',
    fontSize: 20,
    fontWeight: '600',
  },
  menuItemSubtitle: {
    color: '#9B9B9B',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#061F68',
    paddingHorizontal: 30,
    paddingTop: 56,
    paddingBottom: 42,
  },
  webContainer: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 42,
  },
  webShell: {
    width: '100%',
    maxWidth: 620,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#126CDE',
    backgroundColor: '#082A82',
    padding: 28,
  },
  mobileShell: {
    width: '100%',
    maxWidth: undefined,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 42,
  },
  logo: {
    fontSize: 50,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0,
  },
  logoWhite: {
    color: 'white',
  },
  logoBlue: {
    color: '#129CFF',
  },
  logoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceBox: {
    backgroundColor: '#082A82',
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    padding: 24,
    marginBottom: 36,
  },
  balanceLabel: {
    color: '#A9D9FF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  balance: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
  },
  section: {
    width: '100%',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
  },
  button: {
    height: 78,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#09D457',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveInfoButton: {
    height: 58,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#139DFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  editInfoButton: {
    backgroundColor: '#09D457',
  },
  saveInfoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  nfcButton: {
    marginTop: 14,
    backgroundColor: '#139DFF',
  },
  cardStatusBox: {
    minHeight: 62,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cardStatusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  rechargeBox: {
    marginTop: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    backgroundColor: '#082A82',
  },
  rechargeTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputBox: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  savedInputBox: {
    backgroundColor: '#DFF7EA',
    borderWidth: 1,
    borderColor: '#09D457',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 18,
    fontWeight: '600',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerBtn: {
    width: '48%',
    minHeight: 64,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  providerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  modeBox: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    marginTop: 22,
  },
  modeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
});

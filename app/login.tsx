import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { loginAccount, loginAdmin, requestVerificationCode, resetPassword, verifyVerificationCode } from '../services/api';
import { languageOptions, translations, type Language } from './i18n';
import { useStore } from './store';

const CLIENT_NAME_KEY = 'tako:lastClientName';
const ADMIN_SESSION_KEY = 'tako:adminSession';
const LANGUAGE_KEY = 'tako:language';
const SHEET_DISMISS_Y = 560;
const SHEET_DISMISS_THRESHOLD = 120;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Login({ chauffeurOnlyOverride = false }: { chauffeurOnlyOverride?: boolean } = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ access?: string }>();
  const chauffeurOnly = chauffeurOnlyOverride || params.access === 'chauffeur';
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isNarrowWeb = isWeb && width < 760;
  const [showLoginForm, setShowLoginForm] = useState(Platform.OS === 'web');
  const [authMode, setAuthMode] = useState<'login' | 'forgotContact' | 'forgotCode' | 'newPassword'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rememberAccess, setRememberAccess] = useState(!isWeb || chauffeurOnly);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetContact, setResetContact] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [sentResetCode, setSentResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [clientName, setClientName] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const language = useStore((state: any) => state.language) as Language;
  const setGlobalLanguage = useStore((state: any) => state.setLanguage);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const sheetTranslateY = useRef(new Animated.Value(SHEET_DISMISS_Y)).current;
  const roadPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isWeb) {
      AsyncStorage.getItem(CLIENT_NAME_KEY).then((storedName) => {
        if (storedName) {
          setClientName(storedName);
        }
      });
    }
    AsyncStorage.getItem(LANGUAGE_KEY).then((storedLanguage) => {
      if (storedLanguage === 'fr' || storedLanguage === 'en' || storedLanguage === 'es') {
        setGlobalLanguage(storedLanguage);
      }
    });
  }, [isWeb, setGlobalLanguage]);

  useEffect(() => {
    if (!showLoginForm) {
      return;
    }

    sheetTranslateY.setValue(SHEET_DISMISS_Y);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      damping: 18,
      stiffness: 120,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY, showLoginForm]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardOffset(Math.min(event.endCoordinates.height, 320));
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoggingIn) {
      roadPulse.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(roadPulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(roadPulse, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [isLoggingIn, roadPulse]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 18 ? translations[language].morning : translations[language].evening;
  }, [language]);

  const text = translations[language];
  const displayName = clientName || text.defaultName;

  const changeLanguage = (nextLanguage: Language) => {
    setGlobalLanguage(nextLanguage);
    AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage).catch(() => {});
  };

  const getNameFromEmail = (value: string) => {
    const namePart = value.split('@')[0].split(/[._-]/)[0].trim();
    if (!namePart) {
      return '';
    }

    return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
  };

  const openLoginForm = () => {
    setAuthMode('login');
    setShowLoginForm(true);
  };

  const closeLoginForm = () => {
    Keyboard.dismiss();
    Animated.timing(sheetTranslateY, {
      toValue: SHEET_DISMISS_Y,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowLoginForm(false);
      setKeyboardOffset(0);
    });
  };

  const isValidResetContact = (value: string) => {
    const cleanValue = value.trim();
    return /\S+@\S+\.\S+/.test(cleanValue) || cleanValue.replace(/\D/g, '').length >= 8;
  };

  const startPasswordRecovery = () => {
    setResetContact(email.trim());
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setAuthMode('forgotContact');
  };

  const sendResetCode = async () => {
    const cleanContact = resetContact.trim();
    if (!isValidResetContact(cleanContact)) {
      Alert.alert('Information manquante', 'Entrez le numéro ou l’email enregistré sur votre compte.');
      return;
    }

    try {
      const result = await requestVerificationCode(cleanContact, 'reset');
      const nextCode = result?.code ? String(result.code) : '';
      setSentResetCode(nextCode);
      setResetCode('');
      setAuthMode('forgotCode');
      Alert.alert(
        'Code envoyé',
        nextCode
          ? `Votre code de récupération est ${nextCode}`
          : cleanContact.includes('@')
            ? 'Votre code de récupération a été envoyé par email.'
            : 'Votre code de récupération a été envoyé par SMS.'
      );
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d’envoyer le code.');
    }
  };

  const confirmResetCode = async () => {
    if (!resetCode.trim()) {
      Alert.alert('Code manquant', 'Entrez le code reçu puis réessayez.');
      return;
    }

    if (sentResetCode && resetCode.trim() !== sentResetCode) {
      Alert.alert('Code incorrect', 'Vérifiez le code reçu puis réessayez.');
      return;
    }

    try {
      await verifyVerificationCode(resetContact.trim(), resetCode.trim(), 'reset');
      setAuthMode('newPassword');
    } catch (error: any) {
      Alert.alert('Code incorrect', error?.message || 'Vérifiez le code reçu puis réessayez.');
    }
  };

  const saveNewPassword = async () => {
    if (newPassword.trim().length < 4) {
      Alert.alert('Mot de passe trop court', 'Créez un mot de passe de 4 caractères minimum.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Mot de passe différent', 'La confirmation du mot de passe ne correspond pas.');
      return;
    }

    try {
      await resetPassword(resetContact.trim(), resetCode.trim() || sentResetCode, newPassword);
      Alert.alert('Mot de passe modifié', 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.');
      setEmail(resetContact.trim());
      setPassword('');
      setAuthMode('login');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetCode('');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de modifier le mot de passe.');
    }
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gesture) => {
        sheetTranslateY.setValue(Math.min(Math.max(gesture.dy, 0), SHEET_DISMISS_Y));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy >= SHEET_DISMISS_THRESHOLD || gesture.vy > 0.75) {
          closeLoginForm();
          return;
        }

        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 18,
          stiffness: 140,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleLogin = async () => {
    const cleanLogin = email.trim();
    const guessedName = getNameFromEmail(cleanLogin);

    if (!cleanLogin || !password.trim()) {
      Alert.alert('Informations manquantes', 'Entrez votre email, numéro ou ID puis votre mot de passe.');
      return;
    }

    Keyboard.dismiss();
    setIsLoggingIn(true);

    try {
      const result = await loginAccount(cleanLogin, password);
      if (result?.user) {
        if (chauffeurOnly && result.user.role !== 'chauffeur') {
          setIsLoggingIn(false);
          Alert.alert('Accès chauffeur uniquement', 'Ce bouton est réservé aux comptes chauffeurs.');
          return;
        }
        setCurrentUser({
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          phone: result.user.phone,
          birthDate: result.user.birthDate,
          balance: result.user.balance,
        });

        if (rememberAccess) {
          await AsyncStorage.setItem(CLIENT_NAME_KEY, result.user.fullName.split(' ')[0] || result.user.fullName);
          setClientName(result.user.fullName.split(' ')[0] || result.user.fullName);
        }

        if (result.user.role === 'agent') {
          router.replace('/agent' as any);
          return;
        }

        router.replace({
          pathname: '/home',
          params: { role: result.user.role === 'chauffeur' ? 'chauffeur' : 'passager' },
        } as any);
        return;
      }
    } catch (error: any) {
      if (API_URL && !chauffeurOnly) {
        try {
          const adminResult = await loginAdmin(cleanLogin, password);
          if (adminResult?.user) {
            if (adminResult.sessionToken) {
              await AsyncStorage.setItem(ADMIN_SESSION_KEY, adminResult.sessionToken);
            }
            setCurrentUser({
              id: adminResult.user.id,
              fullName: adminResult.user.fullName,
              email: adminResult.user.email,
              phone: adminResult.user.phone,
              birthDate: adminResult.user.birthDate,
              balance: adminResult.user.balance,
            });
            router.replace('/admin' as any);
            return;
          }
        } catch {
          setIsLoggingIn(false);
          Alert.alert('Erreur', error?.message || 'Connexion impossible.');
        }
        return;
      }

      if (Platform.OS === 'web') {
        setIsLoggingIn(false);
        Alert.alert('Erreur', error?.message || 'Connexion impossible.');
        return;
      }
    }

    if (chauffeurOnly) {
      setIsLoggingIn(false);
      Alert.alert('Connexion impossible', 'Utilisez un compte chauffeur actif.');
      return;
    }

    if (rememberAccess && guessedName) {
      await AsyncStorage.setItem(CLIENT_NAME_KEY, guessedName);
      setClientName(guessedName);
    }

    if (email.trim()) {
      const cleanFallbackLogin = email.trim();
      const isClientId = /^\d{6,}$/.test(cleanFallbackLogin);
      setCurrentUser({
        id: isClientId ? cleanFallbackLogin : `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`,
        fullName: guessedName || clientName || text.defaultName,
        email: isClientId ? 'client@tako.app' : cleanFallbackLogin,
        phone: '',
        birthDate: '',
        balance: 0,
      });
    }

    router.replace({
      pathname: '/home',
      params: { role: 'passager' },
    } as any);
  };

  if (chauffeurOnly && isWeb && authMode === 'login') {
    return (
      <View style={styles.driverWebPage}>
        <View style={styles.driverWebBrand}><TakoLogo size="small" color="#061F68" /></View>
        <View style={styles.driverWebLanguage}><Text style={styles.driverWebLanguageText}>FR</Text></View>
        <View style={styles.driverWebAccent} />
        <View style={styles.driverWebDot} />

        <View style={[styles.driverWebLayout, isNarrowWeb && styles.driverWebLayoutNarrow]}>
          {!isNarrowWeb ? (
            <View style={styles.driverWebIntro}>
              <Text style={styles.driverWebHeadline}>TaKo, la simplicité{'\n'}au service de vos trajets.</Text>
              <Text style={styles.driverWebCopy}>Connectez-vous pour accéder à votre espace{'\n'}chauffeur et gérer vos courses en toute simplicité.</Text>
              <View style={styles.driverWebIllustration}>
                <Image
                  source={require('../assets/images/driver-login-illustration.png')}
                  resizeMode="contain"
                  style={styles.driverWebIllustrationImage}
                />
              </View>
            </View>
          ) : null}

          <View style={[styles.driverWebCard, isNarrowWeb && styles.driverWebCardNarrow]}>
            <View style={styles.driverWebUserIcon}><Ionicons name="person" size={32} color="#0B70E8" /></View>
            <Text style={styles.driverWebTitle}>Connexion chauffeur</Text>
            <Text style={styles.driverWebSubtitle}>Connectez-vous à votre compte chauffeur</Text>

            <Text style={styles.driverWebLabel}>Email</Text>
            <View style={styles.driverWebField}>
              <Ionicons name="mail-outline" size={21} color="#8B95A5" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                style={styles.driverWebInput}
              />
            </View>
            <Text style={styles.driverWebLabel}>Mot de passe</Text>
            <View style={styles.driverWebField}>
              <Ionicons name="lock-closed-outline" size={21} color="#8B95A5" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.driverWebInput}
              />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748B" /></TouchableOpacity>
            </View>

            <View style={styles.driverWebOptions}>
              <TouchableOpacity style={styles.driverWebRemember} onPress={() => setRememberAccess((value) => !value)}>
                <View style={[styles.driverWebCheckbox, rememberAccess && styles.driverWebCheckboxActive]}>{rememberAccess ? <Ionicons name="checkmark" size={15} color="white" /> : null}</View>
                <Text style={styles.driverWebOptionText}>Se souvenir de moi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={startPasswordRecovery}><Text style={styles.driverWebLink}>Mot de passe oublié ?</Text></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.driverWebSubmit} disabled={isLoggingIn} onPress={handleLogin}>
              {isLoggingIn ? <ActivityIndicator color="white" /> : <><Ionicons name="arrow-forward" size={22} color="white" /><Text style={styles.driverWebSubmitText}>Se connecter</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/images/login-background.jpeg')}
      resizeMode="cover"
      style={styles.background}>
      <View style={[styles.overlay, isWeb && styles.webOverlay]}>
        <View style={[styles.header, isWeb && styles.webHeader, isNarrowWeb && styles.mobileWebHeader]}>
          <TakoLogo size="login" color={isWeb ? '#061F68' : 'white'} />

          <View style={[styles.languages, isWeb && styles.webLanguages, isNarrowWeb && styles.mobileWebLanguages]}>
            {languageOptions.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.flagButton,
                  language === item.code && styles.activeFlagButton,
                  isWeb && language === item.code && styles.webActiveFlagButton,
                ]}
                activeOpacity={0.8}
                accessibilityLabel={item.label}
                onPress={() => changeLanguage(item.code)}>
                <Text style={styles.flag}>{item.flag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showLoginForm ? (
          <View style={[styles.keyboardAvoider, isWeb && styles.webKeyboardAvoider]}>
            <Animated.View
              style={[
                styles.loginSheet,
                isWeb && styles.webLoginSheet,
                isWeb ? undefined : { transform: [{ translateY: sheetTranslateY }] },
              ]}
              {...(isWeb ? {} : sheetPanResponder.panHandlers)}>
              <Pressable
                style={[styles.sheetHandleWrap, isWeb && styles.webHidden]}
                onPress={closeLoginForm}
                {...(isWeb ? {} : sheetPanResponder.panHandlers)}>
                <View style={styles.sheetHandle} />
              </Pressable>

            {authMode === 'login' ? (
              <>
                <Text style={[styles.greeting, isWeb && styles.webGreeting]}>
                  {isWeb ? (chauffeurOnly ? 'Connexion chauffeur' : 'Bonjour, cher administrateur') : `${greeting}, ${displayName}`}
                </Text>
                <Text style={[styles.loginTitle, isWeb && styles.webLoginTitle]}>{chauffeurOnly ? 'Connectez-vous à votre compte chauffeur' : text.loginTitle}</Text>

                <View style={styles.fieldWrap}>
                  <TextInput
                    placeholder={text.emailOrId}
                    placeholderTextColor="#9B9B9B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    style={[styles.field, isWeb && styles.webField]}
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <View style={[styles.passwordRow, isWeb && styles.webPasswordRow]}>
                    <TextInput
                      placeholder={text.password}
                      placeholderTextColor="#9B9B9B"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      style={[styles.passwordField, isWeb && styles.webPasswordField]}
                    />
                    <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={28} color="#8D8D8D" />
                    </Pressable>
                  </View>
                </View>

                {!isWeb ? (
                  <View style={styles.optionsRow}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.forgotButton} onPress={startPasswordRecovery}>
                      <Text style={styles.forgotText}>{text.forgotPassword}</Text>
                      <Ionicons name="chevron-forward" size={22} color="#9B9B9B" />
                    </TouchableOpacity>

                    <Pressable
                      style={styles.rememberWrap}
                      onPress={() => setRememberAccess((value) => !value)}>
                      <Text style={styles.rememberText}>{text.rememberAccess}</Text>
                      <View style={[styles.checkBox, rememberAccess && styles.checkBoxActive]}>
                        {rememberAccess ? <Ionicons name="checkmark" size={22} color="white" /> : null}
                      </View>
                    </Pressable>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.enterButton, isWeb && styles.webEnterButton, isLoggingIn && styles.enterButtonDisabled]}
                  activeOpacity={0.9}
                  disabled={isLoggingIn}
                  onPress={handleLogin}>
                  <Ionicons name="key" size={22} color="white" />
                  <Text style={styles.enterText}>{text.enter}</Text>
                </TouchableOpacity>

                {!isWeb ? (
                  <TouchableOpacity activeOpacity={0.75} onPress={() => router.push('/register' as any)}>
                    <Text style={styles.registerHint}>{text.registerHint}</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}

            {authMode === 'forgotContact' ? (
              <>
                <Text style={[styles.recoveryTitle, isWeb && styles.webGreeting]}>Récupérer le compte</Text>
                <Text style={[styles.recoveryText, isWeb && styles.webRecoveryText]}>
                  Entrez le numéro ou l’email enregistré sur votre compte. Vous recevrez un code de confirmation.
                </Text>

                <View style={styles.fieldWrap}>
                  <TextInput
                    placeholder="Email ou numéro enregistré"
                    placeholderTextColor="#9B9B9B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={resetContact}
                    onChangeText={setResetContact}
                    style={[styles.field, isWeb && styles.webField]}
                  />
                </View>

                <TouchableOpacity style={[styles.enterButton, isWeb && styles.webEnterButton]} activeOpacity={0.9} onPress={sendResetCode}>
                  <Ionicons name="send" size={22} color="white" />
                  <Text style={styles.enterText}>ENVOYER LE CODE</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.75} onPress={() => setAuthMode('login')}>
                  <Text style={styles.registerHint}>Retour à la connexion</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {authMode === 'forgotCode' ? (
              <>
                <Text style={[styles.recoveryTitle, isWeb && styles.webGreeting]}>Confirmer le code</Text>
                <Text style={[styles.recoveryText, isWeb && styles.webRecoveryText]}>Entrez le code reçu sur {resetContact.trim()}.</Text>

                <View style={styles.fieldWrap}>
                  <TextInput
                    placeholder="Code de confirmation"
                    placeholderTextColor="#9B9B9B"
                    keyboardType="number-pad"
                    value={resetCode}
                    onChangeText={setResetCode}
                    maxLength={6}
                    style={[styles.field, isWeb && styles.webField]}
                  />
                  <Text style={styles.counter}>{resetCode.length}/6</Text>
                </View>

                <TouchableOpacity style={[styles.enterButton, isWeb && styles.webEnterButton]} activeOpacity={0.9} onPress={confirmResetCode}>
                  <Ionicons name="checkmark-circle" size={22} color="white" />
                  <Text style={styles.enterText}>CONFIRMER</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.75} onPress={sendResetCode}>
                  <Text style={styles.registerHint}>Renvoyer le code</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {authMode === 'newPassword' ? (
              <>
                <Text style={[styles.recoveryTitle, isWeb && styles.webGreeting]}>Nouveau mot de passe</Text>
                <Text style={[styles.recoveryText, isWeb && styles.webRecoveryText]}>Créez un nouveau mot de passe pour votre compte.</Text>

                <View style={styles.fieldWrap}>
                  <View style={[styles.passwordRow, isWeb && styles.webPasswordRow]}>
                    <TextInput
                      placeholder="Nouveau mot de passe"
                      placeholderTextColor="#9B9B9B"
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      style={[styles.passwordField, isWeb && styles.webPasswordField]}
                    />
                    <Pressable onPress={() => setShowNewPassword((value) => !value)} hitSlop={10}>
                      <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={28} color="#8D8D8D" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <TextInput
                    placeholder="Confirmer le mot de passe"
                    placeholderTextColor="#9B9B9B"
                    secureTextEntry={!showNewPassword}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    style={[styles.field, isWeb && styles.webField]}
                  />
                </View>

                <TouchableOpacity style={[styles.enterButton, isWeb && styles.webEnterButton]} activeOpacity={0.9} onPress={saveNewPassword}>
                  <Ionicons name="lock-closed" size={22} color="white" />
                  <Text style={styles.enterText}>ENREGISTRER</Text>
                </TouchableOpacity>
              </>
            ) : null}
            </Animated.View>
            {!isWeb ? <View style={[styles.keyboardWhiteBase, { height: keyboardOffset > 0 ? keyboardOffset + 34 : 64 }]} /> : null}
          </View>
        ) : (
          <View style={[styles.bottom, isWeb && styles.webBottom]}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={openLoginForm}>
              <Ionicons name="key" size={22} color="white" />
              <Text style={styles.primaryText}>{text.alreadyAccount}</Text>
            </TouchableOpacity>

            {!isWeb && (
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.85}
                onPress={() => router.push('/register' as any)}>
                <Ionicons name="person-add" size={22} color="white" />
                <Text style={styles.secondaryText}>{text.firstAccess}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.version}>v1.0.0</Text>
          </View>
        )}

        {isLoggingIn && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingScene}>
              <Animated.View
                style={[
                  styles.simpleBusWrap,
                  {
                    transform: [
                      {
                        translateY: roadPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      },
                      {
                        translateX: roadPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-9, 9],
                        }),
                      },
                      {
                        rotate: roadPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-1deg', '1deg'],
                        }),
                      },
                    ],
                  },
                ]}>
                <View style={styles.simpleBus}>
                  <View style={styles.simpleBusTop} />
                  <View style={styles.simpleBusBody}>
                    <View style={styles.busBackLights}>
                      <View style={styles.busLight} />
                      <View style={styles.busLight} />
                      <View style={styles.busLight} />
                    </View>
                    <View style={styles.simpleWindowRow}>
                      <View style={styles.simpleWindow} />
                      <View style={styles.simpleWindow} />
                      <View style={styles.simpleWindow} />
                      <View style={[styles.simpleWindow, styles.simpleWindowAccent]} />
                      <View style={styles.simpleFrontWindow} />
                    </View>
                    <Text style={styles.simpleBusLogo}>TaKo</Text>
                    <View style={styles.busDoor}>
                      <View style={styles.doorWindow} />
                      <View style={styles.doorHandle} />
                    </View>
                  </View>
                  <View style={styles.simpleWheels}>
                    <Animated.View
                      style={[
                        styles.simpleWheel,
                        {
                          transform: [
                            {
                              rotate: roadPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.simpleWheel,
                        {
                          transform: [
                            {
                              rotate: roadPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.simpleWheel,
                        {
                          transform: [
                            {
                              rotate: roadPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                </View>
                <Animated.View
                  style={[
                    styles.simpleRoad,
                    {
                      opacity: roadPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.42, 1],
                      }),
                    },
                  ]}
                />
              </Animated.View>
            </View>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  driverWebPage: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#F8FAFF',
    overflow: 'hidden',
  },
  driverWebBrand: {
    position: 'absolute',
    top: 38,
    left: 54,
    zIndex: 3,
  },
  driverWebLanguage: {
    position: 'absolute',
    top: 38,
    right: 54,
    zIndex: 3,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4FF',
  },
  driverWebLanguageText: {
    color: '#061F68',
    fontSize: 15,
    fontWeight: '900',
  },
  driverWebAccent: {
    position: 'absolute',
    right: -42,
    top: 170,
    width: 105,
    height: 240,
    borderRadius: 60,
    backgroundColor: '#FFF0C9',
    transform: [{ rotate: '34deg' }],
  },
  driverWebDot: {
    position: 'absolute',
    right: 110,
    bottom: 90,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E0EDFF',
  },
  driverWebLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 72,
    paddingHorizontal: 70,
    paddingTop: 80,
  },
  driverWebLayoutNarrow: {
    paddingHorizontal: 18,
    paddingTop: 85,
  },
  driverWebIntro: {
    width: 455,
    maxWidth: '42%',
  },
  driverWebHeadline: {
    color: '#061F68',
    fontSize: 35,
    fontWeight: '900',
    lineHeight: 43,
  },
  driverWebCopy: {
    color: '#5F6B7A',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 18,
  },
  driverWebIllustration: {
    width: 455,
    height: 300,
    marginTop: 28,
  },
  driverWebIllustrationImage: {
    width: '100%',
    height: '100%',
  },
  driverWebCard: {
    width: 570,
    minHeight: 630,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 46,
    paddingVertical: 36,
    shadowColor: '#061F68',
    shadowOpacity: 0.13,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  driverWebCardNarrow: {
    width: '100%',
    maxWidth: 570,
    minHeight: 0,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  driverWebUserIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3FF',
  },
  driverWebTitle: {
    color: '#061F68',
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 16,
  },
  driverWebSubtitle: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 24,
  },
  driverWebLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 9,
  },
  driverWebField: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6DEE9',
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  driverWebInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    outlineStyle: 'none',
  } as any,
  driverWebOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  driverWebRemember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  driverWebCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#AAB5C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverWebCheckboxActive: {
    borderColor: '#1277E8',
    backgroundColor: '#1277E8',
  },
  driverWebOptionText: {
    color: '#5F6B7A',
    fontSize: 13,
    fontWeight: '600',
  },
  driverWebLink: {
    color: '#0B70D1',
    fontSize: 13,
    fontWeight: '900',
  },
  driverWebSubmit: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#1277E8',
    shadowColor: '#1277E8',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  driverWebSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  driverWebDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 28,
  },
  driverWebDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  driverWebDividerText: {
    color: '#64748B',
    fontSize: 13,
  },
  driverWebRequest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  driverWebRequestText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(6, 31, 104, 0.34)',
    paddingHorizontal: 28,
    paddingTop: 42,
    paddingBottom: 34,
  },
  webOverlay: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
    backgroundColor: '#F5F8FF',
    paddingHorizontal: 52,
    paddingTop: 46,
    paddingBottom: 46,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  webHeader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileWebHeader: {
    flexDirection: 'column',
    gap: 18,
    marginBottom: 26,
  },
  languages: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 5,
  },
  webLanguages: {
    position: 'absolute',
    right: 0,
    top: 12,
  },
  mobileWebLanguages: {
    position: 'relative',
    right: 'auto',
    top: 'auto',
    alignSelf: 'center',
    paddingTop: 0,
  },
  flagButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeFlagButton: {
    borderColor: 'white',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  webActiveFlagButton: {
    borderColor: '#061F68',
    backgroundColor: '#EAF3FF',
  },
  flag: {
    fontSize: 24,
  },
  keyboardAvoider: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  webKeyboardAvoider: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardWhiteBase: {
    marginHorizontal: -28,
    marginBottom: -34,
    backgroundColor: 'white',
  },
  loginSheet: {
    marginHorizontal: -28,
    marginBottom: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 18,
  },
  webLoginSheet: {
    width: 560,
    maxWidth: '100%',
    alignSelf: 'center',
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    paddingHorizontal: 46,
    paddingTop: 44,
    paddingBottom: 38,
    shadowColor: '#061F68',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 5,
  },
  webHidden: {
    display: 'none',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  sheetHandle: {
    width: 54,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8D8D8',
  },
  greeting: {
    color: '#139DFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  webGreeting: {
    color: '#061F68',
    fontSize: 25,
    textAlign: 'center',
    fontWeight: '900',
  },
  loginTitle: {
    color: '#139DFF',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 30,
  },
  webLoginTitle: {
    color: '#52627A',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 34,
    fontWeight: '800',
  },
  recoveryTitle: {
    color: '#139DFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  recoveryText: {
    color: '#444A55',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 18,
  },
  webRecoveryText: {
    textAlign: 'center',
    color: '#52627A',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
  },
  fieldWrap: {
    marginBottom: 12,
  },
  field: {
    height: 38,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E1E1E',
    color: '#202836',
    fontSize: 18,
    fontWeight: '500',
  },
  webField: {
    height: 52,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CCD6E3',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#061F68',
    fontSize: 16,
    fontWeight: '800',
  },
  passwordRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E1E1E',
  },
  webPasswordRow: {
    height: 52,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CCD6E3',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  passwordField: {
    flex: 1,
    color: '#202836',
    fontSize: 18,
    fontWeight: '500',
  },
  webPasswordField: {
    color: '#061F68',
    fontSize: 16,
    fontWeight: '800',
  },
  counter: {
    color: '#6F6F6F',
    textAlign: 'right',
    fontSize: 13,
    marginTop: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 16,
  },
  forgotButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotText: {
    color: '#2B2B2B',
    fontSize: 14,
    fontWeight: '500',
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    color: '#2B2B2B',
    fontSize: 14,
    fontWeight: '500',
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#139DFF',
  },
  enterButton: {
    height: 52,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: '#09D457',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  webEnterButton: {
    height: 54,
    borderRadius: 8,
    borderWidth: 0,
    backgroundColor: '#061F68',
    shadowColor: '#061F68',
    marginTop: 6,
  },
  enterButtonDisabled: {
    opacity: 0.78,
  },
  enterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  registerHint: {
    color: '#8D8D8D',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  bottom: {
    width: '100%',
  },
  webBottom: {
    width: 470,
    alignSelf: 'flex-end',
    marginBottom: 44,
    padding: 24,
    borderRadius: 18,
    backgroundColor: 'rgba(6,31,104,0.72)',
  },
  primaryButton: {
    height: 65,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: '#09D457',
  },
  primaryText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  secondaryButton: {
    height: 65,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#139DFF',
    backgroundColor: 'rgba(6,31,104,0.5)',
    marginTop: 24,
  },
  secondaryText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  version: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 34,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'white',
  },
  loadingScene: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  simpleBusWrap: {
    width: 168,
    height: 112,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  simpleBus: {
    width: 154,
    height: 82,
  },
  simpleBusTop: {
    position: 'absolute',
    top: 0,
    left: 38,
    width: 28,
    height: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: '#10202A',
    backgroundColor: '#061F68',
  },
  simpleBusBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    height: 58,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#10202A',
    backgroundColor: '#139DFF',
    overflow: 'hidden',
  },
  busBackLights: {
    position: 'absolute',
    left: 3,
    bottom: 10,
    gap: 2,
  },
  busLight: {
    width: 4,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#F0494F',
  },
  simpleWindowRow: {
    position: 'absolute',
    left: 18,
    top: 8,
    flexDirection: 'row',
    gap: 5,
  },
  simpleWindow: {
    width: 15,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#10202A',
    backgroundColor: '#BFE4FF',
  },
  simpleWindowAccent: {
    backgroundColor: '#EAF5FF',
  },
  simpleFrontWindow: {
    width: 20,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#10202A',
    backgroundColor: '#BFE4FF',
    transform: [{ skewX: '-12deg' }],
  },
  simpleBusLogo: {
    position: 'absolute',
    left: 72,
    bottom: 9,
    color: 'white',
    fontSize: 18,
    fontFamily: 'Alkatra',
    fontWeight: '900',
  },
  busDoor: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 18,
    height: 44,
    borderLeftWidth: 2,
    borderColor: '#10202A',
    alignItems: 'center',
  },
  doorWindow: {
    width: 8,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#10202A',
    marginTop: 4,
  },
  doorHandle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10202A',
    marginTop: 11,
  },
  simpleWheels: {
    position: 'absolute',
    left: 28,
    right: 20,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  simpleWheel: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#10202A',
    backgroundColor: '#D9DDE3',
    borderLeftColor: '#139DFF',
  },
  simpleRoad: {
    width: 164,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10202A',
    marginTop: 4,
  },
});

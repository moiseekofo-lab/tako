import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ImageBackground,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TakoLogo } from '../components/tako-logo';
import { loginAccount, requestVerificationCode, resetPassword } from '../services/api';
import { languageOptions, translations, type Language } from './i18n';
import { useStore } from './store';

const CLIENT_NAME_KEY = 'tako:lastClientName';
const LANGUAGE_KEY = 'tako:language';
const SHEET_DISMISS_Y = 560;
const SHEET_DISMISS_THRESHOLD = 120;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Login() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const [role, setRole] = useState<'passager' | 'chauffeur' | 'admin'>(isWeb ? 'admin' : 'passager');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'forgotContact' | 'forgotCode' | 'newPassword'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rememberAccess, setRememberAccess] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetContact, setResetContact] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [sentResetCode, setSentResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [clientName, setClientName] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const language = useStore((state: any) => state.language) as Language;
  const setGlobalLanguage = useStore((state: any) => state.setLanguage);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const sheetTranslateY = useRef(new Animated.Value(SHEET_DISMISS_Y)).current;

  useEffect(() => {
    AsyncStorage.getItem(CLIENT_NAME_KEY).then((storedName) => {
      if (storedName) {
        setClientName(storedName);
      }
    });
    AsyncStorage.getItem(LANGUAGE_KEY).then((storedLanguage) => {
      if (storedLanguage === 'fr' || storedLanguage === 'en' || storedLanguage === 'es') {
        setGlobalLanguage(storedLanguage);
      }
    });
  }, [setGlobalLanguage]);

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
      const nextCode = result?.code || Math.floor(100000 + Math.random() * 900000).toString();
      setSentResetCode(nextCode);
      setResetCode('');
      setAuthMode('forgotCode');
      Alert.alert('Code envoyé', `Votre code de récupération est ${nextCode}`);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d’envoyer le code.');
    }
  };

  const confirmResetCode = () => {
    if (resetCode.trim() !== sentResetCode) {
      Alert.alert('Code incorrect', 'Vérifiez le code reçu puis réessayez.');
      return;
    }

    setAuthMode('newPassword');
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

    try {
      const result = await loginAccount(cleanLogin, password);
      if (result?.user) {
        setCurrentUser({
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          phone: result.user.phone,
          birthDate: result.user.birthDate,
        });

        if (rememberAccess) {
          await AsyncStorage.setItem(CLIENT_NAME_KEY, result.user.fullName.split(' ')[0] || result.user.fullName);
          setClientName(result.user.fullName.split(' ')[0] || result.user.fullName);
        }

        if (role === 'admin') {
          router.replace('/admin' as any);
          return;
        }

        router.replace({
          pathname: '/home',
          params: { role: result.user.role === 'chauffeur' ? 'chauffeur' : role },
        } as any);
        return;
      }
    } catch (error: any) {
      if (API_URL) {
        Alert.alert('Erreur', error?.message || 'Connexion impossible.');
        return;
      }
    }

    if (rememberAccess && guessedName) {
      await AsyncStorage.setItem(CLIENT_NAME_KEY, guessedName);
      setClientName(guessedName);
    }

    if (email.trim()) {
      const isClientId = email.trim().toUpperCase().startsWith('TAKO-');
      setCurrentUser({
        id: isClientId ? email.trim().toUpperCase() : `TAKO-${Date.now().toString().slice(-6)}`,
        fullName: guessedName || clientName || text.defaultName,
        email: isClientId ? 'client@tako.app' : email.trim(),
        phone: '',
        birthDate: '',
      });
    }

    if (role === 'admin') {
      router.replace('/admin' as any);
      return;
    }

    router.replace({
      pathname: '/home',
      params: { role },
    } as any);
  };

  return (
    <ImageBackground
      source={require('../assets/images/login-background.jpeg')}
      resizeMode="cover"
      style={styles.background}>
      <View style={[styles.overlay, isWeb && styles.webOverlay]}>
        <View style={styles.header}>
          <TakoLogo size="login" />

          <View style={styles.languages}>
            {languageOptions.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[styles.flagButton, language === item.code && styles.activeFlagButton]}
                activeOpacity={0.8}
                accessibilityLabel={item.label}
                onPress={() => changeLanguage(item.code)}>
                <Text style={styles.flag}>{item.flag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showLoginForm ? (
          <View style={styles.keyboardAvoider}>
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
                <Text style={styles.greeting}>
                  {greeting}, {displayName}
                </Text>
                <Text style={styles.loginTitle}>{text.loginTitle}</Text>

                <View style={styles.fieldWrap}>
                  <TextInput
                    placeholder={text.emailOrId}
                    placeholderTextColor="#9B9B9B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    maxLength={50}
                    style={styles.field}
                  />
                  <Text style={styles.counter}>{email.length}/50</Text>
                </View>

                <View style={styles.fieldWrap}>
                  <View style={styles.passwordRow}>
                    <TextInput
                      placeholder={text.password}
                      placeholderTextColor="#9B9B9B"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      maxLength={15}
                      style={styles.passwordField}
                    />
                    <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={28} color="#8D8D8D" />
                    </Pressable>
                  </View>
                  <Text style={styles.counter}>{password.length}/15</Text>
                </View>

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

                <TouchableOpacity style={styles.enterButton} activeOpacity={0.9} onPress={handleLogin}>
                  <Ionicons name="key" size={22} color="white" />
                  <Text style={styles.enterText}>{text.enter}</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.75} onPress={() => router.push('/register' as any)}>
                  <Text style={styles.registerHint}>{text.registerHint}</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {authMode === 'forgotContact' ? (
              <>
                <Text style={styles.recoveryTitle}>Récupérer le compte</Text>
                <Text style={styles.recoveryText}>
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
                    maxLength={50}
                    style={styles.field}
                  />
                  <Text style={styles.counter}>{resetContact.length}/50</Text>
                </View>

                <TouchableOpacity style={styles.enterButton} activeOpacity={0.9} onPress={sendResetCode}>
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
                <Text style={styles.recoveryTitle}>Confirmer le code</Text>
                <Text style={styles.recoveryText}>Entrez le code reçu sur {resetContact.trim()}.</Text>

                <View style={styles.fieldWrap}>
                  <TextInput
                    placeholder="Code de confirmation"
                    placeholderTextColor="#9B9B9B"
                    keyboardType="number-pad"
                    value={resetCode}
                    onChangeText={setResetCode}
                    maxLength={6}
                    style={styles.field}
                  />
                  <Text style={styles.counter}>{resetCode.length}/6</Text>
                </View>

                <TouchableOpacity style={styles.enterButton} activeOpacity={0.9} onPress={confirmResetCode}>
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
                <Text style={styles.recoveryTitle}>Nouveau mot de passe</Text>
                <Text style={styles.recoveryText}>Créez un nouveau mot de passe pour votre compte.</Text>

                <View style={styles.fieldWrap}>
                  <View style={styles.passwordRow}>
                    <TextInput
                      placeholder="Nouveau mot de passe"
                      placeholderTextColor="#9B9B9B"
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      maxLength={15}
                      style={styles.passwordField}
                    />
                    <Pressable onPress={() => setShowNewPassword((value) => !value)} hitSlop={10}>
                      <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={28} color="#8D8D8D" />
                    </Pressable>
                  </View>
                  <Text style={styles.counter}>{newPassword.length}/15</Text>
                </View>

                <View style={styles.fieldWrap}>
                  <TextInput
                    placeholder="Confirmer le mot de passe"
                    placeholderTextColor="#9B9B9B"
                    secureTextEntry={!showNewPassword}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    maxLength={15}
                    style={styles.field}
                  />
                  <Text style={styles.counter}>{confirmNewPassword.length}/15</Text>
                </View>

                <TouchableOpacity style={styles.enterButton} activeOpacity={0.9} onPress={saveNewPassword}>
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
            <View style={styles.roleRow}>
              {!isWeb && (
                <TouchableOpacity
                  style={[styles.roleChip, role === 'passager' && styles.activeRole]}
                  activeOpacity={0.85}
                  onPress={() => setRole('passager')}>
                  <Text style={styles.roleText}>{text.client}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.roleChip, role === 'chauffeur' && styles.activeRole]}
                activeOpacity={0.85}
                onPress={() => setRole('chauffeur')}>
                <Text style={styles.roleText}>{text.driver}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleChip, role === 'admin' && styles.activeRole]}
                activeOpacity={0.85}
                onPress={() => setRole('admin')}>
                <Text style={styles.roleText}>{text.admin}</Text>
              </TouchableOpacity>
            </View>

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
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 52,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  languages: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 5,
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
  flag: {
    fontSize: 24,
  },
  keyboardAvoider: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
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
    width: 470,
    alignSelf: 'flex-end',
    marginHorizontal: 0,
    marginBottom: 40,
    borderRadius: 18,
    paddingHorizontal: 34,
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
  loginTitle: {
    color: '#139DFF',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 30,
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
  passwordRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E1E1E',
  },
  passwordField: {
    flex: 1,
    color: '#202836',
    fontSize: 18,
    fontWeight: '500',
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
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  roleChip: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRole: {
    backgroundColor: '#139DFF',
    borderColor: 'white',
  },
  roleText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
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
});

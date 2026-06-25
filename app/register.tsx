import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerAccount, requestVerificationCode, verifyVerificationCode } from '../services/api';
import { useStore } from './store';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<'contact' | 'code' | 'profile'>('contact');
  const [role, setRole] = useState<'passager' | 'chauffeur' | 'agent'>('passager');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [verifiedContact, setVerifiedContact] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showBirthSelector, setShowBirthSelector] = useState(false);
  const [birthDay, setBirthDay] = useState(1);
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthYear, setBirthYear] = useState(new Date().getFullYear() - 18);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const codeInputRef = useRef<TextInput>(null);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);

  const generateClientId = () => `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  const isEmail = (value: string) => value.includes('@');
  const minBirthYear = new Date().getFullYear() - 100;
  const maxBirthYear = new Date().getFullYear() - 12;
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const padDate = (value: number) => String(value).padStart(2, '0');
  const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();
  const formatBirthDate = (day: number, month: number, year: number) => `${padDate(day)}/${padDate(month)}/${year}`;
  const applyBirthDate = (day: number, month: number, year: number) => {
    setBirthDay(day);
    setBirthMonth(month);
    setBirthYear(year);
    setBirthDate(formatBirthDate(day, month, year));
  };
  const updateBirthDate = (part: 'day' | 'month' | 'year', direction: 1 | -1) => {
    let nextDay = birthDay;
    let nextMonth = birthMonth;
    let nextYear = birthYear;

    if (part === 'day') {
      const maxDay = getDaysInMonth(birthMonth, birthYear);
      nextDay = birthDay + direction;
      if (nextDay > maxDay) nextDay = 1;
      if (nextDay < 1) nextDay = maxDay;
    }

    if (part === 'month') {
      nextMonth = birthMonth + direction;
      if (nextMonth > 12) nextMonth = 1;
      if (nextMonth < 1) nextMonth = 12;
      nextDay = Math.min(nextDay, getDaysInMonth(nextMonth, birthYear));
    }

    if (part === 'year') {
      nextYear = birthYear + direction;
      if (nextYear > maxBirthYear) nextYear = minBirthYear;
      if (nextYear < minBirthYear) nextYear = maxBirthYear;
      nextDay = Math.min(nextDay, getDaysInMonth(birthMonth, nextYear));
    }

    applyBirthDate(nextDay, nextMonth, nextYear);
  };
  const isValidContact = (value: string) => {
    const cleanValue = value.trim();
    return /\S+@\S+\.\S+/.test(cleanValue);
  };
  const isEmailAlreadyUsedError = (error: any) => String(error?.message || '').toLowerCase().includes('email est déjà utilisé');

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (isSendingCode || resendCooldown > 0) {
      return;
    }

    const cleanContact = (step === 'code' ? verifiedContact : contact).trim();
    if (!isValidContact(cleanContact)) {
      Alert.alert('Email manquant', 'Entrez un email valide pour recevoir le code.');
      return;
    }

    try {
      setIsSendingCode(true);
      const result = await requestVerificationCode(cleanContact, 'register');
      const nextCode = result?.code ? String(result.code) : '';
      setSentCode(nextCode);
      setVerifiedContact(cleanContact);
      setVerificationCode('');
      setStep('code');
      setResendCooldown(30);
      Alert.alert(
        'Code envoyé',
        nextCode
          ? `Votre code de confirmation est ${nextCode}`
            : 'Votre code de confirmation a été envoyé par email.'
      );
    } catch (error: any) {
      Alert.alert(
        isEmailAlreadyUsedError(error) ? 'Email déjà utilisé' : 'Erreur',
        error?.message || 'Impossible d’envoyer le code.'
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmCode = async () => {
    const cleanCode = verificationCode.trim();
    if (!cleanCode) {
      Alert.alert('Code manquant', 'Entrez le code reçu puis réessayez.');
      return;
    }

    if (sentCode && cleanCode !== sentCode) {
      Alert.alert('Code incorrect', 'Vérifiez le code reçu puis réessayez.');
      return;
    }

    try {
      setIsVerifyingCode(true);
      const result = await verifyVerificationCode(verifiedContact, cleanCode, 'register');
      if (!result?.verified && !sentCode) {
        Alert.alert('Code incorrect', 'Vérifiez le code reçu puis réessayez.');
        return;
      }
      setStep('profile');
    } catch (error: any) {
      Alert.alert('Code incorrect', error?.message || 'Vérifiez le code reçu puis réessayez.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !birthDate.trim() || !password.trim()) {
      Alert.alert('Informations manquantes', 'Ajoutez le nom complet, la date de naissance et le mot de passe.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mot de passe différent', 'La confirmation du mot de passe ne correspond pas.');
      return;
    }

    const email = isEmail(verifiedContact) ? verifiedContact : '';
    const phone = isEmail(verifiedContact) ? '' : verifiedContact;
    try {
      const result = await registerAccount({
        contact: verifiedContact,
        code: verificationCode.trim() || sentCode,
        fullName: fullName.trim(),
        birthDate: birthDate.trim(),
        password,
        role,
      });

      const user = result?.user || {
        id: generateClientId(),
        fullName: fullName.trim() || 'Client TaKo',
        email: email || 'client@tako.app',
        phone,
        birthDate: birthDate.trim(),
        role,
        status: role === 'chauffeur' || role === 'agent' ? 'pending' : 'active',
      };

      setCurrentUser({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate,
        balance: user.balance,
      });

      console.log('USER CREATED:', user);

      Alert.alert(
        'Compte créé !',
        result?.accountEmailSent
          ? 'Vos informations de compte ont été envoyées par email.'
          : 'Votre compte a été créé. Vérifiez votre email pour les informations du compte.'
      );
      router.replace('/login' as any);
    } catch (error: any) {
      Alert.alert(
        isEmailAlreadyUsedError(error) ? 'Email déjà utilisé' : 'Erreur',
        error?.message || 'Impossible de créer le compte.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, step !== 'profile' && styles.simpleScreen]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {step === 'contact' ? (
        <View style={styles.simpleContent}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.simpleTitle}>Entrez votre email</Text>

          <View style={styles.emailRow}>
            <View style={styles.mailBadge}>
              <Ionicons name="mail" size={24} color="#061F68" />
            </View>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={contact}
              onChangeText={setContact}
              style={styles.emailInput}
            />
          </View>

          <Text style={styles.simpleText}>
            Nous enverrons un code de confirmation à cet email pour créer votre compte.
          </Text>

          <TouchableOpacity
            style={[styles.bottomButton, isSendingCode && styles.disabledBtn]}
            activeOpacity={0.9}
            disabled={isSendingCode}
            onPress={handleSendCode}>
            <Text style={styles.bottomButtonText}>{isSendingCode ? 'ENVOI...' : 'SUIVANT'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === 'code' ? (
        <View style={styles.simpleContent}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => setStep('contact')}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.simpleTitle}>Confirmez votre email</Text>
          <Text style={styles.simpleText}>
            Nous avons envoyé un code à {verifiedContact}. Entrez-le ci-dessous pour continuer.
          </Text>

          <Pressable style={styles.codeWrap} onPress={() => codeInputRef.current?.focus()}>
            <TextInput
              ref={codeInputRef}
              value={verificationCode}
              onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.codeInputHidden}
            />
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View key={index} style={styles.codeBoxGroup}>
                <View style={[styles.codeBox, verificationCode.length === index && styles.codeBoxActive]}>
                  <Text style={styles.codeDigit}>{verificationCode[index] || ''}</Text>
                </View>
                {index === 2 ? <Text style={styles.codeSeparator}>-</Text> : null}
              </View>
            ))}
          </Pressable>

          <TouchableOpacity
            style={styles.resendButton}
            activeOpacity={0.85}
            disabled={isSendingCode || resendCooldown > 0}
            onPress={handleSendCode}>
            <Text style={[styles.resendText, (isSendingCode || resendCooldown > 0) && styles.disabledResendText]}>
              {isSendingCode ? 'Envoi...' : resendCooldown > 0 ? `Vous n’avez pas reçu le code ? 00:${String(resendCooldown).padStart(2, '0')}` : 'Renvoyer le code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomButton, (verificationCode.length < 6 || isVerifyingCode) && styles.bottomButtonDisabled]}
            activeOpacity={0.9}
            disabled={verificationCode.length < 6 || isVerifyingCode}
            onPress={handleConfirmCode}>
            <Text style={styles.bottomButtonText}>{isVerifyingCode ? 'VÉRIFICATION...' : 'CONFIRMER'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === 'profile' ? (
        <ScrollView
          contentContainerStyle={styles.profileContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => setStep('code')}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.simpleTitle}>Créez votre compte</Text>

          <View style={styles.verifiedBox}>
            <Ionicons name="checkmark-circle" size={20} color="#0CBF63" />
            <Text style={styles.verifiedSimpleText}>{verifiedContact} vérifié</Text>
          </View>

          <View style={styles.profileField}>
            <TextInput
              placeholder="Nom complet"
              placeholderTextColor="#A7ABB3"
              value={fullName}
              onChangeText={setFullName}
              style={styles.profileInput}
            />
          </View>

          <Pressable
            style={styles.profileField}
            onPress={() => {
              if (!birthDate) {
                applyBirthDate(birthDay, birthMonth, birthYear);
              }
              setShowBirthSelector((value) => !value);
            }}>
            <Text style={[styles.profileDateText, !birthDate && styles.profilePlaceholder]}>
              {birthDate || 'Date de naissance'}
            </Text>
            <Ionicons name={showBirthSelector ? 'chevron-up' : 'chevron-down'} size={23} color="#111827" />
          </Pressable>

          {showBirthSelector ? (
            <View style={styles.dateSelector}>
              <DateColumn
                label="Jour"
                value={padDate(birthDay)}
                increase={() => updateBirthDate('day', 1)}
                decrease={() => updateBirthDate('day', -1)}
              />
              <DateColumn
                label="Mois"
                value={monthLabels[birthMonth - 1]}
                increase={() => updateBirthDate('month', 1)}
                decrease={() => updateBirthDate('month', -1)}
              />
              <DateColumn
                label="Année"
                value={String(birthYear)}
                increase={() => updateBirthDate('year', 1)}
                decrease={() => updateBirthDate('year', -1)}
              />
            </View>
          ) : null}

          <View style={styles.profileField}>
            <TextInput
              placeholder="Mot de passe"
              placeholderTextColor="#A7ABB3"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              style={styles.profileInput}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={27} color="#111827" />
            </Pressable>
          </View>

          <Text style={styles.passwordHint}>
            Utilisez un mot de passe personnel avec des lettres et des chiffres.
          </Text>

          <View style={styles.profileField}>
            <TextInput
              placeholder="Confirmer mot de passe"
              placeholderTextColor="#A7ABB3"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              style={styles.profileInput}
            />
            <Pressable onPress={() => setShowConfirmPassword((value) => !value)} hitSlop={10}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={27} color="#111827" />
            </Pressable>
          </View>

          <Text style={styles.simpleLabel}>Choisir votre rôle</Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.simpleRoleBtn, role === 'passager' && styles.simpleRoleActive]}
              activeOpacity={0.85}
              onPress={() => setRole('passager')}>
              <Ionicons name="people" size={24} color={role === 'passager' ? 'white' : '#061F68'} />
              <Text style={[styles.simpleRoleText, role === 'passager' && styles.activeRoleText]}>Passager</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simpleRoleBtn, role === 'chauffeur' && styles.simpleRoleActive]}
              activeOpacity={0.85}
              onPress={() => setRole('chauffeur')}>
              <MaterialCommunityIcons name="steering" size={26} color={role === 'chauffeur' ? 'white' : '#061F68'} />
              <Text style={[styles.simpleRoleText, role === 'chauffeur' && styles.activeRoleText]}>Chauffeur</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.simpleRoleBtn, styles.agentRoleBtn, role === 'agent' && styles.simpleRoleActive]}
            activeOpacity={0.85}
            onPress={() => setRole('agent')}>
            <MaterialCommunityIcons name="account-tie" size={25} color={role === 'agent' ? 'white' : '#061F68'} />
            <Text style={[styles.simpleRoleText, role === 'agent' && styles.activeRoleText]}>Agent</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileCreateButton} activeOpacity={0.9} onPress={handleRegister}>
            <Text style={styles.bottomButtonText}>CRÉER</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function DateColumn({
  label,
  value,
  increase,
  decrease,
}: {
  label: string;
  value: string;
  increase: () => void;
  decrease: () => void;
}) {
  return (
    <View style={styles.dateColumn}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateArrow} activeOpacity={0.75} onPress={increase}>
        <Ionicons name="chevron-up" size={18} color="#061F68" />
      </TouchableOpacity>
      <Text style={styles.dateValue}>{value}</Text>
      <TouchableOpacity style={styles.dateArrow} activeOpacity={0.75} onPress={decrease}>
        <Ionicons name="chevron-down" size={18} color="#061F68" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  simpleScreen: {
    backgroundColor: 'white',
  },
  simpleContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 34,
    backgroundColor: 'white',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F2F4',
    marginBottom: 40,
  },
  simpleTitle: {
    color: '#064636',
    fontSize: 32,
    lineHeight: 41,
    fontWeight: '900',
    marginBottom: 22,
  },
  simpleText: {
    color: '#2B2F36',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '500',
    marginBottom: 22,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  mailBadge: {
    width: 104,
    height: 60,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  emailInput: {
    flex: 1,
    height: 60,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    paddingHorizontal: 18,
    color: '#202836',
    fontSize: 18,
    fontWeight: '500',
  },
  bottomButton: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 34,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9DDFB7',
  },
  bottomButtonDisabled: {
    opacity: 0.75,
  },
  bottomButtonText: {
    color: '#12352F',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  codeWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  codeInputHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  codeBoxGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeBox: {
    width: 42,
    height: 64,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginRight: 10,
  },
  codeBoxActive: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  codeDigit: {
    color: '#061F68',
    fontSize: 28,
    fontWeight: '800',
  },
  codeSeparator: {
    color: '#D8D8D8',
    fontSize: 24,
    fontWeight: '700',
    marginRight: 10,
  },
  resendButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
  },
  resendText: {
    color: '#8B8F98',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledResendText: {
    color: '#A7ABB3',
  },
  profileContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 42,
    backgroundColor: 'white',
  },
  verifiedBox: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#09D457',
    backgroundColor: '#F0FFF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 24,
  },
  verifiedSimpleText: {
    color: '#061F68',
    fontSize: 14,
    fontWeight: '800',
  },
  profileField: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 9,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  profileInput: {
    flex: 1,
    color: '#202836',
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 0,
  },
  profileDateText: {
    flex: 1,
    color: '#202836',
    fontSize: 17,
    fontWeight: '600',
  },
  profilePlaceholder: {
    color: '#A7ABB3',
    fontWeight: '500',
  },
  passwordHint: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginTop: -4,
    marginBottom: 20,
  },
  simpleLabel: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 12,
  },
  simpleRoleBtn: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: 'white',
  },
  simpleRoleActive: {
    borderColor: '#139DFF',
    backgroundColor: '#139DFF',
  },
  simpleRoleText: {
    color: '#061F68',
    fontSize: 15,
    fontWeight: '800',
  },
  profileCreateButton: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9DDFB7',
    marginTop: 34,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 42,
    backgroundColor: '#F5F8FF',
  },
  logoWrap: {
    alignItems: 'flex-start',
    marginBottom: 34,
  },
  title: {
    color: '#061F68',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 18,
  },
  formPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  stepDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#CCD6E3',
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 7,
    borderRadius: 2,
    backgroundColor: '#D7E0EF',
  },
  stepActive: {
    backgroundColor: '#09D457',
  },
  stepTitle: {
    color: '#061F68',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 10,
  },
  helperText: {
    color: '#52627A',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 24,
  },
  verifiedText: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    color: '#061F68',
    fontSize: 15,
    fontWeight: '800',
    backgroundColor: '#E9FFF1',
    borderColor: '#09D457',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 22,
  },
  inputBox: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 16,
    fontWeight: '500',
  },
  dateValueText: {
    flex: 1,
    color: '#202836',
    fontSize: 16,
    fontWeight: '600',
  },
  datePlaceholder: {
    color: '#87909F',
    fontWeight: '500',
  },
  dateSelector: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D7E0EF',
    borderRadius: 14,
    backgroundColor: '#FBFCFF',
    padding: 10,
    marginTop: -4,
    marginBottom: 14,
  },
  dateColumn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E4EAF3',
    paddingVertical: 8,
  },
  dateLabel: {
    color: '#87909F',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateArrow: {
    width: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValue: {
    color: '#061F68',
    fontSize: 16,
    fontWeight: '900',
    marginVertical: 2,
  },
  label: {
    color: '#061F68',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#126CDE',
    backgroundColor: 'transparent',
    borderRadius: 12,
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#139DFF',
    borderColor: '#139DFF',
  },
  roleText: {
    color: '#061F68',
    fontSize: 15,
    fontWeight: '800',
  },
  agentRoleBtn: {
    marginTop: 10,
  },
  activeRoleText: {
    color: 'white',
  },
  btn: {
    height: 62,
    backgroundColor: '#09D457',
    borderRadius: 14,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.65,
  },
  textButton: {
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  textButtonLabel: {
    color: '#061F68',
    fontSize: 16,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  disabledTextButtonLabel: {
    color: '#87909F',
  },
});

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { TakoLogo } from '../components/tako-logo';
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
    return /\S+@\S+\.\S+/.test(cleanValue) || cleanValue.replace(/\D/g, '').length >= 8;
  };

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
      Alert.alert('Information manquante', 'Entrez un email ou un numéro valide pour recevoir le code.');
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
          : cleanContact.includes('@')
            ? 'Votre code de confirmation a été envoyé par email.'
            : 'Votre code de confirmation a été envoyé par SMS.'
      );
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d’envoyer le code.');
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
      Alert.alert('Erreur', error?.message || 'Impossible de créer le compte.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <TakoLogo size="login" />
        </View>

        <Text style={styles.title}>Créer un compte</Text>
        <View style={styles.formPanel}>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={[styles.stepLine, step !== 'contact' && styles.stepActive]} />
            <View style={[styles.stepDot, step !== 'contact' && styles.stepActive]} />
            <View style={[styles.stepLine, step === 'profile' && styles.stepActive]} />
            <View style={[styles.stepDot, step === 'profile' && styles.stepActive]} />
          </View>

          {step === 'contact' ? (
            <>
              <Text style={styles.stepTitle}>Vérification du compte</Text>
              <Text style={styles.helperText}>
                Ajoutez d’abord votre email ou votre numéro. Il servira à récupérer votre compte plus facilement.
              </Text>

              <View style={styles.inputBox}>
                <Ionicons name="mail" size={26} color="#87909F" style={styles.inputIcon} />
                <TextInput
                  placeholder="Email ou numéro"
                  placeholderTextColor="#87909F"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={contact}
                  onChangeText={setContact}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, isSendingCode && styles.disabledBtn]}
                activeOpacity={0.9}
                disabled={isSendingCode}
                onPress={handleSendCode}>
                <Text style={styles.btnText}>{isSendingCode ? 'Envoi...' : 'Recevoir le code'}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <Text style={styles.stepTitle}>Confirmer le code</Text>
              <Text style={styles.helperText}>
                Entrez le code reçu sur {verifiedContact}. Après confirmation, vous pourrez compléter le compte.
              </Text>

              <View style={styles.inputBox}>
                <Ionicons name="keypad" size={26} color="#87909F" style={styles.inputIcon} />
                <TextInput
                  placeholder="Code de confirmation"
                  placeholderTextColor="#87909F"
                  keyboardType="number-pad"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  maxLength={6}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity style={styles.btn} activeOpacity={0.9} disabled={isVerifyingCode} onPress={handleConfirmCode}>
                <Text style={styles.btnText}>{isVerifyingCode ? 'Vérification...' : 'Confirmer'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                activeOpacity={0.85}
                disabled={isSendingCode || resendCooldown > 0}
                onPress={handleSendCode}>
                <Text style={[styles.textButtonLabel, (isSendingCode || resendCooldown > 0) && styles.disabledTextButtonLabel]}>
                  {isSendingCode ? 'Envoi...' : resendCooldown > 0 ? ('Renvoyer dans ' + resendCooldown + 's') : 'Renvoyer le code'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === 'profile' ? (
            <>
              <Text style={styles.stepTitle}>Compléter le profil</Text>
              <Text style={styles.verifiedText}>
                {verifiedContact} vérifié
              </Text>

            <View style={styles.inputBox}>
              <Ionicons name="person" size={26} color="#87909F" style={styles.inputIcon} />
              <TextInput
                placeholder="Nom complet"
                placeholderTextColor="#87909F"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
              />
            </View>

            <Pressable
              style={styles.inputBox}
              onPress={() => {
                if (!birthDate) {
                  applyBirthDate(birthDay, birthMonth, birthYear);
                }
                setShowBirthSelector((value) => !value);
              }}>
              <Ionicons name="calendar" size={26} color="#87909F" style={styles.inputIcon} />
              <Text style={[styles.dateValueText, !birthDate && styles.datePlaceholder]}>
                {birthDate || 'Date de naissance'}
              </Text>
              <Ionicons name={showBirthSelector ? 'chevron-up' : 'chevron-down'} size={22} color="#87909F" />
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

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed" size={26} color="#87909F" style={styles.inputIcon} />
              <TextInput
                placeholder="Mot de passe"
                placeholderTextColor="#87909F"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                style={styles.input}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={26} color="#87909F" />
              </Pressable>
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed" size={26} color="#87909F" style={styles.inputIcon} />
              <TextInput
                placeholder="Confirmer mot de passe"
                placeholderTextColor="#87909F"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                style={styles.input}
              />
              <Pressable onPress={() => setShowConfirmPassword((value) => !value)} hitSlop={10}>
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={26} color="#87909F" />
              </Pressable>
            </View>

            <Text style={styles.label}>Choisir votre rôle :</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'passager' && styles.active]}
                activeOpacity={0.85}
                onPress={() => setRole('passager')}>
                <Ionicons name="people" size={31} color={role === 'passager' ? 'white' : '#061F68'} />
                <Text style={[styles.roleText, role === 'passager' && styles.activeRoleText]}>Passager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleBtn, role === 'chauffeur' && styles.active]}
                activeOpacity={0.85}
                onPress={() => setRole('chauffeur')}>
                <MaterialCommunityIcons name="steering" size={33} color={role === 'chauffeur' ? 'white' : '#061F68'} />
                <Text style={[styles.roleText, role === 'chauffeur' && styles.activeRoleText]}>Chauffeur</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.roleBtn, styles.agentRoleBtn, role === 'agent' && styles.active]}
              activeOpacity={0.85}
              onPress={() => setRole('agent')}>
              <MaterialCommunityIcons name="account-tie" size={31} color={role === 'agent' ? 'white' : '#061F68'} />
              <Text style={[styles.roleText, role === 'agent' && styles.activeRoleText]}>Agent</Text>
            </TouchableOpacity>

              <TouchableOpacity style={styles.btn} activeOpacity={0.9} onPress={handleRegister}>
                <Text style={styles.btnText}>Créer</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>
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

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

const BLUE = '#062B96';
const NAVY = '#07143C';
const MUTED = '#6D7187';
const BORDER = '#D7DAE5';
const LIGHT_BLUE = '#F1F5FF';

type Step = 1 | 2 | 3 | 4;
type Role = 'passager' | 'chauffeur' | 'agent';

const STEP_LABELS = ['Numéro', 'OTP', 'Informations', 'Mot de passe'];

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('243')) return `+${digits.slice(0, 12)}`;
  return `+243${digits.replace(/^0+/, '').slice(0, 9)}`;
}

function displayPhone(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^243/, '').slice(0, 9);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`;
}

function isValidBirthDate(value: string) {
  const match = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const maxYear = new Date().getFullYear() - 12;
  return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year && year >= maxYear - 100 && year <= maxYear;
}

export default function Register() {
  const router = useRouter();
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const [step, setStep] = useState<Step>(1);
  const [phoneInput, setPhoneInput] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [fallbackCode, setFallbackCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [role, setRole] = useState<Role>('passager');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<TextInput>(null);

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const strongPassword = Object.values(passwordRules).every(Boolean);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const goBack = () => {
    if (step === 1) router.back();
    else setStep((step - 1) as Step);
  };

  const sendCode = async (resend = false) => {
    if (loading || (resend && resendCooldown > 0)) return;
    const phone = resend ? verifiedPhone : normalizePhone(phoneInput);
    if (!/^\+243\d{9}$/.test(phone)) {
      Alert.alert('Numéro invalide', 'Entrez un numéro congolais valide de 9 chiffres.');
      return;
    }
    try {
      setLoading(true);
      const result = await requestVerificationCode(phone, 'register');
      setVerifiedPhone(phone);
      setFallbackCode(result?.code ? String(result.code) : '');
      setVerificationCode('');
      setResendCooldown(60);
      setStep(2);
      if (result?.code) Alert.alert('Code OTP', `Votre code est ${result.code}`);
      setTimeout(() => otpRef.current?.focus(), 250);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d’envoyer le code OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) return;
    try {
      setLoading(true);
      if (fallbackCode && fallbackCode !== verificationCode) throw new Error('Le code OTP est incorrect.');
      await verifyVerificationCode(verifiedPhone, verificationCode, 'register');
      setStep(3);
    } catch (error: any) {
      Alert.alert('Code incorrect', error?.message || 'Vérifiez le code reçu.');
    } finally {
      setLoading(false);
    }
  };

  const continueProfile = () => {
    if (!fullName.trim()) {
      Alert.alert('Nom manquant', 'Entrez votre nom complet.');
      return;
    }
    if (!isValidBirthDate(birthDate)) {
      Alert.alert('Date invalide', 'Entrez une date valide au format JJ / MM / AAAA.');
      return;
    }
    setStep(4);
  };

  const createAccount = async () => {
    if (!strongPassword) {
      Alert.alert('Mot de passe trop faible', 'Respectez les quatre règles indiquées.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Confirmation incorrecte', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    try {
      setLoading(true);
      const result = await registerAccount({
        contact: verifiedPhone,
        code: verificationCode,
        fullName: fullName.trim(),
        birthDate: birthDate.replace(/\s/g, ''),
        password,
        role,
      });
      const user = result?.user;
      if (user) {
        setCurrentUser({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          birthDate: user.birthDate,
          balance: user.balance,
          role: user.role,
        });
      }
      Alert.alert('Compte créé', role === 'passager' ? 'Votre compte TaKo est prêt.' : 'Votre compte a été envoyé pour validation.', [
        { text: 'Se connecter', onPress: () => router.replace('/login' as any) },
      ]);
    } catch (error: any) {
      Alert.alert('Inscription impossible', error?.message || 'Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={30} color={BLUE} />
          </TouchableOpacity>
          <View style={styles.logoWrap}><TakoLogo /></View>
          <View style={styles.backButton} />
        </View>

        <Progress step={step} />

        {step === 1 && (
          <View style={styles.content}>
            <Text style={styles.title}>Bienvenue sur TaKo !</Text>
            <Text style={styles.subtitle}>Commencez par entrer votre numéro{`\n`}de téléphone.</Text>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <View style={styles.phoneField}>
              <Text style={styles.flag}>🇨🇩</Text>
              <Ionicons name="chevron-down" size={18} color={MUTED} />
              <View style={styles.divider} />
              <Text style={styles.countryCode}>+243</Text>
              <View style={styles.divider} />
              <TextInput
                style={styles.phoneInput}
                value={displayPhone(phoneInput)}
                onChangeText={(value) => setPhoneInput(value.replace(/\D/g, '').slice(0, 9))}
                placeholder="Entrez votre numéro"
                placeholderTextColor="#9296A8"
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={12}
              />
            </View>
            <InfoBox text="Nous vous enverrons un code OTP pour vérifier votre numéro." />
            <PrimaryButton label="Continuer" loading={loading} disabled={phoneInput.replace(/\D/g, '').length !== 9} onPress={() => sendCode()} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.content}>
            <Text style={styles.title}>Vérifiez votre numéro</Text>
            <Text style={styles.subtitle}>Nous avons envoyé un code OTP à</Text>
            <Text style={styles.phonePreview}>🇨🇩   {verifiedPhone.replace('+243', '+243 ')}</Text>
            <Text style={styles.otpInstruction}>Entrez le code à 6 chiffres pour continuer.</Text>
            <Pressable style={styles.otpRow} onPress={() => otpRef.current?.focus()}>
              <TextInput
                ref={otpRef}
                style={styles.hiddenInput}
                value={verificationCode}
                onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View key={index} style={[styles.otpBox, verificationCode.length === index && styles.otpBoxActive]}>
                  <Text style={styles.otpDigit}>{verificationCode[index] || ''}</Text>
                </View>
              ))}
            </Pressable>
            <Text style={styles.timerText}>Renvoyer le code dans <Text style={styles.timerStrong}>00:{String(resendCooldown).padStart(2, '0')}</Text></Text>
            <View style={styles.resendCard}>
              <View style={styles.resendIcon}><MaterialCommunityIcons name="shield-check-outline" size={26} color={BLUE} /></View>
              <View style={styles.resendCopy}>
                <Text style={styles.resendTitle}>Vous n’avez pas reçu le code ?</Text>
                <Text style={styles.resendText}>Vérifiez votre réseau ou renvoyez le code OTP.</Text>
              </View>
              <TouchableOpacity disabled={resendCooldown > 0 || loading} onPress={() => sendCode(true)}>
                <Text style={[styles.resendLink, resendCooldown > 0 && styles.disabledLink]}>Renvoyer</Text>
              </TouchableOpacity>
            </View>
            <PrimaryButton label="Continuer" loading={loading} disabled={verificationCode.length !== 6} onPress={verifyCode} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.content}>
            <Text style={styles.title}>Vos informations</Text>
            <Text style={styles.subtitle}>Veuillez compléter vos informations personnelles pour créer votre compte.</Text>
            <Text style={styles.label}>Nom complet</Text>
            <InputField icon="person-outline" placeholder="Entrez votre nom complet" value={fullName} onChangeText={setFullName} />
            <Text style={styles.label}>Date de naissance</Text>
            <InputField
              icon="calendar-outline"
              placeholder="JJ / MM / AAAA"
              value={birthDate}
              onChangeText={(value) => setBirthDate(formatBirthDate(value))}
              keyboardType="number-pad"
              maxLength={14}
              trailing="chevron-down"
            />
            <Text style={styles.label}>Je suis</Text>
            <View style={styles.rolesRow}>
              <RoleCard selected={role === 'passager'} icon="person" title="Passager" subtitle="Payer et voyager" onPress={() => setRole('passager')} />
              <RoleCard selected={role === 'chauffeur'} materialIcon="steering" title="Chauffeur" subtitle="Conduire et encaisser" onPress={() => setRole('chauffeur')} />
              <RoleCard selected={role === 'agent'} materialIcon="account-cash" title="Agent" subtitle="Recharger des cartes" onPress={() => setRole('agent')} />
            </View>
            <PrimaryButton label="Continuer" disabled={!fullName.trim() || !birthDate.trim()} onPress={continueProfile} />
          </View>
        )}

        {step === 4 && (
          <View style={styles.content}>
            <Text style={styles.title}>Créez votre mot de passe</Text>
            <Text style={styles.subtitle}>Pour sécuriser votre compte, choisissez un mot de passe fort.</Text>
            <Text style={styles.label}>Mot de passe</Text>
            <PasswordField value={password} onChangeText={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} placeholder="Entrez votre mot de passe" />
            <View style={styles.rules}>
              <Rule ok={passwordRules.length} icon="shield-checkmark-outline" text="Au moins 8 caractères" />
              <Rule ok={passwordRules.uppercase} badge="Aa" text="Au moins une lettre majuscule" />
              <Rule ok={passwordRules.number} badge="123" text="Au moins un chiffre" />
              <Rule ok={passwordRules.special} badge="@" text="Au moins un caractère spécial (ex : @, #, !)" />
            </View>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <PasswordField value={confirmPassword} onChangeText={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} placeholder="Entrez à nouveau votre mot de passe" />
            <InfoBox text="Choisissez un mot de passe que vous n’utilisez pas sur d’autres plateformes." />
            <PrimaryButton label="Créer mon compte" loading={loading} disabled={!strongPassword || password !== confirmPassword} onPress={createAccount} />
          </View>
        )}

        <View style={styles.secureFooter}>
          <Ionicons name="lock-closed-outline" size={19} color="#85899A" />
          <Text style={styles.secureText}>Vos données sont sécurisées et confidentielles</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Progress({ step }: { step: Step }) {
  return (
    <View style={styles.progress}>
      <View style={styles.progressTop}>
        {STEP_LABELS.map((_, index) => {
          const number = index + 1;
          const complete = number < step;
          const active = number === step;
          return (
            <View key={number} style={styles.progressPiece}>
              {index > 0 && <View style={[styles.progressLine, complete && styles.progressLineDone]} />}
              <View style={[styles.stepCircle, (complete || active) && styles.stepCircleActive]}>
                {complete ? <Ionicons name="checkmark" size={23} color="white" /> : <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{number}</Text>}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.progressLabels}>
        {STEP_LABELS.map((label, index) => <Text key={label} style={[styles.stepLabel, index + 1 === step && styles.stepLabelActive]}>{label}</Text>)}
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false, loading = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <TouchableOpacity style={[styles.primaryButton, (disabled || loading) && styles.primaryDisabled]} disabled={disabled || loading} activeOpacity={0.88} onPress={onPress}>
      {loading ? <ActivityIndicator color="white" /> : <><Text style={styles.primaryText}>{label}</Text><Ionicons name="arrow-forward" size={30} color="white" /></>}
    </TouchableOpacity>
  );
}

function InfoBox({ text }: { text: string }) {
  return <View style={styles.infoBox}><View style={styles.infoIcon}><Text style={styles.infoLetter}>i</Text></View><Text style={styles.infoText}>{text}</Text></View>;
}

function InputField(props: any) {
  return (
    <View style={styles.inputField}>
      <Ionicons name={props.icon} size={29} color={BLUE} />
      <TextInput {...props} icon={undefined} trailing={undefined} style={styles.textInput} placeholderTextColor="#8D91A3" />
      {props.trailing && <Ionicons name={props.trailing} size={25} color={BLUE} />}
    </View>
  );
}

function PasswordField({ value, onChangeText, visible, onToggle, placeholder }: any) {
  return (
    <View style={styles.inputField}>
      <Ionicons name="lock-closed-outline" size={28} color={NAVY} />
      <TextInput style={styles.textInput} value={value} onChangeText={onChangeText} secureTextEntry={!visible} placeholder={placeholder} placeholderTextColor="#8D91A3" autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" />
      <Pressable onPress={onToggle} hitSlop={12}><Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={27} color={MUTED} /></Pressable>
    </View>
  );
}

function RoleCard({ selected, icon, materialIcon, title, subtitle, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.roleCard, selected && styles.roleCardSelected]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.roleRadio}>{selected && <View style={styles.roleRadioInner} />}</View>
      {materialIcon ? <MaterialCommunityIcons name={materialIcon} size={31} color={BLUE} /> : <Ionicons name={icon} size={31} color={BLUE} />}
      <View style={styles.roleCopy}><Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{title}</Text><Text style={styles.roleSubtitle}>{subtitle}</Text></View>
    </TouchableOpacity>
  );
}

function Rule({ ok, icon, badge, text }: { ok: boolean; icon?: any; badge?: string; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleDot, ok && styles.ruleDotOk]}>{ok && <Ionicons name="checkmark" size={12} color="white" />}</View>
      <View style={styles.ruleBadge}>{icon ? <Ionicons name={icon} size={18} color={BLUE} /> : <Text style={styles.ruleBadgeText}>{badge}</Text>}</View>
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  container: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 26, paddingTop: Platform.OS === 'web' ? 26 : 48, paddingBottom: 32, backgroundColor: 'white' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 100 },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { transform: [{ scale: 1.25 }] },
  progress: { marginTop: 24, marginBottom: 72 },
  progressTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  progressPiece: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  progressLine: { flex: 1, height: 2, borderStyle: 'dashed', borderWidth: 1, borderColor: '#C8CBD7', marginHorizontal: 7 },
  progressLineDone: { borderColor: BLUE },
  stepCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: '#C9CCD7', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: BLUE, borderColor: BLUE },
  stepNumber: { color: MUTED, fontSize: 20, fontWeight: '700' },
  stepNumberActive: { color: 'white' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  stepLabel: { width: '25%', textAlign: 'center', color: MUTED, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  stepLabelActive: { color: BLUE, fontWeight: '800' },
  content: { flex: 1 },
  title: { color: NAVY, fontSize: 34, lineHeight: 42, fontWeight: '900', marginBottom: 15 },
  subtitle: { color: MUTED, fontSize: 19, lineHeight: 29, fontWeight: '500', marginBottom: 45 },
  label: { color: NAVY, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  phoneField: { minHeight: 74, borderWidth: 1.4, borderColor: BORDER, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  flag: { fontSize: 29 },
  divider: { width: 1, height: 43, backgroundColor: '#E0E2E9', marginHorizontal: 12 },
  countryCode: { color: NAVY, fontSize: 18, fontWeight: '800' },
  phoneInput: { flex: 1, color: NAVY, fontSize: 17, fontWeight: '600', paddingVertical: 18 },
  infoBox: { marginTop: 30, borderRadius: 13, backgroundColor: LIGHT_BLUE, paddingHorizontal: 20, paddingVertical: 19, flexDirection: 'row', alignItems: 'center', gap: 17 },
  infoIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  infoLetter: { color: 'white', fontSize: 26, fontWeight: '800' },
  infoText: { flex: 1, color: NAVY, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  primaryButton: { minHeight: 70, borderRadius: 13, backgroundColor: BLUE, marginTop: 48, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { flex: 1, color: 'white', fontSize: 21, fontWeight: '800', textAlign: 'center', paddingLeft: 28 },
  secureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30 },
  secureText: { color: '#85899A', fontSize: 14, fontWeight: '500' },
  phonePreview: { color: NAVY, fontSize: 18, fontWeight: '800', marginTop: -34, marginBottom: 16 },
  otpInstruction: { color: MUTED, fontSize: 17, marginBottom: 32 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  otpBox: { width: '14%', aspectRatio: 0.86, maxHeight: 76, borderWidth: 1.4, borderColor: BORDER, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  otpBoxActive: { borderWidth: 2, borderColor: BLUE },
  otpDigit: { color: BLUE, fontSize: 27, fontWeight: '800' },
  timerText: { color: MUTED, fontSize: 17, marginTop: 36, marginBottom: 34 },
  timerStrong: { color: BLUE, fontWeight: '900' },
  resendCard: { borderWidth: 1, borderColor: '#E2E4EA', borderRadius: 13, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resendIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: LIGHT_BLUE, alignItems: 'center', justifyContent: 'center' },
  resendCopy: { flex: 1 },
  resendTitle: { color: NAVY, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  resendText: { color: MUTED, fontSize: 12.5, lineHeight: 18 },
  resendLink: { color: BLUE, fontSize: 15, fontWeight: '800' },
  disabledLink: { color: '#AFB2C0' },
  inputField: { minHeight: 74, borderWidth: 1.4, borderColor: BORDER, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 20, marginBottom: 28 },
  textInput: { flex: 1, color: NAVY, fontSize: 17, fontWeight: '600', paddingVertical: 18 },
  rolesRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  roleCard: { flex: 1, minHeight: 92, borderWidth: 1.4, borderColor: BORDER, borderRadius: 14, padding: 12, alignItems: 'center', justifyContent: 'center' },
  roleCardSelected: { borderWidth: 2, borderColor: BLUE, backgroundColor: '#F6F8FF' },
  roleRadio: { position: 'absolute', right: 9, top: 9, width: 20, height: 20, borderRadius: 10, borderWidth: 1.4, borderColor: '#CFD2DD', alignItems: 'center', justifyContent: 'center' },
  roleRadioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: BLUE },
  roleCopy: { alignItems: 'center', marginTop: 5 },
  roleTitle: { color: NAVY, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  roleTitleSelected: { color: BLUE },
  roleSubtitle: { color: MUTED, fontSize: 10.5, lineHeight: 15, textAlign: 'center', marginTop: 2 },
  rules: { marginTop: -10, marginBottom: 28, paddingHorizontal: 14, gap: 15 },
  ruleRow: { flexDirection: 'row', alignItems: 'center' },
  ruleDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.4, borderColor: '#AEB2C1', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  ruleDotOk: { backgroundColor: '#10A85A', borderColor: '#10A85A' },
  ruleBadge: { width: 34, alignItems: 'flex-start' },
  ruleBadgeText: { color: BLUE, fontSize: 14, fontWeight: '900' },
  ruleText: { flex: 1, color: MUTED, fontSize: 14.5, lineHeight: 20 },
  ruleTextOk: { color: '#18864E' },
});

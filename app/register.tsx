import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { registerAccount, requestVerificationCode } from '../services/api';
import { useStore } from './store';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<'contact' | 'code' | 'profile'>('contact');
  const [role, setRole] = useState<'passager' | 'chauffeur'>('passager');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [verifiedContact, setVerifiedContact] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);

  const generateClientId = () => `TAKO-${Date.now().toString().slice(-6)}`;
  const isEmail = (value: string) => value.includes('@');
  const isValidContact = (value: string) => {
    const cleanValue = value.trim();
    return /\S+@\S+\.\S+/.test(cleanValue) || cleanValue.replace(/\D/g, '').length >= 8;
  };

  const handleSendCode = async () => {
    const cleanContact = contact.trim();
    if (!isValidContact(cleanContact)) {
      Alert.alert('Information manquante', 'Entrez un email ou un numéro valide pour recevoir le code.');
      return;
    }

    try {
      const result = await requestVerificationCode(cleanContact, 'register');
      const nextCode = result?.code ? String(result.code) : '';
      setSentCode(nextCode);
      setVerifiedContact(cleanContact);
      setVerificationCode('');
      setStep('code');
      Alert.alert(
        'Code envoyé',
        nextCode
          ? `Votre code de confirmation est ${nextCode}`
          : 'Votre code de confirmation a été envoyé par email.'
      );
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible d’envoyer le code.');
    }
  };

  const handleConfirmCode = () => {
    if (!verificationCode.trim()) {
      Alert.alert('Code manquant', 'Entrez le code reçu puis réessayez.');
      return;
    }

    if (sentCode && verificationCode.trim() !== sentCode) {
      Alert.alert('Code incorrect', 'Vérifiez le code reçu puis réessayez.');
      return;
    }

    setStep('profile');
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
        status: role === 'chauffeur' ? 'pending' : 'active',
      };

      setCurrentUser({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate,
      });

      console.log('USER CREATED:', user);

      Alert.alert('Compte créé !', `Votre ID client est ${user.id}. Vous pouvez l’utiliser avec votre mot de passe.`);
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

              <TouchableOpacity style={styles.btn} activeOpacity={0.9} onPress={handleSendCode}>
                <Text style={styles.btnText}>Recevoir le code</Text>
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

              <TouchableOpacity style={styles.btn} activeOpacity={0.9} onPress={handleConfirmCode}>
                <Text style={styles.btnText}>Confirmer</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.textButton} activeOpacity={0.85} onPress={handleSendCode}>
                <Text style={styles.textButtonLabel}>Renvoyer le code</Text>
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

            <View style={styles.inputBox}>
              <Ionicons name="calendar" size={26} color="#87909F" style={styles.inputIcon} />
              <TextInput
                placeholder="Date de naissance"
                placeholderTextColor="#87909F"
                value={birthDate}
                onChangeText={setBirthDate}
                style={styles.input}
              />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed" size={26} color="#87909F" style={styles.inputIcon} />
              <TextInput
                placeholder="Mot de passe"
                placeholderTextColor="#87909F"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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
});

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<'passager' | 'chauffeur'>('passager');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = () => {
    const user = {
      role,
      status: role === 'chauffeur' ? 'pending' : 'active',
    };

    console.log('USER CREATED:', user);

    alert('Compte créé !');
    router.replace('/login' as any);
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
          <TakoLogo size="large" />
          <View style={styles.glowLine} />
        </View>

        <Text style={styles.title}>Créer un compte</Text>

        <View style={styles.inputBox}>
          <Ionicons name="person" size={26} color="#87909F" style={styles.inputIcon} />
          <TextInput placeholder="Nom complet" placeholderTextColor="#87909F" style={styles.input} />
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="mail" size={26} color="#87909F" style={styles.inputIcon} />
          <TextInput
            placeholder="Email ou numéro"
            placeholderTextColor="#87909F"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <View style={styles.inputBox}>
          <Ionicons name="lock-closed" size={26} color="#87909F" style={styles.inputIcon} />
          <TextInput
            placeholder="Mot de passe"
            placeholderTextColor="#87909F"
            secureTextEntry={!showPassword}
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
            <Ionicons name="people" size={31} color="white" />
            <Text style={styles.roleText}>Passager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleBtn, role === 'chauffeur' && styles.active]}
            activeOpacity={0.85}
            onPress={() => setRole('chauffeur')}>
            <MaterialCommunityIcons name="steering" size={33} color="white" />
            <Text style={styles.roleText}>Chauffeur</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} activeOpacity={0.9} onPress={handleRegister}>
          <Text style={styles.btnText}>Créer</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#061F68',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 84,
    paddingBottom: 42,
    backgroundColor: '#061F68',
  },
  logoWrap: {
    alignItems: 'flex-start',
    marginBottom: 48,
  },
  logo: {
    fontSize: 78,
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
  glowLine: {
    width: '78%',
    height: 2,
    marginTop: 16,
    backgroundColor: '#0AA4FF',
    shadowColor: '#0AA4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    color: 'white',
    fontSize: 31,
    fontWeight: '800',
    marginBottom: 24,
  },
  inputBox: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    color: '#202836',
    fontSize: 21,
    fontWeight: '500',
  },
  label: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    height: 73,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#126CDE',
    backgroundColor: 'transparent',
    borderRadius: 10,
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#139DFF',
    borderColor: '#139DFF',
  },
  roleText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  btn: {
    height: 80,
    backgroundColor: '#09D457',
    borderRadius: 10,
    marginTop: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
  },
});

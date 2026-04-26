import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  ImageBackground,
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

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'passager' | 'chauffeur' | 'admin'>('passager');

  const handleLogin = () => {
    if (role === 'admin') {
      router.replace('/admin' as any);
      return;
    }

    const user = {
      role,
      status: 'active',
    };

    if (user.role === 'chauffeur' && user.status !== 'active') {
      alert('⏳ Chauffeur en attente de validation');
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
      <View style={styles.overlay}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <TakoLogo size="login" />
            </View>

            <View style={styles.form}>
              <Text style={styles.title}>Connexion</Text>

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

              <Text style={styles.label}>Se connecter comme :</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'passager' && styles.activeRole]}
                  activeOpacity={0.85}
                  onPress={() => setRole('passager')}>
                  <Ionicons name="person" size={22} color="white" />
                  <Text style={styles.roleText}>Client</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleBtn, role === 'chauffeur' && styles.activeRole]}
                  activeOpacity={0.85}
                  onPress={() => setRole('chauffeur')}>
                  <Ionicons name="car" size={22} color="white" />
                  <Text style={styles.roleText}>Chauffeur</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.adminBtn, role === 'admin' && styles.activeRole]}
                activeOpacity={0.85}
                onPress={() => setRole('admin')}>
                <Ionicons name="shield-checkmark" size={22} color="white" />
                <Text style={styles.roleText}>Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btn} activeOpacity={0.9} onPress={handleLogin}>
                <Text style={styles.btnText}>Se connecter</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/register' as any)}>
                <Text style={styles.link}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(1, 12, 33, 0.48)',
  },
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 42,
    paddingBottom: 38,
  },
  logoWrap: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  form: {
    width: '100%',
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
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleBtn: {
    flex: 1,
    height: 58,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtn: {
    height: 58,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#126CDE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRole: {
    backgroundColor: '#139DFF',
    borderColor: '#139DFF',
  },
  roleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  btn: {
    height: 80,
    backgroundColor: '#09D457',
    borderRadius: 10,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
  },
  link: {
    color: '#8FD5FF',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 18,
    fontWeight: '700',
  },
});

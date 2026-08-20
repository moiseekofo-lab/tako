import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getClientProfile } from '../services/api';
import { translations, type Language } from './i18n';
import { useStore } from './store';

export default function MyData() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useStore((state: any) => state.language) as Language;
  const currentUser = useStore((state: any) => state.currentUser);
  const isAuthenticated = useStore((state: any) => state.isAuthenticated);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const text = translations[language];
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const phoneFieldY = useRef(0);
  const phoneFocused = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' && !isAuthenticated) {
      router.replace('/login' as any);
    }
  }, [isAuthenticated, router]);

  const syncClientProfile = async (silent = true) => {
    if (!currentUser?.id || currentUser.id === '1000000001') {
      return;
    }

    try {
      if (!silent) {
        setRefreshing(true);
      }
      const result = await getClientProfile(currentUser.id);
      if (result?.client) {
        setCurrentUser(result.client);
        setEmail(result.client.email || '');
        setPhone(result.client.phone || '');
      }
    } catch {
      // La page garde les données locales si le réseau est momentanément indisponible.
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || currentUser.id === '1000000001') {
      return undefined;
    }

    syncClientProfile(true);
    const interval = setInterval(() => syncClientProfile(true), 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id]);

  const scrollToPhoneField = (delay = 120) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(phoneFieldY.current - 170, 0),
        animated: true,
      });
    }, delay);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      if (phoneFocused.current) {
        scrollToPhoneField(260);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const updateEditableData = () => {
    setCurrentUser({
      ...currentUser,
      email: email.trim() || currentUser.email,
      phone: phone.trim(),
    });
    Alert.alert(text.dataUpdated);
  };

  const refreshPage = () => {
    syncClientProfile(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <View style={[styles.header, { height: 58 + insets.top, paddingTop: insets.top }]}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={33} color="#061F68" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{text.myData}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.card,
          { paddingBottom: 14 + insets.bottom },
          keyboardHeight > 0 && styles.cardWithKeyboard,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshPage} tintColor="#061F68" colors={['#061F68']} />
        }>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={70} color="white" />
        </View>

        <Text style={styles.notice}>{text.immutableDataNotice}</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>ID</Text>
          <TextInput value={currentUser.id} editable={false} style={[styles.input, styles.lockedInput]} />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{text.fullName}</Text>
          <TextInput value={currentUser.fullName} editable={false} style={[styles.input, styles.lockedInput]} />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{text.registeredEmail}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <View
          style={styles.fieldBlock}
          onLayout={(event) => {
            phoneFieldY.current = event.nativeEvent.layout.y;
          }}>
          <Text style={styles.label}>{text.phone}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            onFocus={() => {
              phoneFocused.current = true;
              scrollToPhoneField();
              scrollToPhoneField(420);
            }}
            onBlur={() => {
              phoneFocused.current = false;
            }}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{text.birthDate}</Text>
          <TextInput value={currentUser.birthDate || '--/--/----'} editable={false} style={[styles.input, styles.lockedInput]} />
        </View>

        <TouchableOpacity style={styles.updateButton} activeOpacity={0.9} onPress={updateEditableData}>
          <Ionicons name="pencil" size={23} color="white" />
          <Text style={styles.updateText}>{text.update}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#061F68',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSpacer: {
    width: 33,
  },
  scrollArea: {
    flex: 1,
  },
  card: {
    flexGrow: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 14,
    alignItems: 'stretch',
  },
  cardWithKeyboard: {
    paddingBottom: 28,
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: '#09D457',
    backgroundColor: '#061F68',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  notice: {
    color: '#202836',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  fieldBlock: {
    marginBottom: 10,
  },
  label: {
    color: '#139DFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
  },
  input: {
    minHeight: 34,
    borderBottomWidth: 1.3,
    borderBottomColor: '#555',
    color: '#202836',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 3,
  },
  lockedInput: {
    color: '#9B9B9B',
    borderBottomColor: '#DADADA',
  },
  updateButton: {
    height: 48,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#061F68',
    marginTop: 8,
  },
  updateText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});

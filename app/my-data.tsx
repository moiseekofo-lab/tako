import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { translations, type Language } from './i18n';
import { useStore } from './store';

export default function MyData() {
  const router = useRouter();
  const language = useStore((state: any) => state.language) as Language;
  const currentUser = useStore((state: any) => state.currentUser);
  const setCurrentUser = useStore((state: any) => state.setCurrentUser);
  const text = translations[language];
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone);

  const updateEditableData = () => {
    setCurrentUser({
      ...currentUser,
      email: email.trim() || currentUser.email,
      phone: phone.trim(),
    });
    Alert.alert(text.dataUpdated);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={33} color="#061F68" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{text.myData}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={70} color="white" />
        </View>

        <Text style={styles.notice}>{text.immutableDataNotice}</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>ID</Text>
          <TextInput value={currentUser.id} editable={false} style={[styles.input, styles.lockedInput]} />
          <Text style={styles.lockedHint}>{text.idNeverEditable}</Text>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{text.fullName}</Text>
          <TextInput value={currentUser.fullName} editable={false} style={[styles.input, styles.lockedInput]} />
          <Text style={styles.lockedHint}>{text.adminOnlyEdit}</Text>
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

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{text.phone}</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{text.birthDate}</Text>
          <TextInput value={currentUser.birthDate || '--/--/----'} editable={false} style={[styles.input, styles.lockedInput]} />
          <Text style={styles.lockedHint}>{text.adminOnlyEdit}</Text>
        </View>

        <TouchableOpacity style={styles.updateButton} activeOpacity={0.9} onPress={updateEditableData}>
          <Ionicons name="pencil" size={23} color="white" />
          <Text style={styles.updateText}>{text.update}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    paddingTop: 58,
  },
  header: {
    height: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  headerTitle: {
    color: '#061F68',
    fontSize: 31,
    fontWeight: '900',
  },
  headerSpacer: {
    width: 33,
  },
  card: {
    flexGrow: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 46,
    alignItems: 'stretch',
  },
  avatarCircle: {
    width: 145,
    height: 145,
    borderRadius: 73,
    borderWidth: 6,
    borderColor: '#09D457',
    backgroundColor: '#061F68',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 28,
  },
  notice: {
    color: '#1F2937',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 34,
  },
  fieldBlock: {
    marginBottom: 22,
  },
  label: {
    color: '#139DFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
  },
  input: {
    minHeight: 42,
    borderBottomWidth: 1.3,
    borderBottomColor: '#555',
    color: '#202836',
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: 6,
  },
  lockedInput: {
    color: '#9B9B9B',
    borderBottomColor: '#DADADA',
  },
  lockedHint: {
    color: '#9B9B9B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  updateButton: {
    height: 66,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 33,
    backgroundColor: '#09D457',
    marginTop: 28,
  },
  updateText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { translations, type Language } from './i18n';
import { useStore, type TransactionNotification } from './store';

const getIconName = (type: TransactionNotification['type']) => {
  if (type === 'recharge') {
    return 'cash-plus';
  }

  if (type === 'nfc') {
    return 'contactless-payment';
  }

  return 'qrcode-scan';
};

const formatDate = (date: string, locale: string) =>
  new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Notifications() {
  const router = useRouter();
  const notifications = useStore((state: any) => state.notifications) as TransactionNotification[];
  const markNotificationsRead = useStore((state: any) => state.markNotificationsRead);
  const language = useStore((state: any) => state.language) as Language;
  const text = translations[language];
  const dateLocale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{text.notifications}</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={58} color="#139DFF" />
            <Text style={styles.emptyTitle}>{text.noNotifications}</Text>
            <Text style={styles.emptyText}>{text.notificationsEmpty}</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name={getIconName(notification.type) as any} size={30} color="white" />
              </View>
              <View style={styles.notificationBody}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationDate}>{formatDate(notification.createdAt, dateLocale)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#061F68',
    paddingHorizontal: 28,
    paddingTop: 58,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#139DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 48,
  },
  headerTitle: {
    color: 'white',
    fontSize: 27,
    fontWeight: '900',
  },
  content: {
    paddingBottom: 38,
  },
  emptyBox: {
    minHeight: 260,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  emptyTitle: {
    color: '#061F68',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 16,
  },
  emptyText: {
    color: '#667085',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 18,
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#09D457',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    color: '#061F68',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  notificationMessage: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  notificationDate: {
    color: '#87909F',
    fontSize: 13,
    fontWeight: '700',
  },
});

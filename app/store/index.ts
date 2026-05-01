import { create } from 'zustand';
import type { Language } from '../i18n';

export type TransactionNotification = {
  id: string;
  title: string;
  message: string;
  amount: number;
  type: 'recharge' | 'qr' | 'nfc';
  createdAt: string;
  read: boolean;
};

export type TripHistoryItem = {
  id: string;
  bus: string;
  route: string;
  amount: number;
  paymentType: 'qr' | 'nfc';
  createdAt: string;
};

export type DriverTripInfo = {
  amount: string;
  route: string;
  bus: string;
};

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
};

type StoreState = {
  language: Language;
  currentUser: CurrentUser;
  balance: number;
  nfcCardId: string | null;
  nfcCardBlocked: boolean;
  notifications: TransactionNotification[];
  trips: TripHistoryItem[];
  driverTripInfo: DriverTripInfo;
  setLanguage: (language: Language) => void;
  setCurrentUser: (user: CurrentUser) => void;
  setDriverTripInfo: (info: DriverTripInfo) => void;
  increaseBalance: (amount: number) => void;
  setNfcCardId: (cardId: string) => void;
  setNfcCardBlocked: (blocked: boolean) => void;
  addNotification: (notification: Omit<TransactionNotification, 'id' | 'createdAt' | 'read'>) => void;
  addTrip: (trip: Omit<TripHistoryItem, 'id' | 'createdAt'>) => void;
  markNotificationsRead: () => void;
};

export const useStore = create<StoreState>((set) => ({
  language: 'fr',
  currentUser: {
    id: 'TAKO-000001',
    fullName: 'Client TaKo',
    email: 'client@tako.app',
    phone: '',
    birthDate: '',
  },
  balance: 0,
  nfcCardId: null,
  nfcCardBlocked: false,
  notifications: [],
  driverTripInfo: {
    amount: '',
    route: '',
    bus: '',
  },
  trips: [
    {
      id: 'demo-trip-1',
      bus: 'Bus T-204',
      route: 'Centre-ville → Université',
      amount: 500,
      paymentType: 'qr',
      createdAt: new Date().toISOString(),
    },
  ],
  setLanguage: (language) =>
    set({
      language,
    }),
  setCurrentUser: (user) =>
    set({
      currentUser: user,
    }),
  setDriverTripInfo: (info) =>
    set({
      driverTripInfo: info,
    }),
  increaseBalance: (amount) =>
    set((state) => ({
      balance: state.balance + amount,
    })),
  setNfcCardId: (cardId) =>
    set({
      nfcCardId: cardId,
    }),
  setNfcCardBlocked: (blocked) =>
    set({
      nfcCardBlocked: blocked,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ],
    })),
  addTrip: (trip) =>
    set((state) => ({
      trips: [
        {
          ...trip,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: new Date().toISOString(),
        },
        ...state.trips,
      ],
    })),
  markNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    })),
}));

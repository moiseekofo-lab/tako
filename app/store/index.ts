import { create } from 'zustand';

type StoreState = {
  balance: number;
  nfcCardId: string | null;
  increaseBalance: (amount: number) => void;
  setNfcCardId: (cardId: string) => void;
};

export const useStore = create<StoreState>((set) => ({
  balance: 0,
  nfcCardId: null,
  increaseBalance: (amount) =>
    set((state) => ({
      balance: state.balance + amount,
    })),
  setNfcCardId: (cardId) =>
    set({
      nfcCardId: cardId,
    }),
}));

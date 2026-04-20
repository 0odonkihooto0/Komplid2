import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  wasOffline: boolean;
  setOnline: (online: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  wasOffline: false,
  setOnline: (online: boolean) => {
    const prev = get().isOnline;
    if (prev === online) return;
    set({
      isOnline: online,
      wasOffline: get().wasOffline || !online,
    });
  },
}));

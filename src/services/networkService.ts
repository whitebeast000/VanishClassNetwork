import NetInfo from '@react-native-community/netinfo';

// Only "is there a network at all". NOT "is the relay reachable":
// the relay can be on your LAN with no internet, so isInternetReachable is ignored.
export function subscribeNetwork(cb: (online: boolean) => void): () => void {
  const unsubscribe = NetInfo.addEventListener(state => cb(state.isConnected === true));
  return () => unsubscribe();
}
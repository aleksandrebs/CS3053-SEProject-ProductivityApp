import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 */
export function useColorScheme() {
  const isServer = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true,
  );
  const colorScheme = useRNColorScheme();

  if (isServer) {
    return 'light';
  }

  return colorScheme;
}

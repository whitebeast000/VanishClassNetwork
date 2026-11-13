import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useAppLifecycle(onActive: () => void, onBackground?: () => void): void {
  const a = useRef(onActive);
  const b = useRef(onBackground);
  a.current = onActive;
  b.current = onBackground;
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') a.current();
      else b.current?.();
    });
    return () => sub.remove();
  }, []);
}
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MESSAGE_LIFETIME_MS } from '../types/protocol';
import { colors } from '../theme/colors';
import { remainingMs } from '../utils/time';

// The interval ONLY forces a re-render. The remaining time is always
// recomputed from the absolute expires_at, never counted down in a variable.
export default function MessageTimer({ expiresAt }: { expiresAt: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = remainingMs(expiresAt);
  const secs = Math.ceil(ms / 1000);
  const urgent = secs <= 5;
  const color = urgent ? colors.expire : colors.accent;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(ms / MESSAGE_LIFETIME_MS) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.text, { color }]}>{secs}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  text: { fontSize: 11, fontWeight: '600', minWidth: 24, textAlign: 'right' },
});
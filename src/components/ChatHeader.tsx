import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ConnectionState } from '../types/connection';
import { colors } from '../theme/colors';
import { LogoMark } from './Logo';

const STATE_INFO: Record<ConnectionState, { label: string; color: string }> = {
  CONNECTED: { label: 'Live', color: colors.success },
  CONNECTING: { label: 'Connecting…', color: colors.accent },
  RECONNECTING: { label: 'Reconnecting…', color: colors.accent2 },
  DISCONNECTED: { label: 'Offline', color: colors.textMuted },
  ERROR: { label: 'Connection error', color: colors.expire },
};

interface Props {
  online: number;
  state: ConnectionState;
  onSettings: () => void;
}

export default function ChatHeader({ online, state, onSettings }: Props) {
  const info = STATE_INFO[state];
  return (
    <View style={styles.wrap}>
      <LogoMark size={36} />
      <View style={styles.mid}>
        <Text style={styles.room}>CS CLASS NETWORK</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: info.color }]} />
          <Text style={styles.status}>{info.label}</Text>
          <Text style={styles.status}>·  {online} online</Text>
        </View>
      </View>
      <Pressable onPress={onSettings} hitSlop={12} style={styles.gear}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx="5" cy="12" r="1.8" fill={colors.text} />
          <Circle cx="12" cy="12" r="1.8" fill={colors.text} />
          <Circle cx="19" cy="12" r="1.8" fill={colors.text} />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  mid: { flex: 1 },
  room: { color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: 1.6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  status: { color: colors.textMuted, fontSize: 12 },
  gear: { padding: 6 },
});
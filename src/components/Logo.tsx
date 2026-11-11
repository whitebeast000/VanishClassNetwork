import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  size?: number;
  showWord?: boolean;
}

// A ring that "fades away" (dashed, shrinking) = a message vanishing.
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="26" stroke={colors.accent} strokeWidth="3" fill="none"
        strokeDasharray="120 44" strokeLinecap="round" rotation="-90" origin="32, 32" />
      <Circle cx="32" cy="32" r="16" stroke={colors.accent2} strokeWidth="2.5" fill="none"
        strokeDasharray="40 60" strokeLinecap="round" opacity={0.8} />
      <Circle cx="32" cy="32" r="4" fill={colors.text} opacity={0.9} />
    </Svg>
  );
}

export default function Logo({ size = 64, showWord = true }: Props) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      {showWord && (
        <Text style={[styles.word, { fontSize: size * 0.42 }]}>VANISH</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { color: colors.text, fontWeight: '700', letterSpacing: 5 },
});
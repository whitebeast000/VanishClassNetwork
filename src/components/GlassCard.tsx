import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: 'none' | 'accent' | 'violet';
}

// NOTE: no elevation/shadow here on purpose. On Android a shadow under a
// translucent background shows through as an ugly rectangle.
export default function GlassCard({ children, style, tint = 'none' }: Props) {
  return (
    <View
      style={[
        styles.card,
        tint === 'accent' && styles.accent,
        tint === 'violet' && styles.violet,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  accent: { backgroundColor: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.30)' },
  violet: { backgroundColor: 'rgba(139,124,255,0.08)', borderColor: 'rgba(139,124,255,0.30)' },
});
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function GlassButton({
  title, onPress, variant = 'primary', loading = false, disabled = false, style,
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        pressed && { opacity: 0.85 },
        inactive && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bgPrimary : colors.text} />
      ) : (
        <Text style={[styles.text, variant === 'primary' && { color: colors.bgPrimary },
          variant === 'danger' && { color: colors.expire }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52, borderRadius: radius.pill, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 24, overflow: 'hidden',
  },
  primary: { backgroundColor: colors.accent },
  ghost: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  danger: { backgroundColor: 'rgba(255,100,124,0.10)', borderWidth: 1, borderColor: 'rgba(255,100,124,0.4)' },
  text: { color: colors.text, fontSize: 15, fontWeight: '600', letterSpacing: 0.4 },
});
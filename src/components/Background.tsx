import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bgPrimary} />
            <Stop offset="1" stopColor={colors.bgSecondary} />
          </LinearGradient>
          <RadialGradient id="violet" cx="100%" cy="0%" r="70%">
            <Stop offset="0" stopColor={colors.accent2} stopOpacity="0.13" />
            <Stop offset="1" stopColor={colors.accent2} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="teal" cx="0%" cy="100%" r="70%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.10" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#base)" />
        <Rect width="100%" height="100%" fill="url(#violet)" />
        <Rect width="100%" height="100%" fill="url(#teal)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
});
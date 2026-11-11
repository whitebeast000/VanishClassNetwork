import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import { LogoMark } from '../components/Logo';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const logo = useSharedValue(0);
  const word = useSharedValue(0);
  const tag = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    logo.value = withTiming(1, { duration: 700, easing: ease });
    word.value = withDelay(300, withTiming(1, { duration: 700, easing: ease }));
    tag.value = withDelay(700, withTiming(1, { duration: 700, easing: ease }));
    const t = setTimeout(() => navigation.replace('Join'), 2200);
    return () => clearTimeout(t);
  }, [navigation, logo, word, tag]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value, transform: [{ scale: 0.7 + 0.3 * logo.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value, transform: [{ translateY: 12 * (1 - word.value) }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value }));

  return (
    <Background>
      <View style={styles.center}>
        <Animated.View style={logoStyle}><LogoMark size={110} /></Animated.View>
        <Animated.Text style={[styles.word, wordStyle]}>VANISH</Animated.Text>
        <Animated.View style={tagStyle}>
          <Text style={styles.tag}>Messages that live for 30 seconds.</Text>
        </Animated.View>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  word: { color: colors.text, fontSize: 40, fontWeight: '700', letterSpacing: 10, marginTop: 24, paddingLeft: 10 },
  tag: { color: colors.textMuted, fontSize: 14, marginTop: 12, letterSpacing: 0.5 },
});
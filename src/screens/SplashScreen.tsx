import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import { LogoMark } from '../components/Logo';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const { ready, hasProfile } = useChat();
  const logo = useSharedValue(0);
  const word = useSharedValue(0);
  const tag = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    logo.value = withTiming(1, { duration: 700, easing: ease });
    word.value = withDelay(300, withTiming(1, { duration: 700, easing: ease }));
    tag.value = withDelay(700, withTiming(1, { duration: 700, easing: ease }));
  }, [logo, word, tag]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => navigation.replace(hasProfile ? 'Chat' : 'Join'), 1800);
    return () => clearTimeout(t);
  }, [ready, hasProfile, navigation]);

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
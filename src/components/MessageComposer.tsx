import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { MAX_TEXT_LENGTH } from '../types/protocol';
import { colors } from '../theme/colors';

export default function MessageComposer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const lock = useRef(false); // blocks double taps
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const trimmed = text.trim();
  const canSend = trimmed.length > 0;

  const handleSend = () => {
    if (!canSend || lock.current) return;
    lock.current = true;
    scale.value = withSequence(withTiming(0.82, { duration: 90 }), withTiming(1, { duration: 160 }));
    onSend(trimmed);
    setText('');
    setTimeout(() => { lock.current = false; }, 300);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.box}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message the class…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_TEXT_LENGTH}
        />
        <Text style={[styles.count, text.length > MAX_TEXT_LENGTH - 20 && { color: colors.expire }]}>
          {text.length}/{MAX_TEXT_LENGTH}
        </Text>
      </View>
      <Animated.View style={anim}>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.send, !canSend && styles.sendOff]}>
          <Text style={[styles.arrow, !canSend && { color: colors.textMuted }]}>➤</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.glassBorder,
    backgroundColor: 'rgba(7,19,27,0.6)',
  },
  box: {
    flex: 1, backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1,
    borderRadius: 22, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6,
  },
  input: { color: colors.text, fontSize: 15, maxHeight: 110, paddingVertical: 8 },
  count: { color: colors.textMuted, fontSize: 10, alignSelf: 'flex-end' },
  send: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendOff: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  arrow: { color: colors.bgPrimary, fontSize: 18 },
});
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import MessageComposer from '../components/MessageComposer';
import { RootStackParamList } from '../navigation/types';
import { Message, MESSAGE_LIFETIME_MS } from '../types/protocol';
import { colors } from '../theme/colors';
import { serverNow } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

// PLACEHOLDER IDENTITY. Phase 5 replaces this with the real device ID.
const ME = 'local-device';

export default function ChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [, setTick] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);

  // Re-render each second and drop expired ones (UI stage only; Phase 5 adds SQLite deletion).
  useEffect(() => {
    const id = setInterval(() => {
      setMessages(prev => prev.filter(m => m.expires_at === null || m.expires_at > serverNow()));
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const addLocal = (text: string, mine: boolean, sender: string) => {
    const now = serverNow();
    setMessages(prev => [...prev, {
      id: `${now}-${Math.random()}`, sender, device_id: mine ? ME : 'other',
      text, sent_at: now, expires_at: now + MESSAGE_LIFETIME_MS, status: 'DELIVERED',
    }]);
  };

  const onSend = (text: string) => addLocal(text, true, 'Me');
  // DEV ONLY: lets you see a received bubble. Removed in Phase 5.
  const devAddOther = () => { if (__DEV__) addLocal('Test message from a classmate', false, 'Ayesha'); };

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ChatHeader online={1} state="DISCONNECTED" onSettings={() => navigation.navigate('Settings')} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={({ item }) => <MessageBubble message={item} mine={item.device_id === ME} />}
            contentContainerStyle={messages.length === 0 ? styles.emptyWrap : { paddingVertical: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Pressable onLongPress={devAddOther}>
                  <Svg width={120} height={120} viewBox="0 0 120 120">
                    <Circle cx="60" cy="60" r="50" stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="6 8" opacity={0.7} />
                    <Circle cx="60" cy="60" r="32" stroke={colors.accent2} strokeWidth="2" fill="none" strokeDasharray="4 8" opacity={0.6} />
                    <Circle cx="60" cy="60" r="8" fill={colors.text} opacity={0.85} />
                  </Svg>
                </Pressable>
                <Text style={styles.emptyTitle}>It’s quiet in here</Text>
                <Text style={styles.emptySub}>
                  Say something. Every message disappears 30 seconds after it’s delivered.
                </Text>
              </View>
            }
          />
          <MessageComposer onSend={onSend} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginTop: 20 },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 },
});
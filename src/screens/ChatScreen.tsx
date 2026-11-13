import React, { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import MessageComposer from '../components/MessageComposer';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { StoredMessage } from '../services/storageService';
import { colors } from '../theme/colors';
import { serverNow } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: Props) {
  const chat = useChat();
  const listRef = useRef<FlatList<StoredMessage>>(null);

  // Extra safety: an expired message is never drawn, even before cleanup deletes it.
  const now = serverNow();
  const visible = chat.messages.filter(m => m.expires_at === null || m.expires_at > now);
  const connected = chat.connection === 'CONNECTED';

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ChatHeader
          online={connected ? chat.online : 0}
          state={chat.connection}
          onSettings={() => navigation.navigate('Settings')}
        />
        {!connected && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              {chat.connection === 'ERROR'
                ? (chat.connectionDetail ?? 'Connection error.') + ' Open Settings to fix it.'
                : 'Not connected. Messages you send are queued for up to 60 seconds.'}
            </Text>
          </View>
        )}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <FlatList
            ref={listRef}
            data={visible}
            keyExtractor={m => m.id}
            renderItem={({ item }) => <MessageBubble message={item} mine={item.device_id === chat.deviceId} />}
            contentContainerStyle={visible.length === 0 ? styles.emptyWrap : { paddingVertical: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  <Circle cx="60" cy="60" r="50" stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="6 8" opacity={0.7} />
                  <Circle cx="60" cy="60" r="32" stroke={colors.accent2} strokeWidth="2" fill="none" strokeDasharray="4 8" opacity={0.6} />
                  <Circle cx="60" cy="60" r="8" fill={colors.text} opacity={0.85} />
                </Svg>
                <Text style={styles.emptyTitle}>It’s quiet in here</Text>
                <Text style={styles.emptySub}>
                  Say something. Every message disappears 30 seconds after it’s delivered.
                </Text>
              </View>
            }
          />
          <MessageComposer onSend={text => { chat.send(text).catch(() => undefined); }} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: 'rgba(255,100,124,0.10)', paddingHorizontal: 16, paddingVertical: 8 },
  bannerText: { color: colors.expire, fontSize: 12, lineHeight: 16 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginTop: 20 },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 },
});
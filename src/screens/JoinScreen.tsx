import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import { DEV_RELAY_SUGGESTION } from '../config/relay';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { MAX_NAME_LENGTH } from '../types/protocol';
import { colors } from '../theme/colors';
import { isValidRelayUrl } from '../utils/relay';

type Props = NativeStackScreenProps<RootStackParamList, 'Join'>;

export default function JoinScreen({ navigation }: Props) {
  const chat = useChat();
  const [name, setName] = useState(chat.name);
  const [relay, setRelay] = useState(chat.relayUrl || DEV_RELAY_SUGGESTION);
  const [code, setCode] = useState(chat.roomCode);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const join = async () => {
    if (connecting) return;
    if (name.trim().length < 2) return setError('Enter a display name (at least 2 characters).');
    if (!isValidRelayUrl(relay)) return setError('Relay address must look like ws://192.168.1.5:8080 or wss://host.com');
    setError(null);
    setConnecting(true);
    const r = await chat.join(name, relay, code);
    setConnecting(false);
    if (r.ok) navigation.replace('Chat');
    else setError(r.error ?? 'Could not connect.');
  };

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Logo size={56} />
            <Text style={styles.h1}>Join the class network</Text>
            <Text style={styles.sub}>
              Pick a display name and connect to your class relay. Every message disappears 30 seconds after delivery.
            </Text>

            <GlassCard style={styles.card}>
              <Text style={styles.label}>DISPLAY NAME</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="e.g. Moiz" placeholderTextColor={colors.textMuted}
                maxLength={MAX_NAME_LENGTH} autoCorrect={false} />

              <Text style={styles.label}>RELAY ADDRESS</Text>
              <TextInput style={styles.input} value={relay} onChangeText={setRelay}
                placeholder="ws://192.168.x.x:8080" placeholderTextColor={colors.textMuted}
                autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              <Text style={styles.hint}>The address of your class relay server. Your class representative will share it.</Text>

              <Text style={styles.label}>CLASS CODE (IF REQUIRED)</Text>
              <TextInput style={styles.input} value={code} onChangeText={setCode}
                placeholder="Room code" placeholderTextColor={colors.textMuted}
                autoCapitalize="none" autoCorrect={false} />
              <Text style={styles.hint}>A shared password for your class. Leave empty if none was given.</Text>

              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: connecting ? colors.accent : error ? colors.expire : colors.textMuted }]} />
                <Text style={styles.status}>{connecting ? 'Connecting…' : error ? 'Not connected' : 'Ready to connect'}</Text>
              </View>
              <Text style={styles.device}>Device ID: {chat.deviceId ? chat.deviceId.slice(0, 8) + '…' : '…'}</Text>

              {error && <Text style={styles.error}>{error}</Text>}
              <GlassButton title="Join Network" onPress={join} loading={connecting} style={{ marginTop: 16 }} />
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingTop: 40, gap: 12 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '700', marginTop: 24 },
  sub: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  card: { marginTop: 8 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginTop: 14, marginBottom: 6 },
  input: {
    color: colors.text, fontSize: 15, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, paddingHorizontal: 14, height: 48,
  },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 6, lineHeight: 15 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { color: colors.textMuted, fontSize: 13 },
  device: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  error: { color: colors.expire, fontSize: 13, marginTop: 12 },
});
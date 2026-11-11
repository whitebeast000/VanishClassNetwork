import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import { DEV_RELAY_SUGGESTION } from '../config/relay';
import { RootStackParamList } from '../navigation/types';
import { MAX_NAME_LENGTH } from '../types/protocol';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Join'>;

function validRelay(url: string): boolean {
  return /^wss?:\/\/[^\s/:]+(:\d{1,5})?(\/\S*)?$/i.test(url.trim());
}

export default function JoinScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [relay, setRelay] = useState(DEV_RELAY_SUGGESTION);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const join = () => {
    if (name.trim().length < 2) return setError('Enter a display name (at least 2 characters).');
    if (!validRelay(relay)) return setError('Relay address must look like ws://192.168.1.5:8080 or wss://host.com');
    setError(null);
    setConnecting(true);
    // Phase 5: real WebSocket JOIN goes here. For now we only move to the chat UI.
    setTimeout(() => { setConnecting(false); navigation.replace('Chat'); }, 900);
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

              <Text style={styles.label}>CLASS CODE (IF REQUIRED)</Text>
              <TextInput style={styles.input} value={code} onChangeText={setCode}
                placeholder="Room code" placeholderTextColor={colors.textMuted}
                autoCapitalize="none" autoCorrect={false} />

              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: connecting ? colors.accent : colors.textMuted }]} />
                <Text style={styles.status}>{connecting ? 'Connecting…' : 'Not connected'}</Text>
              </View>
              <Text style={styles.device}>Device ID: assigned on first launch (Phase 5)</Text>

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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { color: colors.textMuted, fontSize: 13 },
  device: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  error: { color: colors.expire, fontSize: 13, marginTop: 12 },
});
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { ConnectionState } from '../types/connection';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const CONN_LABEL: Record<ConnectionState, string> = {
  CONNECTED: 'Connected', CONNECTING: 'Connecting…', RECONNECTING: 'Reconnecting…',
  DISCONNECTED: 'Disconnected', ERROR: 'Error',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">{value}</Text>
    </View>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const chat = useChat();
  const [editing, setEditing] = useState<null | 'name' | 'relay'>(null);
  const [v1, setV1] = useState('');
  const [v2, setV2] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const startEdit = (kind: 'name' | 'relay') => {
    setErr(null);
    setEditing(kind);
    if (kind === 'name') setV1(chat.name);
    else { setV1(chat.relayUrl); setV2(chat.roomCode); }
  };
  const save = async () => {
    const e = editing === 'name' ? await chat.updateName(v1) : await chat.updateRelay(v1, v2);
    if (e) setErr(e);
    else setEditing(null);
  };
  const leave = () => {
    Alert.alert('Leave network?', 'Your local messages and queued messages will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          await chat.leave();
          navigation.reset({ index: 0, routes: [{ name: 'Join' }] });
        },
      },
    ]);
  };

  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Logo size={44} />
          <Text style={styles.h1}>Settings</Text>

          <GlassCard>
            <Row label="Display name" value={chat.name || '—'} />
            <Row label="Device ID" value={chat.deviceId || '—'} />
            <Row label="Relay address" value={chat.relayUrl || '—'} />
            <Row label="Connection" value={CONN_LABEL[chat.connection]} />
            <Row label="Network" value={chat.networkOnline ? 'Online' : 'Offline'} />
            <Row label="Version" value="1.0.0" />
            <Row label="Local storage" value={`${chat.storage.messages} messages · ${chat.storage.queue} queued`} />
          </GlassCard>

          {editing && (
            <GlassCard tint="accent">
              <Text style={styles.label}>{editing === 'name' ? 'NEW DISPLAY NAME' : 'RELAY ADDRESS'}</Text>
              <TextInput style={styles.input} value={v1} onChangeText={setV1}
                autoCapitalize={editing === 'name' ? 'words' : 'none'} autoCorrect={false}
                placeholderTextColor={colors.textMuted} />
              {editing === 'relay' && (
                <>
                  <Text style={[styles.label, { marginTop: 12 }]}>CLASS CODE</Text>
                  <TextInput style={styles.input} value={v2} onChangeText={setV2}
                    autoCapitalize="none" autoCorrect={false} placeholderTextColor={colors.textMuted} />
                </>
              )}
              {err && <Text style={styles.err}>{err}</Text>}
              <View style={styles.editButtons}>
                <GlassButton title="Cancel" variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
                <GlassButton title="Save" onPress={save} style={{ flex: 1 }} />
              </View>
            </GlassCard>
          )}

          <GlassButton title="Change display name" variant="ghost" onPress={() => startEdit('name')} />
          <GlassButton title="Configure relay address" variant="ghost" onPress={() => startEdit('relay')} />
          <GlassButton title="Reconnect" variant="ghost" onPress={chat.reconnect} />
          <GlassButton title="Leave network" variant="danger" onPress={leave} />
          <GlassButton title="Back to chat" onPress={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, gap: 12 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '700', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 16 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  value: { color: colors.text, fontSize: 13, flexShrink: 1 },
  input: {
    color: colors.text, fontSize: 15, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 6,
    borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, paddingHorizontal: 14, height: 48,
  },
  err: { color: colors.expire, fontSize: 12, marginTop: 10 },
  editButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
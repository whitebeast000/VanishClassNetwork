import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Background from '../components/Background';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import Logo from '../components/Logo';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  // Values are placeholders until Phase 5 connects storage and the socket.
  return (
    <Background>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Logo size={44} />
          <Text style={styles.h1}>Settings</Text>

          <GlassCard>
            <Row label="Display name" value="—" />
            <Row label="Device ID" value="—" />
            <Row label="Relay address" value="—" />
            <Row label="Connection" value="Not connected" />
            <Row label="Network" value="—" />
            <Row label="Version" value="1.0.0" />
            <Row label="Local storage" value="—" />
          </GlassCard>

          <GlassButton title="Change display name" variant="ghost" onPress={() => {}} />
          <GlassButton title="Configure relay address" variant="ghost" onPress={() => {}} />
          <GlassButton title="Reconnect" variant="ghost" onPress={() => {}} />
          <GlassButton title="Leave network" variant="danger" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Join' }] })} />
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
  label: { color: colors.textMuted, fontSize: 13 },
  value: { color: colors.text, fontSize: 13, flexShrink: 1 },
});
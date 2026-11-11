import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Message, MessageStatus } from '../types/protocol';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';
import { formatClock } from '../utils/time';
import MessageTimer from './MessageTimer';

const STATUS_LABEL: Record<MessageStatus, string> = {
  CREATED: 'Creating…',
  WAITING: 'Waiting for network',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  DISPLAYED: 'Delivered',
  EXPIRED: 'Expired',
  DROPPED: 'Not delivered',
};

export default function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const hasTimer = message.expires_at !== null;
  const shownTime = message.sent_at ?? Date.now();
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
        {!mine && <Text style={styles.sender}>{message.sender}</Text>}
        <Text style={styles.text}>{message.text}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{formatClock(shownTime)}</Text>
          {mine && (
            <Text style={[styles.metaText, message.status === 'DROPPED' && { color: colors.expire }]}>
              {STATUS_LABEL[message.status]}
            </Text>
          )}
        </View>
        {hasTimer && <MessageTimer expiresAt={message.expires_at as number} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, marginVertical: 5, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1,
  },
  mine: {
    backgroundColor: 'rgba(45,212,191,0.12)', borderColor: 'rgba(45,212,191,0.35)',
    borderBottomRightRadius: 4,
  },
  other: {
    backgroundColor: colors.glass, borderColor: colors.glassBorder,
    borderBottomLeftRadius: 4,
  },
  sender: { color: colors.accent2, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  metaText: { color: colors.textMuted, fontSize: 11 },
});
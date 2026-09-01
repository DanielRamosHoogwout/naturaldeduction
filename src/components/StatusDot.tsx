import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineStatus } from '../logic/check';
import { colors, radius } from '../theme';

const APPEARANCE: Record<LineStatus, { background: string; foreground: string; glyph: string }> = {
  ok: { background: colors.okSoft, foreground: colors.ok, glyph: '✓' },
  error: { background: colors.errorSoft, foreground: colors.error, glyph: '✕' },
  incomplete: { background: colors.pendingSoft, foreground: colors.pending, glyph: '•' },
};

export function StatusDot({ status }: { status: LineStatus }) {
  const look = APPEARANCE[status];
  return (
    <View style={[styles.dot, { backgroundColor: look.background }]}>
      <Text style={[styles.glyph, { color: look.foreground }]}>{look.glyph}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 12,
    fontWeight: '700',
  },
});

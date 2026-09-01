/**
 * The logo, drawn in views rather than shipped as a bitmap so it stays crisp at
 * any size and can pick up a different letter. The default letter is ¬ — the
 * app icon's tile.
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  size?: number;
  letter?: string;
  score?: number | null;
  style?: ViewStyle;
}

export function TileLogo({ size = 64, letter = '¬', score = 1, style }: Props) {
  const depth = Math.max(2, size * 0.075);

  return (
    <View style={[{ width: size, height: size + depth }, style]}>
      {/* The extruded side, peeking out below the face. */}
      <View
        style={[
          styles.edge,
          { height: size + depth, borderRadius: Math.max(radius.sm, size * 0.16) },
        ]}
      />
      <View
        style={[
          styles.face,
          { height: size, borderRadius: Math.max(radius.sm, size * 0.16) },
        ]}
      >
        <Text style={[styles.letter, { fontSize: size * 0.62, lineHeight: size * 0.86 }]}>
          {letter}
        </Text>
        {score !== null && (
          <Text style={[styles.score, { fontSize: size * 0.2, right: size * 0.11, bottom: size * 0.07 }]}>
            {score}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.tileEdge,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.tileFace,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.ink,
    fontWeight: '700',
    // ¬ sits high in its em box; nudge it back to the optical centre.
    marginTop: '6%',
  },
  score: {
    position: 'absolute',
    color: colors.ink,
    fontWeight: '700',
  },
});

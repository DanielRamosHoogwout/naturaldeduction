import { Link, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TileLogo } from '../src/components/TileLogo';
import { CHAPTERS } from '../src/levels/levels';
import { ChapterDefinition, LevelDefinition } from '../src/levels/types';
import { sequent } from '../src/logic/check';
import { mustParse } from '../src/logic/parser';
import { chapterProgress, isUnlocked, useProgress } from '../src/store/progress';
import { usePurchases } from '../src/store/purchases';
import { colors, radius, spacing, type } from '../src/theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const records = useProgress((state) => state.records);
  const supporter = usePurchases((state) => state.supporter);
  const storeOffline = usePurchases((state) => state.offline);

  const solved = Object.keys(records).length;
  const total = CHAPTERS.reduce((count, chapter) => count + chapter.levels.length, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <TileLogo size={68} />
        <Text style={styles.title}>Natural Deduction</Text>
        <Text style={styles.subtitle}>
          {solved} of {total} proofs complete
        </Text>
      </View>

      <View style={styles.body}>
        {CHAPTERS.map((chapter) => (
          <Chapter key={chapter.id} chapter={chapter} records={records} />
        ))}

        {/* Deliberately the quietest thing on the screen: nothing is gated
            behind it, so it should never read as a wall. */}
        {!storeOffline && (
          <Pressable style={styles.support} onPress={() => router.push('/support')}>
            <Text style={styles.supportLabel}>
              {supporter
                ? 'Thanks for supporting this app'
                : 'Every level is free · Support the app'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function Chapter({
  chapter,
  records,
}: {
  chapter: ChapterDefinition;
  records: ReturnType<typeof useProgress.getState>['records'];
}) {
  const { done, total } = chapterProgress(chapter.id, records);
  const playable = chapter.levels.map((level) => isUnlocked(level.id, records));
  // Explain the ordering once per chapter rather than on every greyed-out row.
  const firstLocked = playable.indexOf(false);

  return (
    <View style={styles.chapter}>
      <View style={styles.chapterHeader}>
        <View style={styles.chapterHeading}>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
          <Text style={styles.chapterSubtitle}>{chapter.subtitle}</Text>
        </View>
        <Text style={styles.chapterCount}>
          {done}/{total}
        </Text>
      </View>

      <View style={styles.levels}>
        {chapter.levels.map((level, position) => (
          <LevelRow
            key={level.id}
            level={level}
            playable={playable[position]}
            explainOrder={position === firstLocked}
            solved={Boolean(records[level.id])}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * `playable` here is progression, not payment: levels open in order so the rules
 * arrive one at a time. Nothing on this screen is ever gated behind a purchase.
 */
function LevelRow({
  level,
  playable,
  explainOrder,
  solved,
}: {
  level: LevelDefinition;
  playable: boolean;
  explainOrder: boolean;
  solved: boolean;
}) {
  const statement = sequent(level.premises.map(mustParse), mustParse(level.goal));

  const row = (
    <View style={[styles.level, !playable && styles.levelDisabled]}>
      <View style={styles.levelMark}>
        {solved ? (
          <Text style={styles.levelTick}>✓</Text>
        ) : (
          <View style={[styles.levelDot, !playable && styles.levelDotMuted]} />
        )}
      </View>
      <View style={styles.levelText}>
        <Text style={[styles.levelTitle, !playable && styles.mutedText]}>{level.title}</Text>
        <Text style={[styles.levelSequent, !playable && styles.mutedText]} numberOfLines={1}>
          {statement}
        </Text>
      </View>
      {!playable && explainOrder && <Text style={styles.levelPending}>Opens in order</Text>}
    </View>
  );

  if (!playable) return row;

  return (
    <Link href={{ pathname: '/level/[id]', params: { id: level.id } }} asChild>
      <Pressable>{row}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    marginTop: spacing.lg,
    color: colors.tileFace,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: '#A7AECB',
    fontSize: 13,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  chapter: {
    gap: spacing.md,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chapterHeading: {
    flex: 1,
  },
  chapterTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  chapterSubtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    marginTop: 2,
  },
  chapterCount: {
    color: colors.inkFaint,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  levels: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  levelDisabled: {
    backgroundColor: '#FAF8F2',
  },
  levelMark: {
    width: 20,
    alignItems: 'center',
  },
  levelTick: {
    color: colors.ok,
    fontSize: 15,
    fontWeight: '700',
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.tileEdge,
  },
  levelDotMuted: {
    backgroundColor: colors.locked,
  },
  levelText: {
    flex: 1,
  },
  levelTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  levelSequent: {
    ...type.formulaSmall,
    color: colors.inkSoft,
    marginTop: 2,
  },
  mutedText: {
    color: colors.locked,
  },
  levelPending: {
    color: colors.inkFaint,
    fontSize: 11,
    fontStyle: 'italic',
  },
  support: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  supportLabel: {
    color: colors.inkSoft,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});

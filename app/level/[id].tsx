import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineEditor } from '../../src/components/LineEditor';
import { ProofView } from '../../src/components/ProofView';
import {
  addLine,
  addSubproof,
  countLines,
  initialProof,
  remove,
  setFormula,
  setRule,
  toggleRef,
} from '../../src/game/editing';
import { levelById, nextLevel } from '../../src/levels/levels';
import { checkProof, sequent } from '../../src/logic/check';
import { Formula, atoms as atomsOf, format } from '../../src/logic/formula';
import { parse } from '../../src/logic/parser';
import { Proof, findItem, layout } from '../../src/logic/proof';
import { RuleId } from '../../src/logic/rules';
import { useProgress } from '../../src/store/progress';
import { colors, radius, spacing, type } from '../../src/theme';

export default function LevelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const level = levelById(id);

  const complete = useProgress((state) => state.complete);
  const markHintUsed = useProgress((state) => state.markHintUsed);

  const [proof, setProof] = useState<Proof>(() => initialProof(level ? level.premises : []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Raw keypad text for the selected line, parsed on every keystroke. */
  const [draft, setDraft] = useState('');
  const [hintShown, setHintShown] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const check = useMemo(
    () => (level ? checkProof(proof, { goal: level.goal, allowedRules: [...level.rules] }) : null),
    [proof, level],
  );

  // `router.replace` to the next level reuses this screen, so the per-level
  // state has to be rebuilt explicitly rather than relying on a remount.
  useEffect(() => {
    setProof(initialProof(level ? level.premises : []));
    setSelectedId(null);
    setDraft('');
    setHintShown(false);
    setCelebrated(false);
  }, [level?.id]);

  const selected = selectedId ? findItem(proof.items, selectedId) : null;
  const selectedLine = selected?.type === 'line' ? selected : null;

  // Selecting a different line loads its formula back into the keypad display.
  useEffect(() => {
    setDraft(selectedLine?.formula ? format(selectedLine.formula) : '');
  }, [selectedLine?.id]);

  const onChangeText = useCallback(
    (text: string) => {
      setDraft(text);
      if (!selectedLine) return;
      const parsed = parse(text);
      setProof((current) => setFormula(current, selectedLine.id, parsed.ok ? parsed.formula : null));
    },
    [selectedLine],
  );

  const solved = check?.solved ?? false;

  useEffect(() => {
    if (!solved || !level || celebrated) return;
    setCelebrated(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    complete(level.id, countLines(proof), hintShown);
  }, [solved, level, celebrated, complete, proof, hintShown]);

  if (!level || !check) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingLabel}>That level does not exist.</Text>
      </View>
    );
  }

  const view = layout(proof);
  const usableAtoms = uniqueAtoms(level.premises.concat(level.goal));
  const following = nextLevel(level.id);

  const addAfter = selectedId;

  const onAddLine = () => {
    const result = addLine(proof, addAfter, 'andI');
    setProof(result.proof);
    setSelectedId(result.focusId);
  };

  const onAddSubproof = () => {
    const result = addSubproof(proof, addAfter);
    setProof(result.proof);
    setSelectedId(result.focusId);
  };

  const onDelete = () => {
    if (!selectedLine) return;
    setProof(remove(proof, selectedLine.id));
    setSelectedId(null);
  };

  const onHint = () => {
    setHintShown(true);
    if (useProgress.getState().records[level.id]) markHintUsed(level.id);
    Alert.alert('Hint', level.hint);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: level.title }} />

      <View style={styles.goalBar}>
        <Text style={styles.chapterLabel}>
          {level.chapterTitle} · {level.index}
        </Text>
        <Text style={styles.goal} numberOfLines={2}>
          {sequent(level.premises, level.goal)}
        </Text>
      </View>

      <ScrollView
        style={styles.proofScroll}
        contentContainerStyle={styles.proofContent}
        keyboardShouldPersistTaps="handled"
      >
        <ProofView
          proof={proof}
          check={check}
          selectedId={selectedId}
          citedIds={new Set(selectedLine?.refs ?? [])}
          onSelect={setSelectedId}
        />

        <View style={styles.toolbar}>
          <Tool testID="add-line" label="+ Line" onPress={onAddLine} />
          <Tool testID="add-subproof" label="+ Subproof" onPress={onAddSubproof} />
          <Tool testID="hint" label="Hint" onPress={onHint} tone="quiet" />
        </View>

        {selectedId === null && (
          <Text style={styles.tip}>
            New steps go at the end. Select a line first to insert after it, or select a
            subproof’s footer to carry on outside it.
          </Text>
        )}
      </ScrollView>

      {solved ? (
        <View style={[styles.solved, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.solvedTitle}>Proved.</Text>
          <Text style={styles.solvedBody}>
            {countLines(proof)} lines{hintShown ? ', with a hint' : ''}.
          </Text>
          <View style={styles.solvedActions}>
            <Pressable style={styles.secondary} onPress={() => router.back()}>
              <Text style={styles.secondaryLabel}>Level list</Text>
            </Pressable>
            {following && (
              <Pressable
                style={styles.primary}
                onPress={() => router.replace({ pathname: '/level/[id]', params: { id: following.id } })}
              >
                <Text style={styles.primaryLabel}>Next proof</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        selectedLine && (
          <View style={{ paddingBottom: insets.bottom }}>
            <LineEditor
              proof={proof}
              view={view}
              line={selectedLine}
              text={draft}
              atoms={usableAtoms}
              availableRules={[...level.rules]}
              maxHeight={height * 0.52}
              onChangeText={onChangeText}
              onChangeRule={(rule: RuleId) => setProof(setRule(proof, selectedLine.id, rule))}
              onToggleRef={(refId) => setProof(toggleRef(proof, view, selectedLine.id, refId))}
              onDelete={onDelete}
            />
          </View>
        )
      )}
    </View>
  );
}

/** Atoms the level actually mentions, so the keypad offers only relevant keys. */
function uniqueAtoms(formulas: Formula[]): string[] {
  const names: string[] = [];
  formulas.forEach((formula) => atomsOf(formula, names));
  // ∨I and ⊥E can conclude anything, so keep a spare letter available.
  for (const spare of ['P', 'Q', 'R']) {
    if (names.length >= 3) break;
    if (!names.includes(spare)) names.push(spare);
  }
  return names;
}

function Tool({
  label,
  onPress,
  tone,
  testID,
}: {
  label: string;
  onPress: () => void;
  tone?: 'quiet';
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, tone === 'quiet' && styles.toolQuiet, pressed && styles.pressed]}
    >
      <Text style={[styles.toolLabel, tone === 'quiet' && styles.toolLabelQuiet]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  goalBar: {
    backgroundColor: colors.backdrop,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  chapterLabel: {
    color: '#8E96B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  goal: {
    ...type.formula,
    color: colors.tileFace,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  proofScroll: {
    flex: 1,
  },
  proofContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tool: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  toolQuiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  toolLabel: {
    color: colors.tileFace,
    fontWeight: '700',
    fontSize: 14,
  },
  toolLabelQuiet: {
    color: colors.inkSoft,
  },
  pressed: {
    opacity: 0.7,
  },
  tip: {
    marginTop: spacing.lg,
    color: colors.inkFaint,
    fontSize: 12,
    lineHeight: 17,
  },
  solved: {
    backgroundColor: colors.okSoft,
    borderTopWidth: 1,
    borderTopColor: '#CDE9DA',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  solvedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ok,
  },
  solvedBody: {
    marginTop: spacing.xs,
    color: colors.inkSoft,
    fontSize: 14,
  },
  solvedActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  primary: {
    flex: 1,
    backgroundColor: colors.ok,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CDE9DA',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: colors.inkSoft,
    fontWeight: '600',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingLabel: {
    color: colors.inkSoft,
  },
});

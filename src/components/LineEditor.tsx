/**
 * The bottom sheet for editing one line: what it says, how it is justified, and
 * what it cites.
 *
 * Citations are picked from chips here rather than by tapping rows in the proof
 * above. Tapping a row is already "select this line", and overloading it would
 * make the two meanings depend on invisible mode state — the chips list only
 * what is genuinely in scope, which doubles as a lesson in what scope is.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SYMBOL, format } from '../logic/formula';
import { parse } from '../logic/parser';
import { Layout, Line, Proof, assumptionOf, lastLineOf, scopeFor } from '../logic/proof';
import { RULES, RuleId } from '../logic/rules';
import { colors, radius, spacing, type } from '../theme';

interface Props {
  proof: Proof;
  view: Layout;
  line: Line;
  /** Raw text being typed, kept separately so half-finished input can be shown. */
  text: string;
  /** Atoms this level actually uses, offered as one-tap keys. */
  atoms: string[];
  availableRules: RuleId[];
  /**
   * Explicit pixel height rather than a percentage: a percentage only resolves
   * against a parent with a definite height, which a flex child does not have
   * on every platform, and the sheet then runs off the bottom of the screen.
   */
  maxHeight: number;
  onChangeText: (text: string) => void;
  onChangeRule: (rule: RuleId) => void;
  onToggleRef: (refId: string) => void;
  onDelete: () => void;
}

const CONNECTIVES = [SYMBOL.not, SYMBOL.and, SYMBOL.or, SYMBOL.implies, SYMBOL.iff, SYMBOL.bottom];

export function LineEditor({
  proof,
  view,
  line,
  text,
  atoms,
  availableRules,
  maxHeight,
  onChangeText,
  onChangeRule,
  onToggleRef,
  onDelete,
}: Props) {
  const parsed = useMemo(() => parse(text), [text]);
  const spec = RULES[line.rule];
  const isAssumption = line.rule === 'assumption';
  const scope = useMemo(() => scopeFor(proof, line.id), [proof, line.id]);

  const append = (token: string) => onChangeText(text + token);
  const backspace = () => onChangeText(text.slice(0, -1));

  return (
    <View style={[styles.sheet, { maxHeight }]}>
      <View style={styles.grabber} />

      <View style={styles.display}>
        <Text style={styles.displayText} numberOfLines={2}>
          {text.length > 0 ? text : <Text style={styles.displayHint}>Write the formula…</Text>}
        </Text>
        {text.length > 0 && !parsed.ok && <Text style={styles.parseError}>{parsed.error}</Text>}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.keypad}>
          {atoms.map((name) => (
            <Key key={name} testID={`key-${name}`} label={name} onPress={() => append(name)} />
          ))}
        </View>
        <View style={styles.keypad}>
          {CONNECTIVES.map((symbol) => (
            <Key key={symbol} testID={`key-${symbol}`} label={symbol} onPress={() => append(symbol)} />
          ))}
          <Key testID="key-open" label="(" onPress={() => append('(')} />
          <Key testID="key-close" label=")" onPress={() => append(')')} />
          {/* Spelled out rather than ⌫: the glyph is missing from some Android
              system fonts and renders as a blank box. */}
          <Key testID="key-del" label="Del" onPress={backspace} tone="muted" />
        </View>

        {!isAssumption && !line.locked && (
          <>
            <Section title="Rule" />
            <View style={styles.chips}>
              {availableRules.map((rule) => (
                <Chip
                  key={rule}
                  testID={`rule-${rule}`}
                  label={RULES[rule].label}
                  selected={rule === line.rule}
                  onPress={() => onChangeRule(rule)}
                />
              ))}
            </View>
            <Text style={styles.ruleSummary}>
              <Text style={styles.ruleName}>{spec.name}. </Text>
              {spec.summary}
              {spec.shape ? `  (${spec.shape})` : ''}
            </Text>
          </>
        )}

        {!isAssumption && spec.lineCount > 0 && (
          <>
            <Section
              title={`Cite ${spec.lineCount === 1 ? 'a line' : `${spec.lineCount} lines`}`}
            />
            <View style={styles.chips}>
              {scope?.lines.map((candidate) => {
                const entry = view.lineById.get(candidate.id);
                if (!entry) return null;
                return (
                  <Chip
                    key={candidate.id}
                    testID={`cite-line-${entry.number}`}
                    label={`${entry.number}. ${candidate.formula ? format(candidate.formula) : '—'}`}
                    selected={line.refs.includes(candidate.id)}
                    onPress={() => onToggleRef(candidate.id)}
                  />
                );
              })}
              {scope?.lines.length === 0 && <Empty>Nothing above this line yet.</Empty>}
            </View>
          </>
        )}

        {!isAssumption && spec.subproofCount > 0 && (
          <>
            <Section
              title={`Cite ${spec.subproofCount === 1 ? 'a subproof' : `${spec.subproofCount} subproofs`}`}
            />
            <View style={styles.chips}>
              {scope?.subproofs.map((candidate) => {
                const entry = view.subproofById.get(candidate.id);
                const assumption = assumptionOf(candidate)?.formula;
                const conclusion = lastLineOf(candidate)?.formula;
                if (!entry) return null;
                return (
                  <Chip
                    key={candidate.id}
                    testID={`cite-sub-${entry.first}-${entry.last}`}
                    label={`${entry.first}–${entry.last}. ${assumption ? format(assumption) : '—'} ${
                      SYMBOL.turnstile
                    } ${conclusion ? format(conclusion) : '—'}`}
                    selected={line.refs.includes(candidate.id)}
                    onPress={() => onToggleRef(candidate.id)}
                  />
                );
              })}
              {scope?.subproofs.length === 0 && <Empty>Open a subproof first.</Empty>}
            </View>
          </>
        )}

        {!line.locked && (
          <Pressable testID="delete-line" onPress={onDelete} style={styles.delete}>
            <Text style={styles.deleteLabel}>
              {isAssumption ? 'Delete this subproof' : 'Delete this line'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Key({
  label,
  onPress,
  tone,
  testID,
}: {
  label: string;
  onPress: () => void;
  tone?: 'muted';
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.key, tone === 'muted' && styles.keyMuted, pressed && styles.pressed]}
    >
      <Text style={styles.keyLabel}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    marginBottom: spacing.sm,
  },
  display: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    justifyContent: 'center',
  },
  displayText: {
    ...type.formula,
    color: colors.ink,
  },
  displayHint: {
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  parseError: {
    color: colors.error,
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    marginTop: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  key: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.tileFace,
    borderBottomWidth: 2,
    borderBottomColor: colors.tileEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyMuted: {
    backgroundColor: '#EFEDE6',
    borderBottomColor: '#D8D4C6',
  },
  keyLabel: {
    ...type.formula,
    fontWeight: '600',
    color: colors.ink,
  },
  pressed: {
    opacity: 0.6,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: '#F1EFE8',
  },
  chipSelected: {
    backgroundColor: colors.ink,
  },
  chipLabel: {
    ...type.formulaSmall,
    color: colors.ink,
  },
  chipLabelSelected: {
    color: colors.tileFace,
    fontWeight: '600',
  },
  ruleSummary: {
    marginTop: spacing.sm,
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  ruleName: {
    color: colors.ink,
    fontWeight: '600',
  },
  empty: {
    color: colors.inkFaint,
    fontSize: 13,
    fontStyle: 'italic',
  },
  delete: {
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
  },
  deleteLabel: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});

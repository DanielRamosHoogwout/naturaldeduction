/**
 * Fitch-style rendering of a proof.
 *
 * Scope is drawn the way textbooks draw it: one vertical rule per enclosing
 * subproof, a horizontal rule under each assumption, and an explicit closing
 * row. That closing row is also the control for stepping back out of a
 * subproof — tapping it moves the insertion point past the whole block.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckResult, formatCitations } from '../logic/check';
import { format } from '../logic/formula';
import { Line, Proof, ProofItem } from '../logic/proof';
import { RULES } from '../logic/rules';
import { colors, radius, spacing, type } from '../theme';
import { StatusDot } from './StatusDot';

type Row =
  | { kind: 'line'; id: string; line: Line; number: number; depth: number }
  | { kind: 'close'; id: string; depth: number; first: number; last: number };

interface Props {
  proof: Proof;
  check: CheckResult;
  selectedId: string | null;
  /** Ids the selected line currently cites, highlighted in place. */
  citedIds?: Set<string>;
  onSelect: (id: string) => void;
}

export function ProofView({ proof, check, selectedId, citedIds, onSelect }: Props) {
  const rows = useMemo(() => buildRows(proof.items), [proof]);

  return (
    <View style={styles.container}>
      {rows.map((row) =>
        row.kind === 'line' ? (
          <LineRow
            key={row.id}
            row={row}
            check={check}
            selected={selectedId === row.id}
            cited={citedIds?.has(row.id) ?? false}
            onSelect={onSelect}
          />
        ) : (
          <CloseRow
            key={row.id}
            row={row}
            selected={selectedId === row.id}
            cited={citedIds?.has(row.id) ?? false}
            onSelect={onSelect}
          />
        ),
      )}
    </View>
  );
}

/** Walks the tree once, numbering lines exactly as `layout` does. */
function buildRows(items: ProofItem[]): Row[] {
  const rows: Row[] = [];
  let number = 0;

  const walk = (list: ProofItem[], depth: number): void => {
    for (const item of list) {
      if (item.type === 'line') {
        number += 1;
        rows.push({ kind: 'line', id: item.id, line: item, number, depth });
      } else {
        const first = number + 1;
        walk(item.items, depth + 1);
        rows.push({ kind: 'close', id: item.id, depth, first, last: number });
      }
    }
  };

  walk(items, 0);
  return rows;
}

function ScopeBars({ depth }: { depth: number }) {
  return (
    <>
      {Array.from({ length: depth }, (_, index) => (
        <View key={index} style={styles.scopeBar} />
      ))}
    </>
  );
}

function LineRow({
  row,
  check,
  selected,
  cited,
  onSelect,
}: {
  row: Extract<Row, { kind: 'line' }>;
  check: CheckResult;
  selected: boolean;
  cited: boolean;
  onSelect: (id: string) => void;
}) {
  const { line, number, depth } = row;
  const result = check.results.get(line.id);
  const isAssumption = line.rule === 'assumption';
  const spec = RULES[line.rule];
  const citations = formatCitations(check.layout, line.refs);
  const justification =
    line.rule === 'premise' || isAssumption
      ? spec.label
      : [spec.label, citations].filter(Boolean).join(' ');

  // Errors are always visible: they are the feedback the game is built around.
  // "Not finished yet" is only noise until the player looks at that line.
  const message =
    result?.status === 'error' || (selected && result?.status === 'incomplete')
      ? result.message
      : undefined;

  return (
    <Pressable
      testID={`line-${number}`}
      onPress={() => onSelect(line.id)}
      style={[
        styles.row,
        selected && styles.rowSelected,
        cited && styles.rowCited,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Line ${number}, ${line.formula ? format(line.formula) : 'empty'}, ${justification}`}
    >
      <View style={styles.gutter}>
        <Text style={styles.number}>{number}</Text>
      </View>

      <View style={styles.body}>
        <ScopeBars depth={depth} />
        <View style={[styles.content, isAssumption && styles.assumption]}>
          <View style={styles.formulaRow}>
            <Text style={[styles.formula, !line.formula && styles.placeholder]} numberOfLines={2}>
              {line.formula ? format(line.formula) : 'Tap to write a formula'}
            </Text>
            <Text style={styles.justification}>{justification}</Text>
          </View>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>

      <View style={styles.status}>{result && <StatusDot status={result.status} />}</View>
    </Pressable>
  );
}

function CloseRow({
  row,
  selected,
  cited,
  onSelect,
}: {
  row: Extract<Row, { kind: 'close' }>;
  selected: boolean;
  cited: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Pressable
      testID={`subproof-${row.first}-${row.last}`}
      onPress={() => onSelect(row.id)}
      style={[
        styles.closeRow,
        selected && styles.rowSelected,
        cited && styles.rowCited,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Subproof, lines ${row.first} to ${row.last}`}
    >
      <View style={styles.gutter} />
      <View style={styles.body}>
        <ScopeBars depth={row.depth} />
        <View style={styles.closeContent}>
          <View style={styles.closeTick} />
          <Text style={styles.closeLabel}>
            subproof {row.first}–{row.last}
          </Text>
        </View>
      </View>
      <View style={styles.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    borderRadius: radius.sm,
  },
  rowSelected: {
    backgroundColor: '#EEF1FF',
  },
  rowCited: {
    backgroundColor: '#E3E8FF',
  },
  gutter: {
    width: 30,
    paddingTop: 2,
    alignItems: 'flex-end',
    paddingRight: spacing.sm,
  },
  number: {
    color: colors.inkFaint,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  scopeBar: {
    width: 2,
    alignSelf: 'stretch',
    marginRight: spacing.md,
    backgroundColor: colors.tileEdge,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 2,
  },
  assumption: {
    borderBottomWidth: 1,
    borderBottomColor: colors.tileEdge,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  formula: {
    ...type.formula,
    color: colors.ink,
    flexShrink: 1,
  },
  placeholder: {
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  justification: {
    color: colors.inkSoft,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  message: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    paddingRight: spacing.sm,
  },
  status: {
    width: 24,
    paddingTop: 2,
    alignItems: 'center',
  },
  closeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  closeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeTick: {
    width: 14,
    height: 2,
    backgroundColor: colors.tileEdge,
    borderRadius: 1,
  },
  closeLabel: {
    color: colors.inkFaint,
    fontSize: 11,
  },
});

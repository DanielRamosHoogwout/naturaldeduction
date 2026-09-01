import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { TileLogo } from '../src/components/TileLogo';
import { LEVELS } from '../src/levels/levels';
import { usePurchases } from '../src/store/purchases';
import { colors, radius, spacing } from '../src/theme';

/**
 * The tip jar. Nothing here unlocks anything — the whole game is free — so this
 * screen is only ever reached deliberately, and it says plainly that it buys
 * nothing.
 */
export default function Support() {
  const router = useRouter();
  const { packages, supporter, offline, tip, restore } = usePurchases();
  const [busy, setBusy] = useState<'tip' | 'restore' | null>(null);

  const give = async (pkg: PurchasesPackage) => {
    setBusy('tip');
    const outcome = await tip(pkg);
    setBusy(null);
    if (outcome === 'thanks') {
      Alert.alert('Thank you', 'That genuinely helps. Enjoy the rest of the proofs.');
      router.back();
    } else if (outcome === 'error') {
      Alert.alert('That did not go through', usePurchases.getState().lastError ?? '');
    }
  };

  const recover = async () => {
    setBusy('restore');
    const restored = await restore();
    setBusy(null);
    Alert.alert(
      restored ? 'Restored' : 'Nothing to restore',
      restored
        ? 'Welcome back, and thank you.'
        : 'No previous purchase was found for this account.',
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TileLogo size={72} style={styles.logo} />

      <Text style={styles.headline}>All {LEVELS.length} proofs are free.</Text>
      <Text style={styles.body}>
        No levels are locked, nothing is timed, there are no ads and no hint currency. If you
        have got something out of the app and want to chip in towards keeping it going, you can
        do that here — it buys you nothing except our thanks.
      </Text>

      {supporter && (
        <View style={styles.thanks}>
          <Text style={styles.thanksLabel}>You have already supported this. Thank you.</Text>
        </View>
      )}

      {offline ? (
        <View style={styles.notice}>
          <Text style={styles.noticeLabel}>
            The store is not reachable in this build. Tipping needs a development or release
            build with RevenueCat keys configured — see the README.
          </Text>
        </View>
      ) : packages.length === 0 ? (
        <ActivityIndicator color={colors.ink} style={styles.spinner} />
      ) : (
        <View style={styles.options}>
          {packages.map((pkg) => (
            <Pressable
              key={pkg.identifier}
              style={({ pressed }) => [styles.tip, pressed && styles.pressed]}
              disabled={busy !== null}
              onPress={() => give(pkg)}
            >
              {busy === 'tip' ? (
                <ActivityIndicator color={colors.tileFace} />
              ) : (
                <>
                  <Text style={styles.tipLabel}>{pkg.product.title || 'Leave a tip'}</Text>
                  <Text style={styles.tipPrice}>{pkg.product.priceString}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Pressable onPress={recover} disabled={busy !== null} style={styles.restore}>
        <Text style={styles.restoreLabel}>
          {busy === 'restore' ? 'Checking…' : 'Restore a previous purchase'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.dismiss}>
        <Text style={styles.dismissLabel}>No thanks — back to the proofs</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  logo: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  thanks: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    backgroundColor: colors.okSoft,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  thanksLabel: {
    color: colors.ok,
    fontWeight: '600',
    textAlign: 'center',
  },
  options: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  tip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  tipLabel: {
    color: colors.tileFace,
    fontSize: 16,
    fontWeight: '600',
  },
  tipPrice: {
    color: colors.tileFace,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  spinner: {
    marginTop: spacing.xl,
  },
  notice: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    backgroundColor: colors.pendingSoft,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  noticeLabel: {
    color: colors.pending,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  restore: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  restoreLabel: {
    color: colors.inkSoft,
    fontSize: 14,
  },
  dismiss: {
    padding: spacing.sm,
  },
  dismissLabel: {
    color: colors.inkFaint,
    fontSize: 13,
  },
});

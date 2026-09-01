/**
 * RevenueCat integration — a tip jar, not a gate.
 *
 * Every level in the game is free and always will be. This exists so people who
 * want to support the work can, and RevenueCat is here for the parts that are
 * genuinely tedious to do by hand: receipt validation, restore, and knowing
 * across devices and platforms that someone has already chipped in.
 *
 * Nothing in the app may branch on `supporter` to withhold content. The only
 * thing it changes is whether we say thank you.
 *
 * The native module is absent in Expo Go, so every call degrades to "no store"
 * rather than crashing. Build a dev client to exercise purchases.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';

/** Entitlement identifier as configured in the RevenueCat dashboard. */
export const SUPPORTER_ENTITLEMENT = 'supporter';

type PurchasesModule = typeof import('react-native-purchases');
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;

let purchases: PurchasesModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  purchases = require('react-native-purchases');
} catch {
  purchases = null;
}

function apiKey(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    revenuecatIosKey?: string;
    revenuecatAndroidKey?: string;
  };
  return Platform.OS === 'ios' ? extra.revenuecatIosKey : extra.revenuecatAndroidKey;
}

export type PurchaseOutcome = 'thanks' | 'cancelled' | 'unavailable' | 'error';

interface PurchaseState {
  /** True once RevenueCat is configured and reachable. */
  ready: boolean;
  /** True when the SDK is missing or no API key is set — the tip jar hides itself. */
  offline: boolean;
  /** Whether this person has tipped before. Affects nothing but the thank-you. */
  supporter: boolean;
  packages: PurchasesPackage[];
  lastError: string | null;
  configure: () => Promise<void>;
  tip: (pkg: PurchasesPackage) => Promise<PurchaseOutcome>;
  restore: () => Promise<boolean>;
}

export const usePurchases = create<PurchaseState>((set, get) => ({
  ready: false,
  offline: false,
  supporter: false,
  packages: [],
  lastError: null,

  configure: async () => {
    if (get().ready || get().offline) return;

    const key = apiKey();
    const sdk = purchases?.default;
    if (!sdk || !key) {
      set({ offline: true, ready: false });
      return;
    }

    try {
      const logLevel = purchases!.LOG_LEVEL;
      await sdk.setLogLevel(__DEV__ ? logLevel.DEBUG : logLevel.ERROR);
      await sdk.configure({ apiKey: key });

      sdk.addCustomerInfoUpdateListener((info: CustomerInfo) => {
        set({ supporter: isSupporter(info) });
      });

      const [info, offerings] = await Promise.all([sdk.getCustomerInfo(), sdk.getOfferings()]);
      set({
        ready: true,
        offline: false,
        supporter: isSupporter(info),
        packages: offerings.current?.availablePackages ?? [],
        lastError: null,
      });
    } catch (error) {
      set({ offline: true, lastError: describe(error) });
    }
  },

  tip: async (pkg) => {
    const sdk = purchases?.default;
    if (!sdk) return 'unavailable';
    try {
      const { customerInfo } = await sdk.purchasePackage(pkg);
      set({ supporter: isSupporter(customerInfo), lastError: null });
      // A consumable tip may leave no entitlement behind; the purchase still
      // went through, and the thank-you is owed either way.
      return 'thanks';
    } catch (error) {
      if (isCancellation(error)) return 'cancelled';
      set({ lastError: describe(error) });
      return 'error';
    }
  },

  restore: async () => {
    const sdk = purchases?.default;
    if (!sdk) return false;
    try {
      const info = await sdk.restorePurchases();
      const supporter = isSupporter(info);
      set({ supporter, lastError: null });
      return supporter;
    } catch (error) {
      set({ lastError: describe(error) });
      return false;
    }
  },
}));

function isSupporter(info: CustomerInfo): boolean {
  return info.entitlements.active[SUPPORTER_ENTITLEMENT] !== undefined;
}

function isCancellation(error: unknown): boolean {
  return Boolean((error as { userCancelled?: boolean } | null)?.userCancelled);
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: string } | null)?.message;
  return message ?? 'Something went wrong talking to the store.';
}

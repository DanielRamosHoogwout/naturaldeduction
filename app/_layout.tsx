import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useProgress } from '../src/store/progress';
import { usePurchases } from '../src/store/purchases';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unavailable in this runtime — nothing to recover from.
});

/**
 * The layout is designed for a phone. On anything wider — desktop web, a tablet
 * — a full-bleed column of proof lines reads badly, so the app is capped and
 * centred rather than stretched. Below this width nothing changes.
 */
const MAX_CONTENT_WIDTH = 520;

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const hydrate = useProgress((state) => state.hydrate);
  const hydrated = useProgress((state) => state.hydrated);
  const configure = usePurchases((state) => state.configure);

  useEffect(() => {
    // Progress gates the first render; the store connection does not, so a slow
    // or unreachable RevenueCat never delays the launch.
    hydrate();
    configure();
  }, [hydrate, configure]);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.page}>
          <View
            style={[styles.column, width > MAX_CONTENT_WIDTH && { maxWidth: MAX_CONTENT_WIDTH }]}
          >
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.backdrop },
                headerTintColor: colors.tileFace,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: colors.surface },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="level/[id]" options={{ title: '' }} />
              <Stack.Screen
                name="support"
                options={{ presentation: 'modal', title: 'Support the app' }}
              />
            </Stack>
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.pageEdge,
  },
  column: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});

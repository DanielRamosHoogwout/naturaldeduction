import type { ExpoConfig } from 'expo/config';

/**
 * Config lives in TypeScript rather than app.json so the RevenueCat keys can
 * come from the environment. They are publishable SDK keys, not secrets, but
 * keeping them out of the repo means a fork does not accidentally report
 * purchases into someone else's dashboard.
 *
 * Set them in `.env` locally, and as EAS secrets for builds:
 *   eas secret:create --name REVENUECAT_IOS_KEY --value appl_xxx
 */
const config: ExpoConfig = {
  name: 'Natural Deduction',
  slug: 'natural-deduction',
  scheme: 'naturaldeduction',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.naturaldeduction.app',
  },
  android: {
    package: 'com.naturaldeduction.app',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#232946',
      },
    ],
  ],
  extra: {
    revenuecatIosKey: process.env.REVENUECAT_IOS_KEY,
    revenuecatAndroidKey: process.env.REVENUECAT_ANDROID_KEY,
  },
};

export default config;

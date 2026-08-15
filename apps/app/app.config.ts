import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import type { ExpoConfig } from 'expo/config';

// O Expo lê .env do diretório do app, mas num monorepo o arquivo vive na raiz —
// caso contrário app e servidor MCP manteriam cópias divergentes das mesmas
// variáveis. Carregar aqui coloca os valores em process.env a tempo de o Metro
// embutir as EXPO_PUBLIC_* no bundle.
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const config: ExpoConfig = {
  name: 'Rewam',
  slug: 'rewam',
  scheme: 'rewam',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  // A nova arquitetura é padrão no SDK 57, então a chave saiu do schema.
  plugins: ['expo-router', 'expo-status-bar'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mateusvillain.rewam',
  },
  android: {
    package: 'com.mateusvillain.rewam',
    adaptiveIcon: {
      backgroundColor: '#0B0B0F',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
};

export default config;

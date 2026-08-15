import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import type { ExpoConfig } from 'expo/config';

// O Expo lê .env do diretório do app, mas num monorepo o arquivo vive na raiz —
// caso contrário app e servidor MCP manteriam cópias divergentes das mesmas
// variáveis. Carregar aqui coloca os valores em process.env a tempo de o Metro
// embutir as EXPO_PUBLIC_* no bundle.
//
// O arquivo da raiz também guarda segredos de servidor (service_role, token
// privado do TMDB). O Metro só embute EXPO_PUBLIC_*, mas deixá-los no ambiente
// do build faria um `process.env.SUPABASE_SERVICE_ROLE_KEY` escrito por engano
// no app resolver de verdade — e os exporia em builds remotos. Então tudo que
// não é público é descartado logo após a leitura.
const { parsed: fileVariables } = loadEnv({ path: path.resolve(__dirname, '../../.env') });

for (const key of Object.keys(fileVariables ?? {})) {
  if (!key.startsWith('EXPO_PUBLIC_')) {
    delete process.env[key];
  }
}

const config: ExpoConfig = {
  name: 'Rewam',
  slug: 'rewam',
  scheme: 'rewam',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  // `newArchEnabled` existia no app.json e não voltou aqui de propósito: a chave
  // não consta mais do ExpoConfig do SDK 57 (zero ocorrências em
  // @expo/config-types/build/ExpoConfig.d.ts), porque a nova arquitetura virou
  // padrão no RN 0.86.
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

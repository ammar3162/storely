import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.storely.app',
  appName: 'Storely',
  webDir: 'public',
  server: {
    url: 'https://storely.dev',
    cleartext: false
  }
};

export default config;

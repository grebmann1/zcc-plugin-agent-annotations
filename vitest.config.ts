import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const source = process.env.ZCC_PLUGIN_SDK_SOURCE;
const alias: Record<string, string> = {
  // The SDK harness must use the same React renderer as this plugin's tests.
  '@testing-library/react': require.resolve('@testing-library/react'),
  ...(source ? {
    '@zana-ai/zcc-plugin-sdk/testing/app': resolve(source, 'testing/app-entry.ts'),
    '@zana-ai/zcc-plugin-sdk/testing': resolve(source, 'testing/index.ts'),
    '@zana-ai/zcc-plugin-sdk/app': resolve(source, 'app.ts'),
  } : {}),
};

export default defineConfig({
  resolve: { alias, dedupe: ['react', 'react-dom'] },
  test: { environment: 'jsdom', include: ['*.test.ts', '*.test.tsx'] },
});

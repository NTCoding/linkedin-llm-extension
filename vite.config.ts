import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Get the build target from environment variable, default to 'manifest-v3' if not specified
const buildTarget = process.env.BUILD_TARGET || 'manifest-v3';

// Configuration factory function
const createConfig = (target: string) => {
  // Only support manifest-v2 and manifest-v3 builds
  let outDir = 'dist/manifest-v3';
  let manifestFile = 'manifest.json';

  if (target === 'manifest-v2') {
    outDir = 'dist/manifest-v2';
    manifestFile = 'manifest-v2.json';
  }

  return {
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background.ts'),
          content: resolve(__dirname, 'src/content.ts'),
          popup: resolve(__dirname, 'src/popup.ts')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
      minify: false,
      sourcemap: true
    },
    plugins: [
      {
        name: 'copy-extension-files',
        writeBundle() {
          // Copy manifest file (using the appropriate version)
          copyFileSync(manifestFile, `${outDir}/manifest.json`);

          // Copy popup.html
          copyFileSync('popup.html', `${outDir}/popup.html`);

          // Copy icons directory
          if (!existsSync(`${outDir}/icons`)) {
            mkdirSync(`${outDir}/icons`, { recursive: true });
          }
          copyFileSync('icons/icon16.png', `${outDir}/icons/icon16.png`);
          copyFileSync('icons/icon48.png', `${outDir}/icons/icon48.png`);
          copyFileSync('icons/icon128.png', `${outDir}/icons/icon128.png`);

          // Copy styles directory
          if (!existsSync(`${outDir}/styles`)) {
            mkdirSync(`${outDir}/styles`, { recursive: true });
          }
          copyFileSync('styles/content.css', `${outDir}/styles/content.css`);
        }
      }
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.BUILD_TARGET': JSON.stringify(target)
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  };
};

// Export the configuration based on the build target
export default defineConfig(createConfig(buildTarget));

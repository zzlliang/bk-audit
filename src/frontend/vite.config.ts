/*
  TencentBlueKing is pleased to support the open source community by making
  蓝鲸智云 - 审计中心 (BlueKing - Audit Center) available.
  Copyright (C) 2023 THL A29 Limited,
  a Tencent company. All rights reserved.
  Licensed under the MIT License (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at http://opensource.org/licenses/MIT
  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
  either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
  We undertake not to change the open source license (MIT license) applicable
  to the current version of the project delivered to anyone in the future.
*/
import { createRequire } from 'module';
import Components from 'unplugin-vue-components/vite';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import VitePluginHtmlEnv from 'vite-plugin-html-env';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

import basicSsl from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';


const require = createRequire(import.meta.url);
const moduleManifest = require('./packages/build-tools/module-manifest.cjs') as Record<string, { remoteName: string; views: string[] }>;

function getFederationAliases() {
  return Object.fromEntries(Object.entries(moduleManifest).map(([packageName, config]) => [
    `${config.remoteName}/routes`,
    fileURLToPath(new URL(`./packages/modules/${packageName}/src/entry.ts`, import.meta.url)),
  ]));
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  const isRelease = mode === 'release';

  return {
    logLevel: isRelease ? 'error' : 'info',
    base: process.env.AUDIT_VITE_BUILD_BASE_DIR || '/',
    publicDir: 'static',
    plugins: [
      vue({
        script: {
          defineModel: true,
        },
      }),
      vueJsx(),
      isDevelopment && basicSsl(),
      monacoEditorPlugin({
        languageWorkers: ['editorWorkerService', 'json'],
      }),
      isDevelopment && VitePluginHtmlEnv({
        prefix: '{{ ',
        suffix: ' }}',
        envPrefixes: 'AUDIT_',
      }),
      Components({
        dts: isDevelopment,
        include: [/src\/components/],
      }),
    ].filter(_ => _),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@lib': fileURLToPath(new URL('./lib', import.meta.url)),
        '@service': fileURLToPath(new URL('./src/domain/service', import.meta.url)),
        '@model': fileURLToPath(new URL('./src/domain/model', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@views': fileURLToPath(new URL('./src/views', import.meta.url)),
        '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
        '@directives': fileURLToPath(new URL('./src/directives', import.meta.url)),
        '@router': fileURLToPath(new URL('./src/router', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@css': fileURLToPath(new URL('./src/css', import.meta.url)),
        '@language': fileURLToPath(new URL('./src/language', import.meta.url)),
        '@images': fileURLToPath(new URL('./src/images', import.meta.url)),
        ...getFederationAliases(),
      },
    },
    envPrefix: 'AUDIT_',
    server: {
      https: {},
      port: 8082,
      strictPort: true,
    },
    build: isRelease ? {
      sourcemap: false,
      reportCompressedSize: false,
      cssCodeSplit: true,
      rollupOptions: {
        maxParallelFileOps: 2,
        output: {
          manualChunks(id) {
            if (id.includes('monaco-editor')) {
              return 'monaco';
            }
            if (id.includes('echarts')) {
              return 'echarts';
            }
            if (id.includes('bkui-vue')) {
              return 'bkui';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    } : undefined,
  };
});

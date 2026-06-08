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
import Components from 'unplugin-vue-components/vite';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import VitePluginHtmlEnv from 'vite-plugin-html-env';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

import basicSsl from '@vitejs/plugin-basic-ssl';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

const manualChunks = (id: string) => {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (id.includes('monaco-editor') || id.includes('vite-plugin-monaco-editor')) {
    return 'monaco';
  }
  if (id.includes('echarts') || id.includes('zrender')) {
    return 'echarts';
  }
  if (id.includes('bkui-vue') || id.includes('@blueking')) {
    return 'blueking';
  }
  if (id.includes('@vueup/vue-quill') || id.includes('quill')) {
    return 'quill';
  }
  if (id.includes('xlsx') || id.includes('sheetjs')) {
    return 'xlsx';
  }
  if (id.includes('vue-i18n')) {
    return 'vue-i18n';
  }
  if (id.includes('vue-router') || id.includes('/vue/') || id.includes('/@vue/')) {
    return 'vue-vendor';
  }
  if (id.includes('markdown-it') || id.includes('dompurify') || id.includes('axios')
    || id.includes('dayjs') || id.includes('lodash')) {
    return 'utils';
  }

  return 'vendor';
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  const isProduction = !isDevelopment;

  return {
    // 开发保持安静；生产构建输出进度日志，避免长时间无输出
    logLevel: isDevelopment ? 'error' : 'info',
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
      monacoEditorPlugin({}),
      isDevelopment && VitePluginHtmlEnv({
        prefix: '{{ ',
        suffix: ' }}',
        envPrefixes: 'AUDIT_',
      }),
      Components({
        dts: isDevelopment,
        include: [/src\/components/],
      }),
    ].filter(Boolean),
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
      },
    },
    envPrefix: 'AUDIT_',
    build: isProduction ? {
      sourcemap: false,
      reportCompressedSize: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        maxParallelFileOps: 2,
        output: {
          manualChunks,
        },
      },
    } : undefined,
    server: {
      https: {},
      port: 8082,
      strictPort: true,
    },
  };
});

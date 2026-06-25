<!--
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
-->
<template>
  <div
    v-if="items.length"
    class="scene-data-filter-ui">
    <bk-checkbox
      v-model="localEnabled"
      class="filter-toggle"
      @change="handleEnabledChange">
      {{ t('是否过滤数据') }}
    </bk-checkbox>

    <div
      v-if="localEnabled"
      class="filter-block-list">
      <div
        v-for="item in items"
        :key="item.id"
        class="filter-block">
        <div class="filter-block-header">
          {{ item.name }}
        </div>
        <div class="filter-block-body">
          <scene-filter-rules
            v-model="localConfigs[item.id]"
            :fields="fieldsMap[item.id] || []"
            :loading="loadingMap[item.id]" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { nextTick, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';

  import {
    createDefaultFilterRules,
    type FieldOption,
    type FilterRulesData,
  } from './filter-rules';
  import SceneFilterRules from './scene-filter-rules.vue';

  export interface FilterUiItem {
    id: string;
    name: string;
  }

  interface Props {
    items: FilterUiItem[];
    enabled?: boolean;
    configs?: Record<string, FilterRulesData>;
    fieldsMap?: Record<string, FieldOption[]>;
    loadingMap?: Record<string, boolean>;
  }

  interface Emits {
    (e: 'update:enabled', value: boolean): void;
    (e: 'update:configs', value: Record<string, FilterRulesData>): void;
  }

  const props = withDefaults(defineProps<Props>(), {
    enabled: false,
    configs: () => ({}),
    fieldsMap: () => ({}),
    loadingMap: () => ({}),
  });
  const emits = defineEmits<Emits>();

  const { t } = useI18n();

  const localEnabled = ref(false);
  const localConfigs = ref<Record<string, FilterRulesData>>({});
  const isSyncingFromParent = ref(false);

  const syncLocalConfigsFromProps = () => {
    isSyncingFromParent.value = true;
    localConfigs.value = ensureConfigs(props.items, props.configs || {});
    nextTick(() => {
      isSyncingFromParent.value = false;
    });
  };

  const ensureConfigs = (
    items: FilterUiItem[],
    configs: Record<string, FilterRulesData>,
  ) => {
    const nextConfigs = { ...configs };
    items.forEach((item) => {
      if (!nextConfigs[item.id]) {
        nextConfigs[item.id] = createDefaultFilterRules();
      }
    });
    Object.keys(nextConfigs).forEach((id) => {
      if (!items.some(item => item.id === id)) {
        delete nextConfigs[id];
      }
    });
    return nextConfigs;
  };

  const handleEnabledChange = (value: boolean) => {
    emits('update:enabled', value);
  };

  watch(() => props.enabled, (value) => {
    localEnabled.value = value;
  }, { immediate: true });

  watch(() => props.configs, () => {
    syncLocalConfigsFromProps();
  }, {
    immediate: true,
    deep: true,
  });

  watch(() => props.items, () => {
    syncLocalConfigsFromProps();
  }, { deep: true });

  watch(localConfigs, (value) => {
    if (isSyncingFromParent.value) {
      return;
    }
    emits('update:configs', JSON.parse(JSON.stringify(value)));
  }, { deep: true });
</script>

<style scoped lang="postcss">
.scene-data-filter-ui {
  margin-top: 8px;

  .filter-toggle {
    margin-bottom: 12px;
  }

  .filter-block-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .filter-block {
    border: 1px solid #dcdee5;
    border-radius: 2px;
  }

  .filter-block-header {
    padding: 8px 16px;
    font-size: 12px;
    line-height: 20px;
    color: #313238;
    background: #f0f1f5;
    border-radius: 2px 2px 0 0;
  }

  .filter-block-body {
    padding: 16px;
    overflow: visible;
    background: #fff;
    border-radius: 0 0 2px 2px;
  }
}
</style>

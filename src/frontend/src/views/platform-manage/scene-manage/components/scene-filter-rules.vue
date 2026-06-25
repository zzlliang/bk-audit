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
    class="scene-filter-rules"
    :class="{ 'has-groups': needGroupConnector }">
    <div class="rule-item-wrap">
      <div
        v-for="(group, groupIndex) in localRules.groups"
        :key="groupIndex"
        class="rule-item"
        :style="{ paddingLeft: getGroupPaddingLeft(groupIndex, group) }">
        <template v-if="needGroupConnector">
          <div class="row-line group-row-line" />
          <div
            v-if="groupIndex > 0"
            class="column-line column-line-top" />
          <div
            v-if="groupIndex < localRules.groups.length - 1"
            class="column-line column-line-bottom" />
        </template>

        <div
          v-for="(condition, conditionIndex) in group.conditions"
          :key="conditionIndex"
          class="condition-row"
          :style="{
            marginBottom: conditionIndex === group.conditions.length - 1 ? '0' : '8px',
          }">
          <template v-if="needInnerConnector(group)">
            <div class="row-line inner-row-line" />
            <div
              v-if="conditionIndex < group.conditions.length - 1"
              class="column-line inner-column-line" />
          </template>

          <bk-select
            v-model="condition.field"
            class="condition-field"
            filterable
            :loading="loading"
            :placeholder="t('请选择字段')"
            @change="syncToParent">
            <bk-option
              v-for="field in fields"
              :key="field.value"
              :label="field.label"
              :value="field.value" />
          </bk-select>
          <bk-select
            v-model="condition.operator"
            class="condition-operator"
            :clearable="false"
            @change="syncToParent">
            <bk-option
              v-for="operator in FILTER_OPERATORS"
              :key="operator.value"
              :label="operator.label"
              :value="operator.value" />
          </bk-select>
          <bk-input
            v-model="condition.value"
            class="condition-value"
            :placeholder="t('请输入值')"
            @change="syncToParent" />
          <div class="icon-group">
            <audit-icon
              class="action-icon"
              type="add-fill"
              @click="handleAddCondition(groupIndex)" />
            <audit-icon
              v-if="canDeleteCondition"
              class="action-icon"
              type="reduce-fill"
              @click="handleDeleteCondition(groupIndex, conditionIndex)" />
          </div>
        </div>

        <div
          v-if="needInnerConnector(group)"
          class="condition inner-condition"
          @click="handleToggleGroupConnector(groupIndex)">
          {{ group.connector }}
        </div>

        <audit-icon
          v-if="localRules.groups.length > 1"
          class="delete-group"
          type="delete"
          @click="handleDeleteGroup(groupIndex)" />
      </div>

      <div
        v-if="needGroupConnector"
        class="condition group-condition"
        @click="handleToggleRulesConnector">
        {{ localRules.connector }}
      </div>
    </div>

    <div
      class="add-rule-item"
      @click="handleAddGroup">
      <audit-icon
        style="margin: 0 6px;"
        type="add" />
      <span>{{ t('添加条件组') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';

  import {
    countFilterConditions,
    createDefaultCondition,
    createDefaultFilterRules,
    FILTER_OPERATORS,
    type FieldOption,
    type FilterRulesData,
  } from './filter-rules';

  interface Props {
    modelValue: FilterRulesData;
    fields?: FieldOption[];
    loading?: boolean;
  }

  interface Emits {
    (e: 'update:modelValue', value: FilterRulesData): void;
  }

  const props = withDefaults(defineProps<Props>(), {
    fields: () => [],
    loading: false,
  });
  const emits = defineEmits<Emits>();

  const { t } = useI18n();

  const localRules = ref<FilterRulesData>(createDefaultFilterRules());

  const needGroupConnector = computed(() => localRules.value.groups.length > 1);
  const canDeleteCondition = computed(() => countFilterConditions(localRules.value) > 1);

  const needInnerConnector = (group: FilterRulesData['groups'][0]) => group.conditions.length > 1;

  const getGroupPaddingLeft = (groupIndex: number, group: FilterRulesData['groups'][0]) => {
    if (!needGroupConnector.value) {
      return needInnerConnector(group) ? '55px' : '0';
    }
    const beforeGroups = localRules.value.groups.slice(0, groupIndex);
    const afterGroups = localRules.value.groups.slice(groupIndex + 1);
    const hasInnerConnector = beforeGroups.concat(afterGroups).some(item => item.conditions.length > 1)
      || group.conditions.length > 1;
    return hasInnerConnector ? '55px' : '16px';
  };

  const syncToParent = () => {
    emits('update:modelValue', JSON.parse(JSON.stringify(localRules.value)));
  };

  const handleAddCondition = (groupIndex: number) => {
    localRules.value.groups[groupIndex].conditions.push(createDefaultCondition());
    syncToParent();
  };

  const handleDeleteCondition = (groupIndex: number, conditionIndex: number) => {
    if (!canDeleteCondition.value) {
      return;
    }
    localRules.value.groups[groupIndex].conditions.splice(conditionIndex, 1);
    if (!localRules.value.groups[groupIndex].conditions.length) {
      localRules.value.groups.splice(groupIndex, 1);
    }
    syncToParent();
  };

  const handleAddGroup = () => {
    localRules.value.groups.push({
      connector: 'and',
      conditions: [createDefaultCondition()],
    });
    syncToParent();
  };

  const handleDeleteGroup = (groupIndex: number) => {
    if (localRules.value.groups.length <= 1) {
      return;
    }
    localRules.value.groups.splice(groupIndex, 1);
    syncToParent();
  };

  const handleToggleGroupConnector = (groupIndex: number) => {
    const group = localRules.value.groups[groupIndex];
    group.connector = group.connector === 'and' ? 'or' : 'and';
    syncToParent();
  };

  const handleToggleRulesConnector = () => {
    localRules.value.connector = localRules.value.connector === 'and' ? 'or' : 'and';
    syncToParent();
  };

  watch(() => props.modelValue, (value) => {
    localRules.value = JSON.parse(JSON.stringify(value || createDefaultFilterRules()));
  }, {
    immediate: true,
    deep: true,
  });
</script>

<style scoped lang="postcss">
.scene-filter-rules {
  .rule-item-wrap {
    position: relative;

    .condition {
      position: absolute;
      z-index: 1;
      width: 28px;
      height: 28px;
      font-size: 12px;
      line-height: 28px;
      color: #f5b401;
      text-align: center;
      text-transform: lowercase;
      cursor: pointer;
      background: #fff;
      border: 1px solid #f5b401;
      border-radius: 2px;
    }

    .group-condition {
      top: calc(50% - 14px);
      left: -38px;
    }

    .rule-item {
      position: relative;
      padding-right: 24px;
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }

      .group-row-line {
        position: absolute;
        top: 50%;
        left: -25px;
        width: 25px;
        height: 0;
        border-top: 1px dashed #dcdee5;
      }

      .column-line {
        position: absolute;
        left: -25px;
        width: 0;
        border-left: 1px dashed #dcdee5;
      }

      .column-line-top {
        top: 0;
        height: calc(50% + 8px);
        transform: translateY(-8px);
      }

      .column-line-bottom {
        top: 50%;
        height: calc(50% + 8px);
      }

      .inner-condition {
        top: calc(50% - 14px);
        left: 14px;
      }

      .delete-group {
        position: absolute;
        top: 0;
        right: 0;
        font-size: 14px;
        color: #979ba5;
        cursor: pointer;
      }
    }
  }

  .condition-row {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;

    .inner-row-line {
      position: absolute;
      top: 16px;
      left: -25px;
      width: 25px;
      height: 0;
      border-top: 1px dashed #dcdee5;
    }

    .inner-column-line {
      position: absolute;
      top: 16px;
      left: -25px;
      width: 0;
      height: 40px;
      border-left: 1px dashed #dcdee5;
    }
  }

  .icon-group {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #c4c6cc;

    .action-icon {
      cursor: pointer;

      & + .action-icon {
        margin-left: 10px;
      }
    }
  }

  .add-rule-item {
    display: flex;
    height: 32px;
    padding: 0 5px;
    margin-top: 12px;
    color: #3a84ff;
    cursor: pointer;
    background: #fafbfd;
    border: 1px dashed #dcdee5;
    border-radius: 2px;
    align-items: center;
  }
}

.has-groups {
  width: calc(100% - 35px);
  transform: translateX(35px);
}
</style>

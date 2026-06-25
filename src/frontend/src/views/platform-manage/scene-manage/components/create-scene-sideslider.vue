<!--
  TencentBlueKing is pleased to support the open source community by making
  蓝鲸智云 - 审计中心 (BlueKing - Audit Center) available.
  Copyright (C) 2023 THL A29 Limited,
  a Tencent company. All rights reserved.
  Licensed under the MIT License (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at http://opensource.org/licenses/MIT
  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed in
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
  either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
  We undertake not to change the open source license (MIT license) applicable
  to the current version of the project delivered to anyone in the future.
-->
<template>
  <bk-sideslider
    :before-close="handleBeforeClose"
    :esc-close="false"
    :is-show="isShow"
    :title="isEditMode ? t('编辑场景') : t('新建场景')"
    :width="740"
    @closed="handleClose">
    <template #default>
      <div class="create-scene-content">
        <bk-form
          ref="formRef"
          form-type="vertical"
          :model="formData"
          :rules="formRules">
          <!-- 场景名称 -->
          <bk-form-item
            :label="t('场景名称')"
            property="name"
            required>
            <bk-input
              v-model="formData.name"
              :placeholder="t('请输入')" />
          </bk-form-item>

          <!-- 场景管理员 -->
          <bk-form-item
            property="managers"
            required>
            <template #label>
              <bk-popover
                placement="top"
                theme="dark">
                <span class="label-tips">{{ t('场景管理员') }}</span>
                <template #content>
                  <div>{{ t('拥有场景的完整管理权限，包括策略配置、数据源管理、成员管理等') }}</div>
                </template>
              </bk-popover>
            </template>
            <audit-user-selector-tenant
              v-model="formData.managers"
              :collapse-tags="false"
              multiple
              @blur="handleManagersBlur" />
          </bk-form-item>

          <!-- 场景描述 -->
          <bk-form-item
            :label="t('场景描述')"
            property="description">
            <bk-input
              v-model="formData.description"
              :maxlength="100"
              :placeholder="t('请输入')"
              :rows="3"
              show-word-limit
              type="textarea" />
          </bk-form-item>

          <!-- 场景使用者 -->
          <bk-form-item
            property="users">
            <template #label>
              <bk-popover
                placement="top"
                theme="dark">
                <span class="label-tips">{{ t('场景使用者') }}</span>
                <template #content>
                  <div>{{ t('仅拥有场景下资源的只读使用权限（检索、报表、工具），无法更改场景配置') }}</div>
                </template>
              </bk-popover>
            </template>
            <audit-user-selector-tenant
              v-model="formData.users"
              :auto-focus="false"
              :collapse-tags="false"
              multiple />
          </bk-form-item>

          <!-- 关联系统 -->
          <bk-form-item
            property="system_id">
            <template #label>
              <bk-popover
                placement="top"
                theme="dark">
                <span class="label-tips">{{ t('关联系统') }}</span>
                <template #content>
                  <div>{{ t('关联「系统接入」中已接入系统的操作数据，场景可基于此数据进行检索、配置策略、生成报表') }}</div>
                </template>
              </bk-popover>
            </template>
            <bk-select
              v-model="formData.system_id"
              :clearable="false"
              collapse-tags
              filterable
              :loading="systemLoading"
              multiple
              multiple-mode="tag"
              :placeholder="t('请选择')"
              show-all
              @change="handleSystemChange">
              <bk-option
                v-for="item in systemList"
                :key="item.system_id"
                :label="item.name"
                :value="item.system_id" />
            </bk-select>
            <scene-data-filter-ui
              v-model:configs="systemFilterConfigs"
              v-model:enabled="systemFilterEnabled"
              :fields-map="systemFieldsMap"
              :items="selectedSystemItems"
              :loading-map="systemFieldsLoadingMap" />
          </bk-form-item>

          <!-- 关联数据表 -->
          <bk-form-item
            property="table_id">
            <template #label>
              <bk-popover
                placement="top"
                theme="dark">
                <span class="label-tips">{{ t('关联数据表') }}</span>
                <template #content>
                  <div>{{ t('授权审计中心的数据表给场景使用，场景管理员可基于数据表配置审计策略、在工具广场创建 SQL 工具。注：数据表数据不在「检索」菜单中展示') }}</div>
                </template>
              </bk-popover>
            </template>
            <bk-loading :loading="typeTableLoading">
              <div class="select-group">
                <bk-form-item
                  class="no-label"
                  label-width="0"
                  property="table_id">
                  <table-select-picker
                    ref="tableSelectPickerRef"
                    v-model="formData.table_id"
                    :is-edit-mode="isEditMode"
                    :scene-id="props.sceneId"
                    @change="handleTableChange"
                    @loaded="handleTablePickerLoaded"
                    @toggle="handleTablePickerToggle" />
                </bk-form-item>
              </div>
            </bk-loading>
            <scene-data-filter-ui
              v-model:configs="tableFilterConfigs"
              v-model:enabled="tableFilterEnabled"
              :fields-map="tableFieldsMap"
              :items="selectedTableItems"
              :loading-map="tableFieldsLoadingMap" />
          </bk-form-item>
        </bk-form>
      </div>
    </template>
    <template #footer>
      <bk-button
        class="mr8"
        :loading="submitLoading"
        theme="primary"
        @click="handleSubmit">
        {{ t('提交') }}
      </bk-button>
      <bk-button @click="handleCancel">
        {{ t('取消') }}
      </bk-button>
    </template>
  </bk-sideslider>
</template>

<script setup lang="ts">
  import {
    computed,
    nextTick,
    ref,
    watch,
  } from 'vue';
  import { useI18n } from 'vue-i18n';

  import MetaManageService from '@service/meta-manage';
  import SceneManageService from '@service/scene-manage';
  import EsQueryService from '@service/es-query';
  import StrategyManageService from '@service/strategy-manage';

  import SystemModel from '@model/meta/system';
  import SceneModel from '@model/scene/scene';

  import useMessage from '@hooks/use-message';

  import AuditUserSelectorTenant from '@components/audit-user-selector-tenant/index.vue';
  import {
    createDefaultFilterRules,
    type FieldOption,
    type FilterRulesData,
    parseFilterRules,
    serializeFilterRules,
  } from './filter-rules';
  import SceneDataFilterUi, { type FilterUiItem } from './scene-data-filter-ui.vue';
  import TableSelectPicker from './table-select-picker.vue';

  import useRequest from '@/hooks/use-request';

  interface Props {
    isShow: boolean;
    sceneId?: string | number;
  }

  interface Emits {
    (e: 'update:isShow', value: boolean): void;
    (e: 'success', sceneId?: string | number): void;
  }

  interface FormData {
    name: string;
    managers: string[];
    description: string;
    users: string[];
    system_id: string[];
    table_id: string[];
  }


  interface TableItem {
    id: string;
    name: string;
  }

  const props = defineProps<Props>();
  const emits = defineEmits<Emits>();

  const { t } = useI18n();
  const { messageSuccess } = useMessage();

  // 编辑模式判断
  const isEditMode = computed(() => !!props.sceneId);

  const formRef = ref();
  const submitLoading = ref(false);
  const systemLoading = ref(false);
  const tableLoading = ref(false);

  // 系统列表
  const systemList = ref<SystemModel[]>([]);
  // 是否选择了"全部"
  const isAllSystemsSelected = ref(false);
  // 数据表列表（保留兼容）
  const tableList = ref<TableItem[]>([]);

  // 数据表选择器相关
  const tableSelectPickerRef = ref();
  const typeTableLoading = ref(false);

  // 数据过滤（关联系统）
  const systemFilterEnabled = ref(false);
  const systemFilterConfigs = ref<Record<string, FilterRulesData>>({});
  const systemFieldsMap = ref<Record<string, FieldOption[]>>({});
  const systemFieldsLoadingMap = ref<Record<string, boolean>>({});
  const systemSearchFields = ref<FieldOption[]>([]);
  const systemSearchFieldsLoading = ref(false);

  // 数据过滤（关联数据表）
  const tableFilterEnabled = ref(false);
  const tableFilterConfigs = ref<Record<string, FilterRulesData>>({});
  const tableFieldsMap = ref<Record<string, FieldOption[]>>({});
  const tableFieldsLoadingMap = ref<Record<string, boolean>>({});
  const selectedTableItems = ref<FilterUiItem[]>([]);
  const isTablePickerOpen = ref(false);

  // 加载数据表选择器数据
  const loadTablePickerData = () => {
    typeTableLoading.value = true;
    // 使用 nextTick 等待子组件 table-select-picker 挂载完成后再调用 loadData，
    // 避免首次打开时 ref 尚未就绪导致加载动画卡住
    nextTick(() => {
      tableSelectPickerRef.value?.loadData();
    });
  };

  // 数据表选择器加载完成回调
  const handleTablePickerLoaded = () => {
    typeTableLoading.value = false;
    refreshSelectedTableItems();
  };

  const handleTablePickerToggle = (isOpen: boolean) => {
    isTablePickerOpen.value = isOpen;
    if (!isOpen) {
      nextTick(() => {
        refreshSelectedTableItems();
        if (tableFilterEnabled.value) {
          loadTableFieldsForItems();
        }
      });
    }
  };

  const handleTableChange = () => {
    // 下拉面板展开时跳过刷新，避免重渲染导致树节点勾选转圈
    if (isTablePickerOpen.value) {
      return;
    }
    nextTick(() => {
      refreshSelectedTableItems();
      if (tableFilterEnabled.value) {
        loadTableFieldsForItems();
      }
    });
  };

  const refreshSelectedTableItems = () => {
    const nodes = tableSelectPickerRef.value?.getSelectedTableNodes?.() || [];
    if (nodes.length) {
      selectedTableItems.value = nodes.map((node: { value: string; label: string }) => ({
        id: node.value,
        name: node.label,
      }));
    } else {
      selectedTableItems.value = formData.value.table_id.map(tableId => ({
        id: tableId,
        name: tableId,
      }));
    }
    syncTableFilterConfigs();
  };

  // 表单数据
  const formData = ref<FormData>({
    name: '',
    managers: [],
    description: '',
    users: [],
    system_id: [] as string[],
    table_id: [] as string[],
  });

  // 表单校验规则
  const formRules = {
    name: [
      {
        required: true,
        message: t('场景名称不能为空'),
        trigger: 'blur',
      },
    ],
    managers: [
      {
        required: true,
        message: t('场景管理员不能为空'),
        trigger: 'blur',
      },
    ],
  };

  // 场景管理员失去焦点时重新校验
  const handleManagersBlur = () => {
    formRef.value?.clearValidate('managers');
    if (formData.value.managers.length === 0) {
      formRef.value?.validateField('managers');
    }
  };

  // 关联系统变更
  const handleSystemChange = (value: any) => {
    // 判断是否选中了"全部"：bk-select show-all 模式下选中全部时 value 为 [undefined]
    isAllSystemsSelected.value = (value as any[]).includes(undefined)
      || (value as string[]).includes('__ALL__')
      || (Array.isArray(value) && value.length > 0 && value.length === systemList.value.length);
    if (Array.isArray(value) && value.length > 0) {
      fetchTableList();
    } else {
      tableList.value = [];
      if (!isAllSystemsSelected.value) {
        isAllSystemsSelected.value = false;
      }
    }
    syncSystemFilterConfigs();
  };

  const getValidSystemIds = () => formData.value.system_id
    .filter(id => id && id !== '__ALL__') as string[];

  const selectedSystemItems = computed(() => {
    if (isAllSystemsSelected.value) {
      return [];
    }
    return getValidSystemIds().map((systemId) => {
      const system = systemList.value.find(item => item.system_id === systemId);
      return {
        id: systemId,
        name: system?.name || systemId,
      };
    });
  });

  const syncSystemFilterConfigs = () => {
    const nextConfigs = { ...systemFilterConfigs.value };
    selectedSystemItems.value.forEach((item) => {
      if (!nextConfigs[item.id]) {
        nextConfigs[item.id] = createDefaultFilterRules();
      }
    });
    Object.keys(nextConfigs).forEach((id) => {
      if (!selectedSystemItems.value.some(item => item.id === id)) {
        delete nextConfigs[id];
      }
    });
    systemFilterConfigs.value = nextConfigs;
  };

  const syncTableFilterConfigs = () => {
    const nextConfigs = { ...tableFilterConfigs.value };
    selectedTableItems.value.forEach((item) => {
      if (!nextConfigs[item.id]) {
        nextConfigs[item.id] = createDefaultFilterRules();
      }
    });
    Object.keys(nextConfigs).forEach((id) => {
      if (!selectedTableItems.value.some(item => item.id === id)) {
        delete nextConfigs[id];
      }
    });
    tableFilterConfigs.value = nextConfigs;
  };

  const loadSystemSearchFields = async () => {
    if (systemSearchFields.value.length || systemSearchFieldsLoading.value) {
      return;
    }
    systemSearchFieldsLoading.value = true;
    try {
      const data = await EsQueryService.fetchSearchConfig();
      systemSearchFields.value = data.map(item => ({
        label: item.description || item.field_name,
        value: item.field_name,
      }));
    } finally {
      systemSearchFieldsLoading.value = false;
    }
  };

  const loadSystemFieldsForItems = async () => {
    await loadSystemSearchFields();
    const loadingMap: Record<string, boolean> = {};
    const fieldsMap: Record<string, FieldOption[]> = {};
    selectedSystemItems.value.forEach((item) => {
      loadingMap[item.id] = systemSearchFieldsLoading.value;
      fieldsMap[item.id] = systemSearchFields.value;
    });
    systemFieldsLoadingMap.value = loadingMap;
    systemFieldsMap.value = fieldsMap;
  };

  const loadTableFields = async (configKey: string, tableId: string) => {
    if (!tableId || tableFieldsMap.value[configKey]?.length) {
      return;
    }
    tableFieldsLoadingMap.value = {
      ...tableFieldsLoadingMap.value,
      [configKey]: true,
    };
    try {
      const data = await StrategyManageService.fetchTableRtFields({ table_id: tableId });
      tableFieldsMap.value = {
        ...tableFieldsMap.value,
        [configKey]: data.map(item => ({
          label: item.label || item.value,
          value: item.value,
        })),
      };
    } finally {
      tableFieldsLoadingMap.value = {
        ...tableFieldsLoadingMap.value,
        [configKey]: false,
      };
    }
  };

  const getTableIdForFieldLoad = (item: FilterUiItem) => {
    if (!item.id.startsWith('__')) {
      return item.id;
    }
    return formData.value.table_id[0] || '';
  };

  const loadTableFieldsForItems = async () => {
    await Promise.all(selectedTableItems.value.map(item => loadTableFields(
      item.id,
      getTableIdForFieldLoad(item),
    )));
  };

  const resolveTableFilterRules = (tableId: string) => {
    if (!tableFilterEnabled.value) {
      return [];
    }
    if (tableFilterConfigs.value[tableId]) {
      return serializeFilterRules(tableFilterConfigs.value[tableId], true);
    }
    const tagItem = selectedTableItems.value.find(item => item.id.startsWith('__'));
    if (tagItem && tableFilterConfigs.value[tagItem.id]) {
      return serializeFilterRules(tableFilterConfigs.value[tagItem.id], true);
    }
    if (selectedTableItems.value.length === 1) {
      const onlyItem = selectedTableItems.value[0];
      return serializeFilterRules(
        tableFilterConfigs.value[onlyItem.id] || createDefaultFilterRules(),
        true,
      );
    }
    return [];
  };

  const resetFilterState = () => {
    systemFilterEnabled.value = false;
    systemFilterConfigs.value = {};
    systemFieldsMap.value = {};
    systemFieldsLoadingMap.value = {};
    tableFilterEnabled.value = false;
    tableFilterConfigs.value = {};
    tableFieldsMap.value = {};
    tableFieldsLoadingMap.value = {};
    selectedTableItems.value = [];
    isTablePickerOpen.value = false;
  };

  const fillFilterStateFromSceneData = (data: SceneModel) => {
    resetFilterState();

    const systems = (data.systems || []).filter(item => !item.is_all_systems);
    if (systems.some(item => (item.filter_rules || []).length > 0)) {
      systemFilterEnabled.value = true;
      systemFilterConfigs.value = systems.reduce((acc, item) => {
        if (item.system_id) {
          acc[item.system_id] = parseFilterRules(item.filter_rules || []);
        }
        return acc;
      }, {} as Record<string, FilterRulesData>);
    }

    const tables = data.tables || [];
    if (tables.some(item => (item.filter_rules || []).length > 0)) {
      tableFilterEnabled.value = true;
      tableFilterConfigs.value = tables.reduce((acc, item) => {
        if (item.table_id) {
          acc[item.table_id] = parseFilterRules(item.filter_rules || []);
        }
        return acc;
      }, {} as Record<string, FilterRulesData>);
    }
  };

  // 获取系统列表
  const {
    run: fetchSystemList,
  } = useRequest(MetaManageService.fetchSystemList, {
    defaultValue: {
      results: [] as SystemModel[],
      page: 1,
      num_pages: 1000,
      total: 0,
    },
    onSuccess: (res) => {
      systemList.value = res.results;
      // 编辑模式下，系统列表加载完成后回填关联系统
      if (isEditMode.value && props.sceneId) {
        fetchSceneDetail(props.sceneId as any);
      } else {
        resetForm();
      }
    },
  });
  // 获取数据表列表（仅保留用于 fetchTableList 调用兼容）
  const fetchTableList = async () => {
    tableLoading.value = true;
    try {
      tableList.value = [];
    } finally {
      tableLoading.value = false;
    }
  };

  // 重置表单
  const resetForm = () => {
    formData.value = {
      name: '',
      managers: [],
      description: '',
      users: [],
      system_id: [],
      table_id: [] as string[],
    };
    tableList.value = [];
    isAllSystemsSelected.value = false;
    resetFilterState();
    tableSelectPickerRef.value?.resetState();
  };

  // 关闭前确认
  const handleBeforeClose = (): boolean | Promise<boolean> => {
    // 检查是否有未保存的数据
    const hasData = formData.value.name
      || formData.value.managers.length > 0
      || formData.value.description
      || formData.value.users.length > 0
      || formData.value.system_id.length > 0
      || formData.value.table_id.length > 0;

    if (hasData) {
      return new Promise<boolean>((resolve) => {
        // 可以使用 InfoBox 确认
        resolve(true);
      });
    }
    return true;
  };

  // 创建场景
  const {
    run: createScene,
  } = useRequest(SceneManageService.createScene, {
    defaultValue: new SceneModel(),
    onSuccess: (res) => {
      messageSuccess(t(isEditMode.value ? '编辑成功' : '创建成功'));
      // 新建模式下传递新场景 ID，用于高亮显示
      if (!isEditMode.value && res?.scene_id) {
        emits('success', res.scene_id);
      } else {
        emits('success');
      }
      handleClose();
    },
  });

  // 编辑场景
  const {
    run: updateScene,
  } = useRequest(SceneManageService.updateScene, {
    defaultValue: new SceneModel(),
    onSuccess: () => {
      messageSuccess(t('编辑成功'));
      emits('success');
      handleClose();
    },
  });

  // 获取场景详情
  const {
    run: fetchSceneDetail,
  } = useRequest(SceneManageService.fetchSceneDetail, {
    defaultValue: new SceneModel(),
    onSuccess: (res) => {
      fillFormFromSceneData(res);
    },
  });

  // 编辑模式下回填表单基础字段（仅设置数据，不执行选择模式检测）
  const fillFormFromSceneData = (data: SceneModel) => {
    const rtIds = data.tables && data.tables.length
      ? data.tables.map(t => t.table_id)
      : [];
    const allSysItem = data.systems?.find(s => s.is_all_systems === true);
    isAllSystemsSelected.value = !!allSysItem;
    formData.value = {
      name: data.name || '',
      managers: data.managers || [],
      description: data.description || '',
      users: data.users || [],
      system_id: (allSysItem ? [undefined] : (data.systems || []).map(item => item.system_id)) as string[],
      table_id: rtIds,
    };
    fillFilterStateFromSceneData(data);
    syncSystemFilterConfigs();
    nextTick(() => {
      refreshSelectedTableItems();
    });
    // 注意：tableSelectPicker 组件内部会在数据就绪后自动处理选择模式检测和状态同步
  };

  // 判断是否选择了"全部"
  const isSelectAllSystems = computed(() => isAllSystemsSelected.value);

  // 构建 systems 参数
  const buildSystemsParam = () => {
    if (isSelectAllSystems.value) {
      // 选择全部时，is_all_systems 为 true，system_id 为空字符串
      return [{
        system_id: '',
        is_all_systems: true,
        filter_rules: [],
      }];
    }
    // 非全部时，is_all_systems 为 false
    return getValidSystemIds().map(id => ({
      system_id: id,
      is_all_systems: false,
      filter_rules: serializeFilterRules(
        systemFilterConfigs.value[id] || createDefaultFilterRules(),
        systemFilterEnabled.value,
      ),
    }));
  };

  // 提交表单
  const submitParams = () => ({
    scene_id: typeof props.sceneId === 'number' ? props.sceneId : undefined,
    name: formData.value.name,
    description: formData.value.description || undefined,
    managers: formData.value.managers as string[],
    users: (formData.value.users as string[]).length > 0 ? (formData.value.users as string[]) : [],
    systems: buildSystemsParam(),
    tables: formData.value.table_id.length > 0
      ? formData.value.table_id.map(id => ({
        table_id: id,
        filter_rules: resolveTableFilterRules(id),
      }))
      : [],
  });

  const handleSubmit = async () => {
    try {
      await formRef.value?.validate();
      submitLoading.value = true;
      if (isEditMode.value) {
        if (!props.sceneId) return;
        await updateScene({
          id: props.sceneId,
          ...submitParams(),
        } as any);
      } else {
        await createScene(submitParams() as any);
      }
    } catch (e) {
      console.error('表单校验失败或提交异常', e);
    } finally {
      submitLoading.value = false;
    }
  };

  // 取消
  const handleCancel = () => {
    emits('update:isShow', false);
  };

  // 关闭
  const handleClose = () => {
    resetForm();
    emits('update:isShow', false);
  };

  // 监听显示状态，打开时加载系统列表和级联数据
  watch(() => props.isShow, (val) => {
    if (val) {
      fetchSystemList({
        page: 1,
        page_size: 1000,
        audit_status: 'accessed',
      });
      loadTablePickerData();
      loadSystemSearchFields();
    }
  });

  watch(selectedSystemItems, (items) => {
    syncSystemFilterConfigs();
    if (items.length && systemFilterEnabled.value) {
      loadSystemFieldsForItems();
    }
  }, { deep: true });

  watch(systemFilterEnabled, (enabled) => {
    if (enabled && selectedSystemItems.value.length) {
      loadSystemFieldsForItems();
    }
  });

  watch(tableFilterEnabled, (enabled) => {
    if (enabled && selectedTableItems.value.length) {
      loadTableFieldsForItems();
    }
  });
</script>

<style lang="postcss" scoped>
.create-scene-content {
  padding: 24px 40px;

  .form-item-tips {
    margin-top: 4px;
    font-size: 12px;
    line-height: 20px;
    color: #979ba5;
  }

  :deep(.label-tips) {
    cursor: pointer;
    border-bottom: 1px dashed #979ba5;
  }

  .no-label :deep(.bk-form-label::after) {
    content: '';
  }

  .no-label :deep(.bk-form-label) {
    padding-right: 0;
  }

  .select-group {
    :deep(.bk-form-item) {
      margin-bottom: 0;
    }
  }
}

.mr8 {
  margin-right: 8px;
}
</style>

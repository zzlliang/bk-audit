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
  <div class="tools-square">
    <!-- 左侧标签 -->
    <div
      class="sidebar-wrapper"
      :class="{ 'is-collapsed': isSidebarCollapsed }">
      <!-- 收缩状态 -->
      <div
        v-show="isSidebarCollapsed"
        class="sidebar-collapsed"
        @click="isSidebarCollapsed = false">
        <div class="collapsed-inner">
          <span class="collapsed-text">快捷筛选</span>
          <img
            class="collapsed-toggle-icon"
            :src="foldRightIcon">
        </div>
      </div>
      <!-- 展开状态 -->
      <div
        v-show="!isSidebarCollapsed"
        class="sidebar-expanded">
        <!-- 场景系统选择器 -->
        <div class="scene-selector-wrapper">
          <scene-system-selector
            v-model="selectedScene"
            :popover-width="250"
            width="100%"
            @change="handleSceneChange" />
        </div>
        <div class="sidebar-header">
          <span class="sidebar-title">快捷筛选</span>
          <img
            class="sidebar-toggle-icon"
            :src="foldLeftIcon"
            @click="isSidebarCollapsed = true">
        </div>
        <render-label
          ref="renderLabelRef"
          active="-3"
          :final="3"
          :labels="strategyLabelList"
          :render-style="renderStyle"
          @checked="handleChecked" />
        <!-- 内侧折叠图标，垂直居中靠右 -->
        <div
          class="sidebar-collapse-trigger"
          @click="isSidebarCollapsed = true">
          <img
            class="ellipsis-icon"
            :src="ellipsisIcon">
        </div>
      </div>
    </div>

    <!-- 右侧内容-->
    <div class="content-content">
      <div class="content-card">
        <content-card
          ref="ContentCardRef"
          :my-created="tagId === '-4'"
          :recent-used="tagId === '-5'"
          :tag-id="tagId"
          :tags-enums="tagsEnums"
          @change="handleChange" />
      </div>
    </div>
  </div>
</template>

<script setup lang='ts'>
  import { onMounted, ref } from 'vue';

  import ToolManageService from '@service/tool-manage';

  import ToolInfo from '@model/tool/tool-info';

  import SceneSystemSelector from '@components/scene-system-selector/index.vue';

  import RenderLabel from '@views/strategy-manage/list/components/render-label.vue';

  import ContentCard from './square-content/concent-card.vue';

  import useRequest from '@/hooks/use-request';

  interface TagItem {
    tag_id: string;
    tag_name: string;
    tool_count: number;
    icon?: string;
  }

  interface SceneItem {
    id: string;
    name: string;
    type: 'aggregate' | 'scene' | 'system';
  }

  const renderLabelRef = ref();

  const ContentCardRef = ref<InstanceType<typeof ContentCard>>();


  const tagsEnums = ref<Array<TagItem>>([]);
  const upgradeTotal = ref(0);
  const total = ref(0);
  const tagId = ref('');
  const strategyLabelList = ref<Array<TagItem>>([]);
  const renderStyle = ref({
    backgroundColor: '#fff',
  });

  const isSidebarCollapsed = ref(false);
  const isReturningHome = ref(false);

  // 场景选择器
  const selectedScene = ref<SceneItem | null>({
    id: '100001',
    name: '主机安全审计',
    type: 'scene',
  });

  // 场景切换
  const handleSceneChange = (value: SceneItem | null) => {
    console.log('场景切换:', value);
    // TODO: 根据选择的场景/系统重新加载工具列表
  };

  const {
    openedTools,
    activeToolUid,
    hasOpenedTools,
    openTool,
    closeTab,
    switchTab,
    goHome,
    clearAll,
  } = useToolTabs();

  // 选中左侧label
  const handleChecked = (name: string) => {
    tagId.value = name;
    ContentCardRef.value?.getToolsList(name);
  };
  // 右边数据刷新
  const handleChange = () => {
    fetchToolsTagsList();
  };
  // 工具标签列表
  const {
    run: fetchToolsTagsList,
  } = useRequest(ToolManageService.fetchToolTags, {
    defaultValue: [],
    onSuccess: (data) => {
      const strategyList = data.map(item => ({ strategy_count: item.tool_count, ...item, icon: '' }));
      // 自定义strategyLabelList.value 的前三个icon
      const iconMap: Record<number, string> = {
        0: 'quanbu-xuanzhong',
        1: 'morentouxiang',
        2: 'shijian',
        3: 'weifenpei',
      };
      strategyLabelList.value = strategyList.map((item: any, index: number) => ({
        ...item,
        icon: iconMap[index] || 'tag',
      }));

      tagsEnums.value = strategyLabelList.value;
      renderLabelRef.value?.resetAll([]);
    },
  });


  onMounted(() => {
    fetchToolsTagsList();
  });
</script>

<style scoped lang="postcss">
.tools-square {
  position: absolute;
  display: flex;
  width: 100vw;
  height: 100%;
  background-color: #fff;
  inset: 0;

  .content-header {
    top: 0;
    width: 100%;
    background-color: #fff;
    border-radius: 4px;
    opacity: 100%;
    box-shadow: 0  2px 4px  0 rgb(25 25 41 / 5%);
    transition: opacity .2s ease .1s;

    .scene-selector-wrapper {
      padding: 16px 16px 0;
    }

    .sidebar-header {
      position: relative;
      display: flex;
      height: 52px;
      padding: 0 16px 0 26px;
      align-items: center;
      justify-content: space-between;

      &::after {
        position: absolute;
        right: 16px;
        bottom: 0;
        left: 16px;
        border-bottom: 1px solid #eaebf0;
        content: '';
      }

      .sidebar-title {
        font-size: 14px;
        font-weight: 500;
        color: #313238;
      }

      .sidebar-toggle-icon {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
    }

    :deep(.render-label-box) {
      height: calc(100% - 52px - 48px);

      .render-label {
        padding: 0;

        .label-item {
          padding: 0 26px;

          &.final {
            position: relative;
            border-bottom: none;

            &::after {
              position: absolute;
              right: 16px;
              bottom: 0;
              left: 16px;
              border-bottom: 1px solid #eaebf0;
              content: '';
            }
          }
        }

      }

      .operation-box {
        display: none;
      }
    }

    .sidebar-collapse-trigger {
      position: absolute;
      top: 50%;
      right: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 100%;
      cursor: pointer;
      transform: translateY(-50%);

      &:hover {
        color: #3a84ff;
      }

      .ellipsis-icon {
        width: 14px;
        height: 18px;
      }
    }
  }

  .content-content {
    width: 100%;
    height: 100%;
    margin-top: 0;
    background-color: #f5f7fa;

    .content-tag {
      margin-left: 20px;
      font-size: 12px;
      letter-spacing: 0;
      color: #979ba5;

      .clear-tag {
        margin-left: 20px;
        color: #3a84ff;
        cursor: pointer;
      }
    }
  }
}
</style>


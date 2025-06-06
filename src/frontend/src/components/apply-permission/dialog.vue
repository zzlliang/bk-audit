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
  <bk-dialog
    class="permission-dialog"
    :close-icon="false"
    :is-show="isShow"
    width="768">
    <bk-loading :loading="loading">
      <render-result
        :data="renderPermissionResult" />
    </bk-loading>
    <template #footer>
      <bk-button
        v-if="!isApplyed"
        :disabled="renderPermissionResult.hasPermission"
        theme="primary"
        @click="handleGoApply">
        {{ t('去申请') }}
      </bk-button>
      <bk-button
        v-else
        theme="primary"
        @click="handleApplyed">
        {{ t('已申请') }}
      </bk-button>
      <bk-button
        class="ml8"
        @click="handleCancel">
        {{ t('取消') }}
      </bk-button>
    </template>
  </bk-dialog>
</template>
<script lang="ts">
  export interface CheckParams {
    action_ids: string,
    resources?: string | number
  }
</script>
<script setup lang="ts">
  import {
    Button as BkButton,
    Dialog as BkDialog,
    Loading as BkLoading,
  } from 'bkui-vue';
  import {
    computed,
    onMounted,
    ref,
  } from 'vue';
  import { useI18n } from 'vue-i18n';

  import IamManageService from '@service/iam-manage';

  import ApplyDataModel from '@model/iam/apply-data';

  import useRequest from '@hooks/use-request';

  import RenderResult from './render-result.vue';


  interface Props {
    applyData?: ApplyDataModel,
    checkParams?: CheckParams
  }
  interface Emits {
    (e: 'cancel'): void
  }
  const props = defineProps<Props>();
  const emit = defineEmits<Emits>();

  const { t } = useI18n();
  const isShow = ref(false);
  const isApplyed = ref(false);

  const {
    data: iamApplyData,
    loading,
    run,
  } = useRequest(IamManageService.getApplyData, {
    defaultValue: new ApplyDataModel(),
  });

  const renderPermissionResult = computed(() => {
    if (props.applyData) {
      return props.applyData;
    }
    return iamApplyData.value;
  });

  const handleGoApply = () => {
    isApplyed.value = true;
    window.open(renderPermissionResult.value.apply_url, '_blank');
  };

  const handleApplyed = () => {
    window.location.reload();
  };

  const handleCancel = () => {
    isShow.value = false;
    emit('cancel');
  };

  onMounted(() => {
    console.log('from onMountedonMountedonMounted = ', props);
    isShow.value = true;
    if (props.checkParams && props.checkParams.action_ids) {
      run({
        ...props.checkParams,
      });
    }
  });
</script>
<style lang="postcss">
  .permission-dialog {
    .bk-modal-header {
      display: none;
    }

    .bk-modal-wrapper {
      z-index: 9999 !important;
    }
  }
</style>

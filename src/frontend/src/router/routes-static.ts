/*
  TencentBlueKing is pleased to support the open source community by making
  蓝鲸智云 - 审计中心 (BlueKing - Audit Center) available.
*/
import type { RouteRecordRaw } from 'vue-router';

import AnalysisManage from '@views/analysis-manage/routes';
import AttentionManage from '@views/attention-manege/routes';
import EventManage from '@views/event-manage/routes';
import HandleManage from '@views/handle-manage/routes';
import LinkDataManage from '@views/link-data-manage/routes';
import NewSystemManage from '@views/new-system-manage/routes';
import NoticeGroup from '@views/notice-group/routes';
import PlatformManage from '@views/platform-manage/routes';
import ApplicationManage from '@views/process-application-manage/routes';
import ProcessedManage from '@views/processed-manage/routes';
import RiskManage from '@views/risk-manage/routes';
import RuleManage from '@views/rule-manage/routes';
import SceneResources from '@views/scene-config/routes';
import SceneRiskManage from '@views/scene-risk-manage/routes';
import StatementManage from '@views/statement-manage/routes';
import StorageManage from '@views/storage-manage/routes';
import StrategyManage from '@views/strategy-manage/routes';
import SystemManage from '@views/system-manage/routes';
import Tools from '@views/tools/routes';

export const staticChildRoutes: RouteRecordRaw[] = [
  AttentionManage,
  AnalysisManage,
  SystemManage,
  StrategyManage,
  LinkDataManage,
  EventManage,
  NoticeGroup,
  RiskManage,
  ProcessedManage,
  HandleManage,
  ApplicationManage,
  RuleManage,
  StatementManage,
  Tools,
  NewSystemManage,
  PlatformManage,
  SceneResources,
  SceneRiskManage,
];

export { StorageManage };

/*
  TencentBlueKing is pleased to support the open source community by making
  蓝鲸智云 - 审计中心 (BlueKing - Audit Center) available.
*/
import type { RouteRecordRaw } from 'vue-router';

import { staticChildRoutes } from './routes-static';

function isFederatedBuild() {
  return import.meta.env.VITE_FEDERATED_BUILD === 'true'
    || (typeof process !== 'undefined' && process.env.FEDERATED_BUILD === 'true');
}

export async function getChildRoutes(): Promise<RouteRecordRaw[]> {
  if (!isFederatedBuild()) {
    return staticChildRoutes;
  }
  const { loadFederatedChildRoutes } = await import('./routes-federated');
  return loadFederatedChildRoutes();
}

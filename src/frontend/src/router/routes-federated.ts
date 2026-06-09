/*
  TencentBlueKing is pleased to support the open source community by making
  蓝鲸智云 - 审计中心 (BlueKing - Audit Center) available.
*/
import type { RouteRecordRaw } from 'vue-router';

const REMOTE_LOADERS = [
  () => import('analysis/routes'),
  () => import('risk/routes'),
  () => import('strategy/routes'),
  () => import('system/routes'),
  () => import('tools/routes'),
  () => import('scene/routes'),
  () => import('platform/routes'),
];

function normalizeRoutes(moduleRoutes: RouteRecordRaw | RouteRecordRaw[]): RouteRecordRaw[] {
  return Array.isArray(moduleRoutes) ? moduleRoutes : [moduleRoutes];
}

export async function loadFederatedChildRoutes(): Promise<RouteRecordRaw[]> {
  const modules = await Promise.all(REMOTE_LOADERS.map(loader => loader()));
  return modules.flatMap(module => normalizeRoutes(module.default as RouteRecordRaw | RouteRecordRaw[]));
}

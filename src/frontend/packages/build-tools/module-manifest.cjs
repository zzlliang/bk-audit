/**
 * 业务模块分包清单：将 19 个 views 聚合为 7 个可独立构建的联邦模块。
 * 修改此文件后运行 `npm run generate:entries` 重新生成各包入口。
 */
module.exports = {
  analysis: {
    remoteName: 'analysis',
    views: ['analysis-manage', 'statement-manage'],
  },
  risk: {
    remoteName: 'risk',
    views: [
      'risk-manage',
      'handle-manage',
      'attention-manege',
      'processed-manage',
      'scene-risk-manage',
      'event-manage',
    ],
  },
  strategy: {
    remoteName: 'strategy',
    views: [
      'strategy-manage',
      'link-data-manage',
      'rule-manage',
      'process-application-manage',
      'notice-group',
    ],
  },
  system: {
    remoteName: 'system',
    views: ['system-manage', 'new-system-manage'],
  },
  tools: {
    remoteName: 'tools',
    views: ['tools'],
  },
  scene: {
    remoteName: 'scene',
    views: ['scene-config'],
  },
  platform: {
    remoteName: 'platform',
    views: ['platform-manage', 'storage-manage'],
  },
};

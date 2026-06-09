/**
 * Module Federation shared：vue / router / i18n / bkui 只构建一份，各子模块运行时共享。
 */
function getSharedDependencies() {
  return {
    vue: {
      singleton: true,
      eager: false,
      requiredVersion: false,
    },
    'vue-router': {
      singleton: true,
      eager: false,
      requiredVersion: false,
    },
    'vue-i18n': {
      singleton: true,
      eager: false,
      requiredVersion: false,
    },
    'bkui-vue': {
      singleton: true,
      eager: false,
      requiredVersion: false,
    },
  };
}

module.exports = {
  getSharedDependencies,
};

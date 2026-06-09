const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '../../..');
const MODULES_ROOT = path.join(FRONTEND_ROOT, 'packages/modules');
const DIST_ROOT = path.join(FRONTEND_ROOT, 'dist');

function getPaths() {
  return {
    frontendRoot: FRONTEND_ROOT,
    modulesRoot: MODULES_ROOT,
    distRoot: DIST_ROOT,
    srcRoot: path.join(FRONTEND_ROOT, 'src'),
    indexHtml: path.join(FRONTEND_ROOT, 'index.html'),
    mainEntry: path.join(FRONTEND_ROOT, 'src/main.ts'),
  };
}

function getAliases() {
  const { srcRoot, frontendRoot } = getPaths();
  return {
    '@': srcRoot,
    '@lib': path.join(frontendRoot, 'lib'),
    '@service': path.join(srcRoot, 'domain/service'),
    '@model': path.join(srcRoot, 'domain/model'),
    '@components': path.join(srcRoot, 'components'),
    '@views': path.join(srcRoot, 'views'),
    '@hooks': path.join(srcRoot, 'hooks'),
    '@directives': path.join(srcRoot, 'directives'),
    '@router': path.join(srcRoot, 'router'),
    '@utils': path.join(srcRoot, 'utils'),
    '@css': path.join(srcRoot, 'css'),
    '@language': path.join(srcRoot, 'language'),
    '@images': path.join(srcRoot, 'images'),
    vue: path.join(frontendRoot, 'node_modules/vue'),
  };
}

function getResolveOptions() {
  const { frontendRoot } = getPaths();
  return {
    extensions: ['.mjs', '.js', '.ts', '.tsx', '.vue', '.json'],
    alias: {
      ...getAliases(),
      '/static': path.join(frontendRoot, 'static'),
    },
    modules: [path.join(frontendRoot, 'node_modules'), 'node_modules'],
    mainFields: ['browser', 'module', 'main'],
  };
}

module.exports = {
  getPaths,
  getAliases,
  getResolveOptions,
};

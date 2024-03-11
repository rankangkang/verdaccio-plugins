const path = require('path');

module.exports = (conf, params) => {
  // FIXME: theme 配置仅能传递到此处，前端页面无法访问此处传入的配置
  // console.log(conf, params)
  const distPath = path.join(__dirname, 'static')
  return {
    // location of the static files, webpack output
    staticPath: distPath,
    // webpack manifest json file
    manifest: require(path.join(distPath, 'manifest.json')),
    // main manifest files to be loaded
    manifestFiles: {
      js: ['runtime.js', 'vendors.js', 'main.js'],
    },
  };
};

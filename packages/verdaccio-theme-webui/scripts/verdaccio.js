const fs = require('fs');
const path = require('path');

const yaml = require('js-yaml');
const startServer = require('verdaccio').default;

const storageLocation = path.join(__dirname, '../partials/storage');
const pluginsLocation = path.join(__dirname, '../../');
const configJsonFormat = Object.assign(
  {},
  yaml.load(fs.readFileSync(path.join(__dirname, '_verdaccio.config.yaml'), 'utf8')),
  {
    storage: storageLocation,
    plugins: pluginsLocation,
    // config_path: path.join(__dirname, "scripts")
    config_path: path.join(__dirname)
  }
);

const serverHandler = function (webServer, addr, pkgName, pkgVersion) {
  webServer.listen(addr.port || addr.path, addr.host, () => {
    console.log(`${pkgName}:${pkgVersion} running ${addr.proto}://${addr.host}:${addr.port}`);
  });

  process.on('SIGTERM', () => {
    webServer.close(() => {
      console.log('verdaccio server has been shutdown');
    });
  });
};

// https://verdaccio.org/docs/en/node-api
startServer(configJsonFormat, 8080, '', '1.0.0', 'verdaccio', serverHandler);

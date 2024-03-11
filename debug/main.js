const fs = require('fs');
const path = require('path');

const yaml = require('js-yaml');
const startServer = require('verdaccio').default;

const storageLocation = path.join(__dirname, './storage');
const pluginsLocation = path.join(__dirname, '../packages');
const configJsonFormat = Object.assign(
  {},
  yaml.load(fs.readFileSync(path.join(__dirname, 'conf/config.yaml'), 'utf8')),
  {
    storage: storageLocation,
    plugins: pluginsLocation,
    config_path: path.join(__dirname, "conf")
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
startServer(configJsonFormat, 8081, '', '1.0.0', 'verdaccio', serverHandler);

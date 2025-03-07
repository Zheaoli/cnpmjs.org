'use strict';

var mkdirp = require('mkdirp');
var copy = require('copy-to');
var path = require('path');
var fs = require('fs');
var os = require('os');
var utility = require('utility');

var version = require('../package.json').version;
var Nfs = require('fs-cnpm');
var root = path.dirname(__dirname);
var dataDir = path.join(process.env.HOME || root, '.cnpmjs.org');

var config = {
  version: version,
  dataDir: dataDir,

  /**
   * Cluster mode
   */
  enableCluster: false,
  numCPUs: os.cpus().length,

  /*
   * server configure
   */

  registryPort: 7001,
  webPort: 7002,
  bindingHost: '127.0.0.1', // only binding on 127.0.0.1 for local access
  // default is ctx.protocol
  protocol: '',
  // When sync package, cnpm not know the access protocol.
  // So should set manually
  backupProtocol: 'http',

  // debug mode
  // if in debug mode, some middleware like limit wont load
  // logger module will print to stdout
  debug: process.env.NODE_ENV === 'development',
  // page mode, enable on development env
  pagemock: process.env.NODE_ENV === 'development',
  // session secret
  sessionSecret: 'cnpmjs.org test session secret',
  // max request json body size
  jsonLimit: '10mb',
  // log dir name
  logdir: path.join(dataDir, 'logs'),
  // update file template dir
  uploadDir: path.join(dataDir, 'downloads'),
  // web page viewCache
  viewCache: false,

  // registry http response cache control header
  // if you are using CDN, can set it to 'max-age=0, s-maxage=10, must-revalidate'
  // it meaning cache 10s on CDN server and no cache on client side.
  registryCacheControlHeader: '',
  // if you are using CDN, can set it to 'Accept, Accept-Encoding'
  registryVaryHeader: '',
  // disable package search
  disableSearch: false,

  // view files directory
  viewDir: path.join(root, 'view', 'web'),

  customRegistryMiddlewares: [],
  customWebMiddlewares: [],

  // config for koa-limit middleware
  // for limit download rates
  limit: {
    enable: false,
    token: 'koa-limit:download',
    limit: 1000,
    interval: 1000 * 60 * 60 * 24,
    whiteList: [],
    blackList: [],
    message: 'request frequency limited, any question, please contact fengmk2@gmail.com',
  },

  enableCompress: false, // enable gzip response or not

  // default system admins
  admins: {
    // name: email
    fengmk2: 'fengmk2@gmail.com',
    admin: 'admin@cnpmjs.org',
    dead_horse: 'dead_horse@qq.com',
  },

  // email notification for errors
  // check https://github.com/andris9/Nodemailer for more informations
  mail: {
    enable: false,
    appname: 'cnpmjs.org',
    from: 'cnpmjs.org mail sender <adderss@gmail.com>',
    service: 'gmail',
    auth: {
      user: 'address@gmail.com',
      pass: 'your password'
    }
  },

  logoURL: 'https://os.alipayobjects.com/rmsportal/oygxuIUkkrRccUz.jpg', // cnpm logo image url
  adBanner: '',
  customHeader: '',
  customReadmeFile: '', // you can use your custom readme file instead the cnpm one
  customFooter: '', // you can add copyright and site total script html here
  npmClientName: 'cnpm', // use `${name} install package`

  // max handle number of package.json `dependencies` property
  maxDependencies: 200,

  /**
   * database config
   */

  database: {
    db: 'cnpmjs_test',
    username: 'root',
    password: '',

    // the sql dialect of the database
    // - currently supported: 'mysql', 'sqlite', 'postgres', 'mariadb'
    dialect: 'sqlite',

    // custom host; default: 127.0.0.1
    host: '127.0.0.1',

    // custom port; default: 3306
    port: 3306,

    // use pooling in order to reduce db connection overload and to increase speed
    // currently only for mysql and postgresql (since v1.5.0)
    pool: {
      maxConnections: 10,
      minConnections: 0,
      maxIdleTime: 30000
    },

    dialectOptions: {
      // if your server run on full cpu load, please set trace to false
      trace: true,
    },

    // the storage engine for 'sqlite'
    // default store into ~/.cnpmjs.org/data.sqlite
    storage: path.join(dataDir, 'data.sqlite'),

    logging: !!process.env.SQL_DEBUG,
  },

  // return total modules and versions, default is true
  // it will use `SELECT count(DISTINCT name) FROM module` SQL on Database
  enableTotalCount: true,

  // enable proxy npm audits request or not
  enableNpmAuditsProxy: true,

  // package tarball store in local filesystem by default
  nfs: new Nfs({
    dir: path.join(dataDir, 'nfs')
  }),
  // if set true, will 302 redirect to `nfs.url(dist.key)`
  downloadRedirectToNFS: false,
  // don't check database and just download tgz from nfs
  downloadTgzDontCheckModule: false,
  // remove original tarball when publishing
  unpublishRemoveTarball: true,

  // registry url name
  registryHost: 'r.cnpmjs.org',

  /**
   * registry mode config
   */

  // enable private mode or not
  // private mode: only admins can publish, other users just can sync package from source npm
  // public mode: all users can publish
  enablePrivate: false,

  // registry scopes, if don't set, means do not support scopes
  scopes: [ '@cnpm', '@cnpmtest', '@cnpm-test' ],

  // some registry already have some private packages in global scope
  // but we want to treat them as scoped private packages,
  // so you can use this white list.
  privatePackages: [],

  /**
   * sync configs
   */

  // the official npm registry
  // cnpm wont directly sync from this one
  // but sometimes will request it for some package infomations
  // please don't change it if not necessary
  officialNpmRegistry: 'https://registry.npmjs.com',
  officialNpmReplicate: 'https://replicate.npmjs.com',
  cnpmRegistry: 'https://r.cnpmjs.com',

  // sync source, upstream registry
  // If you want to directly sync from official npm's registry
  // please drop them an email first
  sourceNpmRegistry: 'https://registry.npmmirror.com',
  sourceNpmWeb: 'https://npmmirror.com',

  // set remote registry to show web page data
  enableWebDataRemoteRegistry: false,
  webDataRemoteRegistry: '',

  // upstream registry is base on cnpm/cnpmjs.org or not
  // if your upstream is official npm registry, please turn it off
  sourceNpmRegistryIsCNpm: true,

  // if install return 404, try to sync from source registry
  syncByInstall: true,

  // sync mode select
  // none: do not sync any module, proxy all public modules from sourceNpmRegistry
  // exist: only sync exist modules
  // all: sync all modules
  syncModel: 'none', // 'none', 'all', 'exist'
  // sync package.json/dist-tag.json to sync dir
  syncBackupFiles: false,

  syncConcurrency: 1,
  // sync interval, default is 10 minutes
  syncInterval: '10m',

  // sync polular modules, default to false
  // because cnpm can't auto sync tag change for now
  // so we want to sync popular modules to ensure their tags
  syncPopular: false,
  syncPopularInterval: '1h',
  // top 100
  topPopular: 100,

  // sync devDependencies or not, default is false
  syncDevDependencies: false,
  // try to remove all deleted versions from original registry
  syncDeletedVersions: true,

  // changes streaming sync
  syncChangesStream: false,
  syncDownloadOptions: {
    // formatRedirectUrl: function (url, location)
  },

  // all syncModel cannot sync scope pacakge, you can use this model to sync scope package from any resgitry
  syncScope: false,
  syncScopeInterval: '12h',
  // scope package sync config
  /**
 * sync scope package from assign registry
 * @param {Array<scope>} scopes
 * @param {String} scope.scope scope name
 * @param {String} scope.sourceCnpmWeb source cnpm registry web url for get scope all packages name
 * @param {String} scope.sourceCnpmRegistry source cnpm registry url for sync packages
 */
  syncScopeConfig: [],

  handleSyncRegistry: 'http://127.0.0.1:7001',

  // default badge subject
  badgeSubject: 'cnpm',
  // defautl use https://badgen.net/
  badgeService: {
    url: function(subject, status, options) {
      options = options || {};
      let url = `https://badgen.net/badge/${utility.encodeURIComponent(subject)}/${utility.encodeURIComponent(status)}`;
      if (options.color) {
        url += `/${utility.encodeURIComponent(options.color)}`;
      }
      if (options.icon) {
        url += `?icon=${utility.encodeURIComponent(options.icon)}`;
      }
      return url;
    },
  },

  packagephobiaURL: 'https://packagephobia.now.sh',
  packagephobiaSupportPrivatePackage: false,
  packagephobiaMinDownloadCount: 1000,

  // custom user service, @see https://github.com/cnpm/cnpmjs.org/wiki/Use-Your-Own-User-Authorization
  // when you not intend to ingegrate with your company's user system, then use null, it would
  // use the default cnpm user system
  userService: null,

  // always-auth https://docs.npmjs.com/misc/config#always-auth
  // Force npm to always require authentication when accessing the registry, even for GET requests.
  alwaysAuth: false,

  // if you're behind firewall, need to request through http proxy, please set this
  // e.g.: `httpProxy: 'http://proxy.mycompany.com:8080'`
  httpProxy: null,

  // snyk.io root url
  snykUrl: 'https://snyk.io',

  // https://github.com/cnpm/cnpmjs.org/issues/1149
  // if enable this option, must create module_abbreviated and package_readme table in database
  enableAbbreviatedMetadata: false,

  // enable package or package version block list, must create package_version_blocklist table in database
  enableBlockPackageVersion: false,

  // enable bug version hotfix by https://github.com/cnpm/bug-versions
  enableBugVersion: false,

  // global hook function: function* (envelope) {}
  // envelope format please see https://github.com/npm/registry/blob/master/docs/hooks/hooks-payload.md#payload
  globalHook: null,

  opensearch: {
    host: '',
  },

  // redis cache
  redisCache: {
    enable: false,
    connectOptions: null,
  },

  // custom format full package list
  // change `GET /:name` request response body
  // use on `controllers/registry/list.js`
  formatCustomFullPackageInfoAndVersions: (ctx, packageInfo) => {
    return packageInfo;
  },
  // custom format one package version
  // change `GET /:name/:version` request response body
  // use on `controllers/registry/show.js`
  formatCustomOnePackageVersion: (ctx, packageVersion) => {
    return packageVersion;
  },
  // registry download accelerate map
  accelerateHostMap: {},
};

if (process.env.NODE_ENV === 'test') {
  config.enableAbbreviatedMetadata = true;
  config.customRegistryMiddlewares.push((app) => {
    return function* (next) {
      this.set('x-custom-middleware', 'true');
      this.set('x-custom-app-models', typeof app.models.query === 'function' ? 'true' : 'false');
      yield next;
    };
  });

  config.customWebMiddlewares.push((app) => {
    return function* (next) {
      this.set('x-custom-web-middleware', 'true');
      this.set('x-custom-web-app-models', typeof app.models.query === 'function' ? 'true' : 'false');
      yield next;
    };
  });

  config.enableBlockPackageVersion = true;
  config.enableBugVersion = true;
}

if (process.env.NODE_ENV !== 'test') {
  var customConfig;
  if (process.env.NODE_ENV === 'development') {
    customConfig = path.join(root, 'config', 'config.js');
  } else {
    // 1. try to load `$dataDir/config.json` first, not exists then goto 2.
    // 2. load config/config.js, everything in config.js will cover the same key in index.js
    customConfig = path.join(dataDir, 'config.json');
    if (!fs.existsSync(customConfig)) {
      customConfig = path.join(root, 'config', 'config.js');
    }
  }
  if (fs.existsSync(customConfig)) {
    copy(require(customConfig)).override(config);
  }
}

mkdirp.sync(config.logdir);
mkdirp.sync(config.uploadDir);

module.exports = config;

config.loadConfig = function (customConfig) {
  if (!customConfig) {
    return;
  }
  copy(customConfig).override(config);
};

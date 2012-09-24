var http = require('http'),
    zlib = require('zlib');

function Zinc(host) {
  this.host = host;
  this.catalogs = {};
  this.cache = {};
}

exports = module.exports = Zinc;

Zinc.prototype.url = function (catalog, path) {
  return 'http://' + this.host + '/' + catalog + '/' + path;
}

Zinc.prototype.manifestPath = function (bundle, version) {
  return 'manifests/'+bundle+'-'+version+'.json.gz';
}

Zinc.prototype.manifest = function (catalog, bundle, version) {
  return this.catalogs[catalog].manifests[version ? this.manifestPath(bundle,version) : bundle];
}

Zinc.prototype.file = function (catalog, bundle, version, file) {
  var man = this.manifest(catalog, bundle, version);
  return man.files[file] || man.files[file.split('/').pop()]; // chop off path if it's not keyed with it 
}

Zinc.prototype.filePath = function (catalog, bundle, version, file) {
  var fileObj = this.file(catalog, bundle, version, file),
      sha = fileObj.sha,
      fmt = Object.keys(fileObj.formats).pop();
  return 'objects/' + sha.slice(0,2) + '/' + sha.slice(2,4) + '/' + sha + (fmt != 'raw' ? '.' + fmt : '');
}

Zinc.prototype.origFile = function (catalog, bundle, version, file) {
  return this.url(catalog, this.filePath(catalog, bundle, version, file));
}

Zinc.prototype.get = function (catalog, path, callback) {
  return http.get(this.url(catalog, path), function (resp) {
    var bufs = [];
    resp.on('data', function (chunk) {
      bufs.push(chunk);
    });

    resp.on('end', function(){
      bufs = Buffer.concat(bufs);
      if (path.split('.').pop() == 'gz') {
        zlib.unzip(bufs, function(err, data){
          if (err) console.error(err);
          callback(data);
        });
      } else {
        callback(bufs);
      }
    });
  }).on('error', function (e) {
    console.error(e);
  });
}

Zinc.prototype.getCatalog = function (catalog, callback) {
  var _this = this;
  return this.get(catalog, 'index.json.gz', function (data) {
    _this.catalogs[catalog] = JSON.parse(data);
    callback();
  });
}

// The manifest is an index of files in the bundle
Zinc.prototype.getManifest = function (catalog, bundle, version, callback) {
  var _this = this,
      args = arguments;
  if (!this.catalogs[catalog]) {
    return this.getCatalog(catalog, function () { _this.getManifest.apply(_this, args) });
  }

  var bundle_meta = this.catalogs[catalog].bundles[bundle],
      latest = bundle_meta.versions.slice(-1)[0];

  manifest = this.manifestPath(bundle, version || latest);

  return this.get(catalog, manifest, function (data) {
    var mans = _this.catalogs[catalog].manifests || (_this.catalogs[catalog].manifests = {});
    // old versions get keyed with full path of the manifest,
    // the latest is just the bundle name
    mans[version ? manifest : bundle] = JSON.parse(data);
    callback();
  });
}

Zinc.prototype.getFile = function (catalog, bundle, version, file, callback) {
  var _this = this,
      path = this.filePath(catalog, bundle, version, file),
      fileObj = this.file(catalog, bundle, version, file);

  if (this.cache[path]) return callback(this.cache[path]);
  
  this.get(catalog, path, function (data) {
    _this.cache[path] = data;
    callback(data);
  });
}

Zinc.prototype.reset = function () {
  this.cache = {};
  return this.catalogs = {};
}

// ------
// MiddleWare generators
// ------
Zinc.prototype.ensureCatalog = function () {
  var _this = this,
      t;
  return function(req, res, next) {
    var cat = req.params.catalog;
    if (!cat) console.error('No catalog');

    if (!_this.catalogs[cat]) {
      _this.getCatalog(cat, next);
    } else {
      next();
    }

    // blow out cache if we don't get hit for a while
    clearTimeout(t);
    t = setTimeout(function () {
      _this.reset();
    }, 3 * 60 * 1000);
  }
}

Zinc.prototype.ensureManifest = function () {
  var _this = this;
  return function(req, res, next) {
    var cat = req.params.catalog,
        bun = req.params.bundle,
        vrsn = req.params.version;
    if (!cat || !bun) console.error('Bad bundle');

    if (!_this.catalogs[cat] || !_this.catalogs[cat].manifests || !_this.manifest(cat,bun,vrsn)) {
      _this.getManifest(cat, bun, vrsn, next);
    } else {
      next();
    }
  }
}

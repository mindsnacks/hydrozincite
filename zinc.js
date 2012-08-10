var http = require('http'),
    zlib = require('zlib');

function Zinc(host) {
  this.host = host;
  this.catalogs = {};
}

exports = module.exports = Zinc;

Zinc.prototype.url = function (catalog, path) {
  return 'http://' + this.host + '/' + catalog + '/' + path;
}

Zinc.prototype.manifest = function (bundle, version) {
  return 'manifests/'+bundle+'-'+version+'.json.gz';
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
Zinc.prototype.getManifest = function (catalog, bundle, callback) {
  var _this = this,
      args = arguments;
  if (!this.catalogs[catalog]) {
    return this.getCatalog(catalog, function () { _this.getManifest.apply(_this, args) });
  }

  var bundle_meta = this.catalogs[catalog].bundles[bundle],
      latest = bundle_meta.versions.slice(-1)[0];

  return this.get(catalog, this.manifest(bundle,latest), function (data) {
    var mans = _this.catalogs[catalog].manifests = {};
    mans[bundle] = JSON.parse(data);
    callback();
  });
}

Zinc.prototype.filePath = function (sha, fmt) {
  return 'objects/' + sha.slice(0,2) + '/' + sha.slice(2,4) + '/' + sha + '.' + fmt;
}

Zinc.prototype.getFile = function (catalog, bundle, file, callback) {
  var man = this.catalogs[catalog].manifests[bundle],
      path = this.filePath(man.files[file].sha, Object.keys(man.files[file].formats).pop());

  if (man.files[file].cached) return callback(man.files[file].cached);
  
  this.get(catalog, path, function (data) {
    man.files[file].cached = data;
    callback(data);
  });
}

// ------
// MiddleWare generators
// ------
Zinc.prototype.ensureCatalog = function () {
  var _this = this;
  return function(req, res, next) {
    var cat = req.params.catalog;
    if (!cat) console.error('No catalog');

    if (!_this.catalogs[cat]) {
      _this.getCatalog(cat, next);
    } else {
      next();
    }
  }
}

Zinc.prototype.ensureManifest = function () {
  var _this = this;
  return function(req, res, next) {
    var cat = req.params.catalog,
        bun = req.params.bundle;
    if (!cat || !bun) console.error('Bad bundle');

    if (!_this.catalogs || !_this.catalogs[cat] || !_this.catalogs[cat].manifests || !_this.catalogs[cat].manifests[bun]) {
      _this.getManifest(cat, bun, next);
    } else {
      next();
    }
  }
}

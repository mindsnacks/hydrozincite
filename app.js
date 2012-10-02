
/**
 * Module dependencies.
 */

var express = require('express')
  , connect = require('connect')
  , params = require('express-params')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , Zinc = require('./zinc')
  , _ = require('lodash');


try {
  var config = require('./config');
} catch (e) {
  console.log('config.js not found. See: config.js.sample for an example');
}

var admin_username = process.env.ADMIN_USERNAME || config.admin_username,
    admin_password = process.env.ADMIN_PASSWORD || config.admin_password,
    zinc_host = process.env.ZINC_HOST || config.repo_host,
    default_catalog = process.env.DEFAULT_CATALOG || config.default_catalog;

var app = express();
params.extend(app);

app.configure(function(){
  app.set('port', process.env.PORT || 5000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(connect.compress({ filter: function(){return 1} }));

  app.set('json spaces', 0);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


var zinc = new Zinc(zinc_host)
  , auth = express.basicAuth(function (username, password) {
    return process.env.ADMIN_USERNAME === username & process.env.ADMIN_PASSWORD === password;
  });

app.all('/*', function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    next();
})
app.get('/*', function (req, res, next) {
  // hack to force json format
  if (req.query.format == 'json') {
    req.accepts = function (type) {
      return "json";
    }
  }
  next();
});

app.get('/', function(req, res){
  res.render('index', { 
    title: 'Hydrozincite - ' + zinc_host,
    default_catalog: default_catalog
  });
});

app.param('catalog', /\w+\.[\w.]+/);
app.param('bundle', /[\w-]+/);
app.param('version', /[0-9]+/);

app.get('/:catalog', zinc.ensureCatalog(), function(req, res) {
  catalog = req.params.catalog;
  res.format({
    html: function(){
      var vars = {
        title: 'Bundles for ' + catalog,
        data: zinc.catalogs[catalog]
      }
      res.render('catalog', vars);
    },
    
    json: function(){
      res.json(_(zinc.catalogs[catalog]).omit("manifests"));
    }
  });
});

var returnManifest = [zinc.ensureManifest(), function (req, res) {
  var catalog = req.params.catalog,
      bundle = req.params.bundle,
      version = req.params.version;
  res.format({
    html: function(){
      var vars = { 
        title: 'Files in bundle: ',
        data: zinc.manifest(catalog, bundle, version),
        bundle: bundle,
        catalog: req.params.catalog,
        zinc: zinc,
        version: version
      }
      res.render('bundle', vars);
    },

    json: function(){
      res.json(zinc.manifest(catalog, bundle, version));
    }
  });
}];
app.get('/:catalog/:bundle.:version', returnManifest);

app.get('/:catalog/:bundle', returnManifest);

 var returnFile = [zinc.ensureManifest(), function(req, res) {
  var file = req.params[0], 
      type = file.split('.').pop();
  zinc.getFile(req.params.catalog, req.params.bundle, req.params.version, file, function (data) {
    res.attachment(file);
    res.send(data);
  });
}];
app.get('/:catalog/:bundle.:version/*', returnFile);
app.get('/:catalog/:bundle/*', returnFile);

app.all('/*', auth);

app.get('/admin/reset', function (req, res) {
  zinc.reset();
  res.send('Cache reset!');
});
app.get('/admin/settings', function (req, res) {
  loadSettings(req.query);
  res.send('OK!');
});
function loadSettings(settings) {
  for (key in settings) {
    app.set('settings ' + key, settings[key]);
  }
}

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

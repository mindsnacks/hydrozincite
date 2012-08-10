
/**
 * Module dependencies.
 */

var express = require('express')
  , params = require('express-params')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , Zinc = require('./zinc')
  , auth = express.basicAuth('mindsnacks', 'nicksdamns');

var app = express();
params.extend(app);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var zinc = new Zinc('mindsnacks-zinc.s3.amazonaws.com');

app.get('/', routes.index);

app.param('catalog', /\w+\.[\w.]+/);
app.param('bundle', /[0-9a-z-]+/);

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
      res.json(zinc.catalogs[catalog]);
    }
  });
});

app.get('/:catalog/:bundle', zinc.ensureManifest(), function(req, res) {
  var catalog = req.params.catalog,
      bundle = req.params.bundle;
      console.log(req.accepted)
  res.format({
    html: function(){
      var vars = {
        title: 'Files for ' + bundle,
        data: zinc.catalogs[catalog].manifests[bundle],
        bundle: bundle,
        catalog: req.params.catalog
      }
      res.render('bundle', vars);
    },

    json: function(){
      res.json(zinc.catalogs[catalog].manifests[req.params.manifest]);
    }
  });
});

app.get('/:catalog/:bundle/*', zinc.ensureManifest(), function(req, res) {
  var file = req.params[0],
      type = file.split('.').pop();
  zinc.getFile(req.params.catalog, req.params.bundle, file, function (data) {
    res.attachment(file);
    res.send(data);
  });
});

app.all('/admin/*', auth);
app.get('/admin/settings', function (req, res) {
  loadSettings(req.query);
  res.send('OK!');
});
app.get('/admin/reset', function (req, res) {
  zinc.reset();
  res.send('Cache reset!');
});
function loadSettings(settings) {
  for (key in settings) {
    app.set('settings ' + key, settings[key]);
  }
}

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

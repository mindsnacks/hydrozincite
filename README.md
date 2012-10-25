Hydrozincite
=============

A simple web interface for accessing assets stored in [Zinc](https://github.com/mindsnacks/zinc). It also serves a simple caching layer.

### Installation

Requires node and npm. To load the dependencies, do

    $ npm install

in the project directory.

### Configuration

Copy the sample file

    $ cp config.js.sample config.js

Edit it to look something like this

    exports = module.exports = {
        admin_username: 'admin',
        admin_password: 'password',
        zinc_host: 'my-zinc.amazonaws.com',
        default_catalog: 'com.mycorp.assets'
    }

Alternatively, set environment vars. Same names but all caps. These make configuring a Heroku deploy easier.

    $ export ADMIN_USERNAME=admin
    $ export ADMIN_PASSWORD=pass
    $ export ZINC_HOST=my-zinc.amazonaws.com
    $ export DEFAULT_CATALOG=com.mycorp.assets

Config explanations:
- `admin_username/admin_password`: Used for Basic Auth on the asset browser and indexes.
- `zinc_host`: The remote domain where the Zinc repo is stored (HTTP only)
- `default_catalog`: A convenience var for pre-filling the root index catalog chooser

### Running

    node server.js

Open a browser to http://localhost:5000
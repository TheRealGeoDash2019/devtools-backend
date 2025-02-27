DevTools Backend
================

A Node.JS implementation of the Chrome DevTools backend for debugging arbitrary web platforms (e.g. HbbTV applications on Smart TVs). It is the counterpart of the [devtools-frontend](https://github.com/ChromeDevTools/devtools-frontend) and is like [weinre](https://people.apache.org/~pmuellr/weinre/docs/latest/Home.html) just in "new".

# Requirements

- [Node.js](https://nodejs.org/en/) (v16.0.0)
- [NPM](https://www.npmjs.com/) (v8.0.0 or higher)

# Installation

To run the server you need to first clone the repo and install all its dependencies:

```sh
# clone repository
$ git clone https://github.com/TheRealGeoDash2019/devtools-backend.git
$ cd devtools-backend
# install dependencies
$ npm install
# build project
$ npm run build
```

Then start the server by executing:

```sh
$ npm run start
```

You now have started the server on `localhost:9222`. You can see a list of inspectable pages on http://localhost:9222 (also available as [json](http://localhost:9222/json)).

# Instrument Your Web Application

The DevTools Backend allows you to instrument your app in two different ways. You can either inject a script manually into your app or use the proxy to automate the injection.

## Manual Script Injection

To manually inject a script put the following script tag at the top of your page:

```html
<script src="http://localhost:9222/scripts/launcher.js" data-origin="debugger"></script>
```

Once you open a page with a web client (like a browser) it should register your page and it should then be inspectable.

## Proxy Script Injection

If your web client supports proxy settings you can also use the DevTools backend as HTTP proxy (note that this only works for pages served via http on port 80). Per default the server starts with the hostname of the machine it runs on. For example if you run the project on localhost and setup Firefox to proxy request to `localhost:9222` it would allow to debug the Firefox browser with the DevTools application.

![Firefox Demo](/docs/assets/demo.gif)

## Logging

For debugging purposes you can set a logging path as environment variable and the DevTools Proxy will dump all log messages to multiple files within this directory. To set a logging directory just export `LOGGING_PATH`:

```sh
export LOGGING_PATH=/home/user/logs
# or start the server with that environment variable set
LOGGING_PATH=/home/user/logs npm run start
```

## Development

To recompile files automatically run:

```sh
$ npm run dev
```

After files are recompiled you need to restart the server. This can be triggered automatically when running it in "dev" mode:

```sh
$ npm run start:dev
```

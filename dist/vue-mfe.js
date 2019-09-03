/*!
  * vue-mfe v1.0.4
  * (c) 2019 Vuchan
  * @license MIT
  */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('vue-router')) :
	typeof define === 'function' && define.amd ? define(['vue-router'], factory) :
	(global.VueMfe = factory(global.VueRouter));
}(this, (function (VueRouter) { 'use strict';

VueRouter = VueRouter && VueRouter.hasOwnProperty('default') ? VueRouter['default'] : VueRouter;

var isDev = "development" === 'development';

var noop = function () {};

var isArray = function (arr) { return Array.isArray(arr); };

var isFunction = function (fn) { return fn && typeof fn === 'function'; };

var isObject = function (obj) { return obj && typeof obj === 'object'; };

var isString = function (str) { return typeof str === 'string'; };

var toArray = function (args) { return Array.prototype.slice.call(args); };

var hasConsole =
  // eslint-disable-next-line
  typeof console !== 'undefined' && typeof console.warn === 'function';

function assert(condition, onSuccess, onFailure) {
  if (condition) {
    return isFunction(onSuccess) && onSuccess()
  } else {
    return isFunction(onFailure) && onFailure()
  }
}

var getLogger = function (key) { return function (args) {
  return assert(
    isDev,
    // eslint-disable-next-line
    function () { return hasConsole &&
      console.log.apply(null, key ? [key ].concat( toArray(args)) : args); },
    noop
  )
}; };

var getWarning = function (key) { return function (args) {
  var throwError = function (err) {
    throw new Error(err)
  };

  // eslint-disable-next-line
  var fn = isDev ? throwError : hasConsole ? console.warn : noop;

  return assert(true, function () {
    fn.apply(null, key ? [[key ].concat( toArray(args)).join(' > ')] : args);
  })
}; };

/**
 * @description resolve module whether ES Module or CommandJS module
 * @template Module
 * @property {Object} [default]
 * @param {Module & Object} module
 * @returns {*}
 */
var resolveModule = function (module) { return (module && module.default) || module; };

/**
 * getPropVal
 * @param {Object} obj
 * @param {string} key
 */
var getPropVal = function (obj, key) {
  return key.split('.').reduce(function (o, k) {
    return o[k]
  }, obj)
};

/**
 * getPrefixAppName
 * @param {string} str
 * @param {string} delimiter
 */
var getPrefixAppName = function (str, delimiter) { return str
    .split(delimiter || '.')
    .filter(Boolean)
    .map(function (s) { return s.trim(); })
    .shift(); };

/**
 * @description execute an array of promises serially
 * @template T
 * @param {Array<Promise<T>>} promises
 * @returns {Promise<T>} the finally result of promises
 */
var serialExecute = function (promises) {
  return promises.reduce(function (chain, next) {
    return (
      chain
        // @ts-ignore
        .then(function (retVal) { return next(retVal); })
        .catch(function (err) {
          throw err
        })
    )
  }, Promise.resolve())
};

/**
 * @class Observer
 * @author VuChan
 * @constructor
 * @see https://github.com/vuchan/fe-utils/blob/master/helpers/Obersver.js
 * @return {Object} Observer Design Pattern Implementation
 */
function Observer() {
  this.events = {};
}

/**
 * observer.on('eventName', function listener() {})
 * @param  {string} eventName
 * @param  {Function} listener
 * @return {Array<Function>}
 */
Observer.prototype.on = function(eventName, listener) {
  if (!this.events[eventName]) {
    this.events[eventName] = [ listener ];
  } else {
    this.events[eventName].push(listener);
  }

  return this.events[eventName];
};

/**
 * observer.off('eventName', function listener() {})
 * @param  {string} eventName
 * @param  {Function} listener
 * @return {boolean|null}
 */
Observer.prototype.off = function(eventName, listener) {
  if (eventName) {
    var handlers = this.events[eventName];

    if (handlers && handlers.length) {
      if (listener) {
        return (handlers = handlers.filter(function (handler) { return handler === listener; }));
      } else {
        delete this.events[eventName];
        return true;
      }
    }
  } else {
    this.events = {};
  }
};

/**
 * observer.emit('eventName', data1, data2, ...dataN)
 * @param  {string} eventName
 * @param  {Array}  data
 * @return {boolean}
 */
Observer.prototype.emit = function(eventName) {
  var data = [], len = arguments.length - 1;
  while ( len-- > 0 ) data[ len ] = arguments[ len + 1 ];

  var handlers = this.events[eventName];

  if (handlers) {
    handlers.forEach(function (handler) { return handler.apply(null, data); });
    return true;
  }
};

/**
 * @description lazy load style from a remote url then returns a promise
 * @param {String} url remote-url
 * @return {Promise}
 */
function lazyloadStyle(url) {
  var link = document.createElement('link');

  link.type = 'text/css';
  link.rel = 'stylesheet';
  link.charset = 'utf-8';
  link.href = url;
  link.setAttribute('force', false);

  return new Promise(function (resolve, reject) {
    var timerId = setTimeout(function () { return clearState(true); }, 1.2e4);

    function clearState(isError) {
      clearTimeout(timerId);
      link.onerror = link.onload = link.onreadystatechange = null; // 同时检查两种状态，只要有一种触发就删除事件处理器，避免触发两次

      isError && link && remove(link);
    }

    link.onload = function() {
      clearState();
      resolve.apply(void 0, arguments);
    };

    link.onerror = function() {
      clearState(true);
      reject.apply(void 0, arguments);
    };

    document.head.appendChild(link);
  })
}

/**
 * @description lazy load script from a remote url then returns a promise
 * @param {String} url remote-url
 * @param {String} globalVar global variable key
 * @return {Promise}
 */
function lazyLoadScript(url, globalVar) {
  var script = document.createElement('script');

  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.src = url;
  script.async = true;
  script.setAttribute('nonce', 'nonce');

  return new Promise(function (resolve, reject) {
    var timerId = setTimeout(
      function () { return onLoadFailed(("Reject script " + url + ": LOAD_SCRIPT_TIMEOUT")); },
      1.2e4
    );

    function clearState() {
      clearTimeout(timerId);
      script.onerror = script.onload = script.onreadystatechange = null; // 同时检查两种状态，只要有一种触发就删除事件处理器，避免触发两次
      remove(script);
    }

    function onLoadSuccess() {
      var i = arguments.length, argsArray = Array(i);
      while ( i-- ) argsArray[i] = arguments[i];

      clearState();
      resolve.apply(void 0, [ globalVar ? window[globalVar] : undefined ].concat( argsArray ));
    }

    function onLoadFailed() {
      clearState();
      reject.apply(void 0, arguments);
    }

    if (script.readyState !== undefined) {
      // IE
      script.onreadystatechange = function change(evt) {
        if (
          (script.readyState === 'loaded' ||
            script.readyState === 'complete') &&
          (globalVar ? window[globalVar] : true)
        ) {
          onLoadSuccess();
        } else {
          onLoadFailed('Unknown error happened', evt);
        }
      };
    } else {
      // Others
      script.onload = onLoadSuccess;
      script.onerror = function error(evt) {
        onLoadFailed(("GET " + url + " net::ERR_CONNECTION_REFUSED"), evt);
      };
    }

    document.body.appendChild(script);
  })
}

/**
 * https://stackoverflow.com/questions/20428877/javascript-remove-doesnt-work-in-ie
 * IE doesn't support remove() native Javascript function but does support removeChild().
 * remove
 * @param {HTMLElement} ele
 */
function remove(ele) {
  if (ele && ele instanceof HTMLElement) {
    if (typeof ele.remove === 'function') {
      ele.remove();
    } else {
      ele.parentNode.removeChild(ele);
    }
  }
}

/**
 * @class Lazyloader
 * @description only focus on load resource from `config.getResource()`.
 */
var Lazyloader = function Lazyloader() {
  /** @type {{}} */
  this.cached = {};
};

Lazyloader.log = function log () {
  return getLogger('VueMfe.' + Lazyloader.name)(arguments)
};

Lazyloader.warn = function warn () {
  return getWarning('VueMfe.' + Lazyloader.name)(arguments)
};

Lazyloader.prototype.load = function load (ref) {
    var this$1 = this;
    var name = ref.name;

  return this.getRouteEntry(name).then(function (url) {
    var resource = isFunction(url) ? url() : url;
    Lazyloader.log(("start to load " + name + " resources:"), resource);

    return isDev && isObject(resource) && !isArray(resource)
      ? resource /* if local import('url') */
      : this$1.installResources(
          (isArray(resource) ? resource : [resource]).filter(Boolean),
          this$1.getName(name)
        )
  })
};

Lazyloader.prototype.getRouteEntry = function getRouteEntry (name) {
    var this$1 = this;

  var cache = this.cached[name];

  if (cache) {
    return Promise.resolve(cache)
  } else {
    return Promise.resolve(this.getResource(name)).then(function (data) {
        if ( data === void 0 ) data = {};

      this$1.cached = Object.assign({}, this$1.cached, data);

      if (data[name]) {
        return data[name]
      } else {
        Lazyloader.log('all resources', JSON.stringify(data));
        Lazyloader.warn(
          ("The App '" + name + "' cannot be found in method 'config.getResource()'")
        );
      }
    })
  }
};

/**
 * installResources
 * @description install JS/CSS resources
 * @typedef {string} Link
 * @param {Array<Link>} urls
 * @param {string} name
 */
Lazyloader.prototype.installResources = function installResources (urls, name) {
  var allCss = urls.filter(function (url) { return url.endsWith('.css'); });
  var scripts = urls.filter(function (url) { return url.endsWith('.js'); });

  if (isArray(allCss) && allCss.length) {
    Promise.all(allCss.map(function (css) { return lazyloadStyle(css); })).catch(function (error) { return Lazyloader.warn(error); }
    );
  }

  if (isArray(scripts) && scripts.length) {
    return serialExecute(
      // @ts-ignore
      scripts.map(function (script) { return function () { return lazyLoadScript(script, name); }; })
    ).catch(function (error) {
      throw error
    })
  } else {
    Lazyloader.warn(("no any valid entry script be found in " + urls));
  }
};

Lazyloader.prototype.getResource = function getResource (name) {
  return this.getConfig(name).getResource()
};

Lazyloader.prototype.getName = function getName (name) {
  return this.getConfig(name).getNamespace(name)
};

Lazyloader.prototype.getConfig = function getConfig (name) {
    if ( name === void 0 ) name = '*';

  return this.configs[name] || this.configs['*']
};

Lazyloader.prototype.setConfig = function setConfig (name, config) {
  if (isObject(name)) {
    config = name;
    name = '*';
  }

  if (!this.configs) {
    this.configs = {};
  }

  this.configs[name] = config;

  return this
};

/**
 * findRoute 深度优先递归遍历找到匹配 matchPath 的 Route
 * @typedef {import('vue-router').RouteConfig} Route
 * @param {Array<Route>} routes
 * @param {String} matchPath
 * @returns {Route}
 */
function findRoute(routes, matchPath) {
  if ( routes === void 0 ) routes = [];

  var i = 0;
  var matchedRoute = null;
  var l = routes.length;

  while (i < l) {
    var route = routes[i];
    var path = route.path;
    var children = route.children;

    if (path === matchPath) {
      /* 匹配路径 */
      return route
    } else if (children && children.length) {
      /* 深度优先遍历，不匹配，但是有children，则递归children并返回匹配结果 */
      matchedRoute = findRoute(children, matchPath);
      i++; /* 自增当前集合索引i */
    } else {
      i++; /* 自增当前集合索引i */
    }

    if (matchedRoute) {
      return matchedRoute
    }
  }
}

/**
 * @description auto complete path with parent path
 * @param {string} path
 * @param {string} parentPath
 * @returns {string}
 */
function completePath(path, parentPath) {
  if (parentPath === '/' && path !== '/' && path.startsWith('/')) {
    return ensurePathSlash(path)
  } else {
    return ensurePathSlash(parentPath) + ensurePathSlash(path)
  }
}

/**
 * ensurePathSlash
 * @param {string} path
 */
function ensurePathSlash(path) {
  var trailingSlashRE = /\/?$/;
  path = path !== '/' ? path.replace(trailingSlashRE, '') : path;

  return path ? (ensureSlash(path) ? path : '/' + path) : '/'
}

/**
 * ensureSlash
 * @param {string} path
 */
function ensureSlash(path) {
  return path.charAt(0) === '/'
}

/**
 * Expose `pathToRegexp`.
 */
var parse_1 = parse;
var tokensToRegExp_1 = tokensToRegExp;

/**
 * Default configs.
 */
var DEFAULT_DELIMITER = '/';

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // ":test(\\d+)?" => ["test", "\d+", undefined, "?"]
  // "(\\d+)"  => [undefined, undefined, "\d+", undefined]
  '(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?'
].join('|'), 'g');

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
function parse (str, options) {
  var tokens = [];
  var key = 0;
  var index = 0;
  var path = '';
  var defaultDelimiter = (options && options.delimiter) || DEFAULT_DELIMITER;
  var whitelist = (options && options.whitelist) || undefined;
  var pathEscaped = false;
  var res;

  while ((res = PATH_REGEXP.exec(str)) !== null) {
    var m = res[0];
    var escaped = res[1];
    var offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      pathEscaped = true;
      continue
    }

    var prev = '';
    var name = res[2];
    var capture = res[3];
    var group = res[4];
    var modifier = res[5];

    if (!pathEscaped && path.length) {
      var k = path.length - 1;
      var c = path[k];
      var matches = whitelist ? whitelist.indexOf(c) > -1 : true;

      if (matches) {
        prev = c;
        path = path.slice(0, k);
      }
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
      pathEscaped = false;
    }

    var repeat = modifier === '+' || modifier === '*';
    var optional = modifier === '?' || modifier === '*';
    var pattern = capture || group;
    var delimiter = prev || defaultDelimiter;

    tokens.push({
      name: name || key++,
      prefix: prev,
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: pattern
        ? escapeGroup(pattern)
        : '[^' + escapeString(delimiter === defaultDelimiter ? delimiter : (delimiter + defaultDelimiter)) + ']+?'
    });
  }

  // Push any remaining characters.
  if (path || index < str.length) {
    tokens.push(path + str.substr(index));
  }

  return tokens
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$/()])/g, '\\$1')
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags (options) {
  return options && options.sensitive ? '' : 'i'
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
function tokensToRegExp (tokens, keys, options) {
  options = options || {};

  var strict = options.strict;
  var start = options.start !== false;
  var end = options.end !== false;
  var delimiter = options.delimiter || DEFAULT_DELIMITER;
  var endsWith = [].concat(options.endsWith || []).map(escapeString).concat('$').join('|');
  var route = start ? '^' : '';

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
    } else {
      var capture = token.repeat
        ? '(?:' + token.pattern + ')(?:' + escapeString(token.delimiter) + '(?:' + token.pattern + '))*'
        : token.pattern;

      if (keys) { keys.push(token); }

      if (token.optional) {
        if (!token.prefix) {
          route += '(' + capture + ')?';
        } else {
          route += '(?:' + escapeString(token.prefix) + '(' + capture + '))?';
        }
      } else {
        route += escapeString(token.prefix) + '(' + capture + ')';
      }
    }
  }

  if (end) {
    if (!strict) { route += '(?:' + escapeString(delimiter) + ')?'; }

    route += endsWith === '$' ? '$' : '(?=' + endsWith + ')';
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === 'string'
      ? endToken[endToken.length - 1] === delimiter
      : endToken === undefined;

    if (!strict) { route += '(?:' + escapeString(delimiter) + '(?=' + endsWith + '))?'; }
    if (!isEndDelimited) { route += '(?=' + escapeString(delimiter) + '|' + endsWith + ')'; }
  }

  return new RegExp(route, flags(options))
}

function findRightKey(map, key) {
  var keys = Object.keys(map);

  if (keys) {
    /** @type {RegExp[]} */
    var regexps = keys.map(function (key) { return tokensToRegExp_1(parse_1(key)); });
    var i = 0;
    var l = regexps.length;

    while (i++ < l) {
      var regexp = regexps[i];

      if (regexp.test(key)) {
        return keys[i]
      }
    }
  }
}

// @ts-ignore
function objectWithoutProperties (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }

/**
 * @class EnhancedRouter
 * @description Dynamically add child routes to an existing route & provides some `helpers` method
 */
var EnhancedRouter = function EnhancedRouter(router) {
  // @override `VueRouter.prototype.addRoutes` method
  if (router.addRoutes !== this.addRoutes) {
    router.addRoutes = this.addRoutes.bind(this);
  }

  this.router = router;

  /**
   * @type {Route[]}
   */
  // @ts-ignore
  this.routes = router.options.routes;
  this.pathMap = {};
  this.pathList = [];
  this.appsMap = {};

  this._init();
};

EnhancedRouter.warn = function warn () {
  return getWarning(EnhancedRouter.name)(arguments)
};

EnhancedRouter.prototype._init = function _init () {
  this.refreshAndCheckState(this.routes);
};

/**
 * @description Add new routes into current router, and supports dynamic nest
 * @see
 *+ [Dynamically add child routes to an existing route](https://github.com/vuejs/vue-router/issues/1156)
 *+ [Feature request: replace routes dynamically](https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465)
 * @param {Array<Route>} newRoutes VueRoute route option
 * @param {string} [parentPath]
 * @param {Array<Route>} [oldRoutes]
 */
EnhancedRouter.prototype.addRoutes = function addRoutes (newRoutes, parentPath, oldRoutes) {
  if (isDev) {
    console.log(this.pathList);
    console.log(this.pathMap);
  }

  // before merge new routes we need to check them out does
  // any path or name whether duplicate in old routes
  this.refreshAndCheckState(newRoutes, parentPath);

  // reset current router's matcher with merged routes
  this.router.matcher = new VueRouter(
    this.normalizeOptions(
      // @ts-ignore
      this.adaptRouterOptions(oldRoutes || this.router),
      { routes: newRoutes },
      parentPath
    )
    // @ts-ignore
  ).matcher;
};

/**
 * @param {Route[]|Router} routesOrRouter
 */
EnhancedRouter.prototype.adaptRouterOptions = function adaptRouterOptions (routesOrRouter) {
  if (routesOrRouter) {
    if (routesOrRouter instanceof VueRouter) {
      return routesOrRouter.options
    } else if (isArray(routesOrRouter)) {
      return { routes: routesOrRouter }
    }
  }

  return {}
};

/**
 * @description normalize the options between oldRouter and newRouter with diff config options
 * @param {Router["options"]} oldOpts oldRouter
 * @param {Router["options"]} newOpts newROuter
 * @param {string} [parentPath]
 * @returns {Object}
 */
EnhancedRouter.prototype.normalizeOptions = function normalizeOptions (oldOpts, newOpts, parentPath) {
  var oldRoutes = oldOpts.routes; if ( oldRoutes === void 0 ) oldRoutes = [];
    var rest = objectWithoutProperties( oldOpts, ["routes"] );
    var oldProps = rest;
  var newRoutes = newOpts.routes; if ( newRoutes === void 0 ) newRoutes = [];
    var rest$1 = objectWithoutProperties( newOpts, ["routes"] );
    var newProps = rest$1;

  return Object.assign(
    {
      routes: this.mergeRoutes(oldRoutes, newRoutes, parentPath)
    },
    newProps,
    oldProps
  )
};

/**
 * mergeRoutes
 * @param {Array<Route>} oldRoutes
 * @param {Array<Route>} newRoutes
 * @param {string} [parentPath]
 * @returns {Array<Route>} oldRoutes
 */
EnhancedRouter.prototype.mergeRoutes = function mergeRoutes (oldRoutes, newRoutes, parentPath) {
  var needMatchPath = parentPath;

  newRoutes.forEach(function (route) {
    if (isString(route.parentPath)) {
      parentPath = route.parentPath;
      delete route.parentPath;
    } else {
      parentPath = needMatchPath;
    }

    if (isString(parentPath)) {
      if (parentPath === '') {
        oldRoutes.push(route);
      } else {
        var oldRoute = findRoute(oldRoutes, parentPath);
        var path = route.path;

        if (oldRoute) {
(oldRoute.children || (oldRoute.children = [])).push(
            Object.assign({}, route, {
              path:
                parentPath && path.startsWith('/')
                  ? (path = path.replace(/^\/*/, ''))
                  : path /* fix: @issue that nested paths that start with `/` will be treated as a root path */
            })
          );
        }
      }
    } else {
      oldRoutes.push(route);
    }
  });

  return oldRoutes
};

/**
 * @description DFS 刷新路径 pathList 和 pathMap 并检查路由 path 和 name 是否重复
 * @param {Array<Route>} routes
 * @param {String} [parentPath]
 *1. from method calls: addRoutes(routes, parentPath)
 *2. from route property: { path: '/bar', parentPath: '/foo', template: '<a href="/foo/bar">/foo/bar</a>' }
 */
EnhancedRouter.prototype.refreshAndCheckState = function refreshAndCheckState (routes, parentPath) {
    var this$1 = this;

  routes.forEach(
    function (ref) {
        var path = ref.path;
        var selfParentPath = ref.parentPath;
        var name = ref.name;
        var children = ref.children;
        var childrenApps = ref.childrenApps;

      /* 优先匹配 route self parentPath */
      if (selfParentPath) {
        path = this$1.genParentPath(path, selfParentPath, name);
      } else if (parentPath) {
        path = this$1.genParentPath(path, parentPath, name);
      }

      if (path) {
        if (!this$1.pathExists(path)) {
          this$1.pathList.push(path);
        } else {
          EnhancedRouter.warn(("The path " + path + " in pathList has been existed"));
        }
      }

      if (name) {
        if (!this$1.nameExists(name)) {
          this$1.pathMap[name] = path;
        } else {
          EnhancedRouter.warn(("The name " + name + " in pathMap has been existed"));
        }
      }

      // if childrenApps exists so records it with its fullPath
      if (childrenApps) {
[].concat(childrenApps).forEach(function (app) {
          if (typeof app === 'object') {
            var ref = Object.entries(app).shift();
              var appName = ref[0];
              var appPath = ref[1];

            this$1.appsMap[completePath(appPath, path)] = appName;
          } else {
            this$1.appsMap[completePath(app, path)] = name;
          }
        });
      }

      if (children && children.length) {
        // @ts-ignore
        return this$1.refreshAndCheckState(children, path)
      }
    }
  );
};

EnhancedRouter.prototype.genParentPath = function genParentPath (path, parentPath, name) {
  if (this.pathExists(parentPath)) {
    return (path = completePath(path, parentPath))
  } else {
    EnhancedRouter.warn(
      ("Cannot found the parent path " + parentPath + " " + (name ? 'of ' + name : '') + " in Vue-MFE MasterRouter")
    );
    return ''
  }
};

EnhancedRouter.prototype.pathExists = function pathExists (path) {
  return this.pathList.includes(path)
};

EnhancedRouter.prototype.nameExists = function nameExists (name) {
  return this.pathMap[name]
};

EnhancedRouter.prototype.getChildrenApps = function getChildrenApps (path) {
  var apps = this.appsMap[path];

  /**
   * 需要处理这种情况的路径例： ‘/path/:var’，'/wf/:projectSysNo/form/design'
   * 路径不是固定 string ‘/a/b’，所以无法直接通过 {key: val} 映射得到对应的结果
   * 因此引入了 pathToRegExp 这个 lib 来处理这种情况，如果 reg.test(path)
   * 则认为匹配成功
   */
  if (!apps) {
    var key = findRightKey(this.appsMap, path);

    if (key) {
      apps = this.appsMap[key];
    }
  }

  if (apps) {
    return [].concat(apps)
  }

  return null
};

EnhancedRouter.prototype.findRoute = function findRoute$1 (routes, route) {
  var path = (isString(route) && route) || (isObject(route) && route.path);
  return (path && findRoute(routes || this.routes, path)) || null
};

function objectWithoutProperties$1 (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }

var _Vue;

/**
 * @class VueMfe
 * @description Vue micro front-end Centralized Controller
 */
var VueMfe = /*@__PURE__*/(function (Observer$$1) {
  function VueMfe(opts) {
    if ( opts === void 0 ) opts = {};

    Observer$$1.call(this);

    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here.
    if (
      /* eslint-disable-next-line no-undef */
      // @ts-ignore
      !Vue &&
      typeof window !== 'undefined' &&
      // @ts-ignore
      window.Vue &&
      // @ts-ignore
      !VueMfe.install.installed
    ) {
      // @ts-ignore
      VueMfe.install(window.Vue);
    }

    if (!opts || !opts.router || !(opts.router instanceof VueRouter)) {
      VueMfe.warn(
        'Must pass the router property in "Vue.use(VueMfe, { router, config })"'
      );
    }

    var router = opts.router;
    var rest = objectWithoutProperties$1( opts, ["router"] );
    var config = rest;

    this.router = router;
    this.config = Object.assign({}, VueMfe.DEFAULTS, config);
    this.installedApps = {};
    this.helpers = new EnhancedRouter(this.router);
    this.lazyloader = new Lazyloader().setConfig(this.config);

    this._init();
  }

  if ( Observer$$1 ) VueMfe.__proto__ = Observer$$1;
  VueMfe.prototype = Object.create( Observer$$1 && Observer$$1.prototype );
  VueMfe.prototype.constructor = VueMfe;

  VueMfe.log = function log () {
    return getLogger(VueMfe.name)(arguments)
  };

  VueMfe.warn = function warn () {
    return getWarning(VueMfe.name)(arguments)
  };

  /**
   * @description To support a new Vue options `mfe` when Vue instantiation
   * see https://github.com/vuejs/vuex/blob/dev/src/mixin.js
   * @param {import('vue').VueConstructor} Vue
   */
  VueMfe.install = function install (Vue) {
    // @ts-ignore
    if (VueMfe.install.installed && _Vue === Vue) { return }
    // @ts-ignore
    VueMfe.install.installed = true;

    _Vue = Vue;

    var version = Number(Vue.version.split('.')[0]);

    if (version >= 2) {
      Vue.mixin({ beforeCreate: initVueMfe });
    } else {
      // override init and inject vuex init procedure
      // for 1.x backwards compatibility.
      var _init = Vue.prototype._init;
      Vue.prototype._init = function(options) {
        if ( options === void 0 ) options = {};

        options.init = options.init
          ? [initVueMfe].concat(options.init)
          : initVueMfe;
        _init.call(this, options);
      };
    }

    function initVueMfe() {
      var options = this.$options;
      // store injection
      if (options.mfe) {
        this.$mfe =
          typeof options.mfe === 'function' ? options.mfe() : options.mfe;
      } else if (options.parent && options.parent.$mfe) {
        this.$mfe = options.parent.$mfe;
      }
    }
  };

  VueMfe.prototype._init = function _init () {
    var this$1 = this;

    this.router.beforeEach(function (to, from, next) {
      // when none-matched path
      if (
        to.matched.length === 0 ||
        this$1.router.match(to.path).matched.length === 0
      ) {
        var appName = this$1._getPrefixName(to);
        var args = { name: appName, to: to, from: from, next: next };

        if (this$1.isInstalled(appName)) {
          var childrenApps = this$1.helpers.getChildrenApps(
            to.path || to.fullPath
          );

          if (childrenApps && childrenApps.length) {
            return this$1._installChildrenApps(childrenApps, args)
          } else {
            var error = new Error(
              (appName + " has been installed but it has no any path " + (to.path))
            );
            // @ts-ignore
            error.code = VueMfe.ERROR_CODE.LOAD_DUPLICATE_WITHOUT_PATH;

            this$1.emit('error', error, args);
          }
        } else {
          return this$1.installApp(args)
        }
      } else {
        return next()
      }
    });
  };

  /**
   * import
   * @description 解析传入的名称获取应用前缀，懒加载应用并返回解析后的 module 内部变量
   * @tutorial
   *  1. 远程组件内部必须自包含样式
   *  2. 远程组件同样支持分片加载
   *  3. 可以引入所有被暴露的模块
   * @param {string} name appName+delimiter+[moduleName?]+componentName
   * @param {string} delimiter 可自定义配置的分隔符
   * @example 引入特定 appName 应用下特定 moduleName 下特定 componentName
   *  ```js
   *    const LazyComponent = mfe.import('appName.moduleName.componentName')
   *  ```
   * @example 引入 workflow 下入口文件暴露出的 FlowLayout 组件，wf 为 appName，FlowLayout 为 portal.entry.js module 暴露出的变量
   *  ```js
   *    const FlowLayout = mfe.import('wf.components.FlowLayout')
   *  ```
   */
  VueMfe.prototype.import = function import$1 (name, delimiter) {
    if ( delimiter === void 0 ) delimiter = '.';

    var appName = getPrefixAppName(name, delimiter);
    var keyPath = name
      .slice(appName.length + delimiter.length)
      .replace(delimiter, '.');

    return (
      appName &&
      this._loadAppEntry(appName).then(function (module) {
        var component = getPropVal(module, keyPath);

        if (isFunction(component)) {
          return component()
        } else {
          return component
        }
      })
    )
  };

  VueMfe.prototype.isInstalled = function isInstalled (route) {
    var name = route;

    if (isObject(route) && /\//.exec(route.path)) {
      name = this._getPrefixName(route);
    } else if (isString(route) && /\//.exec(route)) {
      name = this._getPrefixNameByDelimiter(route, '/');
    }

    return this.installedApps[name] === VueMfe.LOAD_STATUS.SUCCESS
  };

  VueMfe.prototype.preinstall = function preinstall (name) {
    return name && this.installApp({ name: name })
  };

  VueMfe.prototype.installApp = function installApp (args) {
    var this$1 = this;

    var name = args.name;
    var next = args.next;
    var to = args.to;

    if (this.isInstalled(name)) {
      return true
    }

    this.installedApps[name] = VueMfe.LOAD_STATUS.START;
    this.emit('start', args);

    /**
     * handleSuccess
     * @param {boolean} success
     */
    var handleSuccess = function (success) {
      VueMfe.log(("install app " + name + " success"), success);

      if (success) {
        this$1.installedApps[name] = VueMfe.LOAD_STATUS.SUCCESS;
        // After apply mini app routes, i must to force next(to)
        // instead of next(). next() do nothing... bug???
        next && to && next(to);

        this$1.emit('end', args);
      }

      return success
    };

    /**
     * handleError
     * @param {Error|string} error
     */
    var handleError = function (error) {
      if (!(error instanceof Error)) { error = new Error(error); }
      // @ts-ignore
      if (!error.code) { error.code = VueMfe.ERROR_CODE.LOAD_ERROR_HAPPENED; }

      this$1.installedApps[name] = VueMfe.LOAD_STATUS.FAILED;
      next && next(false); // stop navigating to next route

      this$1.emit('error', error, args); // error-first like node?! 😊
    };

    return this._loadAppEntry(args)
      .then(function (module) { return this$1._executeAppEntry(module); })
      .then(function (routes) { return this$1._installAppModule(routes, name); })
      .then(handleSuccess)
      .catch(handleError)
  };

  /**
   * @param {string|{name: string}} name
   * @returns {Promise<AppModule>}
   */
  VueMfe.prototype._loadAppEntry = function _loadAppEntry (name) {
    return this.lazyloader.load(typeof name === 'string' ? { name: name } : name)
  };

  /**
   * _executeAppEntry
   * @description To executes the ESM/UMD app module
   * @typedef {import('vue').Component} VueComponent
   * @typedef {(app: VueComponent)=>Promise<Route[]>|Route[]|{init: (app: VueComponent)=>Promise<boolean>, routes: Route[]}} AppModule
   * @param {AppModule} module
   * @returns {Promise<Route[]>}
   * @summary
   *  1. module is a init function
   *    module: () => Promise<T>.then((routes: Array<Route> | boolean) => boolean)
   *  2. module is an array of routes
   *    module: Array<Route>
   *  3. module is an object with property 'init' and 'routes'
   *    module: { init: Function, routes: Array<Route> }
   */
  VueMfe.prototype._executeAppEntry = function _executeAppEntry (module) {
    module = resolveModule(module);

    /** @type {VueComponent}  */
    var app = this.router && this.router.app;

    if (isFunction(module)) {
      // routes: () => Promise<T>.then((routes: Array<Route> | boolean) => boolean)
      // @ts-ignore
      return Promise.resolve(module(app))
    } else if (isArray(module)) {
      // module: Array<Route>
      // @ts-ignore
      return module
    } else if (isObject(module)) {
      // module: { init: Promise<T>.then((success: boolean) => boolean), routes: Array<Route> }
      // @ts-ignore
      return isFunction(module.init) && Promise.resolve(module.init(app))
    }
  };

  /**
   * @param {Route[]} routes
   * @param {string} name
   * @throws {Error}
   */
  VueMfe.prototype._installAppModule = function _installAppModule (routes, name) {
    if (isArray(routes)) {
      if (routes.length) {
        // @ts-ignore
        this.helpers.addRoutes(routes, this.config.parentPath);
        return true
      } else {
        VueMfe.warn('`Route[]` has no any valid item');
      }

      return false
    } else {
      var error = new Error(("Module " + name + " initialize failed."));
      if (routes instanceof Error) { error = routes; }

      // @ts-ignore
      error.code = VueMfe.ERROR_CODE.LOAD_APP_INIT_FAILED;
      VueMfe.warn(error);

      return false
    }
  };

  VueMfe.prototype._installChildrenApps = function _installChildrenApps (apps, ref) {
    var this$1 = this;
    var next = ref.next;
    var to = ref.to;

    var allPromises = apps.map(function (name) { return this$1.installApp({ name: name }); });

    return Promise.all(allPromises)
      .then(function (res) {
        return res.every(Boolean)
      })
      .then(function (success) {
        return success && next && to && next(to)
      })
  };

  /**
   * @description get the domain-app prefix name by current router and next route
   * @param {VueRoute} route
   * @returns {string} name
   */
  VueMfe.prototype._getPrefixName = function _getPrefixName (route) {
    return (
      // @ts-ignore
      route.domainName ||
      (route.name && route.name.includes('.')
        ? this._getPrefixNameByDelimiter(route.name, '.')
        : this._getPrefixNameByDelimiter(route.path, '/'))
    )
  };

  VueMfe.prototype._getPrefixNameByDelimiter = function _getPrefixNameByDelimiter (str, delimiter) {
    var this$1 = this;

    return (
      (this.config.ignoreCase ? str.toLowerCase() : str)
        .split(delimiter)
        /* filter all params form route to get right name */
        .filter(
          function (s) { return !Object.values(this$1.router.currentRoute.params).includes(s); }
        )
        .filter(Boolean)
        .map(function (s) { return s.trim(); })
        .shift()
    )
  };

  return VueMfe;
}(Observer));

VueMfe.version = '1.0.4';
VueMfe.DEFAULTS = {
  ignoreCase: true,
  parentPath: null,
  getNamespace: function (name) { return ("__domain__app__" + name); }
};
VueMfe.LOAD_STATUS = {
  SUCCESS: 1,
  START: 0,
  FAILED: -1
};
VueMfe.ERROR_CODE = {
  LOAD_ERROR_HAPPENED: VueMfe.LOAD_STATUS.FAILED,
  LOAD_DUPLICATE_WITHOUT_PATH: -2,
  LOAD_APP_INIT_FAILED: -3
};

return VueMfe;

})));

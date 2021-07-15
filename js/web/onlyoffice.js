define(function () { 'use strict';

            var global$1 = (typeof global !== "undefined" ? global :
                        typeof self !== "undefined" ? self :
                        typeof window !== "undefined" ? window : {});

            // shim for using process in browser
            // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

            function defaultSetTimout() {
                throw new Error('setTimeout has not been defined');
            }
            function defaultClearTimeout () {
                throw new Error('clearTimeout has not been defined');
            }
            var cachedSetTimeout = defaultSetTimout;
            var cachedClearTimeout = defaultClearTimeout;
            if (typeof global$1.setTimeout === 'function') {
                cachedSetTimeout = setTimeout;
            }
            if (typeof global$1.clearTimeout === 'function') {
                cachedClearTimeout = clearTimeout;
            }

            function runTimeout(fun) {
                if (cachedSetTimeout === setTimeout) {
                    //normal enviroments in sane situations
                    return setTimeout(fun, 0);
                }
                // if setTimeout wasn't available but was latter defined
                if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
                    cachedSetTimeout = setTimeout;
                    return setTimeout(fun, 0);
                }
                try {
                    // when when somebody has screwed with setTimeout but no I.E. maddness
                    return cachedSetTimeout(fun, 0);
                } catch(e){
                    try {
                        // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                        return cachedSetTimeout.call(null, fun, 0);
                    } catch(e){
                        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                        return cachedSetTimeout.call(this, fun, 0);
                    }
                }


            }
            function runClearTimeout(marker) {
                if (cachedClearTimeout === clearTimeout) {
                    //normal enviroments in sane situations
                    return clearTimeout(marker);
                }
                // if clearTimeout wasn't available but was latter defined
                if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
                    cachedClearTimeout = clearTimeout;
                    return clearTimeout(marker);
                }
                try {
                    // when when somebody has screwed with setTimeout but no I.E. maddness
                    return cachedClearTimeout(marker);
                } catch (e){
                    try {
                        // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                        return cachedClearTimeout.call(null, marker);
                    } catch (e){
                        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                        // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                        return cachedClearTimeout.call(this, marker);
                    }
                }



            }
            var queue = [];
            var draining = false;
            var currentQueue;
            var queueIndex = -1;

            function cleanUpNextTick() {
                if (!draining || !currentQueue) {
                    return;
                }
                draining = false;
                if (currentQueue.length) {
                    queue = currentQueue.concat(queue);
                } else {
                    queueIndex = -1;
                }
                if (queue.length) {
                    drainQueue();
                }
            }

            function drainQueue() {
                if (draining) {
                    return;
                }
                var timeout = runTimeout(cleanUpNextTick);
                draining = true;

                var len = queue.length;
                while(len) {
                    currentQueue = queue;
                    queue = [];
                    while (++queueIndex < len) {
                        if (currentQueue) {
                            currentQueue[queueIndex].run();
                        }
                    }
                    queueIndex = -1;
                    len = queue.length;
                }
                currentQueue = null;
                draining = false;
                runClearTimeout(timeout);
            }
            function nextTick(fun) {
                var args = new Array(arguments.length - 1);
                if (arguments.length > 1) {
                    for (var i = 1; i < arguments.length; i++) {
                        args[i - 1] = arguments[i];
                    }
                }
                queue.push(new Item(fun, args));
                if (queue.length === 1 && !draining) {
                    runTimeout(drainQueue);
                }
            }
            // v8 likes predictible objects
            function Item(fun, array) {
                this.fun = fun;
                this.array = array;
            }
            Item.prototype.run = function () {
                this.fun.apply(null, this.array);
            };
            var title = 'browser';
            var platform = 'browser';
            var browser = true;
            var env = {};
            var argv = [];
            var version = ''; // empty string to avoid regexp issues
            var versions = {};
            var release = {};
            var config = {};

            function noop() {}

            var on = noop;
            var addListener = noop;
            var once = noop;
            var off = noop;
            var removeListener = noop;
            var removeAllListeners = noop;
            var emit = noop;

            function binding(name) {
                throw new Error('process.binding is not supported');
            }

            function cwd () { return '/' }
            function chdir (dir) {
                throw new Error('process.chdir is not supported');
            }function umask() { return 0; }

            // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
            var performance = global$1.performance || {};
            var performanceNow =
              performance.now        ||
              performance.mozNow     ||
              performance.msNow      ||
              performance.oNow       ||
              performance.webkitNow  ||
              function(){ return (new Date()).getTime() };

            // generate timestamp or delta
            // see http://nodejs.org/api/process.html#process_process_hrtime
            function hrtime(previousTimestamp){
              var clocktime = performanceNow.call(performance)*1e-3;
              var seconds = Math.floor(clocktime);
              var nanoseconds = Math.floor((clocktime%1)*1e9);
              if (previousTimestamp) {
                seconds = seconds - previousTimestamp[0];
                nanoseconds = nanoseconds - previousTimestamp[1];
                if (nanoseconds<0) {
                  seconds--;
                  nanoseconds += 1e9;
                }
              }
              return [seconds,nanoseconds]
            }

            var startTime = new Date();
            function uptime() {
              var currentTime = new Date();
              var dif = currentTime - startTime;
              return dif / 1000;
            }

            var process = {
              nextTick: nextTick,
              title: title,
              browser: browser,
              env: env,
              argv: argv,
              version: version,
              versions: versions,
              on: on,
              addListener: addListener,
              once: once,
              off: off,
              removeListener: removeListener,
              removeAllListeners: removeAllListeners,
              emit: emit,
              binding: binding,
              cwd: cwd,
              chdir: chdir,
              umask: umask,
              hrtime: hrtime,
              platform: platform,
              release: release,
              config: config,
              uptime: uptime
            };

            /*!
             * vuex v3.6.2
             * (c) 2021 Evan You
             * @license MIT
             */
            function applyMixin (Vue) {
              var version = Number(Vue.version.split('.')[0]);

              if (version >= 2) {
                Vue.mixin({ beforeCreate: vuexInit });
              } else {
                // override init and inject vuex init procedure
                // for 1.x backwards compatibility.
                var _init = Vue.prototype._init;
                Vue.prototype._init = function (options) {
                  if ( options === void 0 ) options = {};

                  options.init = options.init
                    ? [vuexInit].concat(options.init)
                    : vuexInit;
                  _init.call(this, options);
                };
              }

              /**
               * Vuex init hook, injected into each instances init hooks list.
               */

              function vuexInit () {
                var options = this.$options;
                // store injection
                if (options.store) {
                  this.$store = typeof options.store === 'function'
                    ? options.store()
                    : options.store;
                } else if (options.parent && options.parent.$store) {
                  this.$store = options.parent.$store;
                }
              }
            }

            var target = typeof window !== 'undefined'
              ? window
              : typeof global$1 !== 'undefined'
                ? global$1
                : {};
            var devtoolHook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__;

            function devtoolPlugin (store) {
              if (!devtoolHook) { return }

              store._devtoolHook = devtoolHook;

              devtoolHook.emit('vuex:init', store);

              devtoolHook.on('vuex:travel-to-state', function (targetState) {
                store.replaceState(targetState);
              });

              store.subscribe(function (mutation, state) {
                devtoolHook.emit('vuex:mutation', mutation, state);
              }, { prepend: true });

              store.subscribeAction(function (action, state) {
                devtoolHook.emit('vuex:action', action, state);
              }, { prepend: true });
            }

            /**
             * forEach for object
             */
            function forEachValue (obj, fn) {
              Object.keys(obj).forEach(function (key) { return fn(obj[key], key); });
            }

            function isObject$1 (obj) {
              return obj !== null && typeof obj === 'object'
            }

            function isPromise (val) {
              return val && typeof val.then === 'function'
            }

            function assert (condition, msg) {
              if (!condition) { throw new Error(("[vuex] " + msg)) }
            }

            function partial (fn, arg) {
              return function () {
                return fn(arg)
              }
            }

            // Base data struct for store's module, package with some attribute and method
            var Module = function Module (rawModule, runtime) {
              this.runtime = runtime;
              // Store some children item
              this._children = Object.create(null);
              // Store the origin module object which passed by programmer
              this._rawModule = rawModule;
              var rawState = rawModule.state;

              // Store the origin module's state
              this.state = (typeof rawState === 'function' ? rawState() : rawState) || {};
            };

            var prototypeAccessors = { namespaced: { configurable: true } };

            prototypeAccessors.namespaced.get = function () {
              return !!this._rawModule.namespaced
            };

            Module.prototype.addChild = function addChild (key, module) {
              this._children[key] = module;
            };

            Module.prototype.removeChild = function removeChild (key) {
              delete this._children[key];
            };

            Module.prototype.getChild = function getChild (key) {
              return this._children[key]
            };

            Module.prototype.hasChild = function hasChild (key) {
              return key in this._children
            };

            Module.prototype.update = function update (rawModule) {
              this._rawModule.namespaced = rawModule.namespaced;
              if (rawModule.actions) {
                this._rawModule.actions = rawModule.actions;
              }
              if (rawModule.mutations) {
                this._rawModule.mutations = rawModule.mutations;
              }
              if (rawModule.getters) {
                this._rawModule.getters = rawModule.getters;
              }
            };

            Module.prototype.forEachChild = function forEachChild (fn) {
              forEachValue(this._children, fn);
            };

            Module.prototype.forEachGetter = function forEachGetter (fn) {
              if (this._rawModule.getters) {
                forEachValue(this._rawModule.getters, fn);
              }
            };

            Module.prototype.forEachAction = function forEachAction (fn) {
              if (this._rawModule.actions) {
                forEachValue(this._rawModule.actions, fn);
              }
            };

            Module.prototype.forEachMutation = function forEachMutation (fn) {
              if (this._rawModule.mutations) {
                forEachValue(this._rawModule.mutations, fn);
              }
            };

            Object.defineProperties( Module.prototype, prototypeAccessors );

            var ModuleCollection = function ModuleCollection (rawRootModule) {
              // register root module (Vuex.Store options)
              this.register([], rawRootModule, false);
            };

            ModuleCollection.prototype.get = function get (path) {
              return path.reduce(function (module, key) {
                return module.getChild(key)
              }, this.root)
            };

            ModuleCollection.prototype.getNamespace = function getNamespace (path) {
              var module = this.root;
              return path.reduce(function (namespace, key) {
                module = module.getChild(key);
                return namespace + (module.namespaced ? key + '/' : '')
              }, '')
            };

            ModuleCollection.prototype.update = function update$1 (rawRootModule) {
              update([], this.root, rawRootModule);
            };

            ModuleCollection.prototype.register = function register (path, rawModule, runtime) {
                var this$1$1 = this;
                if ( runtime === void 0 ) runtime = true;

              if ((process.env.NODE_ENV !== 'production')) {
                assertRawModule(path, rawModule);
              }

              var newModule = new Module(rawModule, runtime);
              if (path.length === 0) {
                this.root = newModule;
              } else {
                var parent = this.get(path.slice(0, -1));
                parent.addChild(path[path.length - 1], newModule);
              }

              // register nested modules
              if (rawModule.modules) {
                forEachValue(rawModule.modules, function (rawChildModule, key) {
                  this$1$1.register(path.concat(key), rawChildModule, runtime);
                });
              }
            };

            ModuleCollection.prototype.unregister = function unregister (path) {
              var parent = this.get(path.slice(0, -1));
              var key = path[path.length - 1];
              var child = parent.getChild(key);

              if (!child) {
                if ((process.env.NODE_ENV !== 'production')) {
                  console.warn(
                    "[vuex] trying to unregister module '" + key + "', which is " +
                    "not registered"
                  );
                }
                return
              }

              if (!child.runtime) {
                return
              }

              parent.removeChild(key);
            };

            ModuleCollection.prototype.isRegistered = function isRegistered (path) {
              var parent = this.get(path.slice(0, -1));
              var key = path[path.length - 1];

              if (parent) {
                return parent.hasChild(key)
              }

              return false
            };

            function update (path, targetModule, newModule) {
              if ((process.env.NODE_ENV !== 'production')) {
                assertRawModule(path, newModule);
              }

              // update target module
              targetModule.update(newModule);

              // update nested modules
              if (newModule.modules) {
                for (var key in newModule.modules) {
                  if (!targetModule.getChild(key)) {
                    if ((process.env.NODE_ENV !== 'production')) {
                      console.warn(
                        "[vuex] trying to add a new module '" + key + "' on hot reloading, " +
                        'manual reload is needed'
                      );
                    }
                    return
                  }
                  update(
                    path.concat(key),
                    targetModule.getChild(key),
                    newModule.modules[key]
                  );
                }
              }
            }

            var functionAssert = {
              assert: function (value) { return typeof value === 'function'; },
              expected: 'function'
            };

            var objectAssert = {
              assert: function (value) { return typeof value === 'function' ||
                (typeof value === 'object' && typeof value.handler === 'function'); },
              expected: 'function or object with "handler" function'
            };

            var assertTypes = {
              getters: functionAssert,
              mutations: functionAssert,
              actions: objectAssert
            };

            function assertRawModule (path, rawModule) {
              Object.keys(assertTypes).forEach(function (key) {
                if (!rawModule[key]) { return }

                var assertOptions = assertTypes[key];

                forEachValue(rawModule[key], function (value, type) {
                  assert(
                    assertOptions.assert(value),
                    makeAssertionMessage(path, key, type, value, assertOptions.expected)
                  );
                });
              });
            }

            function makeAssertionMessage (path, key, type, value, expected) {
              var buf = key + " should be " + expected + " but \"" + key + "." + type + "\"";
              if (path.length > 0) {
                buf += " in module \"" + (path.join('.')) + "\"";
              }
              buf += " is " + (JSON.stringify(value)) + ".";
              return buf
            }

            var Vue; // bind on install

            var Store = function Store (options) {
              var this$1$1 = this;
              if ( options === void 0 ) options = {};

              // Auto install if it is not done yet and `window` has `Vue`.
              // To allow users to avoid auto-installation in some cases,
              // this code should be placed here. See #731
              if (!Vue && typeof window !== 'undefined' && window.Vue) {
                install(window.Vue);
              }

              if ((process.env.NODE_ENV !== 'production')) {
                assert(Vue, "must call Vue.use(Vuex) before creating a store instance.");
                assert(typeof Promise !== 'undefined', "vuex requires a Promise polyfill in this browser.");
                assert(this instanceof Store, "store must be called with the new operator.");
              }

              var plugins = options.plugins; if ( plugins === void 0 ) plugins = [];
              var strict = options.strict; if ( strict === void 0 ) strict = false;

              // store internal state
              this._committing = false;
              this._actions = Object.create(null);
              this._actionSubscribers = [];
              this._mutations = Object.create(null);
              this._wrappedGetters = Object.create(null);
              this._modules = new ModuleCollection(options);
              this._modulesNamespaceMap = Object.create(null);
              this._subscribers = [];
              this._watcherVM = new Vue();
              this._makeLocalGettersCache = Object.create(null);

              // bind commit and dispatch to self
              var store = this;
              var ref = this;
              var dispatch = ref.dispatch;
              var commit = ref.commit;
              this.dispatch = function boundDispatch (type, payload) {
                return dispatch.call(store, type, payload)
              };
              this.commit = function boundCommit (type, payload, options) {
                return commit.call(store, type, payload, options)
              };

              // strict mode
              this.strict = strict;

              var state = this._modules.root.state;

              // init root module.
              // this also recursively registers all sub-modules
              // and collects all module getters inside this._wrappedGetters
              installModule(this, state, [], this._modules.root);

              // initialize the store vm, which is responsible for the reactivity
              // (also registers _wrappedGetters as computed properties)
              resetStoreVM(this, state);

              // apply plugins
              plugins.forEach(function (plugin) { return plugin(this$1$1); });

              var useDevtools = options.devtools !== undefined ? options.devtools : Vue.config.devtools;
              if (useDevtools) {
                devtoolPlugin(this);
              }
            };

            var prototypeAccessors$1 = { state: { configurable: true } };

            prototypeAccessors$1.state.get = function () {
              return this._vm._data.$$state
            };

            prototypeAccessors$1.state.set = function (v) {
              if ((process.env.NODE_ENV !== 'production')) {
                assert(false, "use store.replaceState() to explicit replace store state.");
              }
            };

            Store.prototype.commit = function commit (_type, _payload, _options) {
                var this$1$1 = this;

              // check object-style commit
              var ref = unifyObjectStyle(_type, _payload, _options);
                var type = ref.type;
                var payload = ref.payload;
                var options = ref.options;

              var mutation = { type: type, payload: payload };
              var entry = this._mutations[type];
              if (!entry) {
                if ((process.env.NODE_ENV !== 'production')) {
                  console.error(("[vuex] unknown mutation type: " + type));
                }
                return
              }
              this._withCommit(function () {
                entry.forEach(function commitIterator (handler) {
                  handler(payload);
                });
              });

              this._subscribers
                .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
                .forEach(function (sub) { return sub(mutation, this$1$1.state); });

              if (
                (process.env.NODE_ENV !== 'production') &&
                options && options.silent
              ) {
                console.warn(
                  "[vuex] mutation type: " + type + ". Silent option has been removed. " +
                  'Use the filter functionality in the vue-devtools'
                );
              }
            };

            Store.prototype.dispatch = function dispatch (_type, _payload) {
                var this$1$1 = this;

              // check object-style dispatch
              var ref = unifyObjectStyle(_type, _payload);
                var type = ref.type;
                var payload = ref.payload;

              var action = { type: type, payload: payload };
              var entry = this._actions[type];
              if (!entry) {
                if ((process.env.NODE_ENV !== 'production')) {
                  console.error(("[vuex] unknown action type: " + type));
                }
                return
              }

              try {
                this._actionSubscribers
                  .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
                  .filter(function (sub) { return sub.before; })
                  .forEach(function (sub) { return sub.before(action, this$1$1.state); });
              } catch (e) {
                if ((process.env.NODE_ENV !== 'production')) {
                  console.warn("[vuex] error in before action subscribers: ");
                  console.error(e);
                }
              }

              var result = entry.length > 1
                ? Promise.all(entry.map(function (handler) { return handler(payload); }))
                : entry[0](payload);

              return new Promise(function (resolve, reject) {
                result.then(function (res) {
                  try {
                    this$1$1._actionSubscribers
                      .filter(function (sub) { return sub.after; })
                      .forEach(function (sub) { return sub.after(action, this$1$1.state); });
                  } catch (e) {
                    if ((process.env.NODE_ENV !== 'production')) {
                      console.warn("[vuex] error in after action subscribers: ");
                      console.error(e);
                    }
                  }
                  resolve(res);
                }, function (error) {
                  try {
                    this$1$1._actionSubscribers
                      .filter(function (sub) { return sub.error; })
                      .forEach(function (sub) { return sub.error(action, this$1$1.state, error); });
                  } catch (e) {
                    if ((process.env.NODE_ENV !== 'production')) {
                      console.warn("[vuex] error in error action subscribers: ");
                      console.error(e);
                    }
                  }
                  reject(error);
                });
              })
            };

            Store.prototype.subscribe = function subscribe (fn, options) {
              return genericSubscribe(fn, this._subscribers, options)
            };

            Store.prototype.subscribeAction = function subscribeAction (fn, options) {
              var subs = typeof fn === 'function' ? { before: fn } : fn;
              return genericSubscribe(subs, this._actionSubscribers, options)
            };

            Store.prototype.watch = function watch (getter, cb, options) {
                var this$1$1 = this;

              if ((process.env.NODE_ENV !== 'production')) {
                assert(typeof getter === 'function', "store.watch only accepts a function.");
              }
              return this._watcherVM.$watch(function () { return getter(this$1$1.state, this$1$1.getters); }, cb, options)
            };

            Store.prototype.replaceState = function replaceState (state) {
                var this$1$1 = this;

              this._withCommit(function () {
                this$1$1._vm._data.$$state = state;
              });
            };

            Store.prototype.registerModule = function registerModule (path, rawModule, options) {
                if ( options === void 0 ) options = {};

              if (typeof path === 'string') { path = [path]; }

              if ((process.env.NODE_ENV !== 'production')) {
                assert(Array.isArray(path), "module path must be a string or an Array.");
                assert(path.length > 0, 'cannot register the root module by using registerModule.');
              }

              this._modules.register(path, rawModule);
              installModule(this, this.state, path, this._modules.get(path), options.preserveState);
              // reset store to update getters...
              resetStoreVM(this, this.state);
            };

            Store.prototype.unregisterModule = function unregisterModule (path) {
                var this$1$1 = this;

              if (typeof path === 'string') { path = [path]; }

              if ((process.env.NODE_ENV !== 'production')) {
                assert(Array.isArray(path), "module path must be a string or an Array.");
              }

              this._modules.unregister(path);
              this._withCommit(function () {
                var parentState = getNestedState(this$1$1.state, path.slice(0, -1));
                Vue.delete(parentState, path[path.length - 1]);
              });
              resetStore(this);
            };

            Store.prototype.hasModule = function hasModule (path) {
              if (typeof path === 'string') { path = [path]; }

              if ((process.env.NODE_ENV !== 'production')) {
                assert(Array.isArray(path), "module path must be a string or an Array.");
              }

              return this._modules.isRegistered(path)
            };

            Store.prototype.hotUpdate = function hotUpdate (newOptions) {
              this._modules.update(newOptions);
              resetStore(this, true);
            };

            Store.prototype._withCommit = function _withCommit (fn) {
              var committing = this._committing;
              this._committing = true;
              fn();
              this._committing = committing;
            };

            Object.defineProperties( Store.prototype, prototypeAccessors$1 );

            function genericSubscribe (fn, subs, options) {
              if (subs.indexOf(fn) < 0) {
                options && options.prepend
                  ? subs.unshift(fn)
                  : subs.push(fn);
              }
              return function () {
                var i = subs.indexOf(fn);
                if (i > -1) {
                  subs.splice(i, 1);
                }
              }
            }

            function resetStore (store, hot) {
              store._actions = Object.create(null);
              store._mutations = Object.create(null);
              store._wrappedGetters = Object.create(null);
              store._modulesNamespaceMap = Object.create(null);
              var state = store.state;
              // init all modules
              installModule(store, state, [], store._modules.root, true);
              // reset vm
              resetStoreVM(store, state, hot);
            }

            function resetStoreVM (store, state, hot) {
              var oldVm = store._vm;

              // bind store public getters
              store.getters = {};
              // reset local getters cache
              store._makeLocalGettersCache = Object.create(null);
              var wrappedGetters = store._wrappedGetters;
              var computed = {};
              forEachValue(wrappedGetters, function (fn, key) {
                // use computed to leverage its lazy-caching mechanism
                // direct inline function use will lead to closure preserving oldVm.
                // using partial to return function with only arguments preserved in closure environment.
                computed[key] = partial(fn, store);
                Object.defineProperty(store.getters, key, {
                  get: function () { return store._vm[key]; },
                  enumerable: true // for local getters
                });
              });

              // use a Vue instance to store the state tree
              // suppress warnings just in case the user has added
              // some funky global mixins
              var silent = Vue.config.silent;
              Vue.config.silent = true;
              store._vm = new Vue({
                data: {
                  $$state: state
                },
                computed: computed
              });
              Vue.config.silent = silent;

              // enable strict mode for new vm
              if (store.strict) {
                enableStrictMode(store);
              }

              if (oldVm) {
                if (hot) {
                  // dispatch changes in all subscribed watchers
                  // to force getter re-evaluation for hot reloading.
                  store._withCommit(function () {
                    oldVm._data.$$state = null;
                  });
                }
                Vue.nextTick(function () { return oldVm.$destroy(); });
              }
            }

            function installModule (store, rootState, path, module, hot) {
              var isRoot = !path.length;
              var namespace = store._modules.getNamespace(path);

              // register in namespace map
              if (module.namespaced) {
                if (store._modulesNamespaceMap[namespace] && (process.env.NODE_ENV !== 'production')) {
                  console.error(("[vuex] duplicate namespace " + namespace + " for the namespaced module " + (path.join('/'))));
                }
                store._modulesNamespaceMap[namespace] = module;
              }

              // set state
              if (!isRoot && !hot) {
                var parentState = getNestedState(rootState, path.slice(0, -1));
                var moduleName = path[path.length - 1];
                store._withCommit(function () {
                  if ((process.env.NODE_ENV !== 'production')) {
                    if (moduleName in parentState) {
                      console.warn(
                        ("[vuex] state field \"" + moduleName + "\" was overridden by a module with the same name at \"" + (path.join('.')) + "\"")
                      );
                    }
                  }
                  Vue.set(parentState, moduleName, module.state);
                });
              }

              var local = module.context = makeLocalContext(store, namespace, path);

              module.forEachMutation(function (mutation, key) {
                var namespacedType = namespace + key;
                registerMutation(store, namespacedType, mutation, local);
              });

              module.forEachAction(function (action, key) {
                var type = action.root ? key : namespace + key;
                var handler = action.handler || action;
                registerAction(store, type, handler, local);
              });

              module.forEachGetter(function (getter, key) {
                var namespacedType = namespace + key;
                registerGetter(store, namespacedType, getter, local);
              });

              module.forEachChild(function (child, key) {
                installModule(store, rootState, path.concat(key), child, hot);
              });
            }

            /**
             * make localized dispatch, commit, getters and state
             * if there is no namespace, just use root ones
             */
            function makeLocalContext (store, namespace, path) {
              var noNamespace = namespace === '';

              var local = {
                dispatch: noNamespace ? store.dispatch : function (_type, _payload, _options) {
                  var args = unifyObjectStyle(_type, _payload, _options);
                  var payload = args.payload;
                  var options = args.options;
                  var type = args.type;

                  if (!options || !options.root) {
                    type = namespace + type;
                    if ((process.env.NODE_ENV !== 'production') && !store._actions[type]) {
                      console.error(("[vuex] unknown local action type: " + (args.type) + ", global type: " + type));
                      return
                    }
                  }

                  return store.dispatch(type, payload)
                },

                commit: noNamespace ? store.commit : function (_type, _payload, _options) {
                  var args = unifyObjectStyle(_type, _payload, _options);
                  var payload = args.payload;
                  var options = args.options;
                  var type = args.type;

                  if (!options || !options.root) {
                    type = namespace + type;
                    if ((process.env.NODE_ENV !== 'production') && !store._mutations[type]) {
                      console.error(("[vuex] unknown local mutation type: " + (args.type) + ", global type: " + type));
                      return
                    }
                  }

                  store.commit(type, payload, options);
                }
              };

              // getters and state object must be gotten lazily
              // because they will be changed by vm update
              Object.defineProperties(local, {
                getters: {
                  get: noNamespace
                    ? function () { return store.getters; }
                    : function () { return makeLocalGetters(store, namespace); }
                },
                state: {
                  get: function () { return getNestedState(store.state, path); }
                }
              });

              return local
            }

            function makeLocalGetters (store, namespace) {
              if (!store._makeLocalGettersCache[namespace]) {
                var gettersProxy = {};
                var splitPos = namespace.length;
                Object.keys(store.getters).forEach(function (type) {
                  // skip if the target getter is not match this namespace
                  if (type.slice(0, splitPos) !== namespace) { return }

                  // extract local getter type
                  var localType = type.slice(splitPos);

                  // Add a port to the getters proxy.
                  // Define as getter property because
                  // we do not want to evaluate the getters in this time.
                  Object.defineProperty(gettersProxy, localType, {
                    get: function () { return store.getters[type]; },
                    enumerable: true
                  });
                });
                store._makeLocalGettersCache[namespace] = gettersProxy;
              }

              return store._makeLocalGettersCache[namespace]
            }

            function registerMutation (store, type, handler, local) {
              var entry = store._mutations[type] || (store._mutations[type] = []);
              entry.push(function wrappedMutationHandler (payload) {
                handler.call(store, local.state, payload);
              });
            }

            function registerAction (store, type, handler, local) {
              var entry = store._actions[type] || (store._actions[type] = []);
              entry.push(function wrappedActionHandler (payload) {
                var res = handler.call(store, {
                  dispatch: local.dispatch,
                  commit: local.commit,
                  getters: local.getters,
                  state: local.state,
                  rootGetters: store.getters,
                  rootState: store.state
                }, payload);
                if (!isPromise(res)) {
                  res = Promise.resolve(res);
                }
                if (store._devtoolHook) {
                  return res.catch(function (err) {
                    store._devtoolHook.emit('vuex:error', err);
                    throw err
                  })
                } else {
                  return res
                }
              });
            }

            function registerGetter (store, type, rawGetter, local) {
              if (store._wrappedGetters[type]) {
                if ((process.env.NODE_ENV !== 'production')) {
                  console.error(("[vuex] duplicate getter key: " + type));
                }
                return
              }
              store._wrappedGetters[type] = function wrappedGetter (store) {
                return rawGetter(
                  local.state, // local state
                  local.getters, // local getters
                  store.state, // root state
                  store.getters // root getters
                )
              };
            }

            function enableStrictMode (store) {
              store._vm.$watch(function () { return this._data.$$state }, function () {
                if ((process.env.NODE_ENV !== 'production')) {
                  assert(store._committing, "do not mutate vuex store state outside mutation handlers.");
                }
              }, { deep: true, sync: true });
            }

            function getNestedState (state, path) {
              return path.reduce(function (state, key) { return state[key]; }, state)
            }

            function unifyObjectStyle (type, payload, options) {
              if (isObject$1(type) && type.type) {
                options = payload;
                payload = type;
                type = type.type;
              }

              if ((process.env.NODE_ENV !== 'production')) {
                assert(typeof type === 'string', ("expects string as the type, but found " + (typeof type) + "."));
              }

              return { type: type, payload: payload, options: options }
            }

            function install (_Vue) {
              if (Vue && _Vue === Vue) {
                if ((process.env.NODE_ENV !== 'production')) {
                  console.error(
                    '[vuex] already installed. Vue.use(Vuex) should be called only once.'
                  );
                }
                return
              }
              Vue = _Vue;
              applyMixin(Vue);
            }

            /**
             * Reduce the code which written in Vue.js for getting the getters
             * @param {String} [namespace] - Module's namespace
             * @param {Object|Array} getters
             * @return {Object}
             */
            var mapGetters = normalizeNamespace(function (namespace, getters) {
              var res = {};
              if ((process.env.NODE_ENV !== 'production') && !isValidMap(getters)) {
                console.error('[vuex] mapGetters: mapper parameter must be either an Array or an Object');
              }
              normalizeMap(getters).forEach(function (ref) {
                var key = ref.key;
                var val = ref.val;

                // The namespace has been mutated by normalizeNamespace
                val = namespace + val;
                res[key] = function mappedGetter () {
                  if (namespace && !getModuleByNamespace(this.$store, 'mapGetters', namespace)) {
                    return
                  }
                  if ((process.env.NODE_ENV !== 'production') && !(val in this.$store.getters)) {
                    console.error(("[vuex] unknown getter: " + val));
                    return
                  }
                  return this.$store.getters[val]
                };
                // mark vuex getter for devtools
                res[key].vuex = true;
              });
              return res
            });

            /**
             * Reduce the code which written in Vue.js for dispatch the action
             * @param {String} [namespace] - Module's namespace
             * @param {Object|Array} actions # Object's item can be a function which accept `dispatch` function as the first param, it can accept anthor params. You can dispatch action and do any other things in this function. specially, You need to pass anthor params from the mapped function.
             * @return {Object}
             */
            var mapActions = normalizeNamespace(function (namespace, actions) {
              var res = {};
              if ((process.env.NODE_ENV !== 'production') && !isValidMap(actions)) {
                console.error('[vuex] mapActions: mapper parameter must be either an Array or an Object');
              }
              normalizeMap(actions).forEach(function (ref) {
                var key = ref.key;
                var val = ref.val;

                res[key] = function mappedAction () {
                  var args = [], len = arguments.length;
                  while ( len-- ) args[ len ] = arguments[ len ];

                  // get dispatch function from store
                  var dispatch = this.$store.dispatch;
                  if (namespace) {
                    var module = getModuleByNamespace(this.$store, 'mapActions', namespace);
                    if (!module) {
                      return
                    }
                    dispatch = module.context.dispatch;
                  }
                  return typeof val === 'function'
                    ? val.apply(this, [dispatch].concat(args))
                    : dispatch.apply(this.$store, [val].concat(args))
                };
              });
              return res
            });

            /**
             * Normalize the map
             * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
             * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
             * @param {Array|Object} map
             * @return {Object}
             */
            function normalizeMap (map) {
              if (!isValidMap(map)) {
                return []
              }
              return Array.isArray(map)
                ? map.map(function (key) { return ({ key: key, val: key }); })
                : Object.keys(map).map(function (key) { return ({ key: key, val: map[key] }); })
            }

            /**
             * Validate whether given map is valid or not
             * @param {*} map
             * @return {Boolean}
             */
            function isValidMap (map) {
              return Array.isArray(map) || isObject$1(map)
            }

            /**
             * Return a function expect two param contains namespace and map. it will normalize the namespace and then the param's function will handle the new namespace and the map.
             * @param {Function} fn
             * @return {Function}
             */
            function normalizeNamespace (fn) {
              return function (namespace, map) {
                if (typeof namespace !== 'string') {
                  map = namespace;
                  namespace = '';
                } else if (namespace.charAt(namespace.length - 1) !== '/') {
                  namespace += '/';
                }
                return fn(namespace, map)
              }
            }

            /**
             * Search a special module from store by namespace. if module not exist, print error message.
             * @param {Object} store
             * @param {String} helper
             * @param {String} namespace
             * @return {Object}
             */
            function getModuleByNamespace (store, helper, namespace) {
              var module = store._modulesNamespaceMap[namespace];
              if ((process.env.NODE_ENV !== 'production') && !module) {
                console.error(("[vuex] module namespace not found in " + helper + "(): " + namespace));
              }
              return module
            }

            var bind = function bind(fn, thisArg) {
              return function wrap() {
                var args = new Array(arguments.length);
                for (var i = 0; i < args.length; i++) {
                  args[i] = arguments[i];
                }
                return fn.apply(thisArg, args);
              };
            };

            /*global toString:true*/

            // utils is a library of generic helper functions non-specific to axios

            var toString = Object.prototype.toString;

            /**
             * Determine if a value is an Array
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is an Array, otherwise false
             */
            function isArray(val) {
              return toString.call(val) === '[object Array]';
            }

            /**
             * Determine if a value is undefined
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if the value is undefined, otherwise false
             */
            function isUndefined(val) {
              return typeof val === 'undefined';
            }

            /**
             * Determine if a value is a Buffer
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a Buffer, otherwise false
             */
            function isBuffer(val) {
              return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
                && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
            }

            /**
             * Determine if a value is an ArrayBuffer
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is an ArrayBuffer, otherwise false
             */
            function isArrayBuffer(val) {
              return toString.call(val) === '[object ArrayBuffer]';
            }

            /**
             * Determine if a value is a FormData
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is an FormData, otherwise false
             */
            function isFormData(val) {
              return (typeof FormData !== 'undefined') && (val instanceof FormData);
            }

            /**
             * Determine if a value is a view on an ArrayBuffer
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
             */
            function isArrayBufferView(val) {
              var result;
              if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
                result = ArrayBuffer.isView(val);
              } else {
                result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
              }
              return result;
            }

            /**
             * Determine if a value is a String
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a String, otherwise false
             */
            function isString(val) {
              return typeof val === 'string';
            }

            /**
             * Determine if a value is a Number
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a Number, otherwise false
             */
            function isNumber(val) {
              return typeof val === 'number';
            }

            /**
             * Determine if a value is an Object
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is an Object, otherwise false
             */
            function isObject(val) {
              return val !== null && typeof val === 'object';
            }

            /**
             * Determine if a value is a plain Object
             *
             * @param {Object} val The value to test
             * @return {boolean} True if value is a plain Object, otherwise false
             */
            function isPlainObject(val) {
              if (toString.call(val) !== '[object Object]') {
                return false;
              }

              var prototype = Object.getPrototypeOf(val);
              return prototype === null || prototype === Object.prototype;
            }

            /**
             * Determine if a value is a Date
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a Date, otherwise false
             */
            function isDate(val) {
              return toString.call(val) === '[object Date]';
            }

            /**
             * Determine if a value is a File
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a File, otherwise false
             */
            function isFile(val) {
              return toString.call(val) === '[object File]';
            }

            /**
             * Determine if a value is a Blob
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a Blob, otherwise false
             */
            function isBlob(val) {
              return toString.call(val) === '[object Blob]';
            }

            /**
             * Determine if a value is a Function
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a Function, otherwise false
             */
            function isFunction(val) {
              return toString.call(val) === '[object Function]';
            }

            /**
             * Determine if a value is a Stream
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a Stream, otherwise false
             */
            function isStream(val) {
              return isObject(val) && isFunction(val.pipe);
            }

            /**
             * Determine if a value is a URLSearchParams object
             *
             * @param {Object} val The value to test
             * @returns {boolean} True if value is a URLSearchParams object, otherwise false
             */
            function isURLSearchParams(val) {
              return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
            }

            /**
             * Trim excess whitespace off the beginning and end of a string
             *
             * @param {String} str The String to trim
             * @returns {String} The String freed of excess whitespace
             */
            function trim(str) {
              return str.replace(/^\s*/, '').replace(/\s*$/, '');
            }

            /**
             * Determine if we're running in a standard browser environment
             *
             * This allows axios to run in a web worker, and react-native.
             * Both environments support XMLHttpRequest, but not fully standard globals.
             *
             * web workers:
             *  typeof window -> undefined
             *  typeof document -> undefined
             *
             * react-native:
             *  navigator.product -> 'ReactNative'
             * nativescript
             *  navigator.product -> 'NativeScript' or 'NS'
             */
            function isStandardBrowserEnv() {
              if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                                       navigator.product === 'NativeScript' ||
                                                       navigator.product === 'NS')) {
                return false;
              }
              return (
                typeof window !== 'undefined' &&
                typeof document !== 'undefined'
              );
            }

            /**
             * Iterate over an Array or an Object invoking a function for each item.
             *
             * If `obj` is an Array callback will be called passing
             * the value, index, and complete array for each item.
             *
             * If 'obj' is an Object callback will be called passing
             * the value, key, and complete object for each property.
             *
             * @param {Object|Array} obj The object to iterate
             * @param {Function} fn The callback to invoke for each item
             */
            function forEach(obj, fn) {
              // Don't bother if no value provided
              if (obj === null || typeof obj === 'undefined') {
                return;
              }

              // Force an array if not already something iterable
              if (typeof obj !== 'object') {
                /*eslint no-param-reassign:0*/
                obj = [obj];
              }

              if (isArray(obj)) {
                // Iterate over array values
                for (var i = 0, l = obj.length; i < l; i++) {
                  fn.call(null, obj[i], i, obj);
                }
              } else {
                // Iterate over object keys
                for (var key in obj) {
                  if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    fn.call(null, obj[key], key, obj);
                  }
                }
              }
            }

            /**
             * Accepts varargs expecting each argument to be an object, then
             * immutably merges the properties of each object and returns result.
             *
             * When multiple objects contain the same key the later object in
             * the arguments list will take precedence.
             *
             * Example:
             *
             * ```js
             * var result = merge({foo: 123}, {foo: 456});
             * console.log(result.foo); // outputs 456
             * ```
             *
             * @param {Object} obj1 Object to merge
             * @returns {Object} Result of all merge properties
             */
            function merge(/* obj1, obj2, obj3, ... */) {
              var result = {};
              function assignValue(val, key) {
                if (isPlainObject(result[key]) && isPlainObject(val)) {
                  result[key] = merge(result[key], val);
                } else if (isPlainObject(val)) {
                  result[key] = merge({}, val);
                } else if (isArray(val)) {
                  result[key] = val.slice();
                } else {
                  result[key] = val;
                }
              }

              for (var i = 0, l = arguments.length; i < l; i++) {
                forEach(arguments[i], assignValue);
              }
              return result;
            }

            /**
             * Extends object a by mutably adding to it the properties of object b.
             *
             * @param {Object} a The object to be extended
             * @param {Object} b The object to copy properties from
             * @param {Object} thisArg The object to bind function to
             * @return {Object} The resulting value of object a
             */
            function extend(a, b, thisArg) {
              forEach(b, function assignValue(val, key) {
                if (thisArg && typeof val === 'function') {
                  a[key] = bind(val, thisArg);
                } else {
                  a[key] = val;
                }
              });
              return a;
            }

            /**
             * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
             *
             * @param {string} content with BOM
             * @return {string} content value without BOM
             */
            function stripBOM(content) {
              if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
              }
              return content;
            }

            var utils = {
              isArray: isArray,
              isArrayBuffer: isArrayBuffer,
              isBuffer: isBuffer,
              isFormData: isFormData,
              isArrayBufferView: isArrayBufferView,
              isString: isString,
              isNumber: isNumber,
              isObject: isObject,
              isPlainObject: isPlainObject,
              isUndefined: isUndefined,
              isDate: isDate,
              isFile: isFile,
              isBlob: isBlob,
              isFunction: isFunction,
              isStream: isStream,
              isURLSearchParams: isURLSearchParams,
              isStandardBrowserEnv: isStandardBrowserEnv,
              forEach: forEach,
              merge: merge,
              extend: extend,
              trim: trim,
              stripBOM: stripBOM
            };

            function encode(val) {
              return encodeURIComponent(val).
                replace(/%3A/gi, ':').
                replace(/%24/g, '$').
                replace(/%2C/gi, ',').
                replace(/%20/g, '+').
                replace(/%5B/gi, '[').
                replace(/%5D/gi, ']');
            }

            /**
             * Build a URL by appending params to the end
             *
             * @param {string} url The base of the url (e.g., http://www.google.com)
             * @param {object} [params] The params to be appended
             * @returns {string} The formatted url
             */
            var buildURL = function buildURL(url, params, paramsSerializer) {
              /*eslint no-param-reassign:0*/
              if (!params) {
                return url;
              }

              var serializedParams;
              if (paramsSerializer) {
                serializedParams = paramsSerializer(params);
              } else if (utils.isURLSearchParams(params)) {
                serializedParams = params.toString();
              } else {
                var parts = [];

                utils.forEach(params, function serialize(val, key) {
                  if (val === null || typeof val === 'undefined') {
                    return;
                  }

                  if (utils.isArray(val)) {
                    key = key + '[]';
                  } else {
                    val = [val];
                  }

                  utils.forEach(val, function parseValue(v) {
                    if (utils.isDate(v)) {
                      v = v.toISOString();
                    } else if (utils.isObject(v)) {
                      v = JSON.stringify(v);
                    }
                    parts.push(encode(key) + '=' + encode(v));
                  });
                });

                serializedParams = parts.join('&');
              }

              if (serializedParams) {
                var hashmarkIndex = url.indexOf('#');
                if (hashmarkIndex !== -1) {
                  url = url.slice(0, hashmarkIndex);
                }

                url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
              }

              return url;
            };

            function InterceptorManager() {
              this.handlers = [];
            }

            /**
             * Add a new interceptor to the stack
             *
             * @param {Function} fulfilled The function to handle `then` for a `Promise`
             * @param {Function} rejected The function to handle `reject` for a `Promise`
             *
             * @return {Number} An ID used to remove interceptor later
             */
            InterceptorManager.prototype.use = function use(fulfilled, rejected) {
              this.handlers.push({
                fulfilled: fulfilled,
                rejected: rejected
              });
              return this.handlers.length - 1;
            };

            /**
             * Remove an interceptor from the stack
             *
             * @param {Number} id The ID that was returned by `use`
             */
            InterceptorManager.prototype.eject = function eject(id) {
              if (this.handlers[id]) {
                this.handlers[id] = null;
              }
            };

            /**
             * Iterate over all the registered interceptors
             *
             * This method is particularly useful for skipping over any
             * interceptors that may have become `null` calling `eject`.
             *
             * @param {Function} fn The function to call for each interceptor
             */
            InterceptorManager.prototype.forEach = function forEach(fn) {
              utils.forEach(this.handlers, function forEachHandler(h) {
                if (h !== null) {
                  fn(h);
                }
              });
            };

            var InterceptorManager_1 = InterceptorManager;

            /**
             * Transform the data for a request or a response
             *
             * @param {Object|String} data The data to be transformed
             * @param {Array} headers The headers for the request or response
             * @param {Array|Function} fns A single function or Array of functions
             * @returns {*} The resulting transformed data
             */
            var transformData = function transformData(data, headers, fns) {
              /*eslint no-param-reassign:0*/
              utils.forEach(fns, function transform(fn) {
                data = fn(data, headers);
              });

              return data;
            };

            var isCancel = function isCancel(value) {
              return !!(value && value.__CANCEL__);
            };

            var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
              utils.forEach(headers, function processHeader(value, name) {
                if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
                  headers[normalizedName] = value;
                  delete headers[name];
                }
              });
            };

            /**
             * Update an Error with the specified config, error code, and response.
             *
             * @param {Error} error The error to update.
             * @param {Object} config The config.
             * @param {string} [code] The error code (for example, 'ECONNABORTED').
             * @param {Object} [request] The request.
             * @param {Object} [response] The response.
             * @returns {Error} The error.
             */
            var enhanceError = function enhanceError(error, config, code, request, response) {
              error.config = config;
              if (code) {
                error.code = code;
              }

              error.request = request;
              error.response = response;
              error.isAxiosError = true;

              error.toJSON = function toJSON() {
                return {
                  // Standard
                  message: this.message,
                  name: this.name,
                  // Microsoft
                  description: this.description,
                  number: this.number,
                  // Mozilla
                  fileName: this.fileName,
                  lineNumber: this.lineNumber,
                  columnNumber: this.columnNumber,
                  stack: this.stack,
                  // Axios
                  config: this.config,
                  code: this.code
                };
              };
              return error;
            };

            /**
             * Create an Error with the specified message, config, error code, request and response.
             *
             * @param {string} message The error message.
             * @param {Object} config The config.
             * @param {string} [code] The error code (for example, 'ECONNABORTED').
             * @param {Object} [request] The request.
             * @param {Object} [response] The response.
             * @returns {Error} The created error.
             */
            var createError = function createError(message, config, code, request, response) {
              var error = new Error(message);
              return enhanceError(error, config, code, request, response);
            };

            /**
             * Resolve or reject a Promise based on response status.
             *
             * @param {Function} resolve A function that resolves the promise.
             * @param {Function} reject A function that rejects the promise.
             * @param {object} response The response.
             */
            var settle = function settle(resolve, reject, response) {
              var validateStatus = response.config.validateStatus;
              if (!response.status || !validateStatus || validateStatus(response.status)) {
                resolve(response);
              } else {
                reject(createError(
                  'Request failed with status code ' + response.status,
                  response.config,
                  null,
                  response.request,
                  response
                ));
              }
            };

            var cookies = (
              utils.isStandardBrowserEnv() ?

              // Standard browser envs support document.cookie
                (function standardBrowserEnv() {
                  return {
                    write: function write(name, value, expires, path, domain, secure) {
                      var cookie = [];
                      cookie.push(name + '=' + encodeURIComponent(value));

                      if (utils.isNumber(expires)) {
                        cookie.push('expires=' + new Date(expires).toGMTString());
                      }

                      if (utils.isString(path)) {
                        cookie.push('path=' + path);
                      }

                      if (utils.isString(domain)) {
                        cookie.push('domain=' + domain);
                      }

                      if (secure === true) {
                        cookie.push('secure');
                      }

                      document.cookie = cookie.join('; ');
                    },

                    read: function read(name) {
                      var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
                      return (match ? decodeURIComponent(match[3]) : null);
                    },

                    remove: function remove(name) {
                      this.write(name, '', Date.now() - 86400000);
                    }
                  };
                })() :

              // Non standard browser env (web workers, react-native) lack needed support.
                (function nonStandardBrowserEnv() {
                  return {
                    write: function write() {},
                    read: function read() { return null; },
                    remove: function remove() {}
                  };
                })()
            );

            /**
             * Determines whether the specified URL is absolute
             *
             * @param {string} url The URL to test
             * @returns {boolean} True if the specified URL is absolute, otherwise false
             */
            var isAbsoluteURL = function isAbsoluteURL(url) {
              // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
              // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
              // by any combination of letters, digits, plus, period, or hyphen.
              return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
            };

            /**
             * Creates a new URL by combining the specified URLs
             *
             * @param {string} baseURL The base URL
             * @param {string} relativeURL The relative URL
             * @returns {string} The combined URL
             */
            var combineURLs = function combineURLs(baseURL, relativeURL) {
              return relativeURL
                ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
                : baseURL;
            };

            /**
             * Creates a new URL by combining the baseURL with the requestedURL,
             * only when the requestedURL is not already an absolute URL.
             * If the requestURL is absolute, this function returns the requestedURL untouched.
             *
             * @param {string} baseURL The base URL
             * @param {string} requestedURL Absolute or relative URL to combine
             * @returns {string} The combined full path
             */
            var buildFullPath = function buildFullPath(baseURL, requestedURL) {
              if (baseURL && !isAbsoluteURL(requestedURL)) {
                return combineURLs(baseURL, requestedURL);
              }
              return requestedURL;
            };

            // Headers whose duplicates are ignored by node
            // c.f. https://nodejs.org/api/http.html#http_message_headers
            var ignoreDuplicateOf = [
              'age', 'authorization', 'content-length', 'content-type', 'etag',
              'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
              'last-modified', 'location', 'max-forwards', 'proxy-authorization',
              'referer', 'retry-after', 'user-agent'
            ];

            /**
             * Parse headers into an object
             *
             * ```
             * Date: Wed, 27 Aug 2014 08:58:49 GMT
             * Content-Type: application/json
             * Connection: keep-alive
             * Transfer-Encoding: chunked
             * ```
             *
             * @param {String} headers Headers needing to be parsed
             * @returns {Object} Headers parsed into an object
             */
            var parseHeaders = function parseHeaders(headers) {
              var parsed = {};
              var key;
              var val;
              var i;

              if (!headers) { return parsed; }

              utils.forEach(headers.split('\n'), function parser(line) {
                i = line.indexOf(':');
                key = utils.trim(line.substr(0, i)).toLowerCase();
                val = utils.trim(line.substr(i + 1));

                if (key) {
                  if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
                    return;
                  }
                  if (key === 'set-cookie') {
                    parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
                  } else {
                    parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
                  }
                }
              });

              return parsed;
            };

            var isURLSameOrigin = (
              utils.isStandardBrowserEnv() ?

              // Standard browser envs have full support of the APIs needed to test
              // whether the request URL is of the same origin as current location.
                (function standardBrowserEnv() {
                  var msie = /(msie|trident)/i.test(navigator.userAgent);
                  var urlParsingNode = document.createElement('a');
                  var originURL;

                  /**
                * Parse a URL to discover it's components
                *
                * @param {String} url The URL to be parsed
                * @returns {Object}
                */
                  function resolveURL(url) {
                    var href = url;

                    if (msie) {
                    // IE needs attribute set twice to normalize properties
                      urlParsingNode.setAttribute('href', href);
                      href = urlParsingNode.href;
                    }

                    urlParsingNode.setAttribute('href', href);

                    // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
                    return {
                      href: urlParsingNode.href,
                      protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
                      host: urlParsingNode.host,
                      search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
                      hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
                      hostname: urlParsingNode.hostname,
                      port: urlParsingNode.port,
                      pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                        urlParsingNode.pathname :
                        '/' + urlParsingNode.pathname
                    };
                  }

                  originURL = resolveURL(window.location.href);

                  /**
                * Determine if a URL shares the same origin as the current location
                *
                * @param {String} requestURL The URL to test
                * @returns {boolean} True if URL shares the same origin, otherwise false
                */
                  return function isURLSameOrigin(requestURL) {
                    var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
                    return (parsed.protocol === originURL.protocol &&
                        parsed.host === originURL.host);
                  };
                })() :

              // Non standard browser envs (web workers, react-native) lack needed support.
                (function nonStandardBrowserEnv() {
                  return function isURLSameOrigin() {
                    return true;
                  };
                })()
            );

            var xhr = function xhrAdapter(config) {
              return new Promise(function dispatchXhrRequest(resolve, reject) {
                var requestData = config.data;
                var requestHeaders = config.headers;

                if (utils.isFormData(requestData)) {
                  delete requestHeaders['Content-Type']; // Let the browser set it
                }

                var request = new XMLHttpRequest();

                // HTTP basic authentication
                if (config.auth) {
                  var username = config.auth.username || '';
                  var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
                  requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
                }

                var fullPath = buildFullPath(config.baseURL, config.url);
                request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

                // Set the request timeout in MS
                request.timeout = config.timeout;

                // Listen for ready state
                request.onreadystatechange = function handleLoad() {
                  if (!request || request.readyState !== 4) {
                    return;
                  }

                  // The request errored out and we didn't get a response, this will be
                  // handled by onerror instead
                  // With one exception: request that using file: protocol, most browsers
                  // will return status as 0 even though it's a successful request
                  if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
                    return;
                  }

                  // Prepare the response
                  var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
                  var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
                  var response = {
                    data: responseData,
                    status: request.status,
                    statusText: request.statusText,
                    headers: responseHeaders,
                    config: config,
                    request: request
                  };

                  settle(resolve, reject, response);

                  // Clean up request
                  request = null;
                };

                // Handle browser request cancellation (as opposed to a manual cancellation)
                request.onabort = function handleAbort() {
                  if (!request) {
                    return;
                  }

                  reject(createError('Request aborted', config, 'ECONNABORTED', request));

                  // Clean up request
                  request = null;
                };

                // Handle low level network errors
                request.onerror = function handleError() {
                  // Real errors are hidden from us by the browser
                  // onerror should only fire if it's a network error
                  reject(createError('Network Error', config, null, request));

                  // Clean up request
                  request = null;
                };

                // Handle timeout
                request.ontimeout = function handleTimeout() {
                  var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
                  if (config.timeoutErrorMessage) {
                    timeoutErrorMessage = config.timeoutErrorMessage;
                  }
                  reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
                    request));

                  // Clean up request
                  request = null;
                };

                // Add xsrf header
                // This is only done if running in a standard browser environment.
                // Specifically not if we're in a web worker, or react-native.
                if (utils.isStandardBrowserEnv()) {
                  // Add xsrf header
                  var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
                    cookies.read(config.xsrfCookieName) :
                    undefined;

                  if (xsrfValue) {
                    requestHeaders[config.xsrfHeaderName] = xsrfValue;
                  }
                }

                // Add headers to the request
                if ('setRequestHeader' in request) {
                  utils.forEach(requestHeaders, function setRequestHeader(val, key) {
                    if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
                      // Remove Content-Type if data is undefined
                      delete requestHeaders[key];
                    } else {
                      // Otherwise add header to the request
                      request.setRequestHeader(key, val);
                    }
                  });
                }

                // Add withCredentials to request if needed
                if (!utils.isUndefined(config.withCredentials)) {
                  request.withCredentials = !!config.withCredentials;
                }

                // Add responseType to request if needed
                if (config.responseType) {
                  try {
                    request.responseType = config.responseType;
                  } catch (e) {
                    // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
                    // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
                    if (config.responseType !== 'json') {
                      throw e;
                    }
                  }
                }

                // Handle progress if needed
                if (typeof config.onDownloadProgress === 'function') {
                  request.addEventListener('progress', config.onDownloadProgress);
                }

                // Not all browsers support upload events
                if (typeof config.onUploadProgress === 'function' && request.upload) {
                  request.upload.addEventListener('progress', config.onUploadProgress);
                }

                if (config.cancelToken) {
                  // Handle cancellation
                  config.cancelToken.promise.then(function onCanceled(cancel) {
                    if (!request) {
                      return;
                    }

                    request.abort();
                    reject(cancel);
                    // Clean up request
                    request = null;
                  });
                }

                if (!requestData) {
                  requestData = null;
                }

                // Send the request
                request.send(requestData);
              });
            };

            var DEFAULT_CONTENT_TYPE = {
              'Content-Type': 'application/x-www-form-urlencoded'
            };

            function setContentTypeIfUnset(headers, value) {
              if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
                headers['Content-Type'] = value;
              }
            }

            function getDefaultAdapter() {
              var adapter;
              if (typeof XMLHttpRequest !== 'undefined') {
                // For browsers use XHR adapter
                adapter = xhr;
              } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
                // For node use HTTP adapter
                adapter = xhr;
              }
              return adapter;
            }

            var defaults = {
              adapter: getDefaultAdapter(),

              transformRequest: [function transformRequest(data, headers) {
                normalizeHeaderName(headers, 'Accept');
                normalizeHeaderName(headers, 'Content-Type');
                if (utils.isFormData(data) ||
                  utils.isArrayBuffer(data) ||
                  utils.isBuffer(data) ||
                  utils.isStream(data) ||
                  utils.isFile(data) ||
                  utils.isBlob(data)
                ) {
                  return data;
                }
                if (utils.isArrayBufferView(data)) {
                  return data.buffer;
                }
                if (utils.isURLSearchParams(data)) {
                  setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
                  return data.toString();
                }
                if (utils.isObject(data)) {
                  setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
                  return JSON.stringify(data);
                }
                return data;
              }],

              transformResponse: [function transformResponse(data) {
                /*eslint no-param-reassign:0*/
                if (typeof data === 'string') {
                  try {
                    data = JSON.parse(data);
                  } catch (e) { /* Ignore */ }
                }
                return data;
              }],

              /**
               * A timeout in milliseconds to abort a request. If set to 0 (default) a
               * timeout is not created.
               */
              timeout: 0,

              xsrfCookieName: 'XSRF-TOKEN',
              xsrfHeaderName: 'X-XSRF-TOKEN',

              maxContentLength: -1,
              maxBodyLength: -1,

              validateStatus: function validateStatus(status) {
                return status >= 200 && status < 300;
              }
            };

            defaults.headers = {
              common: {
                'Accept': 'application/json, text/plain, */*'
              }
            };

            utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
              defaults.headers[method] = {};
            });

            utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
              defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
            });

            var defaults_1 = defaults;

            /**
             * Throws a `Cancel` if cancellation has been requested.
             */
            function throwIfCancellationRequested(config) {
              if (config.cancelToken) {
                config.cancelToken.throwIfRequested();
              }
            }

            /**
             * Dispatch a request to the server using the configured adapter.
             *
             * @param {object} config The config that is to be used for the request
             * @returns {Promise} The Promise to be fulfilled
             */
            var dispatchRequest = function dispatchRequest(config) {
              throwIfCancellationRequested(config);

              // Ensure headers exist
              config.headers = config.headers || {};

              // Transform request data
              config.data = transformData(
                config.data,
                config.headers,
                config.transformRequest
              );

              // Flatten headers
              config.headers = utils.merge(
                config.headers.common || {},
                config.headers[config.method] || {},
                config.headers
              );

              utils.forEach(
                ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
                function cleanHeaderConfig(method) {
                  delete config.headers[method];
                }
              );

              var adapter = config.adapter || defaults_1.adapter;

              return adapter(config).then(function onAdapterResolution(response) {
                throwIfCancellationRequested(config);

                // Transform response data
                response.data = transformData(
                  response.data,
                  response.headers,
                  config.transformResponse
                );

                return response;
              }, function onAdapterRejection(reason) {
                if (!isCancel(reason)) {
                  throwIfCancellationRequested(config);

                  // Transform response data
                  if (reason && reason.response) {
                    reason.response.data = transformData(
                      reason.response.data,
                      reason.response.headers,
                      config.transformResponse
                    );
                  }
                }

                return Promise.reject(reason);
              });
            };

            /**
             * Config-specific merge-function which creates a new config-object
             * by merging two configuration objects together.
             *
             * @param {Object} config1
             * @param {Object} config2
             * @returns {Object} New object resulting from merging config2 to config1
             */
            var mergeConfig = function mergeConfig(config1, config2) {
              // eslint-disable-next-line no-param-reassign
              config2 = config2 || {};
              var config = {};

              var valueFromConfig2Keys = ['url', 'method', 'data'];
              var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
              var defaultToConfig2Keys = [
                'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
                'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
                'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
                'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
                'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
              ];
              var directMergeKeys = ['validateStatus'];

              function getMergedValue(target, source) {
                if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
                  return utils.merge(target, source);
                } else if (utils.isPlainObject(source)) {
                  return utils.merge({}, source);
                } else if (utils.isArray(source)) {
                  return source.slice();
                }
                return source;
              }

              function mergeDeepProperties(prop) {
                if (!utils.isUndefined(config2[prop])) {
                  config[prop] = getMergedValue(config1[prop], config2[prop]);
                } else if (!utils.isUndefined(config1[prop])) {
                  config[prop] = getMergedValue(undefined, config1[prop]);
                }
              }

              utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
                if (!utils.isUndefined(config2[prop])) {
                  config[prop] = getMergedValue(undefined, config2[prop]);
                }
              });

              utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

              utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
                if (!utils.isUndefined(config2[prop])) {
                  config[prop] = getMergedValue(undefined, config2[prop]);
                } else if (!utils.isUndefined(config1[prop])) {
                  config[prop] = getMergedValue(undefined, config1[prop]);
                }
              });

              utils.forEach(directMergeKeys, function merge(prop) {
                if (prop in config2) {
                  config[prop] = getMergedValue(config1[prop], config2[prop]);
                } else if (prop in config1) {
                  config[prop] = getMergedValue(undefined, config1[prop]);
                }
              });

              var axiosKeys = valueFromConfig2Keys
                .concat(mergeDeepPropertiesKeys)
                .concat(defaultToConfig2Keys)
                .concat(directMergeKeys);

              var otherKeys = Object
                .keys(config1)
                .concat(Object.keys(config2))
                .filter(function filterAxiosKeys(key) {
                  return axiosKeys.indexOf(key) === -1;
                });

              utils.forEach(otherKeys, mergeDeepProperties);

              return config;
            };

            /**
             * Create a new instance of Axios
             *
             * @param {Object} instanceConfig The default config for the instance
             */
            function Axios(instanceConfig) {
              this.defaults = instanceConfig;
              this.interceptors = {
                request: new InterceptorManager_1(),
                response: new InterceptorManager_1()
              };
            }

            /**
             * Dispatch a request
             *
             * @param {Object} config The config specific for this request (merged with this.defaults)
             */
            Axios.prototype.request = function request(config) {
              /*eslint no-param-reassign:0*/
              // Allow for axios('example/url'[, config]) a la fetch API
              if (typeof config === 'string') {
                config = arguments[1] || {};
                config.url = arguments[0];
              } else {
                config = config || {};
              }

              config = mergeConfig(this.defaults, config);

              // Set config.method
              if (config.method) {
                config.method = config.method.toLowerCase();
              } else if (this.defaults.method) {
                config.method = this.defaults.method.toLowerCase();
              } else {
                config.method = 'get';
              }

              // Hook up interceptors middleware
              var chain = [dispatchRequest, undefined];
              var promise = Promise.resolve(config);

              this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
                chain.unshift(interceptor.fulfilled, interceptor.rejected);
              });

              this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
                chain.push(interceptor.fulfilled, interceptor.rejected);
              });

              while (chain.length) {
                promise = promise.then(chain.shift(), chain.shift());
              }

              return promise;
            };

            Axios.prototype.getUri = function getUri(config) {
              config = mergeConfig(this.defaults, config);
              return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
            };

            // Provide aliases for supported request methods
            utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
              /*eslint func-names:0*/
              Axios.prototype[method] = function(url, config) {
                return this.request(mergeConfig(config || {}, {
                  method: method,
                  url: url,
                  data: (config || {}).data
                }));
              };
            });

            utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
              /*eslint func-names:0*/
              Axios.prototype[method] = function(url, data, config) {
                return this.request(mergeConfig(config || {}, {
                  method: method,
                  url: url,
                  data: data
                }));
              };
            });

            var Axios_1 = Axios;

            /**
             * A `Cancel` is an object that is thrown when an operation is canceled.
             *
             * @class
             * @param {string=} message The message.
             */
            function Cancel(message) {
              this.message = message;
            }

            Cancel.prototype.toString = function toString() {
              return 'Cancel' + (this.message ? ': ' + this.message : '');
            };

            Cancel.prototype.__CANCEL__ = true;

            var Cancel_1 = Cancel;

            /**
             * A `CancelToken` is an object that can be used to request cancellation of an operation.
             *
             * @class
             * @param {Function} executor The executor function.
             */
            function CancelToken(executor) {
              if (typeof executor !== 'function') {
                throw new TypeError('executor must be a function.');
              }

              var resolvePromise;
              this.promise = new Promise(function promiseExecutor(resolve) {
                resolvePromise = resolve;
              });

              var token = this;
              executor(function cancel(message) {
                if (token.reason) {
                  // Cancellation has already been requested
                  return;
                }

                token.reason = new Cancel_1(message);
                resolvePromise(token.reason);
              });
            }

            /**
             * Throws a `Cancel` if cancellation has been requested.
             */
            CancelToken.prototype.throwIfRequested = function throwIfRequested() {
              if (this.reason) {
                throw this.reason;
              }
            };

            /**
             * Returns an object that contains a new `CancelToken` and a function that, when called,
             * cancels the `CancelToken`.
             */
            CancelToken.source = function source() {
              var cancel;
              var token = new CancelToken(function executor(c) {
                cancel = c;
              });
              return {
                token: token,
                cancel: cancel
              };
            };

            var CancelToken_1 = CancelToken;

            /**
             * Syntactic sugar for invoking a function and expanding an array for arguments.
             *
             * Common use case would be to use `Function.prototype.apply`.
             *
             *  ```js
             *  function f(x, y, z) {}
             *  var args = [1, 2, 3];
             *  f.apply(null, args);
             *  ```
             *
             * With `spread` this example can be re-written.
             *
             *  ```js
             *  spread(function(x, y, z) {})([1, 2, 3]);
             *  ```
             *
             * @param {Function} callback
             * @returns {Function}
             */
            var spread = function spread(callback) {
              return function wrap(arr) {
                return callback.apply(null, arr);
              };
            };

            /**
             * Determines whether the payload is an error thrown by Axios
             *
             * @param {*} payload The value to test
             * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
             */
            var isAxiosError = function isAxiosError(payload) {
              return (typeof payload === 'object') && (payload.isAxiosError === true);
            };

            /**
             * Create an instance of Axios
             *
             * @param {Object} defaultConfig The default config for the instance
             * @return {Axios} A new instance of Axios
             */
            function createInstance(defaultConfig) {
              var context = new Axios_1(defaultConfig);
              var instance = bind(Axios_1.prototype.request, context);

              // Copy axios.prototype to instance
              utils.extend(instance, Axios_1.prototype, context);

              // Copy context to instance
              utils.extend(instance, context);

              return instance;
            }

            // Create the default instance to be exported
            var axios$1 = createInstance(defaults_1);

            // Expose Axios class to allow class inheritance
            axios$1.Axios = Axios_1;

            // Factory for creating new instances
            axios$1.create = function create(instanceConfig) {
              return createInstance(mergeConfig(axios$1.defaults, instanceConfig));
            };

            // Expose Cancel & CancelToken
            axios$1.Cancel = Cancel_1;
            axios$1.CancelToken = CancelToken_1;
            axios$1.isCancel = isCancel;

            // Expose all/spread
            axios$1.all = function all(promises) {
              return Promise.all(promises);
            };
            axios$1.spread = spread;

            // Expose isAxiosError
            axios$1.isAxiosError = isAxiosError;

            var axios_1 = axios$1;

            // Allow use of default import syntax in TypeScript
            var _default = axios$1;
            axios_1.default = _default;

            var axios = axios_1;

            //
            var script = {
              data: () => ({
                mode: "edit",
                fileId: null,
                filePath: null,
                config: null,
                docEditor: null
              }),

              created() {
                this.mode = this.$route.params.mode;
                this.fileId = this.$route.params.fileId;
                this.filePath = this.$route.params.filePath;
              },

              methods: { ...mapActions(["showMessage"]),

                messageDisplay(desc, status = "danger", title = "") {
                  this.showMessage({
                    title: title,
                    desc: desc,
                    status: status,
                    autoClose: {
                      enabled: true
                    }
                  });
                },

                onRequestClose() {
                  let params = {
                    item: null
                  };

                  if (this.currentFolder) {
                    params.item = this.currentFolder.path;
                  }

                  this.$router.push({
                    name: "files-personal",
                    params
                  });
                },

                getDocumentServerUrl() {
                  return axios({
                    method: "GET",
                    url: this.configuration.server + "ocs/v2.php/apps/onlyoffice/api/v1/settings/docserver",
                    headers: {
                      authorization: "Bearer " + this.getToken
                    }
                  }).then(response => {
                    if (!response.data.documentServerUrl) {
                      throw "ONLYOFFICE app is not configured. Please contact admin";
                    }

                    return response.data.documentServerUrl;
                  });
                },

                create() {
                  return new Promise((resolve, reject) => {
                    if (this.mode != "create") {
                      resolve();
                      return;
                    }

                    axios({
                      method: "GET",
                      url: this.configuration.server + "ocs/v2.php/apps/onlyoffice/api/v1/empty/" + this.fileId,
                      headers: {
                        authorization: "Bearer " + this.getToken
                      }
                    }).then(response => {
                      if (response.data.error) {
                        reject(response.data.error);
                        return;
                      }

                      resolve();
                    });
                  });
                },

                initConfig() {
                  return axios({
                    method: "GET",
                    url: this.configuration.server + "ocs/v2.php/apps/onlyoffice/api/v1/config/" + this.fileId,
                    headers: {
                      authorization: "Bearer " + this.getToken
                    }
                  }).then(response => {
                    if (response.data.error) {
                      throw response.data.error;
                    }

                    this.config = response.data;
                    let events = [];
                    events["onRequestClose"] = this.onRequestClose;
                    this.config.editorConfig.customization.goback.requestClose = true;
                    this.config.events = events;
                    this.docEditor = new DocsAPI.DocEditor("iframeEditor", this.config);
                  });
                }

              },
              computed: { ...mapGetters(["getToken", "configuration", "apps"]),
                ...mapGetters("Files", ["currentFolder"])
              },

              mounted() {
                this.create().then(() => {
                  return this.getDocumentServerUrl();
                }).then(documentServerUrl => {
                  let iframeEditor = document.getElementById("iframeEditor");
                  let docApi = document.createElement("script");
                  docApi.setAttribute("src", documentServerUrl + "web-apps/apps/api/documents/api.js");
                  iframeEditor.appendChild(docApi);
                  return this.initConfig();
                }).catch(error => {
                  this.messageDisplay(error);
                  this.onRequestClose();
                });
              }

            };

            function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
                if (typeof shadowMode !== 'boolean') {
                    createInjectorSSR = createInjector;
                    createInjector = shadowMode;
                    shadowMode = false;
                }
                // Vue.extend constructor export interop.
                const options = typeof script === 'function' ? script.options : script;
                // render functions
                if (template && template.render) {
                    options.render = template.render;
                    options.staticRenderFns = template.staticRenderFns;
                    options._compiled = true;
                    // functional template
                    if (isFunctionalTemplate) {
                        options.functional = true;
                    }
                }
                // scopedId
                if (scopeId) {
                    options._scopeId = scopeId;
                }
                let hook;
                if (moduleIdentifier) {
                    // server build
                    hook = function (context) {
                        // 2.3 injection
                        context =
                            context || // cached call
                                (this.$vnode && this.$vnode.ssrContext) || // stateful
                                (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
                        // 2.2 with runInNewContext: true
                        if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                            context = __VUE_SSR_CONTEXT__;
                        }
                        // inject component styles
                        if (style) {
                            style.call(this, createInjectorSSR(context));
                        }
                        // register component module identifier for async chunk inference
                        if (context && context._registeredComponents) {
                            context._registeredComponents.add(moduleIdentifier);
                        }
                    };
                    // used by ssr in case component is cached and beforeCreate
                    // never gets called
                    options._ssrRegister = hook;
                }
                else if (style) {
                    hook = shadowMode
                        ? function (context) {
                            style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
                        }
                        : function (context) {
                            style.call(this, createInjector(context));
                        };
                }
                if (hook) {
                    if (options.functional) {
                        // register for functional component in vue file
                        const originalRender = options.render;
                        options.render = function renderWithStyleInjection(h, context) {
                            hook.call(context);
                            return originalRender(h, context);
                        };
                    }
                    else {
                        // inject component registration as beforeCreate hook
                        const existing = options.beforeCreate;
                        options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
                    }
                }
                return script;
            }

            const isOldIE = typeof navigator !== 'undefined' &&
                /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
            function createInjector(context) {
                return (id, style) => addStyle(id, style);
            }
            let HEAD;
            const styles = {};
            function addStyle(id, css) {
                const group = isOldIE ? css.media || 'default' : id;
                const style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
                if (!style.ids.has(id)) {
                    style.ids.add(id);
                    let code = css.source;
                    if (css.map) {
                        // https://developer.chrome.com/devtools/docs/javascript-debugging
                        // this makes source maps inside style tags work properly in Chrome
                        code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
                        // http://stackoverflow.com/a/26603875
                        code +=
                            '\n/*# sourceMappingURL=data:application/json;base64,' +
                                btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                                ' */';
                    }
                    if (!style.element) {
                        style.element = document.createElement('style');
                        style.element.type = 'text/css';
                        if (css.media)
                            style.element.setAttribute('media', css.media);
                        if (HEAD === undefined) {
                            HEAD = document.head || document.getElementsByTagName('head')[0];
                        }
                        HEAD.appendChild(style.element);
                    }
                    if ('styleSheet' in style.element) {
                        style.styles.push(code);
                        style.element.styleSheet.cssText = style.styles
                            .filter(Boolean)
                            .join('\n');
                    }
                    else {
                        const index = style.ids.size - 1;
                        const textNode = document.createTextNode(code);
                        const nodes = style.element.childNodes;
                        if (nodes[index])
                            style.element.removeChild(nodes[index]);
                        if (nodes.length)
                            style.element.insertBefore(textNode, nodes[index]);
                        else
                            style.element.appendChild(textNode);
                    }
                }
            }

            /* script */
            const __vue_script__ = script;

            /* template */
            var __vue_render__ = function() {
              var _vm = this;
              var _h = _vm.$createElement;
              _vm._self._c || _h;
              return _vm._m(0)
            };
            var __vue_staticRenderFns__ = [
              function() {
                var _vm = this;
                var _h = _vm.$createElement;
                var _c = _vm._self._c || _h;
                return _c("main", [
                  _c("div", { attrs: { id: "app" } }, [
                    _c("div", { attrs: { id: "iframeEditor" } })
                  ])
                ])
              }
            ];
            __vue_render__._withStripped = true;

              /* style */
              const __vue_inject_styles__ = function (inject) {
                if (!inject) return
                inject("data-v-404880d3_0", { source: "\n#app {\n    width: 100%;\n}\n#app > iframe {\n    position: absolute;\n}\n", map: {"version":3,"sources":["D:\\onlyoffice-owncloud-web\\src\\editor.vue"],"names":[],"mappings":";AAoJA;IACA,WAAA;AACA;AACA;IACA,kBAAA;AACA","file":"editor.vue","sourcesContent":["<template>\r\n  <main>\r\n    <div id=\"app\">\r\n        <div id=\"iframeEditor\" />\r\n    </div>\r\n  </main>\r\n</template>\r\n\r\n<script>\r\nimport { mapActions, mapGetters } from \"vuex\"\r\nimport axios from \"axios\"\r\n\r\nexport default {\r\n    data: () => ({\r\n        mode: \"edit\",\r\n        fileId: null,\r\n        filePath: null,\r\n        config: null,\r\n        docEditor: null\r\n    }),\r\n\r\n    created() {\r\n        this.mode = this.$route.params.mode;\r\n        this.fileId = this.$route.params.fileId;\r\n        this.filePath = this.$route.params.filePath;\r\n\r\n    },\r\n\r\n    methods: {\r\n        ...mapActions([\"showMessage\"]),\r\n\r\n        messageDisplay(desc, status = \"danger\", title = \"\") {\r\n            this.showMessage({\r\n                title: title,\r\n                desc: desc,\r\n                status: status,\r\n                autoClose: {\r\n                    enabled: true\r\n                }\r\n            })\r\n        },\r\n\r\n        onRequestClose() {\r\n            let params = {item: null};\r\n            if (this.currentFolder) {\r\n                params.item = this.currentFolder.path;\r\n            }\r\n\r\n            this.$router.push({name: \"files-personal\", params});\r\n        },\r\n\r\n        getDocumentServerUrl() {\r\n            return axios({\r\n                        method: \"GET\",\r\n                        url: this.configuration.server + \"ocs/v2.php/apps/onlyoffice/api/v1/settings/docserver\",\r\n                        headers: {\r\n                            authorization: \"Bearer \" + this.getToken\r\n                        }\r\n                    })\r\n                    .then(response => {\r\n                        if (!response.data.documentServerUrl) {\r\n                            throw(\"ONLYOFFICE app is not configured. Please contact admin\");\r\n                        }\r\n\r\n                        return response.data.documentServerUrl;\r\n                    })\r\n\r\n        },\r\n\r\n        create() {\r\n            return new Promise((resolve, reject) => {\r\n                if (this.mode != \"create\") {\r\n                    resolve();\r\n                    return;\r\n                }\r\n\r\n                axios({\r\n                        method: \"GET\",\r\n                        url: this.configuration.server + \"ocs/v2.php/apps/onlyoffice/api/v1/empty/\" + this.fileId,\r\n                        headers: {\r\n                            authorization: \"Bearer \" + this.getToken\r\n                        }\r\n                    })\r\n                    .then(response => {\r\n                        if (response.data.error) {\r\n                            reject(response.data.error);\r\n                            return;\r\n                        }\r\n\r\n                        resolve();\r\n                    })\r\n            })\r\n        },\r\n\r\n        initConfig() {\r\n            return axios({\r\n                        method: \"GET\",\r\n                        url: this.configuration.server + \"ocs/v2.php/apps/onlyoffice/api/v1/config/\" + this.fileId,\r\n                        headers: {\r\n                            authorization: \"Bearer \" + this.getToken\r\n                        }\r\n                    })\r\n                    .then(response => {\r\n                        if (response.data.error) {\r\n                            throw(response.data.error);\r\n                        }\r\n\r\n                        this.config = response.data;\r\n\r\n                        let events = [];\r\n                        events[\"onRequestClose\"] = this.onRequestClose;\r\n\r\n                        this.config.editorConfig.customization.goback.requestClose = true;\r\n\r\n                        this.config.events = events;\r\n                        this.docEditor = new DocsAPI.DocEditor(\"iframeEditor\", this.config);\r\n                    });\r\n        }\r\n    },\r\n\r\n    computed: {\r\n        ...mapGetters([\"getToken\", \"configuration\", \"apps\"]),\r\n        ...mapGetters(\"Files\", [\"currentFolder\"]),\r\n    },\r\n\r\n    mounted() {\r\n        this.create()\r\n        .then(() => {\r\n            return this.getDocumentServerUrl();\r\n        })\r\n        .then((documentServerUrl) => {\r\n            let iframeEditor = document.getElementById(\"iframeEditor\");\r\n            let docApi = document.createElement(\"script\");\r\n\r\n            docApi.setAttribute(\"src\", documentServerUrl + \"web-apps/apps/api/documents/api.js\");\r\n            iframeEditor.appendChild(docApi);\r\n\r\n            return this.initConfig();\r\n        })\r\n        .catch((error) => {\r\n            this.messageDisplay(error);\r\n            this.onRequestClose();\r\n        })\r\n    }\r\n}\r\n</script>\r\n\r\n<style>\r\n    #app {\r\n        width: 100%;\r\n    }\r\n    #app > iframe {\r\n        position: absolute;\r\n    }\r\n</style>"]}, media: undefined });

              };
              /* scoped */
              const __vue_scope_id__ = undefined;
              /* module identifier */
              const __vue_module_identifier__ = undefined;
              /* functional template */
              const __vue_is_functional_template__ = false;
              /* style inject SSR */
              
              /* style inject shadow dom */
              

              
              const __vue_component__ = /*#__PURE__*/normalizeComponent(
                { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
                __vue_inject_styles__,
                __vue_script__,
                __vue_scope_id__,
                __vue_is_functional_template__,
                __vue_module_identifier__,
                false,
                createInjector,
                undefined,
                undefined
              );

            const routes = [{
              path: "/editor/:fileId/:filePath/:mode",
              components: {
                fullscreen: __vue_component__
              },
              name: "editor",
              meta: {
                hideHeadbar: true
              }
            }];
            const appInfo = {
              name: "ONLYOFFICE",
              id: "onlyoffice",
              icon: "x-office-document",
              isFileEditor: true,
              extensions: [{
                extension: "docx",
                routeName: "onlyoffice-editor",
                newFileMenu: {
                  menuTitle($gettext) {
                    return $gettext("Document");
                  },

                  icon: "x-office-document"
                },
                routes: ["files-personal", "files-favorites", "files-shared-with-others", "files-shared-with-me", "files-public-list"]
              }, {
                extension: "xlsx",
                routeName: "onlyoffice-editor",
                newFileMenu: {
                  menuTitle($gettext) {
                    return $gettext("Spreadsheet");
                  },

                  icon: "x-office-spreadsheet"
                },
                routes: ["files-personal", "files-favorites", "files-shared-with-others", "files-shared-with-me", "files-public-list"]
              }, {
                extension: "pptx",
                routeName: "onlyoffice-editor",
                newFileMenu: {
                  menuTitle($gettext) {
                    return $gettext("Presentation");
                  },

                  icon: "x-office-presentation"
                },
                routes: ["files-personal", "files-favorites", "files-shared-with-others", "files-shared-with-me", "files-public-list"]
              }]
            };
            var app = {
              appInfo,
              routes
            };

            return app;

});

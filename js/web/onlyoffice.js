define(["vue"], function (vue) {
  "use strict";

  const global$1 =
    typeof global !== "undefined"
      ? global
      : typeof self !== "undefined"
      ? self
      : typeof window !== "undefined"
      ? window
      : {};

  function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }
  function getTarget() {
    // @ts-ignore
    return typeof navigator !== "undefined" && typeof window !== "undefined"
      ? window
      : typeof global$1 !== "undefined"
      ? global$1
      : {};
  }
  const isProxyAvailable = typeof Proxy === "function";

  const HOOK_SETUP = "devtools-plugin:setup";
  const HOOK_PLUGIN_SETTINGS_SET = "plugin:settings:set";

  let supported;
  let perf;
  function isPerformanceSupported() {
    let _a;
    if (supported !== undefined) {
      return supported;
    }
    if (typeof window !== "undefined" && window.performance) {
      supported = true;
      perf = window.performance;
    } else if (
      typeof global$1 !== "undefined" &&
      ((_a = global$1.perf_hooks) === null || _a === void 0
        ? void 0
        : _a.performance)
    ) {
      supported = true;
      perf = global$1.perf_hooks.performance;
    } else {
      supported = false;
    }
    return supported;
  }
  function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
  }

  class ApiProxy {
    constructor(plugin, hook) {
      this.target = null;
      this.targetQueue = [];
      this.onQueue = [];
      this.plugin = plugin;
      this.hook = hook;
      const defaultSettings = {};
      if (plugin.settings) {
        for (const id in plugin.settings) {
          const item = plugin.settings[id];
          defaultSettings[id] = item.defaultValue;
        }
      }
      const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
      let currentSettings = Object.assign({}, defaultSettings);
      try {
        const raw = localStorage.getItem(localSettingsSaveId);
        const data = JSON.parse(raw);
        Object.assign(currentSettings, data);
      } catch (e) {
        // noop
      }
      this.fallbacks = {
        getSettings() {
          return currentSettings;
        },
        setSettings(value) {
          try {
            localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
          } catch (e) {
            // noop
          }
          currentSettings = value;
        },
        now() {
          return now();
        },
      };
      if (hook) {
        hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
          if (pluginId === this.plugin.id) {
            this.fallbacks.setSettings(value);
          }
        });
      }
      this.proxiedOn = new Proxy(
        {},
        {
          get: (_target, prop) => {
            if (this.target) {
              return this.target.on[prop];
            } else {
              return (...args) => {
                this.onQueue.push({
                  method: prop,
                  args,
                });
              };
            }
          },
        }
      );
      this.proxiedTarget = new Proxy(
        {},
        {
          get: (_target, prop) => {
            if (this.target) {
              return this.target[prop];
            } else if (prop === "on") {
              return this.proxiedOn;
            } else if (Object.keys(this.fallbacks).includes(prop)) {
              return (...args) => {
                this.targetQueue.push({
                  method: prop,
                  args,
                  resolve: () => {},
                });
                return this.fallbacks[prop](...args);
              };
            } else {
              return (...args) => {
                return new Promise((resolve) => {
                  this.targetQueue.push({
                    method: prop,
                    args,
                    resolve,
                  });
                });
              };
            }
          },
        }
      );
    }
    async setRealTarget(target) {
      this.target = target;
      for (const item of this.onQueue) {
        this.target.on[item.method](...item.args);
      }
      for (const item of this.targetQueue) {
        item.resolve(await this.target[item.method](...item.args));
      }
    }
  }

  function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (
      hook &&
      (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)
    ) {
      hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    } else {
      const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
      const list = (target.__VUE_DEVTOOLS_PLUGINS__ =
        target.__VUE_DEVTOOLS_PLUGINS__ || []);
      list.push({
        pluginDescriptor: descriptor,
        setupFn,
        proxy,
      });
      if (proxy) {
        setupFn(proxy.proxiedTarget);
      }
    }
  }

  /*!
   * vuex v4.1.0
   * (c) 2022 Evan You
   * @license MIT
   */

  const storeKey = "store";

  /**
   * forEach for object
   */
  function forEachValue(obj, fn) {
    Object.keys(obj).forEach(function (key) {
      return fn(obj[key], key);
    });
  }

  function isObject$1(obj) {
    return obj !== null && typeof obj === "object";
  }

  function isPromise(val) {
    return val && typeof val.then === "function";
  }

  function assert(condition, msg) {
    if (!condition) {
      throw new Error("[vuex] " + msg);
    }
  }

  function partial(fn, arg) {
    return function () {
      return fn(arg);
    };
  }

  function genericSubscribe(fn, subs, options) {
    if (subs.indexOf(fn) < 0) {
      options && options.prepend ? subs.unshift(fn) : subs.push(fn);
    }
    return function () {
      const i = subs.indexOf(fn);
      if (i > -1) {
        subs.splice(i, 1);
      }
    };
  }

  function resetStore(store, hot) {
    store._actions = Object.create(null);
    store._mutations = Object.create(null);
    store._wrappedGetters = Object.create(null);
    store._modulesNamespaceMap = Object.create(null);
    const state = store.state;
    // init all modules
    installModule(store, state, [], store._modules.root, true);
    // reset state
    resetStoreState(store, state, hot);
  }

  function resetStoreState(store, state, hot) {
    const oldState = store._state;
    const oldScope = store._scope;

    // bind store public getters
    store.getters = {};
    // reset local getters cache
    store._makeLocalGettersCache = Object.create(null);
    const wrappedGetters = store._wrappedGetters;
    const computedObj = {};
    const computedCache = {};

    // create a new effect scope and create computed object inside it to avoid
    // getters (computed) getting destroyed on component unmount.
    const scope = vue.effectScope(true);

    scope.run(function () {
      forEachValue(wrappedGetters, function (fn, key) {
        // use computed to leverage its lazy-caching mechanism
        // direct inline function use will lead to closure preserving oldState.
        // using partial to return function with only arguments preserved in closure environment.
        computedObj[key] = partial(fn, store);
        computedCache[key] = vue.computed(function () {
          return computedObj[key]();
        });
        Object.defineProperty(store.getters, key, {
          get() {
            return computedCache[key].value;
          },
          enumerable: true, // for local getters
        });
      });
    });

    store._state = vue.reactive({
      data: state,
    });

    // register the newly created effect scope to the store so that we can
    // dispose the effects when this method runs again in the future.
    store._scope = scope;

    // enable strict mode for new state
    if (store.strict) {
      enableStrictMode(store);
    }

    if (oldState) {
      if (hot) {
        // dispatch changes in all subscribed watchers
        // to force getter re-evaluation for hot reloading.
        store._withCommit(function () {
          oldState.data = null;
        });
      }
    }

    // dispose previously registered effect scope if there is one.
    if (oldScope) {
      oldScope.stop();
    }
  }

  function installModule(store, rootState, path, module, hot) {
    const isRoot = !path.length;
    const namespace = store._modules.getNamespace(path);

    // register in namespace map
    if (module.namespaced) {
      if (store._modulesNamespaceMap[namespace] && true) {
        console.error(
          "[vuex] duplicate namespace " +
            namespace +
            " for the namespaced module " +
            path.join("/")
        );
      }
      store._modulesNamespaceMap[namespace] = module;
    }

    // set state
    if (!isRoot && !hot) {
      const parentState = getNestedState(rootState, path.slice(0, -1));
      const moduleName = path[path.length - 1];
      store._withCommit(function () {
        {
          if (moduleName in parentState) {
            console.warn(
              '[vuex] state field "' +
                moduleName +
                '" was overridden by a module with the same name at "' +
                path.join(".") +
                '"'
            );
          }
        }
        parentState[moduleName] = module.state;
      });
    }

    const local = (module.context = makeLocalContext(store, namespace, path));

    module.forEachMutation(function (mutation, key) {
      const namespacedType = namespace + key;
      registerMutation(store, namespacedType, mutation, local);
    });

    module.forEachAction(function (action, key) {
      const type = action.root ? key : namespace + key;
      const handler = action.handler || action;
      registerAction(store, type, handler, local);
    });

    module.forEachGetter(function (getter, key) {
      const namespacedType = namespace + key;
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
  function makeLocalContext(store, namespace, path) {
    const noNamespace = namespace === "";

    const local = {
      dispatch: noNamespace
        ? store.dispatch
        : function (_type, _payload, _options) {
            const args = unifyObjectStyle(_type, _payload, _options);
            const payload = args.payload;
            const options = args.options;
            let type = args.type;

            if (!options || !options.root) {
              type = namespace + type;
              if (!store._actions[type]) {
                console.error(
                  "[vuex] unknown local action type: " +
                    args.type +
                    ", global type: " +
                    type
                );
                return;
              }
            }

            return store.dispatch(type, payload);
          },

      commit: noNamespace
        ? store.commit
        : function (_type, _payload, _options) {
            const args = unifyObjectStyle(_type, _payload, _options);
            const payload = args.payload;
            const options = args.options;
            let type = args.type;

            if (!options || !options.root) {
              type = namespace + type;
              if (!store._mutations[type]) {
                console.error(
                  "[vuex] unknown local mutation type: " +
                    args.type +
                    ", global type: " +
                    type
                );
                return;
              }
            }

            store.commit(type, payload, options);
          },
    };

    // getters and state object must be gotten lazily
    // because they will be changed by state update
    Object.defineProperties(local, {
      getters: {
        get: noNamespace
          ? function () {
              return store.getters;
            }
          : function () {
              return makeLocalGetters(store, namespace);
            },
      },
      state: {
        get() {
          return getNestedState(store.state, path);
        },
      },
    });

    return local;
  }

  function makeLocalGetters(store, namespace) {
    if (!store._makeLocalGettersCache[namespace]) {
      const gettersProxy = {};
      const splitPos = namespace.length;
      Object.keys(store.getters).forEach(function (type) {
        // skip if the target getter is not match this namespace
        if (type.slice(0, splitPos) !== namespace) {
          return;
        }

        // extract local getter type
        const localType = type.slice(splitPos);

        // Add a port to the getters proxy.
        // Define as getter property because
        // we do not want to evaluate the getters in this time.
        Object.defineProperty(gettersProxy, localType, {
          get() {
            return store.getters[type];
          },
          enumerable: true,
        });
      });
      store._makeLocalGettersCache[namespace] = gettersProxy;
    }

    return store._makeLocalGettersCache[namespace];
  }

  function registerMutation(store, type, handler, local) {
    const entry = store._mutations[type] || (store._mutations[type] = []);
    entry.push(function wrappedMutationHandler(payload) {
      handler.call(store, local.state, payload);
    });
  }

  function registerAction(store, type, handler, local) {
    const entry = store._actions[type] || (store._actions[type] = []);
    entry.push(function wrappedActionHandler(payload) {
      let res = handler.call(
        store,
        {
          dispatch: local.dispatch,
          commit: local.commit,
          getters: local.getters,
          state: local.state,
          rootGetters: store.getters,
          rootState: store.state,
        },
        payload
      );
      if (!isPromise(res)) {
        res = Promise.resolve(res);
      }
      if (store._devtoolHook) {
        return res.catch(function (err) {
          store._devtoolHook.emit("vuex:error", err);
          throw err;
        });
      } else {
        return res;
      }
    });
  }

  function registerGetter(store, type, rawGetter, local) {
    if (store._wrappedGetters[type]) {
      {
        console.error("[vuex] duplicate getter key: " + type);
      }
      return;
    }
    store._wrappedGetters[type] = function wrappedGetter(store) {
      return rawGetter(
        local.state, // local state
        local.getters, // local getters
        store.state, // root state
        store.getters // root getters
      );
    };
  }

  function enableStrictMode(store) {
    vue.watch(
      function () {
        return store._state.data;
      },
      function () {
        {
          assert(
            store._committing,
            "do not mutate vuex store state outside mutation handlers."
          );
        }
      },
      { deep: true, flush: "sync" }
    );
  }

  function getNestedState(state, path) {
    return path.reduce(function (state, key) {
      return state[key];
    }, state);
  }

  function unifyObjectStyle(type, payload, options) {
    if (isObject$1(type) && type.type) {
      options = payload;
      payload = type;
      type = type.type;
    }

    {
      assert(
        typeof type === "string",
        "expects string as the type, but found " + typeof type + "."
      );
    }

    return { type, payload, options };
  }

  const LABEL_VUEX_BINDINGS = "vuex bindings";
  const MUTATIONS_LAYER_ID = "vuex:mutations";
  const ACTIONS_LAYER_ID = "vuex:actions";
  const INSPECTOR_ID = "vuex";

  let actionId = 0;

  function addDevtools(app, store) {
    setupDevtoolsPlugin(
      {
        id: "org.vuejs.vuex",
        app,
        label: "Vuex",
        homepage: "https://next.vuex.vuejs.org/",
        logo: "https://vuejs.org/images/icons/favicon-96x96.png",
        packageName: "vuex",
        componentStateTypes: [LABEL_VUEX_BINDINGS],
      },
      function (api) {
        api.addTimelineLayer({
          id: MUTATIONS_LAYER_ID,
          label: "Vuex Mutations",
          color: COLOR_LIME_500,
        });

        api.addTimelineLayer({
          id: ACTIONS_LAYER_ID,
          label: "Vuex Actions",
          color: COLOR_LIME_500,
        });

        api.addInspector({
          id: INSPECTOR_ID,
          label: "Vuex",
          icon: "storage",
          treeFilterPlaceholder: "Filter stores...",
        });

        api.on.getInspectorTree(function (payload) {
          if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
            if (payload.filter) {
              const nodes = [];
              flattenStoreForInspectorTree(
                nodes,
                store._modules.root,
                payload.filter,
                ""
              );
              payload.rootNodes = nodes;
            } else {
              payload.rootNodes = [
                formatStoreForInspectorTree(store._modules.root, ""),
              ];
            }
          }
        });

        api.on.getInspectorState(function (payload) {
          if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
            const modulePath = payload.nodeId;
            makeLocalGetters(store, modulePath);
            payload.state = formatStoreForInspectorState(
              getStoreModule(store._modules, modulePath),
              modulePath === "root"
                ? store.getters
                : store._makeLocalGettersCache,
              modulePath
            );
          }
        });

        api.on.editInspectorState(function (payload) {
          if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
            const modulePath = payload.nodeId;
            let path = payload.path;
            if (modulePath !== "root") {
              path = modulePath.split("/").filter(Boolean).concat(path);
            }
            store._withCommit(function () {
              payload.set(store._state.data, path, payload.state.value);
            });
          }
        });

        store.subscribe(function (mutation, state) {
          const data = {};

          if (mutation.payload) {
            data.payload = mutation.payload;
          }

          data.state = state;

          api.notifyComponentUpdate();
          api.sendInspectorTree(INSPECTOR_ID);
          api.sendInspectorState(INSPECTOR_ID);

          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: Date.now(),
              title: mutation.type,
              data,
            },
          });
        });

        store.subscribeAction({
          before(action, state) {
            const data = {};
            if (action.payload) {
              data.payload = action.payload;
            }
            action._id = actionId++;
            action._time = Date.now();
            data.state = state;

            api.addTimelineEvent({
              layerId: ACTIONS_LAYER_ID,
              event: {
                time: action._time,
                title: action.type,
                groupId: action._id,
                subtitle: "start",
                data,
              },
            });
          },
          after(action, state) {
            const data = {};
            const duration = Date.now() - action._time;
            data.duration = {
              _custom: {
                type: "duration",
                display: duration + "ms",
                tooltip: "Action duration",
                value: duration,
              },
            };
            if (action.payload) {
              data.payload = action.payload;
            }
            data.state = state;

            api.addTimelineEvent({
              layerId: ACTIONS_LAYER_ID,
              event: {
                time: Date.now(),
                title: action.type,
                groupId: action._id,
                subtitle: "end",
                data,
              },
            });
          },
        });
      }
    );
  }

  // extracted from tailwind palette
  const COLOR_LIME_500 = 0x84cc16;
  const COLOR_DARK = 0x666666;
  const COLOR_WHITE = 0xffffff;

  const TAG_NAMESPACED = {
    label: "namespaced",
    textColor: COLOR_WHITE,
    backgroundColor: COLOR_DARK,
  };

  /**
   * @param {string} path
   */
  function extractNameFromPath(path) {
    return path && path !== "root" ? path.split("/").slice(-2, -1)[0] : "Root";
  }

  /**
   * @param {*} module
   * @return {import('@vue/devtools-api').CustomInspectorNode}
   */
  function formatStoreForInspectorTree(module, path) {
    return {
      id: path || "root",
      // all modules end with a `/`, we want the last segment only
      // cart/ -> cart
      // nested/cart/ -> cart
      label: extractNameFromPath(path),
      tags: module.namespaced ? [TAG_NAMESPACED] : [],
      children: Object.keys(module._children).map(function (moduleName) {
        return formatStoreForInspectorTree(
          module._children[moduleName],
          path + moduleName + "/"
        );
      }),
    };
  }

  /**
   * @param {import('@vue/devtools-api').CustomInspectorNode[]} result
   * @param {*} module
   * @param {string} filter
   * @param {string} path
   */
  function flattenStoreForInspectorTree(result, module, filter, path) {
    if (path.includes(filter)) {
      result.push({
        id: path || "root",
        label: path.endsWith("/")
          ? path.slice(0, path.length - 1)
          : path || "Root",
        tags: module.namespaced ? [TAG_NAMESPACED] : [],
      });
    }
    Object.keys(module._children).forEach(function (moduleName) {
      flattenStoreForInspectorTree(
        result,
        module._children[moduleName],
        filter,
        path + moduleName + "/"
      );
    });
  }

  /**
   * @param {*} module
   * @return {import('@vue/devtools-api').CustomInspectorState}
   */
  function formatStoreForInspectorState(module, getters, path) {
    getters = path === "root" ? getters : getters[path];
    const gettersKeys = Object.keys(getters);
    const storeState = {
      state: Object.keys(module.state).map(function (key) {
        return {
          key,
          editable: true,
          value: module.state[key],
        };
      }),
    };

    if (gettersKeys.length) {
      const tree = transformPathsToObjectTree(getters);
      storeState.getters = Object.keys(tree).map(function (key) {
        return {
          key: key.endsWith("/") ? extractNameFromPath(key) : key,
          editable: false,
          value: canThrow(function () {
            return tree[key];
          }),
        };
      });
    }

    return storeState;
  }

  function transformPathsToObjectTree(getters) {
    const result = {};
    Object.keys(getters).forEach(function (key) {
      const path = key.split("/");
      if (path.length > 1) {
        let target = result;
        const leafKey = path.pop();
        path.forEach(function (p) {
          if (!target[p]) {
            target[p] = {
              _custom: {
                value: {},
                display: p,
                tooltip: "Module",
                abstract: true,
              },
            };
          }
          target = target[p]._custom.value;
        });
        target[leafKey] = canThrow(function () {
          return getters[key];
        });
      } else {
        result[key] = canThrow(function () {
          return getters[key];
        });
      }
    });
    return result;
  }

  function getStoreModule(moduleMap, path) {
    const names = path.split("/").filter(function (n) {
      return n;
    });
    return names.reduce(
      function (module, moduleName, i) {
        const child = module[moduleName];
        if (!child) {
          throw new Error(
            'Missing module "' + moduleName + '" for path "' + path + '".'
          );
        }
        return i === names.length - 1 ? child : child._children;
      },
      path === "root" ? moduleMap : moduleMap.root._children
    );
  }

  function canThrow(cb) {
    try {
      return cb();
    } catch (e) {
      return e;
    }
  }

  // Base data struct for store's module, package with some attribute and method
  const Module = function Module(rawModule, runtime) {
    this.runtime = runtime;
    // Store some children item
    this._children = Object.create(null);
    // Store the origin module object which passed by programmer
    this._rawModule = rawModule;
    const rawState = rawModule.state;

    // Store the origin module's state
    this.state = (typeof rawState === "function" ? rawState() : rawState) || {};
  };

  const prototypeAccessors$1 = { namespaced: { configurable: true } };

  prototypeAccessors$1.namespaced.get = function () {
    return !!this._rawModule.namespaced;
  };

  Module.prototype.addChild = function addChild(key, module) {
    this._children[key] = module;
  };

  Module.prototype.removeChild = function removeChild(key) {
    delete this._children[key];
  };

  Module.prototype.getChild = function getChild(key) {
    return this._children[key];
  };

  Module.prototype.hasChild = function hasChild(key) {
    return key in this._children;
  };

  Module.prototype.update = function update(rawModule) {
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

  Module.prototype.forEachChild = function forEachChild(fn) {
    forEachValue(this._children, fn);
  };

  Module.prototype.forEachGetter = function forEachGetter(fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn);
    }
  };

  Module.prototype.forEachAction = function forEachAction(fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn);
    }
  };

  Module.prototype.forEachMutation = function forEachMutation(fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn);
    }
  };

  Object.defineProperties(Module.prototype, prototypeAccessors$1);

  const ModuleCollection = function ModuleCollection(rawRootModule) {
    // register root module (Vuex.Store options)
    this.register([], rawRootModule, false);
  };

  ModuleCollection.prototype.get = function get(path) {
    return path.reduce(function (module, key) {
      return module.getChild(key);
    }, this.root);
  };

  ModuleCollection.prototype.getNamespace = function getNamespace(path) {
    let module = this.root;
    return path.reduce(function (namespace, key) {
      module = module.getChild(key);
      return namespace + (module.namespaced ? key + "/" : "");
    }, "");
  };

  ModuleCollection.prototype.update = function update$1(rawRootModule) {
    update([], this.root, rawRootModule);
  };

  ModuleCollection.prototype.register = function register(
    path,
    rawModule,
    runtime
  ) {
    const this$1$1 = this;
    if (runtime === void 0) {
      runtime = true;
    }

    {
      assertRawModule(path, rawModule);
    }

    const newModule = new Module(rawModule, runtime);
    if (path.length === 0) {
      this.root = newModule;
    } else {
      const parent = this.get(path.slice(0, -1));
      parent.addChild(path[path.length - 1], newModule);
    }

    // register nested modules
    if (rawModule.modules) {
      forEachValue(rawModule.modules, function (rawChildModule, key) {
        this$1$1.register(path.concat(key), rawChildModule, runtime);
      });
    }
  };

  ModuleCollection.prototype.unregister = function unregister(path) {
    const parent = this.get(path.slice(0, -1));
    const key = path[path.length - 1];
    const child = parent.getChild(key);

    if (!child) {
      {
        console.warn(
          "[vuex] trying to unregister module '" +
            key +
            "', which is " +
            "not registered"
        );
      }
      return;
    }

    if (!child.runtime) {
      return;
    }

    parent.removeChild(key);
  };

  ModuleCollection.prototype.isRegistered = function isRegistered(path) {
    const parent = this.get(path.slice(0, -1));
    const key = path[path.length - 1];

    if (parent) {
      return parent.hasChild(key);
    }

    return false;
  };

  function update(path, targetModule, newModule) {
    {
      assertRawModule(path, newModule);
    }

    // update target module
    targetModule.update(newModule);

    // update nested modules
    if (newModule.modules) {
      for (const key in newModule.modules) {
        if (!targetModule.getChild(key)) {
          {
            console.warn(
              "[vuex] trying to add a new module '" +
                key +
                "' on hot reloading, " +
                "manual reload is needed"
            );
          }
          return;
        }
        update(
          path.concat(key),
          targetModule.getChild(key),
          newModule.modules[key]
        );
      }
    }
  }

  const functionAssert = {
    assert(value) {
      return typeof value === "function";
    },
    expected: "function",
  };

  const objectAssert = {
    assert(value) {
      return (
        typeof value === "function" ||
        (typeof value === "object" && typeof value.handler === "function")
      );
    },
    expected: 'function or object with "handler" function',
  };

  const assertTypes = {
    getters: functionAssert,
    mutations: functionAssert,
    actions: objectAssert,
  };

  function assertRawModule(path, rawModule) {
    Object.keys(assertTypes).forEach(function (key) {
      if (!rawModule[key]) {
        return;
      }

      const assertOptions = assertTypes[key];

      forEachValue(rawModule[key], function (value, type) {
        assert(
          assertOptions.assert(value),
          makeAssertionMessage(path, key, type, value, assertOptions.expected)
        );
      });
    });
  }

  function makeAssertionMessage(path, key, type, value, expected) {
    let buf =
      key + " should be " + expected + ' but "' + key + "." + type + '"';
    if (path.length > 0) {
      buf += ' in module "' + path.join(".") + '"';
    }
    buf += " is " + JSON.stringify(value) + ".";
    return buf;
  }

  const Store = function Store(options) {
    const this$1$1 = this;
    if (options === void 0) {
      options = {};
    }

    {
      assert(
        typeof Promise !== "undefined",
        "vuex requires a Promise polyfill in this browser."
      );
      assert(
        this instanceof Store,
        "store must be called with the new operator."
      );
    }

    let plugins = options.plugins;
    if (plugins === void 0) {
      plugins = [];
    }
    let strict = options.strict;
    if (strict === void 0) {
      strict = false;
    }
    const devtools = options.devtools;

    // store internal state
    this._committing = false;
    this._actions = Object.create(null);
    this._actionSubscribers = [];
    this._mutations = Object.create(null);
    this._wrappedGetters = Object.create(null);
    this._modules = new ModuleCollection(options);
    this._modulesNamespaceMap = Object.create(null);
    this._subscribers = [];
    this._makeLocalGettersCache = Object.create(null);

    // EffectScope instance. when registering new getters, we wrap them inside
    // EffectScope so that getters (computed) would not be destroyed on
    // component unmount.
    this._scope = null;

    this._devtools = devtools;

    // bind commit and dispatch to self
    const store = this;
    const ref = this;
    const dispatch = ref.dispatch;
    const commit = ref.commit;
    this.dispatch = function boundDispatch(type, payload) {
      return dispatch.call(store, type, payload);
    };
    this.commit = function boundCommit(type, payload, options) {
      return commit.call(store, type, payload, options);
    };

    // strict mode
    this.strict = strict;

    const state = this._modules.root.state;

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    installModule(this, state, [], this._modules.root);

    // initialize the store state, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreState(this, state);

    // apply plugins
    plugins.forEach(function (plugin) {
      return plugin(this$1$1);
    });
  };

  const prototypeAccessors = { state: { configurable: true } };

  Store.prototype.install = function install(app, injectKey) {
    app.provide(injectKey || storeKey, this);
    app.config.globalProperties.$store = this;

    const useDevtools = this._devtools !== undefined ? this._devtools : true;

    if (useDevtools) {
      addDevtools(app, this);
    }
  };

  prototypeAccessors.state.get = function () {
    return this._state.data;
  };

  prototypeAccessors.state.set = function (v) {
    {
      assert(
        false,
        "use store.replaceState() to explicit replace store state."
      );
    }
  };

  Store.prototype.commit = function commit(_type, _payload, _options) {
    const this$1$1 = this;

    // check object-style commit
    const ref = unifyObjectStyle(_type, _payload, _options);
    const type = ref.type;
    const payload = ref.payload;
    const options = ref.options;

    const mutation = { type, payload };
    const entry = this._mutations[type];
    if (!entry) {
      {
        console.error("[vuex] unknown mutation type: " + type);
      }
      return;
    }
    this._withCommit(function () {
      entry.forEach(function commitIterator(handler) {
        handler(payload);
      });
    });

    this._subscribers
      .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
      .forEach(function (sub) {
        return sub(mutation, this$1$1.state);
      });

    if (options && options.silent) {
      console.warn(
        "[vuex] mutation type: " +
          type +
          ". Silent option has been removed. " +
          "Use the filter functionality in the vue-devtools"
      );
    }
  };

  Store.prototype.dispatch = function dispatch(_type, _payload) {
    const this$1$1 = this;

    // check object-style dispatch
    const ref = unifyObjectStyle(_type, _payload);
    const type = ref.type;
    const payload = ref.payload;

    const action = { type, payload };
    const entry = this._actions[type];
    if (!entry) {
      {
        console.error("[vuex] unknown action type: " + type);
      }
      return;
    }

    try {
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .filter(function (sub) {
          return sub.before;
        })
        .forEach(function (sub) {
          return sub.before(action, this$1$1.state);
        });
    } catch (e) {
      {
        console.warn("[vuex] error in before action subscribers: ");
        console.error(e);
      }
    }

    const result =
      entry.length > 1
        ? Promise.all(
            entry.map(function (handler) {
              return handler(payload);
            })
          )
        : entry[0](payload);

    return new Promise(function (resolve, reject) {
      result.then(
        function (res) {
          try {
            this$1$1._actionSubscribers
              .filter(function (sub) {
                return sub.after;
              })
              .forEach(function (sub) {
                return sub.after(action, this$1$1.state);
              });
          } catch (e) {
            {
              console.warn("[vuex] error in after action subscribers: ");
              console.error(e);
            }
          }
          resolve(res);
        },
        function (error) {
          try {
            this$1$1._actionSubscribers
              .filter(function (sub) {
                return sub.error;
              })
              .forEach(function (sub) {
                return sub.error(action, this$1$1.state, error);
              });
          } catch (e) {
            {
              console.warn("[vuex] error in error action subscribers: ");
              console.error(e);
            }
          }
          reject(error);
        }
      );
    });
  };

  Store.prototype.subscribe = function subscribe(fn, options) {
    return genericSubscribe(fn, this._subscribers, options);
  };

  Store.prototype.subscribeAction = function subscribeAction(fn, options) {
    const subs = typeof fn === "function" ? { before: fn } : fn;
    return genericSubscribe(subs, this._actionSubscribers, options);
  };

  Store.prototype.watch = function watch$1(getter, cb, options) {
    const this$1$1 = this;

    {
      assert(
        typeof getter === "function",
        "store.watch only accepts a function."
      );
    }
    return vue.watch(
      function () {
        return getter(this$1$1.state, this$1$1.getters);
      },
      cb,
      Object.assign({}, options)
    );
  };

  Store.prototype.replaceState = function replaceState(state) {
    const this$1$1 = this;

    this._withCommit(function () {
      this$1$1._state.data = state;
    });
  };

  Store.prototype.registerModule = function registerModule(
    path,
    rawModule,
    options
  ) {
    if (options === void 0) {
      options = {};
    }

    if (typeof path === "string") {
      path = [path];
    }

    {
      assert(Array.isArray(path), "module path must be a string or an Array.");
      assert(
        path.length > 0,
        "cannot register the root module by using registerModule."
      );
    }

    this._modules.register(path, rawModule);
    installModule(
      this,
      this.state,
      path,
      this._modules.get(path),
      options.preserveState
    );
    // reset store to update getters...
    resetStoreState(this, this.state);
  };

  Store.prototype.unregisterModule = function unregisterModule(path) {
    const this$1$1 = this;

    if (typeof path === "string") {
      path = [path];
    }

    {
      assert(Array.isArray(path), "module path must be a string or an Array.");
    }

    this._modules.unregister(path);
    this._withCommit(function () {
      const parentState = getNestedState(this$1$1.state, path.slice(0, -1));
      delete parentState[path[path.length - 1]];
    });
    resetStore(this);
  };

  Store.prototype.hasModule = function hasModule(path) {
    if (typeof path === "string") {
      path = [path];
    }

    {
      assert(Array.isArray(path), "module path must be a string or an Array.");
    }

    return this._modules.isRegistered(path);
  };

  Store.prototype.hotUpdate = function hotUpdate(newOptions) {
    this._modules.update(newOptions);
    resetStore(this, true);
  };

  Store.prototype._withCommit = function _withCommit(fn) {
    const committing = this._committing;
    this._committing = true;
    fn();
    this._committing = committing;
  };

  Object.defineProperties(Store.prototype, prototypeAccessors);

  /**
   * Reduce the code which written in Vue.js for getting the getters
   * @param {String} [namespace] - Module's namespace
   * @param {Object|Array} getters
   * @return {Object}
   */
  const mapGetters = normalizeNamespace(function (namespace, getters) {
    const res = {};
    if (!isValidMap(getters)) {
      console.error(
        "[vuex] mapGetters: mapper parameter must be either an Array or an Object"
      );
    }
    normalizeMap(getters).forEach(function (ref) {
      const key = ref.key;
      let val = ref.val;

      // The namespace has been mutated by normalizeNamespace
      val = namespace + val;
      res[key] = function mappedGetter() {
        if (
          namespace &&
          !getModuleByNamespace(this.$store, "mapGetters", namespace)
        ) {
          return;
        }
        if (!(val in this.$store.getters)) {
          console.error("[vuex] unknown getter: " + val);
          return;
        }
        return this.$store.getters[val];
      };
      // mark vuex getter for devtools
      res[key].vuex = true;
    });
    return res;
  });

  /**
   * Reduce the code which written in Vue.js for dispatch the action
   * @param {String} [namespace] - Module's namespace
   * @param {Object|Array} actions # Object's item can be a function which accept `dispatch` function as the first param, it can accept anthor params. You can dispatch action and do any other things in this function. specially, You need to pass anthor params from the mapped function.
   * @return {Object}
   */
  const mapActions = normalizeNamespace(function (namespace, actions) {
    const res = {};
    if (!isValidMap(actions)) {
      console.error(
        "[vuex] mapActions: mapper parameter must be either an Array or an Object"
      );
    }
    normalizeMap(actions).forEach(function (ref) {
      const key = ref.key;
      const val = ref.val;

      res[key] = function mappedAction() {
        const args = [],
          len = arguments.length;
        while (len--) {
          args[len] = arguments[len];
        }

        // get dispatch function from store
        let dispatch = this.$store.dispatch;
        if (namespace) {
          const module = getModuleByNamespace(
            this.$store,
            "mapActions",
            namespace
          );
          if (!module) {
            return;
          }
          dispatch = module.context.dispatch;
        }
        return typeof val === "function"
          ? val.apply(this, [dispatch].concat(args))
          : dispatch.apply(this.$store, [val].concat(args));
      };
    });
    return res;
  });

  /**
   * Normalize the map
   * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
   * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
   * @param {Array|Object} map
   * @return {Object}
   */
  function normalizeMap(map) {
    if (!isValidMap(map)) {
      return [];
    }
    return Array.isArray(map)
      ? map.map(function (key) {
          return { key, val: key };
        })
      : Object.keys(map).map(function (key) {
          return { key, val: map[key] };
        });
  }

  /**
   * Validate whether given map is valid or not
   * @param {*} map
   * @return {Boolean}
   */
  function isValidMap(map) {
    return Array.isArray(map) || isObject$1(map);
  }

  /**
   * Return a function expect two param contains namespace and map. it will normalize the namespace and then the param's function will handle the new namespace and the map.
   * @param {Function} fn
   * @return {Function}
   */
  function normalizeNamespace(fn) {
    return function (namespace, map) {
      if (typeof namespace !== "string") {
        map = namespace;
        namespace = "";
      } else if (namespace.charAt(namespace.length - 1) !== "/") {
        namespace += "/";
      }
      return fn(namespace, map);
    };
  }

  /**
   * Search a special module from store by namespace. if module not exist, print error message.
   * @param {Object} store
   * @param {String} helper
   * @param {String} namespace
   * @return {Object}
   */
  function getModuleByNamespace(store, helper, namespace) {
    const module = store._modulesNamespaceMap[namespace];
    if (!module) {
      console.error(
        "[vuex] module namespace not found in " + helper + "(): " + namespace
      );
    }
    return module;
  }

  function bind(fn, thisArg) {
    return function wrap() {
      return fn.apply(thisArg, arguments);
    };
  }

  // utils is a library of generic helper functions non-specific to axios

  const { toString: toString$1 } = Object.prototype;
  const { getPrototypeOf } = Object;

  const kindOf = ((cache) => (thing) => {
    const str = toString$1.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  })(Object.create(null));

  const kindOfTest = (type) => {
    type = type.toLowerCase();
    return (thing) => kindOf(thing) === type;
  };

  const typeOfTest = (type) => (thing) => typeof thing === type;

  /**
   * Determine if a value is an Array
   *
   * @param {Object} val The value to test
   *
   * @returns {boolean} True if value is an Array, otherwise false
   */
  const { isArray: isArray$1 } = Array;

  /**
   * Determine if a value is undefined
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if the value is undefined, otherwise false
   */
  const isUndefined = typeOfTest("undefined");

  /**
   * Determine if a value is a Buffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Buffer, otherwise false
   */
  function isBuffer$1(val) {
    return (
      val !== null &&
      !isUndefined(val) &&
      val.constructor !== null &&
      !isUndefined(val.constructor) &&
      isFunction(val.constructor.isBuffer) &&
      val.constructor.isBuffer(val)
    );
  }

  /**
   * Determine if a value is an ArrayBuffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is an ArrayBuffer, otherwise false
   */
  const isArrayBuffer = kindOfTest("ArrayBuffer");

  /**
   * Determine if a value is a view on an ArrayBuffer
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
   */
  function isArrayBufferView(val) {
    let result;
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
      result = ArrayBuffer.isView(val);
    } else {
      result = val && val.buffer && isArrayBuffer(val.buffer);
    }
    return result;
  }

  /**
   * Determine if a value is a String
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a String, otherwise false
   */
  const isString = typeOfTest("string");

  /**
   * Determine if a value is a Function
   *
   * @param {*} val The value to test
   * @returns {boolean} True if value is a Function, otherwise false
   */
  const isFunction = typeOfTest("function");

  /**
   * Determine if a value is a Number
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Number, otherwise false
   */
  const isNumber = typeOfTest("number");

  /**
   * Determine if a value is an Object
   *
   * @param {*} thing The value to test
   *
   * @returns {boolean} True if value is an Object, otherwise false
   */
  const isObject = (thing) => thing !== null && typeof thing === "object";

  /**
   * Determine if a value is a Boolean
   *
   * @param {*} thing The value to test
   * @returns {boolean} True if value is a Boolean, otherwise false
   */
  const isBoolean = (thing) => thing === true || thing === false;

  /**
   * Determine if a value is a plain Object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a plain Object, otherwise false
   */
  const isPlainObject = (val) => {
    if (kindOf(val) !== "object") {
      return false;
    }

    const prototype = getPrototypeOf(val);
    return (
      (prototype === null ||
        prototype === Object.prototype ||
        Object.getPrototypeOf(prototype) === null) &&
      !(Symbol.toStringTag in val) &&
      !(Symbol.iterator in val)
    );
  };

  /**
   * Determine if a value is a Date
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Date, otherwise false
   */
  const isDate = kindOfTest("Date");

  /**
   * Determine if a value is a File
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a File, otherwise false
   */
  const isFile = kindOfTest("File");

  /**
   * Determine if a value is a Blob
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Blob, otherwise false
   */
  const isBlob = kindOfTest("Blob");

  /**
   * Determine if a value is a FileList
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a File, otherwise false
   */
  const isFileList = kindOfTest("FileList");

  /**
   * Determine if a value is a Stream
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a Stream, otherwise false
   */
  const isStream = (val) => isObject(val) && isFunction(val.pipe);

  /**
   * Determine if a value is a FormData
   *
   * @param {*} thing The value to test
   *
   * @returns {boolean} True if value is an FormData, otherwise false
   */
  const isFormData = (thing) => {
    let kind;
    return (
      thing &&
      ((typeof FormData === "function" && thing instanceof FormData) ||
        (isFunction(thing.append) &&
          ((kind = kindOf(thing)) === "formdata" ||
            // detect form-data instance
            (kind === "object" &&
              isFunction(thing.toString) &&
              thing.toString() === "[object FormData]"))))
    );
  };

  /**
   * Determine if a value is a URLSearchParams object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a URLSearchParams object, otherwise false
   */
  const isURLSearchParams = kindOfTest("URLSearchParams");

  /**
   * Trim excess whitespace off the beginning and end of a string
   *
   * @param {String} str The String to trim
   *
   * @returns {String} The String freed of excess whitespace
   */
  const trim = (str) =>
    str.trim
      ? str.trim()
      : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");

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
   *
   * @param {Boolean} [allOwnKeys = false]
   * @returns {any}
   */
  function forEach(obj, fn, { allOwnKeys = false } = {}) {
    // Don't bother if no value provided
    if (obj === null || typeof obj === "undefined") {
      return;
    }

    let i;
    let l;

    // Force an array if not already something iterable
    if (typeof obj !== "object") {
      /*eslint no-param-reassign:0*/
      obj = [obj];
    }

    if (isArray$1(obj)) {
      // Iterate over array values
      for (i = 0, l = obj.length; i < l; i++) {
        fn.call(null, obj[i], i, obj);
      }
    } else {
      // Iterate over object keys
      const keys = allOwnKeys
        ? Object.getOwnPropertyNames(obj)
        : Object.keys(obj);
      const len = keys.length;
      let key;

      for (i = 0; i < len; i++) {
        key = keys[i];
        fn.call(null, obj[key], key, obj);
      }
    }
  }

  function findKey(obj, key) {
    key = key.toLowerCase();
    const keys = Object.keys(obj);
    let i = keys.length;
    let _key;
    while (i-- > 0) {
      _key = keys[i];
      if (key === _key.toLowerCase()) {
        return _key;
      }
    }
    return null;
  }

  const _global = (() => {
    /*eslint no-undef:0*/
    if (typeof globalThis !== "undefined") {
      return globalThis;
    }
    return typeof self !== "undefined"
      ? self
      : typeof window !== "undefined"
      ? window
      : global$1;
  })();

  const isContextDefined = (context) =>
    !isUndefined(context) && context !== _global;

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
   *
   * @returns {Object} Result of all merge properties
   */
  function merge(/* obj1, obj2, obj3, ... */) {
    const { caseless } = (isContextDefined(this) && this) || {};
    const result = {};
    const assignValue = (val, key) => {
      const targetKey = (caseless && findKey(result, key)) || key;
      if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
        result[targetKey] = merge(result[targetKey], val);
      } else if (isPlainObject(val)) {
        result[targetKey] = merge({}, val);
      } else if (isArray$1(val)) {
        result[targetKey] = val.slice();
      } else {
        result[targetKey] = val;
      }
    };

    for (let i = 0, l = arguments.length; i < l; i++) {
      arguments[i] && forEach(arguments[i], assignValue);
    }
    return result;
  }

  /**
   * Extends object a by mutably adding to it the properties of object b.
   *
   * @param {Object} a The object to be extended
   * @param {Object} b The object to copy properties from
   * @param {Object} thisArg The object to bind function to
   *
   * @param {Boolean} [allOwnKeys]
   * @returns {Object} The resulting value of object a
   */
  const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
    forEach(
      b,
      (val, key) => {
        if (thisArg && isFunction(val)) {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      },
      { allOwnKeys }
    );
    return a;
  };

  /**
   * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
   *
   * @param {string} content with BOM
   *
   * @returns {string} content value without BOM
   */
  const stripBOM = (content) => {
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }
    return content;
  };

  /**
   * Inherit the prototype methods from one constructor into another
   * @param {function} constructor
   * @param {function} superConstructor
   * @param {object} [props]
   * @param {object} [descriptors]
   *
   * @returns {void}
   */
  const inherits = (constructor, superConstructor, props, descriptors) => {
    constructor.prototype = Object.create(
      superConstructor.prototype,
      descriptors
    );
    constructor.prototype.constructor = constructor;
    Object.defineProperty(constructor, "super", {
      value: superConstructor.prototype,
    });
    props && Object.assign(constructor.prototype, props);
  };

  /**
   * Resolve object with deep prototype chain to a flat object
   * @param {Object} sourceObj source object
   * @param {Object} [destObj]
   * @param {Function|Boolean} [filter]
   * @param {Function} [propFilter]
   *
   * @returns {Object}
   */
  const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
    let props;
    let i;
    let prop;
    const merged = {};

    destObj = destObj || {};
    // eslint-disable-next-line no-eq-null,eqeqeq
    if (sourceObj == null) {
      return destObj;
    }

    do {
      props = Object.getOwnPropertyNames(sourceObj);
      i = props.length;
      while (i-- > 0) {
        prop = props[i];
        if (
          (!propFilter || propFilter(prop, sourceObj, destObj)) &&
          !merged[prop]
        ) {
          destObj[prop] = sourceObj[prop];
          merged[prop] = true;
        }
      }
      sourceObj = filter !== false && getPrototypeOf(sourceObj);
    } while (
      sourceObj &&
      (!filter || filter(sourceObj, destObj)) &&
      sourceObj !== Object.prototype
    );

    return destObj;
  };

  /**
   * Determines whether a string ends with the characters of a specified string
   *
   * @param {String} str
   * @param {String} searchString
   * @param {Number} [position= 0]
   *
   * @returns {boolean}
   */
  const endsWith = (str, searchString, position) => {
    str = String(str);
    if (position === undefined || position > str.length) {
      position = str.length;
    }
    position -= searchString.length;
    const lastIndex = str.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };

  /**
   * Returns new array from array like object or null if failed
   *
   * @param {*} [thing]
   *
   * @returns {?Array}
   */
  const toArray = (thing) => {
    if (!thing) {
      return null;
    }
    if (isArray$1(thing)) {
      return thing;
    }
    let i = thing.length;
    if (!isNumber(i)) {
      return null;
    }
    const arr = new Array(i);
    while (i-- > 0) {
      arr[i] = thing[i];
    }
    return arr;
  };

  /**
   * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
   * thing passed in is an instance of Uint8Array
   *
   * @param {TypedArray}
   *
   * @returns {Array}
   */
  // eslint-disable-next-line func-names
  const isTypedArray = ((TypedArray) => {
    // eslint-disable-next-line func-names
    return (thing) => {
      return TypedArray && thing instanceof TypedArray;
    };
  })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));

  /**
   * For each entry in the object, call the function with the key and value.
   *
   * @param {Object<any, any>} obj - The object to iterate over.
   * @param {Function} fn - The function to call for each entry.
   *
   * @returns {void}
   */
  const forEachEntry = (obj, fn) => {
    const generator = obj && obj[Symbol.iterator];

    const iterator = generator.call(obj);

    let result;

    while ((result = iterator.next()) && !result.done) {
      const pair = result.value;
      fn.call(obj, pair[0], pair[1]);
    }
  };

  /**
   * It takes a regular expression and a string, and returns an array of all the matches
   *
   * @param {string} regExp - The regular expression to match against.
   * @param {string} str - The string to search.
   *
   * @returns {Array<boolean>}
   */
  const matchAll = (regExp, str) => {
    let matches;
    const arr = [];

    while ((matches = regExp.exec(str)) !== null) {
      arr.push(matches);
    }

    return arr;
  };

  /* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
  const isHTMLForm = kindOfTest("HTMLFormElement");

  const toCamelCase = (str) => {
    return str
      .toLowerCase()
      .replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
        return p1.toUpperCase() + p2;
      });
  };

  /* Creating a function that will check if an object has a property. */
  const hasOwnProperty = (
    ({ hasOwnProperty }) =>
    (obj, prop) =>
      hasOwnProperty.call(obj, prop)
  )(Object.prototype);

  /**
   * Determine if a value is a RegExp object
   *
   * @param {*} val The value to test
   *
   * @returns {boolean} True if value is a RegExp object, otherwise false
   */
  const isRegExp = kindOfTest("RegExp");

  const reduceDescriptors = (obj, reducer) => {
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    const reducedDescriptors = {};

    forEach(descriptors, (descriptor, name) => {
      let ret;
      if ((ret = reducer(descriptor, name, obj)) !== false) {
        reducedDescriptors[name] = ret || descriptor;
      }
    });

    Object.defineProperties(obj, reducedDescriptors);
  };

  /**
   * Makes all methods read-only
   * @param {Object} obj
   */

  const freezeMethods = (obj) => {
    reduceDescriptors(obj, (descriptor, name) => {
      // skip restricted props in strict mode
      if (
        isFunction(obj) &&
        ["arguments", "caller", "callee"].indexOf(name) !== -1
      ) {
        return false;
      }

      const value = obj[name];

      if (!isFunction(value)) {
        return;
      }

      descriptor.enumerable = false;

      if ("writable" in descriptor) {
        descriptor.writable = false;
        return;
      }

      if (!descriptor.set) {
        descriptor.set = () => {
          throw Error("Can not rewrite read-only method '" + name + "'");
        };
      }
    });
  };

  const toObjectSet = (arrayOrString, delimiter) => {
    const obj = {};

    const define = (arr) => {
      arr.forEach((value) => {
        obj[value] = true;
      });
    };

    isArray$1(arrayOrString)
      ? define(arrayOrString)
      : define(String(arrayOrString).split(delimiter));

    return obj;
  };

  const noop = () => {};

  const toFiniteNumber = (value, defaultValue) => {
    value = +value;
    return Number.isFinite(value) ? value : defaultValue;
  };

  const ALPHA = "abcdefghijklmnopqrstuvwxyz";

  const DIGIT = "0123456789";

  const ALPHABET = {
    DIGIT,
    ALPHA,
    ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT,
  };

  const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
    let str = "";
    const { length } = alphabet;
    while (size--) {
      str += alphabet[(Math.random() * length) | 0];
    }

    return str;
  };

  /**
   * If the thing is a FormData object, return true, otherwise return false.
   *
   * @param {unknown} thing - The thing to check.
   *
   * @returns {boolean}
   */
  function isSpecCompliantForm(thing) {
    return !!(
      thing &&
      isFunction(thing.append) &&
      thing[Symbol.toStringTag] === "FormData" &&
      thing[Symbol.iterator]
    );
  }

  const toJSONObject = (obj) => {
    const stack = new Array(10);

    const visit = (source, i) => {
      if (isObject(source)) {
        if (stack.indexOf(source) >= 0) {
          return;
        }

        if (!("toJSON" in source)) {
          stack[i] = source;
          const target = isArray$1(source) ? [] : {};

          forEach(source, (value, key) => {
            const reducedValue = visit(value, i + 1);
            !isUndefined(reducedValue) && (target[key] = reducedValue);
          });

          stack[i] = undefined;

          return target;
        }
      }

      return source;
    };

    return visit(obj, 0);
  };

  const isAsyncFn = kindOfTest("AsyncFunction");

  const isThenable = (thing) =>
    thing &&
    (isObject(thing) || isFunction(thing)) &&
    isFunction(thing.then) &&
    isFunction(thing.catch);

  const utils$1 = {
    isArray: isArray$1,
    isArrayBuffer,
    isBuffer: isBuffer$1,
    isFormData,
    isArrayBufferView,
    isString,
    isNumber,
    isBoolean,
    isObject,
    isPlainObject,
    isUndefined,
    isDate,
    isFile,
    isBlob,
    isRegExp,
    isFunction,
    isStream,
    isURLSearchParams,
    isTypedArray,
    isFileList,
    forEach,
    merge,
    extend,
    trim,
    stripBOM,
    inherits,
    toFlatObject,
    kindOf,
    kindOfTest,
    endsWith,
    toArray,
    forEachEntry,
    matchAll,
    isHTMLForm,
    hasOwnProperty,
    hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
    reduceDescriptors,
    freezeMethods,
    toObjectSet,
    toCamelCase,
    noop,
    toFiniteNumber,
    findKey,
    global: _global,
    isContextDefined,
    ALPHABET,
    generateString,
    isSpecCompliantForm,
    toJSONObject,
    isAsyncFn,
    isThenable,
  };

  const lookup = [];
  const revLookup = [];
  const Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
  let inited = false;
  function init() {
    inited = true;
    const code =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (let i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }

    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
  }

  function toByteArray(b64) {
    if (!inited) {
      init();
    }
    let i, j, tmp;
    const len = b64.length;

    if (len % 4 > 0) {
      throw new Error("Invalid string. Length must be a multiple of 4");
    }

    // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice
    const placeHolders =
      b64[len - 2] === "=" ? 2 : b64[len - 1] === "=" ? 1 : 0;
    // base64 is 4/3 + up to two characters of the original data
    const arr = new Arr((len * 3) / 4 - placeHolders);

    // if there are placeholders, only get up to the last complete 4 chars
    const l = placeHolders > 0 ? len - 4 : len;

    let L = 0;

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp =
        (revLookup[b64.charCodeAt(i)] << 18) |
        (revLookup[b64.charCodeAt(i + 1)] << 12) |
        (revLookup[b64.charCodeAt(i + 2)] << 6) |
        revLookup[b64.charCodeAt(i + 3)];
      arr[L++] = (tmp >> 16) & 0xff;
      arr[L++] = (tmp >> 8) & 0xff;
      arr[L++] = tmp & 0xff;
    }

    if (placeHolders === 2) {
      tmp =
        (revLookup[b64.charCodeAt(i)] << 2) |
        (revLookup[b64.charCodeAt(i + 1)] >> 4);
      arr[L++] = tmp & 0xff;
    } else if (placeHolders === 1) {
      tmp =
        (revLookup[b64.charCodeAt(i)] << 10) |
        (revLookup[b64.charCodeAt(i + 1)] << 4) |
        (revLookup[b64.charCodeAt(i + 2)] >> 2);
      arr[L++] = (tmp >> 8) & 0xff;
      arr[L++] = tmp & 0xff;
    }

    return arr;
  }

  function tripletToBase64(num) {
    return (
      lookup[(num >> 18) & 0x3f] +
      lookup[(num >> 12) & 0x3f] +
      lookup[(num >> 6) & 0x3f] +
      lookup[num & 0x3f]
    );
  }

  function encodeChunk(uint8, start, end) {
    let tmp;
    const output = [];
    for (let i = start; i < end; i += 3) {
      tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
      output.push(tripletToBase64(tmp));
    }
    return output.join("");
  }

  function fromByteArray(uint8) {
    if (!inited) {
      init();
    }
    let tmp;
    const len = uint8.length;
    const extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
    let output = "";
    const parts = [];
    const maxChunkLength = 16383; // must be multiple of 3

    // go through the array every three bytes, we'll deal with trailing stuff later
    for (let i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
      parts.push(
        encodeChunk(
          uint8,
          i,
          i + maxChunkLength > len2 ? len2 : i + maxChunkLength
        )
      );
    }

    // pad the end with zeros, but make sure to not forget the extra bytes
    if (extraBytes === 1) {
      tmp = uint8[len - 1];
      output += lookup[tmp >> 2];
      output += lookup[(tmp << 4) & 0x3f];
      output += "==";
    } else if (extraBytes === 2) {
      tmp = (uint8[len - 2] << 8) + uint8[len - 1];
      output += lookup[tmp >> 10];
      output += lookup[(tmp >> 4) & 0x3f];
      output += lookup[(tmp << 2) & 0x3f];
      output += "=";
    }

    parts.push(output);

    return parts.join("");
  }

  function read(buffer, offset, isLE, mLen, nBytes) {
    let e, m;
    const eLen = nBytes * 8 - mLen - 1;
    const eMax = (1 << eLen) - 1;
    const eBias = eMax >> 1;
    let nBits = -7;
    let i = isLE ? nBytes - 1 : 0;
    const d = isLE ? -1 : 1;
    let s = buffer[offset + i];

    i += d;

    e = s & ((1 << -nBits) - 1);
    s >>= -nBits;
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & ((1 << -nBits) - 1);
    e >>= -nBits;
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  }

  function write(buffer, value, offset, isLE, mLen, nBytes) {
    let e, m, c;
    let eLen = nBytes * 8 - mLen - 1;
    const eMax = (1 << eLen) - 1;
    const eBias = eMax >> 1;
    const rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    let i = isLE ? 0 : nBytes - 1;
    const d = isLE ? 1 : -1;
    const s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (
      ;
      mLen >= 8;
      buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8
    ) {}

    e = (e << mLen) | m;
    eLen += mLen;
    for (
      ;
      eLen > 0;
      buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8
    ) {}

    buffer[offset + i - d] |= s * 128;
  }

  const toString = {}.toString;

  const isArray =
    Array.isArray ||
    function (arr) {
      return toString.call(arr) == "[object Array]";
    };

  const INSPECT_MAX_BYTES = 50;

  /**
             * If `Buffer.TYPED_ARRAY_SUPPORT`:
             *   === true    Use Uint8Array implementation (fastest)
             *   === false   Use Object implementation (most compatible, even IE6)
             *
             * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
             * Opera 11.6+, iOS 4.2+.
             *
             * Due to various browser bugs, sometimes the Object implementation will be used even
             * when the browser supports typed arrays.
             *
             * Note:
             *
             *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
             *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
             *
             *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
             *
             *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
             *     incorrect length in some situations.

             * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
             * get the Object implementation, which is slower but behaves correctly.
             */
  Buffer.TYPED_ARRAY_SUPPORT =
    global$1.TYPED_ARRAY_SUPPORT !== undefined
      ? global$1.TYPED_ARRAY_SUPPORT
      : true;

  /*
   * Export kMaxLength after typed array support is determined.
   */
  kMaxLength();

  function kMaxLength() {
    return Buffer.TYPED_ARRAY_SUPPORT ? 0x7fffffff : 0x3fffffff;
  }

  function createBuffer(that, length) {
    if (kMaxLength() < length) {
      throw new RangeError("Invalid typed array length");
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = new Uint8Array(length);
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      if (that === null) {
        that = new Buffer(length);
      }
      that.length = length;
    }

    return that;
  }

  /**
   * The Buffer constructor returns instances of `Uint8Array` that have their
   * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
   * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
   * and the `Uint8Array` methods. Square bracket notation works as expected -- it
   * returns a single octet.
   *
   * The `Uint8Array` prototype remains unmodified.
   */

  function Buffer(arg, encodingOrOffset, length) {
    if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
      return new Buffer(arg, encodingOrOffset, length);
    }

    // Common case.
    if (typeof arg === "number") {
      if (typeof encodingOrOffset === "string") {
        throw new Error(
          "If encoding is specified then the first argument must be a string"
        );
      }
      return allocUnsafe(this, arg);
    }
    return from(this, arg, encodingOrOffset, length);
  }

  Buffer.poolSize = 8192; // not used by this implementation

  // TODO: Legacy, not needed anymore. Remove in next major version.
  Buffer._augment = function (arr) {
    arr.__proto__ = Buffer.prototype;
    return arr;
  };

  function from(that, value, encodingOrOffset, length) {
    if (typeof value === "number") {
      throw new TypeError('"value" argument must not be a number');
    }

    if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
      return fromArrayBuffer(that, value, encodingOrOffset, length);
    }

    if (typeof value === "string") {
      return fromString(that, value, encodingOrOffset);
    }

    return fromObject(that, value);
  }

  /**
   * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
   * if value is a number.
   * Buffer.from(str[, encoding])
   * Buffer.from(array)
   * Buffer.from(buffer)
   * Buffer.from(arrayBuffer[, byteOffset[, length]])
   **/
  Buffer.from = function (value, encodingOrOffset, length) {
    return from(null, value, encodingOrOffset, length);
  };

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.prototype.__proto__ = Uint8Array.prototype;
    Buffer.__proto__ = Uint8Array;
    if (
      typeof Symbol !== "undefined" &&
      Symbol.species &&
      Buffer[Symbol.species] === Buffer
    ) {
    }
  }

  function assertSize(size) {
    if (typeof size !== "number") {
      throw new TypeError('"size" argument must be a number');
    } else if (size < 0) {
      throw new RangeError('"size" argument must not be negative');
    }
  }

  function alloc(that, size, fill, encoding) {
    assertSize(size);
    if (size <= 0) {
      return createBuffer(that, size);
    }
    if (fill !== undefined) {
      // Only pay attention to encoding if it's a string. This
      // prevents accidentally sending in a number that would
      // be interpretted as a start offset.
      return typeof encoding === "string"
        ? createBuffer(that, size).fill(fill, encoding)
        : createBuffer(that, size).fill(fill);
    }
    return createBuffer(that, size);
  }

  /**
   * Creates a new filled Buffer instance.
   * alloc(size[, fill[, encoding]])
   **/
  Buffer.alloc = function (size, fill, encoding) {
    return alloc(null, size, fill, encoding);
  };

  function allocUnsafe(that, size) {
    assertSize(size);
    that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      for (let i = 0; i < size; ++i) {
        that[i] = 0;
      }
    }
    return that;
  }

  /**
   * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
   * */
  Buffer.allocUnsafe = function (size) {
    return allocUnsafe(null, size);
  };
  /**
   * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
   */
  Buffer.allocUnsafeSlow = function (size) {
    return allocUnsafe(null, size);
  };

  function fromString(that, string, encoding) {
    if (typeof encoding !== "string" || encoding === "") {
      encoding = "utf8";
    }

    if (!Buffer.isEncoding(encoding)) {
      throw new TypeError('"encoding" must be a valid string encoding');
    }

    const length = byteLength(string, encoding) | 0;
    that = createBuffer(that, length);

    const actual = that.write(string, encoding);

    if (actual !== length) {
      // Writing a hex string, for example, that contains invalid characters will
      // cause everything after the first invalid character to be ignored. (e.g.
      // 'abxxcd' will be treated as 'ab')
      that = that.slice(0, actual);
    }

    return that;
  }

  function fromArrayLike(that, array) {
    const length = array.length < 0 ? 0 : checked(array.length) | 0;
    that = createBuffer(that, length);
    for (let i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that;
  }

  function fromArrayBuffer(that, array, byteOffset, length) {
    array.byteLength; // this throws if `array` is not a valid ArrayBuffer

    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError("'offset' is out of bounds");
    }

    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError("'length' is out of bounds");
    }

    if (byteOffset === undefined && length === undefined) {
      array = new Uint8Array(array);
    } else if (length === undefined) {
      array = new Uint8Array(array, byteOffset);
    } else {
      array = new Uint8Array(array, byteOffset, length);
    }

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = array;
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      that = fromArrayLike(that, array);
    }
    return that;
  }

  function fromObject(that, obj) {
    if (internalIsBuffer(obj)) {
      const len = checked(obj.length) | 0;
      that = createBuffer(that, len);

      if (that.length === 0) {
        return that;
      }

      obj.copy(that, 0, 0, len);
      return that;
    }

    if (obj) {
      if (
        (typeof ArrayBuffer !== "undefined" &&
          obj.buffer instanceof ArrayBuffer) ||
        "length" in obj
      ) {
        if (typeof obj.length !== "number" || isnan(obj.length)) {
          return createBuffer(that, 0);
        }
        return fromArrayLike(that, obj);
      }

      if (obj.type === "Buffer" && isArray(obj.data)) {
        return fromArrayLike(that, obj.data);
      }
    }

    throw new TypeError(
      "First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object."
    );
  }

  function checked(length) {
    // Note: cannot use `length < kMaxLength()` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= kMaxLength()) {
      throw new RangeError(
        "Attempt to allocate Buffer larger than maximum " +
          "size: 0x" +
          kMaxLength().toString(16) +
          " bytes"
      );
    }
    return length | 0;
  }
  Buffer.isBuffer = isBuffer;
  function internalIsBuffer(b) {
    return !!(b != null && b._isBuffer);
  }

  Buffer.compare = function compare(a, b) {
    if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
      throw new TypeError("Arguments must be Buffers");
    }

    if (a === b) {
      return 0;
    }

    let x = a.length;
    let y = b.length;

    for (let i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break;
      }
    }

    if (x < y) {
      return -1;
    }
    if (y < x) {
      return 1;
    }
    return 0;
  };

  Buffer.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return true;
      default:
        return false;
    }
  };

  Buffer.concat = function concat(list, length) {
    if (!isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }

    if (list.length === 0) {
      return Buffer.alloc(0);
    }

    let i;
    if (length === undefined) {
      length = 0;
      for (i = 0; i < list.length; ++i) {
        length += list[i].length;
      }
    }

    const buffer = Buffer.allocUnsafe(length);
    let pos = 0;
    for (i = 0; i < list.length; ++i) {
      const buf = list[i];
      if (!internalIsBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }
      buf.copy(buffer, pos);
      pos += buf.length;
    }
    return buffer;
  };

  function byteLength(string, encoding) {
    if (internalIsBuffer(string)) {
      return string.length;
    }
    if (
      typeof ArrayBuffer !== "undefined" &&
      typeof ArrayBuffer.isView === "function" &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)
    ) {
      return string.byteLength;
    }
    if (typeof string !== "string") {
      string = "" + string;
    }

    const len = string.length;
    if (len === 0) {
      return 0;
    }

    // Use a for loop to avoid recursion
    let loweredCase = false;
    for (;;) {
      switch (encoding) {
        case "ascii":
        case "latin1":
        case "binary":
          return len;
        case "utf8":
        case "utf-8":
        case undefined:
          return utf8ToBytes(string).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return len * 2;
        case "hex":
          return len >>> 1;
        case "base64":
          return base64ToBytes(string).length;
        default:
          if (loweredCase) {
            return utf8ToBytes(string).length;
          } // assume utf8
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer.byteLength = byteLength;

  function slowToString(encoding, start, end) {
    let loweredCase = false;

    // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.

    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
    if (start === undefined || start < 0) {
      start = 0;
    }
    // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.
    if (start > this.length) {
      return "";
    }

    if (end === undefined || end > this.length) {
      end = this.length;
    }

    if (end <= 0) {
      return "";
    }

    // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
    end >>>= 0;
    start >>>= 0;

    if (end <= start) {
      return "";
    }

    if (!encoding) {
      encoding = "utf8";
    }

    while (true) {
      switch (encoding) {
        case "hex":
          return hexSlice(this, start, end);

        case "utf8":
        case "utf-8":
          return utf8Slice(this, start, end);

        case "ascii":
          return asciiSlice(this, start, end);

        case "latin1":
        case "binary":
          return latin1Slice(this, start, end);

        case "base64":
          return base64Slice(this, start, end);

        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return utf16leSlice(this, start, end);

        default:
          if (loweredCase) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          encoding = (encoding + "").toLowerCase();
          loweredCase = true;
      }
    }
  }

  // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
  // Buffer instances.
  Buffer.prototype._isBuffer = true;

  function swap(b, n, m) {
    const i = b[n];
    b[n] = b[m];
    b[m] = i;
  }

  Buffer.prototype.swap16 = function swap16() {
    const len = this.length;
    if (len % 2 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    }
    for (let i = 0; i < len; i += 2) {
      swap(this, i, i + 1);
    }
    return this;
  };

  Buffer.prototype.swap32 = function swap32() {
    const len = this.length;
    if (len % 4 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    }
    for (let i = 0; i < len; i += 4) {
      swap(this, i, i + 3);
      swap(this, i + 1, i + 2);
    }
    return this;
  };

  Buffer.prototype.swap64 = function swap64() {
    const len = this.length;
    if (len % 8 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    }
    for (let i = 0; i < len; i += 8) {
      swap(this, i, i + 7);
      swap(this, i + 1, i + 6);
      swap(this, i + 2, i + 5);
      swap(this, i + 3, i + 4);
    }
    return this;
  };

  Buffer.prototype.toString = function toString() {
    const length = this.length | 0;
    if (length === 0) {
      return "";
    }
    if (arguments.length === 0) {
      return utf8Slice(this, 0, length);
    }
    return slowToString.apply(this, arguments);
  };

  Buffer.prototype.equals = function equals(b) {
    if (!internalIsBuffer(b)) {
      throw new TypeError("Argument must be a Buffer");
    }
    if (this === b) {
      return true;
    }
    return Buffer.compare(this, b) === 0;
  };

  Buffer.prototype.inspect = function inspect() {
    let str = "";
    const max = INSPECT_MAX_BYTES;
    if (this.length > 0) {
      str = this.toString("hex", 0, max).match(/.{2}/g).join(" ");
      if (this.length > max) {
        str += " ... ";
      }
    }
    return "<Buffer " + str + ">";
  };

  Buffer.prototype.compare = function compare(
    target,
    start,
    end,
    thisStart,
    thisEnd
  ) {
    if (!internalIsBuffer(target)) {
      throw new TypeError("Argument must be a Buffer");
    }

    if (start === undefined) {
      start = 0;
    }
    if (end === undefined) {
      end = target ? target.length : 0;
    }
    if (thisStart === undefined) {
      thisStart = 0;
    }
    if (thisEnd === undefined) {
      thisEnd = this.length;
    }

    if (
      start < 0 ||
      end > target.length ||
      thisStart < 0 ||
      thisEnd > this.length
    ) {
      throw new RangeError("out of range index");
    }

    if (thisStart >= thisEnd && start >= end) {
      return 0;
    }
    if (thisStart >= thisEnd) {
      return -1;
    }
    if (start >= end) {
      return 1;
    }

    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;

    if (this === target) {
      return 0;
    }

    let x = thisEnd - thisStart;
    let y = end - start;
    const len = Math.min(x, y);

    const thisCopy = this.slice(thisStart, thisEnd);
    const targetCopy = target.slice(start, end);

    for (let i = 0; i < len; ++i) {
      if (thisCopy[i] !== targetCopy[i]) {
        x = thisCopy[i];
        y = targetCopy[i];
        break;
      }
    }

    if (x < y) {
      return -1;
    }
    if (y < x) {
      return 1;
    }
    return 0;
  };

  // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
  // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
  //
  // Arguments:
  // - buffer - a Buffer to search
  // - val - a string, Buffer, or number
  // - byteOffset - an index into `buffer`; will be clamped to an int32
  // - encoding - an optional encoding, relevant is val is a string
  // - dir - true for indexOf, false for lastIndexOf
  function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
    // Empty buffer means no match
    if (buffer.length === 0) {
      return -1;
    }

    // Normalize byteOffset
    if (typeof byteOffset === "string") {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 0x7fffffff) {
      byteOffset = 0x7fffffff;
    } else if (byteOffset < -0x80000000) {
      byteOffset = -0x80000000;
    }
    byteOffset = +byteOffset; // Coerce to Number.
    if (isNaN(byteOffset)) {
      // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
      byteOffset = dir ? 0 : buffer.length - 1;
    }

    // Normalize byteOffset: negative offsets start from the end of the buffer
    if (byteOffset < 0) {
      byteOffset = buffer.length + byteOffset;
    }
    if (byteOffset >= buffer.length) {
      if (dir) {
        return -1;
      } else {
        byteOffset = buffer.length - 1;
      }
    } else if (byteOffset < 0) {
      if (dir) {
        byteOffset = 0;
      } else {
        return -1;
      }
    }

    // Normalize val
    if (typeof val === "string") {
      val = Buffer.from(val, encoding);
    }

    // Finally, search either indexOf (if dir is true) or lastIndexOf
    if (internalIsBuffer(val)) {
      // Special case: looking for empty string/buffer always fails
      if (val.length === 0) {
        return -1;
      }
      return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
    } else if (typeof val === "number") {
      val = val & 0xff; // Search for a byte value [0-255]
      if (
        Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === "function"
      ) {
        if (dir) {
          return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
        } else {
          return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
        }
      }
      return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
    }

    throw new TypeError("val must be string, number or Buffer");
  }

  function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    let indexSize = 1;
    let arrLength = arr.length;
    let valLength = val.length;

    if (encoding !== undefined) {
      encoding = String(encoding).toLowerCase();
      if (
        encoding === "ucs2" ||
        encoding === "ucs-2" ||
        encoding === "utf16le" ||
        encoding === "utf-16le"
      ) {
        if (arr.length < 2 || val.length < 2) {
          return -1;
        }
        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }

    function read(buf, i) {
      if (indexSize === 1) {
        return buf[i];
      } else {
        return buf.readUInt16BE(i * indexSize);
      }
    }

    let i;
    if (dir) {
      let foundIndex = -1;
      for (i = byteOffset; i < arrLength; i++) {
        if (
          read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)
        ) {
          if (foundIndex === -1) {
            foundIndex = i;
          }
          if (i - foundIndex + 1 === valLength) {
            return foundIndex * indexSize;
          }
        } else {
          if (foundIndex !== -1) {
            i -= i - foundIndex;
          }
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) {
        byteOffset = arrLength - valLength;
      }
      for (i = byteOffset; i >= 0; i--) {
        let found = true;
        for (let j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false;
            break;
          }
        }
        if (found) {
          return i;
        }
      }
    }

    return -1;
  }

  Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
  };

  Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
  };

  Buffer.prototype.lastIndexOf = function lastIndexOf(
    val,
    byteOffset,
    encoding
  ) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
  };

  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    const remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }

    // must be an even number of digits
    const strLen = string.length;
    if (strLen % 2 !== 0) {
      throw new TypeError("Invalid hex string");
    }

    if (length > strLen / 2) {
      length = strLen / 2;
    }
    for (let i = 0; i < length; ++i) {
      const parsed = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(parsed)) {
        return i;
      }
      buf[offset + i] = parsed;
    }
    return i;
  }

  function utf8Write(buf, string, offset, length) {
    return blitBuffer(
      utf8ToBytes(string, buf.length - offset),
      buf,
      offset,
      length
    );
  }

  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }

  function latin1Write(buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length);
  }

  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }

  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(
      utf16leToBytes(string, buf.length - offset),
      buf,
      offset,
      length
    );
  }

  Buffer.prototype.write = function write(string, offset, length, encoding) {
    // Buffer#write(string)
    if (offset === undefined) {
      encoding = "utf8";
      length = this.length;
      offset = 0;
      // Buffer#write(string, encoding)
    } else if (length === undefined && typeof offset === "string") {
      encoding = offset;
      length = this.length;
      offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
    } else if (isFinite(offset)) {
      offset = offset | 0;
      if (isFinite(length)) {
        length = length | 0;
        if (encoding === undefined) {
          encoding = "utf8";
        }
      } else {
        encoding = length;
        length = undefined;
      }
      // legacy write(string, encoding, offset, length) - remove in v0.13
    } else {
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    }

    const remaining = this.length - offset;
    if (length === undefined || length > remaining) {
      length = remaining;
    }

    if (
      (string.length > 0 && (length < 0 || offset < 0)) ||
      offset > this.length
    ) {
      throw new RangeError("Attempt to write outside buffer bounds");
    }

    if (!encoding) {
      encoding = "utf8";
    }

    let loweredCase = false;
    for (;;) {
      switch (encoding) {
        case "hex":
          return hexWrite(this, string, offset, length);

        case "utf8":
        case "utf-8":
          return utf8Write(this, string, offset, length);

        case "ascii":
          return asciiWrite(this, string, offset, length);

        case "latin1":
        case "binary":
          return latin1Write(this, string, offset, length);

        case "base64":
          // Warning: maxLength not taken into account in base64Write
          return base64Write(this, string, offset, length);

        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return ucs2Write(this, string, offset, length);

        default:
          if (loweredCase) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };

  Buffer.prototype.toJSON = function toJSON() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0),
    };
  };

  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return fromByteArray(buf);
    } else {
      return fromByteArray(buf.slice(start, end));
    }
  }

  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    const res = [];

    let i = start;
    while (i < end) {
      const firstByte = buf[i];
      let codePoint = null;
      let bytesPerSequence =
        firstByte > 0xef ? 4 : firstByte > 0xdf ? 3 : firstByte > 0xbf ? 2 : 1;

      if (i + bytesPerSequence <= end) {
        let secondByte, thirdByte, fourthByte, tempCodePoint;

        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte;
            }
            break;
          case 2:
            secondByte = buf[i + 1];
            if ((secondByte & 0xc0) === 0x80) {
              tempCodePoint = ((firstByte & 0x1f) << 0x6) | (secondByte & 0x3f);
              if (tempCodePoint > 0x7f) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80) {
              tempCodePoint =
                ((firstByte & 0xf) << 0xc) |
                ((secondByte & 0x3f) << 0x6) |
                (thirdByte & 0x3f);
              if (
                tempCodePoint > 0x7ff &&
                (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)
              ) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];
            if (
              (secondByte & 0xc0) === 0x80 &&
              (thirdByte & 0xc0) === 0x80 &&
              (fourthByte & 0xc0) === 0x80
            ) {
              tempCodePoint =
                ((firstByte & 0xf) << 0x12) |
                ((secondByte & 0x3f) << 0xc) |
                ((thirdByte & 0x3f) << 0x6) |
                (fourthByte & 0x3f);
              if (tempCodePoint > 0xffff && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint;
              }
            }
        }
      }

      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xfffd;
        bytesPerSequence = 1;
      } else if (codePoint > 0xffff) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000;
        res.push(((codePoint >>> 10) & 0x3ff) | 0xd800);
        codePoint = 0xdc00 | (codePoint & 0x3ff);
      }

      res.push(codePoint);
      i += bytesPerSequence;
    }

    return decodeCodePointsArray(res);
  }

  // Based on http://stackoverflow.com/a/22747272/680742, the browser with
  // the lowest limit is Chrome, with 0x10000 args.
  // We go 1 magnitude less, for safety
  const MAX_ARGUMENTS_LENGTH = 0x1000;

  function decodeCodePointsArray(codePoints) {
    const len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
    }

    // Decode in chunks to avoid "call stack size exceeded".
    let res = "";
    let i = 0;
    while (i < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH))
      );
    }
    return res;
  }

  function asciiSlice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);

    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 0x7f);
    }
    return ret;
  }

  function latin1Slice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);

    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i]);
    }
    return ret;
  }

  function hexSlice(buf, start, end) {
    const len = buf.length;

    if (!start || start < 0) {
      start = 0;
    }
    if (!end || end < 0 || end > len) {
      end = len;
    }

    let out = "";
    for (let i = start; i < end; ++i) {
      out += toHex(buf[i]);
    }
    return out;
  }

  function utf16leSlice(buf, start, end) {
    const bytes = buf.slice(start, end);
    let res = "";
    for (let i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res;
  }

  Buffer.prototype.slice = function slice(start, end) {
    const len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;

    if (start < 0) {
      start += len;
      if (start < 0) {
        start = 0;
      }
    } else if (start > len) {
      start = len;
    }

    if (end < 0) {
      end += len;
      if (end < 0) {
        end = 0;
      }
    } else if (end > len) {
      end = len;
    }

    if (end < start) {
      end = start;
    }

    let newBuf;
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      newBuf = this.subarray(start, end);
      newBuf.__proto__ = Buffer.prototype;
    } else {
      const sliceLen = end - start;
      newBuf = new Buffer(sliceLen, undefined);
      for (let i = 0; i < sliceLen; ++i) {
        newBuf[i] = this[i + start];
      }
    }

    return newBuf;
  };

  /*
   * Need to make sure that buffer isn't trying to write out of bounds.
   */
  function checkOffset(offset, ext, length) {
    if (offset % 1 !== 0 || offset < 0) {
      throw new RangeError("offset is not uint");
    }
    if (offset + ext > length) {
      throw new RangeError("Trying to access beyond buffer length");
    }
  }

  Buffer.prototype.readUIntLE = function readUIntLE(
    offset,
    byteLength,
    noAssert
  ) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    let val = this[offset];
    let mul = 1;
    let i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }

    return val;
  };

  Buffer.prototype.readUIntBE = function readUIntBE(
    offset,
    byteLength,
    noAssert
  ) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    let val = this[offset + --byteLength];
    let mul = 1;
    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul;
    }

    return val;
  };

  Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 1, this.length);
    }
    return this[offset];
  };

  Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 2, this.length);
    }
    return this[offset] | (this[offset + 1] << 8);
  };

  Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 2, this.length);
    }
    return (this[offset] << 8) | this[offset + 1];
  };

  Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 4, this.length);
    }

    return (
      (this[offset] | (this[offset + 1] << 8) | (this[offset + 2] << 16)) +
      this[offset + 3] * 0x1000000
    );
  };

  Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 4, this.length);
    }

    return (
      this[offset] * 0x1000000 +
      ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3])
    );
  };

  Buffer.prototype.readIntLE = function readIntLE(
    offset,
    byteLength,
    noAssert
  ) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    let val = this[offset];
    let mul = 1;
    let i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }
    mul *= 0x80;

    if (val >= mul) {
      val -= Math.pow(2, 8 * byteLength);
    }

    return val;
  };

  Buffer.prototype.readIntBE = function readIntBE(
    offset,
    byteLength,
    noAssert
  ) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    let i = byteLength;
    let mul = 1;
    let val = this[offset + --i];
    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul;
    }
    mul *= 0x80;

    if (val >= mul) {
      val -= Math.pow(2, 8 * byteLength);
    }

    return val;
  };

  Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 1, this.length);
    }
    if (!(this[offset] & 0x80)) {
      return this[offset];
    }
    return (0xff - this[offset] + 1) * -1;
  };

  Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 2, this.length);
    }
    const val = this[offset] | (this[offset + 1] << 8);
    return val & 0x8000 ? val | 0xffff0000 : val;
  };

  Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 2, this.length);
    }
    const val = this[offset + 1] | (this[offset] << 8);
    return val & 0x8000 ? val | 0xffff0000 : val;
  };

  Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 4, this.length);
    }

    return (
      this[offset] |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
    );
  };

  Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 4, this.length);
    }

    return (
      (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3]
    );
  };

  Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 4, this.length);
    }
    return read(this, offset, true, 23, 4);
  };

  Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 4, this.length);
    }
    return read(this, offset, false, 23, 4);
  };

  Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 8, this.length);
    }
    return read(this, offset, true, 52, 8);
  };

  Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    if (!noAssert) {
      checkOffset(offset, 8, this.length);
    }
    return read(this, offset, false, 52, 8);
  };

  function checkInt(buf, value, offset, ext, max, min) {
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"buffer" argument must be a Buffer instance');
    }
    if (value > max || value < min) {
      throw new RangeError('"value" argument is out of bounds');
    }
    if (offset + ext > buf.length) {
      throw new RangeError("Index out of range");
    }
  }

  Buffer.prototype.writeUIntLE = function writeUIntLE(
    value,
    offset,
    byteLength,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    let mul = 1;
    let i = 0;
    this[offset] = value & 0xff;
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xff;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeUIntBE = function writeUIntBE(
    value,
    offset,
    byteLength,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    let i = byteLength - 1;
    let mul = 1;
    this[offset + i] = value & 0xff;
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xff;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 1, 0xff, 0);
    }
    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      value = Math.floor(value);
    }
    this[offset] = value & 0xff;
    return offset + 1;
  };

  function objectWriteUInt16(buf, value, offset, littleEndian) {
    if (value < 0) {
      value = 0xffff + value + 1;
    }
    for (let i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
      buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
        ((littleEndian ? i : 1 - i) * 8);
    }
  }

  Buffer.prototype.writeUInt16LE = function writeUInt16LE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 2, 0xffff, 0);
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2;
  };

  Buffer.prototype.writeUInt16BE = function writeUInt16BE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 2, 0xffff, 0);
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 8;
      this[offset + 1] = value & 0xff;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2;
  };

  function objectWriteUInt32(buf, value, offset, littleEndian) {
    if (value < 0) {
      value = 0xffffffff + value + 1;
    }
    for (let i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
      buf[offset + i] = (value >>> ((littleEndian ? i : 3 - i) * 8)) & 0xff;
    }
  }

  Buffer.prototype.writeUInt32LE = function writeUInt32LE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 4, 0xffffffff, 0);
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4;
  };

  Buffer.prototype.writeUInt32BE = function writeUInt32BE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 4, 0xffffffff, 0);
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4;
  };

  Buffer.prototype.writeIntLE = function writeIntLE(
    value,
    offset,
    byteLength,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength - 1);

      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    let i = 0;
    let mul = 1;
    let sub = 0;
    this[offset] = value & 0xff;
    while (++i < byteLength && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeIntBE = function writeIntBE(
    value,
    offset,
    byteLength,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength - 1);

      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    let i = byteLength - 1;
    let mul = 1;
    let sub = 0;
    this[offset + i] = value & 0xff;
    while (--i >= 0 && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 1, 0x7f, -0x80);
    }
    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      value = Math.floor(value);
    }
    if (value < 0) {
      value = 0xff + value + 1;
    }
    this[offset] = value & 0xff;
    return offset + 1;
  };

  Buffer.prototype.writeInt16LE = function writeInt16LE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2;
  };

  Buffer.prototype.writeInt16BE = function writeInt16BE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 2, 0x7fff, -0x8000);
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 8;
      this[offset + 1] = value & 0xff;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2;
  };

  Buffer.prototype.writeInt32LE = function writeInt32LE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4;
  };

  Buffer.prototype.writeInt32BE = function writeInt32BE(
    value,
    offset,
    noAssert
  ) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    }
    if (value < 0) {
      value = 0xffffffff + value + 1;
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4;
  };

  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) {
      throw new RangeError("Index out of range");
    }
    if (offset < 0) {
      throw new RangeError("Index out of range");
    }
  }

  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4);
    }
    write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }

  Buffer.prototype.writeFloatLE = function writeFloatLE(
    value,
    offset,
    noAssert
  ) {
    return writeFloat(this, value, offset, true, noAssert);
  };

  Buffer.prototype.writeFloatBE = function writeFloatBE(
    value,
    offset,
    noAssert
  ) {
    return writeFloat(this, value, offset, false, noAssert);
  };

  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8);
    }
    write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }

  Buffer.prototype.writeDoubleLE = function writeDoubleLE(
    value,
    offset,
    noAssert
  ) {
    return writeDouble(this, value, offset, true, noAssert);
  };

  Buffer.prototype.writeDoubleBE = function writeDoubleBE(
    value,
    offset,
    noAssert
  ) {
    return writeDouble(this, value, offset, false, noAssert);
  };

  // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
  Buffer.prototype.copy = function copy(target, targetStart, start, end) {
    if (!start) {
      start = 0;
    }
    if (!end && end !== 0) {
      end = this.length;
    }
    if (targetStart >= target.length) {
      targetStart = target.length;
    }
    if (!targetStart) {
      targetStart = 0;
    }
    if (end > 0 && end < start) {
      end = start;
    }

    // Copy 0 bytes; we're done
    if (end === start) {
      return 0;
    }
    if (target.length === 0 || this.length === 0) {
      return 0;
    }

    // Fatal error conditions
    if (targetStart < 0) {
      throw new RangeError("targetStart out of bounds");
    }
    if (start < 0 || start >= this.length) {
      throw new RangeError("sourceStart out of bounds");
    }
    if (end < 0) {
      throw new RangeError("sourceEnd out of bounds");
    }

    // Are we oob?
    if (end > this.length) {
      end = this.length;
    }
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }

    const len = end - start;
    let i;

    if (this === target && start < targetStart && targetStart < end) {
      // descending copy from end
      for (i = len - 1; i >= 0; --i) {
        target[i + targetStart] = this[i + start];
      }
    } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
      // ascending copy from start
      for (i = 0; i < len; ++i) {
        target[i + targetStart] = this[i + start];
      }
    } else {
      Uint8Array.prototype.set.call(
        target,
        this.subarray(start, start + len),
        targetStart
      );
    }

    return len;
  };

  // Usage:
  //    buffer.fill(number[, offset[, end]])
  //    buffer.fill(buffer[, offset[, end]])
  //    buffer.fill(string[, offset[, end]][, encoding])
  Buffer.prototype.fill = function fill(val, start, end, encoding) {
    // Handle string cases:
    if (typeof val === "string") {
      if (typeof start === "string") {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === "string") {
        encoding = end;
        end = this.length;
      }
      if (val.length === 1) {
        const code = val.charCodeAt(0);
        if (code < 256) {
          val = code;
        }
      }
      if (encoding !== undefined && typeof encoding !== "string") {
        throw new TypeError("encoding must be a string");
      }
      if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
    } else if (typeof val === "number") {
      val = val & 255;
    }

    // Invalid ranges are not set to a default, so can range check early.
    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError("Out of range index");
    }

    if (end <= start) {
      return this;
    }

    start = start >>> 0;
    end = end === undefined ? this.length : end >>> 0;

    if (!val) {
      val = 0;
    }

    let i;
    if (typeof val === "number") {
      for (i = start; i < end; ++i) {
        this[i] = val;
      }
    } else {
      const bytes = internalIsBuffer(val)
        ? val
        : utf8ToBytes(new Buffer(val, encoding).toString());
      const len = bytes.length;
      for (i = 0; i < end - start; ++i) {
        this[i + start] = bytes[i % len];
      }
    }

    return this;
  };

  // HELPER FUNCTIONS
  // ================

  const INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

  function base64clean(str) {
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = stringtrim(str).replace(INVALID_BASE64_RE, "");
    // Node converts strings with length < 2 to ''
    if (str.length < 2) {
      return "";
    }
    // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    while (str.length % 4 !== 0) {
      str = str + "=";
    }
    return str;
  }

  function stringtrim(str) {
    if (str.trim) {
      return str.trim();
    }
    return str.replace(/^\s+|\s+$/g, "");
  }

  function toHex(n) {
    if (n < 16) {
      return "0" + n.toString(16);
    }
    return n.toString(16);
  }

  function utf8ToBytes(string, units) {
    units = units || Infinity;
    let codePoint;
    const length = string.length;
    let leadSurrogate = null;
    const bytes = [];

    for (let i = 0; i < length; ++i) {
      codePoint = string.charCodeAt(i);

      // is surrogate component
      if (codePoint > 0xd7ff && codePoint < 0xe000) {
        // last char was a lead
        if (!leadSurrogate) {
          // no lead yet
          if (codePoint > 0xdbff) {
            // unexpected trail
            if ((units -= 3) > -1) {
              bytes.push(0xef, 0xbf, 0xbd);
            }
            continue;
          } else if (i + 1 === length) {
            // unpaired lead
            if ((units -= 3) > -1) {
              bytes.push(0xef, 0xbf, 0xbd);
            }
            continue;
          }

          // valid lead
          leadSurrogate = codePoint;

          continue;
        }

        // 2 leads in a row
        if (codePoint < 0xdc00) {
          if ((units -= 3) > -1) {
            bytes.push(0xef, 0xbf, 0xbd);
          }
          leadSurrogate = codePoint;
          continue;
        }

        // valid surrogate pair
        codePoint =
          (((leadSurrogate - 0xd800) << 10) | (codePoint - 0xdc00)) + 0x10000;
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if ((units -= 3) > -1) {
          bytes.push(0xef, 0xbf, 0xbd);
        }
      }

      leadSurrogate = null;

      // encode utf8
      if (codePoint < 0x80) {
        if ((units -= 1) < 0) {
          break;
        }
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0) {
          break;
        }
        bytes.push((codePoint >> 0x6) | 0xc0, (codePoint & 0x3f) | 0x80);
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0) {
          break;
        }
        bytes.push(
          (codePoint >> 0xc) | 0xe0,
          ((codePoint >> 0x6) & 0x3f) | 0x80,
          (codePoint & 0x3f) | 0x80
        );
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0) {
          break;
        }
        bytes.push(
          (codePoint >> 0x12) | 0xf0,
          ((codePoint >> 0xc) & 0x3f) | 0x80,
          ((codePoint >> 0x6) & 0x3f) | 0x80,
          (codePoint & 0x3f) | 0x80
        );
      } else {
        throw new Error("Invalid code point");
      }
    }

    return bytes;
  }

  function asciiToBytes(str) {
    const byteArray = [];
    for (let i = 0; i < str.length; ++i) {
      // Node's code seems to be doing this and not & 0x7F..
      byteArray.push(str.charCodeAt(i) & 0xff);
    }
    return byteArray;
  }

  function utf16leToBytes(str, units) {
    let c, hi, lo;
    const byteArray = [];
    for (let i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) {
        break;
      }

      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }

    return byteArray;
  }

  function base64ToBytes(str) {
    return toByteArray(base64clean(str));
  }

  function blitBuffer(src, dst, offset, length) {
    for (let i = 0; i < length; ++i) {
      if (i + offset >= dst.length || i >= src.length) {
        break;
      }
      dst[i + offset] = src[i];
    }
    return i;
  }

  function isnan(val) {
    return val !== val; // eslint-disable-line no-self-compare
  }

  // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
  // The _isBuffer check is for Safari 5-7 support, because it's missing
  // Object.prototype.constructor. Remove this eventually
  function isBuffer(obj) {
    return (
      obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
    );
  }

  function isFastBuffer(obj) {
    return (
      !!obj.constructor &&
      typeof obj.constructor.isBuffer === "function" &&
      obj.constructor.isBuffer(obj)
    );
  }

  // For Node v0.10 support. Remove this eventually.
  function isSlowBuffer(obj) {
    return (
      typeof obj.readFloatLE === "function" &&
      typeof obj.slice === "function" &&
      isFastBuffer(obj.slice(0, 0))
    );
  }

  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  function AxiosError(message, code, config, request, response) {
    Error.call(this);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack;
    }

    this.message = message;
    this.name = "AxiosError";
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    response && (this.response = response);
  }

  utils$1.inherits(AxiosError, Error, {
    toJSON: function toJSON() {
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
        config: utils$1.toJSONObject(this.config),
        code: this.code,
        status:
          this.response && this.response.status ? this.response.status : null,
      };
    },
  });

  const prototype$1 = AxiosError.prototype;
  const descriptors = {};

  [
    "ERR_BAD_OPTION_VALUE",
    "ERR_BAD_OPTION",
    "ECONNABORTED",
    "ETIMEDOUT",
    "ERR_NETWORK",
    "ERR_FR_TOO_MANY_REDIRECTS",
    "ERR_DEPRECATED",
    "ERR_BAD_RESPONSE",
    "ERR_BAD_REQUEST",
    "ERR_CANCELED",
    "ERR_NOT_SUPPORT",
    "ERR_INVALID_URL",
    // eslint-disable-next-line func-names
  ].forEach((code) => {
    descriptors[code] = { value: code };
  });

  Object.defineProperties(AxiosError, descriptors);
  Object.defineProperty(prototype$1, "isAxiosError", { value: true });

  // eslint-disable-next-line func-names
  AxiosError.from = (error, code, config, request, response, customProps) => {
    const axiosError = Object.create(prototype$1);

    utils$1.toFlatObject(
      error,
      axiosError,
      function filter(obj) {
        return obj !== Error.prototype;
      },
      (prop) => {
        return prop !== "isAxiosError";
      }
    );

    AxiosError.call(axiosError, error.message, code, config, request, response);

    axiosError.cause = error;

    axiosError.name = error.name;

    customProps && Object.assign(axiosError, customProps);

    return axiosError;
  };

  // eslint-disable-next-line strict
  const httpAdapter = null;

  /**
   * Determines if the given thing is a array or js object.
   *
   * @param {string} thing - The object or array to be visited.
   *
   * @returns {boolean}
   */
  function isVisitable(thing) {
    return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
  }

  /**
   * It removes the brackets from the end of a string
   *
   * @param {string} key - The key of the parameter.
   *
   * @returns {string} the key without the brackets.
   */
  function removeBrackets(key) {
    return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
  }

  /**
   * It takes a path, a key, and a boolean, and returns a string
   *
   * @param {string} path - The path to the current key.
   * @param {string} key - The key of the current object being iterated over.
   * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
   *
   * @returns {string} The path to the current key.
   */
  function renderKey(path, key, dots) {
    if (!path) {
      return key;
    }
    return path
      .concat(key)
      .map(function each(token, i) {
        // eslint-disable-next-line no-param-reassign
        token = removeBrackets(token);
        return !dots && i ? "[" + token + "]" : token;
      })
      .join(dots ? "." : "");
  }

  /**
   * If the array is an array and none of its elements are visitable, then it's a flat array.
   *
   * @param {Array<any>} arr - The array to check
   *
   * @returns {boolean}
   */
  function isFlatArray(arr) {
    return utils$1.isArray(arr) && !arr.some(isVisitable);
  }

  const predicates = utils$1.toFlatObject(
    utils$1,
    {},
    null,
    function filter(prop) {
      return /^is[A-Z]/.test(prop);
    }
  );

  /**
   * Convert a data object to FormData
   *
   * @param {Object} obj
   * @param {?Object} [formData]
   * @param {?Object} [options]
   * @param {Function} [options.visitor]
   * @param {Boolean} [options.metaTokens = true]
   * @param {Boolean} [options.dots = false]
   * @param {?Boolean} [options.indexes = false]
   *
   * @returns {Object}
   **/

  /**
   * It converts an object into a FormData object
   *
   * @param {Object<any, any>} obj - The object to convert to form data.
   * @param {string} formData - The FormData object to append to.
   * @param {Object<string, any>} options
   *
   * @returns
   */
  function toFormData(obj, formData, options) {
    if (!utils$1.isObject(obj)) {
      throw new TypeError("target must be an object");
    }

    // eslint-disable-next-line no-param-reassign
    formData = formData || new FormData();

    // eslint-disable-next-line no-param-reassign
    options = utils$1.toFlatObject(
      options,
      {
        metaTokens: true,
        dots: false,
        indexes: false,
      },
      false,
      function defined(option, source) {
        // eslint-disable-next-line no-eq-null,eqeqeq
        return !utils$1.isUndefined(source[option]);
      }
    );

    const metaTokens = options.metaTokens;
    // eslint-disable-next-line no-use-before-define
    const visitor = options.visitor || defaultVisitor;
    const dots = options.dots;
    const indexes = options.indexes;
    const _Blob = options.Blob || (typeof Blob !== "undefined" && Blob);
    const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);

    if (!utils$1.isFunction(visitor)) {
      throw new TypeError("visitor must be a function");
    }

    function convertValue(value) {
      if (value === null) {
        return "";
      }

      if (utils$1.isDate(value)) {
        return value.toISOString();
      }

      if (!useBlob && utils$1.isBlob(value)) {
        throw new AxiosError("Blob is not supported. Use a Buffer instead.");
      }

      if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
        return useBlob && typeof Blob === "function"
          ? new Blob([value])
          : Buffer.from(value);
      }

      return value;
    }

    /**
     * Default visitor.
     *
     * @param {*} value
     * @param {String|Number} key
     * @param {Array<String|Number>} path
     * @this {FormData}
     *
     * @returns {boolean} return true to visit the each prop of the value recursively
     */
    function defaultVisitor(value, key, path) {
      let arr = value;

      if (value && !path && typeof value === "object") {
        if (utils$1.endsWith(key, "{}")) {
          // eslint-disable-next-line no-param-reassign
          key = metaTokens ? key : key.slice(0, -2);
          // eslint-disable-next-line no-param-reassign
          value = JSON.stringify(value);
        } else if (
          (utils$1.isArray(value) && isFlatArray(value)) ||
          ((utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) &&
            (arr = utils$1.toArray(value)))
        ) {
          // eslint-disable-next-line no-param-reassign
          key = removeBrackets(key);

          arr.forEach(function each(el, index) {
            !(utils$1.isUndefined(el) || el === null) &&
              formData.append(
                // eslint-disable-next-line no-nested-ternary
                indexes === true
                  ? renderKey([key], index, dots)
                  : indexes === null
                  ? key
                  : key + "[]",
                convertValue(el)
              );
          });
          return false;
        }
      }

      if (isVisitable(value)) {
        return true;
      }

      formData.append(renderKey(path, key, dots), convertValue(value));

      return false;
    }

    const stack = [];

    const exposedHelpers = Object.assign(predicates, {
      defaultVisitor,
      convertValue,
      isVisitable,
    });

    function build(value, path) {
      if (utils$1.isUndefined(value)) {
        return;
      }

      if (stack.indexOf(value) !== -1) {
        throw Error("Circular reference detected in " + path.join("."));
      }

      stack.push(value);

      utils$1.forEach(value, function each(el, key) {
        const result =
          !(utils$1.isUndefined(el) || el === null) &&
          visitor.call(
            formData,
            el,
            utils$1.isString(key) ? key.trim() : key,
            path,
            exposedHelpers
          );

        if (result === true) {
          build(el, path ? path.concat(key) : [key]);
        }
      });

      stack.pop();
    }

    if (!utils$1.isObject(obj)) {
      throw new TypeError("data must be an object");
    }

    build(obj);

    return formData;
  }

  /**
   * It encodes a string by replacing all characters that are not in the unreserved set with
   * their percent-encoded equivalents
   *
   * @param {string} str - The string to encode.
   *
   * @returns {string} The encoded string.
   */
  function encode$1(str) {
    const charMap = {
      "!": "%21",
      "'": "%27",
      "(": "%28",
      ")": "%29",
      "~": "%7E",
      "%20": "+",
      "%00": "\x00",
    };
    return encodeURIComponent(str).replace(
      /[!'()~]|%20|%00/g,
      function replacer(match) {
        return charMap[match];
      }
    );
  }

  /**
   * It takes a params object and converts it to a FormData object
   *
   * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
   * @param {Object<string, any>} options - The options object passed to the Axios constructor.
   *
   * @returns {void}
   */
  function AxiosURLSearchParams(params, options) {
    this._pairs = [];

    params && toFormData(params, this, options);
  }

  const prototype = AxiosURLSearchParams.prototype;

  prototype.append = function append(name, value) {
    this._pairs.push([name, value]);
  };

  prototype.toString = function toString(encoder) {
    const _encode = encoder
      ? function (value) {
          return encoder.call(this, value, encode$1);
        }
      : encode$1;

    return this._pairs
      .map(function each(pair) {
        return _encode(pair[0]) + "=" + _encode(pair[1]);
      }, "")
      .join("&");
  };

  /**
   * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
   * URI encoded counterparts
   *
   * @param {string} val The value to be encoded.
   *
   * @returns {string} The encoded value.
   */
  function encode(val) {
    return encodeURIComponent(val)
      .replace(/%3A/gi, ":")
      .replace(/%24/g, "$")
      .replace(/%2C/gi, ",")
      .replace(/%20/g, "+")
      .replace(/%5B/gi, "[")
      .replace(/%5D/gi, "]");
  }

  /**
   * Build a URL by appending params to the end
   *
   * @param {string} url The base of the url (e.g., http://www.google.com)
   * @param {object} [params] The params to be appended
   * @param {?object} options
   *
   * @returns {string} The formatted url
   */
  function buildURL(url, params, options) {
    /*eslint no-param-reassign:0*/
    if (!params) {
      return url;
    }

    const _encode = (options && options.encode) || encode;

    const serializeFn = options && options.serialize;

    let serializedParams;

    if (serializeFn) {
      serializedParams = serializeFn(params, options);
    } else {
      serializedParams = utils$1.isURLSearchParams(params)
        ? params.toString()
        : new AxiosURLSearchParams(params, options).toString(_encode);
    }

    if (serializedParams) {
      const hashmarkIndex = url.indexOf("#");

      if (hashmarkIndex !== -1) {
        url = url.slice(0, hashmarkIndex);
      }
      url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
    }

    return url;
  }

  class InterceptorManager {
    constructor() {
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
    use(fulfilled, rejected, options) {
      this.handlers.push({
        fulfilled,
        rejected,
        synchronous: options ? options.synchronous : false,
        runWhen: options ? options.runWhen : null,
      });
      return this.handlers.length - 1;
    }

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     *
     * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
     */
    eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    }

    /**
     * Clear all interceptors from the stack
     *
     * @returns {void}
     */
    clear() {
      if (this.handlers) {
        this.handlers = [];
      }
    }

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     *
     * @returns {void}
     */
    forEach(fn) {
      utils$1.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    }
  }

  const InterceptorManager$1 = InterceptorManager;

  const transitionalDefaults = {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: false,
  };

  const URLSearchParams$1 =
    typeof URLSearchParams !== "undefined"
      ? URLSearchParams
      : AxiosURLSearchParams;

  const FormData$1 = typeof FormData !== "undefined" ? FormData : null;

  const Blob$1 = typeof Blob !== "undefined" ? Blob : null;

  const platform$1 = {
    isBrowser: true,
    classes: {
      URLSearchParams: URLSearchParams$1,
      FormData: FormData$1,
      Blob: Blob$1,
    },
    protocols: ["http", "https", "file", "blob", "url", "data"],
  };

  const hasBrowserEnv =
    typeof window !== "undefined" && typeof document !== "undefined";

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
   *
   * @returns {boolean}
   */
  const hasStandardBrowserEnv = ((product) => {
    return (
      hasBrowserEnv &&
      ["ReactNative", "NativeScript", "NS"].indexOf(product) < 0
    );
  })(typeof navigator !== "undefined" && navigator.product);

  /**
   * Determine if we're running in a standard browser webWorker environment
   *
   * Although the `isStandardBrowserEnv` method indicates that
   * `allows axios to run in a web worker`, the WebWorker will still be
   * filtered out due to its judgment standard
   * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
   * This leads to a problem when axios post `FormData` in webWorker
   */
  const hasStandardBrowserWebWorkerEnv = (() => {
    return (
      typeof WorkerGlobalScope !== "undefined" &&
      // eslint-disable-next-line no-undef
      self instanceof WorkerGlobalScope &&
      typeof self.importScripts === "function"
    );
  })();

  const utils = /*#__PURE__*/ Object.freeze({
    __proto__: null,
    hasBrowserEnv,
    hasStandardBrowserEnv,
    hasStandardBrowserWebWorkerEnv,
  });

  const platform = {
    ...utils,
    ...platform$1,
  };

  function toURLEncodedForm(data, options) {
    return toFormData(
      data,
      new platform.classes.URLSearchParams(),
      Object.assign(
        {
          visitor(value, key, path, helpers) {
            if (platform.isNode && utils$1.isBuffer(value)) {
              this.append(key, value.toString("base64"));
              return false;
            }

            return helpers.defaultVisitor.apply(this, arguments);
          },
        },
        options
      )
    );
  }

  /**
   * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
   *
   * @param {string} name - The name of the property to get.
   *
   * @returns An array of strings.
   */
  function parsePropPath(name) {
    // foo[x][y][z]
    // foo.x.y.z
    // foo-x-y-z
    // foo x y z
    return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
      return match[0] === "[]" ? "" : match[1] || match[0];
    });
  }

  /**
   * Convert an array to an object.
   *
   * @param {Array<any>} arr - The array to convert to an object.
   *
   * @returns An object with the same keys and values as the array.
   */
  function arrayToObject(arr) {
    const obj = {};
    const keys = Object.keys(arr);
    let i;
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      obj[key] = arr[key];
    }
    return obj;
  }

  /**
   * It takes a FormData object and returns a JavaScript object
   *
   * @param {string} formData The FormData object to convert to JSON.
   *
   * @returns {Object<string, any> | null} The converted object.
   */
  function formDataToJSON(formData) {
    function buildPath(path, value, target, index) {
      let name = path[index++];

      if (name === "__proto__") {
        return true;
      }

      const isNumericKey = Number.isFinite(+name);
      const isLast = index >= path.length;
      name = !name && utils$1.isArray(target) ? target.length : name;

      if (isLast) {
        if (utils$1.hasOwnProp(target, name)) {
          target[name] = [target[name], value];
        } else {
          target[name] = value;
        }

        return !isNumericKey;
      }

      if (!target[name] || !utils$1.isObject(target[name])) {
        target[name] = [];
      }

      const result = buildPath(path, value, target[name], index);

      if (result && utils$1.isArray(target[name])) {
        target[name] = arrayToObject(target[name]);
      }

      return !isNumericKey;
    }

    if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
      const obj = {};

      utils$1.forEachEntry(formData, (name, value) => {
        buildPath(parsePropPath(name), value, obj, 0);
      });

      return obj;
    }

    return null;
  }

  /**
   * It takes a string, tries to parse it, and if it fails, it returns the stringified version
   * of the input
   *
   * @param {any} rawValue - The value to be stringified.
   * @param {Function} parser - A function that parses a string into a JavaScript object.
   * @param {Function} encoder - A function that takes a value and returns a string.
   *
   * @returns {string} A stringified version of the rawValue.
   */
  function stringifySafely(rawValue, parser, encoder) {
    if (utils$1.isString(rawValue)) {
      try {
        (parser || JSON.parse)(rawValue);
        return utils$1.trim(rawValue);
      } catch (e) {
        if (e.name !== "SyntaxError") {
          throw e;
        }
      }
    }

    return (encoder || JSON.stringify)(rawValue);
  }

  const defaults = {
    transitional: transitionalDefaults,

    adapter: ["xhr", "http"],

    transformRequest: [
      function transformRequest(data, headers) {
        const contentType = headers.getContentType() || "";
        const hasJSONContentType = contentType.indexOf("application/json") > -1;
        const isObjectPayload = utils$1.isObject(data);

        if (isObjectPayload && utils$1.isHTMLForm(data)) {
          data = new FormData(data);
        }

        const isFormData = utils$1.isFormData(data);

        if (isFormData) {
          return hasJSONContentType
            ? JSON.stringify(formDataToJSON(data))
            : data;
        }

        if (
          utils$1.isArrayBuffer(data) ||
          utils$1.isBuffer(data) ||
          utils$1.isStream(data) ||
          utils$1.isFile(data) ||
          utils$1.isBlob(data)
        ) {
          return data;
        }
        if (utils$1.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils$1.isURLSearchParams(data)) {
          headers.setContentType(
            "application/x-www-form-urlencoded;charset=utf-8",
            false
          );
          return data.toString();
        }

        let isFileList;

        if (isObjectPayload) {
          if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }

          if (
            (isFileList = utils$1.isFileList(data)) ||
            contentType.indexOf("multipart/form-data") > -1
          ) {
            const _FormData = this.env && this.env.FormData;

            return toFormData(
              isFileList ? { "files[]": data } : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }

        if (isObjectPayload || hasJSONContentType) {
          headers.setContentType("application/json", false);
          return stringifySafely(data);
        }

        return data;
      },
    ],

    transformResponse: [
      function transformResponse(data) {
        const transitional = this.transitional || defaults.transitional;
        const forcedJSONParsing =
          transitional && transitional.forcedJSONParsing;
        const JSONRequested = this.responseType === "json";

        if (
          data &&
          utils$1.isString(data) &&
          ((forcedJSONParsing && !this.responseType) || JSONRequested)
        ) {
          const silentJSONParsing =
            transitional && transitional.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;

          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === "SyntaxError") {
                throw AxiosError.from(
                  e,
                  AxiosError.ERR_BAD_RESPONSE,
                  this,
                  null,
                  this.response
                );
              }
              throw e;
            }
          }
        }

        return data;
      },
    ],

    /**
     * A timeout in milliseconds to abort a request. If set to 0 (default) a
     * timeout is not created.
     */
    timeout: 0,

    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",

    maxContentLength: -1,
    maxBodyLength: -1,

    env: {
      FormData: platform.classes.FormData,
      Blob: platform.classes.Blob,
    },

    validateStatus: function validateStatus(status) {
      return status >= 200 && status < 300;
    },

    headers: {
      common: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": undefined,
      },
    },
  };

  utils$1.forEach(
    ["delete", "get", "head", "post", "put", "patch"],
    (method) => {
      defaults.headers[method] = {};
    }
  );

  const defaults$1 = defaults;

  // RawAxiosHeaders whose duplicates are ignored by node
  // c.f. https://nodejs.org/api/http.html#http_message_headers
  const ignoreDuplicateOf = utils$1.toObjectSet([
    "age",
    "authorization",
    "content-length",
    "content-type",
    "etag",
    "expires",
    "from",
    "host",
    "if-modified-since",
    "if-unmodified-since",
    "last-modified",
    "location",
    "max-forwards",
    "proxy-authorization",
    "referer",
    "retry-after",
    "user-agent",
  ]);

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
   * @param {String} rawHeaders Headers needing to be parsed
   *
   * @returns {Object} Headers parsed into an object
   */
  const parseHeaders = (rawHeaders) => {
    const parsed = {};
    let key;
    let val;
    let i;

    rawHeaders &&
      rawHeaders.split("\n").forEach(function parser(line) {
        i = line.indexOf(":");
        key = line.substring(0, i).trim().toLowerCase();
        val = line.substring(i + 1).trim();

        if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
          return;
        }

        if (key === "set-cookie") {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
        }
      });

    return parsed;
  };

  const $internals = Symbol("internals");

  function normalizeHeader(header) {
    return header && String(header).trim().toLowerCase();
  }

  function normalizeValue(value) {
    if (value === false || value == null) {
      return value;
    }

    return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
  }

  function parseTokens(str) {
    const tokens = Object.create(null);
    const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
    let match;

    while ((match = tokensRE.exec(str))) {
      tokens[match[1]] = match[2];
    }

    return tokens;
  }

  const isValidHeaderName = (str) =>
    /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

  function matchHeaderValue(
    context,
    value,
    header,
    filter,
    isHeaderNameFilter
  ) {
    if (utils$1.isFunction(filter)) {
      return filter.call(this, value, header);
    }

    if (isHeaderNameFilter) {
      value = header;
    }

    if (!utils$1.isString(value)) {
      return;
    }

    if (utils$1.isString(filter)) {
      return value.indexOf(filter) !== -1;
    }

    if (utils$1.isRegExp(filter)) {
      return filter.test(value);
    }
  }

  function formatHeader(header) {
    return header
      .trim()
      .toLowerCase()
      .replace(/([a-z\d])(\w*)/g, (w, char, str) => {
        return char.toUpperCase() + str;
      });
  }

  function buildAccessors(obj, header) {
    const accessorName = utils$1.toCamelCase(" " + header);

    ["get", "set", "has"].forEach((methodName) => {
      Object.defineProperty(obj, methodName + accessorName, {
        value(arg1, arg2, arg3) {
          return this[methodName].call(this, header, arg1, arg2, arg3);
        },
        configurable: true,
      });
    });
  }

  class AxiosHeaders {
    constructor(headers) {
      headers && this.set(headers);
    }

    set(header, valueOrRewrite, rewrite) {
      const self = this;

      function setHeader(_value, _header, _rewrite) {
        const lHeader = normalizeHeader(_header);

        if (!lHeader) {
          throw new Error("header name must be a non-empty string");
        }

        const key = utils$1.findKey(self, lHeader);

        if (
          !key ||
          self[key] === undefined ||
          _rewrite === true ||
          (_rewrite === undefined && self[key] !== false)
        ) {
          self[key || _header] = normalizeValue(_value);
        }
      }

      const setHeaders = (headers, _rewrite) =>
        utils$1.forEach(headers, (_value, _header) =>
          setHeader(_value, _header, _rewrite)
        );

      if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
        setHeaders(header, valueOrRewrite);
      } else if (
        utils$1.isString(header) &&
        (header = header.trim()) &&
        !isValidHeaderName(header)
      ) {
        setHeaders(parseHeaders(header), valueOrRewrite);
      } else {
        header != null && setHeader(valueOrRewrite, header, rewrite);
      }

      return this;
    }

    get(header, parser) {
      header = normalizeHeader(header);

      if (header) {
        const key = utils$1.findKey(this, header);

        if (key) {
          const value = this[key];

          if (!parser) {
            return value;
          }

          if (parser === true) {
            return parseTokens(value);
          }

          if (utils$1.isFunction(parser)) {
            return parser.call(this, value, key);
          }

          if (utils$1.isRegExp(parser)) {
            return parser.exec(value);
          }

          throw new TypeError("parser must be boolean|regexp|function");
        }
      }
    }

    has(header, matcher) {
      header = normalizeHeader(header);

      if (header) {
        const key = utils$1.findKey(this, header);

        return !!(
          key &&
          this[key] !== undefined &&
          (!matcher || matchHeaderValue(this, this[key], key, matcher))
        );
      }

      return false;
    }

    delete(header, matcher) {
      const self = this;
      let deleted = false;

      function deleteHeader(_header) {
        _header = normalizeHeader(_header);

        if (_header) {
          const key = utils$1.findKey(self, _header);

          if (
            key &&
            (!matcher || matchHeaderValue(self, self[key], key, matcher))
          ) {
            delete self[key];

            deleted = true;
          }
        }
      }

      if (utils$1.isArray(header)) {
        header.forEach(deleteHeader);
      } else {
        deleteHeader(header);
      }

      return deleted;
    }

    clear(matcher) {
      const keys = Object.keys(this);
      let i = keys.length;
      let deleted = false;

      while (i--) {
        const key = keys[i];
        if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
          delete this[key];
          deleted = true;
        }
      }

      return deleted;
    }

    normalize(format) {
      const self = this;
      const headers = {};

      utils$1.forEach(this, (value, header) => {
        const key = utils$1.findKey(headers, header);

        if (key) {
          self[key] = normalizeValue(value);
          delete self[header];
          return;
        }

        const normalized = format
          ? formatHeader(header)
          : String(header).trim();

        if (normalized !== header) {
          delete self[header];
        }

        self[normalized] = normalizeValue(value);

        headers[normalized] = true;
      });

      return this;
    }

    concat(...targets) {
      return this.constructor.concat(this, ...targets);
    }

    toJSON(asStrings) {
      const obj = Object.create(null);

      utils$1.forEach(this, (value, header) => {
        value != null &&
          value !== false &&
          (obj[header] =
            asStrings && utils$1.isArray(value) ? value.join(", ") : value);
      });

      return obj;
    }

    [Symbol.iterator]() {
      return Object.entries(this.toJSON())[Symbol.iterator]();
    }

    toString() {
      return Object.entries(this.toJSON())
        .map(([header, value]) => header + ": " + value)
        .join("\n");
    }

    get [Symbol.toStringTag]() {
      return "AxiosHeaders";
    }

    static from(thing) {
      return thing instanceof this ? thing : new this(thing);
    }

    static concat(first, ...targets) {
      const computed = new this(first);

      targets.forEach((target) => computed.set(target));

      return computed;
    }

    static accessor(header) {
      const internals =
        (this[$internals] =
        this[$internals] =
          {
            accessors: {},
          });

      const accessors = internals.accessors;
      const prototype = this.prototype;

      function defineAccessor(_header) {
        const lHeader = normalizeHeader(_header);

        if (!accessors[lHeader]) {
          buildAccessors(prototype, _header);
          accessors[lHeader] = true;
        }
      }

      utils$1.isArray(header)
        ? header.forEach(defineAccessor)
        : defineAccessor(header);

      return this;
    }
  }

  AxiosHeaders.accessor([
    "Content-Type",
    "Content-Length",
    "Accept",
    "Accept-Encoding",
    "User-Agent",
    "Authorization",
  ]);

  // reserved names hotfix
  utils$1.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
    const mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
    return {
      get: () => value,
      set(headerValue) {
        this[mapped] = headerValue;
      },
    };
  });

  utils$1.freezeMethods(AxiosHeaders);

  const AxiosHeaders$1 = AxiosHeaders;

  /**
   * Transform the data for a request or a response
   *
   * @param {Array|Function} fns A single function or Array of functions
   * @param {?Object} response The response object
   *
   * @returns {*} The resulting transformed data
   */
  function transformData(fns, response) {
    const config = this || defaults$1;
    const context = response || config;
    const headers = AxiosHeaders$1.from(context.headers);
    let data = context.data;

    utils$1.forEach(fns, function transform(fn) {
      data = fn.call(
        config,
        data,
        headers.normalize(),
        response ? response.status : undefined
      );
    });

    headers.normalize();

    return data;
  }

  function isCancel(value) {
    return !!(value && value.__CANCEL__);
  }

  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  function CanceledError(message, config, request) {
    // eslint-disable-next-line no-eq-null,eqeqeq
    AxiosError.call(
      this,
      message == null ? "canceled" : message,
      AxiosError.ERR_CANCELED,
      config,
      request
    );
    this.name = "CanceledError";
  }

  utils$1.inherits(CanceledError, AxiosError, {
    __CANCEL__: true,
  });

  /**
   * Resolve or reject a Promise based on response status.
   *
   * @param {Function} resolve A function that resolves the promise.
   * @param {Function} reject A function that rejects the promise.
   * @param {object} response The response.
   *
   * @returns {object} The response.
   */
  function settle(resolve, reject, response) {
    const validateStatus = response.config.validateStatus;
    if (
      !response.status ||
      !validateStatus ||
      validateStatus(response.status)
    ) {
      resolve(response);
    } else {
      reject(
        new AxiosError(
          "Request failed with status code " + response.status,
          [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][
            Math.floor(response.status / 100) - 4
          ],
          response.config,
          response.request,
          response
        )
      );
    }
  }

  const cookies = platform.hasStandardBrowserEnv
    ? // Standard browser envs support document.cookie
      {
        write(name, value, expires, path, domain, secure) {
          const cookie = [name + "=" + encodeURIComponent(value)];

          utils$1.isNumber(expires) &&
            cookie.push("expires=" + new Date(expires).toGMTString());

          utils$1.isString(path) && cookie.push("path=" + path);

          utils$1.isString(domain) && cookie.push("domain=" + domain);

          secure === true && cookie.push("secure");

          document.cookie = cookie.join("; ");
        },

        read(name) {
          const match = document.cookie.match(
            new RegExp("(^|;\\s*)(" + name + ")=([^;]*)")
          );
          return match ? decodeURIComponent(match[3]) : null;
        },

        remove(name) {
          this.write(name, "", Date.now() - 86400000);
        },
      }
    : // Non-standard browser env (web workers, react-native) lack needed support.
      {
        write() {},
        read() {
          return null;
        },
        remove() {},
      };

  /**
   * Determines whether the specified URL is absolute
   *
   * @param {string} url The URL to test
   *
   * @returns {boolean} True if the specified URL is absolute, otherwise false
   */
  function isAbsoluteURL(url) {
    // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
    // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
    // by any combination of letters, digits, plus, period, or hyphen.
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
  }

  /**
   * Creates a new URL by combining the specified URLs
   *
   * @param {string} baseURL The base URL
   * @param {string} relativeURL The relative URL
   *
   * @returns {string} The combined URL
   */
  function combineURLs(baseURL, relativeURL) {
    return relativeURL
      ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "")
      : baseURL;
  }

  /**
   * Creates a new URL by combining the baseURL with the requestedURL,
   * only when the requestedURL is not already an absolute URL.
   * If the requestURL is absolute, this function returns the requestedURL untouched.
   *
   * @param {string} baseURL The base URL
   * @param {string} requestedURL Absolute or relative URL to combine
   *
   * @returns {string} The combined full path
   */
  function buildFullPath(baseURL, requestedURL) {
    if (baseURL && !isAbsoluteURL(requestedURL)) {
      return combineURLs(baseURL, requestedURL);
    }
    return requestedURL;
  }

  const isURLSameOrigin = platform.hasStandardBrowserEnv
    ? // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
      (function standardBrowserEnv() {
        const msie = /(msie|trident)/i.test(navigator.userAgent);
        const urlParsingNode = document.createElement("a");

        /**
         * Parse a URL to discover its components
         *
         * @param {String} url The URL to be parsed
         * @returns {Object}
         */
        function resolveURL(url) {
          let href = url;

          if (msie) {
            // IE needs attribute set twice to normalize properties
            urlParsingNode.setAttribute("href", href);
            href = urlParsingNode.href;
          }

          urlParsingNode.setAttribute("href", href);

          // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
          return {
            href: urlParsingNode.href,
            protocol: urlParsingNode.protocol
              ? urlParsingNode.protocol.replace(/:$/, "")
              : "",
            host: urlParsingNode.host,
            search: urlParsingNode.search
              ? urlParsingNode.search.replace(/^\?/, "")
              : "",
            hash: urlParsingNode.hash
              ? urlParsingNode.hash.replace(/^#/, "")
              : "",
            hostname: urlParsingNode.hostname,
            port: urlParsingNode.port,
            pathname:
              urlParsingNode.pathname.charAt(0) === "/"
                ? urlParsingNode.pathname
                : "/" + urlParsingNode.pathname,
          };
        }

        const originURL = resolveURL(window.location.href);

        /**
         * Determine if a URL shares the same origin as the current location
         *
         * @param {String} requestURL The URL to test
         * @returns {boolean} True if URL shares the same origin, otherwise false
         */
        return function isURLSameOrigin(requestURL) {
          const parsed = utils$1.isString(requestURL)
            ? resolveURL(requestURL)
            : requestURL;
          return (
            parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host
          );
        };
      })()
    : // Non standard browser envs (web workers, react-native) lack needed support.
      (function nonStandardBrowserEnv() {
        return function isURLSameOrigin() {
          return true;
        };
      })();

  function parseProtocol(url) {
    const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
    return (match && match[1]) || "";
  }

  /**
   * Calculate data maxRate
   * @param {Number} [samplesCount= 10]
   * @param {Number} [min= 1000]
   * @returns {Function}
   */
  function speedometer(samplesCount, min) {
    samplesCount = samplesCount || 10;
    const bytes = new Array(samplesCount);
    const timestamps = new Array(samplesCount);
    let head = 0;
    let tail = 0;
    let firstSampleTS;

    min = min !== undefined ? min : 1000;

    return function push(chunkLength) {
      const now = Date.now();

      const startedAt = timestamps[tail];

      if (!firstSampleTS) {
        firstSampleTS = now;
      }

      bytes[head] = chunkLength;
      timestamps[head] = now;

      let i = tail;
      let bytesCount = 0;

      while (i !== head) {
        bytesCount += bytes[i++];
        i = i % samplesCount;
      }

      head = (head + 1) % samplesCount;

      if (head === tail) {
        tail = (tail + 1) % samplesCount;
      }

      if (now - firstSampleTS < min) {
        return;
      }

      const passed = startedAt && now - startedAt;

      return passed ? Math.round((bytesCount * 1000) / passed) : undefined;
    };
  }

  function progressEventReducer(listener, isDownloadStream) {
    let bytesNotified = 0;
    const _speedometer = speedometer(50, 250);

    return (e) => {
      const loaded = e.loaded;
      const total = e.lengthComputable ? e.total : undefined;
      const progressBytes = loaded - bytesNotified;
      const rate = _speedometer(progressBytes);
      const inRange = loaded <= total;

      bytesNotified = loaded;

      const data = {
        loaded,
        total,
        progress: total ? loaded / total : undefined,
        bytes: progressBytes,
        rate: rate ? rate : undefined,
        estimated:
          rate && total && inRange ? (total - loaded) / rate : undefined,
        event: e,
      };

      data[isDownloadStream ? "download" : "upload"] = true;

      listener(data);
    };
  }

  const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";

  const xhrAdapter =
    isXHRAdapterSupported &&
    function (config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        const requestData = config.data;
        const requestHeaders = AxiosHeaders$1.from(config.headers).normalize();
        let { withXSRFToken } = config;
        const { responseType } = config;
        let onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }

          if (config.signal) {
            config.signal.removeEventListener("abort", onCanceled);
          }
        }

        let contentType;

        if (utils$1.isFormData(requestData)) {
          if (
            platform.hasStandardBrowserEnv ||
            platform.hasStandardBrowserWebWorkerEnv
          ) {
            requestHeaders.setContentType(false); // Let the browser set it
          } else if (
            (contentType = requestHeaders.getContentType()) !== false
          ) {
            // fix semicolon duplication issue for ReactNative FormData implementation
            const [type, ...tokens] = contentType
              ? contentType
                  .split(";")
                  .map((token) => token.trim())
                  .filter(Boolean)
              : [];
            requestHeaders.setContentType(
              [type || "multipart/form-data", ...tokens].join("; ")
            );
          }
        }

        let request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          const username = config.auth.username || "";
          const password = config.auth.password
            ? unescape(encodeURIComponent(config.auth.password))
            : "";
          requestHeaders.set(
            "Authorization",
            "Basic " + btoa(username + ":" + password)
          );
        }

        const fullPath = buildFullPath(config.baseURL, config.url);

        request.open(
          config.method.toUpperCase(),
          buildURL(fullPath, config.params, config.paramsSerializer),
          true
        );

        // Set the request timeout in MS
        request.timeout = config.timeout;

        function onloadend() {
          if (!request) {
            return;
          }
          // Prepare the response
          const responseHeaders = AxiosHeaders$1.from(
            "getAllResponseHeaders" in request &&
              request.getAllResponseHeaders()
          );
          const responseData =
            !responseType || responseType === "text" || responseType === "json"
              ? request.responseText
              : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request,
          };

          settle(
            function _resolve(value) {
              resolve(value);
              done();
            },
            function _reject(err) {
              reject(err);
              done();
            },
            response
          );

          // Clean up request
          request = null;
        }

        if ("onloadend" in request) {
          // Use onloadend if available
          request.onloadend = onloadend;
        } else {
          // Listen for ready state to emulate onloadend
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            if (
              request.status === 0 &&
              !(
                request.responseURL &&
                request.responseURL.indexOf("file:") === 0
              )
            ) {
              return;
            }
            // readystate handler is calling before onerror or ontimeout handlers,
            // so we should call onloadend on the next 'tick'
            setTimeout(onloadend);
          };
        }

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(
            new AxiosError(
              "Request aborted",
              AxiosError.ECONNABORTED,
              config,
              request
            )
          );

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(
            new AxiosError(
              "Network Error",
              AxiosError.ERR_NETWORK,
              config,
              request
            )
          );

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          let timeoutErrorMessage = config.timeout
            ? "timeout of " + config.timeout + "ms exceeded"
            : "timeout exceeded";
          const transitional = config.transitional || transitionalDefaults;
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(
            new AxiosError(
              timeoutErrorMessage,
              transitional.clarifyTimeoutError
                ? AxiosError.ETIMEDOUT
                : AxiosError.ECONNABORTED,
              config,
              request
            )
          );

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (platform.hasStandardBrowserEnv) {
          withXSRFToken &&
            utils$1.isFunction(withXSRFToken) &&
            (withXSRFToken = withXSRFToken(config));

          if (
            withXSRFToken ||
            (withXSRFToken !== false && isURLSameOrigin(fullPath))
          ) {
            // Add xsrf header
            const xsrfValue =
              config.xsrfHeaderName &&
              config.xsrfCookieName &&
              cookies.read(config.xsrfCookieName);

            if (xsrfValue) {
              requestHeaders.set(config.xsrfHeaderName, xsrfValue);
            }
          }
        }

        // Remove Content-Type if data is undefined
        requestData === undefined && requestHeaders.setContentType(null);

        // Add headers to the request
        if ("setRequestHeader" in request) {
          utils$1.forEach(
            requestHeaders.toJSON(),
            function setRequestHeader(val, key) {
              request.setRequestHeader(key, val);
            }
          );
        }

        // Add withCredentials to request if needed
        if (!utils$1.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (responseType && responseType !== "json") {
          request.responseType = config.responseType;
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === "function") {
          request.addEventListener(
            "progress",
            progressEventReducer(config.onDownloadProgress, true)
          );
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === "function" && request.upload) {
          request.upload.addEventListener(
            "progress",
            progressEventReducer(config.onUploadProgress)
          );
        }

        if (config.cancelToken || config.signal) {
          // Handle cancellation
          // eslint-disable-next-line func-names
          onCanceled = (cancel) => {
            if (!request) {
              return;
            }
            reject(
              !cancel || cancel.type
                ? new CanceledError(null, config, request)
                : cancel
            );
            request.abort();
            request = null;
          };

          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted
              ? onCanceled()
              : config.signal.addEventListener("abort", onCanceled);
          }
        }

        const protocol = parseProtocol(fullPath);

        if (protocol && platform.protocols.indexOf(protocol) === -1) {
          reject(
            new AxiosError(
              "Unsupported protocol " + protocol + ":",
              AxiosError.ERR_BAD_REQUEST,
              config
            )
          );
          return;
        }

        // Send the request
        request.send(requestData || null);
      });
    };

  const knownAdapters = {
    http: httpAdapter,
    xhr: xhrAdapter,
  };

  utils$1.forEach(knownAdapters, (fn, value) => {
    if (fn) {
      try {
        Object.defineProperty(fn, "name", { value });
      } catch (e) {
        // eslint-disable-next-line no-empty
      }
      Object.defineProperty(fn, "adapterName", { value });
    }
  });

  const renderReason = (reason) => `- ${reason}`;

  const isResolvedHandle = (adapter) =>
    utils$1.isFunction(adapter) || adapter === null || adapter === false;

  const adapters = {
    getAdapter: (adapters) => {
      adapters = utils$1.isArray(adapters) ? adapters : [adapters];

      const { length } = adapters;
      let nameOrAdapter;
      let adapter;

      const rejectedReasons = {};

      for (let i = 0; i < length; i++) {
        nameOrAdapter = adapters[i];
        let id;

        adapter = nameOrAdapter;

        if (!isResolvedHandle(nameOrAdapter)) {
          adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];

          if (adapter === undefined) {
            throw new AxiosError(`Unknown adapter '${id}'`);
          }
        }

        if (adapter) {
          break;
        }

        rejectedReasons[id || "#" + i] = adapter;
      }

      if (!adapter) {
        const reasons = Object.entries(rejectedReasons).map(
          ([id, state]) =>
            `adapter ${id} ` +
            (state === false
              ? "is not supported by the environment"
              : "is not available in the build")
        );

        const s = length
          ? reasons.length > 1
            ? "since :\n" + reasons.map(renderReason).join("\n")
            : " " + renderReason(reasons[0])
          : "as no adapter specified";

        throw new AxiosError(
          `There is no suitable adapter to dispatch the request ` + s,
          "ERR_NOT_SUPPORT"
        );
      }

      return adapter;
    },
    adapters: knownAdapters,
  };

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   *
   * @param {Object} config The config that is to be used for the request
   *
   * @returns {void}
   */
  function throwIfCancellationRequested(config) {
    if (config.cancelToken) {
      config.cancelToken.throwIfRequested();
    }

    if (config.signal && config.signal.aborted) {
      throw new CanceledError(null, config);
    }
  }

  /**
   * Dispatch a request to the server using the configured adapter.
   *
   * @param {object} config The config that is to be used for the request
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  function dispatchRequest(config) {
    throwIfCancellationRequested(config);

    config.headers = AxiosHeaders$1.from(config.headers);

    // Transform request data
    config.data = transformData.call(config, config.transformRequest);

    if (["post", "put", "patch"].indexOf(config.method) !== -1) {
      config.headers.setContentType("application/x-www-form-urlencoded", false);
    }

    const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);

    return adapter(config).then(
      function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData.call(
          config,
          config.transformResponse,
          response
        );

        response.headers = AxiosHeaders$1.from(response.headers);

        return response;
      },
      function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
            reason.response.headers = AxiosHeaders$1.from(
              reason.response.headers
            );
          }
        }

        return Promise.reject(reason);
      }
    );
  }

  const headersToObject = (thing) =>
    thing instanceof AxiosHeaders$1 ? { ...thing } : thing;

  /**
   * Config-specific merge-function which creates a new config-object
   * by merging two configuration objects together.
   *
   * @param {Object} config1
   * @param {Object} config2
   *
   * @returns {Object} New object resulting from merging config2 to config1
   */
  function mergeConfig(config1, config2) {
    // eslint-disable-next-line no-param-reassign
    config2 = config2 || {};
    const config = {};

    function getMergedValue(target, source, caseless) {
      if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
        return utils$1.merge.call({ caseless }, target, source);
      } else if (utils$1.isPlainObject(source)) {
        return utils$1.merge({}, source);
      } else if (utils$1.isArray(source)) {
        return source.slice();
      }
      return source;
    }

    // eslint-disable-next-line consistent-return
    function mergeDeepProperties(a, b, caseless) {
      if (!utils$1.isUndefined(b)) {
        return getMergedValue(a, b, caseless);
      } else if (!utils$1.isUndefined(a)) {
        return getMergedValue(undefined, a, caseless);
      }
    }

    // eslint-disable-next-line consistent-return
    function valueFromConfig2(a, b) {
      if (!utils$1.isUndefined(b)) {
        return getMergedValue(undefined, b);
      }
    }

    // eslint-disable-next-line consistent-return
    function defaultToConfig2(a, b) {
      if (!utils$1.isUndefined(b)) {
        return getMergedValue(undefined, b);
      } else if (!utils$1.isUndefined(a)) {
        return getMergedValue(undefined, a);
      }
    }

    // eslint-disable-next-line consistent-return
    function mergeDirectKeys(a, b, prop) {
      if (prop in config2) {
        return getMergedValue(a, b);
      } else if (prop in config1) {
        return getMergedValue(undefined, a);
      }
    }

    const mergeMap = {
      url: valueFromConfig2,
      method: valueFromConfig2,
      data: valueFromConfig2,
      baseURL: defaultToConfig2,
      transformRequest: defaultToConfig2,
      transformResponse: defaultToConfig2,
      paramsSerializer: defaultToConfig2,
      timeout: defaultToConfig2,
      timeoutMessage: defaultToConfig2,
      withCredentials: defaultToConfig2,
      withXSRFToken: defaultToConfig2,
      adapter: defaultToConfig2,
      responseType: defaultToConfig2,
      xsrfCookieName: defaultToConfig2,
      xsrfHeaderName: defaultToConfig2,
      onUploadProgress: defaultToConfig2,
      onDownloadProgress: defaultToConfig2,
      decompress: defaultToConfig2,
      maxContentLength: defaultToConfig2,
      maxBodyLength: defaultToConfig2,
      beforeRedirect: defaultToConfig2,
      transport: defaultToConfig2,
      httpAgent: defaultToConfig2,
      httpsAgent: defaultToConfig2,
      cancelToken: defaultToConfig2,
      socketPath: defaultToConfig2,
      responseEncoding: defaultToConfig2,
      validateStatus: mergeDirectKeys,
      headers: (a, b) =>
        mergeDeepProperties(headersToObject(a), headersToObject(b), true),
    };

    utils$1.forEach(
      Object.keys(Object.assign({}, config1, config2)),
      function computeConfigValue(prop) {
        const merge = mergeMap[prop] || mergeDeepProperties;
        const configValue = merge(config1[prop], config2[prop], prop);
        (utils$1.isUndefined(configValue) && merge !== mergeDirectKeys) ||
          (config[prop] = configValue);
      }
    );

    return config;
  }

  const VERSION = "1.6.8";

  const validators$1 = {};

  // eslint-disable-next-line func-names
  ["object", "boolean", "number", "function", "string", "symbol"].forEach(
    (type, i) => {
      validators$1[type] = function validator(thing) {
        return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
      };
    }
  );

  const deprecatedWarnings = {};

  /**
   * Transitional option validator
   *
   * @param {function|boolean?} validator - set to false if the transitional option has been removed
   * @param {string?} version - deprecated version / removed since version
   * @param {string?} message - some message with additional info
   *
   * @returns {function}
   */
  validators$1.transitional = function transitional(
    validator,
    version,
    message
  ) {
    function formatMessage(opt, desc) {
      return (
        "[Axios v" +
        VERSION +
        "] Transitional option '" +
        opt +
        "'" +
        desc +
        (message ? ". " + message : "")
      );
    }

    // eslint-disable-next-line func-names
    return (value, opt, opts) => {
      if (validator === false) {
        throw new AxiosError(
          formatMessage(
            opt,
            " has been removed" + (version ? " in " + version : "")
          ),
          AxiosError.ERR_DEPRECATED
        );
      }

      if (version && !deprecatedWarnings[opt]) {
        deprecatedWarnings[opt] = true;
        // eslint-disable-next-line no-console
        console.warn(
          formatMessage(
            opt,
            " has been deprecated since v" +
              version +
              " and will be removed in the near future"
          )
        );
      }

      return validator ? validator(value, opt, opts) : true;
    };
  };

  /**
   * Assert object's properties type
   *
   * @param {object} options
   * @param {object} schema
   * @param {boolean?} allowUnknown
   *
   * @returns {object}
   */

  function assertOptions(options, schema, allowUnknown) {
    if (typeof options !== "object") {
      throw new AxiosError(
        "options must be an object",
        AxiosError.ERR_BAD_OPTION_VALUE
      );
    }
    const keys = Object.keys(options);
    let i = keys.length;
    while (i-- > 0) {
      const opt = keys[i];
      const validator = schema[opt];
      if (validator) {
        const value = options[opt];
        const result = value === undefined || validator(value, opt, options);
        if (result !== true) {
          throw new AxiosError(
            "option " + opt + " must be " + result,
            AxiosError.ERR_BAD_OPTION_VALUE
          );
        }
        continue;
      }
      if (allowUnknown !== true) {
        throw new AxiosError(
          "Unknown option " + opt,
          AxiosError.ERR_BAD_OPTION
        );
      }
    }
  }

  const validator = {
    assertOptions,
    validators: validators$1,
  };

  const validators = validator.validators;

  /**
   * Create a new instance of Axios
   *
   * @param {Object} instanceConfig The default config for the instance
   *
   * @return {Axios} A new instance of Axios
   */
  class Axios {
    constructor(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager$1(),
        response: new InterceptorManager$1(),
      };
    }

    /**
     * Dispatch a request
     *
     * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
     * @param {?Object} config
     *
     * @returns {Promise} The Promise to be fulfilled
     */
    async request(configOrUrl, config) {
      try {
        return await this._request(configOrUrl, config);
      } catch (err) {
        if (err instanceof Error) {
          let dummy;

          Error.captureStackTrace
            ? Error.captureStackTrace((dummy = {}))
            : (dummy = new Error());

          // slice off the Error: ... line
          const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";

          if (!err.stack) {
            err.stack = stack;
            // match without the 2 top stack lines
          } else if (
            stack &&
            !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))
          ) {
            err.stack += "\n" + stack;
          }
        }

        throw err;
      }
    }

    _request(configOrUrl, config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof configOrUrl === "string") {
        config = config || {};
        config.url = configOrUrl;
      } else {
        config = configOrUrl || {};
      }

      config = mergeConfig(this.defaults, config);

      const { transitional, paramsSerializer, headers } = config;

      if (transitional !== undefined) {
        validator.assertOptions(
          transitional,
          {
            silentJSONParsing: validators.transitional(validators.boolean),
            forcedJSONParsing: validators.transitional(validators.boolean),
            clarifyTimeoutError: validators.transitional(validators.boolean),
          },
          false
        );
      }

      if (paramsSerializer != null) {
        if (utils$1.isFunction(paramsSerializer)) {
          config.paramsSerializer = {
            serialize: paramsSerializer,
          };
        } else {
          validator.assertOptions(
            paramsSerializer,
            {
              encode: validators.function,
              serialize: validators.function,
            },
            true
          );
        }
      }

      // Set config.method
      config.method = (
        config.method ||
        this.defaults.method ||
        "get"
      ).toLowerCase();

      // Flatten headers
      const contextHeaders =
        headers && utils$1.merge(headers.common, headers[config.method]);

      headers &&
        utils$1.forEach(
          ["delete", "get", "head", "post", "put", "patch", "common"],
          (method) => {
            delete headers[method];
          }
        );

      config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

      // filter out skipped interceptors
      const requestInterceptorChain = [];
      let synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(
        interceptor
      ) {
        if (
          typeof interceptor.runWhen === "function" &&
          interceptor.runWhen(config) === false
        ) {
          return;
        }

        synchronousRequestInterceptors =
          synchronousRequestInterceptors && interceptor.synchronous;

        requestInterceptorChain.unshift(
          interceptor.fulfilled,
          interceptor.rejected
        );
      });

      const responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(
        interceptor
      ) {
        responseInterceptorChain.push(
          interceptor.fulfilled,
          interceptor.rejected
        );
      });

      let promise;
      let i = 0;
      let len;

      if (!synchronousRequestInterceptors) {
        const chain = [dispatchRequest.bind(this), undefined];
        chain.unshift.apply(chain, requestInterceptorChain);
        chain.push.apply(chain, responseInterceptorChain);
        len = chain.length;

        promise = Promise.resolve(config);

        while (i < len) {
          promise = promise.then(chain[i++], chain[i++]);
        }

        return promise;
      }

      len = requestInterceptorChain.length;

      let newConfig = config;

      i = 0;

      while (i < len) {
        const onFulfilled = requestInterceptorChain[i++];
        const onRejected = requestInterceptorChain[i++];
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          onRejected.call(this, error);
          break;
        }
      }

      try {
        promise = dispatchRequest.call(this, newConfig);
      } catch (error) {
        return Promise.reject(error);
      }

      i = 0;
      len = responseInterceptorChain.length;

      while (i < len) {
        promise = promise.then(
          responseInterceptorChain[i++],
          responseInterceptorChain[i++]
        );
      }

      return promise;
    }

    getUri(config) {
      config = mergeConfig(this.defaults, config);
      const fullPath = buildFullPath(config.baseURL, config.url);
      return buildURL(fullPath, config.params, config.paramsSerializer);
    }
  }

  // Provide aliases for supported request methods
  utils$1.forEach(
    ["delete", "get", "head", "options"],
    function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function (url, config) {
        return this.request(
          mergeConfig(config || {}, {
            method,
            url,
            data: (config || {}).data,
          })
        );
      };
    }
  );

  utils$1.forEach(
    ["post", "put", "patch"],
    function forEachMethodWithData(method) {
      /*eslint func-names:0*/

      function generateHTTPMethod(isForm) {
        return function httpMethod(url, data, config) {
          return this.request(
            mergeConfig(config || {}, {
              method,
              headers: isForm
                ? {
                    "Content-Type": "multipart/form-data",
                  }
                : {},
              url,
              data,
            })
          );
        };
      }

      Axios.prototype[method] = generateHTTPMethod();

      Axios.prototype[method + "Form"] = generateHTTPMethod(true);
    }
  );

  const Axios$1 = Axios;

  /**
   * A `CancelToken` is an object that can be used to request cancellation of an operation.
   *
   * @param {Function} executor The executor function.
   *
   * @returns {CancelToken}
   */
  class CancelToken {
    constructor(executor) {
      if (typeof executor !== "function") {
        throw new TypeError("executor must be a function.");
      }

      let resolvePromise;

      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      const token = this;

      // eslint-disable-next-line func-names
      this.promise.then((cancel) => {
        if (!token._listeners) {
          return;
        }

        let i = token._listeners.length;

        while (i-- > 0) {
          token._listeners[i](cancel);
        }
        token._listeners = null;
      });

      // eslint-disable-next-line func-names
      this.promise.then = (onfulfilled) => {
        let _resolve;
        // eslint-disable-next-line func-names
        const promise = new Promise((resolve) => {
          token.subscribe(resolve);
          _resolve = resolve;
        }).then(onfulfilled);

        promise.cancel = function reject() {
          token.unsubscribe(_resolve);
        };

        return promise;
      };

      executor(function cancel(message, config, request) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new CanceledError(message, config, request);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `CanceledError` if cancellation has been requested.
     */
    throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    }

    /**
     * Subscribe to the cancel signal
     */

    subscribe(listener) {
      if (this.reason) {
        listener(this.reason);
        return;
      }

      if (this._listeners) {
        this._listeners.push(listener);
      } else {
        this._listeners = [listener];
      }
    }

    /**
     * Unsubscribe from the cancel signal
     */

    unsubscribe(listener) {
      if (!this._listeners) {
        return;
      }
      const index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    }

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    static source() {
      let cancel;
      const token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token,
        cancel,
      };
    }
  }

  const CancelToken$1 = CancelToken;

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
   *
   * @returns {Function}
   */
  function spread(callback) {
    return function wrap(arr) {
      return callback.apply(null, arr);
    };
  }

  /**
   * Determines whether the payload is an error thrown by Axios
   *
   * @param {*} payload The value to test
   *
   * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
   */
  function isAxiosError(payload) {
    return utils$1.isObject(payload) && payload.isAxiosError === true;
  }

  const HttpStatusCode = {
    Continue: 100,
    SwitchingProtocols: 101,
    Processing: 102,
    EarlyHints: 103,
    Ok: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultiStatus: 207,
    AlreadyReported: 208,
    ImUsed: 226,
    MultipleChoices: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    UseProxy: 305,
    Unused: 306,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    PayloadTooLarge: 413,
    UriTooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImATeapot: 418,
    MisdirectedRequest: 421,
    UnprocessableEntity: 422,
    Locked: 423,
    FailedDependency: 424,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HttpVersionNotSupported: 505,
    VariantAlsoNegotiates: 506,
    InsufficientStorage: 507,
    LoopDetected: 508,
    NotExtended: 510,
    NetworkAuthenticationRequired: 511,
  };

  Object.entries(HttpStatusCode).forEach(([key, value]) => {
    HttpStatusCode[value] = key;
  });

  const HttpStatusCode$1 = HttpStatusCode;

  /**
   * Create an instance of Axios
   *
   * @param {Object} defaultConfig The default config for the instance
   *
   * @returns {Axios} A new instance of Axios
   */
  function createInstance(defaultConfig) {
    const context = new Axios$1(defaultConfig);
    const instance = bind(Axios$1.prototype.request, context);

    // Copy axios.prototype to instance
    utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });

    // Copy context to instance
    utils$1.extend(instance, context, null, { allOwnKeys: true });

    // Factory for creating new instances
    instance.create = function create(instanceConfig) {
      return createInstance(mergeConfig(defaultConfig, instanceConfig));
    };

    return instance;
  }

  // Create the default instance to be exported
  const axios = createInstance(defaults$1);

  // Expose Axios class to allow class inheritance
  axios.Axios = Axios$1;

  // Expose Cancel & CancelToken
  axios.CanceledError = CanceledError;
  axios.CancelToken = CancelToken$1;
  axios.isCancel = isCancel;
  axios.VERSION = VERSION;
  axios.toFormData = toFormData;

  // Expose AxiosError class
  axios.AxiosError = AxiosError;

  // alias for CanceledError for backward compatibility
  axios.Cancel = axios.CanceledError;

  // Expose all/spread
  axios.all = function all(promises) {
    return Promise.all(promises);
  };

  axios.spread = spread;

  // Expose isAxiosError
  axios.isAxiosError = isAxiosError;

  // Expose mergeConfig
  axios.mergeConfig = mergeConfig;

  axios.AxiosHeaders = AxiosHeaders$1;

  axios.formToJSON = (thing) =>
    formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);

  axios.getAdapter = adapters.getAdapter;

  axios.HttpStatusCode = HttpStatusCode$1;

  axios.default = axios;

  // this module should only have a default export
  const axios$1 = axios;

  const script = {
    data: () => ({
      mode: "edit",
      fileId: null,
      filePath: null,
      config: null,
      docEditor: null,
    }),
    created() {
      this.mode = this.$route.params.mode;
      this.fileId = this.$route.params.fileId;
      this.filePath = this.$route.params.filePath;
    },
    methods: {
      ...mapActions(["showMessage"]),
      messageDisplay(desc, status = "danger", title = "") {
        this.showMessage({
          title,
          desc,
          status,
          autoClose: {
            enabled: true,
          },
        });
      },
      onRequestClose() {
        const params = {
          driveAliasAndItem: null,
        };
        if (this.currentFolder) {
          params.driveAliasAndItem =
            "personal/" + this.currentFolder.ownerId + this.currentFolder.path;
        }
        this.$router.push({
          name: "files-spaces-generic",
          params,
        });
      },
      getDocumentServerUrl() {
        return axios$1({
          method: "GET",
          url:
            this.configuration.server +
            "ocs/v2.php/apps/onlyoffice/api/v1/settings/docserver",
          headers: {
            authorization: "Bearer " + this.getToken,
          },
        }).then((response) => {
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
          axios$1({
            method: "GET",
            url:
              this.configuration.server +
              "ocs/v2.php/apps/onlyoffice/api/v1/empty/" +
              this.fileId,
            headers: {
              authorization: "Bearer " + this.getToken,
            },
          }).then((response) => {
            if (response.data.error) {
              reject(response.data.error);
              return;
            }
            resolve();
          });
        });
      },
      initConfig() {
        return axios$1({
          method: "GET",
          url:
            this.configuration.server +
            "ocs/v2.php/apps/onlyoffice/api/v1/config/" +
            this.fileId,
          headers: {
            authorization: "Bearer " + this.getToken,
          },
        }).then((response) => {
          if (response.data.error) {
            throw response.data.error;
          }
          this.config = response.data;
          const events = [];
          events["onRequestClose"] = this.onRequestClose;
          this.config.editorConfig.customization.goback.requestClose = true;
          this.config.events = events;
          this.docEditor = new DocsAPI.DocEditor("iframeEditor", this.config);
        });
      },
    },
    computed: {
      ...mapGetters(["getToken", "configuration", "apps"]),
      ...mapGetters("Files", ["currentFolder"]),
    },
    mounted() {
      this.create()
        .then(() => {
          return this.getDocumentServerUrl();
        })
        .then((documentServerUrl) => {
          const iframeEditor = document.getElementById("iframeEditor");
          const docApi = document.createElement("script");
          docApi.setAttribute(
            "src",
            documentServerUrl + "web-apps/apps/api/documents/api.js"
          );
          iframeEditor.appendChild(docApi);
          return this.initConfig();
        })
        .catch((error) => {
          this.messageDisplay(error);
          this.onRequestClose();
        });
    },
  };

  const _hoisted_1 = /*#__PURE__*/ vue.createElementVNode(
    "div",
    {
      id: "app",
    },
    [
      /*#__PURE__*/ vue.createElementVNode("div", {
        id: "iframeEditor",
      }),
    ],
    -1 /* HOISTED */
  );
  const _hoisted_2 = [_hoisted_1];
  function render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("main", null, _hoisted_2);
  }

  function styleInject(css, ref) {
    if (ref === void 0) {
      ref = {};
    }
    const insertAt = ref.insertAt;

    if (!css || typeof document === "undefined") {
      return;
    }

    const head = document.head || document.getElementsByTagName("head")[0];
    const style = document.createElement("style");
    style.type = "text/css";

    if (insertAt === "top") {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  const css_248z =
    "\n#app {\r\n        width: 100%;\n}\n#app > iframe {\r\n        position: fixed;\r\n        height: calc(100vh - 52px);\r\n        right: 0;\n}\r\n";
  styleInject(css_248z);

  script.render = render;
  script.__file = "src/editor.vue";

  /**
   *
   * (c) Copyright Ascensio System SIA 2023
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   */

  const routes = [
    {
      path: "/editor/:fileId/:filePath/:mode",
      components: {
        fullscreen: script,
      },
      name: "editor",
      meta: {
        hideHeadbar: true,
      },
    },
  ];
  const appInfo = {
    name: "ONLYOFFICE",
    id: "onlyoffice",
    icon: "x-office-document",
    isFileEditor: true,
    extensions: [
      {
        extension: "docx",
        routeName: "onlyoffice-editor",
        newTab: true,
        newFileMenu: {
          menuTitle($gettext) {
            return $gettext("Document");
          },
          icon: "x-office-document",
        },
        routes: [
          "files-spaces-generic",
          "files-common-favorites",
          "files-shares-with-others",
          "files-shares-with-me",
          "files-trash-generic",
          "files-public-link",
        ],
      },
      {
        extension: "xlsx",
        routeName: "onlyoffice-editor",
        newTab: true,
        newFileMenu: {
          menuTitle($gettext) {
            return $gettext("Spreadsheet");
          },
          icon: "x-office-spreadsheet",
        },
        routes: [
          "files-spaces-generic",
          "files-common-favorites",
          "files-shares-with-others",
          "files-shares-with-me",
          "files-trash-generic",
          "files-public-link",
        ],
      },
      {
        extension: "pptx",
        routeName: "onlyoffice-editor",
        newTab: true,
        newFileMenu: {
          menuTitle($gettext) {
            return $gettext("Presentation");
          },
          icon: "x-office-presentation",
        },
        routes: [
          "files-spaces-generic",
          "files-common-favorites",
          "files-shares-with-others",
          "files-shares-with-me",
          "files-trash-generic",
          "files-public-link",
        ],
      },
    ],
  };
  const app = {
    appInfo,
    routes,
  };

  return app;
});

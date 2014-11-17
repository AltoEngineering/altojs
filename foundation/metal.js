
(function(exports) {
// ==========================================================================
// Project:  Alto Metal | Formally Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals ENV Alto_assert */

  if ('undefined' === typeof Alto) {

    /**
     @class Alto
     @since Alto 0.0.1

     All Alto methods and functions are defined inside of this namespace.
     You generally should not add new properties to this namespace as it may be
     overwritten by future versions of Alto.

     You can also use the shorthand "Em" instead of "Alto".

     Alto-Runtime is a framework that provides core functions for
     Alto including cross-platform functions, support for property
     observing and objects. Its focus is on small size and performance. You can
     use this in place of or along-side other cross-platform libraries such as
     jQuery.

     The core Runtime framework is based on the jQuery API with a number of
     performance optimizations.
     */

      // Create core object. Make it act like an instance of Alto.Namespace so that
      // objects assigned to it are given a sane string representation.
    Alto = { isNamespace: true, toString: function() { return "Alto"; } };
    var  global = {};
    global.foo = true;

    var root = this;

    if (typeof module !== 'undefined' && module.exports) {
      root = global;
    }

    // aliases needed to keep minifiers from removing the global context
    root.SC = root.SproutCore = root.Em = root.Alto = Alto;
  }

  /**
   @static
   @type String
   */
  Alto.VERSION = '0.0.1';

  /**
   @static
   @type Hash

   Standard environmental variables.  You can define these in a global `ENV`
   variable before loading Alto to control various configuration
   settings.
   */
  Alto.ENV = 'undefined' === typeof ENV ? {} : ENV;

  /**
   Empty function.  Useful for some operations.

   @private
   */
  Alto.K = function() { return this; };

  /**
   Define an assertion that will throw an exception if the condition is not
   met.  Alto build tools will remove any calls to Alto_assert() when
   doing a production build.

   ## Examples

   #js:

   // pass a simple Boolean value
   Alto_assert('must pass a valid object', !!obj);

   // pass a function.  If the function returns false the assertion fails
   // any other return value (including void) will pass.
   Alto_assert('a passed record must have a firstName', function() {
        if (obj instanceof Alto.Record) {
          return !Alto.empty(obj.firstName);
        }
      });

   @static
   @param {String} desc
   A description of the assertion.  This will become the text of the Error
   thrown if the assertion fails.

   @param {Boolean} test
   Must return true for the assertion to pass.  If you pass a function it
   will be executed.  If the function returns false an exception will be
   thrown.
   */
  root.Alto_assert = root.sc_assert = function Alto_assert(desc, test) {
    if ('function' === typeof test) test = test()!==false;
    if (!test) throw new Error("assertion failed: "+desc);
  };

//if ('undefined' === typeof Alto_require) Alto_require = Alto.K;
  if ('undefined' === typeof require) require = Alto.K;

// ..........................................................
// LOGGER
// 

  /**
   @class

       Inside Alto-Metal, simply uses the window.console object.
   Override this to provide more robust logging functionality.
   */
  Alto.Logger = root.console || { log: Alto.K, warn: Alto.K, error: Alto.K };

})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
  /**
   @class

       Platform specific methods and feature detectors needed by the framework.
   */
  var platform = Alto.platform = {} ;

  /**
   Identical to Object.create().  Implements if not available natively.
   */
  platform.create = Object.create;

  if (!platform.create) {
    var O_ctor = function() {},
        O_proto = O_ctor.prototype;

    platform.create = function(obj, descs) {
      O_ctor.prototype = obj;
      obj = new O_ctor();
      O_ctor.prototype = O_proto;

      if (descs !== undefined) {
        for(var key in descs) {
          if (!descs.hasOwnProperty(key)) continue;
          platform.defineProperty(obj, key, descs[key]);
        }
      }

      return obj;
    };

    platform.create.isSimulated = true;
  }

  var defineProperty = Object.defineProperty, canRedefineProperties, canDefinePropertyOnDOM;

// Catch IE8 where Object.defineProperty exists but only works on DOM elements
  if (defineProperty) {
    try {
      defineProperty({}, 'a',{get:function(){}});
    } catch (e) {
      defineProperty = null;
    }
  }

  if (defineProperty) {
    // Detects a bug in Android <3.2 where you cannot redefine a property using
    // Object.defineProperty once accessors have already been set.
    canRedefineProperties = (function() {
      var obj = {};

      defineProperty(obj, 'a', {
        configurable: true,
        enumerable: true,
        get: function() { },
        set: function() { }
      });

      defineProperty(obj, 'a', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: true
      });

      return obj.a === true;
    })();

    // This is for Safari 5.0, which supports Object.defineProperty, but not
    // on DOM nodes.

    canDefinePropertyOnDOM = (function(){
      try {
        defineProperty(document.body, 'definePropertyOnDOM', {});
        return true;
      } catch(e) { }

      return false;
    })();

    if (!canRedefineProperties) {
      defineProperty = null;
    } else if (!canDefinePropertyOnDOM) {
      defineProperty = function(obj, keyName, desc){
        var isNode;

        if (typeof Node === "object") {
          isNode = obj instanceof Node;
        } else {
          isNode = typeof obj === "object" && typeof obj.nodeType === "number" && typeof obj.nodeName === "string";
        }

        if (isNode) {
          // TODO: Should we have a warning here?
          return (obj[keyName] = desc.value);
        } else {
          return Object.defineProperty(obj, keyName, desc);
        }
      };
    }
  }

  /**
   Identical to Object.defineProperty().  Implements as much functionality
   as possible if not available natively.

   @param {Object} obj The object to modify
   @param {String} keyName property name to modify
   @param {Object} desc descriptor hash
   */
  platform.defineProperty = defineProperty;

  /**
   Set to true if the platform supports native getters and setters.
   */
  platform.hasPropertyAccessors = true;

  if (!platform.defineProperty) {
    platform.hasPropertyAccessors = false;

    platform.defineProperty = function(obj, keyName, desc) {
      Alto_assert("property descriptor cannot have `get` or `set` on this platform", !desc.get && !desc.set);
      obj[keyName] = desc.value;
    };

    platform.defineProperty.isSimulated = true;
  }

})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ..........................................................
// GUIDS
// 

// Used for guid generation...
  var GUID_KEY = '__Alto'+ (+ new Date());
  var uuid, numberCache, stringCache;

  uuid         = 0;
  numberCache  = [];
  stringCache  = {};

  var GUID_DESC = {
    configurable: true,
    writable: true,
    enumerable: false
  };

  var o_defineProperty = Alto.platform.defineProperty;
  var o_create = Alto.platform.create;

  /**
   @private
   @static
   @type String

   A unique key used to assign guids and other private metadata to objects.
   If you inspect an object in your browser debugger you will often see these.
   They can be safely ignored.

   On browsers that support it, these properties are added with enumeration
   disabled so they won't show up when you iterate over your properties.
   */
  Alto.GUID_KEY = GUID_KEY;

  /**
   @private

   Generates a new guid, optionally saving the guid to the object that you
   pass in.  You will rarely need to use this method.  Instead you should
   call Alto.guidFor(obj), which return an existing guid if available.

   @param {Object} obj
   Optional object the guid will be used for.  If passed in, the guid will
   be saved on the object and reused whenever you pass the same object
   again.

   If no object is passed, just generate a new guid.

   @param {String} prefix
   Optional prefix to place in front of the guid.  Useful when you want to
   separate the guid into separate namespaces.

   */
  Alto.generateGuid = function(obj, prefix) {
    if (!prefix) prefix = 'Alto';
    var ret = (prefix + (uuid++));
    if (obj) {
      GUID_DESC.value = ret;
      o_defineProperty(obj, GUID_KEY, GUID_DESC);
      GUID_DESC.value = null;
    }

    return ret ;
  };

  /**

   Returns a unique id for the object.  If the object does not yet have
   a guid, one will be assigned to it.  You can call this on any object,
   Alto.Object-based or not, but be aware that it will add a _guid property.

   You can also use this method on DOM Element objects.

   @method
   @param obj {Object} any object, string, number, Element, or primitive
   @returns {String} the unique guid for this instance.
   */
  Alto.guidFor = function(obj) {

    // special cases where we don't want to add a key to object
    if (obj === undefined) return "(undefined)";
    if (obj === null) return "(null)";

    var cache, ret;
    var type = typeof obj;

    // Don't allow prototype changes to String etc. to change the guidFor
    switch(type) {
      case 'number':
        ret = numberCache[obj];
        if (!ret) ret = numberCache[obj] = 'nu'+obj;
        return ret;

      case 'string':
        ret = stringCache[obj];
        if (!ret) ret = stringCache[obj] = 'st'+(uuid++);
        return ret;

      case 'boolean':
        return obj ? '(true)' : '(false)';

      default:
        if (obj[GUID_KEY]) return obj[GUID_KEY];
        if (obj === Object) return '(Object)';
        if (obj === Array)  return '(Array)';
        return Alto.generateGuid(obj, 'Alto');
    }
  };


// ..........................................................
// META
// 

  var META_DESC = {
    writable:    true,
    configurable: false,
    enumerable:  false,
    value: null
  };

  var META_KEY = Alto.GUID_KEY+'_meta';

  /**
   The key used to store meta information on object for property observing.

   @static
   @property
   */
  Alto.META_KEY = META_KEY;

// Placeholder for non-writable metas.
  var EMPTY_META = {
    descs: {},
    watching: {}
  };

  if (Object.freeze) Object.freeze(EMPTY_META);

  /**
   @private
   @function

   Retrieves the meta hash for an object.  If 'writable' is true ensures the
   hash is writable for this object as well.

   The meta object contains information about computed property descriptors as
   well as any watched properties and other information.  You generally will
   not access this information directly but instead work with higher level
   methods that manipulate this has indirectly.

   @param {Object} obj
   The object to retrieve meta for

   @param {Boolean} writable
   Pass false if you do not intend to modify the meta hash, allowing the
   method to avoid making an unnecessary copy.

   @returns {Hash}
   */
  Alto.meta = function meta(obj, writable) {

    Alto_assert("You must pass an object to Alto.meta. This was probably called from Alto internals, so you probably called a Alto method with undefined that was expecting an object", obj != undefined);

    var ret = obj[META_KEY];
    if (writable===false) return ret || EMPTY_META;

    if (!ret) {
      o_defineProperty(obj, META_KEY, META_DESC);
      ret = obj[META_KEY] = {
        descs: {},
        watching: {},
        values: {},
        lastSetValues: {},
        cache:  {},
        source: obj
      };

      // make sure we don't accidentally try to create constructor like desc
      ret.descs.constructor = null;

    } else if (ret.source !== obj) {
      ret = obj[META_KEY] = o_create(ret);
      ret.descs    = o_create(ret.descs);
      ret.values   = o_create(ret.values);
      ret.watching = o_create(ret.watching);
      ret.lastSetValues = {};
      ret.cache    = {};
      ret.source   = obj;
    }
    return ret;
  };

  Alto.getMeta = function getMeta(obj, property) {
    var meta = Alto.meta(obj, false);
    return meta[property];
  };

  Alto.setMeta = function setMeta(obj, property, value) {
    var meta = Alto.meta(obj, true);
    meta[property] = value;
    return value;
  };

  /**
   @private

   In order to store defaults for a class, a prototype may need to create
   a default meta object, which will be inherited by any objects instantiated
   from the class's constructor.

   However, the properties of that meta object are only shallow-cloned,
   so if a property is a hash (like the event system's `listeners` hash),
   it will by default be shared across all instances of that class.

   This method allows extensions to deeply clone a series of nested hashes or
   other complex objects. For instance, the event system might pass
   ['listeners', 'foo:change', 'Alto157'] to `prepareMetaPath`, which will
   walk down the keys provided.

   For each key, if the key does not exist, it is created. If it already
   exists and it was inherited from its constructor, the constructor's
   key is cloned.

   You can also pass false for `writable`, which will simply return
   undefined if `prepareMetaPath` discovers any part of the path that
   shared or undefined.

   @param {Object} obj The object whose meta we are examining
   @param {Array} path An array of keys to walk down
   @param {Boolean} writable whether or not to create a new meta
   (or meta property) if one does not already exist or if it's
   shared with its constructor
   */
  Alto.metaPath = function(obj, path, writable) {
    var meta = Alto.meta(obj, writable), keyName, value;

    for (var i=0, l=path.length; i<l; i++) {
      keyName = path[i];
      value = meta[keyName];

      if (!value) {
        if (!writable) { return undefined; }
        value = meta[keyName] = { __Alto_source__: obj };
      } else if (value.__Alto_source__ !== obj) {
        if (!writable) { return undefined; }
        value = meta[keyName] = o_create(value);
        value.__Alto_source__ = obj;
      }

      meta = value;
    }

    return value;
  };

  /**
   @private

   Wraps the passed function so that `this._super` will point to the superFunc
   when the function is invoked.  This is the primitive we use to implement
   calls to super.

   @param {Function} func
   The function to call

   @param {Function} superFunc
   The super function.

   @returns {Function} wrapped function.
   */
  Alto.wrap = function(func, superFunc) {

    function K() {}

    var newFunc = function() {
      var ret, sup = this._super;
      this._super = superFunc || K;
      ret = func.apply(this, arguments);
      this._super = sup;
      return ret;
    };

    newFunc.base = func;
    return newFunc;
  };

  /**
   @function

   Returns YES if the passed object is an array or Array-like.

   Alto Array Protocol:

   - the object has an objectAt property
   - the object is a native Array
   - the object is an Object, and has a length property

   Unlike Alto.typeOf this method returns true even if the passed object is
   not formally array but appears to be array-like (i.e. implements Alto.Array)

   @param {Object} obj The object to test
   @returns {Boolean}
   */
  Alto.isArray = function(obj) {
    if (!obj || obj.setInterval) { return false; }
    if (Array.isArray && Array.isArray(obj)) { return true; }
    if (Alto.Array && Alto.Array.detect(obj)) { return true; }
    if ((obj.length !== undefined) && 'object'===typeof obj) { return true; }
    return false;
  };

  /**
   Forces the passed object to be part of an array.  If the object is already
   an array or array-like, returns the object.  Otherwise adds the object to
   an array.  If obj is null or undefined, returns an empty array.

   @param {Object} obj the object
   @returns {Array}
   */
  Alto.makeArray = function(obj) {
    if (obj==null) return [];
    return Alto.isArray(obj) ? obj : [obj];
  };



})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
  var USE_ACCESSORS = Alto.platform.hasPropertyAccessors && Alto.ENV.USE_ACCESSORS;
  Alto.USE_ACCESSORS = !!USE_ACCESSORS;

  var meta = Alto.meta;

// ..........................................................
// GET AND SET
// 
// If we are on a platform that supports accessors we can get use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

  var get, set;

  get = function get(obj, keyName) {
    if (keyName === undefined && 'string' === typeof obj) {
      keyName = obj;
      obj = Alto;
    }

    if (!obj) return undefined;
    var ret = obj[keyName];
    if (ret===undefined && 'function'===typeof obj.unknownProperty) {
      ret = obj.unknownProperty(keyName);
    }
    return ret;
  };

  set = function set(obj, keyName, value) {
    if (('object'===typeof obj) && !(keyName in obj)) {
      if ('function' === typeof obj.setUnknownProperty) {
        obj.setUnknownProperty(keyName, value);
      } else if ('function' === typeof obj.unknownProperty) {
        obj.unknownProperty(keyName, value);
      } else obj[keyName] = value;
    } else {
      obj[keyName] = value;
    }
    return value;
  };

  if (!USE_ACCESSORS) {

    var o_get = get, o_set = set;

    get = function(obj, keyName) {
      if (keyName === undefined && 'string' === typeof obj) {
        keyName = obj;
        obj = Alto;
      }

      Alto_assert("You need to provide an object and key to `get`.", !!obj && keyName);

      if (!obj) return undefined;
      var desc = meta(obj, false).descs[keyName];
      if (desc) return desc.get(obj, keyName);
      else return o_get(obj, keyName);
    };

    set = function(obj, keyName, value) {
      Alto_assert("You need to provide an object and key to `set`.", !!obj && keyName !== undefined);
      var desc = meta(obj, false).descs[keyName];
      if (desc) desc.set(obj, keyName, value);
      else o_set(obj, keyName, value);
      return value;
    };

  }

  /**
   @function

   Gets the value of a property on an object.  If the property is computed,
   the function will be invoked.  If the property is not defined but the
   object implements the unknownProperty() method then that will be invoked.

   If you plan to run on IE8 and older browsers then you should use this
   method anytime you want to retrieve a property on an object that you don't
   know for sure is private.  (My convention only properties beginning with
   an underscore '_' are considered private.)

   On all newer browsers, you only need to use this method to retrieve
   properties if the property might not be defined on the object and you want
   to respect the unknownProperty() handler.  Otherwise you can ignore this
   method.

   Note that if the obj itself is null, this method will simply return
   undefined.

   @param {Object} obj
   The object to retrieve from.

   @param {String} keyName
   The property key to retrieve

   @returns {Object} the property value or null.
   */
  Alto.get = get;

  /**
   @function

   Sets the value of a property on an object, respecting computed properties
   and notifying observers and other listeners of the change.  If the
   property is not defined but the object implements the unknownProperty()
   method then that will be invoked as well.

   If you plan to run on IE8 and older browsers then you should use this
   method anytime you want to set a property on an object that you don't
   know for sure is private.  (My convention only properties beginning with
   an underscore '_' are considered private.)

   On all newer browsers, you only need to use this method to set
   properties if the property might not be defined on the object and you want
   to respect the unknownProperty() handler.  Otherwise you can ignore this
   method.

   @param {Object} obj
   The object to modify.

   @param {String} keyName
   The property key to set

   @param {Object} value
   The value to set

   @returns {Object} the passed value.
   */
  Alto.set = set;

// ..........................................................
// PATHS
// 

  function normalizePath(path) {
    Alto_assert('must pass non-empty string to normalizePath()', path && path!=='');

    if (path==='*') return path; //special case...
    var first = path.charAt(0);
    if(first==='.') return 'this'+path;
    if (first==='*' && path.charAt(1)!=='.') return 'this.'+path.slice(1);
    return path;
  }

// assumes normalized input; no *, normalized path, always a target...
  function getPath(target, path) {
    var len = path.length, idx, next, key;

    idx = path.indexOf('*');
    if (idx>0 && path.charAt(idx-1)!=='.') {
      return getPath(getPath(target, path.slice(0, idx)), path.slice(idx+1));
    }

    idx = 0;
    while(target && idx<len) {
      next = path.indexOf('.', idx);
      if (next<0) next = len;
      key = path.slice(idx, next);
      target = key==='*' ? target : get(target, key);

      if (target && target.isDestroyed) { return undefined; }

      idx = next+1;
    }
    return target ;
  }

  var TUPLE_RET = [];
  var IS_GLOBAL = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]/;
  var IS_GLOBAL_SET = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]?/;
  var HAS_THIS  = /^this[\.\*]/;
  var FIRST_KEY = /^([^\.\*]+)/;

  function firstKey(path) {
    return path.match(FIRST_KEY)[0];
  }

// assumes path is already normalized
  function normalizeTuple(target, path) {
    var hasThis  = HAS_THIS.test(path),
        isGlobal = !hasThis && IS_GLOBAL.test(path),
        key;

    if (!target || isGlobal) target = window;
    if (hasThis) path = path.slice(5);

    var idx = path.indexOf('*');
    if (idx>0 && path.charAt(idx-1)!=='.') {

      // should not do lookup on a prototype object because the object isn't
      // really live yet.
      if (target && meta(target,false).proto!==target) {
        target = getPath(target, path.slice(0, idx));
      } else {
        target = null;
      }
      path   = path.slice(idx+1);

    } else if (target === window) {
      key = firstKey(path);
      target = get(target, key);
      path   = path.slice(key.length+1);
    }

    // must return some kind of path to be valid else other things will break.
    if (!path || path.length===0) throw new Error('Invalid Path');

    TUPLE_RET[0] = target;
    TUPLE_RET[1] = path;
    return TUPLE_RET;
  }

  /**
   @private

   Normalizes a path to support older-style property paths beginning with . or

   @function
   @param {String} path path to normalize
   @returns {String} normalized path
   */
  Alto.normalizePath = normalizePath;

  /**
   @private

   Normalizes a target/path pair to reflect that actual target/path that should
   be observed, etc.  This takes into account passing in global property
   paths (i.e. a path beginning with a captial letter not defined on the
   target) and * separators.

   @param {Object} target
   The current target.  May be null.

   @param {String} path
   A path on the target or a global property path.

   @returns {Array} a temporary array with the normalized target/path pair.
   */
  Alto.normalizeTuple = function(target, path) {
    return normalizeTuple(target, normalizePath(path));
  };

  Alto.normalizeTuple.primitive = normalizeTuple;

  Alto.getPath = function(root, path) {
    var hasThis, hasStar, isGlobal;

    if (!path && 'string'===typeof root) {
      path = root;
      root = null;
    }

    hasStar = path.indexOf('*') > -1;

    // If there is no root and path is a key name, return that
    // property from the global object.
    // E.g. getPath('Alto') -> Alto
    if (root === null && !hasStar && path.indexOf('.') < 0) { return get(window, path); }

    // detect complicated paths and normalize them
    path = normalizePath(path);
    hasThis  = HAS_THIS.test(path);
    isGlobal = !hasThis && IS_GLOBAL.test(path);
    if (!root || hasThis || isGlobal || hasStar) {
      var tuple = normalizeTuple(root, path);
      root = tuple[0];
      path = tuple[1];
    }

    return getPath(root, path);
  };

  Alto.setPath = function(root, path, value, tolerant) {
    var keyName;

    if (arguments.length===2 && 'string' === typeof root) {
      value = path;
      path = root;
      root = null;
    }

    path = normalizePath(path);
    if (path.indexOf('*')>0) {
      var tuple = normalizeTuple(root, path);
      root = tuple[0];
      path = tuple[1];
    }

    if (path.indexOf('.') > 0) {
      keyName = path.slice(path.lastIndexOf('.')+1);
      path    = path.slice(0, path.length-(keyName.length+1));
      if (!HAS_THIS.test(path) && IS_GLOBAL_SET.test(path) && path.indexOf('.')<0) {
        root = window[path]; // special case only works during set...
      } else if (path !== 'this') {
        root = Alto.getPath(root, path);
      }

    } else {
      if (IS_GLOBAL_SET.test(path)) throw new Error('Invalid Path');
      keyName = path;
    }

    if (!keyName || keyName.length===0 || keyName==='*') {
      throw new Error('Invalid Path');
    }

    if (!root) {
      if (tolerant) { return; }
      else { throw new Error('Object in path '+path+' could not be found or was destroyed.'); }
    }

    return Alto.set(root, keyName, value);
  };

  /**
   Error-tolerant form of Alto.setPath. Will not blow up if any part of the
   chain is undefined, null, or destroyed.

   This is primarily used when syncing bindings, which may try to update after
   an object has been destroyed.
   */
  Alto.trySetPath = function(root, path, value) {
    if (arguments.length===2 && 'string' === typeof root) {
      value = path;
      path = root;
      root = null;
    }

    return Alto.setPath(root, path, value, true);
  };

  /**
   Returns true if the provided path is global (e.g., "MyApp.fooController.bar")
   instead of local ("foo.bar.baz").

   @param {String} path
   @returns Boolean
   */
  Alto.isGlobalPath = function(path) {
    return !HAS_THIS.test(path) && IS_GLOBAL.test(path);
  };

})({});


(function(exports) {
// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
  if (!Array.prototype.map)
  {
    Array.prototype.map = function(fun /*, thisp */)
    {
      "use strict";

      if (this === void 0 || this === null)
        throw new TypeError();

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== "function")
        throw new TypeError();

      var res = new Array(len);
      var thisp = arguments[1];
      for (var i = 0; i < len; i++)
      {
        if (i in t)
          res[i] = fun.call(thisp, t[i], i, t);
      }

      return res;
    };
  }

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
  if (!Array.prototype.forEach)
  {
    Array.prototype.forEach = function(fun /*, thisp */)
    {
      "use strict";

      if (this === void 0 || this === null)
        throw new TypeError();

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== "function")
        throw new TypeError();

      var thisp = arguments[1];
      for (var i = 0; i < len; i++)
      {
        if (i in t)
          fun.call(thisp, t[i], i, t);
      }
    };
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj, fromIndex) {
      if (fromIndex == null) { fromIndex = 0; }
      else if (fromIndex < 0) { fromIndex = Math.max(0, this.length + fromIndex); }
      for (var i = fromIndex, j = this.length; i < j; i++) {
        if (this[i] === obj) { return i; }
      }
      return -1;
    };
  }

})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
  var AFTER_OBSERVERS = ':change';
  var BEFORE_OBSERVERS = ':before';
  var guidFor = Alto.guidFor;
  var normalizePath = Alto.normalizePath;

  var suspended = 0;
  var array_Slice = Array.prototype.slice;

  var ObserverSet = function(iterateable) {
    this.set = {};
    if (iterateable) { this.array = []; }
  };

  ObserverSet.prototype.add = function(target, name) {
    var set = this.set, guid = Alto.guidFor(target), array;

    if (!set[guid]) { set[guid] = {}; }
    set[guid][name] = true;
    if (array = this.array) {
      array.push([target, name]);
    }
  };

  ObserverSet.prototype.contains = function(target, name) {
    var set = this.set, guid = Alto.guidFor(target), nameSet = set[guid];
    return nameSet && nameSet[name];
  };

  ObserverSet.prototype.empty = function() {
    this.set = {};
    this.array = [];
  };

  ObserverSet.prototype.forEach = function(fn) {
    var q = this.array;
    this.empty();
    q.forEach(function(item) {
      fn(item[0], item[1]);
    });
  };

  var queue = new ObserverSet(true), beforeObserverSet = new ObserverSet();

  function notifyObservers(obj, eventName, forceNotification) {
    if (suspended && !forceNotification) {

      // if suspended add to the queue to send event later - but only send 
      // event once.
      if (!queue.contains(obj, eventName)) {
        queue.add(obj, eventName);
      }

    } else {
      Alto.sendEvent(obj, eventName);
    }
  }

  function flushObserverQueue() {
    beforeObserverSet.empty();

    if (!queue || queue.array.length===0) return ;
    queue.forEach(function(target, event){ Alto.sendEvent(target, event); });
  }

  Alto.beginPropertyChanges = function() {
    suspended++;
    return this;
  };

  Alto.endPropertyChanges = function() {
    suspended--;
    if (suspended<=0) flushObserverQueue();
  };

  /**
   Make a series of property changes together in an
   exception-safe way.

   Alto.changeProperties(function() {
        obj1.set('foo', mayBlowUpWhenSet);
        obj2.set('bar', baz);
      });
   */
  Alto.changeProperties = function(cb){
    Alto.beginPropertyChanges();
    try {
      cb();
    } finally {
      Alto.endPropertyChanges();
    }
  };

  function changeEvent(keyName) {
    return keyName+AFTER_OBSERVERS;
  }

  function beforeEvent(keyName) {
    return keyName+BEFORE_OBSERVERS;
  }

  function changeKey(eventName) {
    return eventName.slice(0, -7);
  }

  function beforeKey(eventName) {
    return eventName.slice(0, -7);
  }

  function xformForArgs(args) {
    return function (target, method, params) {
      var obj = params[0], keyName = changeKey(params[1]), val;
      var copy_args = args.slice();
      if (method.length>2) val = Alto.getPath(obj, keyName);
      copy_args.unshift(obj, keyName, val);
      method.apply(target, copy_args);
    };
  }

  var xformChange = xformForArgs([]);

  function xformBefore(target, method, params) {
    var obj = params[0], keyName = beforeKey(params[1]), val;
    if (method.length>2) val = Alto.getPath(obj, keyName);
    method.call(target, obj, keyName, val);
  }

  Alto.addObserver = function(obj, path, target, method) {
    path = normalizePath(path);

    var xform;
    if (arguments.length > 4) {
      var args = array_Slice.call(arguments, 4);
      xform = xformForArgs(args);
    } else {
      xform = xformChange;
    }
    Alto.addListener(obj, changeEvent(path), target, method, xform);
    Alto.watch(obj, path);
    return this;
  };

  /** @private */
  Alto.observersFor = function(obj, path) {
    return Alto.listenersFor(obj, changeEvent(path));
  };

  Alto.removeObserver = function(obj, path, target, method) {
    path = normalizePath(path);
    Alto.unwatch(obj, path);
    Alto.removeListener(obj, changeEvent(path), target, method);
    return this;
  };

  Alto.addBeforeObserver = function(obj, path, target, method) {
    path = normalizePath(path);
    Alto.addListener(obj, beforeEvent(path), target, method, xformBefore);
    Alto.watch(obj, path);
    return this;
  };

  /** @private */
  Alto.beforeObserversFor = function(obj, path) {
    return Alto.listenersFor(obj, beforeEvent(path));
  };

  Alto.removeBeforeObserver = function(obj, path, target, method) {
    path = normalizePath(path);
    Alto.unwatch(obj, path);
    Alto.removeListener(obj, beforeEvent(path), target, method);
    return this;
  };

  /** @private */
  Alto.notifyObservers = function(obj, keyName) {
    notifyObservers(obj, changeEvent(keyName));
  };

  /** @private */
  Alto.notifyBeforeObservers = function(obj, keyName) {
    var guid, set, forceNotification = false;

    if (suspended) {
      if (!beforeObserverSet.contains(obj, keyName)) {
        beforeObserverSet.add(obj, keyName);
        forceNotification = true;
      } else {
        return;
      }
    }

    notifyObservers(obj, beforeEvent(keyName), forceNotification);
  };


})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
  var USE_ACCESSORS = Alto.USE_ACCESSORS;
  var GUID_KEY = Alto.GUID_KEY;
  var META_KEY = Alto.META_KEY;
  var meta = Alto.meta;
  var o_create = Alto.platform.create;
  var o_defineProperty = Alto.platform.defineProperty;
  var SIMPLE_PROPERTY, WATCHED_PROPERTY;

// ..........................................................
// DESCRIPTOR
// 

  var SIMPLE_DESC = {
    writable: true,
    configurable: true,
    enumerable: true,
    value: null
  };

  /**
   @private
   @constructor

   Objects of this type can implement an interface to responds requests to
   get and set.  The default implementation handles simple properties.

   You generally won't need to create or subclass this directly.
   */
  var Dc = Alto.Descriptor = function() {};

  var setup = Dc.setup = function(obj, keyName, value) {
    SIMPLE_DESC.value = value;
    o_defineProperty(obj, keyName, SIMPLE_DESC);
    SIMPLE_DESC.value = null;
  };

  var Dp = Alto.Descriptor.prototype;

  /**
   Called whenever we want to set the property value.  Should set the value
   and return the actual set value (which is usually the same but may be
   different in the case of computed properties.)

   @param {Object} obj
   The object to set the value on.

   @param {String} keyName
   The key to set.

   @param {Object} value
   The new value

   @returns {Object} value actual set value
   */
  Dp.set = function(obj, keyName, value) {
    obj[keyName] = value;
    return value;
  };

  /**
   Called whenever we want to get the property value.  Should retrieve the
   current value.

   @param {Object} obj
   The object to get the value on.

   @param {String} keyName
   The key to retrieve

   @returns {Object} the current value
   */
  Dp.get = function(obj, keyName) {
    return w_get(obj, keyName, obj);
  };

  /**
   This is called on the descriptor to set it up on the object.  The
   descriptor is responsible for actually defining the property on the object
   here.

   The passed `value` is the transferValue returned from any previous
   descriptor.

   @param {Object} obj
   The object to set the value on.

   @param {String} keyName
   The key to set.

   @param {Object} value
   The transfer value from any previous descriptor.

   @returns {void}
   */
  Dp.setup = setup;

  /**
   This is called on the descriptor just before another descriptor takes its
   place.  This method should at least return the 'transfer value' of the
   property - which is the value you want to passed as the input to the new
   descriptor's setup() method.

   It is not generally necessary to actually 'undefine' the property as a new
   property descriptor will redefine it immediately after this method returns.

   @param {Object} obj
   The object to set the value on.

   @param {String} keyName
   The key to set.

   @returns {Object} transfer value
   */
  Dp.teardown = function(obj, keyName) {
    return obj[keyName];
  };

  Dp.val = function(obj, keyName) {
    return obj[keyName];
  };

// ..........................................................
// SIMPLE AND WATCHED PROPERTIES
// 

// if accessors are disabled for the app then this will act as a guard when
// testing on browsers that do support accessors.  It will throw an exception
// if you do foo.bar instead of Alto.get(foo, 'bar')

// The exception to this is that any objects managed by Alto but not a descendant
// of Alto.Object will not throw an exception, instead failing silently. This
// prevent errors with other libraries that may attempt to access special
// properties on standard objects like Array. Usually this happens when copying
// an object by looping over all properties.

  if (!USE_ACCESSORS) {
    Alto.Descriptor.MUST_USE_GETTER = function() {
      if (this instanceof Alto.Object) {
        Alto_assert('Must use Alto.get() to access this property', false);
      }
    };

    Alto.Descriptor.MUST_USE_SETTER = function() {
      if (this instanceof Alto.Object) {
        if (this.isDestroyed) {
          Alto_assert('You cannot set observed properties on destroyed objects', false);
        } else {
          Alto_assert('Must use Alto.set() to access this property', false);
        }
      }
    };
  }

  var WATCHED_DESC = {
    configurable: true,
    enumerable:   true,
    set: Alto.Descriptor.MUST_USE_SETTER
  };

  function w_get(obj, keyName, values) {
    values = values || meta(obj, false).values;

    if (values) {
      var ret = values[keyName];
      if (ret !== undefined) { return ret; }
      if (obj.unknownProperty) { return obj.unknownProperty(keyName); }
    }

  }

  function w_set(obj, keyName, value) {
    var m = meta(obj), watching;

    watching = m.watching[keyName]>0 && value!==m.values[keyName];
    if (watching) Alto.propertyWillChange(obj, keyName);
    m.values[keyName] = value;
    if (watching) Alto.propertyDidChange(obj, keyName);
    return value;
  }

  var WATCHED_GETTERS = {};
  function mkWatchedGetter(keyName) {
    var ret = WATCHED_GETTERS[keyName];
    if (!ret) {
      ret = WATCHED_GETTERS[keyName] = function() {
        return w_get(this, keyName);
      };
    }
    return ret;
  }

  var WATCHED_SETTERS = {};
  function mkWatchedSetter(keyName) {
    var ret = WATCHED_SETTERS[keyName];
    if (!ret) {
      ret = WATCHED_SETTERS[keyName] = function(value) {
        return w_set(this, keyName, value);
      };
    }
    return ret;
  }

  /**
   @private

   Private version of simple property that invokes property change callbacks.
   */
  WATCHED_PROPERTY = new Alto.Descriptor();

  if (Alto.platform.hasPropertyAccessors) {
    WATCHED_PROPERTY.get = w_get ;
    WATCHED_PROPERTY.set = w_set ;

    if (USE_ACCESSORS) {
      WATCHED_PROPERTY.setup = function(obj, keyName, value) {
        WATCHED_DESC.get = mkWatchedGetter(keyName);
        WATCHED_DESC.set = mkWatchedSetter(keyName);
        o_defineProperty(obj, keyName, WATCHED_DESC);
        WATCHED_DESC.get = WATCHED_DESC.set = null;
        if (value !== undefined) meta(obj).values[keyName] = value;
      };

    } else {
      WATCHED_PROPERTY.setup = function(obj, keyName, value) {
        WATCHED_DESC.get = mkWatchedGetter(keyName);
        o_defineProperty(obj, keyName, WATCHED_DESC);
        WATCHED_DESC.get = null;
        if (value !== undefined) meta(obj).values[keyName] = value;
      };
    }

    WATCHED_PROPERTY.teardown = function(obj, keyName) {
      var ret = meta(obj).values[keyName];
      delete meta(obj).values[keyName];
      return ret;
    };

// NOTE: if platform does not have property accessors then we just have to 
// set values and hope for the best.  You just won't get any warnings...
  } else {

    WATCHED_PROPERTY.set = function(obj, keyName, value) {
      var m = meta(obj), watching;

      watching = m.watching[keyName]>0 && value!==obj[keyName];
      if (watching) Alto.propertyWillChange(obj, keyName);
      obj[keyName] = value;
      if (watching) Alto.propertyDidChange(obj, keyName);
      return value;
    };

  }

  /**
   The default descriptor for simple properties.  Pass as the third argument
   to Alto.defineProperty() along with a value to set a simple value.

   @static
   @default Alto.Descriptor
   */
  Alto.SIMPLE_PROPERTY = new Alto.Descriptor();
  SIMPLE_PROPERTY = Alto.SIMPLE_PROPERTY;

  SIMPLE_PROPERTY.unwatched = WATCHED_PROPERTY.unwatched = SIMPLE_PROPERTY;
  SIMPLE_PROPERTY.watched   = WATCHED_PROPERTY.watched   = WATCHED_PROPERTY;


// ..........................................................
// DEFINING PROPERTIES API
// 

  function hasDesc(descs, keyName) {
    if (keyName === 'toString') return 'function' !== typeof descs.toString;
    else return !!descs[keyName];
  }

  /**
   @private

   NOTE: This is a low-level method used by other parts of the API.  You almost
   never want to call this method directly.  Instead you should use Alto.mixin()
   to define new properties.

   Defines a property on an object.  This method works much like the ES5
   Object.defineProperty() method except that it can also accept computed
   properties and other special descriptors.

   Normally this method takes only three parameters.  However if you pass an
   instance of Alto.Descriptor as the third param then you can pass an optional
   value as the fourth parameter.  This is often more efficient than creating
   new descriptor hashes for each property.

   ## Examples

   // ES5 compatible mode
   Alto.defineProperty(contact, 'firstName', {
        writable: true,
        configurable: false,
        enumerable: true,
        value: 'Charles'
      });

   // define a simple property
   Alto.defineProperty(contact, 'lastName', Alto.SIMPLE_PROPERTY, 'Jolley');

   // define a computed property
   Alto.defineProperty(contact, 'fullName', Alto.computed(function() {
        return this.firstName+' '+this.lastName;
      }).property('firstName', 'lastName').cacheable());
   */
  Alto.defineProperty = function(obj, keyName, desc, val) {
    var m = meta(obj, false), descs = m.descs, watching = m.watching[keyName]>0;

    if (val === undefined) {
      val = hasDesc(descs, keyName) ? descs[keyName].teardown(obj, keyName) : obj[keyName];
    } else if (hasDesc(descs, keyName)) {
      descs[keyName].teardown(obj, keyName);
    }

    if (!desc) desc = SIMPLE_PROPERTY;

    if (desc instanceof Alto.Descriptor) {
      m = meta(obj, true);
      descs = m.descs;

      desc = (watching ? desc.watched : desc.unwatched) || desc;
      descs[keyName] = desc;
      desc.setup(obj, keyName, val, watching);

      // compatibility with ES5
    } else {
      if (descs[keyName]) meta(obj).descs[keyName] = null;
      o_defineProperty(obj, keyName, desc);
    }

    return this;
  };

  /**
   Creates a new object using the passed object as its prototype.  On browsers
   that support it, this uses the built in Object.create method.  Else one is
   simulated for you.

   This method is a better choice thant Object.create() because it will make
   sure that any observers, event listeners, and computed properties are
   inherited from the parent as well.

   @param {Object} obj
   The object you want to have as the prototype.

   @returns {Object} the newly created object
   */
  Alto.create = function(obj, props) {
    var ret = o_create(obj, props);
    if (GUID_KEY in ret) Alto.generateGuid(ret, 'Alto');
    if (META_KEY in ret) Alto.rewatch(ret); // setup watch chains if needed.
    return ret;
  };

  /**
   @private

   Creates a new object using the passed object as its prototype.  This method
   acts like `Alto.create()` in every way except that bindings, observers, and
   computed properties will be activated on the object.

   The purpose of this method is to build an object for use in a prototype
   chain. (i.e. to be set as the `prototype` property on a constructor
   function).  Prototype objects need to inherit bindings, observers and
   other configuration so they pass it on to their children.  However since
   they are never 'live' objects themselves, they should not fire or make
   other changes when various properties around them change.

   You should use this method anytime you want to create a new object for use
   in a prototype chain.

   @param {Object} obj
   The base object.

   @param {Object} hash
   Optional hash of properties to define on the object.

   @returns {Object} new object
   */
  Alto.createPrototype = function(obj, props) {
    var ret = o_create(obj, props);
    meta(ret, true).proto = ret;
    if (GUID_KEY in ret) Alto.generateGuid(ret, 'Alto');
    if (META_KEY in ret) Alto.rewatch(ret); // setup watch chains if needed.
    return ret;
  };


  /**
   Tears down the meta on an object so that it can be garbage collected.
   Multiple calls will have no effect.

   @param {Object} obj  the object to destroy
   @returns {void}
   */
  Alto.destroy = function(obj) {
    if (obj[META_KEY]) obj[META_KEY] = null;
  };


})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
  var guidFor = Alto.guidFor;
  var meta    = Alto.meta;
  var get = Alto.get, set = Alto.set;
  var normalizeTuple = Alto.normalizeTuple.primitive;
  var normalizePath  = Alto.normalizePath;
  var SIMPLE_PROPERTY = Alto.SIMPLE_PROPERTY;
  var GUID_KEY = Alto.GUID_KEY;
  var notifyObservers = Alto.notifyObservers;

  var FIRST_KEY = /^([^\.\*]+)/;
  var IS_PATH = /[\.\*]/;

  function firstKey(path) {
    return path.match(FIRST_KEY)[0];
  }

// returns true if the passed path is just a keyName
  function isKeyName(path) {
    return path==='*' || !IS_PATH.test(path);
  }

// ..........................................................
// DEPENDENT KEYS
// 

  var DEP_SKIP = { __Altoproto__: true }; // skip some keys and toString
  function iterDeps(methodName, obj, depKey, seen) {

    var guid = guidFor(obj);
    if (!seen[guid]) seen[guid] = {};
    if (seen[guid][depKey]) return ;
    seen[guid][depKey] = true;

    var deps = meta(obj, false).deps, method = Alto[methodName];
    deps = deps && deps[depKey];
    if (deps) {
      for(var key in deps) {
        if (DEP_SKIP[key]) continue;
        method(obj, key);
      }
    }
  }


  var WILL_SEEN, DID_SEEN;

// called whenever a property is about to change to clear the cache of any dependent keys (and notify those properties of changes, etc...)
  function dependentKeysWillChange(obj, depKey) {
    var seen = WILL_SEEN, top = !seen;
    if (top) seen = WILL_SEEN = {};
    iterDeps('propertyWillChange', obj, depKey, seen);
    if (top) WILL_SEEN = null;
  }

// called whenever a property has just changed to update dependent keys
  function dependentKeysDidChange(obj, depKey) {
    var seen = DID_SEEN, top = !seen;
    if (top) seen = DID_SEEN = {};
    iterDeps('propertyDidChange', obj, depKey, seen);
    if (top) DID_SEEN = null;
  }

// ..........................................................
// CHAIN
// 

  function addChainWatcher(obj, keyName, node) {
    if (!obj || ('object' !== typeof obj)) return; // nothing to do
    var m = meta(obj);
    var nodes = m.chainWatchers;
    if (!nodes || nodes.__Altoproto__ !== obj) {
      nodes = m.chainWatchers = { __Altoproto__: obj };
    }

    if (!nodes[keyName]) nodes[keyName] = {};
    nodes[keyName][guidFor(node)] = node;
    Alto.watch(obj, keyName);
  }

  function removeChainWatcher(obj, keyName, node) {
    if (!obj || ('object' !== typeof obj)) return; // nothing to do
    var m = meta(obj, false);
    var nodes = m.chainWatchers;
    if (!nodes || nodes.__Altoproto__ !== obj) return; //nothing to do
    if (nodes[keyName]) delete nodes[keyName][guidFor(node)];
    Alto.unwatch(obj, keyName);
  }

  var pendingQueue = [];

// attempts to add the pendingQueue chains again.  If some of them end up
// back in the queue and reschedule is true, schedules a timeout to try 
// again.
  function flushPendingChains(reschedule) {
    if (pendingQueue.length===0) return ; // nothing to do

    var queue = pendingQueue;
    pendingQueue = [];

    queue.forEach(function(q) { q[0].add(q[1]); });
    if (reschedule!==false && pendingQueue.length>0) {
      setTimeout(flushPendingChains, 1);
    }
  }

  function isProto(pvalue) {
    return meta(pvalue, false).proto === pvalue;
  }

// A ChainNode watches a single key on an object.  If you provide a starting
// value for the key then the node won't actually watch it.  For a root node 
// pass null for parent and key and object for value.
  var ChainNode = function(parent, key, value, separator) {
    var obj;
    this._parent = parent;
    this._key    = key;

    // _watching is true when calling get(this._parent, this._key) will
    // return the value of this node.
    //
    // It is false for the root of a chain (because we have no parent)
    // and for global paths (because the parent node is the object with
    // the observer on it)
    this._watching = value===undefined;

    this._value  = value;
    this._separator = separator || '.';
    this._paths = {};
    if (this._watching) {
      this._object = parent.value();
      if (this._object) addChainWatcher(this._object, this._key, this);
    }

    // Special-case: the EachProxy relies on immediate evaluation to
    // establish its observers.
    //
    // TODO: Replace this with an efficient callback that the EachProxy
    // can implement.
    if (this._parent && this._parent._key === '@each') {
      this.value();
    }
  };


  var Wp = ChainNode.prototype;

  Wp.value = function() {
    if (this._value === undefined && this._watching){
      var obj = this._parent.value();
      this._value = (obj && !isProto(obj)) ? get(obj, this._key) : undefined;
    }
    return this._value;
  };

  Wp.destroy = function() {
    if (this._watching) {
      var obj = this._object;
      if (obj) removeChainWatcher(obj, this._key, this);
      this._watching = false; // so future calls do nothing
    }
  };

// copies a top level object only
  Wp.copy = function(obj) {
    var ret = new ChainNode(null, null, obj, this._separator);
    var paths = this._paths, path;
    for(path in paths) {
      if (!(paths[path] > 0)) continue; // this check will also catch non-number vals.
      ret.add(path);
    }
    return ret;
  };

// called on the root node of a chain to setup watchers on the specified 
// path.
  Wp.add = function(path) {
    var obj, tuple, key, src, separator, paths;

    paths = this._paths;
    paths[path] = (paths[path] || 0) + 1 ;

    obj = this.value();
    tuple = normalizeTuple(obj, path);

    // the path was a local path
    if (tuple[0] && (tuple[0] === obj)) {
      path = tuple[1];
      key  = firstKey(path);
      path = path.slice(key.length+1);

      // global path, but object does not exist yet.
      // put into a queue and try to connect later.
    } else if (!tuple[0]) {
      pendingQueue.push([this, path]);
      return;

      // global path, and object already exists
    } else {
      src  = tuple[0];
      key  = path.slice(0, 0-(tuple[1].length+1));
      separator = path.slice(key.length, key.length+1);
      path = tuple[1];
    }

    this.chain(key, path, src, separator);
  };

// called on the root node of a chain to teardown watcher on the specified
// path
  Wp.remove = function(path) {
    var obj, tuple, key, src, paths;

    paths = this._paths;
    if (paths[path] > 0) paths[path]--;

    obj = this.value();
    tuple = normalizeTuple(obj, path);
    if (tuple[0] === obj) {
      path = tuple[1];
      key  = firstKey(path);
      path = path.slice(key.length+1);

    } else {
      src  = tuple[0];
      key  = path.slice(0, 0-(tuple[1].length+1));
      path = tuple[1];
    }

    this.unchain(key, path);
  };

  Wp.count = 0;

  Wp.chain = function(key, path, src, separator) {
    var chains = this._chains, node;
    if (!chains) chains = this._chains = {};

    node = chains[key];
    if (!node) node = chains[key] = new ChainNode(this, key, src, separator);
    node.count++; // count chains...

    // chain rest of path if there is one
    if (path && path.length>0) {
      key = firstKey(path);
      path = path.slice(key.length+1);
      node.chain(key, path); // NOTE: no src means it will observe changes...
    }
  };

  Wp.unchain = function(key, path) {
    var chains = this._chains, node = chains[key];

    // unchain rest of path first...
    if (path && path.length>1) {
      key  = firstKey(path);
      path = path.slice(key.length+1);
      node.unchain(key, path);
    }

    // delete node if needed.
    node.count--;
    if (node.count<=0) {
      delete chains[node._key];
      node.destroy();
    }

  };

  Wp.willChange = function() {
    var chains = this._chains;
    if (chains) {
      for(var key in chains) {
        if (!chains.hasOwnProperty(key)) continue;
        chains[key].willChange();
      }
    }

    if (this._parent) this._parent.chainWillChange(this, this._key, 1);
  };

  Wp.chainWillChange = function(chain, path, depth) {
    if (this._key) path = this._key+this._separator+path;

    if (this._parent) {
      this._parent.chainWillChange(this, path, depth+1);
    } else {
      if (depth>1) Alto.propertyWillChange(this.value(), path);
      path = 'this.'+path;
      if (this._paths[path]>0) Alto.propertyWillChange(this.value(), path);
    }
  };

  Wp.chainDidChange = function(chain, path, depth) {
    if (this._key) path = this._key+this._separator+path;
    if (this._parent) {
      this._parent.chainDidChange(this, path, depth+1);
    } else {
      if (depth>1) Alto.propertyDidChange(this.value(), path);
      path = 'this.'+path;
      if (this._paths[path]>0) Alto.propertyDidChange(this.value(), path);
    }
  };

  Wp.didChange = function() {
    // invalidate my own value first.
    if (this._watching) {
      var obj = this._parent.value();
      if (obj !== this._object) {
        removeChainWatcher(this._object, this._key, this);
        this._object = obj;
        addChainWatcher(obj, this._key, this);
      }
      this._value  = undefined;

      // Special-case: the EachProxy relies on immediate evaluation to
      // establish its observers.
      if (this._parent && this._parent._key === '@each')
        this.value();
    }

    // then notify chains...
    var chains = this._chains;
    if (chains) {
      for(var key in chains) {
        if (!chains.hasOwnProperty(key)) continue;
        chains[key].didChange();
      }
    }

    // and finally tell parent about my path changing...
    if (this._parent) this._parent.chainDidChange(this, this._key, 1);
  };

// get the chains for the current object.  If the current object has 
// chains inherited from the proto they will be cloned and reconfigured for
// the current object.
  function chainsFor(obj) {
    var m   = meta(obj), ret = m.chains;
    if (!ret) {
      ret = m.chains = new ChainNode(null, null, obj);
    } else if (ret.value() !== obj) {
      ret = m.chains = ret.copy(obj);
    }
    return ret ;
  }



  function notifyChains(obj, keyName, methodName) {
    var m = meta(obj, false);
    var nodes = m.chainWatchers;
    if (!nodes || nodes.__Altoproto__ !== obj) return; // nothing to do

    nodes = nodes[keyName];
    if (!nodes) return;

    for(var key in nodes) {
      if (!nodes.hasOwnProperty(key)) continue;
      nodes[key][methodName](obj, keyName);
    }
  }

  function chainsWillChange(obj, keyName) {
    notifyChains(obj, keyName, 'willChange');
  }

  function chainsDidChange(obj, keyName) {
    notifyChains(obj, keyName, 'didChange');
  }

// ..........................................................
// WATCH
// 

  var WATCHED_PROPERTY = Alto.SIMPLE_PROPERTY.watched;

  /**
   @private

   Starts watching a property on an object.  Whenever the property changes,
   invokes Alto.propertyWillChange and Alto.propertyDidChange.  This is the
   primitive used by observers and dependent keys; usually you will never call
   this method directly but instead use higher level methods like
   Alto.addObserver().
   */
  Alto.watch = function(obj, keyName) {

    // can't watch length on Array - it is special...
    if (keyName === 'length' && Alto.typeOf(obj)==='array') return this;

    var m = meta(obj), watching = m.watching, desc;
    keyName = normalizePath(keyName);

    // activate watching first time
    if (!watching[keyName]) {
      watching[keyName] = 1;
      if (isKeyName(keyName)) {
        desc = m.descs[keyName];
        desc = desc ? desc.watched : WATCHED_PROPERTY;
        if (desc) Alto.defineProperty(obj, keyName, desc);
      } else {
        chainsFor(obj).add(keyName);
      }

    }  else {
      watching[keyName] = (watching[keyName]||0)+1;
    }
    return this;
  };

  Alto.isWatching = function(obj, keyName) {
    return !!meta(obj).watching[keyName];
  };

  Alto.watch.flushPending = flushPendingChains;

  /** @private */
  Alto.unwatch = function(obj, keyName) {
    // can't watch length on Array - it is special...
    if (keyName === 'length' && Alto.typeOf(obj)==='array') return this;

    var watching = meta(obj).watching, desc, descs;
    keyName = normalizePath(keyName);
    if (watching[keyName] === 1) {
      watching[keyName] = 0;
      if (isKeyName(keyName)) {
        desc = meta(obj).descs[keyName];
        desc = desc ? desc.unwatched : SIMPLE_PROPERTY;
        if (desc) Alto.defineProperty(obj, keyName, desc);
      } else {
        chainsFor(obj).remove(keyName);
      }

    } else if (watching[keyName]>1) {
      watching[keyName]--;
    }

    return this;
  };

  /**
   @private

   Call on an object when you first beget it from another object.  This will
   setup any chained watchers on the object instance as needed.  This method is
   safe to call multiple times.
   */
  Alto.rewatch = function(obj) {
    var m = meta(obj, false), chains = m.chains, bindings = m.bindings, key, b;

    // make sure the object has its own guid.
    if (GUID_KEY in obj && !obj.hasOwnProperty(GUID_KEY)) {
      Alto.generateGuid(obj, 'Alto');
    }

    // make sure any chained watchers update.
    if (chains && chains.value() !== obj) chainsFor(obj);

    // if the object has bindings then sync them..
    if (bindings && m.proto!==obj) {
      for (key in bindings) {
        b = !DEP_SKIP[key] && obj[key];
        if (b && b instanceof Alto.Binding) b.fromDidChange(obj);
      }
    }

    return this;
  };

// ..........................................................
// PROPERTY CHANGES
// 

  /**
   This function is called just before an object property is about to change.
   It will notify any before observers and prepare caches among other things.

   Normally you will not need to call this method directly but if for some
   reason you can't directly watch a property you can invoke this method
   manually along with `Alto.propertyDidChange()` which you should call just
   after the property value changes.

   @param {Object} obj
   The object with the property that will change

   @param {String} keyName
   The property key (or path) that will change.

   @returns {void}
   */
  Alto.propertyWillChange = function(obj, keyName) {
    var m = meta(obj, false), proto = m.proto, desc = m.descs[keyName];
    if (proto === obj) return ;
    if (desc && desc.willChange) desc.willChange(obj, keyName);
    dependentKeysWillChange(obj, keyName);
    chainsWillChange(obj, keyName);
    Alto.notifyBeforeObservers(obj, keyName);
  };

  /**
   This function is called just after an object property has changed.
   It will notify any observers and clear caches among other things.

   Normally you will not need to call this method directly but if for some
   reason you can't directly watch a property you can invoke this method
   manually along with `Alto.propertyWilLChange()` which you should call just
   before the property value changes.

   @param {Object} obj
   The object with the property that will change

   @param {String} keyName
   The property key (or path) that will change.

   @returns {void}
   */
  Alto.propertyDidChange = function(obj, keyName) {
    var m = meta(obj, false), proto = m.proto, desc = m.descs[keyName];
    if (proto === obj) return ;
    if (desc && desc.didChange) desc.didChange(obj, keyName);
    dependentKeysDidChange(obj, keyName);
    chainsDidChange(obj, keyName);
    Alto.notifyObservers(obj, keyName);
  };

})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
// Alto.Logger
// Alto.watch.flushPending
// Alto.beginPropertyChanges, Alto.endPropertyChanges
// Alto.guidFor

// ..........................................................
// HELPERS
//

  var slice = Array.prototype.slice;

// invokes passed params - normalizing so you can pass target/func,
// target/string or just func
  function invoke(target, method, args, ignore) {

    if (method===undefined) {
      method = target;
      target = undefined;
    }

    if ('string'===typeof method) method = target[method];
    if (args && ignore>0) {
      args = args.length>ignore ? slice.call(args, ignore) : null;
    }
    // IE8's Function.prototype.apply doesn't accept undefined/null arguments.
    return method.apply(target || this, args || []);
  }


// ..........................................................
// RUNLOOP
//

  var timerMark; // used by timers...

  var K = function() {};
  var RunLoop = function(prev) {
    var self;

    if (this instanceof RunLoop) {
      self = this;
    } else {
      self = new K();
    }

    self._prev = prev || null;
    self.onceTimers = {};

    return self;
  };

  K.prototype = RunLoop.prototype;

  RunLoop.prototype = {
    end: function() {
      this.flush();
    },

    prev: function() {
      return this._prev;
    },

    // ..........................................................
    // Delayed Actions
    //

    schedule: function(queueName, target, method) {
      var queues = this._queues, queue;
      if (!queues) queues = this._queues = {};
      queue = queues[queueName];
      if (!queue) queue = queues[queueName] = [];

      var args = arguments.length>3 ? slice.call(arguments, 3) : null;
      queue.push({ target: target, method: method, args: args });
      return this;
    },

    flush: function(queueName) {
      var queues = this._queues, queueNames, idx, len, queue, log;

      if (!queues) return this; // nothing to do

      function iter(item) {
        invoke(item.target, item.method, item.args);
      }

      Alto.watch.flushPending(); // make sure all chained watchers are setup

      if (queueName) {
        while (this._queues && (queue = this._queues[queueName])) {
          this._queues[queueName] = null;

          log = Alto.LOG_BINDINGS && queueName==='sync';
          if (log) Alto.Logger.log('Begin: Flush Sync Queue');

          // the sync phase is to allow property changes to propogate.  don't
          // invoke observers until that is finished.
          if (queueName === 'sync') Alto.beginPropertyChanges();
          queue.forEach(iter);
          if (queueName === 'sync') Alto.endPropertyChanges();

          if (log) Alto.Logger.log('End: Flush Sync Queue');

        }

      } else {
        queueNames = Alto.run.queues;
        len = queueNames.length;
        do {
          this._queues = null;
          for(idx=0;idx<len;idx++) {
            queueName = queueNames[idx];
            queue = queues[queueName];

            log = Alto.LOG_BINDINGS && queueName==='sync';
            if (log) Alto.Logger.log('Begin: Flush Sync Queue');

            if (queueName === 'sync') Alto.beginPropertyChanges();
            if (queue) queue.forEach(iter);
            if (queueName === 'sync') Alto.endPropertyChanges();

            if (log) Alto.Logger.log('End: Flush Sync Queue');

          }

        } while (queues = this._queues); // go until queues stay clean
      }

      timerMark = null;

      return this;
    }

  };

  Alto.RunLoop = RunLoop;

// ..........................................................
// Alto.run - this is ideally the only public API the dev sees
//

  var run;

  /**
   Runs the passed target and method inside of a runloop, ensuring any
   deferred actions including bindings and views updates are flushed at the
   end.

   Normally you should not need to invoke this method yourself.  However if
   you are implementing raw event handlers when interfacing with other
   libraries or plugins, you should probably wrap all of your code inside this
   call.

   @function
   @param {Object} target
   (Optional) target of method to call

   @param {Function|String} method
   Method to invoke.  May be a function or a string.  If you pass a string
   then it will be looked up on the passed target.

   @param {Object...} args
   Any additional arguments you wish to pass to the method.

   @returns {Object} return value from invoking the passed function.
   */
  Alto.run = run = function(target, method) {

    var ret, loop;
    run.begin();
    if (target || method) ret = invoke(target, method, arguments, 2);
    run.end();
    return ret;
  };

  /**
   Begins a new RunLoop.  Any deferred actions invoked after the begin will
   be buffered until you invoke a matching call to Alto.run.end().  This is
   an lower-level way to use a RunLoop instead of using Alto.run().

   @returns {void}
   */
  Alto.run.begin = function() {
    run.currentRunLoop = new RunLoop(run.currentRunLoop);
  };

  /**
   Ends a RunLoop.  This must be called sometime after you call Alto.run.begin()
   to flush any deferred actions.  This is a lower-level way to use a RunLoop
   instead of using Alto.run().

   @returns {void}
   */
  Alto.run.end = function() {
    Alto_assert('must have a current run loop', run.currentRunLoop);
    try {
      run.currentRunLoop.end();
    }
    finally {
      run.currentRunLoop = run.currentRunLoop.prev();
    }
  };

  /**
   Array of named queues.  This array determines the order in which queues
   are flushed at the end of the RunLoop.  You can define your own queues by
   simply adding the queue name to this array.  Normally you should not need
   to inspect or modify this property.

   @property {String}
   */
  Alto.run.queues = ['sync', 'actions', 'destroy', 'timers'];

  /**
   Adds the passed target/method and any optional arguments to the named
   queue to be executed at the end of the RunLoop.  If you have not already
   started a RunLoop when calling this method one will be started for you
   automatically.

   At the end of a RunLoop, any methods scheduled in this way will be invoked.
   Methods will be invoked in an order matching the named queues defined in
   the run.queues property.

   @param {String} queue
   The name of the queue to schedule against.  Default queues are 'sync' and
   'actions'

   @param {Object} target
   (Optional) target object to use as the context when invoking a method.

   @param {String|Function} method
   The method to invoke.  If you pass a string it will be resolved on the
   target object at the time the scheduled item is invoked allowing you to
   change the target function.

   @param {Object} arguments...
   Optional arguments to be passed to the queued method.

   @returns {void}
   */
  Alto.run.schedule = function(queue, target, method) {
    var loop = run.autorun();
    loop.schedule.apply(loop, arguments);
  };

  var autorunTimer;

  function autorun() {
    autorunTimer = null;
    if (run.currentRunLoop) run.end();
  }

  /**
   Begins a new RunLoop if necessary and schedules a timer to flush the
   RunLoop at a later time.  This method is used by parts of Alto to
   ensure the RunLoop always finishes.  You normally do not need to call this
   method directly.  Instead use Alto.run().

   @returns {Alto.RunLoop} the new current RunLoop
   */
  Alto.run.autorun = function() {

    if (!run.currentRunLoop) {
      run.begin();

      // TODO: throw during tests
      if (Alto.testing) {
        run.end();
      } else if (!autorunTimer) {
        autorunTimer = setTimeout(autorun, 1);
      }
    }

    return run.currentRunLoop;
  };

  /**
   Immediately flushes any events scheduled in the 'sync' queue.  Bindings
   use this queue so this method is a useful way to immediately force all
   bindings in the application to sync.

   You should call this method anytime you need any changed state to propogate
   throughout the app immediately without repainting the UI.

   @returns {void}
   */
  Alto.run.sync = function() {
    run.autorun();
    run.currentRunLoop.flush('sync');
  };

// ..........................................................
// TIMERS
//

  var timers = {}; // active timers...

  var laterScheduled = false;
  function invokeLaterTimers() {
    var now = (+ new Date()), earliest = -1;
    for(var key in timers) {
      if (!timers.hasOwnProperty(key)) continue;
      var timer = timers[key];
      if (timer && timer.expires) {
        if (now >= timer.expires) {
          delete timers[key];
          invoke(timer.target, timer.method, timer.args, 2);
        } else {
          if (earliest<0 || (timer.expires < earliest)) earliest=timer.expires;
        }
      }
    }

    // schedule next timeout to fire...
    if (earliest>0) setTimeout(invokeLaterTimers, earliest-(+ new Date()));
  }

  /**
   Invokes the passed target/method and optional arguments after a specified
   period if time.  The last parameter of this method must always be a number
   of milliseconds.

   You should use this method whenever you need to run some action after a
   period of time inside of using setTimeout().  This method will ensure that
   items that expire during the same script execution cycle all execute
   together, which is often more efficient than using a real setTimeout.

   @param {Object} target
   (optional) target of method to invoke

   @param {Function|String} method
   The method to invoke.  If you pass a string it will be resolved on the
   target at the time the method is invoked.

   @param {Object...} args
   Optional arguments to pass to the timeout.

   @param {Number} wait
   Number of milliseconds to wait.

   @returns {Timer} an object you can use to cancel a timer at a later time.
   */
  Alto.run.later = function(target, method) {
    var args, expires, timer, guid, wait;

    // setTimeout compatibility...
    if (arguments.length===2 && 'function' === typeof target) {
      wait   = method;
      method = target;
      target = undefined;
      args   = [target, method];

    } else {
      args = slice.call(arguments);
      wait = args.pop();
    }

    expires = (+ new Date())+wait;
    timer   = { target: target, method: method, expires: expires, args: args };
    guid    = Alto.guidFor(timer);
    timers[guid] = timer;
    run.once(timers, invokeLaterTimers);
    return guid;
  };

  function invokeOnceTimer(guid, onceTimers) {
    if (onceTimers[this.tguid]) delete onceTimers[this.tguid][this.mguid];
    if (timers[guid]) invoke(this.target, this.method, this.args, 2);
    delete timers[guid];
  }

  /**
   Schedules an item to run one time during the current RunLoop.  Calling
   this method with the same target/method combination will have no effect.

   Note that although you can pass optional arguments these will not be
   considered when looking for duplicates.  New arguments will replace previous
   calls.

   @param {Object} target
   (optional) target of method to invoke

   @param {Function|String} method
   The method to invoke.  If you pass a string it will be resolved on the
   target at the time the method is invoked.

   @param {Object...} args
   Optional arguments to pass to the timeout.


   @returns {Object} timer
   */
  Alto.run.once = function(target, method) {
    var tguid = Alto.guidFor(target), mguid = Alto.guidFor(method), guid, timer;

    var onceTimers = run.autorun().onceTimers;
    guid = onceTimers[tguid] && onceTimers[tguid][mguid];
    if (guid && timers[guid]) {
      timers[guid].args = slice.call(arguments); // replace args

    } else {
      timer = {
        target: target,
        method: method,
        args:   slice.call(arguments),
        tguid:  tguid,
        mguid:  mguid
      };

      guid  = Alto.guidFor(timer);
      timers[guid] = timer;
      if (!onceTimers[tguid]) onceTimers[tguid] = {};
      onceTimers[tguid][mguid] = guid; // so it isn't scheduled more than once

      run.schedule('actions', timer, invokeOnceTimer, guid, onceTimers);
    }

    return guid;
  };

  var scheduledNext = false;
  function invokeNextTimers() {
    scheduledNext = null;
    for(var key in timers) {
      if (!timers.hasOwnProperty(key)) continue;
      var timer = timers[key];
      if (timer.next) {
        delete timers[key];
        invoke(timer.target, timer.method, timer.args, 2);
      }
    }
  }

  /**
   Schedules an item to run after control has been returned to the system.
   This is often equivalent to calling setTimeout(function...,1).

   @param {Object} target
   (optional) target of method to invoke

   @param {Function|String} method
   The method to invoke.  If you pass a string it will be resolved on the
   target at the time the method is invoked.

   @param {Object...} args
   Optional arguments to pass to the timeout.

   @returns {Object} timer
   */
  Alto.run.next = function(target, method) {
    var timer, guid;

    timer = {
      target: target,
      method: method,
      args: slice.call(arguments),
      next: true
    };

    guid = Alto.guidFor(timer);
    timers[guid] = timer;

    if (!scheduledNext) scheduledNext = setTimeout(invokeNextTimers, 1);
    return guid;
  };

  /**
   Cancels a scheduled item.  Must be a value returned by `Alto.run.later()`,
   `Alto.run.once()`, or `Alto.run.next()`.

   @param {Object} timer
   Timer object to cancel

   @returns {void}
   */
  Alto.run.cancel = function(timer) {
    delete timers[timer];
  };


// ..........................................................
// DEPRECATED API
//

  /**
   @deprecated
   @method

   Use `#js:Alto.run.begin()` instead
   */
  Alto.RunLoop.begin = Alto.run.begin;

  /**
   @deprecated
   @method

   Use `#js:Alto.run.end()` instead
   */
  Alto.RunLoop.end = Alto.run.end;



})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
// Alto.Logger
// get, getPath, setPath, trySetPath
// guidFor, isArray, meta
// addObserver, removeObserver
// Alto.run.schedule

// ..........................................................
// CONSTANTS
//


  /**
   @static

   Debug parameter you can turn on. This will log all bindings that fire to
   the console. This should be disabled in production code. Note that you
   can also enable this from the console or temporarily.

   @type Boolean
   @default NO
   */
  Alto.LOG_BINDINGS = false || !!Alto.ENV.LOG_BINDINGS;

  /**
   @static

   Performance paramter. This will benchmark the time spent firing each
   binding.

   @type Boolean
   */
  Alto.BENCHMARK_BINDING_NOTIFICATIONS = !!Alto.ENV.BENCHMARK_BINDING_NOTIFICATIONS;

  /**
   @static

   Performance parameter. This will benchmark the time spend configuring each
   binding.

   @type Boolean
   */
  Alto.BENCHMARK_BINDING_SETUP = !!Alto.ENV.BENCHMARK_BINDING_SETUP;


  /**
   @static

   Default placeholder for multiple values in bindings.

   @type String
   @default '@@MULT@@'
   */
  Alto.MULTIPLE_PLACEHOLDER = '@@MULT@@';

  /**
   @static

   Default placeholder for empty values in bindings.  Used by notEmpty()
   helper unless you specify an alternative.

   @type String
   @default '@@EMPTY@@'
   */
  Alto.EMPTY_PLACEHOLDER = '@@EMPTY@@';

// ..........................................................
// TYPE COERCION HELPERS
//

// Coerces a non-array value into an array.
  function MULTIPLE(val) {
    if (val instanceof Array) return val;
    if (val === undefined || val === null) return [];
    return [val];
  }

// Treats a single-element array as the element. Otherwise
// returns a placeholder.
  function SINGLE(val, placeholder) {
    if (val instanceof Array) {
      if (val.length>1) return placeholder;
      else return val[0];
    }
    return val;
  }

// Coerces the binding value into a Boolean.

  var BOOL = {
    to: function (val) {
      return !!val;
    }
  };

// Returns the Boolean inverse of the value.
  var NOT = {
    to: function NOT(val) {
      return !val;
    }
  };

  var get     = Alto.get,
      getPath = Alto.getPath,
      setPath = Alto.setPath,
      guidFor = Alto.guidFor;

// Applies a binding's transformations against a value.
  function getTransformedValue(binding, val, obj, dir) {

    // First run a type transform, if it exists, that changes the fundamental
    // type of the value. For example, some transforms convert an array to a
    // single object.

    var typeTransform = binding._typeTransform;
    if (typeTransform) { val = typeTransform(val, binding._placeholder); }

    // handle transforms
    var transforms = binding._transforms,
        len        = transforms ? transforms.length : 0,
        idx;

    for(idx=0;idx<len;idx++) {
      var transform = transforms[idx][dir];
      if (transform) { val = transform.call(this, val, obj); }
    }
    return val;
  }

  function empty(val) {
    return val===undefined || val===null || val==='' || (Alto.isArray(val) && get(val, 'length')===0) ;
  }

  function getTransformedFromValue(obj, binding) {
    var operation = binding._operation;
    var fromValue = operation ? operation(obj, binding._from, binding._operand) : getPath(obj, binding._from);
    return getTransformedValue(binding, fromValue, obj, 'to');
  }

  function getTransformedToValue(obj, binding) {
    var toValue = getPath(obj, binding._to);
    return getTransformedValue(binding, toValue, obj, 'from');
  }

  var AND_OPERATION = function(obj, left, right) {
    return getPath(obj, left) && getPath(obj, right);
  };

  var OR_OPERATION = function(obj, left, right) {
    return getPath(obj, left) || getPath(obj, right);
  };

// ..........................................................
// BINDING
//

  /**
   @class

       A binding simply connects the properties of two objects so that whenever the
   value of one property changes, the other property will be changed also. You
   do not usually work with Binding objects directly but instead describe
   bindings in your class definition using something like:

   valueBinding: "MyApp.someController.title"

   This will create a binding from `MyApp.someController.title` to the `value`
   property of your object instance automatically. Now the two values will be
   kept in sync.

   ## Customizing Your Bindings

   In addition to synchronizing values, bindings can also perform some basic
   transforms on values. These transforms can help to make sure the data fed
   into one object always meets the expectations of that object regardless of
   what the other object outputs.

   To customize a binding, you can use one of the many helper methods defined
   on Alto.Binding like so:

   valueBinding: Alto.Binding.single("MyApp.someController.title")

   This will create a binding just like the example above, except that now the
   binding will convert the value of `MyApp.someController.title` to a single
   object (removing any arrays) before applying it to the `value` property of
   your object.

   You can also chain helper methods to build custom bindings like so:

   valueBinding: Alto.Binding.single("MyApp.someController.title").notEmpty("(EMPTY)")

   This will force the value of MyApp.someController.title to be a single value
   and then check to see if the value is "empty" (null, undefined, empty array,
   or an empty string). If it is empty, the value will be set to the string
   "(EMPTY)".

   ## One Way Bindings

   One especially useful binding customization you can use is the `oneWay()`
   helper. This helper tells Alto that you are only interested in
   receiving changes on the object you are binding from. For example, if you
   are binding to a preference and you want to be notified if the preference
   has changed, but your object will not be changing the preference itself, you
   could do:

   bigTitlesBinding: Alto.Binding.oneWay("MyApp.preferencesController.bigTitles")

   This way if the value of MyApp.preferencesController.bigTitles changes the
   "bigTitles" property of your object will change also. However, if you
   change the value of your "bigTitles" property, it will not update the
   preferencesController.

   One way bindings are almost twice as fast to setup and twice as fast to
   execute because the binding only has to worry about changes to one side.

   You should consider using one way bindings anytime you have an object that
   may be created frequently and you do not intend to change a property; only
   to monitor it for changes. (such as in the example above).

   ## Adding Custom Transforms

   In addition to using the standard helpers provided by Alto, you can
   also defined your own custom transform functions which will be used to
   convert the value. To do this, just define your transform function and add
   it to the binding with the transform() helper. The following example will
   not allow Integers less than ten. Note that it checks the value of the
   bindings and allows all other values to pass:

   valueBinding: Alto.Binding.transform(function(value, binding) {
          return ((Alto.typeOf(value) === 'number') && (value < 10)) ? 10 : value;
        }).from("MyApp.someController.value")

   If you would like to instead use this transform on a number of bindings,
   you can also optionally add your own helper method to Alto.Binding. This
   method should simply return the value of `this.transform()`. The example
   below adds a new helper called `notLessThan()` which will limit the value to
   be not less than the passed minimum:

   Alto.Binding.reopen({
        notLessThan: function(minValue) {
          return this.transform(function(value, binding) {
            return ((Alto.typeOf(value) === 'number') && (value < minValue)) ? minValue : value;
          });
        }
      });

   You could specify this in your core.js file, for example. Then anywhere in
   your application you can use it to define bindings like so:

   valueBinding: Alto.Binding.from("MyApp.someController.value").notLessThan(10)

   Also, remAlto that helpers are chained so you can use your helper along
   with any other helpers. The example below will create a one way binding that
   does not allow empty values or values less than 10:

   valueBinding: Alto.Binding.oneWay("MyApp.someController.value").notEmpty().notLessThan(10)

   ## How to Manually Adding Binding

   All of the examples above show you how to configure a custom binding, but
   the result of these customizations will be a binding template, not a fully
   active binding. The binding will actually become active only when you
   instantiate the object the binding belongs to. It is useful however, to
   understand what actually happens when the binding is activated.

   For a binding to function it must have at least a "from" property and a "to"
   property. The from property path points to the object/key that you want to
   bind from while the to path points to the object/key you want to bind to.

   When you define a custom binding, you are usually describing the property
   you want to bind from (such as "MyApp.someController.value" in the examples
   above). When your object is created, it will automatically assign the value
   you want to bind "to" based on the name of your binding key. In the
   examples above, during init, Alto objects will effectively call
   something like this on your binding:

   binding = Alto.Binding.from(this.valueBinding).to("value");

   This creates a new binding instance based on the template you provide, and
   sets the to path to the "value" property of the new object. Now that the
   binding is fully configured with a "from" and a "to", it simply needs to be
   connected to become active. This is done through the connect() method:

   binding.connect(this);

   Note that when you connect a binding you pass the object you want it to be
   connected to.  This object will be used as the root for both the from and
   to side of the binding when inspecting relative paths.  This allows the
   binding to be automatically inherited by subclassed objects as well.

   Now that the binding is connected, it will observe both the from and to side
   and relay changes.

   If you ever needed to do so (you almost never will, but it is useful to
   understand this anyway), you could manually create an active binding by
   using the Alto.bind() helper method. (This is the same method used by
   to setup your bindings on objects):

   Alto.bind(MyApp.anotherObject, "value", "MyApp.someController.value");

   Both of these code fragments have the same effect as doing the most friendly
   form of binding creation like so:

   MyApp.anotherObject = Alto.Object.create({
          valueBinding: "MyApp.someController.value",

          // OTHER CODE FOR THIS OBJECT...

        });

   Alto's built in binding creation method makes it easy to automatically
   create bindings for you. You should always use the highest-level APIs
   available, even if you understand how to it works underneath.

   @since Alto 0.9
   */
  var K = function() {};
  var Binding = function(toPath, fromPath) {
    var self;

    if (this instanceof Binding) {
      self = this;
    } else {
      self = new K();
    }

    /** @private */
    self._direction = 'fwd';

    /** @private */
    self._from = fromPath;
    self._to   = toPath;

    return self;
  };

  K.prototype = Binding.prototype;

  Binding.prototype = {
    // ..........................................................
    // CONFIG
    //

    /**
     This will set "from" property path to the specified value. It will not
     attempt to resolve this property path to an actual object until you
     connect the binding.

     The binding will search for the property path starting at the root object
     you pass when you connect() the binding.  It follows the same rules as
     `getPath()` - see that method for more information.

     @param {String} propertyPath the property path to connect to
     @returns {Alto.Binding} receiver
     */
    from: function(path) {
      this._from = path;
      return this;
    },

    /**
     This will set the "to" property path to the specified value. It will not
     attempt to reoslve this property path to an actual object until you
     connect the binding.

     The binding will search for the property path starting at the root object
     you pass when you connect() the binding.  It follows the same rules as
     `getPath()` - see that method for more information.

     @param {String|Tuple} propertyPath A property path or tuple
     @param {Object} [root] Root object to use when resolving the path.
     @returns {Alto.Binding} this
     */
    to: function(path) {
      this._to = path;
      return this;
    },

    /**
     Configures the binding as one way. A one-way binding will relay changes
     on the "from" side to the "to" side, but not the other way around. This
     means that if you change the "to" side directly, the "from" side may have
     a different value.

     @param {Boolean} flag
     (Optional) passing nothing here will make the binding oneWay.  You can
     instead pass NO to disable oneWay, making the binding two way again.

     @returns {Alto.Binding} receiver
     */
    oneWay: function(flag) {
      this._oneWay = flag===undefined ? true : !!flag;
      return this;
    },

    /**
     Adds the specified transform to the array of transform functions.

     A transform is a hash with `to` and `from` properties. Each property
     should be a function that performs a transformation in either the
     forward or back direction.

     The functions you pass must have the following signature:

     function(value) {};

     They must also return the transformed value.

     Transforms are invoked in the order they were added. If you are
     extending a binding and want to reset the transforms, you can call
     `resetTransform()` first.

     @param {Function} transformFunc the transform function.
     @returns {Alto.Binding} this
     */
    transform: function(transform) {
      if ('function' === typeof transform) {
        transform = { to: transform };
      }

      if (!this._transforms) this._transforms = [];
      this._transforms.push(transform);
      return this;
    },

    /**
     Resets the transforms for the binding. After calling this method the
     binding will no longer transform values. You can then add new transforms
     as needed.

     @returns {Alto.Binding} this
     */
    resetTransforms: function() {
      this._transforms = null;
      return this;
    },

    /**
     Adds a transform to the chain that will allow only single values to pass.
     This will allow single values and nulls to pass through. If you pass an
     array, it will be mapped as so:

     - [] => null
     - [a] => a
     - [a,b,c] => Multiple Placeholder

     You can pass in an optional multiple placeholder or it will use the
     default.

     Note that this transform will only happen on forwarded valued. Reverse
     values are send unchanged.

     @param {String} fromPath from path or null
     @param {Object} [placeholder] Placeholder value.
     @returns {Alto.Binding} this
     */
    single: function(placeholder) {
      if (placeholder===undefined) placeholder = Alto.MULTIPLE_PLACEHOLDER;
      this._typeTransform = SINGLE;
      this._placeholder = placeholder;
      return this;
    },

    /**
     Adds a transform that will convert the passed value to an array. If
     the value is null or undefined, it will be converted to an empty array.

     @param {String} [fromPath]
     @returns {Alto.Binding} this
     */
    multiple: function() {
      this._typeTransform = MULTIPLE;
      this._placeholder = null;
      return this;
    },

    /**
     Adds a transform to convert the value to a bool value. If the value is
     an array it will return YES if array is not empty. If the value is a
     string it will return YES if the string is not empty.

     @returns {Alto.Binding} this
     */
    bool: function() {
      this.transform(BOOL);
      return this;
    },

    /**
     Adds a transform that will return the placeholder value if the value is
     null, undefined, an empty array or an empty string. See also notNull().

     @param {Object} [placeholder] Placeholder value.
     @returns {Alto.Binding} this
     */
    notEmpty: function(placeholder) {
      // Display warning for users using the SproutCore 1.x-style API.
      Alto_assert("notEmpty should only take a placeholder as a parameter. You no longer need to pass null as the first parameter.", arguments.length < 2);

      if (placeholder == undefined) { placeholder = Alto.EMPTY_PLACEHOLDER; }

      this.transform({
        to: function(val) { return empty(val) ? placeholder : val; }
      });

      return this;
    },

    /**
     Adds a transform that will return the placeholder value if the value is
     null or undefined. Otherwise it will passthrough untouched. See also notEmpty().

     @param {String} fromPath from path or null
     @param {Object} [placeholder] Placeholder value.
     @returns {Alto.Binding} this
     */
    notNull: function(placeholder) {
      if (placeholder == undefined) { placeholder = Alto.EMPTY_PLACEHOLDER; }

      this.transform({
        to: function(val) { return val == null ? placeholder : val; }
      });

      return this;
    },

    /**
     Adds a transform to convert the value to the inverse of a bool value. This
     uses the same transform as bool() but inverts it.

     @returns {Alto.Binding} this
     */
    not: function() {
      this.transform(NOT);
      return this;
    },

    /**
     Adds a transform that will return YES if the value is null or undefined, NO otherwise.

     @returns {Alto.Binding} this
     */
    isNull: function() {
      this.transform(function(val) { return val == null; });
      return this;
    },

    /** @private */
    toString: function() {
      var oneWay = this._oneWay ? '[oneWay]' : '';
      return "Alto.Binding<" + guidFor(this) + ">(" + this._from + " -> " + this._to + ")" + oneWay;
    },

    // ..........................................................
    // CONNECT AND SYNC
    //

    /**
     Attempts to connect this binding instance so that it can receive and relay
     changes. This method will raise an exception if you have not set the
     from/to properties yet.

     @param {Object} obj
     The root object for this binding.

     @param {Boolean} preferFromParam
     private: Normally, `connect` cannot take an object if `from` already set
     an object. Internally, we would like to be able to provide a default object
     to be used if no object was provided via `from`, so this parameter turns
     off the assertion.

     @returns {Alto.Binding} this
     */
    connect: function(obj) {
      Alto_assert('Must pass a valid object to Alto.Binding.connect()', !!obj);

      var oneWay = this._oneWay, operand = this._operand;

      // add an observer on the object to be notified when the binding should be updated
      Alto.addObserver(obj, this._from, this, this.fromDidChange);

      // if there is an operand, add an observer onto it as well
      if (operand) { Alto.addObserver(obj, operand, this, this.fromDidChange); }

      // if the binding is a two-way binding, also set up an observer on the target
      // object.
      if (!oneWay) { Alto.addObserver(obj, this._to, this, this.toDidChange); }

      if (Alto.meta(obj,false).proto !== obj) { this._scheduleSync(obj, 'fwd'); }

      this._readyToSync = true;
      return this;
    },

    /**
     Disconnects the binding instance. Changes will no longer be relayed. You
     will not usually need to call this method.

     @param {Object} obj
     The root object you passed when connecting the binding.

     @returns {Alto.Binding} this
     */
    disconnect: function(obj) {
      Alto_assert('Must pass a valid object to Alto.Binding.disconnect()', !!obj);

      var oneWay = this._oneWay, operand = this._operand;

      // remove an observer on the object so we're no longer notified of
      // changes that should update bindings.
      Alto.removeObserver(obj, this._from, this, this.fromDidChange);

      // if there is an operand, remove the observer from it as well
      if (operand) Alto.removeObserver(obj, operand, this, this.fromDidChange);

      // if the binding is two-way, remove the observer from the target as well
      if (!oneWay) Alto.removeObserver(obj, this._to, this, this.toDidChange);

      this._readyToSync = false; // disable scheduled syncs...
      return this;
    },

    // ..........................................................
    // PRIVATE
    //

    /** @private - called when the from side changes */
    fromDidChange: function(target) {
      this._scheduleSync(target, 'fwd');
    },

    /** @private - called when the to side changes */
    toDidChange: function(target) {
      this._scheduleSync(target, 'back');
    },

    /** @private */
    _scheduleSync: function(obj, dir) {
      var guid = guidFor(obj), existingDir = this[guid];

      // if we haven't scheduled the binding yet, schedule it
      if (!existingDir) {
        Alto.run.schedule('sync', this, this._sync, obj);
        this[guid] = dir;
      }

      // If both a 'back' and 'fwd' sync have been scheduled on the same object,
      // default to a 'fwd' sync so that it remains deterministic.
      if (existingDir === 'back' && dir === 'fwd') {
        this[guid] = 'fwd';
      }
    },

    /** @private */
    _sync: function(obj) {
      var log = Alto.LOG_BINDINGS;

      // don't synchronize destroyed objects or disconnected bindings
      if (obj.isDestroyed || !this._readyToSync) { return; }

      // get the direction of the binding for the object we are
      // synchronizing from
      var guid = guidFor(obj), direction = this[guid], val, transformedValue;

      var fromPath = this._from, toPath = this._to;

      delete this[guid];

      // apply any operations to the object, then apply transforms
      var fromValue = getTransformedFromValue(obj, this);
      var toValue   = getTransformedToValue(obj, this);

      if (toValue === fromValue) { return; }

      // if we're synchronizing from the remote object...
      if (direction === 'fwd') {
        if (log) { Alto.Logger.log(' ', this.toString(), val, '->', fromValue, obj); }
        Alto.trySetPath(obj, toPath, fromValue);

        // if we're synchronizing *to* the remote object
      } else if (direction === 'back') {// && !this._oneWay) {
        if (log) { Alto.Logger.log(' ', this.toString(), val, '<-', fromValue, obj); }
        Alto.trySetPath(obj, fromPath, toValue);
      }
    }

  };

  function mixinProperties(to, from) {
    for (var key in from) {
      if (from.hasOwnProperty(key)) {
        to[key] = from[key];
      }
    }
  }

  mixinProperties(Binding, {

    /**
     @see Alto.Binding.prototype.from
     */
    from: function() {
      var C = this, binding = new C();
      return binding.from.apply(binding, arguments);
    },

    /**
     @see Alto.Binding.prototype.to
     */
    to: function() {
      var C = this, binding = new C();
      return binding.to.apply(binding, arguments);
    },

    /**
     @see Alto.Binding.prototype.oneWay
     */
    oneWay: function(from, flag) {
      var C = this, binding = new C(null, from);
      return binding.oneWay(flag);
    },

    /**
     @see Alto.Binding.prototype.single
     */
    single: function(from) {
      var C = this, binding = new C(null, from);
      return binding.single();
    },

    /**
     @see Alto.Binding.prototype.multiple
     */
    multiple: function(from) {
      var C = this, binding = new C(null, from);
      return binding.multiple();
    },

    /**
     @see Alto.Binding.prototype.transform
     */
    transform: function(func) {
      var C = this, binding = new C();
      return binding.transform(func);
    },

    /**
     @see Alto.Binding.prototype.notEmpty
     */
    notEmpty: function(from, placeholder) {
      var C = this, binding = new C(null, from);
      return binding.notEmpty(placeholder);
    },

    /**
     @see Alto.Binding.prototype.bool
     */
    bool: function(from) {
      var C = this, binding = new C(null, from);
      return binding.bool();
    },

    /**
     @see Alto.Binding.prototype.not
     */
    not: function(from) {
      var C = this, binding = new C(null, from);
      return binding.not();
    },

    /**
     Adds a transform that forwards the logical 'AND' of values at 'pathA' and
     'pathB' whenever either source changes. Note that the transform acts
     strictly as a one-way binding, working only in the direction

     'pathA' AND 'pathB' --> value  (value returned is the result of ('pathA' && 'pathB'))

     Usage example where a delete button's `isEnabled` value is determined by
     whether something is selected in a list and whether the current user is
     allowed to delete:

     deleteButton: Alto.ButtonView.design({
          isEnabledBinding: Alto.Binding.and('MyApp.itemsController.hasSelection', 'MyApp.userController.canDelete')
        })

     @param {String} pathA The first part of the conditional
     @param {String} pathB The second part of the conditional
     */
    and: function(pathA, pathB) {
      var C = this, binding = new C(null, pathA).oneWay();
      binding._operand = pathB;
      binding._operation = AND_OPERATION;
      return binding;
    },

    /**
     Adds a transform that forwards the 'OR' of values at 'pathA' and
     'pathB' whenever either source changes. Note that the transform acts
     strictly as a one-way binding, working only in the direction

     'pathA' AND 'pathB' --> value  (value returned is the result of ('pathA' || 'pathB'))

     @param {String} pathA The first part of the conditional
     @param {String} pathB The second part of the conditional
     */
    or: function(pathA, pathB) {
      var C = this, binding = new C(null, pathA).oneWay();
      binding._operand = pathB;
      binding._operation = OR_OPERATION;
      return binding;
    }

  });

  Alto.Binding = Binding;

  /**
   Global helper method to create a new binding.  Just pass the root object
   along with a to and from path to create and connect the binding.  The new
   binding object will be returned which you can further configure with
   transforms and other conditions.

   @param {Object} obj
   The root object of the transform.

   @param {String} to
   The path to the 'to' side of the binding.  Must be relative to obj.

   @param {String} from
   The path to the 'from' side of the binding.  Must be relative to obj or
   a global path.

   @returns {Alto.Binding} binding instance
   */
  Alto.bind = function(obj, to, from) {
    return new Alto.Binding(to, from).connect(obj);
  };

  Alto.oneWay = function(obj, to, from) {
    return new Alto.Binding(to, from).oneWay().connect(obj);
  };

})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
  var meta = Alto.meta;
  var guidFor = Alto.guidFor;
  var USE_ACCESSORS = Alto.USE_ACCESSORS;
  var a_slice = Array.prototype.slice;
  var o_create = Alto.platform.create;
  var o_defineProperty = Alto.platform.defineProperty;

// ..........................................................
// DEPENDENT KEYS
// 

// data structure:
//  meta.deps = { 
//   'depKey': { 
//     'keyName': count,
//     __Altoproto__: SRC_OBJ [to detect clones]
//     },
//   __Altoproto__: SRC_OBJ
//  }

  function uniqDeps(obj, depKey) {
    var m = meta(obj), deps, ret;
    deps = m.deps;
    if (!deps) {
      deps = m.deps = { __Altoproto__: obj };
    } else if (deps.__Altoproto__ !== obj) {
      deps = m.deps = o_create(deps);
      deps.__Altoproto__ = obj;
    }

    ret = deps[depKey];
    if (!ret) {
      ret = deps[depKey] = { __Altoproto__: obj };
    } else if (ret.__Altoproto__ !== obj) {
      ret = deps[depKey] = o_create(ret);
      ret.__Altoproto__ = obj;
    }

    return ret;
  }

  function addDependentKey(obj, keyName, depKey) {
    var deps = uniqDeps(obj, depKey);
    deps[keyName] = (deps[keyName] || 0) + 1;
    Alto.watch(obj, depKey);
  }

  function removeDependentKey(obj, keyName, depKey) {
    var deps = uniqDeps(obj, depKey);
    deps[keyName] = (deps[keyName] || 0) - 1;
    Alto.unwatch(obj, depKey);
  }

  function addDependentKeys(desc, obj, keyName) {
    var keys = desc._dependentKeys,
        len  = keys ? keys.length : 0;
    for(var idx=0;idx<len;idx++) addDependentKey(obj, keyName, keys[idx]);
  }

// ..........................................................
// COMPUTED PROPERTY
//

  function ComputedProperty(func, opts) {
    this.func = func;
    this._cacheable = opts && opts.cacheable;
    this._dependentKeys = opts && opts.dependentKeys;
  }

  Alto.ComputedProperty = ComputedProperty;
  ComputedProperty.prototype = new Alto.Descriptor();

  var CP_DESC = {
    configurable: true,
    enumerable:   true,
    get: function() { return undefined; }, // for when use_accessors is false.
    set: Alto.Descriptor.MUST_USE_SETTER  // for when use_accessors is false
  };

  function mkCpGetter(keyName, desc) {
    var cacheable = desc._cacheable,
        func     = desc.func;

    if (cacheable) {
      return function() {
        var ret, cache = meta(this).cache;
        if (keyName in cache) return cache[keyName];
        ret = cache[keyName] = func.call(this, keyName);
        return ret ;
      };
    } else {
      return function() {
        return func.call(this, keyName);
      };
    }
  }

  function mkCpSetter(keyName, desc) {
    var cacheable = desc._cacheable,
        func      = desc.func;

    return function(value) {
      var m = meta(this, cacheable),
          watched = (m.source===this) && m.watching[keyName]>0,
          ret, oldSuspended, lastSetValues;

      oldSuspended = desc._suspended;
      desc._suspended = this;

      watched = watched && m.lastSetValues[keyName]!==guidFor(value);
      if (watched) {
        m.lastSetValues[keyName] = guidFor(value);
        Alto.propertyWillChange(this, keyName);
      }

      if (cacheable) delete m.cache[keyName];
      ret = func.call(this, keyName, value);
      if (cacheable) m.cache[keyName] = ret;
      if (watched) Alto.propertyDidChange(this, keyName);
      desc._suspended = oldSuspended;
      return ret;
    };
  }

  var Cp = ComputedProperty.prototype;

  /**
   Call on a computed property to set it into cacheable mode.  When in this
   mode the computed property will automatically cache the return value of
   your function until one of the dependent keys changes.

   @param {Boolean} aFlag optional set to false to disable cacheing
   @returns {Alto.ComputedProperty} receiver
   */
  Cp.cacheable = function(aFlag) {
    this._cacheable = aFlag!==false;
    return this;
  };

  /**
   Sets the dependent keys on this computed property.  Pass any number of
   arguments containing key paths that this computed property depends on.

   @param {String} path... zero or more property paths
   @returns {Alto.ComputedProperty} receiver
   */
  Cp.property = function() {
    this._dependentKeys = a_slice.call(arguments);
    return this;
  };

  /** @private - impl descriptor API */
  Cp.setup = function(obj, keyName, value) {
    CP_DESC.get = mkCpGetter(keyName, this);
    CP_DESC.set = mkCpSetter(keyName, this);
    o_defineProperty(obj, keyName, CP_DESC);
    CP_DESC.get = CP_DESC.set = null;
    addDependentKeys(this, obj, keyName);
  };

  /** @private - impl descriptor API */
  Cp.teardown = function(obj, keyName) {
    var keys = this._dependentKeys,
        len  = keys ? keys.length : 0;
    for(var idx=0;idx<len;idx++) removeDependentKey(obj, keyName, keys[idx]);

    if (this._cacheable) delete meta(obj).cache[keyName];

    return null; // no value to restore
  };

  /** @private - impl descriptor API */
  Cp.didChange = function(obj, keyName) {
    if (this._cacheable && (this._suspended !== obj)) {
      delete meta(obj).cache[keyName];
    }
  };

  /** @private - impl descriptor API */
  Cp.get = function(obj, keyName) {
    var ret, cache;

    if (this._cacheable) {
      cache = meta(obj).cache;
      if (keyName in cache) return cache[keyName];
      ret = cache[keyName] = this.func.call(obj, keyName);
    } else {
      ret = this.func.call(obj, keyName);
    }
    return ret ;
  };

  /** @private - impl descriptor API */
  Cp.set = function(obj, keyName, value) {
    var cacheable = this._cacheable;

    var m = meta(obj, cacheable),
        watched = (m.source===obj) && m.watching[keyName]>0,
        ret, oldSuspended, lastSetValues;

    oldSuspended = this._suspended;
    this._suspended = obj;

    watched = watched && m.lastSetValues[keyName]!==guidFor(value);
    if (watched) {
      m.lastSetValues[keyName] = guidFor(value);
      Alto.propertyWillChange(obj, keyName);
    }

    if (cacheable) delete m.cache[keyName];
    ret = this.func.call(obj, keyName, value);
    if (cacheable) m.cache[keyName] = ret;
    if (watched) Alto.propertyDidChange(obj, keyName);
    this._suspended = oldSuspended;
    return ret;
  };

  Cp.val = function(obj, keyName) {
    return meta(obj, false).values[keyName];
  };

  if (!Alto.platform.hasPropertyAccessors) {
    Cp.setup = function(obj, keyName, value) {
      obj[keyName] = undefined; // so it shows up in key iteration
      addDependentKeys(this, obj, keyName);
    };

  } else if (!USE_ACCESSORS) {
    Cp.setup = function(obj, keyName) {
      // throw exception if not using Alto.get() and Alto.set() when supported
      o_defineProperty(obj, keyName, CP_DESC);
      addDependentKeys(this, obj, keyName);
    };
  }

  /**
   This helper returns a new property descriptor that wraps the passed
   computed property function.  You can use this helper to define properties
   with mixins or via Alto.defineProperty().

   The function you pass will be used to both get and set property values.
   The function should accept two parameters, key and value.  If value is not
   undefined you should set the value first.  In either case return the
   current value of the property.

   @param {Function} func
   The computed property function.

   @returns {Alto.ComputedProperty} property descriptor instance
   */
  Alto.computed = function(func) {
    return new ComputedProperty(func);
  };

})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  /*globals Alto_assert */
  var o_create = Alto.platform.create;
  var meta = Alto.meta;
  var guidFor = Alto.guidFor;
  var array_Slice = Array.prototype.slice;

  /**
   The event system uses a series of nested hashes to store listeners on an
   object. When a listener is registered, or when an event arrives, these
   hashes are consulted to determine which target and action pair to invoke.

   The hashes are stored in the object's meta hash, and look like this:

   // Object's meta hash
   {
        listeners: {               // variable name: `listenerSet`
          "foo:changed": {         // variable name: `targetSet`
            [targetGuid]: {        // variable name: `actionSet`
              [methodGuid]: {      // variable name: `action`
                target: [Object object],
                method: [Function function],
                xform: [Function function]
              }
            }
          }
        }
      }

   */

  var metaPath = Alto.metaPath;

// Gets the set of all actions, keyed on the guid of each action's
// method property.
  function actionSetFor(obj, eventName, target, writable) {
    var targetGuid = guidFor(target);
    return metaPath(obj, ['listeners', eventName, targetGuid], writable);
  }

// Gets the set of all targets, keyed on the guid of each action's
// target property.
  function targetSetFor(obj, eventName) {
    var listenerSet = meta(obj, false).listeners;
    if (!listenerSet) { return false; }

    return listenerSet[eventName] || false;
  }

// TODO: This knowledge should really be a part of the
// meta system.
  var SKIP_PROPERTIES = { __Alto_source__: true };

// For a given target, invokes all of the methods that have
// been registered as a listener.
  function invokeEvents(targetSet, params) {
    // Iterate through all elements of the target set
    for(var targetGuid in targetSet) {
      if (SKIP_PROPERTIES[targetGuid]) { continue; }

      var actionSet = targetSet[targetGuid];

      // Iterate through the elements of the action set
      for(var methodGuid in actionSet) {
        if (SKIP_PROPERTIES[methodGuid]) { continue; }

        var action = actionSet[methodGuid];
        if (!action) { continue; }

        // Extract target and method for each action
        var method = action.method;
        var target = action.target;

        // If there is no target, the target is the object
        // on which the event was fired.
        if (!target) { target = params[0]; }
        if ('string' === typeof method) { method = target[method]; }

        // Listeners can provide an `xform` function, which can perform
        // arbitrary transformations, such as changing the order of
        // parameters.
        //
        // This is primarily used by Alto-runtime's observer system, which
        // provides a higher level abstraction on top of events, including
        // dynamically looking up current values and passing them into the
        // registered listener.
        var xform = action.xform;

        if (xform) {
          xform(target, method, params);
        } else {
          method.apply(target, params);
        }
      }
    }
  }

  /**
   The parameters passed to an event listener are not exactly the
   parameters passed to an observer. if you pass an xform function, it will
   be invoked and is able to translate event listener parameters into the form
   that observers are expecting.
   */
  function addListener(obj, eventName, target, method, xform) {
    Alto_assert("You must pass at least an object and event name to Alto.addListener", !!obj && !!eventName);

    if (!method && 'function' === typeof target) {
      method = target;
      target = null;
    }

    var actionSet = actionSetFor(obj, eventName, target, true),
        methodGuid = guidFor(method), ret;

    if (!actionSet[methodGuid]) {
      actionSet[methodGuid] = { target: target, method: method, xform: xform };
    } else {
      actionSet[methodGuid].xform = xform; // used by observers etc to map params
    }

    if ('function' === typeof obj.didAddListener) {
      obj.didAddListener(eventName, target, method);
    }

    return ret; // return true if this is the first listener.
  }

  function removeListener(obj, eventName, target, method) {
    if (!method && 'function'===typeof target) {
      method = target;
      target = null;
    }

    var actionSet = actionSetFor(obj, eventName, target, true),
        methodGuid = guidFor(method);

    // we can't simply delete this parameter, because if we do, we might
    // re-expose the property from the prototype chain.
    if (actionSet && actionSet[methodGuid]) { actionSet[methodGuid] = null; }

    if (obj && 'function'===typeof obj.didRemoveListener) {
      obj.didRemoveListener(eventName, target, method);
    }
  }

// returns a list of currently watched events
  function watchedEvents(obj) {
    var listeners = meta(obj, false).listeners, ret = [];

    if (listeners) {
      for(var eventName in listeners) {
        if (!SKIP_PROPERTIES[eventName] && listeners[eventName]) {
          ret.push(eventName);
        }
      }
    }
    return ret;
  }

  function sendEvent(obj, eventName) {
    Alto_assert("You must pass an object and event name to Alto.sendEvent", !!obj && !!eventName);

    // first give object a chance to handle it
    if (obj !== Alto && 'function' === typeof obj.sendEvent) {
      obj.sendEvent.apply(obj, array_Slice.call(arguments, 1));
    }

    var targetSet = targetSetFor(obj, eventName);
    if (!targetSet) { return false; }

    invokeEvents(targetSet, arguments);
    return true;
  }

  function hasListeners(obj, eventName) {
    var targetSet = targetSetFor(obj, eventName);
    if (!targetSet) { return false; }

    for(var targetGuid in targetSet) {
      if (SKIP_PROPERTIES[targetGuid] || !targetSet[targetGuid]) { continue; }

      var actionSet = targetSet[targetGuid];

      for(var methodGuid in actionSet) {
        if (SKIP_PROPERTIES[methodGuid] || !actionSet[methodGuid]) { continue; }
        return true; // stop as soon as we find a valid listener
      }
    }

    // no listeners!  might as well clean this up so it is faster later.
    var set = metaPath(obj, ['listeners'], true);
    set[eventName] = null;

    return false;
  }

  function listenersFor(obj, eventName) {
    var targetSet = targetSetFor(obj, eventName), ret = [];
    if (!targetSet) { return ret; }

    var info;
    for(var targetGuid in targetSet) {
      if (SKIP_PROPERTIES[targetGuid] || !targetSet[targetGuid]) { continue; }

      var actionSet = targetSet[targetGuid];

      for(var methodGuid in actionSet) {
        if (SKIP_PROPERTIES[methodGuid] || !actionSet[methodGuid]) { continue; }
        info = actionSet[methodGuid];
        ret.push([info.target, info.method]);
      }
    }

    return ret;
  }

  Alto.addListener = addListener;
  Alto.removeListener = removeListener;
  Alto.sendEvent = sendEvent;
  Alto.hasListeners = hasListeners;
  Alto.watchedEvents = watchedEvents;
  Alto.listenersFor = listenersFor;

})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
  var Mixin, MixinDelegate, REQUIRED, Alias;
  var classToString, superClassString;

  var a_map = Array.prototype.map;
  var EMPTY_META = {}; // dummy for non-writable meta
  var META_SKIP = { __Altoproto__: true, __Alto_count__: true };

  var o_create = Alto.platform.create;

  function meta(obj, writable) {
    var m = Alto.meta(obj, writable!==false), ret = m.mixins;
    if (writable===false) return ret || EMPTY_META;

    if (!ret) {
      ret = m.mixins = { __Altoproto__: obj };
    } else if (ret.__Altoproto__ !== obj) {
      ret = m.mixins = o_create(ret);
      ret.__Altoproto__ = obj;
    }
    return ret;
  }

  function initMixin(mixin, args) {
    if (args && args.length > 0) {
      mixin.mixins = a_map.call(args, function(x) {
        if (x instanceof Mixin) return x;

        // Note: Manually setup a primitive mixin here.  This is the only
        // way to actually get a primitive mixin.  This way normal creation
        // of mixins will give you combined mixins...
        var mixin = new Mixin();
        mixin.properties = x;
        return mixin;
      });
    }
    return mixin;
  }

  var NATIVES = [Boolean, Object, Number, Array, Date, String];
  function isMethod(obj) {
    if ('function' !== typeof obj || obj.isMethod===false) return false;
    return NATIVES.indexOf(obj)<0;
  }

  function mergeMixins(mixins, m, descs, values, base) {
    var len = mixins.length, idx, mixin, guid, props, value, key, ovalue, concats;

    function removeKeys(keyName) {
      delete descs[keyName];
      delete values[keyName];
    }

    for(idx=0;idx<len;idx++) {

      mixin = mixins[idx];
      if (!mixin) throw new Error('Null value found in Alto.mixin()');

      if (mixin instanceof Mixin) {
        guid = Alto.guidFor(mixin);
        if (m[guid]) continue;
        m[guid] = mixin;
        props = mixin.properties;
      } else {
        props = mixin; // apply anonymous mixin properties
      }

      if (props) {

        // reset before adding each new mixin to pickup concats from previous
        concats = values.concatenatedProperties || base.concatenatedProperties;
        if (props.concatenatedProperties) {
          concats = concats ? concats.concat(props.concatenatedProperties) : props.concatenatedProperties;
        }

        for (key in props) {
          if (!props.hasOwnProperty(key)) continue;
          value = props[key];
          if (value instanceof Alto.Descriptor) {
            if (value === REQUIRED && descs[key]) { continue; }

            descs[key]  = value;
            values[key] = undefined;
          } else {

            // impl super if needed...
            if (isMethod(value)) {
              ovalue = (descs[key] === Alto.SIMPLE_PROPERTY) && values[key];
              if (!ovalue) ovalue = base[key];
              if ('function' !== typeof ovalue) ovalue = null;
              if (ovalue) {
                var o = value.__Alto_observes__, ob = value.__Alto_observesBefore__;
                value = Alto.wrap(value, ovalue);
                value.__Alto_observes__ = o;
                value.__Alto_observesBefore__ = ob;
              }
            } else if ((concats && concats.indexOf(key)>=0) || key === 'concatenatedProperties') {
              var baseValue = values[key] || base[key];
              value = baseValue ? baseValue.concat(value) : Alto.makeArray(value);
            }

            descs[key]  = Alto.SIMPLE_PROPERTY;
            values[key] = value;
          }
        }

        // manually copy toString() because some JS engines do not enumerate it
        if (props.hasOwnProperty('toString')) {
          base.toString = props.toString;
        }

      } else if (mixin.mixins) {
        mergeMixins(mixin.mixins, m, descs, values, base);
        if (mixin._without) mixin._without.forEach(removeKeys);
      }
    }
  }

  var defineProperty = Alto.defineProperty;

  function writableReq(obj) {
    var m = Alto.meta(obj), req = m.required;
    if (!req || (req.__Altoproto__ !== obj)) {
      req = m.required = req ? o_create(req) : { __Alto_count__: 0 };
      req.__Altoproto__ = obj;
    }
    return req;
  }

  function getObserverPaths(value) {
    return ('function' === typeof value) && value.__Alto_observes__;
  }

  function getBeforeObserverPaths(value) {
    return ('function' === typeof value) && value.__Alto_observesBefore__;
  }

  Alto._mixinBindings = function(obj, key, value, m) {
    return value;
  };

  function applyMixin(obj, mixins, partial) {
    var descs = {}, values = {}, m = Alto.meta(obj), req = m.required;
    var key, willApply, didApply, value, desc;

    var mixinBindings = Alto._mixinBindings;

    mergeMixins(mixins, meta(obj), descs, values, obj);

    if (MixinDelegate.detect(obj)) {
      willApply = values.willApplyProperty || obj.willApplyProperty;
      didApply  = values.didApplyProperty || obj.didApplyProperty;
    }

    for(key in descs) {
      if (!descs.hasOwnProperty(key)) continue;

      desc = descs[key];
      value = values[key];

      if (desc === REQUIRED) {
        if (!(key in obj)) {
          if (!partial) throw new Error('Required property not defined: '+key);

          // for partial applies add to hash of required keys
          req = writableReq(obj);
          req.__Alto_count__++;
          req[key] = true;
        }

      } else {

        while (desc instanceof Alias) {

          var altKey = desc.methodName;
          if (descs[altKey]) {
            value = values[altKey];
            desc  = descs[altKey];
          } else if (m.descs[altKey]) {
            desc  = m.descs[altKey];
            value = desc.val(obj, altKey);
          } else {
            value = obj[altKey];
            desc  = Alto.SIMPLE_PROPERTY;
          }
        }

        if (willApply) willApply.call(obj, key);

        var observerPaths = getObserverPaths(value),
            curObserverPaths = observerPaths && getObserverPaths(obj[key]),
            beforeObserverPaths = getBeforeObserverPaths(value),
            curBeforeObserverPaths = beforeObserverPaths && getBeforeObserverPaths(obj[key]),
            len, idx;

        if (curObserverPaths) {
          len = curObserverPaths.length;
          for(idx=0;idx<len;idx++) {
            Alto.removeObserver(obj, curObserverPaths[idx], null, key);
          }
        }

        if (curBeforeObserverPaths) {
          len = curBeforeObserverPaths.length;
          for(idx=0;idx<len;idx++) {
            Alto.removeBeforeObserver(obj, curBeforeObserverPaths[idx], null,key);
          }
        }

        // TODO: less hacky way for Alto-runtime to add bindings.
        value = mixinBindings(obj, key, value, m);

        defineProperty(obj, key, desc, value);

        if (observerPaths) {
          len = observerPaths.length;
          for(idx=0;idx<len;idx++) {
            Alto.addObserver(obj, observerPaths[idx], null, key);
          }
        }

        if (beforeObserverPaths) {
          len = beforeObserverPaths.length;
          for(idx=0;idx<len;idx++) {
            Alto.addBeforeObserver(obj, beforeObserverPaths[idx], null, key);
          }
        }

        if (req && req[key]) {
          req = writableReq(obj);
          req.__Alto_count__--;
          req[key] = false;
        }

        if (didApply) didApply.call(obj, key);

      }
    }

    // Make sure no required attrs remain
    if (!partial && req && req.__Alto_count__>0) {
      var keys = [];
      for(key in req) {
        if (META_SKIP[key]) continue;
        keys.push(key);
      }
      throw new Error('Required properties not defined: '+keys.join(','));
    }
    return obj;
  }

  Alto.mixin = function(obj) {
    var args = Array.prototype.slice.call(arguments, 1);
    return applyMixin(obj, args, false);
  };


  Mixin = function() { return initMixin(this, arguments); };

  Mixin._apply = applyMixin;

  Mixin.applyPartial = function(obj) {
    var args = Array.prototype.slice.call(arguments, 1);
    return applyMixin(obj, args, true);
  };

  Mixin.create = function() {
    classToString.processed = false;
    var M = this;
    return initMixin(new M(), arguments);
  };

  Mixin.prototype.reopen = function() {

    var mixin, tmp;

    if (this.properties) {
      mixin = Mixin.create();
      mixin.properties = this.properties;
      delete this.properties;
      this.mixins = [mixin];
    }

    var len = arguments.length, mixins = this.mixins, idx;

    for(idx=0;idx<len;idx++) {
      mixin = arguments[idx];
      if (mixin instanceof Mixin) {
        mixins.push(mixin);
      } else {
        tmp = Mixin.create();
        tmp.properties = mixin;
        mixins.push(tmp);
      }
    }

    return this;
  };

  var TMP_ARRAY = [];
  Mixin.prototype.apply = function(obj) {
    TMP_ARRAY.length=0;
    TMP_ARRAY[0] = this;
    return applyMixin(obj, TMP_ARRAY, false);
  };

  Mixin.prototype.applyPartial = function(obj) {
    TMP_ARRAY.length=0;
    TMP_ARRAY[0] = this;
    return applyMixin(obj, TMP_ARRAY, true);
  };

  function _detect(curMixin, targetMixin, seen) {
    var guid = Alto.guidFor(curMixin);

    if (seen[guid]) return false;
    seen[guid] = true;

    if (curMixin === targetMixin) return true;
    var mixins = curMixin.mixins, loc = mixins ? mixins.length : 0;
    while(--loc >= 0) {
      if (_detect(mixins[loc], targetMixin, seen)) return true;
    }
    return false;
  }

  Mixin.prototype.detect = function(obj) {
    if (!obj) return false;
    if (obj instanceof Mixin) return _detect(obj, this, {});
    return !!meta(obj, false)[Alto.guidFor(this)];
  };

  Mixin.prototype.without = function() {
    var ret = new Mixin(this);
    ret._without = Array.prototype.slice.call(arguments);
    return ret;
  };

  function _keys(ret, mixin, seen) {
    if (seen[Alto.guidFor(mixin)]) return;
    seen[Alto.guidFor(mixin)] = true;

    if (mixin.properties) {
      var props = mixin.properties;
      for(var key in props) {
        if (props.hasOwnProperty(key)) ret[key] = true;
      }
    } else if (mixin.mixins) {
      mixin.mixins.forEach(function(x) { _keys(ret, x, seen); });
    }
  }

  Mixin.prototype.keys = function() {
    var keys = {}, seen = {}, ret = [];
    _keys(keys, this, seen);
    for(var key in keys) {
      if (keys.hasOwnProperty(key)) ret.push(key);
    }
    return ret;
  };

  /** @private - make Mixin's have nice displayNames */

  var NAME_KEY = Alto.GUID_KEY+'_name';
  var get = Alto.get;

  function processNames(paths, root, seen) {
    var idx = paths.length;
    for(var key in root) {
      if (!root.hasOwnProperty || !root.hasOwnProperty(key)) continue;
      var obj = root[key];
      paths[idx] = key;

      if (obj && obj.toString === classToString) {
        obj[NAME_KEY] = paths.join('.');
      } else if (obj && get(obj, 'isNamespace')) {
        if (seen[Alto.guidFor(obj)]) continue;
        seen[Alto.guidFor(obj)] = true;
        processNames(paths, obj, seen);
      }

    }
    paths.length = idx; // cut out last item
  }

  function findNamespaces() {
    var Namespace = Alto.Namespace, obj;

    if (Namespace.PROCESSED) { return; }

    for (var prop in window) {
      // Unfortunately, some versions of IE don't support window.hasOwnProperty
      if (window.hasOwnProperty && !window.hasOwnProperty(prop)) { continue; }

      obj = window[prop];

      if (obj && get(obj, 'isNamespace')) {
        obj[NAME_KEY] = prop;
      }
    }
  }

  Alto.identifyNamespaces = findNamespaces;

  superClassString = function(mixin) {
    var superclass = mixin.superclass;
    if (superclass) {
      if (superclass[NAME_KEY]) { return superclass[NAME_KEY]; }
      else { return superClassString(superclass); }
    } else {
      return;
    }
  };

  classToString = function() {
    var Namespace = Alto.Namespace, namespace;

    // TODO: Namespace should really be in Metal
    if (Namespace) {
      if (!this[NAME_KEY] && !classToString.processed) {
        if (!Namespace.PROCESSED) {
          findNamespaces();
          Namespace.PROCESSED = true;
        }

        classToString.processed = true;

        var namespaces = Namespace.NAMESPACES;
        for (var i=0, l=namespaces.length; i<l; i++) {
          namespace = namespaces[i];
          processNames([namespace.toString()], namespace, {});
        }
      }
    }

    if (this[NAME_KEY]) {
      return this[NAME_KEY];
    } else {
      var str = superClassString(this);
      if (str) {
        return "(subclass of " + str + ")";
      } else {
        return "(unknown mixin)";
      }
    }
  };

  Mixin.prototype.toString = classToString;

// returns the mixins currently applied to the specified object
// TODO: Make Alto.mixin
  Mixin.mixins = function(obj) {
    var ret = [], mixins = meta(obj, false), key, mixin;
    for(key in mixins) {
      if (META_SKIP[key]) continue;
      mixin = mixins[key];

      // skip primitive mixins since these are always anonymous
      if (!mixin.properties) ret.push(mixins[key]);
    }
    return ret;
  };

  REQUIRED = new Alto.Descriptor();
  REQUIRED.toString = function() { return '(Required Property)'; };

  Alto.required = function() {
    return REQUIRED;
  };

  Alias = function(methodName) {
    this.methodName = methodName;
  };
  Alias.prototype = new Alto.Descriptor();

  Alto.alias = function(methodName) {
    return new Alias(methodName);
  };

  Alto.Mixin = Mixin;

  MixinDelegate = Mixin.create({

    willApplyProperty: Alto.required(),
    didApplyProperty:  Alto.required()

  });

  Alto.MixinDelegate = MixinDelegate;


// ..........................................................
// OBSERVER HELPER
//

  Alto.observer = function(func) {
    var paths = Array.prototype.slice.call(arguments, 1);
    func.__Alto_observes__ = paths;
    return func;
  };

  Alto.beforeObserver = function(func) {
    var paths = Array.prototype.slice.call(arguments, 1);
    func.__Alto_observesBefore__ = paths;
    return func;
  };







})({});


(function(exports) {
// ==========================================================================
// Project:  Alto Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
})({});

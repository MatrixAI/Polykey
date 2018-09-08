(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.virtualfs = {})));
}(this, (function (exports) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var classCallCheck = _classCallCheck;

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  var createClass = _createClass;

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  var defineProperty = _defineProperty;

  var FirstThing =
  /*#__PURE__*/
  function () {
    function FirstThing() {
      classCallCheck(this, FirstThing);

      defineProperty(this, "_private", void 0);

      this._private = 1;
    }

    createClass(FirstThing, [{
      key: "getIt",
      value: function getIt() {
        return this._private;
      }
    }]);

    return FirstThing;
  }();

  var Library =
  /*#__PURE__*/
  function () {
    function Library() {
      classCallCheck(this, Library);

      defineProperty(this, "_private", void 0);

      defineProperty(this, "_firstThing", void 0);

      this._private = 1;
      this._firstThing = new FirstThing();
    }

    createClass(Library, [{
      key: "getOne",
      value: function getOne() {
        return this._private;
      }
    }, {
      key: "getFirst",
      value: function getFirst() {
        this._firstThing.getIt();
      }
    }]);

    return Library;
  }();

  var Another =
  /*#__PURE__*/
  function () {
    function Another() {
      classCallCheck(this, Another);
    }

    createClass(Another, [{
      key: "doWhatever",
      value: function doWhatever() {
        console.log('hello!');
      }
    }]);

    return Another;
  }();

  var SOME_CONST = 1;

  function addOne(num) {
    return num + 1;
  }

  exports.default = Library;
  exports.Another = Another;
  exports.SOME_CONST = SOME_CONST;
  exports.addOne = addOne;

  Object.defineProperty(exports, '__esModule', { value: true });

})));

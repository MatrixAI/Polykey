'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _defineProperty = _interopDefault(require('@babel/runtime/helpers/defineProperty'));

class FirstThing {
  constructor() {
    _defineProperty(this, "_private", void 0);

    this._private = 1;
  }

  getIt() {
    return this._private;
  }

}

class Library {
  constructor() {
    _defineProperty(this, "_private", void 0);

    _defineProperty(this, "_firstThing", void 0);

    this._private = 1;
    this._firstThing = new FirstThing();
  }

  getOne() {
    return this._private;
  }

  getFirst() {
    this._firstThing.getIt();
  }

}

class Another {
  doWhatever() {
    console.log('hello!');
  }

}

const SOME_CONST = 1;

function addOne(num) {
  return num + 1;
}

exports.default = Library;
exports.Another = Another;
exports.SOME_CONST = SOME_CONST;
exports.addOne = addOne;

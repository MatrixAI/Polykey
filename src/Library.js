// @flow
/** @module Library */

import { FirstThing } from './TwoThings.js';

class Library {

  _private: number;
  _firstThing: FirstThing;

  constructor () {
    this._private = 1;
    this._firstThing = new FirstThing;
  }

  getOne () {
    return this._private;
  }

  getFirst () {
    this._firstThing.getIt();
  }

}

export default Library;

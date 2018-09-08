// @flow

class FirstThing {

  _private: number;

  constructor () {
    this._private = 1;
  }

  getIt () {
    return this._private;
  }

}

class SecondThing {

  _private: number;

  constructor () {
    this._private = 2;
  }

}

export {
  FirstThing,
  SecondThing
};

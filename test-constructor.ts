class Parent {
  static createParent() {
    // when you call `this`,
    // it constructs the instnace
    // this can fail, because the child class can
    // take over the constructor signature
    return new this();
  }
  constructor() {
    console.log('parent');
  }
}

class Child extends Parent {
  constructor(b: number) {
    console.log('What is b', b + 1);
    super();
  }
}

const p = Child.createParent();

console.log(p);

// Ok I get it

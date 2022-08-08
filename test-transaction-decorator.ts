const AsyncFunction = (async () => {}).constructor;
const GeneratorFunction = function* () {}.constructor;
const AsyncGeneratorFunction = async function* () {}.constructor;

// function transaction<T extends (...a: any[]) => any> (callback: T): T {
//   return ((...args: [...any, number]) => {
//     // we take all the arguments
//     // it is necessary to take the last argument
//     // how many arguments are we talking about
//     // if it is undefined?
//     // how does it work?
//     if (args[args.length - 1] === undefined) {
//       this.db.withTransactionF(
//         (tran) => {
//           return f.apply(this, ...args, tran);
//         }
//       );


//     }

//   }) as any;
// }

// transactional (vs transaction)
// then we use the db
// @transaction(this.db)

function transaction(db: { a: string }) {
  return (
    target: any,
    key: string,
    descriptor: TypedPropertyDescriptor<(tran: string) => any>
  ) => {
    const f = descriptor.value;
    if (typeof f !== 'function') {
      throw new TypeError(`${key} is not a function`);
    }
    descriptor.value = function (tran: string) {
      return f.call(this, tran ?? db.a);
    };
    return descriptor;
  };
}

// function dec(f: () => string) {
//   return () => f();
// }

// // the method signature takes tran: DBTransaction
// // but the decorator cannot change the type
// // it would still be "required"

// const task = (
//   target: any,
//   propertyKey: string,
//   descriptor: TypedPropertyDescriptor<(name: string) => void>,
// ) => {
//   const original = descriptor.value
//   descriptor.value = function () {
//     return original?.call(this, 'Mark')
//   }
//   return descriptor
// }


class X {

  protected y: string = 'parameter';

  @transaction({a: 'abc'})
  public async foo(name?: string): Promise<string> {
    return name! + this.y;
  }

  @transaction({a: 'blah'})
  public bar(name?: string): string {
    return name!;
  }

  // @task
  // public done(name: string) {

  // }

}

const x = new X();

async function main () {

  const r = await x.foo('OVER');
  console.log(r);



}


void main();

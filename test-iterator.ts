

function getYouG () {
  console.log('ALREADY EXECUTED');
  return abc();
}

async function *abc() {
  console.log('START');
  yield 1;
  yield 2;
  yield 3;
}

async function main () {

  // we would want that you don't iterate it

  const g = getYouG();

  await g.next();

  // console.log('SUP');

  // for await (const r of abc()) {
  //   console.log(r);
  // }

}

main();

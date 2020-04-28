// import jest from 'jest'
import Library from '../src/tmp/Library.js'

test('give me a 1', t => {
  const lib = new Library
  expect(lib.getOne()).toEqual(1)
}) 

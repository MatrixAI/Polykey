/**
 * Global teardown for all jest tests
 * Side-effects are performed here
 * Jest does not support `@/` imports here
 */
async function teardown() {
  // eslint-disable-next-line no-console
  console.log('GLOBAL TEARDOWN');
}

export default teardown;

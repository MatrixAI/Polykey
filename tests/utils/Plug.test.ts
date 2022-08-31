import Plug from '@/utils/Plug';

describe(Plug.name, () => {
  test('can plug and unplug', async () => {
    const plug = new Plug();

    // Calls are idempotent
    await plug.plug();
    await plug.plug();
    await plug.plug();
    expect(plug.isPlugged()).toBeTrue();

    // Calls are idempotent
    await plug.unplug();
    await plug.unplug();
    await plug.unplug();
    expect(plug.isPlugged()).toBeFalse();
  });
});

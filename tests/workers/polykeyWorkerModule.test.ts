import { polykeyWorker } from '@/workers';

describe('PolykeyWorkerModule', () => {
  test('isRunningInWorker', async () => {
    expect(polykeyWorker.isRunningInWorker()).toBeFalsy();
  });
  test('sleep', async () => {
    const delay = 500;
    const startTime = new Date().getTime();
    polykeyWorker.sleep(delay);
    const finishTime = new Date().getTime();
    expect(finishTime - startTime).not.toBeLessThan(delay);
  });
  test('generateKeyPairAsn1', async () => {
    await polykeyWorker.generateKeyPairAsn1(4096);
    //Didn't throw an error, must be working...
  });
  test('encryptWithPublicKeyAsn1', async () => {
    const message = 'Hello world!';
    const keyPair = await polykeyWorker.generateKeyPairAsn1(4096);
    const encrypted = polykeyWorker.encryptWithPublicKeyAsn1(
      keyPair.publicKey,
      message,
    );
    expect(encrypted).not.toEqual(message);
  });
  test('decryptWithPrivateKeyAsn1', async () => {
    const message = 'Hello world!';
    const keyPair = await polykeyWorker.generateKeyPairAsn1(4096);
    const encrypted = polykeyWorker.encryptWithPublicKeyAsn1(
      keyPair.publicKey,
      message,
    );
    expect(encrypted).not.toEqual(message);
    const decrypted = polykeyWorker.decryptWithPrivateKeyAsn1(
      keyPair.privateKey,
      encrypted,
    );
    expect(decrypted).toEqual(message);
  });
  test('signWithPrivateKeyAsn1', async () => {
    const message = 'Hello world!';
    const keyPair = await polykeyWorker.generateKeyPairAsn1(4096);
    const signature = polykeyWorker.signWithPrivateKeyAsn1(
      keyPair.privateKey,
      message,
    );
    expect(signature).toBeTruthy();
  });
  test('verifyWithPublicKeyAsn1', async () => {
    const message = 'Hello world!';
    const keyPair = await polykeyWorker.generateKeyPairAsn1(4096);
    const signature = polykeyWorker.signWithPrivateKeyAsn1(
      keyPair.privateKey,
      message,
    );
    expect(
      polykeyWorker.verifyWithPublicKeyAsn1(
        keyPair.publicKey,
        message,
        signature,
      ),
    ).toBeTruthy();
  });
  // EFS worker.
  test.todo('encryptBlock');
  test.todo('decryptChunk');
});

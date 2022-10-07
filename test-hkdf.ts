import * as nobleHkdf from '@noble/hashes/hkdf';
import { sha512 as nobleSha512 } from '@noble/hashes/sha512';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';

async function main () {
  const b = Buffer.from([
    196,  89, 200, 169,  53, 157, 247, 123,
    241, 149, 132,  63, 193, 241, 186, 184,
    253,  99, 236, 241,  28,  61,  87,  50,
    247, 145,  44, 213, 134,  17,  18, 217
  ])

  console.log(b);

  const PRK1 = nobleHkdf.extract(
    nobleSha512,
    b,
  );
  const OKM1 = nobleHkdf.expand(
    nobleSha512,
    PRK1,
    Buffer.from(''),
    32
  );

  const PRK2 = nobleHkdf.extract(
    nobleSha256,
    b,
  );

  const OKM2 = nobleHkdf.expand(
    nobleSha256,
    PRK2,
    Buffer.from(''),
    32
  );

  console.log(PRK1);
  console.log(PRK2);

  console.log(OKM1);
  console.log(OKM2);

  // I think HKDF is defined over mostly sha256
  // But since we are using PBES2-HS512+A256KW
  // then we should keep using sha512...

}

void main();

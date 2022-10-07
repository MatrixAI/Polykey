import * as asn1js from 'asn1js';
import { OctetString, AsnSerializer, AsnTypeTypes, AsnConvert, AsnType, AsnPropTypes, AsnProp, AsnArray } from "@peculiar/asn1-schema";
// import * as asn1 from '@peculiar/asn1-schema';
import { asn1 } from 'node-forge';

// @AsnType({ type: AsnTypeTypes.Choice })
// class IA5String {

//   @AsnProp({ type: AsnPropTypes.IA5String })
//   public a: string;

//   @AsnProp({ type: AsnPropTypes.IA5String })
//   public b: string;
//   @AsnProp({ type: AsnPropTypes.IA5String })
//   public o: string;
//   // This is not actually needed
//   // But the above is needed
//   constructor(o: string) {
//     this.o = o;
//     this.a = 'abc';
//     this.b = 'abc';
//   }
// }

// const obj = new IA5String();
// obj.a = 'abc';
// // obj.a = '2abc';
// // obj.b = '3abc';

// // This becomes an Asn1Ber
// const result = AsnSerializer.serialize(obj);

// // Note that the above must be a normal string
// // And when it serialises it serialises a normal value...

// console.log(result);

// // const t = new TextEncoder();
// // console.log(t.encode('abc'));

// // console.log(Buffer.from('1abc'));

// // YES, it's a SEQUENCE
// // and it's IN ORDER
// // plus you don't really need the sequence I wonder

// // I think it tries to make the above a sequence

// // So we have a string array
// // or something else
// // I need to find out if the abovei s the same as a sequence

// // Parsing is AsnParser.parse()

// // the end result is a SEQUENCE

    // value: asn1.create(
    //   asn1.Class.APPLICATION,
    //   asn1.Type.OCTETSTRING,
    //   false,
    //   nodeSignature,
    // ),

const result2 = asn1.create(
  asn1.Class.UNIVERSAL,
  asn1.Type.OCTETSTRING,
  false,
  'hello',
);

console.log('ASN1', result2);
console.log('ASN1', asn1.toDer(result2));
console.log('ASN1', Buffer.from(asn1.toDer(result2).getBytes(), 'binary'));

// // Damn, it doesn't work
// // how do we give it the `APPLICATION` context?
// // It doesn't seem to understand how to do this?
// const versionString = new asn1js.IA5String({
//   value: '1.0.0',
//   // idBlock: {
//   //   tagClass: 2,
//   //   tagNumber: 22   // IASTRING
//   // }
// });

// // console.log(versionString);
// // versionString.idBlock.tagClass = 2;
// // console.log(versionString);

// // IT IS BECAUSE IT OVERRIDES IT OMG
// // there you go
// // IA5String gets teh `idBlock.tagClass` set to `1` rater than `UNIVERSAL`
// // That's the reason..... OMG

// console.log('ASN1String', versionString.toBER());
// console.log('ASN1String', Buffer.from(versionString.toBER()));


@AsnType({ type: AsnTypeTypes.Choice })
class VersionString {
  @AsnProp({ type: AsnPropTypes.OctetString })
  public value = Buffer.from('hello');
}

const result = AsnSerializer.serialize(new VersionString());
console.log('RESULT', result);




// // It should be 56
// but it doesn't work

// interface BaseBlockParams extends LocalBaseBlockParams, LocalIdentificationBlockParams, LocalLengthBlockParams, Partial<IBaseBlock> {
// }

// interface IBaseBlock {
//     name: string;
//     optional: boolean;
//     primitiveSchema?: BaseBlock;
// }


// // Obviously this is incorrect

// // We need primtive form not constructed


// console.log('DECODED FROM', asn1.fromDer(
//   Buffer.from(result).toString('binary')
// ));


// // asn1.Class.UNIVERSAL is 0
// // this becomes `0x16`

// // asn1.Class.APPLICATION is `64`
// // this becomes `0x56`

// // But the asn1 library above is giving men 0x16
// // which is universal class
// // how do target non-universal?

// // new asn1js.Primitive({ optional, idBlock: { tagClass: 3, tagNumber: context }, value})

// const x = new asn1js.IA5String({
//   value: 'abc',
//   idBlock: {
//     tagClass: 0x56,
//     tagNumber: 22
//   }
// });

// console.log('X', x);

// // OMG there it is
// console.log(x.toBER());

// // IA5String is tagNumber 22 <- this is correct
// // But APPLICATION tag class is?

// // This function creates an IA5String primitive using /asn1js

// This ends up being an octet string
// That you can just use directly

const x = new OctetString(Buffer.from('hello'));

console.log(x);

const result3 = AsnSerializer.serialize(x);

console.log(result3);

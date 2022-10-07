import * as asn1js from 'asn1js';
import * as asn1Schema from "@peculiar/asn1-schema";

const stringPrimitive = new asn1js.IA5String({
  value: 'abc',
  idBlock: {
    tagClass: 0x56,
    tagNumber: 22
  }
});

const stringPrimitiveEncoded = stringPrimitive.toBER();

// The below does the same thing but use @peculiar/asn1-schema
// It constructs a serializable object and uses asn1Schema.AsnSerializer.serialize
// to serialize it to an ArrayBuffer
// It sets the tag class to 0x56 also known as APPLICATION

class StringPrimitive {
  @asn1Schema.AsnProp({ type: asn1Schema.AsnPropTypes.IA5String })
  public value = 'abc';
}

const stringPrimitive2 = new StringPrimitive();
const stringPrimitive2Encoded = asn1Schema.AsnSerializer.serialize(stringPrimitive2, 'APPLICATION', 22);

import { Integer, PrintableString } from "asn1js";
import {
  AttributeTypeAndValue,
  Certificate,
  ContentInfo,
  CryptoEngine,
  EncapsulatedContentInfo,
  IssuerAndSerialNumber,
  SignedData,
  SignerInfo,
} from "pkijs";

let signingIdentity: ReturnType<typeof createSigningIdentity> | undefined;

async function createSigningIdentity() {
  const engine = new CryptoEngine({ name: "portal-demo", crypto });
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  );
  const certificate = new Certificate();
  certificate.version = 2;
  const serial = crypto.getRandomValues(new Uint8Array(16));
  serial[0] = serial[0] & 0x7f || 1;
  certificate.serialNumber = new Integer({ valueHex: serial.buffer });
  for (const name of [certificate.issuer, certificate.subject]) {
    name.typesAndValues.push(
      new AttributeTypeAndValue({
        type: "2.5.4.3",
        value: new PrintableString({ value: "Student Portal Demo Signer" }),
      }),
    );
  }
  const now = Date.now();
  certificate.notBefore.value = new Date(now - 60_000);
  certificate.notAfter.value = new Date(now + 365 * 86_400_000);
  await certificate.subjectPublicKeyInfo.importKey(keys.publicKey, engine);
  await certificate.sign(keys.privateKey, "SHA-256", engine);
  return { engine, privateKey: keys.privateKey, certificate };
}

export async function signDocument(pdf: ArrayBuffer) {
  signingIdentity ??= createSigningIdentity().catch((error) => {
    signingIdentity = undefined;
    throw error;
  });
  const { engine, privateKey, certificate } = await signingIdentity;
  const signed = new SignedData({
    version: 1,
    encapContentInfo: new EncapsulatedContentInfo({
      eContentType: ContentInfo.DATA,
    }),
    certificates: [certificate],
    signerInfos: [
      new SignerInfo({
        version: 1,
        sid: new IssuerAndSerialNumber({
          issuer: certificate.issuer,
          serialNumber: certificate.serialNumber,
        }),
      }),
    ],
  });
  await signed.sign(privateKey, 0, "SHA-256", pdf, engine);
  return new ContentInfo({
    contentType: ContentInfo.SIGNED_DATA,
    content: signed.toSchema(),
  })
    .toSchema()
    .toBER(false);
}

export async function fileDigest(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

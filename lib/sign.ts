import { KeyringPair } from "@polkadot/keyring/types";
import { AnyAaaaRecord } from "dns";



export enum KPType {
    sr25519 = "sr25519",
    ed25519 = "ed25519",

}
export function sign(payload: string | Uint8Array, signer: KeyringPair) {

    const typePrefix = signer.type === KPType.sr25519 ? "s" : "e";
    const sig = signer.sign(payload);
    const prefix = Buffer.from(typePrefix).readUInt8(0)
    const sigPrefixed = new Uint8Array([prefix, ...sig]);
    return sigPrefixed;
}
// export function encrypt(signer: KeyringPair, data: AnyAaaaRecord) {

//     const encryptedData = crypt.encrypt(data);
//     return new Uint8Array(Buffer.from(encryptedData))
// }
// export function decrypt(data: any) {
//     return this.crypt.decrypt(data);
// }




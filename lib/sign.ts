import { KeyringPair } from "@polkadot/keyring/types";
import crypto from 'crypto';
import { KeypairType } from "./identity";
import { Envelope } from "./types/types_pb";

export function sign(payload: string | Uint8Array, identity: KeyringPair) {

    const typePrefix = identity.type === KeypairType.sr25519 ? "s" : "e";

    const sig = identity.sign(payload);
    const prefix = Buffer.from(typePrefix).readUint8(0)
    const sigPrefixed = new Uint8Array([prefix, ...sig]);
    return sigPrefixed;


}
export function challenge(envelope: Envelope) {
    const request = envelope.getRequest();
    const response = envelope.getResponse();
    let msg = new Uint8Array();
    if (request) {
        msg = crypto.createHash('md5').update(request.getCommand()).update(request.getData()).digest();

    }
    else if (response) {
        const err = response.getError();
        const reply = response.getReply();
        if (err) {
            console.log(err.getCode(), err.getMessage());
        } else {
            console.log(reply?.getData())
        }

    }

    return msg;

}
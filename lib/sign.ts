import { KeyringPair } from "@polkadot/keyring/types";
import crypto from 'crypto';
import { KeypairType } from "./identity";
import { Envelope, Request, Response, Address } from "./types/types_pb";

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

    let hash = crypto.createHash('md5')
        .update(envelope.getUid())
        .update(envelope.getTags())
        .update(`${envelope.getTimestamp()}`)
        .update(`${envelope.getExpiration()}`)
        .update(challengeAddress(envelope.getSource()))
        .update(challengeAddress(envelope.getDestination()))

    if (request) {
        hash = challengeRequest(request, hash);
    }
    else if (response) {
        challengeResponse(response);
    }

    return hash.digest();

}
export function challengeAddress(address: Address | undefined) {
    return `${address?.getTwin()}${address?.getConnection()}`;

}
export function challengeRequest(request: Request, hash: crypto.Hash) {
    return hash.update(request.getCommand()).update(request.getData());
}
export function challengeResponse(response: Response) {
    const err = response.getError();
    const reply = response.getReply();
    if (err) {
        console.log(err.getCode(), err.getMessage());
    } else {
        console.log(reply?.getData())
    }
}
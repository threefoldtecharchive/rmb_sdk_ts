import { v4 as uuidv4 } from 'uuid';
import { Address, Request, Envelope, Error, Response } from './types/lib/types';
import crypto from 'crypto';
import { Buffer } from "buffer"
import { KPType, sign } from './sign';
import { KeyringPair } from '@polkadot/keyring/types';
class ClientEnvelope extends Envelope {
    signer: KeyringPair;
    constructor(source: Address, signer: KeyringPair, destTwinId: number, requestCommand: any, requestData: any, expirationMinutes: number) {
        super({
            uid: uuidv4(),
            timestamp: Math.round(Date.now() / 1000),
            expiration: expirationMinutes * 60,
            source: source,
            destination: new Address({ twin: destTwinId }),


        })
        if (requestCommand) {
            this.request = new Request({ command: requestCommand })
        }
        this.signer = signer;
        if (requestData) {
            this.plain = new Uint8Array(Buffer.from(requestData));

        }
        this.schema = "application/json"
        this.signature = this.signEnvelope()
    }
    signEnvelope() {
        const toSign = this.challenge();

        return sign(toSign, this.signer);
    }
    async verify(twin: any) {

        const prefix = new TextDecoder().decode(Buffer.from(new Uint8Array([this.signature[0]])))
        let sigType: string;
        if (prefix == 'e') {
            sigType = KPType.ed25519
        } else if (prefix == 's') {
            sigType = KPType.sr25519
        } else {
            throw new Error({ message: 'invalid signature type, should be either ed25519 or sr25519' })
        }
        const dataHashed = this.challenge();
        await crypto.subtle.verify(sigType, twin.pk, this.signature, dataHashed)

        return true;
    }

    challenge() {
        let hash = crypto.createHash('md5')
            .update(this.uid)
            .update(this.tags)
            .update(`${this.timestamp}`)
            .update(`${this.expiration}`)
            .update(this.challengeAddress(this.source))
            .update(this.challengeAddress(this.destination))

        if (this.request) {
            hash = this.challengeRequest(this.request, hash);
        }
        else if (this.response) {
            hash = this.challengeResponse(this.response, hash);
        } else if (this.error) {
            hash = this.challengeError(this.error, hash)
        }

        if (this.schema) {
            hash.update(this.schema);
        }
        if (this.federation) {
            hash.update(this.federation)
        }
        if (this.plain) {
            hash.update(this.plain)
        } else if (this.cipher) {
            hash.update(this.cipher)
        }


        return hash.digest();

    }
    challengeAddress(address: Address) {
        return `${address.twin}${address.connection}`;

    }
    challengeError(err: Error, hash: crypto.Hash) {
        return hash.update(`${err.code}${err.message}`)
    }
    challengeRequest(request: Request, hash: crypto.Hash) {
        return hash.update(request.command);
    }
    challengeResponse(response: Response, hash: crypto.Hash) {
        // to be implemented 
        return hash

    }
}
export default ClientEnvelope;
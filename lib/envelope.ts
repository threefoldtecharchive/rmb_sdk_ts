import { v4 as uuidv4 } from 'uuid';
import { Address, Request, Envelope, Error, Response } from './types/lib/types';
import cryptoJs from 'crypto-js';
import { Buffer } from "buffer"
import { sign } from './sign';
import { KeyringPair } from '@polkadot/keyring/types';

class ClientEnvelope extends Envelope {
    signer: KeyringPair;
    constructor(source: Address, signer: KeyringPair, destTwinId: number, requestCommand: string, requestData: any, expirationMinutes: number) {
        super({
            uid: uuidv4(),
            timestamp: Math.round(Date.now() / 1000),
            expiration: expirationMinutes * 60,
            source: source,
            destination: new Address({ twin: destTwinId }),
            request: new Request({ command: requestCommand }),

        })
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

    challenge() {
        let hash = cryptoJs.algo.MD5.create()
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
            const plain = Buffer.from(this.plain).toString("hex")
            hash.update(cryptoJs.enc.Hex.parse(plain))
        } else if (this.cipher) {
            const cipher = Buffer.from(this.cipher).toString("hex")
            hash.update(cryptoJs.enc.Hex.parse(cipher))
        }


        return Buffer.from(hash.finalize().toString(), "hex")

    }
    challengeAddress(address: Address) {
        return `${address.twin}${address.connection}`;

    }
    challengeError(err: Error, hash) {
        return hash.update(`${err.code}${err.message}`)
    }
    challengeRequest(request: Request, hash) {
        return hash.update(request.command);
    }
    challengeResponse(response: Response, hash) {
        // to be implemented 
        return hash

    }
}
export default ClientEnvelope;

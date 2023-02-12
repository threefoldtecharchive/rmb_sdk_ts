import { v4 as uuidv4 } from 'uuid';
import { Address, Request, Envelope, Error, Response } from './types/lib/types';
import crypto from 'crypto';
import { Client } from './client';
class ClientEnvelope extends Envelope {
    client: Client;
    constructor(client: Client, source: Address, destTwinId: number, requestCommand: string, requestData: any, expirationMinutes: number) {
        super({
            uid: uuidv4(),
            timestamp: Math.round(Date.now() / 1000),
            expiration: expirationMinutes * 60,
            source: source,
            destination: new Address({ twin: destTwinId }),
            request: new Request({ command: requestCommand }),

        })
        this.client = client;
        if (requestData) {
            this.plain = new Uint8Array(Buffer.from(JSON.stringify(requestData)));

        }
        this.schema = "application/json"
        this.signature = this.signEnvelope()
    }
    signEnvelope() {
        const toSign = this.challenge();

        return this.client.sign(toSign);
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
import { Address, Request, Envelope, Error, Response } from './types/lib/types';
import cryptoJs from 'crypto-js';
import { Buffer } from "buffer"
import { KPType, sign } from './sign';
import { KeyringPair } from '@polkadot/keyring/types';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { waitReady } from '@polkadot/wasm-crypto';
import { KeypairType } from '@polkadot/util-crypto/types';
import { getTwinFromTwinID } from './util';
class ClientEnvelope extends Envelope {
    signer!: KeyringPair;
    chainUrl: string;
    twin: any;
    constructor(signer: KeyringPair | undefined, envelope: Envelope, chainUrl: string) {
        super({
            uid: envelope.uid,
            tags: envelope.tags,
            timestamp: envelope.timestamp,
            expiration: envelope.expiration,
            source: envelope.source,
            destination: envelope.destination,
            response: envelope.response,
            request: envelope.request,
            error: envelope.error,
            signature: envelope.signature,
            schema: envelope.schema,
            plain: envelope.plain.length != 0 ? envelope.plain : undefined,
            cipher: envelope.cipher.length != 0 ? envelope.cipher : undefined,
            federation: envelope.federation || undefined,

        });
        this.chainUrl = chainUrl;
        this.schema = "application/json"
        if (signer) {
            this.signer = signer;
            this.signature = this.signEnvelope()
        }

    }
    signEnvelope() {
        const toSign = this.challenge();

        return sign(toSign, this.signer);
    }

    async getSigner(sigType: KeypairType) {
        await waitReady()

        const keyring = new Keyring({ type: sigType });
        this.signer = keyring.addFromAddress(this.twin.accountId);
    }

    async verify() {
        try {
            const prefix = new TextDecoder().decode(this.signature.slice(0, 1))
            let sigType: KeypairType
            if (prefix == 'e') {
                sigType = KPType.ed25519
            } else if (prefix == 's') {
                sigType = KPType.sr25519
            } else {
                return false;
            }
            // get twin of sender from twinid
            this.twin = await getTwinFromTwinID(this.source.twin, this.chainUrl)
            // get sender pk from twin , update signer to be of sender 
            await this.getSigner(sigType);
            // verify signature using challenge and pk
            const dataHashed = new Uint8Array(this.challenge());
            return this.signer.verify(dataHashed, this.signature.slice(1), this.signer.publicKey);

        } catch (err) {
            console.log('invalid destination twin', err)
        }


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

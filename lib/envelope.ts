import { Address, Request, Envelope, Error, Response } from './types/lib/types';
import crypto from 'crypto';
import { Buffer } from "buffer"
import { KPType, sign } from './sign';
import { KeyringPair } from '@polkadot/keyring/types';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { waitReady } from '@polkadot/wasm-crypto';
import { KeypairType } from '@polkadot/util-crypto/types';
class ClientEnvelope extends Envelope {
    signer!: KeyringPair;
    chainUrl: string;
    twin: any;
    constructor(signer: KeyringPair | undefined, envelope: Envelope, chainUrl: string) {
        super({
            uid: envelope.uid,
            timestamp: envelope.timestamp,
            expiration: envelope.expiration,
            source: envelope.source,
            destination: envelope.destination,
            response: envelope.response,
            request: envelope.request,
            error: envelope.error,
            plain: envelope.plain,
            signature: envelope.signature

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
    async getSenderTwin() {
        const provider = new WsProvider(this.chainUrl)
        const cl = await ApiPromise.create({ provider })

        this.twin = (await cl.query.tfgridModule.twins(this.source.twin)).toJSON();
        cl.disconnect();

    }
    async getSigner(sigType: KeypairType) {
        await waitReady()

        const keyring = new Keyring({ type: sigType });
        this.signer = keyring.addFromAddress(this.twin.accountId);
    }

    async verify(signature: Uint8Array) {

        const prefix = new TextDecoder().decode(signature.slice(0, 1))
        let sigType: KeypairType
        if (prefix == 'e') {
            sigType = KPType.ed25519
        } else if (prefix == 's') {
            sigType = KPType.sr25519
        } else {
            return false;
        }
        // get twin of sender from twinid
        await this.getSenderTwin();
        // get sender pk from twin , update signer to be of sender 
        await this.getSigner(sigType);
        // verify signature using challenge and pk
        const dataHashed = new Uint8Array(this.challenge());
        return this.signer.verify(dataHashed, signature.slice(1), this.signer.publicKey);


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
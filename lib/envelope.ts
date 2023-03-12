import { Address, Request, Envelope, Error, Response } from './types/lib/types';
import { Buffer } from "buffer"
import { createShared, KPType, sign } from './sign';
import { KeyringPair } from '@polkadot/keyring/types';
import { Keyring } from '@polkadot/api'
import { waitReady } from '@polkadot/wasm-crypto';
import { KeypairType } from '@polkadot/util-crypto/types';
import { getTwinFromTwinID, hexStringToArrayBuffer } from './util';
import * as cryptoJs from 'crypto-js';
import crypto from 'crypto';
import aes from 'js-crypto-aes';
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



    createNonce(size: number) {

        let randArr: number[] = []
        for (let i = 0; i < size; i++) {
            randArr.push(Math.random() * 10);
        }
        return new Uint8Array([...randArr]);

    }
    signEnvelope() {

        const toSign = this.challenge();
        console.log("signing address: ", this.signer.address)
        return sign(toSign, this.signer);
    }

    async getSigner(sigType: KeypairType) {
        await waitReady()

        const keyring = new Keyring({ type: sigType });
        this.signer = keyring.addFromAddress(this.twin.accountId);
    }

    async verify() {
        console.log('verifying')
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
            console.log("verification address:", this.signer.address)
            return this.signer.verify(dataHashed, this.signature.slice(1), this.signer.publicKey);

        } catch (err) {
            console.log('invalid destination twin', err)
        }


    }

    async encrypt(requestData: any, privKey: Uint8Array, destTwinPk: string) {

        const pubKey = new Uint8Array(hexStringToArrayBuffer(destTwinPk))
        const sharedKey = await createShared(privKey, pubKey)
        const sKey = await crypto.subtle.importKey("raw", sharedKey, 'AES-GCM', true, ["encrypt", "decrypt"])

        const nonce = window.crypto.getRandomValues(new Uint8Array(12));

        // convert requestdata to Uint8Array
        const dataUint8 = new Uint8Array(Buffer.from(requestData));

        // encrypt cipher text with sharedkey
        const encryptedText = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, sKey, Buffer.from(dataUint8));
        console.log(encryptedText);

        const encryptedArr = new Uint8Array(encryptedText)
        let finalArr = new Uint8Array(encryptedArr.length + nonce.length);
        finalArr.set(nonce);
        finalArr.set(encryptedArr, nonce.length);

        return finalArr

    }
    // needs to return wordArray decrypted
    async decrypt(privKey: Uint8Array) {

        const pubKey = new Uint8Array(hexStringToArrayBuffer(this.twin.pk))
        const sharedKey = await createShared(privKey, pubKey)
        const sKey = await crypto.subtle.importKey("raw", sharedKey, 'AES-GCM', true, ["encrypt", "decrypt"])
        const iv = this.cipher.slice(0, 12);
        const data = Buffer.from(this.cipher.slice(12));
        const key = crypto.createSecretKey(sharedKey)
        let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
        let decrypted = decipher.update(data)
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        console.log(decrypted)

        // const decrypted = aes.decrypt(data, sharedKey, { name: 'AES-GCM', iv })
        return decrypted.toString();

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


        if (this.plain.length) {

            const plain = Buffer.from(this.plain).toString("hex")
            hash.update(cryptoJs.enc.Hex.parse(plain))
        } else if (this.cipher.length) {

            const cipher = Buffer.from(this.cipher).toString("hex")

            hash.update(cryptoJs.enc.Hex.parse(cipher))
        }

        const hashFinal = Buffer.from(hash.finalize().toString(), "hex")

        return hashFinal

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

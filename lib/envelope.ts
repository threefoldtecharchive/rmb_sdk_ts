import { Address, Request, Envelope, Error, Response } from './types/lib/types';
import { Buffer } from "buffer"
import { KPType, sign } from './sign';
import { KeyringPair } from '@polkadot/keyring/types';
import { Keyring } from '@polkadot/api'
import { waitReady } from '@polkadot/wasm-crypto';
import { KeypairType } from '@polkadot/util-crypto/types';
import { getTwinFromTwinID } from './util';
import secp256k1 from 'secp256k1'
import * as cryptoJs from 'crypto-js';
import crypto from 'crypto';
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
    createShared(privKey: Uint8Array, pubKey: Uint8Array) {
        const pkey = secp256k1
        function hashfn(x, y) {
            const pubKey = new Uint8Array(33)
            pubKey[0] = (y[31] & 1) === 0 ? 0x02 : 0x03
            pubKey.set(x, 1)
            return pubKey
        }

        // get X point of ecdh
        const ecdhPointX = secp256k1.ecdh(pubKey, privKey, { hashfn }, Buffer.alloc(33)).toString('hex')
        const encodedPoint = cryptoJs.enc.Hex.parse(ecdhPointX);

        // update using SHA256
        // let key = cryptoJs.SHA256(encodedPoint).toString().substring(0, 31);
        // key = key + "\0";
        const key = cryptoJs.SHA256(encodedPoint);
        return this.wordArrayToUint8Array(key)

    }
    wordArrayToUint8Array(data: cryptoJs.lib.WordArray) {
        const dataArray = new Uint8Array(data.sigBytes)
        for (let i = 0x0; i < data.sigBytes; i++) {
            dataArray[i] = data.words[i >>> 0x2] >>> 0x18 - i % 0x4 * 0x8 & 0xff;
        }
        return new Uint8Array(dataArray);

    }
    hexStringToArrayBuffer(hexString) {
        // remove the leading 0x
        hexString = hexString.replace(/^0x/, '');

        // ensure even number of characters
        if (hexString.length % 2 != 0) {
            console.log('WARNING: expecting an even number of characters in the hexString');
        }

        // check for some non-hex characters
        var bad = hexString.match(/[G-Z\s]/i);
        if (bad) {
            console.log('WARNING: found non-hex characters', bad);
        }

        // split the string into pairs of octets
        var pairs = hexString.match(/[\dA-F]{2}/gi);

        // convert the octets to integers
        var integers = pairs.map(function (s) {
            return parseInt(s, 16);
        });

        var array = new Uint8Array(integers);


        return array.buffer;
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
            return this.signer.verify(dataHashed, this.signature.slice(1), this.signer.publicKey);

        } catch (err) {
            console.log('invalid destination twin', err)
        }


    }

    async encrypt(requestData: any, destTwin: any, privKey: Uint8Array) {
        // get private key from mnemonics 
        const pubKey = new Uint8Array(this.hexStringToArrayBuffer(destTwin.pk))
        // create shared key bytes[] from private key and destination pk
        const sharedKeyBytes = this.createShared(privKey, pubKey);
        // convert sharedKey to hex string
        const sharedKey = Buffer.from(sharedKeyBytes).toString('hex');
        // create cipher hex string from Uint8Array of nonce and requestData

        // create nonce of 12 bytes[] length
        const nonce = this.createNonce(12);
        const nonceBuf = Buffer.from(nonce)//.toString('hex');
        // const nonceWordArr = cryptoJs.enc.Hex.parse(nonceBuf)
        // convert requestdata to Uint8Array
        const dataUint8 = new Uint8Array(Buffer.from(requestData));
        const dataHex = Buffer.from(dataUint8)//.toString('hex')

        // let cipherTextArr = new Uint8Array(dataUint8.length + nonce.length);
        // cipherTextArr.set(nonce)
        // cipherTextArr.set(dataUint8, nonce.length)
        // const cipherText = Buffer.from(cipherTextArr).toString('hex');
        // convert hex sharedkey and cipher text strings to WordArray
        // const sKey = cryptoJs.enc.Hex.parse(sharedKey);
        // const ciph = cryptoJs.enc.Hex.parse(dataHex);
        // const cKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ["encrypt", "decrypt"])

        const sKey = await crypto.subtle.importKey("raw", sharedKeyBytes, 'AES-GCM', true, ["encrypt", "decrypt"])
        // encrypt cipher text with sharedkey

        // const encryptedText = cryptoJs.AES.encrypt(ciph, sKey, { iv: nonceWordArr, mode: cryptoJs.mode.CBC }).ciphertext.toString() // hex
        const encryptedText = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBuf }, sKey, dataHex);
        console.log(encryptedText);
        // convert hex to uint8array
        // const encryptedArr = new Uint8Array(Buffer.from(encryptedText, 'hex'))
        const encryptedArr = new Uint8Array(encryptedText)
        let finalArr = new Uint8Array(encryptedArr.length + nonce.length);
        finalArr.set(nonce);
        finalArr.set(encryptedArr, nonce.length);
        // return new Uint8Array(Buffer.from(encryptedText));
        return finalArr
        return new Uint8Array()
    }
    // needs to return wordArray decrypted
    decrypt() {
        // const pubKey = new Uint8Array(this.hexStringToArrayBuffer(this.twin.pk))
        // const sharedKeyBytes = this.createShared(privKey, pubKey)

        // const sharedKey = Buffer.from(sharedKeyBytes).toString('hex');
        // const sKey = cryptoJs.enc.Hex.parse(sharedKey);

        // // convert enevelope cipher to cipherparams
        // const cipherHex = Buffer.from(this.cipher).toString('hex');
        // // console.log("cipherHex", cipherHex)
        // const cipher = cryptoJs.enc.Hex.parse(cipherHex);// wordArray
        // const cipherPar = cryptoJs.lib.CipherParams.create({
        //     ciphertext: cipher
        // })

        // const decryptedCipher = cryptoJs.AES.decrypt(cipherPar, sKey, { iv: this.iv })
        // console.log("decrypted Cipher:", decryptedCipher)
        // return decryptedCipher;
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

import { KeyringPair } from "@polkadot/keyring/types";
import { Address, Envelope, Error, Request } from "./types/lib/types";
import { waitReady } from '@polkadot/wasm-crypto';
import { Keyring } from '@polkadot/api'
import { KeypairType } from "@polkadot/util-crypto/types";
import base64url from "base64url";
import ClientEnvelope from "./envelope";
import { Buffer } from "buffer"
import { sign, KPType } from './sign'
import { v4 as uuidv4 } from 'uuid';
import { getTwinFromTwinAddress, getTwinFromTwinID } from "./util";
import { mnemonicToSeedSync, } from "bip39";
import crypto from 'crypto';
import secp256k1 from 'secp256k1'
import * as cryptoJs from 'crypto-js';
class Client {
    signer!: KeyringPair;
    source: Address = new Address();
    responses;
    con!: WebSocket;
    mnemonics: string;
    relayUrl: string
    chainUrl: string
    session: string
    keypairType: KeypairType
    twin: any;
    destTwin: any
    privKey: Uint8Array
    sKey: crypto.webcrypto.CryptoKey;

    constructor(chainUrl: string, relayUrl: string, mnemonics: string, session: string, keypairType: string) {
        this.responses = new Map<string, ClientEnvelope>();
        this.mnemonics = mnemonics;
        this.relayUrl = relayUrl;
        this.session = session;
        this.privKey = new Uint8Array(mnemonicToSeedSync(mnemonics)).slice(0, 32)
        if (keypairType.toLowerCase().trim() == 'sr25519') {
            this.keypairType = KPType.sr25519;
        } else if (keypairType.toLowerCase().trim() == 'ed25519') {
            this.keypairType = KPType.ed25519
        } else {
            throw new Error({ message: "Unsupported Keypair type" })
        }

        this.chainUrl = chainUrl;


    }
    createConnection() {
        try {
            if (this.isEnvNode()) {
                const Ws = require("ws")
                this.con = new Ws(this.updateUrl());
            } else {
                this.con = new WebSocket(this.updateUrl());
            }
            this.con.onmessage = async (e: any) => {

                let data: Uint8Array = e.data
                if (!this.isEnvNode()) {
                    const buffer = await new Response(e.data).arrayBuffer();
                    data = new Uint8Array(buffer)
                }
                const receivedEnvelope = Envelope.deserializeBinary(data);
                // cast received enevelope to client envelope
                const castedEnvelope = new ClientEnvelope(undefined, receivedEnvelope, this.chainUrl);

                //verify
                if (this.responses.get(receivedEnvelope.uid)) {
                    // update envelope in responses map
                    this.responses.set(receivedEnvelope.uid, castedEnvelope)
                }

            }
        } catch (err) {
            throw new Error({ message: `Unable to create websocket connection due to ${err}` })
        }
    }
    async connect() {
        try {
            if (!this.con || this.con.readyState != this.con.OPEN) {
                await this.createSigner();
                this.twin = await getTwinFromTwinAddress(this.signer.address, this.chainUrl)
                this.updateSource();
                this.createConnection()
            }
        } catch (err) {
            if (this.con && this.con.readyState == this.con.OPEN) {
                this.con.close()
            }
            throw new Error({ message: `Unable to connect due to ${err}` })
        }

    }
    reconnect() {

        this.connect()
    }
    close() {
        this.con.close();
    }
    waitForOpenConnection() {
        return new Promise((resolve, reject) => {
            const maxNumberOfAttempts = 10
            const intervalTime = 100 //ms

            let currentAttempt = 0
            const interval = setInterval(() => {
                if (currentAttempt > maxNumberOfAttempts - 1) {
                    clearInterval(interval)
                    reject(new Error({ message: 'Maximum number of attempts exceeded' }))
                } else if (this.con.readyState === this.con.OPEN) {
                    // this.updateUrl.bind(this)
                    clearInterval(interval)
                    resolve("connected")
                }
                currentAttempt++
            }, intervalTime)
        })
    }
    wordArrayToUint8Array(data: cryptoJs.lib.WordArray) {
        const dataArray = new Uint8Array(data.sigBytes)
        for (let i = 0x0; i < data.sigBytes; i++) {
            dataArray[i] = data.words[i >>> 0x2] >>> 0x18 - i % 0x4 * 0x8 & 0xff;
        }
        return new Uint8Array(dataArray);

    }
    createShared(privKey: Uint8Array, pubKey: Uint8Array) {

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
    async send(requestCommand: string, requestData: any, destinationTwinId: number, expirationMinutes: number) {

        try {
            // create new envelope with given data and destination
            const envelope = new Envelope({
                uid: uuidv4(),
                timestamp: Math.round(Date.now() / 1000),
                expiration: expirationMinutes * 60,
                source: this.source,

            });
            // need to check if destination twinId exists by fetching dest twin from chain first
            this.destTwin = await getTwinFromTwinID(destinationTwinId, this.chainUrl)


            envelope.destination = new Address({ twin: this.destTwin.id })

            if (requestCommand) {
                envelope.request = new Request({ command: requestCommand })
            }


            const clientEnvelope = new ClientEnvelope(this.signer, envelope, this.chainUrl);

            if (requestData) {
                console.log(this.twin.pk)
                if (this.destTwin.pk && this.twin.pk) {

                    clientEnvelope.cipher = await clientEnvelope.encrypt(requestData, this.sKey);

                    console.log("encrypted cipher:", clientEnvelope.cipher)
                } else {
                    clientEnvelope.plain = new Uint8Array(Buffer.from(requestData));
                }


            }
            const pubKey = new Uint8Array(this.hexStringToArrayBuffer(this.destTwin.pk))
            const sharedKey = this.createShared(this.privKey, pubKey)
            this.sKey = await crypto.subtle.importKey("raw", sharedKey, 'AES-GCM', true, ["encrypt", "decrypt"])
            console.log(this.sKey)
            while (this.con.readyState != this.con.OPEN) {
                try {
                    await this.waitForOpenConnection();

                } catch (er) {
                    this.createConnection()
                }
            }

            this.con.send(clientEnvelope.serializeBinary());


            // add request id to responses map on client object
            this.responses.set(clientEnvelope.uid, clientEnvelope)
            return clientEnvelope.uid;

        } catch (err) {

            throw new Error({ message: `Unable to send due to ${err}` })

        }

    }

    read(requestID: string) {

        return new Promise(async (resolve, reject) => {
            let envelope: ClientEnvelope = this.responses.get(requestID)
            // check if envelope in map has a response  
            const now = new Date().getTime();
            while (envelope && new Date().getTime() < now + envelope.expiration * 1000) {
                envelope = this.responses.get(requestID)
                if (envelope && envelope.response) {
                    const verified = await envelope.verify()
                    console.log(verified)
                    console.log(envelope.cipher.length)
                    console.log(envelope.plain.length)
                    if (verified) {
                        if (envelope.plain.length > 0) {
                            const dataReceived = envelope.plain;
                            if (dataReceived) {
                                const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceived))
                                const responseString = JSON.parse(decodedData);
                                this.responses.delete(requestID);
                                resolve(responseString);
                            }
                        } else if (envelope.cipher.length > 0) {
                            // console.log('decrypting cipher')
                            console.log(this.sKey)
                            const decryptedCipher = await envelope.decrypt(this.sKey);

                            // const res = decryptedCipher.toString()
                            // const result = Buffer.from(res, 'hex').toString()
                            const result = "";
                            resolve(`result:${result}`)

                        }

                    } else {
                        this.responses.delete(requestID);
                        reject("invalid signature, discarding response");
                    }

                }
                // check if envelope in map has an error
                else if (envelope && envelope.error) {

                    const err = envelope.error
                    if (err) {
                        this.responses.delete(requestID);
                        reject(`${err.code} ${err.message}`);
                    }
                }
                await new Promise(f => setTimeout(f, 1000));
            }
            if (envelope && envelope.expiration) {
                this.responses.delete(requestID);
                reject(`Didn't get a response after ${envelope.expiration} seconds`)
            }
        })
    }






    isEnvNode(): boolean {
        return (
            typeof process === "object" &&
            typeof process.versions === "object" &&
            typeof process.versions.node !== "undefined"
        );
    }

    async createSigner() {
        await waitReady()
        const keyring = new Keyring({ type: this.keypairType });
        this.signer = keyring.addFromMnemonic(this.mnemonics);
    }
    updateSource() {
        this.source.twin = this.twin.id;
        this.source.connection = this.session;
    }
    newJWT(session: string) {
        const header = {
            alg: "RS512",
            typ: "JWT"
        };

        const now = Math.ceil(Date.now().valueOf() / 1000);
        const claims = {
            sub: this.twin.id,
            iat: now,
            exp: now + 1000,
            sid: session,
        }
        const jwt = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claims));

        const sigPrefixed = sign(jwt, this.signer);
        const token = jwt + "." + base64url(Buffer.from(sigPrefixed));
        return token;

    }
    updateUrl() {
        // create token from identity
        const token = this.newJWT(this.session)

        // update url with token
        return `${this.relayUrl}?${token}`;


    }


}
export { Client };








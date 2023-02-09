import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Address, Envelope, Request, Response, Error } from "./types/lib/types";
import { waitReady } from '@polkadot/wasm-crypto';
import { v4 as uuidv4 } from 'uuid';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { KeypairType } from "@polkadot/util-crypto/types";
import crypto from 'crypto';
import base64url from "base64url";
import Ws from 'ws';

enum KPType {
    sr25519 = "sr25519",
    ed25519 = "ed25519",

}
class Client {
    signer!: KeyringPair;
    source: Address = new Address();
    twinId: number = 0;
    responses;
    con!: ReconnectingWebSocket;
    mnemonics: string;
    relayUrl: string
    chainUrl: string
    session: string
    keypairType: KeypairType

    constructor(chainUrl: string, relayUrl: string, mnemonics: string, session: string, keypairType: string) {
        this.responses = new Map<string, Envelope>();
        this.mnemonics = mnemonics;
        this.relayUrl = relayUrl;
        this.session = session;
        if (keypairType.toLowerCase().trim().split("")[0] == 's') {
            this.keypairType = KPType.sr25519;
        } else {
            this.keypairType = KPType.ed25519
        }

        this.chainUrl = chainUrl;


    }
    close() {
        if (this.con.readyState != 3) {
            this.con.close();
        }

    }
    reconnect() {
        if (this.con.readyState != 1) {
            this.con.reconnect();
        }

    }
    signEnvelope(envelope: Envelope) {
        const toSign = this.challenge(envelope);

        return this.sign(toSign);
    }
    sign(payload: string | Uint8Array) {
        const typePrefix = this.signer.type === KPType.sr25519 ? "s" : "e";
        const sig = this.signer.sign(payload);
        const prefix = Buffer.from(typePrefix).readUint8(0)
        const sigPrefixed = new Uint8Array([prefix, ...sig]);
        return sigPrefixed;
    }
    challenge(envelope: Envelope) {
        const request = envelope.request;
        const response = envelope.response;
        const err = envelope.error

        let hash = crypto.createHash('md5')
            .update(envelope.uid)
            .update(envelope.tags)
            .update(`${envelope.timestamp}`)
            .update(`${envelope.expiration}`)
            .update(this.challengeAddress(envelope.source))
            .update(this.challengeAddress(envelope.destination))

        if (request) {
            hash = this.challengeRequest(request, hash);
        }
        else if (response) {
            hash = this.challengeResponse(response, hash);
        } else if (err) {
            hash = this.challengeError(err, hash)
        }

        if (envelope.schema) {
            hash.update(envelope.schema);
        }
        if (envelope.federation) {
            hash.update(envelope.federation)
        }
        if (envelope.plain) {
            hash.update(envelope.plain)
        } else if (envelope.cipher) {
            hash.update(envelope.cipher)
        }


        return hash.digest();

    }
    challengeAddress(address: Address | undefined) {
        return `${address?.twin}${address?.connection}`;

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
    newEnvelope(destTwinId: number, requestCommand: string, requestData: any, expirationMinutes: number) {
        const envelope = new Envelope({
            uid: uuidv4(),
            timestamp: Math.round(Date.now() / 1000),
            expiration: expirationMinutes * 60,
            source: new Address({ twin: this.twinId, connection: this.source.connection }),
            destination: new Address({ twin: destTwinId }),
            request: new Request({ command: requestCommand }),
        });

        if (requestData) {
            envelope.plain = new Uint8Array(Buffer.from(JSON.stringify(requestData)));

        }
        envelope.schema = "application/json"
        envelope.signature = this.signEnvelope(envelope)
        return envelope;

    }
    send(requestCommand: string, requestData: any, destinationTwinId: number, expirationMinutes: number) {
        // create new envelope with given data and destination
        const envelope = this.newEnvelope(destinationTwinId, requestCommand, requestData, expirationMinutes);
        // send enevelope binary using socket
        this.con.send(envelope.serializeBinary());
        // add request id to responses map on client object
        this.responses.set(envelope.uid, envelope)
        return envelope.uid;

    }

    read(requestID: string) {
        return new Promise((resolve, reject) => {

            if (this.responses.get(requestID)) {

                const result = setInterval(() => {
                    // check if envelope in map has a response 
                    if (this.responses.get(requestID)?.response) {
                        const dataReceived = this.responses.get(requestID)?.plain;
                        if (dataReceived) {
                            const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceived))
                            const responseString = JSON.parse(decodedData);
                            resolve(responseString);
                            this.responses.delete(requestID);
                            clearInterval(result)
                        }

                    }
                    // check if envelope in map has an error
                    else if (this.responses.get(requestID)?.error) {
                        const err = this.responses.get(requestID)?.error
                        if (err) {
                            reject(`${err.code} ${err.message}`);
                            this.responses.delete(requestID);
                            clearInterval(result)
                        }


                    }


                }, 1000)
            }

        })
    }




    async connect() {
        await this.createSigner();
        await this.getTwinId();
        this.updateUrl();
        this.updateSource();
        // start websocket connection with updated url
        const options = {
            WebSocket: Ws,
            debug: true,
        }
        this.con = new ReconnectingWebSocket(this.relayUrl, [], options);
        this.con.onmessage = (e: any) => {
            console.log("waiting response...");

            const receivedEnvelope = Envelope.deserializeBinary(e.data);

            //verify
            if (this.responses.get(receivedEnvelope.uid)) {
                // update envelope in responses map
                this.responses.set(receivedEnvelope.uid, receivedEnvelope)
            }

        }

    }
    async createSigner() {
        await waitReady()
        const keyring = new Keyring({ type: this.keypairType });
        this.signer = keyring.addFromMnemonic(this.mnemonics);
    }
    updateSource() {
        this.source.twin = this.twinId;
        this.source.connection = this.session;
    }
    newJWT(session: string) {
        const header = {
            alg: "RS512",
            typ: "JWT"
        };

        const now = Math.ceil(Date.now().valueOf() / 1000);
        const claims = {
            sub: this.twinId,
            iat: now,
            exp: now + 1000,
            sid: session,
        }
        const jwt = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claims));

        const sigPrefixed = this.sign(jwt);
        const token = jwt + "." + base64url(Buffer.from(sigPrefixed));
        return token;

    }
    updateUrl() {
        // create token from identity
        const token = this.newJWT(this.session)

        // update url with token
        this.relayUrl = `${this.relayUrl}?${token}`;

    }
    async getTwinId() {
        const provider = new WsProvider(this.chainUrl)
        const cl = await ApiPromise.create({ provider })
        this.twinId = Number(await cl.query.tfgridModule.twinIdByAccountID(this.signer.address));
        cl.disconnect();


    }
}
export { Client };








import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Address, Envelope, Error, Request } from "./types/lib/types";
import { waitReady } from '@polkadot/wasm-crypto';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { KeypairType } from "@polkadot/util-crypto/types";
import base64url from "base64url";
import ClientEnvelope from "./envelope";
import { Buffer } from "buffer"
import { sign, KPType } from './sign'
import { v4 as uuidv4 } from 'uuid';


class Client {
    signer!: KeyringPair;
    source: Address = new Address();
    responses;
    con!: ReconnectingWebSocket;
    mnemonics: string;
    relayUrl: string
    chainUrl: string
    session: string
    keypairType: KeypairType
    twin: any;


    constructor(chainUrl: string, relayUrl: string, mnemonics: string, session: string, keypairType: string) {
        this.responses = new Map<string, ClientEnvelope>();
        this.mnemonics = mnemonics;
        this.relayUrl = relayUrl;
        this.session = session;
        if (keypairType.toLowerCase().trim() == 'sr25519') {
            this.keypairType = KPType.sr25519;
        } else if (keypairType.toLowerCase().trim() == 'ed25519') {
            this.keypairType = KPType.ed25519
        } else {
            throw new Error({ message: "Unsupported Keypair type" })
        }

        this.chainUrl = chainUrl;


    }
    close() {
        if (this.con.readyState != this.con.CLOSED) {
            this.con.close();
        }

    }
    reconnect() {
        if (this.con.readyState != this.con.OPEN) {
            this.con.reconnect();
        }

    }


    send(requestCommand: string, requestData: any, destinationTwinId: number, expirationMinutes: number) {
        // create new envelope with given data and destination
        const envelope = new Envelope({
            uid: uuidv4(),
            timestamp: Math.round(Date.now() / 1000),
            expiration: expirationMinutes * 60,
            source: this.source,
            destination: new Address({ twin: destinationTwinId })
        });
        if (requestCommand) {
            envelope.request = new Request({ command: requestCommand })
        }
        if (requestData) {
            envelope.plain = new Uint8Array(Buffer.from(requestData));

        }
        const clientEnvelope = new ClientEnvelope(this.signer, envelope, this.chainUrl);
        // send enevelope binary using socket
        this.con.send(clientEnvelope.serializeBinary());
        // add request id to responses map on client object
        this.responses.set(clientEnvelope.uid, clientEnvelope)
        return clientEnvelope.uid;

    }

    read(requestID: string) {
        return new Promise(async (resolve, reject) => {
            let envelope: ClientEnvelope = this.responses.get(requestID)
            // check if envelope in map has a response  
            const now = new Date().getTime();
            while (envelope && new Date().getTime() < now + envelope.expiration * 1000) {
                envelope = this.responses.get(requestID)
                if (envelope && envelope.response) {


                    const verified = await envelope.verify(envelope.signature)
                    if (verified) {
                        const dataReceived = envelope.plain;
                        if (dataReceived) {
                            const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceived))
                            const responseString = JSON.parse(decodedData);
                            this.responses.delete(requestID);
                            resolve(responseString);
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
    async connect() {
        await this.createSigner();
        await this.getSourceTwin();
        const url = this.updateUrl();
        this.updateSource();
        // start websocket connection with updated url
        if (!this.con || this.con.readyState != this.con.OPEN) {
            if (this.isEnvNode()) {
                const Ws = require("ws")
                const options = {
                    WebSocket: Ws,
                    // debug: true,
                }
                this.con = new ReconnectingWebSocket(this.updateUrl.bind(this), [], options);
            } else {
                this.con = new ReconnectingWebSocket(this.updateUrl.bind(this));
            }
        }


        this.con.onmessage = async (e: any) => {

            let data: Uint8Array = e.data
            if (!this.isEnvNode()) {
                const buffer = await new Response(e.data).arrayBuffer();
                data = new Uint8Array(buffer)
            }
            const receivedEnvelope = Envelope.deserializeBinary(data);
            // cast received enevelope to client envelope
            const castedEnvelope = new ClientEnvelope(undefined, receivedEnvelope, this.chainUrl)

            //verify
            if (this.responses.get(receivedEnvelope.uid)) {
                // update envelope in responses map
                this.responses.set(receivedEnvelope.uid, castedEnvelope)
            }

        }

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
    async getSourceTwin() {
        const provider = new WsProvider(this.chainUrl)
        const cl = await ApiPromise.create({ provider })
        const twinId = Number(await cl.query.tfgridModule.twinIdByAccountID(this.signer.address));
        this.twin = (await cl.query.tfgridModule.twins(twinId)).toJSON();
        cl.disconnect();

    }

}
export { Client };








import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Address, Envelope, Error } from "./types/lib/types";
import { waitReady } from '@polkadot/wasm-crypto';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { KeypairType } from "@polkadot/util-crypto/types";
import base64url from "base64url";
import ClientEnvelope from "./envelope";
import { Buffer } from "buffer"
import { sign, KPType } from './sign'

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
        this.responses = new Map<string, Envelope>();
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
        const envelope = new ClientEnvelope(this.source, this.signer, destinationTwinId, requestCommand, requestData, expirationMinutes);
        // send enevelope binary using socket
        this.con.send(envelope.serializeBinary());
        // add request id to responses map on client object
        this.responses.set(envelope.uid, envelope)
        return envelope.uid;

    }

    read(requestID: string) {
        return new Promise(async (resolve, reject) => {
            let envelope: Envelope = this.responses.get(requestID)
            // check if envelope in map has a response  
            const now = new Date().getTime();
            while (envelope && new Date().getTime() < now + envelope.expiration * 1000) {
                envelope = this.responses.get(requestID)
                if (envelope && envelope.response) {

                    const dataReceived = envelope.plain;
                    if (dataReceived) {
                        const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceived))
                        const responseString = JSON.parse(decodedData);
                        this.responses.delete(requestID);
                        resolve(responseString);
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
        await this.getTwin();
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
    async getTwin() {
        const provider = new WsProvider(this.chainUrl)
        const cl = await ApiPromise.create({ provider })
        const twinId = Number(await cl.query.tfgridModule.twinIdByAccountID(this.signer.address));
        this.twin = (await cl.query.tfgridModule.twins(twinId)).toJSON()

        cl.disconnect();
    }
}
export { Client };








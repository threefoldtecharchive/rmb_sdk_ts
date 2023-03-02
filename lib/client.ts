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



class Client {
    static connections = new Map<string, Client>();
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



    constructor(chainUrl: string, relayUrl: string, mnemonics: string, session: string, keypairType: string) {
        const key = `${this.relayUrl}:${this.mnemonics}:${this.keypairType}`;
        if (Client.connections.has(key)) {
            return Client.connections.get(key) as Client;
        }

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

        Client.connections.set(key, this);
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
                const castedEnvelope = new ClientEnvelope(undefined, receivedEnvelope, this.chainUrl)

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
        if (this.con) return;

        try {
            await this.createSigner();
            this.twin = await getTwinFromTwinAddress(this.signer.address, this.chainUrl)
            this.updateSource();
            this.createConnection()

            if (this.isEnvNode()) {
                process.on("SIGTERM", this.disconnectAndExit);
                process.on("SIGINT", this.disconnectAndExit);
                process.on("SIGUSR1", this.disconnectAndExit);
                process.on("SIGUSR2", this.disconnectAndExit);
            } else {
                window.onbeforeunload = () => {
                    return "";
                };
                window.onunload = this.disconnect;
            }
        } catch (err) {
            if (this.con && this.con.readyState == this.con.OPEN) {
                this.con.close()
            }
            throw new Error({ message: `Unable to connect due to ${err}` })
        }

    }

    disconnect() {
        for (const connection of Client.connections.values()) {
            connection.con.close()
        }
    }

    disconnectAndExit() {
        this.disconnect();
        process.exit(0);
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
            if (requestData) {
                envelope.plain = new Uint8Array(Buffer.from(requestData));

            }
            const clientEnvelope = new ClientEnvelope(this.signer, envelope, this.chainUrl);
            while (this.con.readyState != this.con.OPEN) {
                try {
                    await this.waitForOpenConnection();

                } catch (er) {
                    this.createConnection()
                }
            }

            // add request id to responses map on client object
            this.responses.set(clientEnvelope.uid, clientEnvelope)
            
            this.con.send(clientEnvelope.serializeBinary());
            
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








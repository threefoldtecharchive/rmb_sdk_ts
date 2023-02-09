/// <reference types="node" />
import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Address, Envelope, Request, Response, Error } from "./types/lib/types";
import { KeypairType } from "@polkadot/util-crypto/types";
import crypto from 'crypto';
declare class Client {
    signer: KeyringPair;
    source: Address;
    twinId: number;
    url: string;
    responses: Map<string, Envelope>;
    con: ReconnectingWebSocket;
    constructor();
    close(): void;
    reconnect(): void;
    signEnvelope(envelope: Envelope): Uint8Array;
    sign(payload: string | Uint8Array): Uint8Array;
    challenge(envelope: Envelope): Buffer;
    challengeAddress(address: Address | undefined): string;
    challengeError(err: Error, hash: crypto.Hash): crypto.Hash;
    challengeRequest(request: Request, hash: crypto.Hash): crypto.Hash;
    challengeResponse(response: Response, hash: crypto.Hash): crypto.Hash;
    newEnvelope(destTwinId: number, requestCommand: string, requestData: any, expirationMinutes: number): Envelope;
    send(requestCommand: string, requestData: any, destinationTwinId: number, expirationMinutes: number): string;
    listen(requestID: string, callback: (x: any) => void): void;
    connect(url: string, session: string, mnemonics: string, accountType: KeypairType): Promise<void>;
    createSigner(mnemonics: string, accountType: KeypairType): Promise<void>;
    updateSource(session: string): void;
    newJWT(session: string): string;
    updateUrl(url: string, session: string): void;
    getTwinId(): Promise<void>;
}
export { Client };
//# sourceMappingURL=client.d.ts.map
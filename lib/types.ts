import { KeyringPair } from "@polkadot/keyring/types";
import { Address } from "./types/types_pb";

export interface directClientInterface {
    source: Address,
    signer: KeyringPair,
    twinId: number,
    url: string,
    responses: Map<any, any>
}
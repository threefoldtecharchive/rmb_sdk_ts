import { ApiPromise, WsProvider } from '@polkadot/api';
import * as cryptoJs from 'crypto-js';

import * as secp from '@noble/secp256k1';
import * as  bip39 from 'bip39'
export async function createGridCL(chainUrl: string) {
    const provider = new WsProvider(chainUrl)
    const cl = await ApiPromise.create({ provider })
    return cl;
}
export function getPublicKey(mnemonic: string) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const privKey = new Uint8Array(seed).slice(0, 32);
    const pk = Buffer.from(secp.getPublicKey(privKey, true)).toString("hex");
    return pk;
}
export async function getTwinFromTwinID(api: ApiPromise, twinId: number) {
    return (await api.query.tfgridModule.twins(twinId)).toJSON();
}
export async function getTwinFromTwinAddress(api: ApiPromise, address: string) {
    const twinId = await api.query.tfgridModule.twinIdByAccountID(address);
    return (await api.query.tfgridModule.twins(Number(twinId))).toJSON();
}

export function hexStringToArrayBuffer(hexString) {
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
export function wordArrayToUint8Array(data: cryptoJs.lib.WordArray) {
    const dataArray = new Uint8Array(data.sigBytes)
    for (let i = 0x0; i < data.sigBytes; i++) {
        dataArray[i] = data.words[i >>> 0x2] >>> 0x18 - i % 0x4 * 0x8 & 0xff;
    }
    return new Uint8Array(dataArray);

}
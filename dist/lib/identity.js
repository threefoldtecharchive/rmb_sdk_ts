"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdentity = exports.KeypairType = void 0;
const keyring_1 = __importDefault(require("@polkadot/keyring"));
var KeypairType;
(function (KeypairType) {
    KeypairType["sr25519"] = "sr25519";
    KeypairType["ed25519"] = "ed25519";
})(KeypairType = exports.KeypairType || (exports.KeypairType = {}));
function createIdentity(mnemonics, accountType) {
    const keyring = new keyring_1.default({ type: accountType === KeypairType.sr25519 ? 'sr25519' : 'ed25519' });
    const keypair = keyring.addFromMnemonic(mnemonics);
    return keypair;
}
exports.createIdentity = createIdentity;

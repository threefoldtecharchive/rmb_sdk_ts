"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const connect_1 = require("../../lib/connect");
const direct_1 = require("../../lib/direct");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // create client 
        const client = yield (0, direct_1.createDirectClient)(`wss://relay.dev.grid.tf/`, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519');
        // connect socket
        const socket = (0, connect_1.connect)(client);
        // send request
        const requestID = (0, direct_1.sendDirectRequest)(client, socket, "calculator.add", [10.6, 20], 1292);
        // get response
        const response = yield (0, connect_1.listening)(requestID, client, socket);
        // print response
        console.log(response);
    });
}
main();

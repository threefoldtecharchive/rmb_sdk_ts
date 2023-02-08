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
const client_1 = require("../../lib/client");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // create client 
        const client = new client_1.Client();
        // connect socket
        yield client.connect(`ws://localhost:8080/`, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519');
        console.log(client.con);
        // send request
        const requestID = client.send("calculator.add", [10.6, 20], 1292, 5);
        // get response
        client.listen(requestID, (x) => { console.log(x); });
    });
}
main();

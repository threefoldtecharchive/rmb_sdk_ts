import { connect, listening } from "../../lib/connect";
import { createDirectClient, sendDirectRequest } from "../../lib/direct";


async function main() {

    // create client 
    const client = await createDirectClient(`ws://localhost:8080/`, "test_client", "<mnemonics_here>", 'sr25519');
    // connect socket
    const socket = connect(client);
    // send request
    const requestID = sendDirectRequest(client, socket, "calculator.add", [10.6, 20], 1292);
    // listen
    listening(requestID, client, socket);
}



main();
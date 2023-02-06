import { connect, listening } from "../../lib/connect";
import { createDirectClient, sendDirectRequest } from "../../lib/direct";


async function main() {

    // create client 
    const client = await createDirectClient(`ws://localhost:8080/`, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519');
    // connect socket
    const socket = connect(client);
    // send request
    const requestID = sendDirectRequest(client, socket, "calculator.add", [10.6, 20], 1292);
    // get response
    const response = await listening(requestID, client, socket);
    // print response
    console.log(response);
}



main();
import { createClient, connect, sendRequest } from "../../lib/direct";

async function main() {
    // create client 
    const client = await createClient(`ws://localhost:8080/`, 1206, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519');
    // start ws connection 
    const socket = connect(client)

    // send request
    sendRequest(1206, client, socket, "calculator.add", [10.6, 20], 1292);
    // add request to client map 
    // get response to request

}



main();
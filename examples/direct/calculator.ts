import { Client } from "../../lib/client";


async function main() {

    // create client 
    const client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "drama govern gossip audit mixed silent voice mule wonder protect latin idea", "test_client", 'sr25519')

    // connect socket
    await client.connect()

    // send request
    const requestID = client.send("calculator.add", [10.6, 20], 1292, 5);
    // get response
    const response = await client.read(requestID);
    console.log(response)

}



main();
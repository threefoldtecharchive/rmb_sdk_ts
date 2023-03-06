import { Client } from "../../lib/client";


async function main() {
    let client;
    try {
        // create client 
        client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "first burst keep saddle canvas diesel oil truly raven action crawl discover", "test_client", 'sr25519')

        // connect socket
        await client.connect()
        // send request
        // const requestID = await client.send("zos.deployment.get", JSON.stringify({ "contract_id": 1 }), 17, 5);
        const requestID = await client.send("zos.system.version", "", 17, 5);

        // get response
        const response = await client.read(requestID);
        // print response
        console.log(response)
    } catch (err) {
        throw new Error(`RMB Client connection failed due to ${err}`)
    } finally {
        client.close();
    }


}



main();
import { Client } from "../../lib/client";


async function main() {
    let client;
    try {
        // create client 
        client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "route visual hundred rabbit wet crunch ice castle milk model inherit outside", "test_client", 'sr25519')
        // client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "drama govern gossip audit mixed silent voice mule wonder protect latin idea", "test_client", 'sr25519')
        // connect socket
        await client.connect()
        // send request
        // const requestID = await client.send("zos.statistics.get", undefined, 17, 5)
        // const requestID = await client.send("zos.deployment.get", JSON.stringify({ "contract_id": 1 }), 17, 5);
        // const requestID = await client.send("zos.system.version", "", 17, 5);
        const requestID = await client.send("zos.deployment.get", JSON.stringify({ "contract_id": 19038 }), 22, 5);
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
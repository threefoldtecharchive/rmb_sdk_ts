import { Client } from "../../lib/client";


async function main() {
    // create client 
    const client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "drama govern gossip audit mixed silent voice mule wonder protect latin idea", "test_client", 'sr25519', 5);

    try {

        // connect socket
        await client.connect()
        // send request
        const requestID = await client.send("zos.statistics.get", undefined, 17, 5)
        // const requestID = await client.send("zos.deployment.get", JSON.stringify({ "contract_id": 1 }), 17, 5);
        // const requestID = await client.send("zos.system.version", "", 17, 5);
        // const requestID = await client.send("zos.deployment.get", JSON.stringify({ "contract_id": 19465 }), 22, 5);
        // get response

        const response = await client.read(requestID);
        // print response
        console.log({ response })
    } catch (err) {
        throw new Error(`RMB Client connection failed due to ${err}`)
    } finally {
        client.close();
    }
}

main()
    .then(() => console.log("Done."));
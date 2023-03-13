import { Client } from "../../lib/client";


async function main() {
    // create client 
    const client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "<mnemonics>", "test_client", 'sr25519', 5);

    try {

        // connect socket
        await client.connect()
        // send request
        const requestID = await client.send("zos.deployment.get", JSON.stringify({ "contract_id": 19038 }), 22, 5);
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
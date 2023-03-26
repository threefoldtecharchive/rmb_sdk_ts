import { Client } from "../../lib/client";


async function main() {
    // create client 
    const client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "cram donkey act assist hybrid spring soft asthma fragile amateur lucky timber", "test_client", 'sr25519', 5);

    try {

        // connect socket
        await client.connect()
        // send request
        const requestID = await client.send("zos.statistics.get", undefined, 17, 5)

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
import { Client } from "../../lib/client";

async function main() {
  // create client
  const client = new Client(
    "wss://tfchain.dev.grid.tf/ws",
    `wss://relay.dev.grid.tf/`,
    "drama govern gossip audit mixed silent voice mule wonder protect latin idea",
    "test_client",
    "sr25519",
    5
  );

  try {
    // connect socket
    await client.connect();
    // send request
    console.log("Sending");
    const requestID = await client.ping(17, 5);
    console.log("Sent", requestID);

    // get response
    console.log("Reading...", client.con.readyState === client.con.OPEN);
    const response = await client.read(requestID);
    console.log("Read");

    // print response
    console.log({ response });
  } catch (err) {
    throw new Error(`RMB Client connection failed due to ${err}`);
  } finally {
    client.close();
  }
}

main().then(() => console.log("Done."));

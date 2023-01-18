import Keyring from "@polkadot/keyring";
import { newClient } from "../../lib/direct";

async function main() {

    // create client
    const client = await newClient(`wss://relay.dev.grid.tf/`, 7, "test_client", "sr", "cram donkey act assist hybrid spring soft asthma fragile amateur lucky timber");
    console.log('Connected', client)
}
main()
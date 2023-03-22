## RMB TS CLIENT
This is a `Typescript` client that can be used to build both **services**, and **clients**
that can talk over the `rmb`.

[RMB](https://github.com/threefoldtech/rmb-rs) is a message bus that enable secure
and reliable `RPC` calls across the globe.

This client can do the following: 
- send requests over the distrubed `rmb-relay`.
- receive and verify responses to sent requests.

An example of this client usage is defined under
[examples](examples/direct/node.ts).

### Built with 
- Typescript

### Getting Started

To get a local copy up and running following these simple steps: 
- Open Terminal
- Change the current working directory to the location you want the cloned directory.
- Enter the following:
``` 
git clone https://github.com/threefoldtech/rmb-sdk-ts.git
```
- Press Enter to create your local clone.

- Navigate to the cloned repository by running:

```
cd rmb-sdk-ts
```
- Then run the following to start the client:
```
yarn install
yarn start
```
### Prerequisites:
- Node.js
- Git
- Yarn

### Contributors

Contributions, issues, and feature requests are welcome!

Feel free to check the [issues page](https://github.com/threefoldtech/rmb-sdk-ts/issues).

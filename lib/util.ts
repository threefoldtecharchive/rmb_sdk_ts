import { ApiPromise, WsProvider } from '@polkadot/api'
export async function createGridCL(chainUrl: string) {
    const provider = new WsProvider(chainUrl)
    const cl = await ApiPromise.create({ provider })
    return cl;
}
export async function getTwinFromTwinID(twinId: number, chainUrl: string) {
    const cl = await createGridCL(chainUrl)
    const twin = (await cl.query.tfgridModule.twins(twinId)).toJSON();
    cl.disconnect();
    return twin;
}
export async function getTwinFromTwinAddress(address: string, chainUrl: string) {
    const cl = await createGridCL(chainUrl)
    const twinId = Number(await cl.query.tfgridModule.twinIdByAccountID(address));
    const twin = (await cl.query.tfgridModule.twins(twinId)).toJSON();
    cl.disconnect();
    return twin;
}
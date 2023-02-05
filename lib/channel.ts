import { call, start } from '@cuillere/core'

const CHANS = Symbol('CHANS')

const CHAN = Symbol('CHAN')
export const chan = () => {
    return {
        [CHAN]: true
    }
}

let nextChanId = 1
const chanKey = () => new String(`chan #${nextChanId++}`)

const RECV = Symbol('RECV')
export const recv = (chanKey) => {
    return {
        [RECV]: true,
        chanKey,
    }
}

const SEND = Symbol('SEND')
export const send = (chanKey, value) => {
    return {
        [SEND]: true,
        chanKey,
        value,
    }
}

export const channelMiddleware = () => (next, ctx) => async operation => {
    if (start(operation)) ctx[CHANS] = new WeakMap()

    if (operation[CHAN]) {
        const key = chanKey()
        ctx[CHANS].set(key, {
            recvQ: [],
            sendQ: [],
        })
        return key
    }

    if (operation[RECV]) {
        const chanState = ctx[CHANS].get(operation.chanKey)

        const sender = chanState.sendQ.shift()
        if (sender) return sender()

        return new Promise(resolve => {
            chanState.recvQ.push(resolve)
        })
    }

    if (operation[SEND]) {
        const chanState = ctx[CHANS].get(operation.chanKey)

        const recver = chanState.recvQ.shift()
        if (recver) {
            recver(operation.value)
            return
        }

        return new Promise<void>(resolve => {
            chanState.sendQ.push(() => {
                resolve()
                return operation.value
            })
        })
    }

    return next(operation)
}
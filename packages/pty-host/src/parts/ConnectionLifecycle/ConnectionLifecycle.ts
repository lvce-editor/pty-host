import * as PtyController from '../PtyController/PtyController.ts'

const ready = Promise.withResolvers<void>()
const state: { parent?: any } = {}

export const setParent = (rpc: any): void => {
  state.parent = rpc
  ready.resolve()
}

const release = async (id: number): Promise<void> => {
  if (!state.parent) await ready.promise
  state.parent.send('PtyHost.release', id)
}

export const connect = async (
  handle: any,
  id: number | undefined,
  create: () => Promise<any>,
): Promise<void> => {
  let closed = false
  let rpc: any
  const onClose = (): void => {
    if (closed) return
    closed = true
    handle.off('close', onClose)
    if (rpc) PtyController.disposeConnection(rpc.ipc)
    if (id !== undefined) void release(id)
  }
  handle.on('close', onClose)
  try {
    rpc = await create()
    if (closed) {
      PtyController.disposeConnection(rpc.ipc)
      await rpc.dispose()
    }
  } catch (error) {
    onClose()
    throw error
  }
}

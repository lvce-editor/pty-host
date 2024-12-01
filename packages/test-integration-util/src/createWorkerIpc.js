import { IpcParentWithNodeWorker } from '@lvce-editor/ipc'
import * as JsonRpc from '@lvce-editor/json-rpc'
import { fileURLToPath } from 'node:url'
import { MessageChannel } from 'node:worker_threads'

export const createWorkerIpc = async (workerPath) => {
  const workerUrl = fileURLToPath(new URL('./worker.js', import.meta.url))
  const rawIpc = await IpcParentWithNodeWorker.create({
    path: workerUrl,
  })
  const ipc = IpcParentWithNodeWorker.wrap(rawIpc)

  ipc.addEventListener('message', (event) => {
    // @ts-ignore
    const message = event.data
    JsonRpc.resolve(message.id, message)
  })

  const { port1, port2 } = new MessageChannel()
  await JsonRpc.invokeAndTransfer(ipc, 'loadEditorWorker', workerPath, port1)
  return {
    port: port2,
    ipc,
  }
}

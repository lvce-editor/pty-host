import * as JsonRpc from '@lvce-editor/json-rpc'
import { createMessagePortIpc } from './createMessagePortIpc.js'
import { createWorkerIpc } from './createWorkerIpc.js'

export const createWorker = async (workerPath, commandMap) => {
  const { port, ipc } = await createWorkerIpc(workerPath)
  const innerIpc = await createMessagePortIpc(port, commandMap)
  return {
    invoke(method, ...params) {
      return JsonRpc.invoke(innerIpc, method, ...params)
    },
    dispose() {
      ipc.dispose()
    },
  }
}

import * as JsonRpc from '@lvce-editor/json-rpc'

export const createMessagePortIpc = async (port, commandMap) => {
  const ipc = {
    send(message) {
      port.postMessage(message)
    },
    dispose() {
      port.close()
      process.exit(0)
    },
  }
  port.addEventListener('message', async (event) => {
    const message = event.data
    if (message.method) {
      const fn = commandMap[message.method]
      if (!fn) {
        throw new Error(`command ${message.method} not found`)
      }
      const result = await fn(...message.params)
      port.postMessage({
        jsonrpc: '2.0',
        result,
        id: message.id,
      })
    } else {
      JsonRpc.resolve(message.id, message)
    }
  })
  return ipc
}

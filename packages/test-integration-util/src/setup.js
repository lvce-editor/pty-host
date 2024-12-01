import { createWorker } from './createWorker.js'

const workerPath = new URL(
  '../../../.tmp/dist/dist/ptyHostMain.js',
  import.meta.url,
).toString()

// const getResult = (method, ...params) => {
//   return null
// }

// const handleMessage = (event) => {
//   const { data, target } = event
//   if (data.id) {
//     const result = getResult(data.method, ...data.params)
//     target.postMessage({
//       jsonrpc: '2.0',
//       id: data.id,
//       result,
//     })
//   }
// }

const createWrappedRpc = (rpc) => {
  return rpc
}

export const setup = async () => {
  const commandMap = {}
  const rpc = await createWorker(workerPath, commandMap)
  const wrapped = createWrappedRpc(rpc)
  return wrapped
}

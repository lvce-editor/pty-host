const connections = new WeakMap<object, Map<number, any>>()

export const set = (ipc: object, id: number, pty: any): void => {
  let terminals = connections.get(ipc)
  if (!terminals) {
    terminals = new Map()
    connections.set(ipc, terminals)
  }
  terminals.set(id, pty)
}

export const get = (ipc: object, id: number): any => connections.get(ipc)?.get(id)

export const remove = (ipc: object, id: number): void => {
  connections.get(ipc)?.delete(id)
}

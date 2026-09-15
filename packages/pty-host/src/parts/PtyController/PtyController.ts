import * as Assert from '../Assert/Assert.ts'
import * as Pty from '../Pty/Pty.ts'
import * as PtyState from '../PtyState/PtyState.ts'

const connections = new WeakMap<object, Set<{ pty?: any; closed: boolean }>>()
const cleanup = new WeakMap<object, () => void>()
const closedConnections = new WeakSet<object>()

export const disposeConnection = (ipc: object): void => {
  closedConnections.add(ipc)
  const entries = connections.get(ipc)
  connections.delete(ipc)
  if (!entries) return
  for (const entry of entries) {
    entry.closed = true
    if (entry.pty) {
      cleanup.get(entry.pty)?.()
      entry.pty.dispose()
    }
  }
}

// TODO maybe merge pty and pty controller
export const createWithDependencies = async (
  ipc,
  id,
  cwd,
  command,
  args,
  createPty,
) => {
  Assert.number(id)
  Assert.string(cwd)
  Assert.string(command)
  Assert.array(args)
  Assert.object(ipc)
  if (closedConnections.has(ipc)) throw new Error('Terminal connection closed')
  let entries = connections.get(ipc)
  if (!entries) {
    entries = new Set()
    connections.set(ipc, entries)
  }
  const entry: { pty?: any; closed: boolean } = { closed: false }
  entries.add(entry)
  let pty: any
  try {
    pty = await createPty({ args, command, cwd })
  } catch (error) {
    entries.delete(entry)
    throw error
  }
  entry.pty = pty
  if (entry.closed) {
    pty.dispose()
    throw new Error('Terminal connection closed')
  }
  const handleData = (event) => {
    if (entry.closed) return
    ipc.send({
      jsonrpc: '2.0',
      method: 'Viewlet.send',
      params: [id, 'handleData', event.data],
    })
  }
  const handleExit = (event) => {
    entries.delete(entry)
    if (PtyState.get(id) === pty) PtyState.remove(id)
    if (entry.closed) return
    ipc.send({
      jsonrpc: '2.0',
      method: 'Viewlet.send',
      params: [id, 'handleExit', event.data],
    })
  }

  cleanup.set(pty, () => {
    entry.closed = true
    entries.delete(entry)
    pty.removeEventListener('data', handleData)
    pty.removeEventListener('exit', handleExit)
    if (PtyState.get(id) === pty) PtyState.remove(id)
    cleanup.delete(pty)
  })
  pty.addEventListener('data', handleData)
  pty.addEventListener('exit', handleExit, { once: true })
  PtyState.set(id, pty)
}

export const create = (ipc, id, cwd, command, args) => {
  return createWithDependencies(ipc, id, cwd, command, args, Pty.create)
}

export const write = (id, data) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }
  pty.write(data)
}

export const resize = (id, columns, rows) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }
  pty.resize(columns, rows)
}

export const dispose = (id) => {
  const pty = PtyState.get(id)
  if (!pty) {
    return
  }
  cleanup.get(pty)?.()
  pty.dispose()
  if (PtyState.get(id) === pty) PtyState.remove(id)
}

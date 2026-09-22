import { SerializeAddon } from '@xterm/addon-serialize'
import { Terminal } from '@xterm/headless'
import * as PtyState from '../PtyState/PtyState.ts'

// Capability tokens are accepted only over a server-authenticated SSH transport.
const authorized = new WeakSet<object>()
const bindings = new WeakMap<object, Set<Binding>>()
const sessions = new Map<string, Session>()
export const reconnectTimeout = 120_000
const maxSessions = 128

interface Binding {
  cancel?: () => void
  id: number
  ipc: any
  ready: boolean
  session: Session
  terminal: any
}
interface Session {
  binding?: Binding
  destroyed: boolean
  onData: (event: any) => void
  onExit: (event: any) => void
  opening: Promise<void>
  pty?: any
  queuedBytes: number
  released?: () => void
  screen: Terminal
  serializer: SerializeAddon
  timer?: ReturnType<typeof setTimeout>
  token: string
}

export const authorize = (ipc: object): void => {
  authorized.add(ipc)
}

const send = (binding: Binding, method: string, data: unknown): void => {
  binding.ipc.send({
    jsonrpc: '2.0',
    method: 'Viewlet.send',
    params: [binding.id, method, data],
  })
}

const unbind = (session: Session): void => {
  const { binding } = session
  if (!binding) return
  binding.cancel?.()
  bindings.get(binding.ipc)?.delete(binding)
  if (PtyState.get(binding.ipc, binding.id) === binding.terminal)
    PtyState.remove(binding.ipc, binding.id)
  session.binding = undefined
}

const cancelExpiry = (session: Session): void => {
  clearTimeout(session.timer)
  session.timer = undefined
  session.released?.()
  session.released = undefined
}

const destroy = (session: Session, kill: boolean): void => {
  if (session.destroyed) return
  session.destroyed = true
  sessions.delete(session.token)
  unbind(session)
  cancelExpiry(session)
  session.pty?.removeEventListener('data', session.onData)
  session.pty?.removeEventListener('exit', session.onExit)
  session.screen.dispose()
  if (kill) session.pty?.dispose()
}

const detach = (session: Session): Promise<void> => {
  unbind(session)
  return new Promise((resolve) => {
    session.released = resolve
    session.timer = setTimeout(destroy, reconnectTimeout, session, true)
    session.timer.unref?.()
  })
}

export const detachConnection = (ipc: object): Promise<void> | undefined => {
  const owned = bindings.get(ipc)
  bindings.delete(ipc)
  authorized.delete(ipc)
  if (!owned?.size) return undefined
  return (async () => {
    await Promise.all(Array.from(owned, ({ session }) => detach(session)))
  })()
}

const newSession = (token: string, createPty: () => Promise<any>): Session => {
  const screen = new Terminal({
    allowProposedApi: true,
    cols: 80,
    rows: 24,
    scrollback: 1000,
  })
  const serializer = new SerializeAddon()
  screen.loadAddon(serializer)
  const session: Session = {
    destroyed: false,
    onData(event) {
      if (session.destroyed) return
      const { data } = event
      session.queuedBytes += data.length
      // Stop reading from the PTY until xterm has consumed queued output.
      if (session.queuedBytes >= 65_536) session.pty.pause()
      screen.write(data, () => {
        if (session.destroyed) return
        session.queuedBytes -= data.length
        if (session.queuedBytes < 65_536) session.pty.resume()
        if (session.binding?.ready) send(session.binding, 'handleData', data)
      })
    },
    onExit(event) {
      // Flush output before reporting exit; detached exits are reclaimed immediately.
      screen.write('', () => {
        if (session.destroyed) return
        if (session.binding) send(session.binding, 'handleExit', event.data)
        destroy(session, false)
      })
    },
    opening: Promise.resolve(),
    queuedBytes: 0,
    screen,
    serializer,
    token,
  }
  sessions.set(token, session)
  session.opening = (async () => {
    try {
      const pty = await createPty()
      if (session.destroyed) {
        pty.dispose()
        return
      }
      session.pty = pty
      pty.addEventListener('data', session.onData)
      pty.addEventListener('exit', session.onExit)
    } catch (error) {
      destroy(session, false)
      throw error
    }
  })()
  return session
}

export const create = async (
  ipc: any,
  id: number,
  token: string,
  restoreOnly: boolean,
  createPty: () => Promise<any>,
): Promise<{ attached: boolean }> => {
  if (!authorized.has(ipc))
    throw new Error(
      'Persistent terminals require an authenticated SSH connection',
    )
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    throw new Error('Invalid terminal session capability')
  if (PtyState.get(ipc, id)) throw new Error('Terminal id already exists')
  let session = sessions.get(token)
  if (!session) {
    if (restoreOnly) return { attached: false }
    if (sessions.size >= maxSessions)
      throw new Error('Too many persistent terminals')
    session = newSession(token, createPty)
  }
  const current = session
  // Replace the old binding atomically. Old close/dispose messages no longer own it.
  unbind(current)
  cancelExpiry(current)
  const binding: Binding = {
    id,
    ipc,
    ready: false,
    session: current,
    terminal: undefined,
  }
  binding.terminal = {
    dispose() {
      if (current.binding === binding) destroy(current, true)
    },
    resize(columns: number, rows: number) {
      if (
        !Number.isSafeInteger(columns) ||
        !Number.isSafeInteger(rows) ||
        columns < 2 ||
        rows < 1 ||
        columns > 500 ||
        rows > 200
      ) {
        throw new Error('Invalid persistent terminal dimensions')
      }
      if (current.binding !== binding || !binding.ready) return
      current.screen.resize(columns, rows)
      current.pty.resize(columns, rows)
    },
    write(data: string) {
      if (current.binding === binding && binding.ready) current.pty.write(data)
    },
  }
  current.binding = binding
  let owned = bindings.get(ipc)
  if (!owned) {
    owned = new Set()
    bindings.set(ipc, owned)
  }
  owned.add(binding)
  PtyState.set(ipc, id, binding.terminal)
  await current.opening
  if (current.destroyed || current.binding !== binding)
    return { attached: false }
  return new Promise((resolve) => {
    binding.cancel = () => resolve({ attached: false })
    current.screen.write('', () => {
      if (current.destroyed || current.binding !== binding) {
        resolve({ attached: false })
        return
      }
      send(binding, 'handleRestore', {
        columns: current.screen.cols,
        data: current.serializer.serialize(),
        rows: current.screen.rows,
      })
      binding.cancel = undefined
      binding.ready = true
      resolve({ attached: true })
    })
  })
}

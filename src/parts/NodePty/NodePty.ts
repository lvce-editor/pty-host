import { spawn } from 'node-pty'
import { VError } from '../VError/VError.js'
import * as Assert from '../Assert/Assert.js'

class DataEvent extends Event {
  data: any
  constructor(data) {
    super('data')
    this.data = data
  }
}

class ExitEvent extends Event {
  data: any
  constructor(data) {
    super('exit')
    this.data = data
  }
}

class Pty extends EventTarget {
  pty: any
  /**
   *
   * @param {import('node-pty').IPty} pty
   */
  constructor(pty) {
    super()
    this.pty = pty

    const handleData = (data) => {
      this.dispatchEvent(new DataEvent(data))
    }
    const handleExit = (data) => {
      this.dispatchEvent(new ExitEvent(data))
    }
    this.pty.onData(handleData)
    this.pty.onExit(handleExit)
  }

  resize(columns, rows) {
    this.pty.resize(columns, rows)
  }

  dispose() {
    this.pty.kill()
  }

  write(data) {
    this.pty.write(data)
  }
}

/**
 *
 * @param {*} param0
 * @returns {any}
 */
export const create = ({ env = {}, cwd, command, args }: any = {}) => {
  try {
    Assert.string(cwd)
    Assert.string(command)
    Assert.array(args)
    const pty = spawn(command, args, {
      encoding: null,
      cwd,
      // cols: 10,
      // rows: 10,
    })
    const wrapped = new Pty(pty)
    return wrapped
  } catch (error) {
    throw new VError(error, `Failed to create terminal`)
  }
}

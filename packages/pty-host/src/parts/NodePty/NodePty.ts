import { fileURLToPath } from 'node:url'
import * as Assert from '../Assert/Assert.ts'
import { getChildEnv } from '../GetChildEnv/GetChildEnv.ts'
import { PtyInstance } from '../PtyInstance/PtyInstance.ts'
import { resolveWindowsCommand } from '../ResolveWindowsCommand/ResolveWindowsCommand.ts'
import { VError } from '../VError/VError.ts'

const toPath = (pathOrUri: string) => {
  if (pathOrUri && pathOrUri.startsWith('file://')) {
    return fileURLToPath(pathOrUri)
  }
  return pathOrUri
}

/**
 *
 * @param {*} param0
 * @returns {Promise<any>}
 */
export const create = async ({ args, command, cwd, env }: any = {}) => {
  try {
    Assert.string(cwd)
    Assert.string(command)
    Assert.array(args)
    const { spawn } = await import('node-pty')

    const cwdPath = toPath(cwd)

    const childEnv = getChildEnv(env)
    let executable = command
    if (process.platform === 'win32') {
      const pathOverride = Object.entries(env || {}).find(
        ([key]) => key.toLowerCase() === 'path',
      )
      const searchPath = pathOverride
        ? String(pathOverride[1])
        : process.env.PATH || ''
      // CreateProcess searches System32 before PATH for bare names, even though
      // node-pty validates a PATH match first. Pass that match to the spawn too.
      executable = await resolveWindowsCommand(command, cwdPath, searchPath)
    }

    const pty = spawn(executable, args, {
      cwd: cwdPath,
      encoding: null,
      env: childEnv,
      // cols: 10,
      // rows: 10,
    })
    const wrapped = new PtyInstance(pty)
    return wrapped
  } catch (error) {
    throw new VError(error, `Failed to create terminal`)
  }
}

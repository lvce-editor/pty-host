import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as Assert from '../Assert/Assert.ts'

const toPath = (pathOrUri: string) => {
  if (pathOrUri.startsWith('file://')) {
    return fileURLToPath(pathOrUri)
  }
  return pathOrUri
}

const toString = (chunks: readonly Uint8Array[]) => {
  return Buffer.concat(chunks).toString()
}

export const executeShellCommand = async ({
  args,
  cwd,
  toSpawn,
}: {
  args: readonly string[]
  cwd: string
  toSpawn: string
}) => {
  Assert.array(args)
  Assert.string(cwd)
  Assert.string(toSpawn)

  try {
    return await new Promise<
      | {
          exitCode: number | null
          stderr: string
          stdout: string
        }
      | {
          error: unknown
        }
    >((resolve) => {
      const childProcess = spawn(toSpawn, args, {
        cwd: toPath(cwd),
      })
      const stdoutChunks: Uint8Array[] = []
      const stderrChunks: Uint8Array[] = []

      childProcess.stdout.on('data', (chunk) => {
        stdoutChunks.push(chunk)
      })

      childProcess.stderr.on('data', (chunk) => {
        stderrChunks.push(chunk)
      })

      childProcess.on('error', (error) => {
        resolve({ error })
      })

      childProcess.on('close', (exitCode) => {
        resolve({
          exitCode,
          stderr: toString(stderrChunks),
          stdout: toString(stdoutChunks),
        })
      })
    })
  } catch (error) {
    return {
      error,
    }
  }
}

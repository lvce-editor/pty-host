import { stat } from 'node:fs/promises'
import { win32 } from 'node:path'

const isFile = async (path: string): Promise<boolean> => {
  try {
    const info = await stat(path)
    return info.isFile()
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException
    if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error
    return false
  }
}

export const resolveWindowsCommand = async (
  command: string,
  cwd: string,
  searchPath: string,
): Promise<string> => {
  if (win32.isAbsolute(command)) return command
  const directories = /[/\\]/.test(command)
    ? [cwd]
    : searchPath.split(';').filter(Boolean)
  const names = win32.extname(command) ? [command] : [command, `${command}.exe`]
  for (const directory of directories) {
    for (const name of names) {
      const candidate = win32.resolve(
        cwd,
        directory.replace(/^"(.*)"$/, '$1'),
        name,
      )
      if (await isFile(candidate)) return candidate
    }
  }
  throw new Error(`Executable not found: ${command}`)
}

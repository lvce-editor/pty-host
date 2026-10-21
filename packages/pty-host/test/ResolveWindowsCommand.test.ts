import { expect, test } from '@jest/globals'
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as Pty from '../src/parts/Pty/Pty.ts'
import { resolveWindowsCommand } from '../src/parts/ResolveWindowsCommand/ResolveWindowsCommand.ts'

test('runs the PATH executable before a System32 executable with the same name', async () => {
  if (process.platform !== 'win32') return
  const root = await mkdtemp(join(tmpdir(), 'lvce pty path '))
  let pty
  try {
    const bin = join(root, 'runtime bin')
    const cwd = join(root, 'working directory')
    await mkdir(bin)
    await mkdir(cwd)
    await copyFile(process.execPath, join(bin, 'cmd.exe'))
    pty = await Pty.create({
      args: [
        '-e',
        `process.stdin.resume(); console.log(process.argv[1] === 'literal & $ argument' && process.cwd() === ${JSON.stringify(cwd)} ? 'path-resolution-ok' : 'wrong argument or cwd')`,
        'literal & $ argument',
      ],
      command: 'cmd.exe',
      cwd,
      env: { PATH: `${bin};${process.env.PATH}` },
    })
    let output = ''
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Unexpected terminal output: ${output}`)),
        10_000,
      )
      pty.addEventListener('data', (event) => {
        output += event.data
        if (output.includes('path-resolution-ok')) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })
    expect(output).toContain('path-resolution-ok')
  } finally {
    if (pty) {
      const exited = new Promise<void>((resolve) => {
        pty.addEventListener('exit', () => resolve(), { once: true })
      })
      pty.dispose()
      await exited
    }
    await rm(root, { force: true, recursive: true })
  }
})

test('resolves quoted and final PATH entries, implicit exe names and relative paths', async () => {
  if (process.platform !== 'win32') return
  const root = await mkdtemp(join(tmpdir(), 'lvce pty resolution '))
  try {
    const bin = join(root, 'runtime bin')
    await mkdir(bin)
    const executable = join(bin, 'runner.exe')
    await copyFile(process.execPath, executable)
    expect(
      await resolveWindowsCommand('runner', root, `C:\\missing;"${bin}"`),
    ).toBe(executable)
    expect(
      await resolveWindowsCommand('runtime bin\\runner.exe', root, ''),
    ).toBe(executable)
    expect(await resolveWindowsCommand(executable, root, '')).toBe(executable)
    await expect(
      resolveWindowsCommand('missing.exe', root, bin),
    ).rejects.toThrow('Executable not found')
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

import { expect, test } from '@jest/globals'
import { getChildEnv } from '../src/parts/GetChildEnv/GetChildEnv.ts'

test('inherits the parent environment and applies overrides without mutation', () => {
  const parentEnv = { EXISTING: 'parent', OVERRIDDEN: 'parent' }
  const overrides = { CHILD: 'child', OVERRIDDEN: 'child' }
  const result = getChildEnv(overrides, 'linux', parentEnv)

  expect(result).toEqual({ CHILD: 'child', EXISTING: 'parent', OVERRIDDEN: 'child' })
  expect(parentEnv).toEqual({ EXISTING: 'parent', OVERRIDDEN: 'parent' })
  expect(overrides).toEqual({ CHILD: 'child', OVERRIDDEN: 'child' })
})

test('uses the parent environment when overrides are absent or empty', () => {
  const parentEnv = { EXISTING: 'parent', PATH: '/parent/bin' }

  expect(getChildEnv(undefined, 'linux', parentEnv)).toEqual(parentEnv)
  expect(getChildEnv({}, 'linux', parentEnv)).toEqual(parentEnv)
})

test('keeps environment keys case-sensitive outside Windows', () => {
  expect(
    getChildEnv({ path: '/child/bin' }, 'linux', { PATH: '/parent/bin' }),
  ).toEqual({ PATH: '/parent/bin', path: '/child/bin' })
})

test('normalizes Windows PATH to one Path key with override precedence', () => {
  expect(
    getChildEnv(
      Object.fromEntries([
        ['PATH', 'C:\\child'],
        ['Path', 'D:\\last'],
      ]),
      'win32',
      Object.fromEntries([
        ['PATH', 'C:\\parent'],
        ['path', 'D:\\parent'],
        ['KEEP', 'parent'],
      ]),
    ),
  ).toEqual({ KEEP: 'parent', Path: 'C:\\child' })
})

test('uses the inherited Windows PATH when no override is supplied', () => {
  expect(getChildEnv({}, 'win32', { KEEP: 'parent', PATH: 'C:\\parent' })).toEqual({
    KEEP: 'parent',
    Path: 'C:\\parent',
  })
})

test('preserves an explicitly empty Windows PATH override', () => {
  expect(getChildEnv({ Path: '' }, 'win32', { PATH: 'C:\\parent' })).toEqual({
    Path: '',
  })
})

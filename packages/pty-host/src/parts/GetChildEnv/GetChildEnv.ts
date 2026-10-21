export const getChildEnv = (
  env: Record<string, string | undefined> = {},
  platform = process.platform,
  parentEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv => {
  const childEnv = env ? { ...parentEnv, ...env } : { ...parentEnv }
  if (platform === 'win32') {
    const pathOverride = Object.entries(env || {}).find(
      ([key]) => key.toLowerCase() === 'path',
    )
    const searchPath = pathOverride ? String(pathOverride[1]) : parentEnv.PATH || ''
    for (const key of Object.keys(childEnv)) {
      if (key.toLowerCase() === 'path') delete childEnv[key]
    }
    childEnv.Path = searchPath
  }
  return childEnv
}

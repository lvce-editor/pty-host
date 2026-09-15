const METHODS_THAT_REQUIRE_SOCKET = new Set([
  'Terminal.create',
  'Terminal.write',
  'Terminal.resize',
  'Terminal.dispose',
])

export const requiresSocket = (method) => {
  return METHODS_THAT_REQUIRE_SOCKET.has(method)
}

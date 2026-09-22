# Persistent SSH terminals

Persistence is opt-in at the PTY protocol layer. Ordinary `Terminal.create`
requests retain connection-scoped teardown. Only WebSockets whose parent marks
`request.remoteAuthorityAuthenticated === true` may request persistence; the
HTTP authentication layer must set that flag, never a client message.

The optional fifth argument to `Terminal.create(id, cwd, command, args, options)`
is `{ sessionToken, restoreOnly }`. Generate `sessionToken` from 32 cryptographically
random bytes encoded as 64 lowercase hexadecimal characters. Treat it as a secret
capability, scope its storage to the window and workspace, and never put it in URLs
or logs. A new session returns `{ attached: true }`. Reusing a capability atomically
replaces the old connection's binding. Old connection closure, writes, and disposal
cannot affect its replacement. `restoreOnly: true` returns `{ attached: false }` for
an expired or exited session, without silently launching a replacement command.

Before live output, the host emits `Viewlet.send(id, 'handleRestore', snapshot)`.
The snapshot contains `{ columns, rows, data }`. Reset the frontend terminal, resize
it to those dimensions, write `data`, then fit it to the current layout and send the
resulting resize. Process the restore and subsequent data messages in order. The
serialized snapshot includes screen state, modes, cursor, alternate buffer, and up
to 1,000 scrollback rows. The host pauses PTY reads at 64 KiB of queued parser input
and resumes after consumption. Persistent dimensions are limited to 500 columns
and 200 rows, with at most 128 persistent terminals per host.

A disconnected session has a two-minute grace period. Reattachment cancels expiry;
explicit `Terminal.dispose` kills immediately; process exit removes the session.
The parent connection reservation, when supplied, is released only after the
retained sessions reattach, exit, or expire. A parent daemon's shorter configured
idle lifetime can terminate sessions earlier. This is reload recovery, not durable
storage: server shutdown or crash loses the sessions.

The frontend setting and tab restoration are implemented by the consuming editor;
this protocol does not enable persistence for existing clients automatically.

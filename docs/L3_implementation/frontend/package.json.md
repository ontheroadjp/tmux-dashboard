# frontend/package.json

## Purpose

Defines the Next.js frontend package metadata, npm scripts, runtime dependencies, and TypeScript development dependencies for the dashboard frontend.

## Behavior

The package is private and is intended to be run from the `frontend/` directory.

Key scripts:

- `dev`: starts the Next.js development server on port 4000.
- `build`: creates the production Next.js build.
- `start`: starts the production Next.js server on port 4000.
- `restart`: builds the frontend, stops any current TCP listener on port 4000 via `fuser -k 4000/tcp`, then runs `start`.
- `typecheck`: runs TypeScript without emitting compiled files.

The `restart` script treats a missing port-4000 listener as non-fatal with `|| true`, so a clean start and an occupied-port restart use the same command path. The final `npm run start` remains a foreground process because it delegates to the existing Next.js start script.

## Design Notes

The restart command is intentionally scoped to the frontend package and port 4000. That matches the Linux/systemd frontend runtime port while leaving macOS launchd production restarts to the existing launchd scripts.

No additional package dependency is used for restart behavior. The command relies on `fuser`, which is available on the target Linux environment and avoids introducing a Node wrapper for a local operational command.

## Integration Points

- Repository command inventory maps `frontend:*` commands to these npm scripts.
- Linux production frontend service runs the same Next.js production server shape on port 4000.
- CI and local verification call `typecheck` and `build` through npm.

## Caveats

- `restart` is Linux-oriented because it uses `fuser`.
- `restart` kills any process listening on TCP port 4000 for the current user permissions, not only a Next.js process.
- `start` and therefore `restart` keep running in the foreground until interrupted.

## Code References

- `frontend/package.json:5-10`
- `frontend/package.json:12-27`

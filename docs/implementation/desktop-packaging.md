# Desktop Packaging

CoScience is distributed as a Windows x64 Electron application. The renderer is
built by Vite into `dist/`, and `electron/main.cjs` loads that output when the
application is started outside development mode.

## Commands

- `npm run desktop:dir`: build the renderer and create an unpacked Windows
  application directory under `release/win-unpacked/`.
- `npm run desktop:portable`: build a standalone portable executable under
  `release/`.
- `npm run desktop:build`: build both the NSIS installer and portable
  executable under `release/`.

The normal development commands remain separate:

- `npm run desktop:dev` starts Vite and opens the Electron shell against the
  local development URL.
- `npm run desktop` opens the production renderer from the local `dist/`
  directory.

## Package boundary

The `electron-builder` configuration includes only:

- `dist/**/*`, the compiled React renderer;
- `electron/**/*`, the desktop main process;
- `package.json`, which provides the Electron entry point and app metadata.

The package uses ASAR by default and writes generated files to `release/`.
Project notes, browser storage, `reference_repository/`, source files, test
fixtures, and development caches are not included.

The Windows target is x64 and currently produces an unsigned NSIS installer and
a portable executable. The installer is per-user by default, allows the user
to choose an installation directory, and creates Start Menu and desktop
shortcuts. Code signing and update publishing are intentionally left out until
release credentials and an update channel are selected.

## Runtime boundary

Packaging does not add SSH, arbitrary shell execution, filesystem access, GPU
control, shutdown, or provider billing operations. The packaged shell keeps
`contextIsolation`, `sandbox`, and disabled Node integration enabled. Future
remote operations must be exposed through narrow, reviewable preload APIs and
must keep destructive actions behind an explicit human confirmation flow.

## Validation

Run `npm test` and `npm run build` for the fast checks. Run
`npm run desktop:dir` to validate that the renderer and Electron shell can be
assembled without creating an installer or invoking privileged operations.
Run `npm run desktop:build` when a distributable installer and portable artifact
are needed. `release/` is a generated directory and can be removed after
inspection.

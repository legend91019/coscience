# Desktop Shell

CoScience now has a minimal Electron shell around the React renderer. The shell uses a sandboxed BrowserWindow with context isolation and disabled Node integration. It loads `COSCIENCE_DEV_URL` for local development, otherwise `dist/index.html` after a production build.

The shell intentionally exposes no SSH, filesystem, or shutdown IPC yet. Those capabilities must be added through narrow preload APIs after their data contracts and confirmation flows are implemented.

Commands:

- `npm run dev`: browser renderer preview.
- `npm run desktop:dev`: start Vite and open the desktop window.
- `npm run build`: build the renderer for the packaged shell.
- `npm run desktop`: open the packaged renderer from `dist`.

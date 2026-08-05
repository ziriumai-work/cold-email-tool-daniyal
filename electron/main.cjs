const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');

const PORT = 38473;
let serverProc = null;

const firstExisting = (paths) => paths.find((p) => p && fs.existsSync(p));

function serverPath() {
  return firstExisting([
    path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
    path.join(process.resourcesPath || '', 'app', '.next', 'standalone', 'server.js'),
  ]);
}
function configPath() {
  return firstExisting([
    path.join(__dirname, 'app.config.json'),
    path.join(process.resourcesPath || '', 'app', 'electron', 'app.config.json'),
  ]);
}
function loadConfig() {
  const c = configPath();
  if (!c) return {};
  try { return JSON.parse(fs.readFileSync(c, 'utf8')); } catch { return {}; }
}

function startServer() {
  const srv = serverPath();
  if (!srv) { console.error('[electron] standalone server.js not found'); return; }
  const env = {
    ...process.env,
    ...loadConfig(),
    NODE_ENV: 'production',
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
    ELECTRON_RUN_AS_NODE: '1', // run the bundled server with Electron's Node
  };
  serverProc = spawn(process.execPath, [srv], { env, cwd: path.dirname(srv), stdio: 'inherit' });
  serverProc.on('exit', (code) => console.log('[electron] server exited', code));
}

function waitForServer(cb, tries = 0) {
  http.get(`http://127.0.0.1:${PORT}/login`, () => cb()).on('error', () => {
    if (tries > 120) return cb(new Error('server start timeout'));
    setTimeout(() => waitForServer(cb, tries + 1), 500);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, title: 'Cold Email Tool',
    webPreferences: { contextIsolation: true },
  });
  if (win.removeMenu) win.removeMenu();
  win.loadURL(`http://127.0.0.1:${PORT}/`);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  startServer();
  waitForServer((err) => {
    if (err) console.error('[electron]', err.message);
    createWindow();
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (serverProc) { try { serverProc.kill(); } catch {} }
  app.quit();
});

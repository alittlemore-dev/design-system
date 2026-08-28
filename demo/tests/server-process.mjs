import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';

const HOST = '127.0.0.1';
const START_TIMEOUT_MILLISECONDS = 15_000;

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : null;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  if (port === null) throw new Error('Could not reserve a demo server port.');
  return port;
}

async function waitForServer(url, child, output) {
  const deadline = Date.now() + START_TIMEOUT_MILLISECONDS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Demo server exited with code ${child.exitCode}.\n${output()}`);
    }
    let response = null;
    try {
      response = await fetch(url);
    } catch {
      // The server has not started listening yet.
    }
    if (response?.ok) return;
    if (response !== null && response.status >= 500) {
      throw new Error(`Demo server returned ${response.status}.\n${output()}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}.\n${output()}`);
}

export async function startDemoServer(demoRoot) {
  const port = await reservePort();
  const url = `http://${HOST}:${port}`;
  const serverEntry = join(demoRoot, 'dist/design-system-demo/server/server.mjs');
  let output = '';
  const child = spawn(process.execPath, [serverEntry], {
    cwd: demoRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => (output += chunk.toString()));
  child.stderr.on('data', (chunk) => (output += chunk.toString()));
  try {
    await waitForServer(url, child, () => output);
  } catch (error) {
    await stopDemoServer(child);
    throw error;
  }
  return { child, url };
}

export async function stopDemoServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  let timeout;
  const timedOut = new Promise((resolve) => {
    timeout = setTimeout(resolve, 3_000);
    timeout.unref();
  });
  child.kill('SIGTERM');
  await Promise.race([exited, timedOut]);
  clearTimeout(timeout);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await exited;
  }
}

// Shared base for API clients: key read from the environment, JSON requests, errors without secrets.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_ENV = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');

// Loads the repo's .env if it exists, printing nothing. An existing variable is never overwritten.
// Under `node --test` (NODE_TEST_CONTEXT) nothing is loaded by default, so tests never see a real key.
export function loadDotEnv(path = ROOT_ENV, { underTest = Boolean(process.env.NODE_TEST_CONTEXT) } = {}) {
  if (underTest || !existsSync(path) || typeof process.loadEnvFile !== 'function') return false;
  process.loadEnvFile(path);
  return true;
}

export class ApiError extends Error {
  constructor(service, status) {
    super(`${service}: HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} missing from the environment`);
  return value;
}

export async function requestJson(service, url, { method = 'GET', headers = {}, body, timeoutMs = 60000 } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  // The body of an error is not echoed: it may quote a header or a URL.
  if (!res.ok) throw new ApiError(service, res.status);
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Common entry point: node scripts/lib/<client>.mjs <command> [args]. Result as JSON on stdout.
export async function runCli(moduleUrl, commands) {
  if (process.argv[1] && new URL(`file://${process.argv[1]}`).href !== moduleUrl) return;
  const [name, ...args] = process.argv.slice(2);
  if (!commands[name]) {
    console.error(`Commands: ${Object.keys(commands).join(', ')}`);
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(await commands[name](...args), null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

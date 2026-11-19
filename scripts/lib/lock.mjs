// Lock by exclusive file creation: two processes writing the same JSON file do not erase each other.
// A lock older than 10 s is considered abandoned.
import { closeSync, mkdirSync, openSync, statSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function withLock(file, fn) {
  const lock = `${file}.lock`;
  mkdirSync(dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 200; attempt += 1) {
    let fd;
    try {
      fd = openSync(lock, 'wx');
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 10000) unlinkSync(lock);
      } catch {}
      pause(25);
      continue;
    }
    try {
      return fn();
    } finally {
      closeSync(fd);
      try {
        unlinkSync(lock);
      } catch {}
    }
  }
  throw new Error(`lock ${lock} unavailable`);
}

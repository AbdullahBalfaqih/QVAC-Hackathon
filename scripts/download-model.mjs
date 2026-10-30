import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.MODEL_DIR ? path.resolve(process.env.MODEL_DIR) : path.join(root, 'models');
const small = process.argv.includes('--small');
const model = small ? {
  filename: 'Qwen2.5-0.5B-Instruct.Q4_K_M.gguf',
  sha256: 'bfb8508e3f15c0aa6c5c5599af03681d953e87044c2e2e031d52cd8d07f85d21',
  url: 'https://huggingface.co/QuantFactory/Qwen2.5-0.5B-Instruct-GGUF/resolve/be5d6f897c45491ea16c56f84f652010c6518507/Qwen2.5-0.5B-Instruct.Q4_K_M.gguf?download=true', size: '398 MB'
} : {
  filename: 'Qwen2.5-1.5B-Instruct.Q4_K_M.gguf',
  sha256: '0495b6ad92bab3420f870a001c0add99562d5eb878109ebe8e4cb8de99e0bed5',
  url: 'https://huggingface.co/QuantFactory/Qwen2.5-1.5B-Instruct-GGUF/resolve/a5012fb3d2b76e78d99b526b397bb19cc908c789/Qwen2.5-1.5B-Instruct.Q4_K_M.gguf?download=true', size: '986 MB'
};
const target = path.join(dir, model.filename); const temporary = `${target}.partial`;
async function fileHash(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
await mkdir(dir, { recursive: true });
try {
  if ((await stat(target)).isFile() && await fileHash(target) === model.sha256) {
    console.log(`Verified model already exists: ${target}`); process.exit(0);
  }
  throw new Error('A model file exists with a different hash. Remove or rename it before downloading.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(`Downloading ${model.filename} (${model.size}). Internet is required once.`);
console.log(`Source: ${model.url}`);
let downloaded = 0; let last = 0; const hash = createHash('sha256');
try {
  const response = await fetch(model.url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  const meter = new Transform({ transform(chunk, _, callback) {
    hash.update(chunk); downloaded += chunk.length;
    if (Date.now() - last > 2000) {
      console.log(`${Math.round(downloaded / 1024 / 1024)}${total ? ` / ${Math.round(total / 1024 / 1024)}` : ''} MiB`); last = Date.now();
    }
    callback(null, chunk);
  } });
  await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(temporary, { flags: 'w' }));
  const actual = hash.digest('hex');
  if (actual !== model.sha256) throw new Error(`SHA-256 mismatch: ${actual}`);
  await rename(temporary, target);
  console.log(`Verified SHA-256 ${actual}\nSaved ${target}`);
  if (small) console.log('For the small model, set MODEL_PATH to this path before starting the app.');
} catch (error) {
  await rm(temporary, { force: true });
  console.error(`Download failed: ${error.message}. Check your network/proxy, or download the exact file manually and verify its SHA-256.`);
  process.exitCode = 1;
}

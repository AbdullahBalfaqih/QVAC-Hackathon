import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('invalid CPU thread configuration fails before server startup',async()=>{
  const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,ATHAR_THREADS:'0'},stdio:['ignore','pipe','pipe']});
  let error='';child.stderr.setEncoding('utf8');child.stderr.on('data',x=>error+=x);
  const [code]=await once(child,'exit');
  assert.equal(code,1);assert.match(error,/ATHAR_THREADS must be an integer/);
});

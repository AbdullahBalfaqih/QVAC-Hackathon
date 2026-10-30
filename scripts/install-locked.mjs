// Low-memory, sequential alternative to npm ci for the supplied lockfile.
// Uses Node >=22, system tar and the exact integrity hashes in package-lock.json.
// Designed for Linux x64 (tested) and Windows x64 (not yet tested).
import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, lstat, readdir, chmod, access } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PLATFORM=process.platform, ARCH=process.arch;
if (!['linux','win32'].includes(PLATFORM) || ARCH!=='x64') throw new Error('This installer supports Linux x64 and Windows x64 only. For other platforms, use npm ci.');
const dest=path.join(ROOT,'node_modules');
try { await access(dest); throw new Error('node_modules already exists. Stop the app and rename/remove it before running the installer.'); }
catch(e) { if(e.code!=='ENOENT') throw e; }
const lock=JSON.parse(await readFile(path.join(ROOT,'package-lock.json'),'utf8'));
const packages=Object.entries(lock.packages).filter(([key,p])=>key.startsWith('node_modules/') && p.resolved && (!p.os || p.os.includes(PLATFORM)) && (!p.cpu || p.cpu.includes(ARCH)));
const stage=path.join(ROOT,`node_modules.staging-${process.pid}-${randomBytes(3).toString('hex')}`);
const tmp=await mkdtemp(path.join(os.tmpdir(),'athar-packages-'));
await mkdir(stage,{recursive:true});
async function tar(args){
  await new Promise((resolve,reject)=>{
    const child=spawn('tar',args,{stdio:['ignore','ignore','pipe'],windowsHide:true});let err='';
    child.stderr.on('data',d=>{if(err.length<10000)err+=d.toString()});
    child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`tar failed (${code}): ${err}`)));
  });
}
async function fixDirs(dir){
  // Some npm archives contain directories without the execute bit (notably tinyld).
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const p=path.join(dir,entry.name);const st=await lstat(p);await chmod(p,st.mode|0o700);await fixDirs(p);
  }
}
try{
  console.log(`Installing ${packages.length} locked packages sequentially for ${PLATFORM}-${ARCH}. Internet required once.`);
  for(let i=0;i<packages.length;i++){
    const [key,p]=packages[i],rel=key.slice('node_modules/'.length);
    if(!rel || rel.split('/').some(x=>!x||x==='..'||x==='.') || !p.integrity) throw new Error(`Invalid package metadata: ${key}`);
    const url=new URL(p.resolved);if(url.protocol!=='https:' || url.hostname!=='registry.npmjs.org')throw new Error(`Untrusted package URL: ${key}`);
    const [algorithm,expected]=p.integrity.split('-',2);
    if(!['sha512','sha384','sha256'].includes(algorithm) || !expected)throw new Error(`Missing integrity: ${key}`);
    const archive=path.join(tmp,'package.tgz'),hash=createHash(algorithm);
    const response=await fetch(url,{redirect:'error'});if(!response.ok||!response.body)throw new Error(`Download ${key}: HTTP ${response.status}`);
    const meter=new Transform({transform(chunk,_enc,callback){hash.update(chunk);callback(null,chunk)}});
    await pipeline(Readable.fromWeb(response.body),meter,createWriteStream(archive,{flags:'w'}));
    if(hash.digest('base64')!==expected)throw new Error(`Integrity mismatch: ${key}`);
    const target=path.join(stage,...rel.split('/'));await mkdir(target,{recursive:true});
    const args=['-xzf',archive,'--strip-components=1','-C',target];
    if(PLATFORM==='linux')args.unshift('--delay-directory-restore','--no-same-owner');
    await tar(args);
    if(PLATFORM==='linux'&&rel==='tinyld')await fixDirs(target);
    if((i+1)%20===0 || i+1===packages.length)console.log(`${i+1}/${packages.length} verified and installed`);
  }
  await rename(stage,dest);
  console.log('Dependencies installed. Next: npm run model:download');
} catch(e){
  await rm(stage,{recursive:true,force:true});
  console.error(`Installation failed: ${e.message}`);process.exitCode=1;
} finally { await rm(tmp,{recursive:true,force:true}); }

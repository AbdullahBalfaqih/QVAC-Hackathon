import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function request(port,route,{method='GET',headers={},body=''}={}) {
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,path:route,method,headers},res=>{
      let text='';res.setEncoding('utf8');res.on('data',d=>text+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));
    });req.on('error',reject);req.end(body);
  });
}
async function freePort(){const s=net.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}

test('local server restricts host/origin, rejects cross-origin writes, and serves an allowlisted UI without a model',async t=>{
  const port=await freePort();
  const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),ATHAR_PREVIEW:'0',ATHAR_THREADS:'1',MODEL_PATH:path.join(os.tmpdir(),'athar-nonexistent-model-for-security-test.gguf')},stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill('SIGTERM'));
  await once(child.stdout,'data');
  const goodHost=`127.0.0.1:${port}`;
  const status=await request(port,'/api/status',{headers:{host:goodHost}});
  assert.equal(JSON.parse(status.text).device,'cpu');assert.equal(JSON.parse(status.text).threads,1);
  const home=await request(port,'/',{headers:{host:goodHost}});
  assert.equal(home.status,200);assert.match(home.headers['content-security-policy'],/default-src 'self'/);assert.match(home.headers['content-security-policy'],/object-src 'none'/);
  for (let i=1;i<=6;i++) {
    const picture=await request(port,`/avatars/portrait-0${i}.jpg`,{headers:{host:goodHost}});
    assert.equal(picture.status,200);assert.equal(picture.headers['content-type'],'image/jpeg');assert.ok(picture.text.length>100);
  }
  const otherPicture=await request(port,'/avatars/portrait-07.jpg',{headers:{host:goodHost}});assert.equal(otherPicture.status,404);
  const badHost=await request(port,'/',{headers:{host:'attacker.invalid'}});assert.equal(badHost.status,403);
  const noHeader=await request(port,'/api/extract',{method:'POST',headers:{host:goodHost,origin:`http://${goodHost}`,'content-type':'application/json'},body:'{}'});assert.equal(noHeader.status,403);
  const crossOrigin=await request(port,'/api/extract',{method:'POST',headers:{host:goodHost,origin:'https://attacker.invalid','content-type':'application/json','x-athar-client':'1'},body:'{}'});assert.equal(crossOrigin.status,403);
  const unknown=await request(port,'/server.mjs',{headers:{host:goodHost}});assert.equal(unknown.status,404);
});

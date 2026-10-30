// Standalone QVAC smoke test using the same prompt and validator as the app.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {loadModel,completion,unloadModel,close} from '@qvac/sdk';
import {LAKSHMI_QUOTE,EXTRACTION_PROMPT,validateModelOutput} from '../public/core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const modelSrc=process.env.MODEL_PATH || path.join(root,'models','Qwen2.5-1.5B-Instruct.Q4_K_M.gguf');
let id;
try {
  console.log('Loading local model:',modelSrc);const start=Date.now();
  id=await loadModel({modelSrc,modelType:'llamacpp-completion',modelConfig:{device:'cpu',gpu_layers:0,ctx_size:2048,threads:2}});
  console.log('Loaded in ms:',Date.now()-start);
  const r=completion({modelId:id,history:[{role:'system',content:EXTRACTION_PROMPT},{role:'user',content:LAKSHMI_QUOTE}],stream:true,generationParams:{temp:0,predict:190}});
  let raw='';for await(const event of r.events)if(event.type==='contentDelta')raw+=event.text;await r.final;
  const checked=validateModelOutput(raw,LAKSHMI_QUOTE,15);
  console.log(JSON.stringify({elapsedMs:Date.now()-start,raw,checked},null,2));
} catch(e){console.error('ERROR:',e?.message||e);process.exitCode=1;}
finally{try{if(id)await unloadModel({modelId:id});await close();}catch{}}

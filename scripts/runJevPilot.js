#!/usr/bin/env node
const fs=require('node:fs/promises');
const path=require('node:path');
const {parseArgs}=require('node:util');
const lib=require('./jev-memory');
const {renderReport}=require('./jev-report');
const ROOT=path.resolve(__dirname,'..');

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  const tmp=`${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp,`${JSON.stringify(data,null,2)}\n`);
  await fs.rename(tmp,file);
}

async function main() {
  const {values:args}=parseArgs({options:{limit:{type:'string',default:'20'},budget:{type:'string',default:'0.10'},transcripts:{type:'string'},input:{type:'string',default:path.join(ROOT,'public/data/videos.json.bak')},output:{type:'string',default:path.join(ROOT,'.local/jev-pilot')},compare:{type:'boolean',default:false}}});
  const limit=Number(args.limit), budget=Number(args.budget);
  if (!Number.isInteger(limit)||limit<1||limit>20||!Number.isFinite(budget)||budget<=0||budget>1) throw new Error('試作は --limit 1〜20、--budget 0より大きく1以下（USD）で実行してください。');
  const raw=JSON.parse(await fs.readFile(args.input,'utf8'));
  const videos=Array.isArray(raw)?raw:raw.videos;
  if (!Array.isArray(videos)) throw new Error('入力には動画配列が必要です。');
  const unique=new Map(videos.map(v=>[v.id,v]));
  const selected=lib.PILOT_IDS.map(id=>unique.get(id)).filter(Boolean).slice(0,limit);
  if (!selected.length) throw new Error('試作対象の動画が入力にありません。');
  const output=path.resolve(args.output),cache=path.join(output,'cache');
  await fs.mkdir(cache,{recursive:true});
  const runId=new Date().toISOString().replace(/[:.]/g,'-');
  const ledgerFile=path.join(output,'runs',`${runId}.json`);
  const ledger={runId,model:lib.MODEL,pricePerMillion:lib.PRICE_PER_MILLION,budgetUsd:budget,reservedUsd:0,inputTokens:0,outputTokens:0,calls:0,cacheHits:0,attempts:[],complete:false};
  const saveLedger=()=>writeJson(ledgerFile,ledger);
  await saveLedger();
  const evaluate=async request=>{
    const key=lib.cacheKey(request),file=path.join(cache,`${key}.json`);
    let cached;
    try { cached=JSON.parse(await fs.readFile(file,'utf8')); } catch(e) { if(e.code!=='ENOENT') throw new Error('保存済み結果を読み取れませんでした。'); }
    if(cached){lib.validateResponse(cached.response,request);ledger.cacheHits++;await saveLedger();return cached.response;}
    if(!process.env.TYPESAFE_API_KEY) throw new Error('TYPESAFE_API_KEY を環境変数に設定してください。');
    ledger.reservedUsd+=lib.checkBudget(request,ledger.reservedUsd,budget);
    ledger.attempts.push({cacheKey:key,status:'pending',reservedTotalUsd:ledger.reservedUsd});
    await saveLedger();
    const started=performance.now();
    let response;
    try { response=await lib.callJev(request,process.env.TYPESAFE_API_KEY); }
    catch(error){ledger.attempts.at(-1).status='failed-or-unknown';await saveLedger();throw error;}
    ledger.calls++;ledger.inputTokens+=response.usage.input_tokens;ledger.outputTokens+=response.usage.output_tokens;
    Object.assign(ledger.attempts.at(-1),{status:'success',usage:response.usage,elapsedMs:Math.round(performance.now()-started)});
    await writeJson(file,{request,response});await saveLedger();return response;
  };
  const results=[];
  try {
    for(const video of selected){
      let transcript;
      if(args.transcripts){try{transcript=JSON.parse(await fs.readFile(path.join(args.transcripts,`${video.id}.json`),'utf8'));}catch(e){if(e.code!=='ENOENT') throw new Error(`字幕ファイルが不正です: ${video.id}`);}}
      const units=lib.makeUnits(video,transcript),batches=[];
      for(let start=0;start<units.length;start+=6){
        const part=units.slice(start,start+6),request=lib.makeRequest(video,part),response=await evaluate(request);
        batches.push({unitIds:part.map(u=>u.id),answers:response.answers,usage:response.usage,cacheKey:lib.cacheKey(request)});
      }
      results.push({id:video.id,title:video.title,publishedAt:video.publishedAt,url:`https://www.youtube.com/watch?v=${video.id}`,source:transcript?'transcript':'metadata',units,batches});
      await writeJson(path.join(output,'checkpoint.json'),{results});
      console.log(`${results.length}/${selected.length} ${video.id}: ${units.length}区間`);
    }
    let comparison=null;
    if(args.compare){
      const video=selected[0],unit=lib.makeUnits(video)[0];
      const base=lib.makeRequest(video,[unit]);
      base.questions=Object.fromEntries(Object.entries(base.questions).filter(([k])=>k.startsWith('topic_')));
      const batch=await evaluate(base),separate=[];
      for(const [key,question]of Object.entries(base.questions)){
        const response=await evaluate({...base,questions:{[key]:question}});
        separate.push({key,answer:response.answers[key],usage:response.usage});
      }
      const separateTokens=separate.reduce((sum,x)=>sum+x.usage.input_tokens,0);
      comparison={description:'同じタイトルと6つのトピック質問を一括送信／個別送信で比較。1例だけの実測。',videoId:video.id,batchInputTokens:batch.usage.input_tokens,separateInputTokens:separateTokens,savingFraction:1-batch.usage.input_tokens/separateTokens,answers:separate.map(x=>({key:x.key,batch:batch.answers[x.key].noul,separate:x.answer.noul}))};
    }
    const gold=JSON.parse(await fs.readFile(path.join(__dirname,'jev-pilot-gold.json'),'utf8'));
    const checks=[];
    for(const g of gold){
      const video=results.find(v=>v.id===g.videoId&&v.source==='metadata');
      if(!video)continue;
      const unit=video.units.find(u=>g.field==='title'?u.id==='title':u.text.includes(g.contains));
      if(!unit)continue;
      const key=`${unit.id}_${g.event}`,batch=video.batches.find(b=>key in b.answers),value=batch.answers[key].noul;
      // 0.8 / 0.2 are pilot triage thresholds, not measured correctness guarantees.
      const decision=value>=0.8?'yes':value<=0.2?'no':'review';
      checks.push({...g,unitId:unit.id,noul:value,decision,pass:decision===(g.expected?'yes':'no')});
    }
    ledger.complete=true;ledger.estimatedUsd=ledger.inputTokens*lib.PRICE_PER_MILLION/1e6;await saveLedger();
    const report={version:lib.VERSION,generatedAt:new Date().toISOString(),sourceFile:path.basename(args.input),sourceCount:videos.length,uniqueSourceCount:unique.size,selection:'目的別に選んだ20本。無作為抽出ではなく、全体の精度や未完了率は推定できない。',model:lib.MODEL,topics:lib.TOPICS,projects:lib.PROJECTS,events:lib.EVENTS,thresholds:{yes:0.8,no:0.2},results,comparison,checks,run:ledger};
    await writeJson(path.join(output,'report.json'),report);
    await fs.writeFile(path.join(output,'report.html'),renderReport(report));
    console.log(JSON.stringify({videos:results.length,calls:ledger.calls,cacheHits:ledger.cacheHits,inputTokens:ledger.inputTokens,estimatedUsd:ledger.estimatedUsd,goldChecks:checks.length,goldPassed:checks.filter(x=>x.pass).length,report:path.join(output,'report.html')}));
  }catch(error){ledger.error=error.message;await saveLedger();throw error;}
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});

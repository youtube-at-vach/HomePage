#!/usr/bin/env node
const fs=require('node:fs/promises');
const path=require('node:path');
const {parseArgs}=require('node:util');

function timeSeconds(value){
  const match=value.match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/);
  if(!match||Number(match[2])>59||Number(match[3])>59)throw new Error('字幕の時刻形式が不正です。');
  return Number(match[1]||0)*3600+Number(match[2])*60+Number(match[3])+Number(match[4])/1000;
}
function parseSubtitles(text){
  const result=[];
  for(const block of text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split(/\n\s*\n/)){
    if(/^(?:WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(block))continue;
    const lines=block.split('\n'),i=lines.findIndex(x=>x.includes('-->'));
    if(i<0)continue;
    const match=lines[i].match(/^(\S+)\s+-->\s+(\S+)(?:\s.*)?$/);
    if(!match)throw new Error('字幕の区間形式が不正です。');
    const start=timeSeconds(match[1]),end=timeSeconds(match[2]);
    // Retain original wording; remove WebVTT formatting/timestamp tags only.
    const content=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').trim();
    if(end<=start||result.length&&start<result.at(-1).start)throw new Error('字幕の時刻が逆順です。');
    if(content)result.push({start,end,text:content});
  }
  if(!result.length)throw new Error('SRT/VTTの字幕区間が見つかりません。');
  return result;
}
async function main(){
  const {values:args}=parseArgs({options:{input:{type:'string'},video:{type:'string'},output:{type:'string',default:path.resolve(__dirname,'../.local/jev-transcripts')}}});
  if(!args.input||!/^[-\w]{11}$/.test(args.video||''))throw new Error('--input 字幕.srt（または.vtt） --video 動画ID を指定してください。');
  const rows=parseSubtitles(await fs.readFile(args.input,'utf8'));
  await fs.mkdir(args.output,{recursive:true});
  const file=path.join(args.output,`${args.video}.json`);
  await fs.writeFile(file,JSON.stringify(rows,null,2)+'\n');
  console.log(`${rows.length}区間を ${file} に保存しました。`);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={parseSubtitles};

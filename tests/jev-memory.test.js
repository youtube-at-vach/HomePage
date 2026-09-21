const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../scripts/jev-memory');
const {renderReport}=require('../scripts/jev-report');
const {parseSubtitles}=require('../scripts/importJevSubtitles');
const video={id:'aaaaaaaaaaa',title:'試作完成',publishedAt:'2025-01-01',description:'後で測ります。\n\nその後測れました。'};
test('追記を異なる根拠として保持し、タイトルからの完成を他区間へ漏らさない指示を付ける',()=>{
 const units=lib.makeUnits(video);assert.equal(units.length,3);assert.equal(units[1].text,'後で測ります。');assert.equal(units[2].text,'その後測れました。');
 const r=lib.makeRequest(video,units);assert.match(r.questions.d1_plan.instructions,/ONLY state.units\["d1"\]/);assert.equal(r.questions.d1_plan.type,'noul');
});
test('字幕の時刻を保持し、不正または逆順の字幕は拒否する',()=>{
 const units=lib.makeUnits(video,[{start:1,end:8,text:'計画です'},{start:10,end:20,text:'実施しました'},{start:99,end:110,text:'完成しました'}]);
 assert.equal(units.length,2);assert.equal(units[0].start,1);assert.equal(units[0].end,20);assert.equal(units[1].start,99);
 assert.throws(()=>lib.makeUnits(video,[{start:-1,end:2,text:'x'}]));assert.throws(()=>lib.makeUnits(video,[{start:9,end:10,text:'x'},{start:1,end:2,text:'x'}]));
});
test('不完全・範囲外のAPI応答を採用しない',()=>{
 const request={model:lib.MODEL,questions:{q:{type:'noul'}}};
 const response={model:lib.MODEL,usage:{input_tokens:3,output_tokens:2},answers:{q:{type:'noul',noul:0.8}}};
 assert.equal(lib.validateResponse(response,request),response);
 assert.throws(()=>lib.validateResponse({...response,answers:{}},request));assert.throws(()=>lib.validateResponse({...response,answers:{q:{type:'noul',noul:1.1}}},request));assert.throws(()=>lib.validateResponse({...response,usage:{input_tokens:NaN,output_tokens:0}},request));
});
test('予算やコンテキスト上限を送信前に検査する',()=>{
 const r=lib.makeRequest(video,lib.makeUnits(video));assert.throws(()=>lib.checkBudget(r,0,0.000001));assert.ok(lib.checkBudget(r,0,1)>0);assert.throws(()=>lib.checkBudget({...r,state:'x'.repeat(64000)},0,1));
});
test('字幕・質問・モデル変更でキャッシュが変わる',()=>{
 const r=lib.makeRequest(video,lib.makeUnits(video));assert.notEqual(lib.cacheKey(r),lib.cacheKey({...r,model:'changed'}));assert.notEqual(lib.cacheKey(r),lib.cacheKey({...r,state:{text:'changed'}}));assert.notEqual(lib.cacheKey(r),lib.cacheKey({...r,questions:{}}));
});
test('API本文やネットワーク例外から秘密を表示しない。認証は公式ホストのヘッダのみ',async()=>{
 const r=lib.makeRequest(video,lib.makeUnits(video));
 await assert.rejects(lib.callJev(r,'secret',async(url,opts)=>{assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,'Bearer secret');assert.ok(!opts.body.includes('secret'));return {ok:false,status:401,json:()=>({error:'secret'})};}),e=>e.message.includes('401')&&!e.message.includes('secret'));
 await assert.rejects(lib.callJev(r,'secret',async()=>{throw new Error('secret');}),e=>!e.message.includes('secret'));
});
test('原文のscript終端をHTMLへ注入できない',()=>{
 const html=renderReport({text:'</script><script>alert(1)</script>'});assert.ok(!html.includes('</script><script>alert(1)'));assert.ok(html.includes('\\u003c/script>'));
});
test('SRTとVTTから時刻・原文を読み込み、装飾とメタデータは除く',()=>{
 assert.deepEqual(parseSubtitles('1\n00:01:02,300 --> 00:01:04,500\n計画です。\n\n2\n00:01:05,000 --> 00:01:08,000\n完成しました。'),[{start:62.3,end:64.5,text:'計画です。'},{start:65,end:68,text:'完成しました。'}]);
 assert.deepEqual(parseSubtitles('WEBVTT\n\nNOTE generated\nignored\n\ncue-a\n01:02.300 --> 01:04.500 align:start\n<c>計画</c> &amp; 実施'),[{start:62.3,end:64.5,text:'計画 & 実施'}]);
 assert.throws(()=>parseSubtitles('1\n00:00:05,000 --> 00:00:04,000\nx'));
 assert.throws(()=>parseSubtitles('1\n00:75:00,000 --> 00:76:00,000\nx'));
});

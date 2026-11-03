import {test,expect,type Page} from '@playwright/test';
async function openManager(page:Page){
 await expect(page.getByRole('button',{name:'IMPORTAR CASSETTE',exact:true})).toBeVisible();
 await expect.poll(async()=>{const panel=page.getByRole('region',{name:'Manager',exact:true});if(!await panel.isVisible())await page.keyboard.press('Control+Shift+m');return panel.isVisible();}).toBe(true);
}
test('rejects missing, duplicate, incompatible-duration and compressed cassette content',async({page})=>{
 await page.goto('/');
 const messages=await page.evaluate(async()=>{
  // @ts-expect-error Vite source module.
  const {invalidCassette}=await import('/tests/browser/fixtures.ts');
  // @ts-expect-error Vite source module.
  const {importCassette}=await import('/src/cassette/import.ts');
  const ctx=new AudioContext(), messages=[];
  for(const kind of ['missing','duplicate','duration','compressed']) {try{await importCassette(await invalidCassette(kind),ctx);messages.push('ACCEPTED');}catch(e){messages.push(String(e));}}
  await ctx.close();return messages;
 });
 expect(messages[0]).toContain('Faltan');expect(messages[1]).toContain('duplicado');expect(messages[2]).toContain('cuatro compases');expect(messages[3]).toContain('PCM entero');
});
test('ZIP decode, both tempos and gapless OfflineAudioContext render',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Browser loads source modules through Vite.
  const {demoZip}=await import('/src/cassette/demo.ts');
  // @ts-expect-error Vite source module.
  const {importCassette}=await import('/src/cassette/import.ts');
  // @ts-expect-error Vite source module.
  const {planTurn,turnView}=await import('/src/game-engine/turn.ts');
  // @ts-expect-error Vite source module.
  const {scheduleTurn}=await import('/src/audio-engine/engine.ts');
  const results=[];
  for(const bpm of [80,93.532]) {
   const ctx=new AudioContext({sampleRate:48000});
   const c=await importCassette(await demoZip(bpm),ctx), turn=planTurn(c,()=>.2);
   const offline=new OfflineAudioContext(1,Math.ceil((turn.end+.2)*48000),48000);
   // Constant PCM isolates scheduling gaps from intentional source silence.
   for(const clip of [c.intro,...c.verses,...c.breaks,...c.outros]) {const b=offline.createBuffer(1,clip.buffer.length,48000);b.getChannelData(0).fill(.25);clip.buffer=b;}
   scheduleTurn(offline,offline.destination,turn,.1);
   const rendered=await offline.startRendering(), data=rendered.getChannelData(0);
   let bad=0;for(let i=Math.ceil(.1*48000)+2;i<Math.floor((.1+turn.end)*48000)-2;i++)if(Math.abs(data[i]-.25)>.00001)bad++;
   results.push({bpm,blocks:turn.blockCount,bad,round:turn.outroStart-turn.verseStart,zero:turnView(turn,turn.verseStart+60).remaining});
   await ctx.close();
  }return results;
 });
 expect(result.map(r=>r.blocks)).toEqual([5,6]);expect(result.every(r=>r.bad===0&&r.zero===0)).toBe(true);
 console.log('OFFLINE AUDIO EVIDENCE',JSON.stringify(result));
});
test('real turn runs from user gesture through complete outro',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await openManager(page);await page.getByRole('button',{name:'DEMO 80 BPM',exact:true}).click();await page.getByRole('button',{name:'CERRAR',exact:true}).click();
 await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeEnabled();
 await page.screenshot({path:'evidence/desktop.png',fullPage:true});
 await page.getByRole('button',{name:'EMPEZAR MINUTO'}).click();
 await expect(page.getByRole('heading',{name:'PREPARADO',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'3',exact:true})).toBeVisible({timeout:11000});
 await expect(page.locator('[data-phase=round]')).toBeVisible({timeout:13000});await expect(page.getByLabel('Progreso de palabras').locator('.lit')).toHaveCount(1);
 await expect(page.getByLabel('Progreso de palabras').locator('.lit')).toHaveCount(2,{timeout:13000});await page.screenshot({path:'evidence/round-desktop.png',fullPage:true});
 await expect(page.getByRole('heading',{name:'TIEMPO',exact:true})).toBeVisible({timeout:55000});
 await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeVisible({timeout:6000});
 expect(errors).toEqual([]);
});
test('mobile import error, selection lock and explicit stop',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('input[type=file]')).toBeEnabled();await page.locator('input[type=file]').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('invalid')});await expect(page.getByRole('alert')).toBeVisible();
 await openManager(page);await page.getByRole('button',{name:'DEMO 93.532 BPM',exact:true}).click();await page.getByRole('button',{name:'CERRAR',exact:true}).click();await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeEnabled();
 await page.screenshot({path:'evidence/mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'EMPEZAR MINUTO'}).click();await expect(page.locator('input[type=file]')).toBeDisabled();await expect(page.getByRole('button',{name:'IMPORTAR CASSETTE'})).toHaveCount(0);await page.screenshot({path:'evidence/round-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'DETENER'}).click();await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeEnabled();
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'evidence/desktop.png',fullPage:true});
});

test('cassette 001/002 layouts, aliases, optional resources and corrupt audio',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module.
  const {cassetteFixture}=await import('/tests/browser/fixtures.ts');
  // @ts-expect-error Vite module.
  const {importCassette}=await import('/src/cassette/import.ts');
  const ctx=new AudioContext(), accepted=[],errors=[];
  for(const id of [1,2])for(const variation of ['canonical','wrapped','aliases','no-cover','no-break','bad-cover','mastering']) {
   const c=await importCassette(await cassetteFixture(id,variation),ctx);
   accepted.push({id,variation,verses:c.verses.length,outros:c.outros.length,cover:!!c.cover,warnings:c.warnings});
   if(c.cover)URL.revokeObjectURL(c.cover);
  }
  for(const [variation,options] of [['bad-outro',{}],['no-break',{requireBreak:true}]])try{await importCassette(await cassetteFixture(2,variation),ctx,options);errors.push('ACCEPTED');}catch(e){errors.push(String(e));}
  await ctx.close();return {accepted,errors};
 });
 expect(result.accepted).toHaveLength(14);
 for(const c of result.accepted){expect(c.verses).toBe(c.id===1?4:3);expect(c.outros).toBe(c.id===1?2:1);}
 expect(result.accepted.filter(c=>c.variation==='bad-cover').every(c=>!c.cover&&c.warnings.some((w:string)=>w.includes('Portada omitida')))).toBe(true);
 expect(result.accepted.filter(c=>c.variation==='canonical').every(c=>c.cover)).toBe(true);
 expect(result.errors[0]).toContain('OUTRO1.wav');expect(result.errors[0]).toContain('truncado');expect(result.errors[1]).toContain('BREAK1');
 console.log('IMPORT STRUCTURES',JSON.stringify(result));
});

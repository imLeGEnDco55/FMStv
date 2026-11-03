import {test,expect} from '@playwright/test';
const out=process.env.FMS_SCREENSHOT_DIR??'evidence/redesign';
test('intro cues occupy the four beats of bar four, holds TIEMPO through the first second, then reveals 59',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('input[type=file]')).toBeEnabled();await page.locator('input[type=file]').evaluate(async(input:HTMLInputElement)=>{
  // @ts-expect-error Vite source module.
  const {demoZip}=await import('/src/cassette/demo.ts');const f=await demoZip(80),transfer=new DataTransfer();transfer.items.add(new File([await f.arrayBuffer()],'002 CHUTYMECHA.zip'));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.evaluate(()=>{
  const state={seen:[] as string[]};Object.assign(window,{introVisual:state});
  new MutationObserver(()=>{const value=document.querySelector('.timer')?.textContent;if(value&&state.seen.at(-1)!==value)state.seen.push(value);}).observe(document.body,{childList:true,subtree:true,characterData:true});
 });
 await page.getByRole('button',{name:'EMPEZAR MINUTO'}).click();
 await expect(page.getByRole('heading',{name:'PREPARADO',exact:true})).toBeVisible();
 await expect(page.locator('.timer')).toHaveCount(0);
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-preparado-solo.png`});
 await expect(page.getByRole('heading',{name:'3',exact:true})).toBeVisible({timeout:11000});
 for(const cue of ['2','1','TIEMPO'])await expect(page.getByRole('heading',{name:cue,exact:true})).toBeVisible({timeout:1500});
 await expect(page.locator('[data-phase=intro]')).toBeVisible();
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-entrada-tiempo.png`});
 await expect(page.locator('[data-phase=round]')).toBeVisible({timeout:1500});
 await expect(page.getByRole('heading',{name:'TIEMPO',exact:true})).toBeVisible();
 await expect(page.locator('.timer')).toHaveCount(0);
 await page.waitForTimeout(350); // Prove the cue remains after the verse starts.
 await expect(page.getByRole('heading',{name:'TIEMPO',exact:true})).toBeVisible();
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-tiempo-sostenido.png`});
 await expect(page.locator('.timer')).toHaveText('59',{timeout:1800});
 const seen=await page.evaluate(()=>(window as unknown as {introVisual:{seen:string[]}}).introVisual.seen);
 expect(seen[0]).toBe('59');expect(seen).not.toContain('60');
 await expect(page.locator('.timer')).toHaveCSS('color','rgb(255, 255, 255)');
 await expect(page.locator('.timer')).toHaveCSS('background-image','none');
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-dos-digitos.png`});
 for(const size of [{width:320,height:568},{width:1440,height:1000}]){
  await page.setViewportSize(size);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const timer=await page.locator('.timer').boundingBox(),poster=await page.locator('.word-poster').boundingBox();expect(timer!.y+timer!.height<poster!.y || timer!.x+timer!.width<poster!.x).toBe(true);
  await page.screenshot({animations:'disabled',path:`${out}/minutofms-dos-digitos-${size.width}.png`});
 }
 await page.getByRole('button',{name:'DETENER'}).click();await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeEnabled();
});

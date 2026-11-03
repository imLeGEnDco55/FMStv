import {test,expect} from '@playwright/test';
const out=process.env.FMS_SCREENSHOT_DIR??'evidence/redesign';
test('redesign: responsive stage, original logo, word countdown, fade and complete outro',async({page})=>{
 test.setTimeout(110000);page.setDefaultTimeout(10000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('button',{name:'IMPORTAR CASSETTE'})).toBeVisible();
 await expect.poll(async()=>{if(!await page.getByRole('button',{name:'DEMO 93.532 BPM',exact:true}).isVisible())await page.keyboard.press('Control+Shift+m');return page.getByRole('button',{name:'DEMO 93.532 BPM',exact:true}).isVisible();}).toBe(true);await page.getByRole('button',{name:'DEMO 93.532 BPM',exact:true}).click();await page.getByRole('button',{name:'CERRAR',exact:true}).click();
 await page.getByRole('button',{name:'EMPEZAR MINUTO'}).click();
 await expect(page.getByRole('heading',{name:'PREPARADO',exact:true})).toBeVisible();
 await expect(page.locator('.brand img')).toBeVisible();
 expect(await page.locator('.brand img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-preparado.png`});
 await expect(page.locator('[data-phase=round]')).toBeVisible({timeout:14000});
 await expect(page.locator('.timer')).toHaveText('49',{timeout:14000});
 await expect(page.locator('.next-word')).toContainText('09s');
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-mobile.png`});
 for(const size of [{width:1440,height:1000},{width:320,height:568},{width:390,height:844}]){
  await page.setViewportSize(size);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const footer=await page.locator('.performance-bottom').boundingBox();expect(footer!.y+footer!.height).toBeLessThanOrEqual(size.height);
  const timer=await page.locator('.timer').boundingBox();const poster=await page.locator('.word-poster').boundingBox();expect(timer!.y+timer!.height<poster!.y || timer!.x+timer!.width<poster!.x).toBe(true);
  await expect(page.getByRole('button',{name:'DETENER'})).toBeVisible();
  if(size.width===1440)await page.screenshot({animations:'disabled',path:`${out}/minutofms-desktop.png`});
  if(size.width===320)await page.screenshot({animations:'disabled',path:`${out}/minutofms-small-mobile.png`});
 }
 await expect(page.getByText(/SALTAR PALABRA|CAMBIAR MODO|FORMATO OFICIAL|PROTOTIPO INDEPENDIENTE/)).toHaveCount(0);
 await expect(page.locator('.timer.expired')).toHaveCount(1,{timeout:53000});
 await expect(page.locator('.timer.expired')).toHaveCSS('opacity','0');
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-60s.png`});
 await expect(page.getByRole('heading',{name:'TIEMPO',exact:true})).toBeVisible({timeout:5000});
 await page.screenshot({animations:'disabled',path:`${out}/minutofms-tiempo.png`});
 await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeVisible({timeout:6000});
 expect(errors).toEqual([]);
});

test('cassette title and source number survive the redesign; stop returns to selection',async({page})=>{
 await page.goto('/');
 await page.locator('input[type=file]').evaluate(async(input:HTMLInputElement)=>{
  // @ts-expect-error Vite browser module.
  const {demoZip}=await import('/src/cassette/demo.ts');
  const file=await demoZip(80),transfer=new DataTransfer();
  transfer.items.add(new File([await file.arrayBuffer()],'002 CHUTYMECHA.zip',{type:'application/zip'}));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.getByRole('button',{name:'EMPEZAR MINUTO'}).click();
 await expect(page.locator('.matchup')).toContainText('CHUTY VS MECHA');
 await expect(page.locator('.cassette-number')).toHaveText('002');
 await page.getByRole('button',{name:'DETENER'}).click();
 await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeEnabled();
});

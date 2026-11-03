import {test,expect} from '@playwright/test';
const out=process.env.FMS_SCREENSHOT_DIR??'evidence/home';
test('artwork-first home: symbol-only import, landscape covers, selection, volume and playback',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('button',{name:'IMPORTAR CASSETTE',exact:true})).toBeVisible();
 await expect(page.locator('.home .brand img')).toBeVisible();
 await expect(page.getByText(/ELIGE TU|CASSETTE\.|FORMATO|EASY MODE|PROTOTIPO/)).toHaveCount(0);
 await expect(page.locator('.home header')).toHaveText('');
 await page.screenshot({animations:'disabled',path:`${out}/home-empty-mobile.png`});
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'IMPORTAR CASSETTE',exact:true}).click();
 await (await chooser).setFiles({name:'invalid.zip',mimeType:'application/zip',buffer:Buffer.from('invalid')});
 await expect(page.getByRole('alert')).toBeVisible();await page.getByRole('button',{name:'Cerrar error'}).click();
 for(const id of [1,2]){
  await page.locator('input[type=file]').evaluate(async(input:HTMLInputElement,id)=>{
   // @ts-expect-error Vite browser fixture.
   const {cassetteFixture}=await import('/tests/browser/fixtures.ts');
   // @ts-expect-error Vite resolves bare browser module.
   const {default:JSZip}=await import('/node_modules/.vite/deps/jszip.js');
   const file=await cassetteFixture(id),zip=await JSZip.loadAsync(await file.arrayBuffer());
   const c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d')!;
   ctx.fillStyle=id===1?'#220c0d':'#161d0a';ctx.fillRect(0,0,1280,720);
   ctx.fillStyle=id===1?'#e72b23':'#d9ff00';
   for(let i=0;i<42;i++){const h=80+Math.abs(Math.sin(i*.7))*370;ctx.fillRect(100+i*26,(720-h)/2,13,h);}
   // Deliberately landscape test artwork, not supplied cassette art.
   const blob=await new Promise<Blob>(resolve=>c.toBlob(b=>resolve(b!),'image/png'));
   zip.file('COVER.png',await blob.arrayBuffer());const bytes=await zip.generateAsync({type:'arraybuffer'});
   const transfer=new DataTransfer();transfer.items.add(new File([bytes],`Cassette ${id}.zip`));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  },id);
  await expect(page.locator('.cassette')).toHaveCount(id);
 }
 const first=page.getByRole('button',{name:'Cassette 1',exact:true}),second=page.getByRole('button',{name:'Cassette 2',exact:true});
 await expect(second).toHaveAttribute('aria-pressed','true');await first.click();await expect(first).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('slider',{name:'Volumen'})).toBeVisible();
 for(const size of [{name:'mobile',width:390,height:844},{name:'small-mobile',width:320,height:568},{name:'tablet',width:768,height:1024},{name:'tablet-landscape',width:1024,height:768},{name:'desktop',width:1440,height:900},{name:'mobile-landscape',width:844,height:390}]){
  await page.setViewportSize(size);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),size.name).toBe(true);
  const cover=await page.locator('.cover').first().boundingBox();expect(cover!.width/cover!.height).toBeCloseTo(16/9,1);
  await expect(page.locator('.cover img').first()).toHaveCSS('object-fit','contain');
  await page.screenshot({animations:'disabled',path:`${out}/home-${size.name}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'EMPEZAR MINUTO'}).click();await expect(page.locator('[data-phase=intro]')).toBeVisible();
 await page.getByRole('button',{name:'DETENER'}).click();await expect(page.locator('.cassette')).toHaveCount(2);await expect(first).toHaveAttribute('aria-pressed','true');
});

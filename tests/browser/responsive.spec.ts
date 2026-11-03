import {test,expect} from '@playwright/test';
const out=process.env.FMS_SCREENSHOT_DIR??'evidence/responsive';
const sizes=[
 {name:'mobile',width:390,height:844},
 {name:'small-mobile',width:320,height:568},
 {name:'tablet-portrait',width:768,height:1024},
 {name:'large-tablet-portrait',width:1024,height:1366},
 {name:'tablet-landscape',width:1024,height:768},
 {name:'desktop',width:1440,height:900},
 {name:'large-desktop',width:1920,height:1080},
 {name:'mobile-landscape',width:844,height:390},
 {name:'small-landscape',width:667,height:375},
 {name:'square',width:900,height:900},
 {name:'small-tablet-landscape',width:800,height:600},
 {name:'small-tablet-portrait',width:600,height:800},
 {name:'compact-tablet-landscape',width:700,height:600},
 {name:'compact-tablet-portrait',width:600,height:700},
];
test('responsive stage uses the viewport and preserves readable, separate heroes during rotation',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.65;});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize(sizes[0]);await page.goto('/');
 await page.locator('input[type=file]').evaluate(async(input:HTMLInputElement)=>{
  // @ts-expect-error Vite source module.
  const {demoZip}=await import('/src/cassette/demo.ts');const file=await demoZip(80),dt=new DataTransfer();dt.items.add(new File([await file.arrayBuffer()],'002 CHUTYMECHA.zip'));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.getByRole('button',{name:'EMPEZAR MINUTO'}).click();
 // The intro must fit as well as the shorter word labels.
 for(const size of sizes){
  await page.setViewportSize(size);
  const cue=await page.locator('h1.cue').boundingBox();
  expect(cue!.x,`${size.name}: intro left`).toBeGreaterThanOrEqual(0);
  expect(cue!.x+cue!.width,`${size.name}: intro right`).toBeLessThanOrEqual(size.width);
 }
 await expect(page.locator('[data-phase=round]')).toBeVisible({timeout:14000});
 await expect(page.getByRole('heading',{name:'LIBERTAD',exact:true})).toBeVisible();
 for(const size of sizes){
  await page.setViewportSize(size);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),size.name).toBe(true);
  const stage=await page.locator('.in-session').boundingBox();
  expect(stage!.width,size.name).toBeCloseTo(Math.min(size.width,1600),0);
  expect(stage!.height,size.name).toBeCloseTo(size.height,0);
  for(const selector of ['.timer','.word-poster','.next-word','.performance-bottom','.stop']){
   const b=await page.locator(selector).boundingBox();
   expect(b!.x,`${size.name}: ${selector} left`).toBeGreaterThanOrEqual(-1);
   expect(b!.y,`${size.name}: ${selector} top`).toBeGreaterThanOrEqual(-1);
   expect(b!.x+b!.width,`${size.name}: ${selector} right`).toBeLessThanOrEqual(size.width+1);
   expect(b!.y+b!.height,`${size.name}: ${selector} bottom`).toBeLessThanOrEqual(size.height+1);
  }
  const timer=await page.locator('.timer').boundingBox(),stimulus=await page.locator('.stimulus').boundingBox();
  expect(timer!.y+timer!.height<=stimulus!.y || timer!.x+timer!.width<=stimulus!.x,`${size.name}: separated heroes`).toBe(true);
  const footer=await page.locator('.performance-bottom').boundingBox(),next=await page.locator('.next-word').boundingBox();
  expect(next!.y+next!.height,`${size.name}: next word above footer`).toBeLessThanOrEqual(footer!.y);
  await page.screenshot({animations:'disabled',path:`${out}/responsive-${size.name}.png`});
 }
 await page.getByRole('button',{name:'DETENER'}).click();await expect(page.getByRole('button',{name:'EMPEZAR MINUTO'})).toBeEnabled();
 for(const size of [...sizes,{name:'intermediate-tablet',width:601,height:900}]){
  await page.setViewportSize(size);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${size.name}: selection overflow`).toBe(true);
  const play=await page.getByRole('button',{name:'EMPEZAR MINUTO'}).boundingBox();
  expect(play!.x+play!.width,`${size.name}: selection launch`).toBeLessThanOrEqual(size.width);
 }
 expect(errors).toEqual([]);
});

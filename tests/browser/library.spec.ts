import {test,expect} from '@playwright/test';
test('uploaded ZIP and cover survive reopening; cancellation and conscious deletion persist',async({page,context})=>{
 await page.goto('/');await expect(page.locator('input[type=file]')).toBeEnabled();
 await page.locator('input[type=file]').evaluate(async(input:HTMLInputElement)=>{
  // @ts-expect-error Vite fixture module.
  const {cassetteFixture}=await import('/tests/browser/fixtures.ts');
  const file=await cassetteFixture(1),dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await expect(page.locator('.cassette')).toHaveCount(1);await expect(page.locator('input[type=file]')).toBeEnabled();
 const id=await page.locator('.cassette').getAttribute('aria-label');
 await page.close();const reopened=await context.newPage();await reopened.goto('/');
 await expect(reopened.locator('.cassette')).toHaveCount(1);await expect(reopened.locator('.cassette')).toHaveAttribute('aria-label',id!);
 expect(await reopened.locator('.cover img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await reopened.getByRole('button',{name:'EMPEZAR MINUTO'}).click();await expect(reopened.locator('[data-phase=intro]')).toBeVisible();await reopened.getByRole('button',{name:'DETENER'}).click();
 await reopened.getByRole('button',{name:/^Borrar Cassette/}).click();await expect(reopened.getByRole('dialog')).toBeVisible();await reopened.getByRole('button',{name:'CANCELAR',exact:true}).click();await expect(reopened.locator('.cassette')).toHaveCount(1);
 await reopened.getByRole('button',{name:/^Borrar Cassette/}).click();await reopened.getByRole('button',{name:'BORRAR',exact:true}).click();await expect(reopened.locator('.cassette')).toHaveCount(0);
 await reopened.reload();await expect(reopened.locator('input[type=file]')).toBeEnabled();await expect(reopened.locator('.cassette')).toHaveCount(0);
});
test('storage failure never pretends that an uploaded cassette was saved',async({page})=>{
 await page.addInitScript(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='cassettes')throw new DOMException('Sin espacio disponible','QuotaExceededError');return put.apply(this,args);};});
 await page.goto('/');await expect(page.locator('input[type=file]')).toBeEnabled();
 await page.locator('input[type=file]').evaluate(async(input:HTMLInputElement)=>{
  // @ts-expect-error Vite fixture module.
  const {cassetteFixture}=await import('/tests/browser/fixtures.ts');const f=await cassetteFixture(2),dt=new DataTransfer();dt.items.add(f);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await expect(page.getByRole('alert')).toContainText(/espacio/i);await expect(page.locator('.cassette')).toHaveCount(0);
 await page.reload();await expect(page.locator('input[type=file]')).toBeEnabled();await expect(page.locator('.cassette')).toHaveCount(0);
});

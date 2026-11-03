export interface StoredCassette {id:string;name:string;file:Blob;demo:boolean;addedAt:number}
let connection:Promise<IDBDatabase>|undefined;
function database():Promise<IDBDatabase> {
  if(!connection)connection=new Promise((resolve,reject)=>{
    const scope=new URL(import.meta.env.BASE_URL,location.href).pathname;
    const request=indexedDB.open(`minutofms-library:${scope}`,1);
    request.onupgradeneeded=()=>{request.result.createObjectStore('cassettes',{keyPath:'id'});request.result.createObjectStore('meta');};
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=undefined;};resolve(db);};
    request.onerror=()=>{connection=undefined;reject(request.error);};
    request.onblocked=()=>{connection=undefined;reject(new Error('Cierra las otras pestañas de la app para abrir la biblioteca.'));};
  });
  return connection;
}
const result=<T,>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const completed=(tx:IDBTransaction)=>new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error('No se pudo completar el guardado.'));tx.onerror=()=>{/* Abort reports the transaction failure. */};});
export async function readLibrary() {
  const db=await database(),tx=db.transaction(['cassettes','meta'],'readonly'),done=completed(tx);
  const [items,seeded,selected]=await Promise.all([result(tx.objectStore('cassettes').getAll() as IDBRequest<StoredCassette[]>),result(tx.objectStore('meta').get('demoSeeded')),result(tx.objectStore('meta').get('selected')),done]);
  items.sort((a,b)=>a.addedAt-b.addedAt||a.id.localeCompare(b.id));return {items,seeded:seeded===true,selected:typeof selected==='string'?selected:''};
}
export async function saveCassette(record:StoredCassette) {
  const db=await database(),tx=db.transaction(['cassettes','meta'],'readwrite'),done=completed(tx);
  tx.objectStore('cassettes').put(record);tx.objectStore('meta').put(record.id,'selected');await done;
}
export async function seedDemoFiles(files:File[]) {
  const db=await database(),tx=db.transaction(['cassettes','meta'],'readwrite'),done=completed(tx);
  const request=tx.objectStore('meta').get('demoSeeded');
  request.onsuccess=()=>{
    if(request.result===true)return;
    files.forEach((file,i)=>tx.objectStore('cassettes').put({id:`builtin-demo-${i+1}`,name:file.name,file,demo:true,addedAt:i} satisfies StoredCassette));
    tx.objectStore('meta').put(true,'demoSeeded');
  };
  await done;
}
export async function deleteCassette(id:string) {
  const db=await database(),tx=db.transaction(['cassettes','meta'],'readwrite'),done=completed(tx);
  tx.objectStore('cassettes').delete(id);
  const request=tx.objectStore('meta').get('selected');request.onsuccess=()=>{if(request.result===id)tx.objectStore('meta').delete('selected');};
  await done;
}
export async function rememberSelection(id:string) {
  const db=await database(),tx=db.transaction('meta','readwrite'),done=completed(tx);tx.objectStore('meta').put(id,'selected');await done;
}
export async function requestPersistentStorage() {
  try {if(navigator.storage?.persist&&!await navigator.storage.persisted())await navigator.storage.persist();}catch {/* Browser policy does not invalidate committed IndexedDB data. */}
}

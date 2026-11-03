import JSZip from 'jszip';
import type { Cassette, Clip } from './types';
import { inspectWav } from './wav';
function extract(entry:JSZip.JSZipObject,limit:number):Promise<ArrayBuffer> {
  return new Promise((resolve,reject)=>{
    const chunks:Uint8Array[]=[];let size=0;
    // JSZip 3 exposes this API at runtime but omits it from JSZipObject's types.
    interface ByteStream {on(event:'data',cb:(chunk:Uint8Array)=>void):void;on(event:'error',cb:(error:Error)=>void):void;on(event:'end',cb:()=>void):void;pause():void;resume():void}
    const stream=(entry as unknown as {internalStream(type:'uint8array'):ByteStream}).internalStream('uint8array');
    stream.on('data',chunk=>{size+=chunk.length;if(size>limit){stream.pause();reject(new Error('El contenido descomprimido supera el límite permitido.'));return;}chunks.push(chunk);});
    stream.on('error',reject);
    stream.on('end',()=>{const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}resolve(bytes.buffer);});stream.resume();
  });
}
export interface ImportOptions { requireBreak?: boolean }
// Deliberately bounded aliases: unknown audio is reported, never assigned a role.
export function recognizeName(path:string):string|undefined {
  const leaf=path.replaceAll('\\','/').split('/').pop()!;
  const dot=leaf.lastIndexOf('.'), ext=leaf.slice(dot+1).toLowerCase();
  const stem=leaf.slice(0,dot).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const compact=stem.replace(/[\s_.-]+/g,'');
  if(['png','jpg','jpeg','webp'].includes(ext) && /^(COVER|PORTADA|CARATULA)$/.test(compact)) return `COVER.${ext.toUpperCase()}`;
  if(ext!=='wav') return;
  const match=compact.match(/^(INTRO(?:DUCCION)?|VERSO|VERSE|BREAK|OUTRO)(\d*)$/);
  if(!match) return;
  const role=match[1].startsWith('INTRO')?'INTRO':match[1]==='VERSE'?'VERSO':match[1];
  const n=match[2]?Number(match[2]):1;
  if(!Number.isSafeInteger(n) || n<1 || (role==='INTRO' && n!==1)) return;
  return role==='INTRO'?'INTRO.WAV':`${role}${n}.WAV`;
}
export function validateDurations(intro: number, blocks: number[]) {
  const base=blocks[0];
  if(!base || base<2 || base>30) throw new Error('Los bloques deben durar entre 2 y 30 s.');
  // Keep four-bar material compatible without rejecting small mastering tails.
  // Sources retain their full duration; no trimming, stretching or missing audio synthesis.
  if([intro,...blocks].some(d=>!Number.isFinite(d) || Math.abs(d-base)>0.05)) throw new Error('INTRO, VERSOs y BREAKs deben corresponder a cuatro compases (diferencia máxima 50 ms).');
  return base;
}
export async function importCassette(file: File, context: BaseAudioContext, options:ImportOptions={}): Promise<Cassette> {
  if(file.size>160*1024*1024) throw new Error('ZIP demasiado grande: máximo 160 MB.');
  let zip:JSZip;
  try {zip=await JSZip.loadAsync(file);} catch {throw new Error('No se pudo abrir el ZIP. El archivo está dañado o no es un ZIP.');}
  const files=Object.values(zip.files).filter(f=>!f.dir && !f.name.replaceAll('\\','/').split('/').some(p=>p==='__MACOSX'||p.startsWith('.')));
  if(files.length>80) throw new Error('Demasiados archivos en el ZIP (máximo 80).');
  const recognized=new Map<string,typeof files[number]>();
  const warnings:string[]=[];
  let total=0;
  for(const f of files) {
    const name=recognizeName(f.name);
    if(!name) {if(/\.(wav|mp3|aac|m4a|flac|ogg)$/i.test(f.name)) warnings.push(`Audio sin función reconocida: ${f.name}.`);continue;}
    if(recognized.has(name) && name.startsWith('COVER.')){warnings.push(`Portada duplicada omitida: ${f.name}.`);continue;}
    if(recognized.has(name)) throw new Error(`Nombre duplicado: ${recognized.get(name)!.name} y ${f.name} corresponden a ${name}. Importa un solo cassette por ZIP.`);
    recognized.set(name,f);
  }
  const missing=[];
  if(!recognized.has('INTRO.WAV'))missing.push('INTRO.wav');
  if(![...recognized.keys()].some(n=>n.startsWith('VERSO')))missing.push('al menos un VERSO.wav');
  if(![...recognized.keys()].some(n=>n.startsWith('OUTRO')))missing.push('al menos un OUTRO.wav');
  if(options.requireBreak && !recognized.has('BREAK1.WAV'))missing.push('BREAK1.wav (requerido por esta configuración)');
  if(missing.length)throw new Error(`Faltan: ${missing.join(', ')}.`);
  const clips: Clip[]=[];
  for(const [name,f] of recognized) {
    if(name.startsWith('COVER.')) continue;
    try {
      const bytes=await extract(f,Math.min(64*1024*1024,240*1024*1024-total)); total+=bytes.byteLength;
      const info=inspectWav(bytes);
      let buffer:AudioBuffer;
      try { buffer=await context.decodeAudioData(bytes); } catch { throw new Error('El navegador no pudo decodificar el audio.'); }
      if(Math.abs(buffer.duration-info.duration)>2/context.sampleRate) throw new Error('Duración decodificada inconsistente.');
      clips.push({name,duration:buffer.duration,buffer,musicalDuration:info.musicalDuration});
    } catch(e) {throw new Error(`${f.name}: ${e instanceof Error?e.message:String(e)}`);}
  }
  const group=(prefix:string)=>clips.filter(c=>c.name.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  const intro=group('INTRO')[0], verses=group('VERSO'), breaks=group('BREAK'), outros=group('OUTRO');
  const musical=(c:Clip)=>c.musicalDuration??c.duration;
  const incompatible=[intro,...verses,...breaks].filter(c=>Math.abs(musical(c)-musical(verses[0]))>0.05);
  if(incompatible.length)throw new Error(`Duración incompatible con cuatro compases de ${verses[0].name} (${musical(verses[0]).toFixed(3)} s): ${incompatible.map(c=>`${c.name} (${musical(c).toFixed(3)} s)`).join(', ')}.`);
  const blockDuration=validateDurations(musical(intro),[...verses,...breaks].map(musical));
  if([intro,...verses,...breaks].some(c=>Math.abs(musical(c)-blockDuration)>0.003))warnings.push('Diferencias de duración entre 3 y 50 ms; se conserva cada audio completo. Revisar uniones y tempo.');
  if(clips.some(c=>c.musicalDuration!==undefined && c.duration-c.musicalDuration>0.003))warnings.push('Marcadores smpl: los bloques respetan su región musical; las colas completas se superponen al siguiente bloque.');
  if(!breaks.some(c=>c.name==='BREAK1.WAV')) warnings.push('Sin BREAK1: se usarán versos en todas las posiciones.');
  if(breaks.some(c=>c.name!=='BREAK1.WAV')) warnings.push('Solo BREAK1 se utiliza en este formato.');
  let cover:string|undefined;
  const covers=[...recognized.entries()].filter(([n])=>n.startsWith('COVER.')).sort(([a],[b])=>a.localeCompare(b));
  if(covers.length>1)warnings.push('Varias portadas: se utiliza la primera imagen válida por nombre.');
  for(const [,entry] of covers) {
    try {
      const bytes=await extract(entry,8*1024*1024);
      const blob=new Blob([bytes]);
      const bitmap=await createImageBitmap(blob);bitmap.close();
      cover=URL.createObjectURL(blob);break;
    }catch {warnings.push(`Portada omitida: ${entry.name} no es una imagen válida o supera 8 MB.`);}
  }
  return {id:crypto.randomUUID(),title:file.name.replace(/\.zip$/i,'').replaceAll('_',' '),intro,verses,breaks,outros,cover,blockDuration,bpm:960/blockDuration,warnings,demo:false};
}

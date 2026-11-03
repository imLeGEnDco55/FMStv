import JSZip from 'jszip';
import {demoZip} from './demo';

// Public demo media is synthesized locally: no private music or cover art.
async function cover(bpm:number):Promise<ArrayBuffer> {
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#090c08';ctx.fillRect(0,0,1280,720);
  const color=bpm===80?'#d9ff00':'#ff3328';
  const glow=ctx.createRadialGradient(850,500,10,850,500,800);glow.addColorStop(0,bpm===80?'#566500':'#5b100c');glow.addColorStop(1,'#090c08');ctx.fillStyle=glow;ctx.fillRect(0,0,1280,720);
  ctx.fillStyle=color;
  for(let i=0;i<38;i++){const height=40+Math.abs(Math.sin(i*.83))*220;ctx.globalAlpha=.2;ctx.fillRect(42+i*32,450-height/2,12,height);}
  ctx.globalAlpha=1;ctx.font='italic 900 310px Impact, sans-serif';ctx.fillText(bpm===80?'80':'93.5',68,380);
  ctx.font='700 24px monospace';ctx.fillStyle='#f4f4ed';ctx.fillText('DEMO / SYNTH AUDIO',80,610);
  ctx.fillStyle=color;ctx.fillRect(80,80,180,9);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo crear la portada demo.')),'image/png'));
  return blob.arrayBuffer();
}
export async function publicDemoFiles():Promise<File[]> {
  const files:File[]=[];
  for(const bpm of [80,93.532]){
    const original=await demoZip(bpm),zip=await JSZip.loadAsync(await original.arrayBuffer());
    zip.file('COVER.png',await cover(bpm));
    files.push(new File([await zip.generateAsync({type:'arraybuffer'})],`DEMO ${bpm} BPM.zip`,{type:'application/zip'}));
  }
  return files;
}

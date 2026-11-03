import JSZip from 'jszip';
import {synthWav} from '../../src/cassette/demo';
export async function invalidCassette(kind:'missing'|'duplicate'|'duration'|'compressed') {
 const zip=new JSZip();
 zip.file('SET/INTRO.wav',synthWav(12,80));
 if(kind!=='missing')zip.file('SET/VERSO1.wav',synthWav(kind==='duration'?10:12,80));
 zip.file('SET/OUTRO1.wav',synthWav(3,80));
 if(kind==='duplicate')zip.file('OTHER/intro.WAV',synthWav(12,80));
 if(kind==='compressed') {const bytes=synthWav(12,80);new DataView(bytes).setUint16(20,6,true);zip.file('SET/VERSO1.wav',bytes);}
 return new File([await zip.generateAsync({type:'arraybuffer'})],`${kind}.zip`);
}

export async function cassetteFixture(id:1|2, variation='canonical') {
 const zip=new JSZip(), bpm=id===1?93.532:80, d=Math.round(960/bpm*16000)/16000;
 const prefix=variation==='wrapped'?'Cassette '+id+'/':'';
 const names=['INTRO',...Array.from({length:id===1?4:3},(_,i)=>`VERSO${i+1}`),'BREAK1',...Array.from({length:id===1?2:1},(_,i)=>`OUTRO${i+1}`)];
 // Deliberately shuffled insertion order.
 for(const name of names.reverse()) {
  if(variation==='no-break'&&name==='BREAK1')continue;
  let leaf=name+'.wav';
  if(variation==='aliases')leaf=(name==='INTRO'?'Introducción 01':name.replace('VERSO','verse_0').replace('OUTRO','outro-0').replace('BREAK','break.0'))+'.WaV';
  let bytes=synthWav(name.startsWith('OUTRO')?3:d,bpm);
  if(variation==='bad-outro'&&name==='OUTRO1')bytes=bytes.slice(0,-20);
  if(variation==='mastering'&&name==='VERSO1')bytes=synthWav(d+.01,bpm);
  zip.file(prefix+leaf,bytes);
 }
 if(variation==='bad-cover')zip.file('COVER.png','not an image');
 else if(variation!=='no-cover') {
  const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
  canvas.getContext('2d')!.fillRect(0,0,2,2);
  const blob=await new Promise<Blob>(resolve=>canvas.toBlob(b=>resolve(b!),'image/png'));
  zip.file(prefix+'COVER.png',await blob.arrayBuffer());
 }
 return new File([await zip.generateAsync({type:'arraybuffer'})],`Cassette 00${id}.zip`);
}

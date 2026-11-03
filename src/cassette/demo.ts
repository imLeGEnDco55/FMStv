import JSZip from 'jszip';
// Entirely synthesized fixture: no official music, samples, artwork or artist imitation.
export function synthWav(seconds:number,bpm:number,variant=0):ArrayBuffer {
  const rate=16000, frames=Math.round(seconds*rate), bytes=new ArrayBuffer(44+frames*2), v=new DataView(bytes);
  const str=(p:number,s:string)=>[...s].forEach((c,i)=>v.setUint8(p+i,c.charCodeAt(0)));
  str(0,'RIFF');v.setUint32(4,36+frames*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*2,true);
  for(let i=0;i<frames;i++) {const t=i/rate, beat=t%(60/bpm), hat=t%(30/bpm); const kick=Math.sin(2*Math.PI*(55*beat+3*(1-Math.exp(-35*beat))))*Math.exp(-beat*24);const bass=Math.sin(2*Math.PI*(55+variant*5)*t)*Math.exp(-beat*7);const tick=Math.sin(2*Math.PI*2600*t)*Math.exp(-hat*110);const fade=Math.min(1,t*500,(seconds-t)*500);v.setInt16(44+i*2,Math.round((kick*.32+bass*.15+tick*.08)*fade*32767),true);}
  return bytes;
}
export async function demoZip(bpm:number):Promise<File> {
  const zip=new JSZip(), duration=Math.round(960/bpm*16000)/16000;
  zip.file('INTRO.wav',synthWav(duration,bpm));
  for(let i=1;i<=(bpm===80?3:4);i++)zip.file(`VERSO${i}.wav`,synthWav(duration,bpm,i));
  zip.file('BREAK1.wav',synthWav(duration,bpm,7));
  zip.file('OUTRO1.wav',synthWav(240/bpm,bpm,3));
  if(bpm!==80)zip.file('OUTRO2.wav',synthWav(480/bpm,bpm,4));
  return new File([await zip.generateAsync({type:'arraybuffer'})],`DEMO PROPIA ${bpm} BPM.zip`,{type:'application/zip'});
}

export interface WavInfo { sampleRate: number; channels: number; frames: number; duration: number; bits: number; musicalDuration?: number }
export function inspectWav(bytes: ArrayBuffer): WavInfo {
  const v = new DataView(bytes);
  const str = (p: number, n: number) => Array.from({length:n}, (_,i)=>String.fromCharCode(v.getUint8(p+i))).join('');
  if (v.byteLength < 44 || str(0,4) !== 'RIFF' || str(8,4) !== 'WAVE') throw new Error('Se requiere WAV RIFF PCM válido.');
  if (v.getUint32(4,true)+8 !== v.byteLength) throw new Error('WAV truncado o tamaño RIFF inconsistente.');
  let format = 0, channels = 0, rate = 0, bits = 0, align = 0, data = -1;
  let loopStart:number|undefined, loopEnd:number|undefined;
  for (let p=12; p+8<=v.byteLength;) {
    const size=v.getUint32(p+4,true), end=p+8+size;
    if(end>v.byteLength) throw new Error('Chunk WAV truncado.');
    if(str(p,4)==='fmt ') {
      if(size<16) throw new Error('Cabecera PCM incompleta.');
      format=v.getUint16(p+8,true); channels=v.getUint16(p+10,true); rate=v.getUint32(p+12,true); align=v.getUint16(p+20,true); bits=v.getUint16(p+22,true);
    }
    if(str(p,4)==='smpl') {
      if(size<36)throw new Error('Marcadores smpl incompletos.');
      const loops=v.getUint32(p+8+28,true);
      if(loops>1)throw new Error('Hay varios loops musicales; se requiere un único bloque.');
      if(loops===1) {
        if(size<60)throw new Error('Loop smpl truncado.');
        loopStart=v.getUint32(p+8+44,true);loopEnd=v.getUint32(p+8+48,true);
      }
    }
    if(str(p,4)==='data') { if(data!==-1) throw new Error('WAV con múltiples chunks data no soportado.'); data=size; }
    p=end+(size%2);
  }
  if(![1,3].includes(format) || ![1,2].includes(channels) || rate<8000 || rate>192000 || !(format===1 ? [16,24,32].includes(bits) : bits===32)) throw new Error('Usa PCM entero 16/24/32 bits o float32, mono/estéreo, 8–192 kHz (sin compresión ni extensible).');
  if(align!==channels*bits/8 || data<=0 || data%align) throw new Error('Datos PCM o alineación inválidos.');
  const frames=data/align;
  if(frames/rate>120) throw new Error('Cada archivo debe durar como máximo 120 segundos.');
  if(loopStart!==undefined && (loopStart!==0 || loopEnd===undefined || loopEnd<loopStart || loopEnd>=frames))throw new Error('Marcador musical inválido: el loop debe comenzar en cero y terminar dentro del audio.');
  const musicalDuration=loopEnd===undefined?undefined:(loopEnd+1)/rate;
  return {sampleRate:rate, channels, frames, duration:frames/rate, bits, musicalDuration};
}

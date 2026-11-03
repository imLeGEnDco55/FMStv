import type { Cassette, Clip } from '../cassette/types';
export const WORDS=['ORIGEN','VÉRTIGO','CALLE','FUTURO','CICATRIZ','FUEGO','RAÍZ','PULSO','FRONTERA','ECO','HAMBRE','LIBERTAD','RUIDO','DESTINO','CÓDIGO','MEMORIA','SOMBRA','VUELO'];
export interface Segment {clip: Clip; at: number; kind:'intro'|'verse'|'break'|'outro'; block?:number}
export interface Turn { segments:Segment[]; words:string[]; verseStart:number; outroStart:number; end:number; blockCount:number }
export function planTurn(c:Cassette, random= Math.random):Turn {
  const pick=<T,>(a:T[])=>a[Math.min(a.length-1,Math.floor(random()*a.length))];
  const segments:Segment[]=[{clip:c.intro,at:0,kind:'intro'}];
  const introDuration=c.intro.musicalDuration??c.intro.duration;
  let at=introDuration, count=0;
  const break1=c.breaks.find(b=>b.name==='BREAK1.WAV');
  while(at-introDuration < 60-1e-8) {
    count++;
    const isBreak=!!break1 && (count===3 || count===6);
    const clip=isBreak ? break1! : pick(c.verses);
    segments.push({clip,at,kind:isBreak?'break':'verse',block:count}); at+=clip.musicalDuration??clip.duration;
  }
  const outroStart=at, outro=pick(c.outros);
  segments.push({clip:outro,at,kind:'outro'});
  const pool=[...WORDS], words:string[]=[];
  for(let i=0;i<6;i++) words.push(pool.splice(Math.min(pool.length-1,Math.floor(random()*pool.length)),1)[0]);
  return {segments,words,verseStart:introDuration,outroStart,end:Math.max(...segments.map(s=>s.at+s.clip.duration)),blockCount:count};
}
export function turnView(turn:Turn, time:number) {
  const elapsed=Math.max(0,time-turn.verseStart);
  const phase=time<turn.verseStart?'intro':time<turn.outroStart?'round':time<turn.end?'outro':'done';
  // The intro spans four 4/4 bars: the final bar contains four beat cues.
  const beat=turn.verseStart/16;
  const cueBeat=Math.floor(time/beat+1e-9)-12;
  const preparation=cueBeat<0?'PREPARADO':(['3','2','1','TIEMPO'] as const)[Math.min(3,cueBeat)];
  return {phase,elapsed,remaining:Math.max(0,60-elapsed),word:turn.words[Math.min(5,Math.floor(elapsed/10))],wordIndex:Math.min(5,Math.floor(elapsed/10)),preparation,segment:[...turn.segments].reverse().find(s=>s.at<=time) ?? turn.segments[0]};
}

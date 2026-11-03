import {describe,it,expect} from 'vitest';
import {planTurn,turnView} from '../src/game-engine/turn';
import {validateDurations} from '../src/cassette/import';
import {synthWav} from '../src/cassette/demo';
import {inspectWav} from '../src/cassette/wav';
import type {Cassette,Clip} from '../src/cassette/types';
function fixture(d:number,withBreak=true):Cassette {
 const clip=(name:string,duration=d)=>({name,duration,buffer:{} as AudioBuffer}) as Clip;
 return {id:'test',title:'Fixture',intro:clip('INTRO.WAV'),verses:[clip('VERSO1.WAV'),clip('VERSO2.WAV')],breaks:withBreak?[clip('BREAK1.WAV')]:[],outros:[clip('OUTRO1.WAV',3)],blockDuration:d,bpm:960/d,demo:true,warnings:[]};
}
describe('musical turn',()=>{
 for(const [d,n] of [[12,5],[960/93.532,6]]) it(`${d} s selects minimum ${n} whole blocks`,()=>{
  const t=planTurn(fixture(d),()=>.25);expect(t.blockCount).toBe(n);expect(t.outroStart-t.verseStart).toBeGreaterThanOrEqual(60-1e-8);expect(t.outroStart-t.verseStart-d).toBeLessThan(60);
  expect(t.segments.filter(s=>s.kind==='break').map(s=>s.block)).toEqual(n===6?[3,6]:[3]);
  for(let i=1;i<t.segments.length;i++)expect(t.segments[i].at).toBeCloseTo(t.segments[i-1].at+t.segments[i-1].clip.duration,10);
  expect(new Set(t.words).size).toBe(6);
 });
 for(const d of [12,960/93.532]) it(`keeps PREPARADO for three bars and cues each beat of the fourth at ${960/d} BPM`,()=>{
  const t=planTurn(fixture(d)),beat=d/16;
  for(const time of [0,beat*4,beat*8,beat*12-.0001])expect(turnView(t,time).preparation).toBe('PREPARADO');
  for(const [index,cue] of ['3','2','1','TIEMPO'].entries()){
   const at=beat*(12+index);
   expect(turnView(t,at).preparation).toBe(cue);
   expect(turnView(t,at+beat-.0001).preparation).toBe(cue);
   expect(turnView(t,at).phase).toBe('intro');
   expect(turnView(t,at).remaining).toBe(60);
  }
  expect(turnView(t,d-.0001).preparation).toBe('TIEMPO');
  expect(turnView(t,d).phase).toBe('round');
  expect(turnView(t,d).remaining).toBe(60);
 });
 it('clock hits zero while last block continues, then full outro',()=>{const t=planTurn(fixture(960/93.532));const v=turnView(t,t.verseStart+60);expect(v.remaining).toBe(0);expect(v.phase).toBe('round');expect(turnView(t,t.outroStart).phase).toBe('outro');expect(turnView(t,t.end-.001).phase).toBe('outro');expect(turnView(t,t.end).phase).toBe('done');});
 it('changes exactly at ten-second boundaries',()=>{const t=planTurn(fixture(12));for(let i=0;i<6;i++)expect(turnView(t,12+i*10).word).toBe(t.words[i]);expect(turnView(t,21.999).wordIndex).toBe(0);});
 it('falls back to verses without BREAK1',()=>expect(planTurn(fixture(12,false)).segments.some(s=>s.kind==='break')).toBe(false));
 it('never uses clips from another cassette',()=>{const c=fixture(12),t=planTurn(c);const owned=[c.intro,...c.verses,...c.breaks,...c.outros];expect(t.segments.every(s=>owned.includes(s.clip))).toBe(true);});
});
describe('PCM validation',()=>{
 it('uses real frames rather than filename or declared BPM',()=>{const info=inspectWav(synthWav(12,80));expect(info.frames).toBe(192000);expect(info.duration).toBe(12);});
 it('rejects truncation and compressed WAV',()=>{const bytes=synthWav(2,80);expect(()=>inspectWav(bytes.slice(0,-2))).toThrow();new DataView(bytes).setUint16(20,6,true);expect(()=>inspectWav(bytes)).toThrow();});
 it('rejects mismatched musical blocks and intro',()=>{expect(()=>validateDurations(12,[12,10.264])).toThrow();expect(()=>validateDurations(3,[12])).toThrow();expect(validateDurations(12,[12,12])).toBe(12);});
});

describe('musical markers and preserved tails',()=>{
 it('advances on musical regions while sources keep their full tails',()=>{
  const c=fixture(12);for(const clip of [c.intro,...c.verses,...c.breaks]){clip.musicalDuration=12;clip.duration=12.4;}
  const t=planTurn(c,()=>0);
  expect(t.verseStart).toBe(12);expect(t.blockCount).toBe(5);expect(t.outroStart).toBe(72);
  expect(t.segments[1].clip.duration).toBe(12.4);expect(turnView(t,72).phase).toBe('outro');
 });
 it('reads inclusive smpl endpoints and rejects out-of-range markers',()=>{
  const source=synthWav(12.4,80), bytes=new ArrayBuffer(source.byteLength+68), u=new Uint8Array(bytes);u.set(new Uint8Array(source));
  const v=new DataView(bytes),p=source.byteLength;
  v.setUint32(4,bytes.byteLength-8,true);u.set([115,109,112,108],p);v.setUint32(p+4,60,true);v.setUint32(p+8+28,1,true);v.setUint32(p+8+48,191999,true);
  expect(inspectWav(bytes).musicalDuration).toBe(12);
  v.setUint32(p+8+48,999999,true);expect(()=>inspectWav(bytes)).toThrow('Marcador musical inválido');
 });
});

import type { Turn } from '../game-engine/turn';
export function scheduleTurn(context:BaseAudioContext, bus:AudioNode, turn:Turn, start:number) {
  return turn.segments.map(segment=>{
    const node=context.createBufferSource(); node.buffer=segment.clip.buffer; node.connect(bus); node.start(start+segment.at); return node;
  });
}
export class AudioEngine {
  readonly context=new AudioContext({latencyHint:'interactive'});
  readonly musicBus=this.context.createGain();
  // Reserved routing point for future opt-in microphone capture; no permission requested.
  readonly voiceBus=this.context.createGain();
  readonly masterBus=this.context.createGain();
  private sources:AudioBufferSourceNode[]=[];
  startAt=0;
  constructor() {this.musicBus.connect(this.masterBus);this.voiceBus.connect(this.masterBus);this.masterBus.connect(this.context.destination);this.masterBus.gain.value=0.75;}
  async play(turn:Turn) { await this.context.resume(); if(this.context.state!=='running') throw new Error('El navegador no pudo activar el audio.'); this.stop(); this.startAt=this.context.currentTime+0.15; this.sources=scheduleTurn(this.context,this.musicBus,turn,this.startAt); }
  get time() {return Math.max(0,this.context.currentTime-this.startAt);}
  stop() {for(const node of this.sources) {try {node.stop();} catch {/* already ended */}node.disconnect();}this.sources=[];}
  volume(value:number) {this.masterBus.gain.setTargetAtTime(value,this.context.currentTime,0.02);}
}

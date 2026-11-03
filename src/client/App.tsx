import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio-engine/engine';
import { importCassette } from '../cassette/import';
import { demoZip } from '../cassette/demo';
import type { Cassette } from '../cassette/types';
import { planTurn, turnView } from '../game-engine/turn';
import type { Turn } from '../game-engine/turn';

// Vite replaces this flag at build time. Diagnostics never ship in production.
const DEV=import.meta.env.DEV;
const PUBLIC_DEMO=import.meta.env.PROD&&import.meta.env.VITE_PUBLIC_DEMO==='true';
export function App() {
  const engine=useRef<AudioEngine|null>(null), input=useRef<HTMLInputElement>(null);
  const library=useRef<Cassette[]>([]);
  const [cassettes,setCassettes]=useState<Cassette[]>([]), [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [turn,setTurn]=useState<Turn|null>(null), [clock,setClock]=useState(0), [volume,setVolume]=useState(.75);
  const [manager,setManager]=useState(false), [requireBreak,setRequireBreak]=useState(false), [starting,setStarting]=useState(false);
  const cassette=cassettes.find(c=>c.id===selected), view=turn?turnView(turn,clock):null;
  const active=!!view && view.phase!=='done';
  const audio=()=>engine.current ?? (engine.current=new AudioEngine());
  useEffect(()=>{
    if(!turn)return;
    let frame=0;
    const tick=()=>{const time=engine.current!.time;setClock(time);if(time<turn.end)frame=requestAnimationFrame(tick);else engine.current!.stop();};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[turn]);
  useEffect(()=>()=>{engine.current?.stop();void engine.current?.context.close();for(const c of library.current)if(c.cover)URL.revokeObjectURL(c.cover);},[]);
  useEffect(()=>{
    if(!DEV)return;
    const toggle=(e:KeyboardEvent)=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='m'){e.preventDefault();setManager(v=>!v);}};
    window.addEventListener('keydown',toggle);return()=>window.removeEventListener('keydown',toggle);
  },[]);
  useEffect(()=>{
    if(!PUBLIC_DEMO)return;
    let cancelled=false;setBusy(true);
    void import('../cassette/public-demo').then(({publicDemoCassettes})=>publicDemoCassettes(audio().context)).then(items=>{
      if(cancelled){for(const c of items)if(c.cover)URL.revokeObjectURL(c.cover);return;}
      library.current=[...items,...library.current];setCassettes(library.current);setSelected(id=>id||items[0].id);
    }).catch(e=>{if(!cancelled)setError(String(e));}).finally(()=>{if(!cancelled)setBusy(false);});
    return()=>{cancelled=true;};
  },[]);
  async function load(file:File, demo=false) {
    if(active||starting||busy)return;
    setBusy(true);setError('');
    try {const c=await importCassette(file,audio().context,{requireBreak});c.demo=demo;library.current=[...library.current,c];setCassettes(library.current);setSelected(c.id);setTurn(null);}catch(e){setError(e instanceof Error?e.message:'No se pudo importar.');}finally{setBusy(false);}
  }
  async function demo(bpm:number) {if(busy)return;try{await load(await demoZip(bpm),true);}catch(e){setError(String(e));}}
  async function start() {
    if(!cassette||active||starting)return;setError('');setStarting(true);
    try {const plan=planTurn(cassette);await audio().play(plan);setClock(0);setManager(false);setTurn(plan);}catch(e){setError(String(e));}finally{setStarting(false);}
  }
  const seconds=Math.ceil(view?.remaining??60);
  const timer=seconds.toString().padStart(2,'0');
  const entryCue=!!view&&(view.phase==='intro'||(view.phase==='round'&&view.elapsed<1));
  const display=view?.phase==='intro'?view.preparation:entryCue?'TIEMPO':view?.phase==='outro'?'TIEMPO':view?.phase==='done'?'OTRO MINUTO':view?.word??'';
  const title=cassette?.title.replace(/^\d+[\s_-]*/, '').replace(/CHUTY[\s_-]*MECHA/i,'CHUTY VS MECHA').replace(/ZTIK?MA[\s_-]*KAIZER/i,'ZTICMA VS KAIZER');
  const nextWord=Math.max(0,Math.ceil(10-(view?.elapsed??0)%10));
  return <div className={`app ${active?'in-session':'home'}`}>
    <header><a className="brand" href="./" aria-label="Minuto FMS, inicio"><img src={`${import.meta.env.BASE_URL}assets/FMSLOGO.png`} alt="Freestyle Master Series"/></a>{active&&<><span className="header-mode">EASY MODE</span><button className="quiet stop" onClick={()=>{engine.current?.stop();setTurn(null);}}>DETENER <span>×</span></button></>}</header>
    <main>
      {active?<section className={`performance phase-${view!.phase} ${entryCue?'showing-cue':''}`} aria-label="Escenario del turno" data-phase={view!.phase}>
        <div className="performance-top"><div className="matchup"><span className="cassette-number">{(cassette?.title.match(/^\d+/)?.[0]??String(cassettes.findIndex(c=>c.id===selected)+1)).padStart(3,'0')}</span><span>{title?.split(/(VS)/i).map((part,i)=>part.toUpperCase()==='VS'?<em key={i}> VS </em>:part)}</span></div><span className="round-mark"><i/> EN VIVO</span></div>
        <div className="performance-body"><div className="hazard" aria-hidden="true"/>
          {!entryCue&&<div className={`timer ${view!.elapsed>=60&&view!.phase!=='intro'?'expired':''}`} aria-label={`Tiempo restante ${timer}`}>{timer}</div>}
          <div className="stimulus">
            {view!.phase==='round'&&!entryCue&&<div className="word-label">PALABRA ACTUAL</div>}
            <div className={`word-poster ${entryCue?'preparing':''}`}>
              {view!.phase==='round'&&!entryCue&&<span className="poster-index">#{String(view!.wordIndex+1).padStart(2,'0')}</span>}
              <h1 key={display} className={entryCue?`cue ${/^[321]$/.test(display)?'cue-number':''}`:''} style={{'--word-size':`${Math.min(96,510/Math.max(display.length,5))}px`} as import('react').CSSProperties}>{display}</h1>
              {view!.phase==='round'&&!entryCue&&<span className="poster-duration">10s</span>}
            </div>
            {view!.phase==='round'&&!entryCue&&view!.elapsed<60&&<div className="next-word"><i/> SIGUIENTE PALABRA EN: <b>{String(nextWord).padStart(2,'0')}s</b></div>}
          </div>
        </div>
        <div className="performance-bottom"><div className="word-track" aria-label="Progreso de palabras">{Array.from({length:6},(_,i)=><span key={i} className={view!.phase!=='intro'&&i<=view!.wordIndex?'lit':''}/>)}</div></div>
      </section>:<section className="selection" aria-label="Seleccionar cassette">
        <div className="collection" aria-label="Cassettes">
          {cassettes.map((c,i)=><button key={c.id} className={`cassette ${selected===c.id?'selected':''}`} aria-label={c.title} title={c.title} aria-pressed={selected===c.id} onClick={()=>{setSelected(c.id);setTurn(null);}}>
            <div className="cover">{c.cover?<img src={c.cover} alt=""/>:<div className="type-cover" aria-hidden="true"><b>{String(i+1).padStart(2,'0')}</b></div>}<span className="chosen" aria-hidden="true">✓</span></div>
          </button>)}
          <button className={`add-cassette ${busy?'loading':''}`} aria-label={busy?'Cargando cassette':'IMPORTAR CASSETTE'} title="Importar cassette" aria-busy={busy} disabled={busy||starting} onClick={()=>input.current?.click()}><span aria-hidden="true">＋</span></button>
        </div>
        {cassette&&<div className="launch">
          <label className="volume"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3zm13-2a7 7 0 0 1 0 10l-1.4-1.4a5 5 0 0 0 0-7.2L16 7z"/></svg><input aria-label="Volumen" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>{const value=Number(e.target.value);setVolume(value);audio().volume(value);}}/></label>
          <button className="play" aria-label="EMPEZAR MINUTO" title="Empezar minuto" disabled={busy||starting} onClick={()=>void start()}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 3v18l15-9z"/></svg></button>
        </div>}
      </section>}
      <input ref={input} type="file" accept=".zip,application/zip" hidden disabled={active||busy||starting} onChange={e=>{const f=e.target.files?.[0];if(f)void load(f);e.target.value='';}}/>
      {error&&<div className="error" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={()=>setError('')}>×</button></div>}
      {DEV&&manager&&<section className="manager" aria-label="Manager">
        <div className="manager-title"><h2>MANAGER / DESARROLLO</h2><button onClick={()=>setManager(false)}>CERRAR</button></div>
        <label><input type="checkbox" checked={requireBreak} disabled={active} onChange={e=>setRequireBreak(e.target.checked)}/> Exigir BREAK1 al importar</label>
        <div className="demo"><button disabled={active||busy} onClick={()=>void demo(93.532)}>DEMO 93.532 BPM</button><button disabled={active||busy} onClick={()=>void demo(80)}>DEMO 80 BPM</button></div>
        {cassette&&<><p>{cassette.bpm.toFixed(3)} BPM estimado · {cassette.blockDuration.toFixed(6)} s / cuatro compases · {cassette.verses.length} versos · {cassette.outros.length} outros</p>{cassette.warnings.map(w=><p key={w}>{w}</p>)}</>}
        {turn&&<p>{turn.blockCount} bloques · Outro en {turn.outroStart.toFixed(6)} s · Audio {clock.toFixed(3)} s · {view?.segment.clip.name}</p>}
      </section>}
    </main>
  </div>;
}

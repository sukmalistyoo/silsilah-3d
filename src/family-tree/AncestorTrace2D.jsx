
import React, {useEffect,useLayoutEffect,useState} from 'react';

export default function AncestorTrace2D({paths,run}){
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [phase,setPhase]=useState('idle');
  useEffect(()=>{
    const query=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(query.matches);query.addEventListener('change',change);
    return()=>query.removeEventListener('change',change);
  },[]);
  useLayoutEffect(()=>{
    if(!paths.length){setPhase('idle');return;}
    if(reduced){setPhase('complete');return;}
    setPhase('tracing');
    const end=Math.max(...paths.map(path=>path.delay+path.duration));
    const timer=setTimeout(()=>setPhase('complete'),end*1000+70);
    return()=>clearTimeout(timer);
  },[paths,run,reduced]);
  return <g key={run} className="dgft-ancestor-trace-2d" data-testid="ancestor-trace-2d"
    data-trace-state={phase} aria-hidden="true" pointerEvents="none">
    {paths.map(path=><path key={path.key} d={path.d} fill="none" pathLength={1}
      data-child={path.child} data-parent={path.parent} data-kind={path.kind}
      stroke="#d59a20" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
      vectorEffect="non-scaling-stroke" strokeDasharray="1" strokeDashoffset="1"
      style={{'--trace-delay':path.delay+'s','--trace-duration':path.duration+'s'}}/>)}
  </g>;
}

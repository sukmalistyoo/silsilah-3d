import React, {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {CatmullRomCurve3,LineCurve3,Vector3,TubeGeometry,MeshBasicMaterial} from 'three';

const TUBULAR_SEGMENTS=48;
const RADIAL_SEGMENTS=8;
const INDICES_PER_RING=RADIAL_SEGMENTS*6;

export default function AncestorTrace3D({flow,run,onState}){
  const {invalidate}=useThree();
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const query=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(query.matches);query.addEventListener('change',change);
    return()=>query.removeEventListener('change',change);
  },[]);
  const items=useMemo(()=>flow.lines.map(line=>{
    const vecs=line.points.map(p=>new Vector3(...p));
    const curve=vecs.length>2
      ? new CatmullRomCurve3(vecs,false,'centripetal',0.5)
      : new LineCurve3(vecs[0],vecs[1]);
    const segs=vecs.length>2?TUBULAR_SEGMENTS:12;
    const coreGeo=new TubeGeometry(curve,segs,.019,RADIAL_SEGMENTS,false);
    const glowGeo=new TubeGeometry(curve,segs,.040,RADIAL_SEGMENTS,false);
    return {...line,segs,coreGeo,glowGeo,count:coreGeo.index.count};
  }),[flow]);
  const coreMat=useMemo(()=>new MeshBasicMaterial({color:'#f6d78e',toneMapped:false}),[]);
  const glowMat=useMemo(()=>new MeshBasicMaterial({color:'#d99f3c',transparent:true,opacity:.24,depthWrite:false,toneMapped:false}),[]);
  useEffect(()=>()=>{coreMat.dispose();glowMat.dispose();},[coreMat,glowMat]);
  useEffect(()=>()=>items.forEach(item=>{item.coreGeo.dispose();item.glowGeo.dispose();}),[items]);
  const started=useRef(0),active=useRef(false);
  useLayoutEffect(()=>{
    started.current=performance.now();active.current=items.length>0&&!reduced;
    items.forEach(item=>{
      item.coreGeo.setDrawRange(0,reduced?item.count:0);
      item.glowGeo.setDrawRange(0,reduced?item.count:0);
    });
    onState(!flow.ancestry.selected?'idle':active.current?'tracing':'complete');
    invalidate();
    return()=>{active.current=false;};
  },[items,flow,run,reduced,invalidate,onState]);
  useFrame(()=>{
    const elapsed=(performance.now()-started.current)/1000;
    items.forEach(item=>{
      const progress=reduced?1:Math.max(0,Math.min(1,(elapsed-item.start)/item.duration));
      const drawCount=Math.floor(progress*item.segs)*INDICES_PER_RING;
      item.coreGeo.setDrawRange(0,drawCount);
      item.glowGeo.setDrawRange(0,drawCount);
    });
    if(active.current){
      if(elapsed>=flow.duration){active.current=false;onState('complete');}
      else invalidate();
    }
  });
  return <group>
    {items.map(item=><React.Fragment key={item.key}>
      <mesh geometry={item.glowGeo} material={glowMat} dispose={null}/>
      <mesh geometry={item.coreGeo} material={coreMat} dispose={null}/>
    </React.Fragment>)}
  </group>;
}


export function childLanes(groups,positions=null,orientation='portrait',W=210,H=116){
  const ordered=[...groups].flatMap(([pair,g])=>[...g.children].map(child=>JSON.stringify([pair,child]))).sort();
  const family=new Map(),rows=new Map(),along=orientation==='portrait'?'y':'x',half=orientation==='portrait'?H/2:W/2;
  for(const [pair,group] of groups){
    const parents=(group.parents||[]).map(id=>positions?.get(id)).filter(Boolean);
    const parentCross=parents.length?Math.max(...parents.map(p=>p[along])):group.anchor[along];
    const row=Math.round(parentCross);
    if(!rows.has(row))rows.set(row,[]);
    rows.get(row).push({pair,group,parentCross});
  }
  for(const row of rows.values()){
    row.sort((a,b)=>a.pair.localeCompare(b.pair));
    row.forEach(({pair,group,parentCross},index)=>{
      const kids=[...group.children].map(id=>positions?.get(id)).filter(Boolean);
      const target=kids.length?Math.min(...kids.map(p=>p[along]-half)):null;
      const low=parentCross+half+22,high=target===null?low+80:target-22;
      const fraction=(index+.5)/row.length;
      const bus=high>=low?low+(high-low)*fraction:
        target===null?low:group.anchor[along]+(target-group.anchor[along])*(.38+.24*fraction);
      family.set(pair,{bus,index,count:row.length});
    });
  }
  return {index:new Map(ordered.map((key,i)=>[key,i])),total:ordered.length,family};
}

export function coupleChildRoute(anchor,child,childId,childIds,orientation,W,H,line='elbow',reverse=false,pair='',lanes=null){
  const target=orientation==='portrait'?{x:child.x,y:child.y-H/2}:{x:child.x-W/2,y:child.y};
  const start=reverse?target:anchor,end=reverse?anchor:target;
  if(line==='straight')return 'M'+start.x+','+start.y+' L'+end.x+','+end.y;
  const axis=orientation==='portrait'?'y':'x';
  const bus=lanes?.family?.get(pair)?.bus??(anchor[axis]+(target[axis]-anchor[axis])*.52);
  if(line==='curve')return orientation==='portrait'
    ?'M'+start.x+','+start.y+' C'+start.x+','+bus+' '+end.x+','+bus+' '+end.x+','+end.y
    :'M'+start.x+','+start.y+' C'+bus+','+start.y+' '+bus+','+end.y+' '+end.x+','+end.y;
  if(orientation==='portrait')return reverse
    ?'M'+target.x+','+target.y+' V'+bus+' H'+anchor.x+' V'+anchor.y
    :'M'+anchor.x+','+anchor.y+' V'+bus+' H'+target.x+' V'+target.y;
  return reverse
    ?'M'+target.x+','+target.y+' H'+bus+' V'+anchor.y+' H'+anchor.x
    :'M'+anchor.x+','+anchor.y+' H'+bus+' V'+target.y+' H'+target.x;
}

export function spouseConnection2D(a,b,orientation,W,H,spacing=1){
  const along=orientation==='portrait'?'x':'y',cross=orientation==='portrait'?'y':'x';
  const distance=Math.abs(a[along]-b[along]);
  if(distance<=230*spacing*1.45&&Math.abs(a[cross]-b[cross])<2){
    const start=orientation==='portrait'?{x:a.x+(b.x>=a.x?W/2:-W/2),y:a.y}:{x:a.x,y:a.y+(b.y>=a.y?H/2:-H/2)};
    const end=orientation==='portrait'?{x:b.x+(a.x>=b.x?W/2:-W/2),y:b.y}:{x:b.x,y:b.y+(a.y>=b.y?H/2:-H/2)};
    const anchor={x:(start.x+end.x)/2,y:(start.y+end.y)/2};
    return {anchor,d:'M'+start.x+','+start.y+' L'+end.x+','+end.y,
      halves:[start,end].map(p=>'M'+anchor.x+','+anchor.y+' L'+p.x+','+p.y)};
  }
  if(orientation==='portrait'){
    const y=Math.min(a.y,b.y)-H/2-30,anchor={x:(a.x+b.x)/2,y};
    return {anchor,d:'M'+a.x+','+(a.y-H/2)+' V'+y+' H'+b.x+' V'+(b.y-H/2),
      halves:[a,b].map(p=>'M'+anchor.x+','+y+' H'+p.x+' V'+(p.y-H/2))};
  }
  const x=Math.min(a.x,b.x)-W/2-30,anchor={x,y:(a.y+b.y)/2};
  return {anchor,d:'M'+(a.x-W/2)+','+a.y+' H'+x+' V'+b.y+' H'+(b.x-W/2),
    halves:[a,b].map(p=>'M'+x+','+anchor.y+' V'+p.y+' H'+(p.x-W/2))};
}
export function spouseRoute2D(a,b,orientation,W,H,spacing=1){
  return spouseConnection2D(a,b,orientation,W,H,spacing).d;
}

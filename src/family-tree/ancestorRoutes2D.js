
import {isAncestorLink} from './ancestry';
import {childLanes,coupleChildRoute} from './relationRoutes2D';

export function ancestorPaths2D(ancestry,edges,pos,childRoutes,siblingGroups,{orientation,W,H,childPath,line='elbow'}){
  const paths=[],seen=new Set(),laneOrder=childLanes(siblingGroups,pos,orientation,W,H);
  const step=Math.min(.85,3.6/Math.max(1,...ancestry.nodes.values()));
  for(const edge of edges){
    if(edge.type!=='child'||!isAncestorLink(ancestry,edge.from,edge.to))continue;
    const a=pos.get(edge.from),b=pos.get(edge.to);if(!a||!b)continue;
    const route=childRoutes.get(edge.from+'|'+edge.to);
    const key=(route?route.pair:edge.from)+'|'+edge.to;
    if(seen.has(key))continue;seen.add(key);
    const delay=(ancestry.nodes.get(edge.to)||0)*step;
    const end=orientation==='portrait'?{x:b.x,y:b.y-H/2}:{x:b.x-W/2,y:b.y};
    if(route){
      const group=siblingGroups.get(route.pair);
      const anchor=group.anchor;
      const d=coupleChildRoute(anchor,b,edge.to,[...group.children],orientation,W,H,line,true,route.pair,laneOrder);
      paths.push({key,child:edge.to,kind:'child',d,delay,duration:step*.76});
      for(const parentId of route.parents.length>1?route.parents:[]){
        if(!isAncestorLink(ancestry,parentId,edge.to))continue;
        const parent=pos.get(parentId);
        const port=orientation==='portrait'?{x:parent.x+(anchor.x>=parent.x?W/2:-W/2),y:parent.y}:
          {x:parent.x,y:parent.y+(anchor.y>=parent.y?H/2:-H/2)};
        paths.push({key:key+':'+parentId,child:edge.to,parent:parentId,kind:'spouse',
          d:route.parentPaths?.get(parentId)||'M'+anchor.x+','+anchor.y+' L'+port.x+','+port.y,delay:delay+step*.76,duration:step*.22});
      }
    }else{
      const start=orientation==='portrait'?{x:a.x,y:a.y+H/2}:{x:a.x+W/2,y:a.y};
      paths.push({key,child:edge.to,parent:edge.from,kind:'child',d:childPath(end,start),delay,duration:step*.76});
    }
  }
  return paths;
}

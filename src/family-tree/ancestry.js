
export const pointKey=point=>point.map(value=>value.toFixed(5)).join(':');
export const segmentKey=(type,a,b)=>type+':'+[pointKey(a),pointKey(b)].sort().join('|');
const edgeKey=(parent,child)=>JSON.stringify([parent,child]);
export const isAncestorLink=(ancestry,parent,child)=>ancestry.edges.has(edgeKey(parent,child));

export function findAncestors(people,selected){
  const peopleById=new Map(people.map(person=>[person.id,person]));
  const parents=new Map(people.map(person=>[person.id,new Set(
    (person.rels?.parents||[]).filter(id=>peopleById.has(id)&&id!==person.id))]));
  for(const person of people)for(const child of person.rels?.children||[]){
    if(parents.has(child)&&child!==person.id)parents.get(child).add(person.id);
  }
  const nodes=new Map(),edges=new Set(),roots=new Set();
  if(!peopleById.has(selected))return {selected,nodes,edges,roots};
  nodes.set(selected,0);
  const queue=[selected];
  for(let i=0;i<queue.length;i++){
    const id=queue[i],known=parents.get(id);
    if(!known.size)roots.add(id);
    for(const parent of known){
      edges.add(edgeKey(parent,id));
      if(!nodes.has(parent)){nodes.set(parent,nodes.get(id)+1);queue.push(parent);}
    }
  }
  return {selected,nodes,edges,roots};
}

export function buildAncestorFlow(ancestry,routes,beatTimings=null){
  const eligible=routes.filter(route=>route.type==='child'&&
    route.parents.some(parent=>ancestry.edges.has(edgeKey(parent,route.child))));
  const levels=Math.max(1,...eligible.map(route=>(ancestry.nodes.get(route.child)||0)+1));
  const step=Math.min(.85,3.6/levels),curves=[],points=new Set();
  function addCurve(path,type,key,start,duration){
    if(!path||path.length<2)return;
    curves.push({key,type,points:path,start,duration});
    points.add(type+':'+pointKey(path[0]));
    points.add(type+':'+pointKey(path[path.length-1]));
  }
  for(const route of eligible){
    const depth=ancestry.nodes.get(route.child)||0;
    const timing=beatTimings?.[depth+1];
    const start=timing?timing.start:depth*step;
    const dur=timing?Math.max(0.4,timing.arrive-timing.start):step;
    addCurve([...route.points].reverse(),'child','child:'+route.child,start,dur*(timing?.86:.76));
    if(route.parents.length===2){
      const spouse=routes.find(item=>item.type==='spouse'&&route.parents.every(id=>item.members.includes(id)));
      if(spouse)for(let i=0;i<spouse.ends.length;i++){
        if(ancestry.edges.has(edgeKey(spouse.ends[i],route.child))){
          const targetPt=i===0?spouse.points[0]:spouse.points[spouse.points.length-1];
          addCurve([route.points[0],targetPt],'spouse','spouse:'+route.child+':'+spouse.ends[i],start+dur*(timing?.86:.76),dur*(timing?.14:.22));
        }
      }
    }
  }
  return {ancestry,lines:curves,points,duration:Math.max(0,...curves.map(line=>line.start+line.duration))};
}

export function findDescendants(people,selected){
  const peopleById=new Map(people.map(person=>[person.id,person]));
  const children=new Map(people.map(person=>[person.id,new Set(
    (person.rels?.children||[]).filter(id=>peopleById.has(id)&&id!==person.id))]));
  for(const person of people)for(const parent of person.rels?.parents||[]){
    if(children.has(parent)&&parent!==person.id)children.get(parent).add(person.id);
  }
  const nodes=new Map(),edges=new Set();
  if(!peopleById.has(selected))return {selected,nodes,edges};
  nodes.set(selected,0);
  const queue=[selected];
  for(let i=0;i<queue.length;i++){
    const id=queue[i],kids=children.get(id);
    for(const child of kids){
      edges.add(edgeKey(id,child));
      if(!nodes.has(child)){nodes.set(child,nodes.get(id)+1);queue.push(child);}
    }
  }
  return {selected,nodes,edges};
}

export function buildDescendantFlow(descendants,routes){
  const eligible=routes.filter(route=>route.type==='child'&&
    route.parents.some(parent=>descendants.edges.has(edgeKey(parent,route.child))));
  const levels=Math.max(1,...eligible.map(route=>descendants.nodes.get(route.child)||1));
  const step=Math.min(.7,2.8/levels),curves=[],points=new Set();
  for(const route of eligible){
    if(!route.points||route.points.length<2)continue;
    const depth=Math.max(0,(descendants.nodes.get(route.child)||1)-1);
    const start=depth*step;
    curves.push({key:'desc:'+route.child,type:'child',points:route.points,start,duration:step*.82});
    points.add('child:'+pointKey(route.points[0]));
    points.add('child:'+pointKey(route.points[route.points.length-1]));
  }
  return {descendants,lines:curves,points,duration:Math.max(0,...curves.map(line=>line.start+line.duration))};
}

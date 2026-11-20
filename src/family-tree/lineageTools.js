import {findAncestors,pointKey} from './ancestry.js';

const displayName=person=>[person?.data?.['first name'],person?.data?.['last name']].filter(Boolean).join(' ')||'Tanpa nama';

/**
 * Compute top-down generation number (Gen 1 = root ancestor) and parent label for every person.
 */
export function computeGenerationMeta(people){
  const byId=new Map(people.map(p=>[p.id,p]));
  const parentsMap=new Map(people.map(p=>[p.id,new Set(
    (p.rels?.parents||[]).filter(id=>byId.has(id)&&id!==p.id)
  )]));
  const spousesMap=new Map(people.map(p=>[p.id,new Set(
    (p.rels?.spouses||[]).filter(id=>byId.has(id)&&id!==p.id)
  )]));
  for(const p of people){
    for(const cid of p.rels?.children||[]){
      if(parentsMap.has(cid)&&cid!==p.id)parentsMap.get(cid).add(p.id);
    }
    for(const sid of p.rels?.spouses||[]){
      if(spousesMap.has(sid)&&sid!==p.id)spousesMap.get(sid).add(p.id);
    }
  }
  const memo=new Map();
  const visiting=new Set();
  const getGen=id=>{
    if(memo.has(id))return memo.get(id);
    if(visiting.has(id))return 1;
    visiting.add(id);
    const parents=[...(parentsMap.get(id)||[])];
    let g=1;
    for(const pid of parents){
      g=Math.max(g,getGen(pid)+1);
    }
    visiting.delete(id);
    memo.set(id,g);
    return g;
  };
  const meta=new Map();
  for(const p of people){
    const parents=[...(parentsMap.get(p.id)||[])];
    const spouses=[...(spousesMap.get(p.id)||[])];
    let gen=getGen(p.id);
    let parentLabel='Leluhur puncak';
    if(parents.length){
      const pNames=parents.map(pid=>displayName(byId.get(pid))).filter(Boolean);
      parentLabel=`anak ${pNames.slice(0,2).join(' & ')}`;
    }else if(spouses.length){
      // Married-in spouse inherits their partner's generation if partner has parents
      const partnerWithLineage=spouses.find(sid=>(parentsMap.get(sid)?.size||0)>0);
      if(partnerWithLineage){
        gen=getGen(partnerWithLineage);
        parentLabel=`pasangan ${displayName(byId.get(partnerWithLineage))}`;
      }else{
        parentLabel=`pasangan ${displayName(byId.get(spouses[0]))}`;
      }
    }
    meta.set(p.id,{gen,parentLabel});
  }
  return meta;
}

export function describeKinship(distA,distB,lcaName,viaA=null,viaB=null){
  if(distA===0&&distB===0){
    if(viaA||viaB)return 'Pasangan (Suami / Istri)';
    return 'Tokoh yang sama';
  }
  let base;
  if(distA===1&&distB===0)base=(viaA&&!viaB)?'Menantu & Mertua':'Anak & Orang Tua';
  else if(distA===0&&distB===1)base=(viaB&&!viaA)?'Mertua & Menantu':'Orang Tua & Anak';
  else if((distA===2&&distB===0)||(distA===0&&distB===2))base='Kakek/Nenek & Cucu';
  else if((distA===3&&distB===0)||(distA===0&&distB===3))base='Buyut & Cicit';
  else if(distA===0||distB===0)base=`Garis Lurus (${Math.max(distA,distB)} generasi)`;
  else if(distA===1&&distB===1)base=(viaA||viaB)?'Ipar (Saudara Pasangan)':'Saudara Kandung';
  else if((distA===1&&distB===2)||(distA===2&&distB===1))base='Paman/Bibi & Keponakan';
  else if(distA===2&&distB===2)base='Sepupu Dekat (Satu Kakek/Nenek)';
  else if(distA===3&&distB===3)base='Sepupu Mindon (Satu Buyut)';
  else if(distA===distB)base=`Sepupu Tingkat ${distA-1} (Satu ${lcaName})`;
  else base=`Satu Nasab dari ${lcaName} (selisih ${Math.abs(distA-distB)} generasi)`;

  const vias=[viaA,viaB].filter(Boolean);
  if(vias.length)return `${base} (via pasangan ${vias.join(' & ')})`;
  return base;
}

/**
 * Find the Lowest Common Ancestor (LCA) and combined golden paths for two people,
 * including connections through spouses when a married-in spouse has no parents in the tree.
 */
export function findCommonRelationship(people,idA,idB,routes=[]){
  if(!idA||!idB)return null;
  const byId=new Map(people.map(p=>[p.id,p]));
  if(!byId.has(idA)||!byId.has(idB))return null;

  const parentsMap=new Map(people.map(p=>[p.id,new Set(
    (p.rels?.parents||[]).filter(id=>byId.has(id)&&id!==p.id)
  )]));
  const spousesMap=new Map(people.map(p=>[p.id,new Set(
    (p.rels?.spouses||[]).filter(id=>byId.has(id)&&id!==p.id)
  )]));
  for(const p of people){
    for(const cid of p.rels?.children||[]){
      if(parentsMap.has(cid)&&cid!==p.id)parentsMap.get(cid).add(p.id);
    }
    for(const sid of p.rels?.spouses||[]){
      if(spousesMap.has(sid)&&sid!==p.id)spousesMap.get(sid).add(p.id);
    }
  }

  // Helper to attach spouse route segments when a relationship goes through a spouse
  const findSpouseRoute=(u,v)=>routes.find(r=>r.type==='spouse'&&r.members?.includes(u)&&r.members?.includes(v));

  // Direct spouse check first!
  if(spousesMap.get(idA)?.has(idB)){
    const spRoute=findSpouseRoute(idA,idB);
    const lines=spRoute?[{key:'rel-sp:'+idA+':'+idB,type:'spouse',points:spRoute.points,start:0,duration:0.45}]:[];
    const points=new Set();
    if(spRoute?.points?.length){
      points.add('spouse:'+pointKey(spRoute.points[0]));
      points.add('spouse:'+pointKey(spRoute.points[spRoute.points.length-1]));
    }
    const nodes=new Set([idA,idB]);
    return {
      found:true,
      lcaId:idA,
      lcaName:`${displayName(byId.get(idA))} & ${displayName(byId.get(idB))}`,
      nameA:displayName(byId.get(idA)),
      nameB:displayName(byId.get(idB)),
      distA:0,
      distB:0,
      label:'Pasangan (Suami / Istri)',
      nodes,
      flow:{
        ancestry:{selected:idA,nodes,edges:new Set(),roots:new Set([idA])},
        lines,
        points,
        duration:0.45,
      },
    };
  }

  // Try direct bloodline first, then fallback to tracing via spouse(s) if needed
  const candidatesA=[{id:idA,viaSpouse:null},...[...(spousesMap.get(idA)||[])].map(sid=>({id:sid,viaSpouse:sid}))];
  const candidatesB=[{id:idB,viaSpouse:null},...[...(spousesMap.get(idB)||[])].map(sid=>({id:sid,viaSpouse:sid}))];

  let bestMatch=null;
  for(const candA of candidatesA){
    const ancA=findAncestors(people,candA.id);
    for(const candB of candidatesB){
      const ancB=findAncestors(people,candB.id);
      for(const [lcaId,dA] of ancA.nodes.entries()){
        if(!ancB.nodes.has(lcaId))continue;
        const dB=ancB.nodes.get(lcaId);
        // Prefer direct bloodline matches over spouse-hopped matches, then shortest total distance
        const spousePenalty=(candA.viaSpouse?100:0)+(candB.viaSpouse?100:0);
        const score=spousePenalty+dA+dB;
        if(!bestMatch||score<bestMatch.score){
          bestMatch={score,lcaId,dA,dB,candA,candB};
        }
      }
    }
  }

  if(!bestMatch){
    return {
      found:false,
      nameA:displayName(byId.get(idA)),
      nameB:displayName(byId.get(idB)),
      label:'Belum terhubung dalam satu jalur leluhur',
      nodes:new Set([idA,idB]),
      flow:{ancestry:{selected:idA,nodes:new Set([idA,idB]),edges:new Set(),roots:new Set()},lines:[],points:new Set(),duration:0},
    };
  }

  const {lcaId:bestId,dA:distA,dB:distB,candA,candB}=bestMatch;

  const traceToLca=startId=>{
    const queue=[[startId]];
    const seen=new Set([startId]);
    while(queue.length){
      const path=queue.shift();
      const head=path[path.length-1];
      if(head===bestId)return path;
      for(const pid of parentsMap.get(head)||[]){
        if(!seen.has(pid)){
          seen.add(pid);
          queue.push([...path,pid]);
        }
      }
    }
    return [startId];
  };

  const pathA=traceToLca(candA.id);
  const pathB=traceToLca(candB.id);
  const nodes=new Set([idA,idB,...pathA,...pathB]);
  const pairEdges=new Set();
  const addEdges=path=>{
    for(let i=0;i<path.length-1;i++)pairEdges.add(JSON.stringify([path[i+1],path[i]]));
  };
  addEdges(pathA);
  addEdges(pathB);

  const lines=[];
  const points=new Set();
  const step=0.42;

  // Add golden spouse arches if either side connects through their spouse
  if(candA.viaSpouse){
    const spRoute=findSpouseRoute(idA,candA.viaSpouse);
    if(spRoute?.points?.length>=2){
      lines.push({key:'rel-sp-a:'+idA+':'+candA.viaSpouse,type:'spouse',points:spRoute.points,start:0,duration:0.35});
      points.add('spouse:'+pointKey(spRoute.points[0]));
      points.add('spouse:'+pointKey(spRoute.points[spRoute.points.length-1]));
    }
  }
  if(candB.viaSpouse){
    const spRoute=findSpouseRoute(idB,candB.viaSpouse);
    if(spRoute?.points?.length>=2){
      lines.push({key:'rel-sp-b:'+idB+':'+candB.viaSpouse,type:'spouse',points:spRoute.points,start:0,duration:0.35});
      points.add('spouse:'+pointKey(spRoute.points[0]));
      points.add('spouse:'+pointKey(spRoute.points[spRoute.points.length-1]));
    }
  }

  const depthOf=id=>{
    const idxA=pathA.indexOf(id);
    const idxB=pathB.indexOf(id);
    if(idxA>=0&&idxB>=0)return Math.min(idxA,idxB);
    return idxA>=0?idxA:Math.max(0,idxB);
  };
  const offset=(candA.viaSpouse||candB.viaSpouse)?0.25:0;
  for(const route of routes){
    if(route.type!=='child'||!route.points||route.points.length<2)continue;
    const hit=route.parents.some(pid=>pairEdges.has(JSON.stringify([pid,route.child])));
    if(!hit)continue;
    const start=offset+depthOf(route.child)*step;
    lines.push({
      key:'rel:'+route.child,
      type:'child',
      points:[...route.points].reverse(),
      start,
      duration:step*.88,
    });
    points.add('child:'+pointKey(route.points[0]));
    points.add('child:'+pointKey(route.points[route.points.length-1]));
  }

  const lcaName=displayName(byId.get(bestId));
  const viaAName=candA.viaSpouse?displayName(byId.get(candA.viaSpouse)):null;
  const viaBName=candB.viaSpouse?displayName(byId.get(candB.viaSpouse)):null;
  return {
    found:true,
    lcaId:bestId,
    lcaName,
    nameA:displayName(byId.get(idA)),
    nameB:displayName(byId.get(idB)),
    distA,
    distB,
    label:describeKinship(distA,distB,lcaName,viaAName,viaBName),
    nodes,
    flow:{
      ancestry:{selected:idA,nodes,edges:pairEdges,roots:new Set([bestId])},
      lines,
      points,
      duration:Math.max(0,...lines.map(l=>l.start+l.duration)),
    },
  };
}

/**
 * Build a progressive Auto-Tour / Haul sequence using ONLY true leaf descendants
 * ("keturunan terakhir" — nodes with no children below them), ordered from the
 * SHORTEST upward lineage to the FARTHEST / deepest generation, alternating branches.
 */
export function pickTourDescendants(people,layoutCoords){
  const hasChild=new Set();
  for(const p of people){
    for(const cid of p.rels?.children||[]){
      if(layoutCoords.has(cid))hasChild.add(p.id);
    }
    if(layoutCoords.has(p.id)){
      for(const pid of p.rels?.parents||[]){
        if(layoutCoords.has(pid))hasChild.add(pid);
      }
    }
  }

  const leaves=[];
  for(const person of people){
    if(!layoutCoords.has(person.id)||hasChild.has(person.id))continue;
    const anc=findAncestors(people,person.id);
    if(anc.nodes.size<2)continue;
    let maxDepth=0;
    for(const d of anc.nodes.values())if(d>maxDepth)maxDepth=d;
    if(maxDepth<1)continue;
    let branchKey='root';
    for(const [id,d] of anc.nodes.entries()){
      if(d===Math.max(1,maxDepth-1)){branchKey=id;break;}
    }
    leaves.push({id:person.id,depth:maxDepth,branchKey});
  }

  // Group leaf descendants by depth ascending (shortest leaf -> farthest leaf)
  const byDepth=new Map();
  for(const leaf of leaves){
    if(!byDepth.has(leaf.depth))byDepth.set(leaf.depth,[]);
    byDepth.get(leaf.depth).push(leaf);
  }
  const depths=[...byDepth.keys()].sort((a,b)=>a-b);
  const picked=[];
  let lastBranch=null;
  for(const d of depths){
    const pool=[...byDepth.get(d)];
    // Pick up to 2 leaves from distinct branches at the same depth, starting with alternating branch
    const usedAtDepth=new Set();
    while(pool.length&&usedAtDepth.size<2){
      pool.sort((a,b)=>{
        const aDiff=a.branchKey!==lastBranch?1:0;
        const bDiff=b.branchKey!==lastBranch?1:0;
        return bDiff-aDiff;
      });
      const chosen=pool.shift();
      if(!chosen||usedAtDepth.has(chosen.branchKey))continue;
      usedAtDepth.add(chosen.branchKey);
      picked.push(chosen.id);
      lastBranch=chosen.branchKey;
    }
  }
  return picked;
}

/**
 * Render and download an elegant heritage PNG poster of the completed lineage journey.
 */
export function exportLineagePosterPng({steps,title='Silsilah Sunan Gripit',subtitle='Perpustakaan Digital · Pemerintah Desa Gripit'}){
  if(!steps?.length)return;
  // Ordered top-to-bottom: Gen 1 (Leluhur) at top -> Gen N (Descendant) at bottom
  const ordered=[...steps].reverse();
  const width=1080;
  const rowH=ordered.length>12?76:ordered.length>8?90:108;
  const headerH=250;
  const footerH=130;
  const height=Math.max(1350,headerH+ordered.length*rowH+footerH);

  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext('2d');

  // Deep royal navy-obsidian radial background
  const bg=ctx.createRadialGradient(width/2,height*0.24,60,width/2,height*0.5,height*0.85);
  bg.addColorStop(0,'#132844');
  bg.addColorStop(0.55,'#0a1729');
  bg.addColorStop(1,'#050c17');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,width,height);

  // Subtle ambient golden dust motes
  for(let i=0;i<90;i++){
    const s1=Math.sin(i*12.9898+1.2)*43758.5453;
    const s2=Math.sin(i*78.233+3.4)*43758.5453;
    const x=(s1-Math.floor(s1))*width;
    const y=(s2-Math.floor(s2))*height;
    const r=1+(i%3)*0.9;
    ctx.fillStyle=`rgba(246, 215, 142, ${0.08+(i%5)*0.04})`;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }

  // Elegant double gold border frame
  ctx.strokeStyle='rgba(246, 215, 142, 0.34)';
  ctx.lineWidth=2;
  ctx.strokeRect(36,36,width-72,height-72);
  ctx.strokeStyle='rgba(246, 215, 142, 0.14)';
  ctx.lineWidth=1;
  ctx.strokeRect(48,48,width-96,height-96);

  // Header
  ctx.textAlign='center';
  ctx.fillStyle='#e5be72';
  ctx.font='700 20px system-ui, -apple-system, sans-serif';
  ctx.fillText('JALUR NASAB & KETURUNAN',width/2,102);

  ctx.fillStyle='#fff7e6';
  ctx.font='800 46px Georgia, serif';
  ctx.fillText(title,width/2,158);

  ctx.fillStyle='#9eb6cf';
  ctx.font='500 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(subtitle,width/2,194);

  // Gold divider
  const divGrad=ctx.createLinearGradient(width*0.2,0,width*0.8,0);
  divGrad.addColorStop(0,'rgba(246,215,142,0)');
  divGrad.addColorStop(0.5,'rgba(246,215,142,0.85)');
  divGrad.addColorStop(1,'rgba(246,215,142,0)');
  ctx.fillStyle=divGrad;
  ctx.fillRect(width*0.2,218,width*0.6,2);

  // Vertical golden spine
  const spineX=210;
  const startY=headerH+rowH*0.5;
  const endY=headerH+(ordered.length-1)*rowH+rowH*0.5;
  const spineGrad=ctx.createLinearGradient(0,startY,0,endY);
  spineGrad.addColorStop(0,'#ffe5a3');
  spineGrad.addColorStop(0.5,'#d9a343');
  spineGrad.addColorStop(1,'#f6d78e');
  ctx.strokeStyle=spineGrad;
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(spineX,startY);
  ctx.lineTo(spineX,endY);
  ctx.stroke();

  // Render each generation step
  ordered.forEach((step,i)=>{
    const cy=headerH+i*rowH+rowH*0.5;
    const isApex=i===0;
    const isLeaf=i===ordered.length-1;

    // Glowing node circle
    if(isApex||isLeaf){
      ctx.fillStyle='rgba(246, 215, 142, 0.24)';
      ctx.beginPath();
      ctx.arc(spineX,cy,20,0,Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle=isApex?'#ffe5a3':isLeaf?'#f6d78e':'#132844';
    ctx.strokeStyle='#f6d78e';
    ctx.lineWidth=3.5;
    ctx.beginPath();
    ctx.arc(spineX,cy,isApex||isLeaf?11:8.5,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // Generation label on left of spine
    ctx.textAlign='right';
    ctx.fillStyle=isApex||isLeaf?'#f6d78e':'#9db5ce';
    ctx.font=`700 ${ordered.length>12?18:20}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`GEN ${step.genNum??(i+1)}`,spineX-28,cy+6);

    // Card box on right of spine
    const cardX=spineX+32;
    const cardW=width-cardX-86;
    const cardH=Math.min(72,rowH-14);
    const cardY=cy-cardH/2;
    ctx.fillStyle=isApex?'rgba(246,215,142,0.16)':isLeaf?'rgba(246,215,142,0.11)':'rgba(17,37,64,0.72)';
    ctx.strokeStyle=isApex||isLeaf?'rgba(246,215,142,0.68)':'rgba(138,176,214,0.24)';
    ctx.lineWidth=isApex||isLeaf?2:1.2;
    ctx.beginPath();
    ctx.roundRect(cardX,cardY,cardW,cardH,12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign='left';
    ctx.fillStyle=isApex||isLeaf?'#fff9ec':'#e9f1fa';
    ctx.font=`${isApex||isLeaf?'700':'600'} ${ordered.length>12?23:26}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(step.names,cardX+24,cy+8);

    if(isApex||isLeaf){
      ctx.textAlign='right';
      ctx.fillStyle='#f6d78e';
      ctx.font='700 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(isApex?'LELUHUR PUNCAK':'KETURUNAN',cardX+cardW-20,cy+6);
    }
  });

  // Footer
  ctx.textAlign='center';
  ctx.fillStyle='#7f9ab6';
  ctx.font='500 17px system-ui, -apple-system, sans-serif';
  const dateStr=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  ctx.fillText(`DiGripit · ${ordered.length} Generasi · Diunduh ${dateStr}`,width/2,height-68);

  const leafSlug=(ordered[ordered.length-1]?.names||'sunan-gripit')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'sunan-gripit';
  const link=document.createElement('a');
  link.download=`Silsilah-Sunan-Gripit-${leafSlug}.png`;
  link.href=canvas.toDataURL('image/png');
  link.click();
}

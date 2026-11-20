
import {Shape, Path, ExtrudeGeometry, ShapeGeometry} from 'three';

export const portraitShapes=['rounded','square','pill','oval','diamond','hexagon','portrait'];
export const resolvePortraitShape=(person,appearance)=>portraitShapes.includes(person.style?.shape)
  ?person.style.shape:portraitShapes.includes(appearance.shape)?appearance.shape:'rounded';

function outline(kind,scale=1){
  const shape=new Shape();
  if(kind==='portrait'||kind==='oval'){
    shape.absellipse(0,0,(kind==='oval'?.72:.56)*scale,(kind==='oval'?.49:.56)*scale,0,Math.PI*2,false,0);
    return shape;
  }
  if(kind==='diamond'||kind==='hexagon'){
    const points=kind==='diamond'?[[0,.66],[.68,0],[0,-.66],[-.68,0]]:
      Array.from({length:6},(_,i)=>[Math.cos(Math.PI/6+i*Math.PI/3)*.72,Math.sin(Math.PI/6+i*Math.PI/3)*.64]);
    shape.moveTo(points[0][0]*scale,points[0][1]*scale);
    points.slice(1).forEach(([x,y])=>shape.lineTo(x*scale,y*scale));shape.closePath();return shape;
  }
  const w=(kind==='pill'?1.5:kind==='square'?1.13:1.32)*scale;
  const h=(kind==='square'?1.13:1.04)*scale;
  const r=(kind==='pill'?.52:kind==='square'?.035:.20)*scale;
  const x=-w/2,y=-h/2;
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);
  shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);
  shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);shape.closePath();
  return shape;
}

export function makePortraitGeometry(kind,thickness=1){
  const depth=.18*thickness;
  const body=new ExtrudeGeometry(outline(kind),{depth,steps:1,bevelEnabled:true,
    bevelSize:.024,bevelThickness:.024,bevelSegments:3,curveSegments:24});
  body.translate(0,0,-depth);
  const rimShape=outline(kind,1.012);
  rimShape.holes.push(new Path(outline(kind,.928).getPoints(64).reverse()));
  const rim=new ExtrudeGeometry(rimShape,{depth:.032,steps:1,bevelEnabled:true,
    bevelSize:.008,bevelThickness:.012,bevelSegments:2,curveSegments:24});
  rim.translate(0,0,.018);
  const face=new ShapeGeometry(outline(kind,.922),28);
  face.computeBoundingBox();
  const box=face.boundingBox,size=Math.max(box.max.x-box.min.x,box.max.y-box.min.y);
  const uv=face.attributes.uv,position=face.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)/size+.5,position.getY(i)/size+.5);
  uv.needsUpdate=true;face.translate(0,0,.032);
  return {body,rim,face};
}

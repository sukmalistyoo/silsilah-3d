/**
 * Anchored 2-finger navigation for the SVG virtual camera.
 * Coordinates are CSS pixels; offsets are viewBox world units.
 * No DOM or React dependency, so the math is straightforward to test.
 */
export const touchPair = (a,b) => ({
 midpoint:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
 distance:Math.hypot(b.x-a.x,b.y-a.y),
});

export function zoomWithPinch(start, first, second) {
 const pair=touchPair(first,second);
 const zoom=Math.max(.25,Math.min(4,start.zoom*pair.distance/Math.max(1,start.distance)));
 const nextUnits=start.unitsPerPixel*start.zoom/zoom;
 const centerX=start.rect.left+start.rect.width/2;
 const centerY=start.rect.top+start.rect.height/2;
 return {
  zoom,
  offset:{
   x:start.offset.x+(pair.midpoint.x-centerX)*nextUnits-
     (start.midpoint.x-centerX)*start.unitsPerPixel,
   y:start.offset.y+(pair.midpoint.y-centerY)*nextUnits-
     (start.midpoint.y-centerY)*start.unitsPerPixel,
  },
 };
}

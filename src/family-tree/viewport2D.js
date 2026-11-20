/**
 * 2D map-like camera for large family trees.
 *
 * A whole-tree viewBox causes a 100-person tree to shrink to illegibility.
 * Keep a readable virtual window and move that window when panning/zooming,
 * instead of scaling the already fitted SVG element.
 */
export function familyViewport(center, size, zoom = 1) {
  const widthPx = Math.max(280, Number(size?.width) || 1280);
  const heightPx = Math.max(240, Number(size?.height) || 650);
  const baseWidth = widthPx < 620 ? 1020 : Math.max(1580, Math.min(2100, widthPx * 1.07));
  const factor = Math.max(.25, Math.min(4, Number(zoom) || 1));
  const width = baseWidth / factor;
  const height = width * heightPx / widthPx;
  return {
    x: (center?.x || 0) - width / 2,
    y: (center?.y || 0) - height / 2,
    width,
    height,
    unitsPerPixel: width / widthPx,
  };
}

export function familyStartingFocus(people, positions, orientation = 'portrait') {
  if (!people.length || !positions.size) return {x:0,y:0};
  const byId = new Map(people.map(p => [p.id,p]));
  const minimumLevel = Math.min(...[...positions.values()].map(p =>
    orientation === 'portrait' ? p.y : p.x
  ));
  const roots = people.filter(p => {
    const coord = positions.get(p.id);
    return coord && (orientation === 'portrait' ? coord.y : coord.x) === minimumLevel;
  });
  const descendants = id => {
    const seen = new Set(), queue = [id];
    while (queue.length) {
      const next = queue.pop();
      if (seen.has(next)) continue;
      seen.add(next);
      for (const child of byId.get(next)?.rels?.children || []) {
        if (byId.has(child) && !seen.has(child)) queue.push(child);
      }
    }
    return seen.size;
  };
  // For small trees start at the oldest ancestor. Very large genealogies may
  // have a long, almost linear ancestral chain before their first substantial
  // family branch. Start near that branch so opening the page is useful.
  const root = (roots.length ? roots : people).reduce((best, candidate) =>
    descendants(candidate.id) > descendants(best.id) ? candidate : best
  );
  let chosen = root;
  if (people.length >= 30) {
    const rows = new Map();
    for (const person of people) {
      const point = positions.get(person.id);
      if (!point) continue;
      const level = orientation === 'portrait' ? point.y : point.x;
      if (!rows.has(level)) rows.set(level, []);
      rows.get(level).push(person);
    }
    const threshold = Math.max(5, Math.min(10, Math.ceil(people.length * .055)));
    const firstBranch = [...rows].sort((a,b)=>a[0]-b[0])
      .find(([level,members])=>level>minimumLevel && members.length>=threshold);
    if (firstBranch) {
      // Prefer the family cluster that actually fills a readable viewport;
      // a distant leaf with more descendants may otherwise look isolated.
      const points = [...positions.values()];
      const density = candidate => {
        const point = positions.get(candidate.id);
        const along = orientation === 'portrait' ? point.x : point.y;
        const across = orientation === 'portrait' ? point.y : point.x;
        return points.filter(other => {
          const x = orientation === 'portrait' ? other.x : other.y;
          const y = orientation === 'portrait' ? other.y : other.x;
          return Math.abs(x-along) < 800 && y >= across-210 && y <= across+500;
        }).length;
      };
      chosen = firstBranch[1].reduce((best, candidate)=>
        density(candidate)>density(best) ||
        (density(candidate)===density(best) && descendants(candidate.id)>descendants(best.id))
          ? candidate : best
      );
    }
  }
  const point = positions.get(chosen.id) || {x:0,y:0};
  return orientation === 'portrait'
    ? {x:point.x,y:point.y+140}
    : {x:point.x+140,y:point.y};
}

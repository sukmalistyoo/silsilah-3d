/**
 * Deterministic, family-aware 2D placement.
 * Couples are indivisible row units. Child units target their parents' center,
 * with collision-free packing that avoids sending a new spouse to the row's end.
 */
export function familyPositions(people, orientation = 'portrait', spacing = 1) {
  const scale = Math.max(0.7, Math.min(2, Number(spacing) || 1));
  const byId = new Map(people.map(person => [person.id, person]));
  const sourceIndex = new Map(people.map((person, index) => [person.id, index]));
  const depth = new Map(), visiting = new Set();

  function generation(id) {
    if (depth.has(id)) return depth.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = (byId.get(id)?.rels?.parents || []).filter(parentId => byId.has(parentId) && parentId !== id);
    const level = parents.length ? 1 + Math.max(...parents.map(generation)) : 0;
    visiting.delete(id);
    depth.set(id, level);
    return level;
  }
  people.forEach(person => generation(person.id));

  function ancestor(from, to, visited = new Set()) {
    if (from === to) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    return (byId.get(from)?.rels?.children || []).some(id =>
      byId.has(id) && ancestor(id, to, visited)
    );
  }

  const levelOf = new Map(depth);
  // A new spouse without known parents can join their partner's generation,
  // but never move below a recorded child.
  for (let iteration = 0; iteration < Math.min(people.length, 8); iteration++) {
    let changed = false;
    for (const person of people) for (const mate of person.rels?.spouses || []) {
      if (!byId.has(mate) || ancestor(person.id, mate) || ancestor(mate, person.id)) continue;
      const level = Math.max(levelOf.get(person.id) || 0, levelOf.get(mate) || 0);
      const canMove = id => (byId.get(id)?.rels?.children || [])
        .every(child => !byId.has(child) || (depth.get(child) || 0) > level);
      if (canMove(person.id) && canMove(mate)) {
        for (const id of [person.id, mate]) {
          if (levelOf.get(id) !== level) {
            levelOf.set(id, level);
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }

  const width = 210;
  const spouseDistance = width + 28 * scale;
  const siblingGap = 52 * scale;
  const separateTreeGap = 84 * scale;
  const generationGap = 236 * scale;
  const levels = new Map(), personUnit = new Map(), units = [];

  // Build connected marriage units first, independent of where somebody was
  // appended to the database. Two spouses stay neighboring nodes.
  for (const person of people) {
    const level = levelOf.get(person.id) || 0;
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level).push(person.id);
  }
  for (const [level, ids] of [...levels].sort((a, b) => a[0] - b[0])) {
    const allowed = new Set(ids), used = new Set();
    for (const start of ids) {
      if (used.has(start)) continue;
      const members = [], queue = [start];
      used.add(start);
      while (queue.length) {
        const id = queue.shift();
        members.push(id);
        for (const mate of byId.get(id)?.rels?.spouses || []) {
          if (!allowed.has(mate) || used.has(mate) ||
            ancestor(id, mate) || ancestor(mate, id)) continue;
          used.add(mate);
          queue.push(mate);
        }
      }
      members.sort((a, b) => sourceIndex.get(a) - sourceIndex.get(b));
      if (members.length > 2) {
        // The shared spouse is placed between two different partners.
        const hub = members.reduce((best, id) => {
          const degree = (byId.get(id)?.rels?.spouses || []).filter(mate => members.includes(mate)).length;
          const bestDegree = (byId.get(best)?.rels?.spouses || []).filter(mate => members.includes(mate)).length;
          return degree > bestDegree ? id : best;
        }, members[0]);
        const ordered = members.filter(id => id !== hub);
        ordered.splice(Math.floor(ordered.length / 2), 0, hub);
        members.splice(0, members.length, ...ordered);
      }
      const unit = {
        members, level, children: [], parent: null,
        ownWidth: width + (members.length - 1) * spouseDistance,
        order: Math.min(...members.map(id => sourceIndex.get(id))),
        subtreeWidth: 0, center: 0,
      };
      units.push(unit);
      members.forEach(id => personUnit.set(id, unit));
    }
  }

  // A descendant belongs to one primary branch for spatial layout, even
  // when two recorded parents are in different units. All relationships
  // remain intact for connector drawing; this never changes family data.
  for (const unit of units) {
    const votes = new Map();
    for (const id of unit.members) {
      for (const parentId of byId.get(id)?.rels?.parents || []) {
        const parent = personUnit.get(parentId);
        if (!parent || parent === unit || parent.level >= unit.level) continue;
        votes.set(parent, (votes.get(parent) || 0) + 1);
      }
    }
    const candidates = [...votes].sort((a, b) =>
      b[1] - a[1] || b[0].level - a[0].level || a[0].order - b[0].order
    );
    if (candidates.length) {
      unit.parent = candidates[0][0];
      unit.parent.children.push(unit);
    }
  }
  units.forEach(unit => unit.children.sort((a, b) => a.order - b.order));

  // Tidy-subtree packing: a family reserves the width needed by all its
  // descendants. Sibling branches grow independently instead of filling
  // an entire generation row from left to right.
  const measure = unit => {
    const childrenWidth = unit.children.reduce((total, child) =>
      total + measure(child), 0) +
      Math.max(0, unit.children.length - 1) * siblingGap;
    unit.childrenWidth = childrenWidth;
    unit.subtreeWidth = Math.max(unit.ownWidth, childrenWidth);
    return unit.subtreeWidth;
  };
  const roots = units.filter(unit => !unit.parent).sort((a, b) => a.order - b.order);
  roots.forEach(measure);
  const forestWidth = roots.reduce((sum, root) => sum + root.subtreeWidth, 0) +
    Math.max(0, roots.length - 1) * separateTreeGap;

  const result = new Map();
  const place = (unit, left) => {
    const slotCenter = left + unit.subtreeWidth / 2;
    let childLeft = slotCenter - unit.childrenWidth / 2;
    for (const child of unit.children) {
      place(child, childLeft);
      childLeft += child.subtreeWidth + siblingGap;
    }
    // Center parents over the visible first/last child, not just over the
    // rectangular area reserved by descendant branches of unequal size.
    const childCenter = unit.children.length
      ? (unit.children[0].center + unit.children[unit.children.length - 1].center) / 2
      : slotCenter;
    unit.center = Math.max(left + unit.ownWidth / 2,
      Math.min(left + unit.subtreeWidth - unit.ownWidth / 2, childCenter));
    const initial = unit.center - (unit.members.length - 1) * spouseDistance / 2;
    unit.members.forEach((id, index) => {
      const along = initial + index * spouseDistance;
      const across = unit.level * generationGap;
      result.set(id, orientation === 'portrait'
        ? {x: along, y: across}
        : {x: across, y: along});
    });
  };
  let rootLeft = -forestWidth / 2;
  for (const root of roots) {
    place(root, rootLeft);
    rootLeft += root.subtreeWidth + separateTreeGap;
  }

  // Descendant footprints determine safe space for lower generations, but
  // MUST NOT dictate the distance between immediate siblings. Previous
  // subtree-slot placement pushed two children thousands of units apart
  // simply because their grandchildren had large branches. Recenter each
  // level around its actual parents, and resolve collisions only among
  // units that occupy that same generation.
  const finalCenters = new Map();
  for (const [level] of [...levels].sort((a, b) => a[0] - b[0])) {
    const levelUnits = units.filter(unit => unit.level === level);
    const groups = [], groupByParent = new Map();
    for (const unit of levelUnits) {
      // Siblings of the same parent are a single non-interleavable row block.
      // A root without a parent has its own independent group.
      const key = unit.parent || unit;
      if (!groupByParent.has(key)) {
        const group = {units:[],parent:unit.parent,order:unit.order};
        groupByParent.set(key,group);
        groups.push(group);
      }
      groupByParent.get(key).units.push(unit);
    }
    for (const group of groups) {
      group.units.sort((a,b) => a.order-b.order);
      group.width = group.units.reduce((sum,unit)=>sum+unit.ownWidth,0) +
        Math.max(0,group.units.length-1)*siblingGap;
      group.target = group.parent && finalCenters.has(group.parent)
        ? finalCenters.get(group.parent)
        : group.units.reduce((sum,unit)=>sum+unit.center,0)/group.units.length;
    }
    groups.sort((a,b)=>a.target-b.target||a.order-b.order);
    const offsets=[0];
    for(let i=1;i<groups.length;i++) {
      offsets.push(offsets[i-1]+groups[i-1].width/2+groups[i].width/2+separateTreeGap);
    }
    const blocks=[];
    for(let i=0;i<groups.length;i++){
      const value=groups[i].target-offsets[i];
      blocks.push({first:i,last:i,weight:1,total:value,mean:value});
      while(blocks.length>1 && blocks[blocks.length-2].mean>blocks[blocks.length-1].mean){
        const tail=blocks.pop(),head=blocks[blocks.length-1];
        head.last=tail.last;head.weight+=tail.weight;head.total+=tail.total;
        head.mean=head.total/head.weight;
      }
    }
    for(const block of blocks){
      for(let i=block.first;i<=block.last;i++){
        const group=groups[i],center=block.mean+offsets[i];
        let cursor=center-group.width/2;
        for(const unit of group.units){
          const nextCenter=cursor+unit.ownWidth/2;
          finalCenters.set(unit,nextCenter);
          const dx=nextCenter-unit.center;
          for(const id of unit.members){
            const point=result.get(id);
            if(orientation==='portrait')result.set(id,{...point,x:point.x+dx});
            else result.set(id,{...point,y:point.y+dx});
          }
          cursor+=unit.ownWidth+siblingGap;
        }
      }
    }
  }
  return result;
}

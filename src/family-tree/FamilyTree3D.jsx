import React, {Suspense, useCallback, useEffect, useLayoutEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {OrbitControls, PerspectiveCamera, Environment, Lightformer} from '@react-three/drei';
import {MOUSE, TOUCH, Vector3, CatmullRomCurve3, LineCurve3, CubicBezierCurve3, QuadraticBezierCurve3, Matrix4, Color, BufferGeometry, Float32BufferAttribute, CanvasTexture} from 'three';
import './family-tree-3d.css';
import PortraitMount from './PortraitMount';
import AncestorTrace3D from './AncestorTrace3D';
import RelationFinderPanel from './RelationFinderPanel';
import {findAncestors,buildAncestorFlow,findDescendants,buildDescendantFlow,pointKey} from './ancestry';
import {computeGenerationMeta,findCommonRelationship,pickTourDescendants,exportLineagePosterPng} from './lineageTools';
import {resolvePortraitShape} from './portraitGeometry';

const displayName = person => [person.data?.['first name'], person.data?.['last name']].filter(Boolean).join(' ') || 'Tanpa nama';

export const makeSceneLayout = (people, positionMap, depth=1.35, generationPositions=positionMap) => {
  const coords = new Map();
  for (const person of people) {
    const pt = positionMap.get(person.id);
    if (pt) coords.set(person.id, [pt.x / 102, -pt.y / 59, 0]);
  }

  // Fold long vertical 1-to-1 single-node chains into a horizontal serpentine (liak-liuk)
  // so "Seluruh" overview stays compact, widescreen, and clearly readable.
  const lookup = new Map(people.map(p => [p.id, p]));
  const rowMap = new Map();
  for (const [id, pt] of coords) {
    const yKey = pt[1].toFixed(3);
    if (!rowMap.has(yKey)) rowMap.set(yKey, { y: pt[1], ids: [] });
    rowMap.get(yKey).ids.push(id);
  }
  const orderedRows = [...rowMap.values()].sort((a, b) => b.y - a.y);
  let yShift = 0;
  let rIdx = 0;
  const COLS = 7;
  const STEP_X = 2.75;
  const STEP_Y = 3.75;
  while (rIdx < orderedRows.length) {
    // Detect a contiguous run of single-node rows linked 1-to-1 downward
    let runEnd = rIdx;
    while (runEnd < orderedRows.length && orderedRows[runEnd].ids.length === 1) {
      if (runEnd > rIdx) {
        const prevId = orderedRows[runEnd - 1].ids[0];
        const curId = orderedRows[runEnd].ids[0];
        const prevChildren = lookup.get(prevId)?.rels?.children || [];
        if (!prevChildren.includes(curId)) break;
      }
      runEnd++;
    }
    const runLen = runEnd - rIdx;
    if (runLen >= 4) {
      const startY = orderedRows[rIdx].y + yShift;
      const origEndY = orderedRows[runEnd - 1].y + yShift;
      // Align serpentine center with the branching section below (or the chain's own X)
      let anchorX = coords.get(orderedRows[rIdx].ids[0])[0];
      if (runEnd < orderedRows.length) {
        const nextXs = orderedRows[runEnd].ids.map(id => coords.get(id)[0]);
        anchorX = (Math.min(...nextXs) + Math.max(...nextXs)) / 2;
      }
      const totalFoldedRows = Math.ceil(runLen / COLS);
      for (let k = 0; k < runLen; k++) {
        const id = orderedRows[rIdx + k].ids[0];
        const fRow = Math.floor(k / COLS);
        const fColRaw = k % COLS;
        const fCol = fRow % 2 === 0 ? fColRaw : (COLS - 1 - fColRaw);
        const pt = coords.get(id);
        pt[0] = anchorX + (fCol - (COLS - 1) / 2) * STEP_X;
        pt[1] = startY - fRow * STEP_Y;
      }
      const newEndY = startY - (totalFoldedRows - 1) * STEP_Y;
      yShift += newEndY - origEndY;
      rIdx = runEnd;
    } else {
      if (yShift !== 0) {
        for (const id of orderedRows[rIdx].ids) {
          coords.get(id)[1] += yShift;
        }
      }
      rIdx++;
    }
  }

  // Option 2: Multi-row grid compaction for wide generations / parents with many children.
  // Runs dynamically on every render/input so newly added children automatically wrap into
  // tidy 2–3 row clusters beneath their parents, cutting horizontal sprawl by ~50%.
  // Group nodes into generation rows with a 1.2-unit Y tolerance (real generation gap is 4.0)
  // so minor manual 2D Y-jitter never splits same-generation siblings into overlapping rows.
  const allByY = [...coords.entries()].sort((a, b) => b[1][1] - a[1][1]);
  const postRows = [];
  for (const [id, pt] of allByY) {
    const last = postRows[postRows.length - 1];
    if (!last || Math.abs(last.anchorY - pt[1]) > 1.2) {
      postRows.push({ anchorY: pt[1], sumY: pt[1], ids: [id] });
    } else {
      last.ids.push(id);
      last.sumY += pt[1];
    }
  }
  for (const r of postRows) r.y = r.sumY / r.ids.length;
  const hasWideRow = postRows.some(r => r.ids.length >= 10);
  if (hasWideRow) {
    const NODE_W = 2.06;
    const SPOUSE_STEP = 2.38;
    const UNIT_GAP = 0.68;
    const GROUP_GAP = 1.25;
    const SUB_ROW_GAP = 2.95;
    let compactYShift = 0;
    let anyCompacted = false;

    for (const row of postRows) {
      const baseY = row.y + compactYShift;
      if (!anyCompacted && row.ids.length < 10) continue;

      const idSet = new Set(row.ids);
      const used = new Set();
      const units = [];
      const sortedIds = row.ids.slice().sort((a, b) => coords.get(a)[0] - coords.get(b)[0]);
      for (const startId of sortedIds) {
        if (used.has(startId)) continue;
        const members = [];
        const queue = [startId];
        used.add(startId);
        while (queue.length) {
          const cur = queue.shift();
          members.push(cur);
          for (const mate of lookup.get(cur)?.rels?.spouses || []) {
            if (idSet.has(mate) && !used.has(mate)) {
              used.add(mate);
              queue.push(mate);
            }
          }
        }
        members.sort((a, b) => coords.get(a)[0] - coords.get(b)[0]);
        const origX = members.reduce((s, id) => s + coords.get(id)[0], 0) / members.length;
        const hasChildren = members.some(id => (lookup.get(id)?.rels?.children || []).some(cid => coords.has(cid)));
        const parentIds = [...new Set(
          members.flatMap(id => (lookup.get(id)?.rels?.parents || []).filter(pid => coords.has(pid) && coords.get(pid)[1] > baseY + 0.1))
        )].sort();
        units.push({
          members,
          ownWidth: NODE_W + (members.length - 1) * SPOUSE_STEP,
          origX,
          hasChildren,
          parentIds,
        });
      }

      const groupsMap = new Map();
      units.forEach((unit, idx) => {
        const key = unit.parentIds.length ? unit.parentIds.join('|') : `__solo_${idx}`;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, { key, parentIds: unit.parentIds, units: [] });
        }
        groupsMap.get(key).units.push(unit);
      });

      const groups = [...groupsMap.values()].map(group => {
        const origX = group.units.reduce((s, u) => s + u.origX, 0) / group.units.length;
        const targetX = group.parentIds.length
          ? group.parentIds.reduce((s, pid) => s + coords.get(pid)[0], 0) / group.parentIds.length
          : origX;
        const shouldFold =
          (row.ids.length >= 10 && group.units.length >= 4) ||
          (row.ids.length >= 22 && group.units.length >= 3);
        let subRows;
        if (shouldFold) {
          anyCompacted = true;
          const cols =
            group.units.length >= 7 ? (row.ids.length >= 20 ? 3 : 4) :
            group.units.length >= 5 ? 3 : 2;
          const leaves = group.units.filter(u => !u.hasChildren).sort((a, b) => a.origX - b.origX);
          const branches = group.units.filter(u => u.hasChildren).sort((a, b) => a.origX - b.origX);
          const ordered = [...leaves, ...branches];
          subRows = [];
          for (let i = 0; i < ordered.length; i += cols) {
            subRows.push(ordered.slice(i, i + cols));
          }
        } else {
          subRows = [group.units.slice().sort((a, b) => a.origX - b.origX)];
        }
        const subRowObjs = subRows.map(srUnits => ({
          units: srUnits,
          width: srUnits.reduce((s, u) => s + u.ownWidth, 0) + Math.max(0, srUnits.length - 1) * UNIT_GAP,
        }));
        const width = Math.max(...subRowObjs.map(sr => sr.width));
        return { ...group, origX, targetX, subRows: subRowObjs, width };
      });

      groups.sort((a, b) => a.targetX - b.targetX || a.origX - b.origX);
      const offsets = [0];
      for (let i = 1; i < groups.length; i++) {
        offsets.push(offsets[i - 1] + groups[i - 1].width / 2 + groups[i].width / 2 + GROUP_GAP);
      }
      const blocks = [];
      for (let i = 0; i < groups.length; i++) {
        const val = groups[i].targetX - offsets[i];
        blocks.push({ first: i, last: i, weight: 1, total: val, mean: val });
        while (blocks.length > 1 && blocks[blocks.length - 2].mean > blocks[blocks.length - 1].mean) {
          const tail = blocks.pop(), head = blocks[blocks.length - 1];
          head.last = tail.last;
          head.weight += tail.weight;
          head.total += tail.total;
          head.mean = head.total / head.weight;
        }
      }

      let maxSubRows = 1;
      for (const block of blocks) {
        for (let i = block.first; i <= block.last; i++) {
          const group = groups[i];
          const groupCenterX = block.mean + offsets[i];
          maxSubRows = Math.max(maxSubRows, group.subRows.length);
          group.subRows.forEach((sr, srIdx) => {
            const subY = baseY - srIdx * SUB_ROW_GAP;
            let cursor = groupCenterX - sr.width / 2;
            for (const unit of sr.units) {
              const unitCenterX = cursor + unit.ownWidth / 2;
              const startX = unitCenterX - ((unit.members.length - 1) * SPOUSE_STEP) / 2;
              unit.members.forEach((id, mIdx) => {
                coords.get(id)[0] = startX + mIdx * SPOUSE_STEP;
                coords.get(id)[1] = subY;
              });
              cursor += unit.ownWidth + UNIT_GAP;
            }
          });
        }
      }
      if (maxSubRows > 1) {
        compactYShift -= (maxSubRows - 1) * SUB_ROW_GAP;
      }
    }
  }

  // Each visual row sits at a slightly different physical depth.
  const generations=[...new Set([...coords.values()].map(p=>Number(p[1].toFixed(3))))].sort((a,b)=>b-a);
  for(const [,point] of coords){
    const index=generations.findIndex(y=>Math.abs(y-point[1])<.01);
    point[2]=Math.max(-4,Math.min(4,(index-(generations.length-1)/2)*.72))*depth;
  }
  const tiers=generations.flatMap((y,index)=>{
    const list=[...coords.values()].filter(p=>Math.abs(p[1]-y)<.01).sort((a,b)=>a[0]-b[0]);
    const groups=[];
    for(const point of list){
      const last=groups[groups.length-1];
      if(!last||last.length>=7||point[0]-last[last.length-1][0]>3.2)groups.push([point]);
      else last.push(point);
    }
    return groups.map((group,i)=>({y,z:group[0][2],minX:group[0][0],
      maxX:group[group.length-1][0],index:index+':'+i}));
  });
  const xs = [...coords.values()].map(p => p[0]), ys = [...coords.values()].map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const edges = [], seen = new Set();
  for (const person of people) {
    for (const id of person.rels?.children || []) {
      if (!coords.has(person.id) || !coords.has(id)) continue;
      const key = person.id+'|'+id;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({type:'child',from:person.id,to:id});
    }
    for (const id of person.rels?.spouses || []) {
      if (!coords.has(person.id) || !coords.has(id)) continue;
      const key = [person.id,id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({type:'spouse',from:person.id,to:id});
    }
  }
  // Architectural rounded orthogonal bus-bar connector builder.
  // Eliminates spaghetti/power-line fan-outs by routing all children of a parent
  // through a single shared trunk, crisp horizontal rails, and clean vertical gutters.
  const roundedOrthoPath = (rawPts, radius = 0.26) => {
    const pts = [];
    for (const p of rawPts) {
      const prev = pts[pts.length - 1];
      if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]) > 0.02) {
        pts.push(p);
      }
    }
    if (pts.length <= 2) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = new Vector3(...pts[i - 1]);
      const cur = new Vector3(...pts[i]);
      const next = new Vector3(...pts[i + 1]);
      const toPrev = prev.clone().sub(cur);
      const toNext = next.clone().sub(cur);
      const lenIn = toPrev.length();
      const lenOut = toNext.length();
      if (lenIn < 0.02 || lenOut < 0.02) continue;
      toPrev.normalize();
      toNext.normalize();
      if (Math.abs(toPrev.dot(toNext)) > 0.995) continue;
      const r = Math.min(radius, lenIn * 0.42, lenOut * 0.42);
      const pStart = cur.clone().addScaledVector(toPrev, r);
      const pEnd = cur.clone().addScaledVector(toNext, r);
      const arc = new QuadraticBezierCurve3(pStart, cur, pEnd).getPoints(4);
      for (const v of arc) out.push([v.x, v.y, v.z]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };

  // Pre-collect unique parent-family child groups so siblings share one trunk & clean bus lanes.
  const familyKeyOf = (edge) => {
    const parent = lookup.get(edge.from), child = lookup.get(edge.to);
    const mate = (parent?.rels?.spouses || []).find(id => coords.has(id) &&
      ((child?.rels?.parents || []).includes(id) || (lookup.get(id)?.rels?.children || []).includes(edge.to)));
    return mate ? [edge.from, mate].sort().join('|') : edge.from;
  };
  const familyChildrenMap = new Map();
  for (const edge of edges) {
    if (edge.type !== 'child') continue;
    const a = coords.get(edge.from), b = coords.get(edge.to);
    if (!a || !b || Math.abs(a[1] - b[1]) < 0.08) continue;
    const fKey = familyKeyOf(edge);
    if (!familyChildrenMap.has(fKey)) familyChildrenMap.set(fKey, new Set());
    familyChildrenMap.get(fKey).add(edge.to);
  }
  const famTopChildY = new Map();
  const bandFamilies = new Map();
  for (const [fKey, childSet] of familyChildrenMap) {
    const parentIds = fKey.split('|');
    const pY = parentIds.reduce((s, id) => s + coords.get(id)[1], 0) / parentIds.length;
    const topCY = Math.max(...[...childSet].map(id => coords.get(id)[1]));
    famTopChildY.set(fKey, topCY);
    const band = Math.round(pY) + '|' + Math.round(topCY);
    if (!bandFamilies.has(band)) bandFamilies.set(band, []);
    bandFamilies.get(band).push({
      fKey,
      pX: parentIds.reduce((s, id) => s + coords.get(id)[0], 0) / parentIds.length,
    });
  }
  const famLaneFraction = new Map();
  for (const [, list] of bandFamilies) {
    list.sort((a, b) => a.pX - b.pX);
    list.forEach((item, idx) => {
      famLaneFraction.set(item.fKey, list.length === 1 ? 0.5 : 0.22 + 0.56 * (idx / (list.length - 1)));
    });
  }

  const routes = [], couples = new Set();
  for (const edge of edges) {
    const a = coords.get(edge.from), b = coords.get(edge.to);
    if (edge.type === 'spouse') {
      const [left, right] = a[0] < b[0] ? [a, b] : [b, a];
      const z = Math.max(left[2], right[2]) + .14;
      const distance = Math.abs(right[0] - left[0]);
      const near = distance <= 3.4 && Math.abs(left[1] - right[1]) < .08;
      if (near) {
        const p0 = new Vector3(left[0] + .78, left[1] - .16, z);
        const p2 = new Vector3(right[0] - .78, right[1] - .16, z);
        const mid = new Vector3((p0.x + p2.x) / 2, (p0.y + p2.y) / 2 + .08, z + .06);
        const pts = new QuadraticBezierCurve3(p0, mid, p2).getPoints(8).map(v => [v.x, v.y, v.z]);
        routes.push({ type: 'spouse', members: [edge.from, edge.to], ends: a[0] < b[0] ? [edge.from, edge.to] : [edge.to, edge.from], points: pts });
      } else {
        const laneY = Math.max(left[1], right[1]) + 1.05;
        const p0 = new Vector3(left[0], left[1] + .74, z);
        const p3 = new Vector3(right[0], right[1] + .74, z);
        const c1 = new Vector3(left[0], laneY, z + .18);
        const c2 = new Vector3(right[0], laneY, z + .18);
        const pts = new CubicBezierCurve3(p0, c1, c2, p3).getPoints(12).map(v => [v.x, v.y, v.z]);
        routes.push({ type: 'spouse', members: [edge.from, edge.to], ends: a[0] < b[0] ? [edge.from, edge.to] : [edge.to, edge.from], points: pts });
      }
      continue;
    }
    const parent = lookup.get(edge.from), child = lookup.get(edge.to);
    const mate = (parent?.rels?.spouses || []).find(id => coords.has(id) &&
      ((child?.rels?.parents || []).includes(id) || (lookup.get(id)?.rels?.children || []).includes(edge.to)));
    const c = mate ? coords.get(mate) : null;
    if (mate) {
      const pair = [edge.from, mate].sort().join('|') + '|' + edge.to;
      if (couples.has(pair)) continue;
      couples.add(pair);
    }
    const parentY = c ? (a[1] + c[1]) / 2 : a[1];
    // Horizontal serpentine step on the same row: connect side-to-side cleanly
    if (!c && Math.abs(a[1] - b[1]) < 0.08) {
      const dir = b[0] >= a[0] ? 1 : -1;
      const p0 = new Vector3(a[0] + dir * .82, a[1] - .06, a[2] + .10);
      const p2 = new Vector3(b[0] - dir * .82, b[1] - .06, b[2] + .10);
      const mid = new Vector3((p0.x + p2.x) / 2, a[1] + .08, (p0.z + p2.z) / 2 + .08);
      const pts = new QuadraticBezierCurve3(p0, mid, p2).getPoints(10).map(v => [v.x, v.y, v.z]);
      routes.push({ type: 'child', child: edge.to, parents: [edge.from], members: [edge.from, edge.to], points: pts });
      continue;
    }

    const sx = c ? (a[0] + c[0]) / 2 : a[0];
    const sy = parentY - (c ? .24 : .92);
    const sz = (c ? (a[2] + c[2]) / 2 : a[2]) + .04;
    const tx = b[0];
    const ty = b[1] + .78;
    const tz = b[2] + .04;

    const fKey = mate ? [edge.from, mate].sort().join('|') : edge.from;
    const topCY = famTopChildY.get(fKey) ?? b[1];
    const topTargetY = topCY + .78;
    const laneFrac = famLaneFraction.get(fKey) ?? 0.5;
    const gap = Math.max(0.65, sy - topTargetY);
    const busY = topTargetY + gap * (0.28 + 0.44 * laneFrac);
    const busZ = (sz + tz) / 2 - 0.04;

    let waypoints;
    if (b[1] < topCY - 0.5) {
      // Child sits in a lower sub-row of a multi-row sibling grid:
      // route down through an open vertical gutter between upper-row cards!
      const siblings = [...(familyChildrenMap.get(fKey) || [])];
      const upperXs = siblings
        .filter(id => coords.get(id)[1] > b[1] + 0.5)
        .map(id => coords.get(id)[0])
        .sort((u, v) => u - v);
      const gutters = [];
      for (let k = 0; k < upperXs.length - 1; k++) {
        if (upperXs[k + 1] - upperXs[k] > 1.7) {
          gutters.push((upperXs[k] + upperXs[k + 1]) / 2);
        }
      }
      if (!gutters.length && upperXs.length) {
        gutters.push(upperXs[0] - 1.35, upperXs[upperXs.length - 1] + 1.35);
      }
      const spineX = gutters.length
        ? gutters.reduce((best, g) => Math.abs(g - sx) < Math.abs(best - sx) ? g : best, gutters[0])
        : sx;
      const spineZ = busZ - 0.12;
      const subBusY = ty + 0.42;
      waypoints = [
        [sx, sy, sz],
        [sx, busY, busZ],
        [spineX, busY, spineZ],
        [spineX, subBusY, spineZ],
        [tx, subBusY, spineZ],
        [tx, ty, tz],
      ];
    } else if (Math.abs(sx - tx) < 0.08) {
      waypoints = [[sx, sy, sz], [tx, ty, tz]];
    } else {
      waypoints = [
        [sx, sy, sz],
        [sx, busY, busZ],
        [tx, busY, busZ],
        [tx, ty, tz],
      ];
    }
    const pts = roundedOrthoPath(waypoints, 0.26);
    routes.push({ type: 'child', child: edge.to, parents: [edge.from, ...(mate ? [mate] : [])], members: [edge.from, edge.to, ...(mate ? [mate] : [])], points: pts });
  }
  const junctions=new Map();
  for(const route of routes){
    [0,route.points.length-1].forEach(i=>{
      const point=route.points[i];
      const key=route.type+':'+pointKey(point);
      const existing=junctions.get(key);
      if(existing){
        existing.members=[...new Set([...existing.members,...route.members])];
      }else junctions.set(key,{point,type:route.type,members:route.members,port:true});
    });
  }
  const lines=routes.map((route,i)=>({
    key:route.type+':'+i+':'+route.members.join('|'),
    type:route.type,
    points:route.points,
    members:route.members,
  }));
  const ports=[...junctions.values()];
  const sortedRows=[...new Set([...coords.values()].map(p=>p[1]))].sort((a,b)=>b-a);
  const upper=sortedRows.slice(0,Math.min(3,sortedRows.length));
  const firstRow=[...coords.values()].filter(point=>Math.abs(point[1]-(sortedRows[0]||0))<.01);
  const primary=firstRow.length?firstRow[Math.floor((firstRow.length-1)/2)]:[0,0,0];
  const upperBottom=Math.min(...upper,0);
  const bounded=coords.size>12;
  return {
    coords, lines, ports, routes, tiers, count:coords.size,
    minZ:Math.min(0,...[...coords.values()].map(p=>p[2])),maxZ:Math.max(0,...[...coords.values()].map(p=>p[2])),
    focusZ:bounded?primary[2]:0, minX, maxX, minY, maxY,
    width:Math.max(5.1,maxX-minX+3.2),height:Math.max(5.4,maxY-minY+3.0),
    centerX:(minX+maxX)/2,centerY:(minY+maxY)/2,
    primaryId:[...coords].find(([,point])=>point===primary)?.[0]||null,
    focusX:bounded?primary[0]:(minX+maxX)/2,
    focusY:bounded?(primary[1]+upperBottom)/2:(minY+maxY)/2,
    focusWidth:bounded?Math.min(10,Math.max(6.2,maxX-minX+2.5)):Math.max(5.1,maxX-minX+3.2),
    focusHeight:bounded?Math.min(8.5,Math.max(5.6,primary[1]-upperBottom+2)):Math.max(5.4,maxY-minY+3),
  };
};

function buildCinematicBeats(people, selectedId, layout) {
  const ancestry = findAncestors(people, selectedId);
  if (!selectedId || ancestry.nodes.size < 2) return null;
  const peopleById = new Map(people.map(p => [p.id, p]));
  const byDepth = new Map();
  let maxDepth = 0;
  for (const [id, depth] of ancestry.nodes.entries()) {
    if (!layout.coords.has(id)) continue;
    if (!byDepth.has(depth)) byDepth.set(depth, []);
    byDepth.get(depth).push(id);
    if (depth > maxDepth) maxDepth = depth;
  }
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  if (depths.length < 2) return null;
  const beats = [];
  let cursor = 0;

  depths.forEach((depth, idx) => {
    const ids = byDepth.get(depth);
    // Separate direct bloodline tokoh (for indicator) vs spouses (spotlighted in 3D, hidden from indicator)
    let indicatorIds = ids;
    if (ids.length > 1 && idx < depths.length - 1) {
      const withParents = ids.filter(id => (peopleById.get(id)?.rels?.parents || []).some(pid => ancestry.nodes.has(pid)));
      if (withParents.length > 0) indicatorIds = withParents;
    }
    const spotlightSet = new Set(ids);
    const frameIds = [...ids];
    for (const id of ids) {
      const p = peopleById.get(id);
      const pCoord = layout.coords.get(id);
      for (const spId of p?.rels?.spouses || []) {
        if (!layout.coords.has(spId)) continue;
        spotlightSet.add(spId);
        const spCoord = layout.coords.get(spId);
        if (pCoord && spCoord && Math.abs(spCoord[0] - pCoord[0]) <= 3.6 && Math.abs(spCoord[1] - pCoord[1]) < 0.2) {
          if (!frameIds.includes(spId)) frameIds.push(spId);
        }
      }
    }

    const pts = frameIds.map(id => layout.coords.get(id)).filter(Boolean);
    const tx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const ty = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const tz = pts.reduce((s, p) => s + p[2], 0) / pts.length;

    // Indicator shows ONLY the direct lineage tokoh (no spouses)
    const rawIndicatorNames = indicatorIds.map(id => displayName(peopleById.get(id))).filter(Boolean);
    const indicatorName = rawIndicatorNames.length > 2
      ? `${rawIndicatorNames.slice(0, 2).join(' & ')} (+${rawIndicatorNames.length - 2})`
      : rawIndicatorNames.join(' & ');

    const isStart = idx === 0;
    const isApex = idx === depths.length - 1;
    // Top-down generation numbering: Ancestor = Gen 1, descendants count up automatically (Gen 2, 3, ... N)
    const genNum = depths.length - idx;
    const hasSpouseInFrame = frameIds.length > 1;
    // Vertical top-to-bottom pitch tilt (centered front, NOT twisted sideways to the right!)
    const dist = isApex ? (hasSpouseInFrame ? 6.4 : 5.3) : (hasSpouseInFrame ? 6.2 : 4.95);
    const az = isApex ? 0 : (idx % 2 === 0 ? 0.05 : -0.05);
    const pitch = isApex ? -0.34 : -0.46;
    const horiz = Math.cos(pitch) * dist;
    const camPos = [tx + Math.sin(az) * horiz, ty + Math.sin(pitch) * dist, tz + Math.cos(az) * horiz];

    // Scale travel duration proportionally to the actual 3D branch length so long branches never jump!
    let segDist = 0;
    if (idx > 0) {
      const prev = beats[idx - 1].target;
      segDist = Math.hypot(tx - prev[0], ty - prev[1], tz - prev[2]);
    }
    const travelDur = isStart ? 1.15 : Math.max(1.05, Math.min(3.8, 0.72 + segDist * 0.24));
    const holdDur = isStart ? 0.65 : isApex ? 1.35 : 0.58;
    beats.push({
      index: idx,
      total: depths.length,
      genNum,
      shortTag: isApex ? `Gen ${genNum} · Leluhur` : isStart ? `Gen ${genNum} · Awal` : `Gen ${genNum}`,
      label: isApex ? `Gen ${genNum} · Puncak Leluhur` : isStart ? `Gen ${genNum} · Titik Awal` : `Jalur Nasab · Gen ${genNum}`,
      names: indicatorName,
      personIds: [...spotlightSet],
      primaryId: indicatorIds[0] || ids[0],
      target: [tx, ty, tz],
      camPos,
      dist,
      az,
      pitch,
      segDist,
      start: cursor,
      arrive: cursor + travelDur,
      end: cursor + travelDur + holdDur,
      isApex,
      isReveal: false,
    });
    cursor += travelDur + holdDur;
  });

  // Final Grand Reveal beat framing the entire glowing golden lineage at a majestic vertical pitch
  const allPts = [...ancestry.nodes.keys()].map(id => layout.coords.get(id)).filter(Boolean);
  if (allPts.length >= 2) {
    const minX = Math.min(...allPts.map(p => p[0])), maxX = Math.max(...allPts.map(p => p[0]));
    const minY = Math.min(...allPts.map(p => p[1])), maxY = Math.max(...allPts.map(p => p[1]));
    const minZ = Math.min(...allPts.map(p => p[2])), maxZ = Math.max(...allPts.map(p => p[2]));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX + 3.6, (maxY - minY + 3.4) * 1.15);
    const revealDist = Math.min(34, Math.max(8.5, span * 1.18 + (maxZ - minZ) * 0.55));
    const last = beats[beats.length - 1].target;
    const revealSeg = Math.hypot(cx - last[0], cy - last[1], cz - last[2]);
    const travelDur = Math.max(1.35, Math.min(2.8, 0.95 + revealSeg * 0.14));
    const holdDur = 0.65;
    const revealPitch = 0.30;
    const revealHoriz = Math.cos(revealPitch) * revealDist;
    beats.push({
      index: beats.length,
      total: depths.length,
      shortTag: 'Selesai',
      label: 'Garis Nasab Lengkap',
      names: `${beats[0].names} → ${beats[beats.length - 1].names}`,
      personIds: [...new Set(beats.flatMap(b => b.personIds))],
      primaryId: beats[beats.length - 1].primaryId,
      target: [cx, cy, cz],
      camPos: [cx + Math.sin(0.04) * revealHoriz, cy + Math.sin(revealPitch) * revealDist, cz + Math.cos(0.04) * revealHoriz],
      dist: revealDist,
      az: 0.04,
      pitch: revealPitch,
      segDist: revealSeg,
      start: cursor,
      arrive: cursor + travelDur,
      end: cursor + travelDur + holdDur,
      isApex: false,
      isReveal: true,
    });
    cursor += travelDur + holdDur;
  }

  return {
    beats,
    steps: beats.filter(b => !b.isReveal),
    duration: cursor,
    selectedId,
  };
}

function AmbientDust3D({layout}) {
  const {geometry, texture} = useMemo(() => {
    const count = 130;
    const positions = new Float32Array(count * 3);
    const spanX = Math.max(18, layout.width * 1.35);
    const spanY = Math.max(16, layout.height * 1.35);
    const spanZ = Math.max(14, (layout.maxZ - layout.minZ) + 12);
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random distribution so layout never flickers
      const s1 = Math.sin(i * 12.9898 + 1.23) * 43758.5453;
      const s2 = Math.sin(i * 78.233 + 4.56) * 43758.5453;
      const s3 = Math.sin(i * 39.425 + 7.89) * 43758.5453;
      const r1 = s1 - Math.floor(s1), r2 = s2 - Math.floor(s2), r3 = s3 - Math.floor(s3);
      positions[i * 3] = layout.centerX + (r1 - 0.5) * spanX;
      positions[i * 3 + 1] = layout.centerY + (r2 - 0.5) * spanY;
      positions[i * 3 + 2] = (r3 - 0.5) * spanZ;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 232, 178, 0.95)');
    grad.addColorStop(0.45, 'rgba(245, 207, 142, 0.4)');
    grad.addColorStop(1, 'rgba(245, 207, 142, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const tex = new CanvasTexture(canvas);
    return {geometry: geo, texture: tex};
  }, [layout.centerX, layout.centerY, layout.width, layout.height, layout.minZ, layout.maxZ]);

  useEffect(() => () => {
    geometry.dispose();
    texture.dispose();
  }, [geometry, texture]);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial map={texture} size={0.28} sizeAttenuation transparent opacity={0.55} depthWrite={false} color="#f8dfa8"/>
    </points>
  );
}

function CameraRig({layout,reset,rotate,all,focusId,frameBox,domElement,navigationRef,nodeRefs,cinematic,onCinematicBeat,onCinematicEnd}) {
  const {camera,size,invalidate}=useThree();
  const control=useRef(null);
  const panDelta=useMemo(()=>new Vector3(),[]);
  const prevCam=useMemo(()=>new Vector3(),[]);
  const prevTarget=useMemo(()=>new Vector3(),[]);
  const smoothTarget=useMemo(()=>new Vector3(),[]);
  const goalPosVec=useMemo(()=>new Vector3(),[]);
  const goalTgtVec=useMemo(()=>new Vector3(),[]);
  const springGoal=useRef(null);
  const movieRef=useRef(null);
  const initialized=useRef(false);

  const releaseControl=useCallback(()=>{
    const o=control.current;
    if(o){
      o.target.copy(smoothTarget);
      o.enabled=true;
      o.update();
    }
  },[smoothTarget]);

  const cancelAnimations=useCallback(()=>{
    const hadAny=Boolean(springGoal.current||movieRef.current);
    springGoal.current=null;
    if(movieRef.current){
      movieRef.current=null;
      releaseControl();
      onCinematicEnd?.(false);
    }else if(hadAny){
      releaseControl();
    }
  },[onCinematicEnd,releaseControl]);

  useEffect(()=>{
    if(!domElement)return;
    const stopOnUser=event=>{
      if(event.target?.closest?.('.dgft3d-controls,.dgft3d-search,.dgft3d-space,.dgft3d-navigation,.dgft3d-actionbar,.dgft3d-cinema-hud,.dgft3d-journey,.dgft3d-rel-panel,.dgft3d-tour-pill'))return;
      if(springGoal.current||movieRef.current)cancelAnimations();
    };
    domElement.addEventListener('pointerdown',stopOnUser,{capture:true});
    domElement.addEventListener('wheel',stopOnUser,{capture:true,passive:true});
    return()=>{
      domElement.removeEventListener('pointerdown',stopOnUser,{capture:true});
      domElement.removeEventListener('wheel',stopOnUser,{capture:true});
    };
  },[domElement,cancelAnimations]);

  useImperativeHandle(navigationRef,()=>({
    pan(dx,dy){
      cancelAnimations();
      const o=control.current;if(!o)return;
      const screenHeight=2*o.getDistance()*Math.tan(camera.fov*Math.PI/360);
      panDelta.set(dx,-dy,0).applyQuaternion(camera.quaternion).multiplyScalar(screenHeight*.14);
      smoothTarget.copy(o.target);
      o.enabled=false;
      springGoal.current={
        pos:camera.position.clone().sub(panDelta),
        target:o.target.clone().sub(panDelta),
        speed:10,
      };
      invalidate();
    },
    zoom(closer){
      cancelAnimations();
      const o=control.current;if(!o)return;
      const distance=Math.max(o.minDistance,Math.min(o.maxDistance,o.getDistance()*(closer?.76:1/.76)));
      panDelta.copy(camera.position).sub(o.target).setLength(distance);
      smoothTarget.copy(o.target);
      o.enabled=false;
      springGoal.current={
        pos:o.target.clone().add(panDelta),
        target:o.target.clone(),
        speed:10,
      };
      invalidate();
    },
  }),[camera,invalidate,panDelta,cancelAnimations,smoothTarget]);

  // Start continuous spring-based cinematic ascent movie (just like the prototype!)
  useEffect(()=>{
    if(!cinematic?.plan){
      if(movieRef.current){
        movieRef.current=null;
        releaseControl();
      }
      return;
    }
    springGoal.current=null;
    const o=control.current;
    if(o){
      smoothTarget.copy(o.target);
      o.enabled=false;
    }
    movieRef.current={
      plan:cinematic.plan,
      startedAt:performance.now(),
      lastBeatIndex:-1,
    };
    invalidate();
  },[cinematic,invalidate,releaseControl,smoothTarget]);

  const focusPos=focusId?layout.coords.get(focusId):null;
  const selectedFocus=focusPos?focusPos.join(':'):'';
  const frameKey=frameBox?`${frameBox.centerX.toFixed(2)}:${frameBox.centerY.toFixed(2)}:${frameBox.width.toFixed(2)}:${frameBox.height.toFixed(2)}`:'';

  useEffect(()=>{
    if(cinematic?.plan)return;
    const isMobile=size.width<620,ratio=size.width/Math.max(size.height,1);
    const activeBox=!focusPos&&!all?frameBox:null;
    const x=focusPos?.[0]??(activeBox?activeBox.centerX:all?layout.centerX:layout.focusX);
    const y=focusPos?.[1]??(activeBox?activeBox.centerY:all?layout.centerY:layout.focusY);
    const z=focusPos?.[2]??(activeBox?activeBox.centerZ:all?0:layout.focusZ);
    const width=focusPos?(isMobile?3.8:5.0):activeBox?activeBox.width:all?layout.width:layout.focusWidth;
    const height=focusPos?(isMobile?4.2:4.6):activeBox?activeBox.height:all?layout.height:layout.focusHeight;
    const requiredH=Math.max(height,width/Math.max(.5,ratio));
    const fov=camera.fov*Math.PI/180;
    const base=focusPos
      ? Math.max(3.8,Math.min(5.6,requiredH/(2*Math.tan(fov/2))*(isMobile?.64:.74)))
      : Math.max(4.6,requiredH/(2*Math.tan(fov/2))*(activeBox?1.24:isMobile?.48:.84))+((all||activeBox)?((activeBox?.maxZ??layout.maxZ)-(activeBox?.minZ??layout.minZ))*.48:0);
    const goalPos=new Vector3(x+base*(focusPos?.18:activeBox?0:.34),y+base*(focusPos?.12:activeBox?.flat?0:activeBox?.08:.24),z+base);
    const goalTarget=new Vector3(x,y,z);

    if(!initialized.current){
      camera.position.copy(goalPos);
      camera.up.set(0,1,0);
      camera.lookAt(goalTarget);
      camera.updateProjectionMatrix();
      smoothTarget.copy(goalTarget);
      if(control.current){
        control.current.target.copy(goalTarget);
        control.current.update();
      }
      prevCam.copy(camera.position);
      prevTarget.copy(goalTarget);
      initialized.current=true;
      projectMarkers(camera,size,layout,nodeRefs);
      invalidate();
      return;
    }

    if(control.current){
      smoothTarget.copy(control.current.target);
      control.current.enabled=false;
    }
    springGoal.current={pos:goalPos,target:goalTarget,speed:5.4};
    invalidate();
  },[camera,layout,reset,all,selectedFocus,frameKey,size.width,size.height,cinematic,invalidate,nodeRefs,prevCam,prevTarget,smoothTarget]);

  useFrame((_,delta)=>{
    const o=control.current;
    if(!o||!initialized.current)return;
    const dt=Math.min(delta,0.05);
    let needsMore=false;

    // 1. Continuous Exponential Spring Cinematic Ascent following the actual branch length
    if(movieRef.current){
      const m=movieRef.current;
      const elapsed=(performance.now()-m.startedAt)/1000;
      const beats=m.plan.beats;
      let beatIdx=beats.findIndex(b=>elapsed<b.end);
      const finished=beatIdx===-1;
      if(finished)beatIdx=beats.length-1;
      const beat=beats[beatIdx];

      if(beatIdx!==m.lastBeatIndex){
        m.lastBeatIndex=beatIdx;
        onCinematicBeat?.(beat);
      }

      // Smoothly advance target along the connecting branch proportional to segment length
      const travelDur=Math.max(0.01,beat.arrive-beat.start);
      const rawTravel=Math.max(0,Math.min(1,(elapsed-beat.start)/travelDur));
      const travelT=-(Math.cos(Math.PI*rawTravel)-1)/2; // easeInOutSine

      // Offset slightly left in world X so the spotlighted tokoh sits centered cleanly to the right of the left-side Journey Indicator
      const railShift=beat.isReveal?-0.55:-0.42;
      if(beatIdx>0){
        const prev=beats[beatIdx-1];
        goalTgtVec.set(
          prev.target[0]+(beat.target[0]-prev.target[0])*travelT+railShift,
          prev.target[1]+(beat.target[1]-prev.target[1])*travelT,
          prev.target[2]+(beat.target[2]-prev.target[2])*travelT
        );
      }else{
        goalTgtVec.set(beat.target[0]+railShift,beat.target[1],beat.target[2]);
      }

      // Breathe outward subtly mid-climb on long branches with vertical top-to-bottom pitch
      const arcDist=Math.sin(rawTravel*Math.PI)*Math.min(4.8,(beat.segDist||0)*0.22);
      const drift=Math.sin(elapsed*0.75)*0.035;
      const prevAz=beatIdx>0?(beats[beatIdx-1].az??0):(beat.az??0);
      const prevPitch=beatIdx>0?(beats[beatIdx-1].pitch??-0.46):(beat.pitch??-0.46);
      const prevDist=beatIdx>0?(beats[beatIdx-1].dist||5.0):(beat.dist||5.0);
      const az=prevAz+((beat.az??0)-prevAz)*travelT+drift;
      const pitch=prevPitch+((beat.pitch??-0.46)-prevPitch)*travelT;
      const dist=prevDist+((beat.dist||5.0)-prevDist)*travelT+arcDist;
      const horizDist=Math.cos(pitch)*dist;

      goalPosVec.set(
        goalTgtVec.x+Math.sin(az)*horizDist,
        goalTgtVec.y+Math.sin(pitch)*dist,
        goalTgtVec.z+Math.cos(az)*horizDist
      );

      const springSpeed=beat.isReveal?2.8:4.4;
      const alpha=1-Math.exp(-springSpeed*dt);
      camera.position.lerp(goalPosVec,alpha);
      smoothTarget.lerp(goalTgtVec,alpha);
      camera.lookAt(smoothTarget);
      projectMarkers(camera,size,layout,nodeRefs);

      const settled=finished&&camera.position.distanceToSquared(goalPosVec)<0.01&&smoothTarget.distanceToSquared(goalTgtVec)<0.01;
      if(settled){
        movieRef.current=null;
        releaseControl();
        onCinematicEnd?.(true);
      }else{
        needsMore=true;
      }
    }
    // 2. Smooth Exponential Spring Glide (Focus / Reset / Pan / Zoom)
    else if(springGoal.current){
      const g=springGoal.current;
      const alpha=1-Math.exp(-g.speed*dt);
      camera.position.lerp(g.pos,alpha);
      smoothTarget.lerp(g.target,alpha);
      camera.lookAt(smoothTarget);
      projectMarkers(camera,size,layout,nodeRefs);
      if(camera.position.distanceToSquared(g.pos)<0.0015&&smoothTarget.distanceToSquared(g.target)<0.0015){
        camera.position.copy(g.pos);
        smoothTarget.copy(g.target);
        camera.lookAt(smoothTarget);
        springGoal.current=null;
        releaseControl();
        projectMarkers(camera,size,layout,nodeRefs);
      }else{
        needsMore=true;
      }
    }
    // 3. Free OrbitControls with Silky Smooth Damping
    else {
      o.update();
      const edgeX=3.2,edgeY=3.4;
      const wantedX=Math.max(layout.minX-edgeX,Math.min(layout.maxX+edgeX,o.target.x));
      const wantedY=Math.max(layout.minY-edgeY,Math.min(layout.maxY+edgeY,o.target.y));
      if(Math.abs(wantedX-o.target.x)>.0001||Math.abs(wantedY-o.target.y)>.0001){
        camera.position.x+=wantedX-o.target.x;
        camera.position.y+=wantedY-o.target.y;
        o.target.set(wantedX,wantedY,o.target.z);
        o.update();
      }
      const moved=camera.position.distanceToSquared(prevCam)+o.target.distanceToSquared(prevTarget);
      if(moved>0.000003){
        projectMarkers(camera,size,layout,nodeRefs);
        needsMore=true;
      }
    }

    prevCam.copy(camera.position);
    prevTarget.copy(o.enabled?o.target:smoothTarget);
    if(needsMore)invalidate();
  });

  return <OrbitControls ref={control} makeDefault domElement={domElement}
    onChange={()=>{if(control.current?.enabled)invalidate();}}
    enableDamping dampingFactor={.075}
    panSpeed={1.18} rotateSpeed={.82} enablePan enableZoom enableRotate screenSpacePanning zoomToCursor
    mouseButtons={{LEFT:rotate?MOUSE.ROTATE:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:rotate?MOUSE.PAN:MOUSE.ROTATE}}
    touches={{ONE:rotate?TOUCH.ROTATE:TOUCH.PAN,TWO:TOUCH.DOLLY_PAN}}
    minDistance={2.5} maxDistance={Math.max(240,layout.width*9,layout.height*9)}
    zoomSpeed={1.18}
    minPolarAngle={.28} maxPolarAngle={Math.PI-.28}
    minAzimuthAngle={-1.45} maxAzimuthAngle={1.45}/>;
}

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const _projWorld=new Vector3();
const _projCamSpace=new Vector3();

function projectMarkers(camera,size,layout,nodeRefs){
  camera.updateMatrixWorld();
  const pixelsPerUnit=size.height/(2*Math.tan(camera.fov*Math.PI/360));
  for(const [id,point] of layout.coords){
    const el=nodeRefs.current.get(id);if(!el)continue;
    _projWorld.set(point[0],point[1]-.17,point[2]+.30);
    const distance=-_projCamSpace.copy(_projWorld).applyMatrix4(camera.matrixWorldInverse).z;
    const scale=clamp(pixelsPerUnit/(Math.max(distance,.1)*86),.34,1.75);
    _projWorld.project(camera);
    const x=(_projWorld.x*.5+.5)*size.width,y=(-_projWorld.y*.5+.5)*size.height;
    const inFrame=_projWorld.z>=-1&&_projWorld.z<=1&&x>=-24&&x<=size.width+24&&y>=-24&&y<=size.height+24;
    if(!inFrame){
      if(el.style.visibility!=='hidden')el.style.visibility='hidden';
      continue;
    }
    if(el.style.visibility!=='visible')el.style.visibility='visible';
    const boundedScale=scale.toFixed(3);
    el.dataset.trackingScale=boundedScale;
    el.style.zIndex=String(Math.max(1,Math.min(100,Math.round(scale*32))));
    // Pure GPU-composited translate3d — zero CSS layout reflow per frame!
    el.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${boundedScale})`;
  }
}

function PersonOverlay({person,point,selected,traced,dimmed,spotlight,onSelect,appearance,nodeRefs}) {
  const name=displayName(person);
  const tier=person.data?.tier||'';
  const ring=person.style?.stroke || appearance.stroke || '#c4d6e8';
  const fill=person.style?.fill || appearance.fill || '#ffffff';
  const cls='dgft3d-person'
    +(selected?' is-selected':'')
    +(traced&&!selected?' is-ancestor':'')
    +(dimmed?' is-dimmed':'')
    +(spotlight?' is-spotlight':'');
  const nameStyle=tier==='rasul'
    ? {borderColor:'#ffe066',color:'#fff7d6',boxShadow:'0 0 18px rgba(255,207,64,0.45), 0 6px 16px rgba(0,0,0,0.45)'}
    : tier==='nabi'
      ? {borderColor:'#34d399',color:'#d1fae5',boxShadow:'0 0 14px rgba(16,185,129,0.38), 0 6px 16px rgba(0,0,0,0.42)'}
      : undefined;
  return <button type="button" title={name} ref={el=>{if(el)nodeRefs.current.set(person.id,el);else nodeRefs.current.delete(person.id);}}
    className={cls}
    data-testid="tree3d-person" data-world-position={point?.join(',')} data-person-id={person.id} data-ancestor={traced?"true":"false"} data-shape={resolvePortraitShape(person,appearance)} aria-label={'Pilih tokoh '+name} aria-pressed={selected}
    style={{'--dgft3d-ring':ring,'--dgft3d-fill':fill,backgroundColor:'transparent',backgroundImage:'none',border:'none',boxShadow:'none',padding:3}}
    onClick={event=>{event.stopPropagation();onSelect(person.id);}}>
    <span className="dgft3d-avatar" aria-hidden="true"/>
    <span className="dgft3d-name" title={name} style={nameStyle}>{name}</span>
  </button>;
}

function FamilyLink({line,accent}){
  const curve=useMemo(()=>{
    const vecs=line.points.map(p=>new Vector3(...p));
    if(vecs.length>2)return new CatmullRomCurve3(vecs,false,'centripetal',0.5);
    return new LineCurve3(vecs[0],vecs[1]||vecs[0]);
  },[line]);
  const color=line.type==='spouse'?'#e6be78':accent;
  const radius=line.type==='spouse'?.016:.013;
  const segs=line.type==='spouse'?20:40;
  return <mesh>
    <tubeGeometry args={[curve,segs,radius,8,false]}/>
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={line.type==='spouse'?.75:.55}
      metalness={.5} roughness={.18} transparent opacity={line.type==='spouse'?.72:.46}/>
  </mesh>;
}

function ConnectionJunctions({points,accent,tracePoints}){
  const mesh=useRef(null);
  useLayoutEffect(()=>{
    if(!mesh.current)return;
    const matrix=new Matrix4();
    points.forEach((junction,i)=>{
      const isTraced=tracePoints.has(junction.type+':'+pointKey(junction.point));
      const size=isTraced?.042:.028;
      matrix.makeScale(size,size,size);matrix.setPosition(...junction.point);
      mesh.current.setMatrixAt(i,matrix);
      mesh.current.setColorAt(i,new Color(isTraced?'#ffe49e':
        junction.type==='spouse'?'#e7c584':accent));
    });
    mesh.current.instanceMatrix.needsUpdate=true;
    if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
  },[points,accent,tracePoints]);
  return <instancedMesh ref={mesh} args={[null,null,points.length]} frustumCulled={false}>
    <sphereGeometry args={[1,10,8]}/>
    <meshBasicMaterial toneMapped={false}/>
  </instancedMesh>;
}

function StudioEnvironment(){
  return <Environment resolution={64} frames={1}>
    <Lightformer form="rect" intensity={3.2} color="#fff3de" scale={[10,5,1]}
      position={[-5,7,8]} target={[0,0,0]}/>
    <Lightformer form="rect" intensity={2.1} color="#c1dcff" scale={[4,12,1]}
      position={[8,2,4]} target={[0,0,0]}/>
    <Lightformer form="rect" intensity={1.6} color="#8da5c0" scale={[8,4,1]}
      position={[-3,-4,-7]} target={[0,0,0]}/>
  </Environment>;
}

function Scene({people,layout,appearance,thickness,reset,nodeRefs,rotate,selected,all,focusId,frameBox,domElement,navigationRef,flow,traceRun,onTraceState,cinematic,onCinematicBeat,onCinematicEnd,spotlightIds,highlightedIds}) {
  const accent=useMemo(()=>new Color(appearance.line_color||'#74c9d8').lerp(new Color('#e0f6ff'),.42).getStyle(),[appearance.line_color]);
  return <>
    <color attach="background" args={['#081221']}/>
    <fog attach="fog" args={['#081221', 34, 135]}/>
    <ambientLight intensity={.48}/>
    <StudioEnvironment/>
    <hemisphereLight args={['#b7d5ff','#102136',1.15]}/>
    <directionalLight position={[-8,12,15]} intensity={3.3} color="#fff0d4"
      castShadow={people.length<=40} shadow-mapSize={[1024,1024]} shadow-bias={-.0006}
      shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={25} shadow-camera-bottom={-40}/>
    <pointLight position={[5,3,7]} intensity={2.3} color={accent} decay={2} distance={38}/>
    <pointLight position={[-4,-4,1]} intensity={1.1} color="#8c9fe5" decay={2} distance={30}/>
    <AmbientDust3D layout={layout}/>
    <mesh position={[layout.centerX,layout.minY-1.1,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[Math.max(80,layout.width*2),80]}/>
      <meshStandardMaterial color="#0c192a" metalness={.18} roughness={.72}/>
    </mesh>
    <PerspectiveCamera makeDefault fov={39} near={.1} far={5000}/>
    <CameraRig layout={layout} reset={reset} rotate={rotate} all={all} focusId={focusId} frameBox={frameBox} domElement={domElement} navigationRef={navigationRef} nodeRefs={nodeRefs} cinematic={cinematic} onCinematicBeat={onCinematicBeat} onCinematicEnd={onCinematicEnd}/>
    {layout.lines.map(line=><FamilyLink key={line.key} line={line} accent={accent}/>)}
    <ConnectionJunctions points={layout.ports} accent={accent} tracePoints={flow.points}/>
    <AncestorTrace3D flow={flow} run={traceRun} onState={onTraceState}/>
    {people.filter(p=>layout.coords.has(p.id)).map(p=>
      <PortraitMount key={p.id} person={p} point={layout.coords.get(p.id)} selected={p.id===selected} accent={accent} appearance={appearance} thickness={thickness} traced={highlightedIds.has(p.id)||spotlightIds.has(p.id)}/>)}
  </>;
}

export default function FamilyTree3D({
  people,
  positions,
  generationPositions=positions,
  appearance,
  selected,
  onSelect,
  onDeselect,
  onBackTo2D,
  reset=0,
  cinematicOnSelect=false,
  onEditPerson=null,
  onAddRelative=null,
  onOpenProfile=null,
  initialFocusId=null,
  initialFrameIds=null,
  initialOverview=false,
  autoPlay=false,
}) {
  const [depth,setDepth]=useState(1.35);
  const [thickness,setThickness]=useState(1.4);
  const [spaceOpen,setSpaceOpen]=useState(false);
  const [relationOpen,setRelationOpen]=useState(false);
  const [relA,setRelA]=useState(null);
  const [relB,setRelB]=useState(null);
  const [tourActive,setTourActive]=useState(false);
  const [tourStep,setTourStep]=useState(1);
  const [toast,setToast]=useState('');
  const tourActiveRef=useRef(false);
  tourActiveRef.current=tourActive;
  const prevResetRef=useRef(reset);
  const tourIndexRef=useRef(0);
  const tourTimerRef=useRef(null);
  const toastTimerRef=useRef(null);
  const deepLinkApplied=useRef(false);

  const layout=useMemo(()=>makeSceneLayout(people,positions,depth,generationPositions),[people,positions,depth,generationPositions]);
  const defaultFrameBox=useMemo(()=>{
    if(Array.isArray(initialFrameIds)&&initialFrameIds.length){
      const pts=initialFrameIds.map(id=>layout.coords.get(id)).filter(Boolean);
      if(!pts.length)return null;
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),zs=pts.map(p=>p[2]);
      const minX=Math.min(...xs),maxX=Math.max(...xs);
      const minY=Math.min(...ys),maxY=Math.max(...ys);
      const minZ=Math.min(...zs),maxZ=Math.max(...zs);
      return {
        flat:true,
        centerX:(minX+maxX)/2,
        centerY:(minY+maxY)/2-0.45,
        centerZ:(minZ+maxZ)/2,
        width:Math.max(6.0,maxX-minX+3.4),
        height:Math.max(5.5,maxY-minY+4.4),
        minZ,maxZ,
      };
    }
    if(initialOverview&&layout.count>0){
      return {
        flat:true,
        centerX:layout.centerX,
        centerY:layout.centerY-0.4,
        centerZ:(layout.minZ+layout.maxZ)/2,
        width:layout.width*0.96,
        height:layout.height*1.08,
        minZ:layout.minZ,
        maxZ:layout.maxZ,
      };
    }
    return null;
  },[initialFrameIds,initialOverview,layout]);
  const peopleById=useMemo(()=>new Map(people.map(p=>[p.id,p])),[people]);
  const generationMeta=useMemo(()=>computeGenerationMeta(people),[people]);
  const tourQueue=useMemo(()=>pickTourDescendants(people,layout.coords),[people,layout]);
  const selectedPerson=selected?peopleById.get(selected)||null:null;
  const isEditMode=Boolean(onEditPerson);
  const [traceRun,setTraceRun]=useState(0);
  const [traceState,setTraceState]=useState("idle");
  const [cinematic,setCinematic]=useState(null);
  const [cinematicBeat,setCinematicBeat]=useState(null);
  const [journey,setJourney]=useState(null);
  const ancestry=useMemo(()=>findAncestors(people,selected),[people,selected]);
  const descendants=useMemo(()=>isEditMode?findDescendants(people,selected):{selected,nodes:new Map(),edges:new Set()},[people,selected,isEditMode]);
  const relationResult=useMemo(()=>relationOpen&&relA&&relB?findCommonRelationship(people,relA,relB,layout.routes):null,[people,relationOpen,relA,relB,layout.routes]);
  // Synchronize golden branch illumination 1:1 with the Play camera POV timeline!
  const beatTimings=useMemo(()=>cinematic?.plan?.beats?.map(b=>({start:b.start,arrive:b.arrive}))||null,[cinematic]);
  const ancestorFlow=useMemo(()=>buildAncestorFlow(ancestry,layout.routes,beatTimings),[ancestry,layout,beatTimings]);
  const descendantFlow=useMemo(()=>isEditMode?buildDescendantFlow(descendants,layout.routes):{lines:[],points:new Set(),duration:0},[descendants,layout,isEditMode]);
  // In Edit mode (when not running upward Play), glow BOTH ancestors & all descendants below in gold!
  const showDescendants=isEditMode&&!cinematic&&!relationResult&&descendants.nodes.size>1;
  const flow=useMemo(()=>{
    if(relationResult)return relationResult.flow;
    if(!showDescendants)return ancestorFlow;
    const points=new Set([...ancestorFlow.points,...descendantFlow.points]);
    return {
      ancestry:ancestorFlow.ancestry,
      lines:[...ancestorFlow.lines,...descendantFlow.lines],
      points,
      duration:Math.max(ancestorFlow.duration,descendantFlow.duration),
    };
  },[ancestorFlow,descendantFlow,showDescendants,relationResult]);
  const highlightedIds=useMemo(()=>{
    if(relationResult)return relationResult.nodes;
    const set=new Set(ancestry.nodes.keys());
    if(showDescendants)for(const id of descendants.nodes.keys())set.add(id);
    return set;
  },[ancestry,descendants,showDescendants,relationResult]);
  const cinematicRunId=useRef(0);
  const journeyItemRefs=useRef(new Map());
  const nodeRefs=useRef(new Map());
  const navigationRef=useRef(null);
  const viewerRef=useRef(null);
  const [viewerElement,setViewerElement]=useState(null);
  const attachViewer=useCallback(node=>{viewerRef.current=node;setViewerElement(node);},[]);
  const activePointers=useRef(new Map());
  const dragged=useRef(false);
  const [rotate,setRotate]=useState(false);
  const [all,setAll]=useState(false);
  const [focusId,setFocusId]=useState(null);
  const [search,setSearch]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [localReset,setLocalReset]=useState(0);

  const showToast=useCallback((msg)=>{
    setToast(msg);
    if(toastTimerRef.current)window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current=window.setTimeout(()=>setToast(''),2800);
  },[]);

  useEffect(()=>()=>{
    if(toastTimerRef.current)window.clearTimeout(toastTimerRef.current);
    if(tourTimerRef.current)window.clearTimeout(tourTimerRef.current);
  },[]);

  const sharePerson=useCallback(async(personId)=>{
    if(!personId||typeof window==='undefined')return;
    const person=peopleById.get(personId);
    const name=person?displayName(person):'Silsilah Keluarga';
    const url=new URL(window.location.href);
    url.searchParams.set('tokoh',personId);
    url.searchParams.set('play','1');
    const shareUrl=url.toString();
    try{
      if(navigator.share&&window.matchMedia?.('(pointer: coarse)').matches){
        await navigator.share({title:`Silsilah ${name}`,text:`Lihat jalur nasab ${name}:`,url:shareUrl});
        return;
      }
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(shareUrl);
        showToast(`Tautan nasab ${name} disalin!`);
        return;
      }
    }catch{
      // Fallback below
    }
    window.prompt('Salin tautan jalur nasab:',shareUrl);
  },[peopleById,showToast]);

  const stopTour=useCallback(()=>{
    setTourActive(false);
    if(tourTimerRef.current){
      window.clearTimeout(tourTimerRef.current);
      tourTimerRef.current=null;
    }
  },[]);

  const handleCinematicBeat=useCallback((beat)=>{
    setCinematicBeat(beat);
    setJourney(prev=>{
      if(!prev)return prev;
      const nextIndex=beat.isReveal?prev.steps.length-1:beat.index;
      return {...prev,activeIndex:nextIndex,completed:beat.isReveal};
    });
  },[]);

  const startCinematicFor=useCallback((personId)=>{
    const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const plan=buildCinematicBeats(people,personId,layout);
    if(!plan){
      setFocusId(personId);
      setAll(false);
      setLocalReset(v=>v+1);
      return;
    }
    if(reduced){
      setCinematic(null);
      setCinematicBeat(null);
      setJourney({steps:plan.steps,selectedId:personId,activeIndex:plan.steps.length-1,completed:true});
      setFocusId(personId);
      setAll(false);
      setLocalReset(v=>v+1);
      return;
    }
    cinematicRunId.current+=1;
    setRelationOpen(false);
    setTraceRun(v=>v+1);
    setAll(false);
    setFocusId(null);
    setCinematicBeat(plan.beats[0]);
    setJourney({steps:plan.steps,selectedId:personId,activeIndex:0,completed:false});
    setCinematic({runId:cinematicRunId.current,plan});
  },[people,layout]);

  const stopCinematic=useCallback((completedNaturally=false)=>{
    setCinematic(null);
    setCinematicBeat(null);
    if(completedNaturally){
      setJourney(prev=>prev?{...prev,activeIndex:prev.steps.length-1,completed:true}:null);
      if(tourActiveRef.current&&tourQueue.length>0){
        if(tourTimerRef.current)window.clearTimeout(tourTimerRef.current);
        tourTimerRef.current=window.setTimeout(()=>{
          if(!tourActiveRef.current)return;
          tourIndexRef.current=(tourIndexRef.current+1)%tourQueue.length;
          setTourStep(tourIndexRef.current+1);
          const nextId=tourQueue[tourIndexRef.current];
          if(nextId){
            onSelect(nextId);
            startCinematicFor(nextId);
          }
        },2500);
      }
    }else{
      stopTour();
      setJourney(prev=>prev&&prev.completed?prev:null);
    }
  },[tourQueue,onSelect,startCinematicFor,stopTour]);

  const startTour=useCallback(()=>{
    if(!tourQueue.length)return;
    setRelationOpen(false);
    setSpaceOpen(false);
    tourIndexRef.current=0;
    setTourStep(1);
    setTourActive(true);
    const firstId=tourQueue[0];
    onSelect(firstId);
    startCinematicFor(firstId);
  },[tourQueue,onSelect,startCinematicFor]);

  // Deep-link support (?tokoh=<id>&play=1)
  useEffect(()=>{
    if(deepLinkApplied.current||!initialFocusId||!layout.coords.has(initialFocusId))return;
    deepLinkApplied.current=true;
    onSelect(initialFocusId);
    if(autoPlay){
      const t=window.setTimeout(()=>startCinematicFor(initialFocusId),350);
      return()=>window.clearTimeout(t);
    }
    setFocusId(initialFocusId);
    setAll(false);
    setLocalReset(v=>v+1);
  },[initialFocusId,autoPlay,layout.coords,onSelect,startCinematicFor]);

  // Compute a single framing box covering Tokoh 1, Tokoh 2, both golden paths, and the meeting ancestor (LCA)
  const relationFrameBox=useMemo(()=>{
    if(!relationOpen||!relationResult?.found||!relationResult.nodes?.size)return null;
    const pts=[...relationResult.nodes].map(id=>layout.coords.get(id)).filter(Boolean);
    if(!pts.length)return null;
    const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0]));
    const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
    const minZ=Math.min(...pts.map(p=>p[2])),maxZ=Math.max(...pts.map(p=>p[2]));
    const width=Math.max(9.2,(maxX-minX)+7.2);
    const height=Math.max(8.0,(maxY-minY)+5.8);
    // Shift target right slightly so the framed lineage sits cleanly to the left of the right-side Relation panel
    return {
      centerX:(minX+maxX)/2+width*0.16,
      centerY:(minY+maxY)/2,
      centerZ:(minZ+maxZ)/2,
      width,
      height,
      minZ,
      maxZ,
    };
  },[relationOpen,relationResult,layout]);

  // Automatically frame Tokoh 1, Tokoh 2, and the meeting ancestor (titik temu) in ONE view!
  useEffect(()=>{
    if(!relationFrameBox)return;
    stopTour();
    stopCinematic(false);
    setFocusId(null);
    setAll(false);
    setLocalReset(v=>v+1);
  },[relationFrameBox,stopCinematic,stopTour]);

  // Smoothly keep the active spotlighted tokoh centered inside the vertical journey rail
  useEffect(()=>{
    if(!journey)return;
    const el=journeyItemRefs.current.get(journey.activeIndex);
    el?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  },[journey?.activeIndex,journey?.completed]);

  // Deepest descendant for the one-click "Demo Sorot Leluhur" button
  const deepestDescendantId=useMemo(()=>{
    let bestId=null,bestDepth=0;
    for(const person of people){
      if(!layout.coords.has(person.id))continue;
      const anc=findAncestors(people,person.id);
      let d=0;
      for(const level of anc.nodes.values())if(level>d)d=level;
      if(d>bestDepth){bestDepth=d;bestId=person.id;}
    }
    return bestId;
  },[people,layout]);

  useEffect(()=>{
    if(prevResetRef.current===reset)return;
    prevResetRef.current=reset;
    stopTour();
    stopCinematic(false);
    setFocusId(null);
    setAll(false);
    setLocalReset(value=>value+1);
  },[reset,stopCinematic,stopTour]);

  const searchMatches=useMemo(()=>{
    const term=search.trim().toLocaleLowerCase('id');
    if(!term)return [];
    return people.filter(person=>displayName(person).toLocaleLowerCase('id').includes(term)).slice(0,8);
  },[people,search]);

  const [full,setFull]=useState(false);
  useEffect(()=>{
    const onChange=()=>setFull(document.fullscreenElement===viewerRef.current);
    document.addEventListener('fullscreenchange',onChange);
    return()=>document.removeEventListener('fullscreenchange',onChange);
  },[]);
  const toggleFull=()=>{
    if(document.fullscreenElement===viewerRef.current)document.exitFullscreen?.();
    else viewerRef.current?.requestFullscreen?.();
  };

  const choosePerson=id=>{
    setTraceRun(value=>value+1);
    onSelect(id);
    const family=findAncestors(people,id);
    if(cinematicOnSelect&&family.nodes.size>1){
      startCinematicFor(id);
      return;
    }
    // Always glide smoothly CLOSE-UP to the selected person instead of zooming out far away
    stopCinematic(false);
    setJourney(null);
    setFocusId(id);
    setAll(false);
    setLocalReset(value=>value+1);
  };

  const resetView=()=>{
    stopCinematic(false);
    setJourney(null);
    setFocusId(null);
    setAll(false);
    setLocalReset(value=>value+1);
  };

  const navigateKey=event=>{
    if(event.key==='Escape'&&(cinematic||journey||tourActive||relationOpen)){
      event.preventDefault();
      stopTour();
      stopCinematic(false);
      setJourney(null);
      setRelationOpen(false);
      return;
    }
    if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest?.('input,select,textarea,button,[contenteditable=true]'))return;
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(directions[event.key]){
      event.preventDefault();navigationRef.current?.pan(...directions[event.key]);
    }else if(event.key==='+'||event.key==='='){
      event.preventDefault();navigationRef.current?.zoom(true);
    }else if(event.key==='-'||event.key==='_'){
      event.preventDefault();navigationRef.current?.zoom(false);
    }else if(event.key==='Home'){
      event.preventDefault();resetView();
    }
  };

  const title=appearance.cover?.enabled&&appearance.cover?.title
    ?appearance.cover.title:'Silsilah Keluarga';
  const spotlightIds=useMemo(()=>{
    const set=new Set(cinematicBeat?.personIds||[]);
    if(relationOpen&&relationResult?.found){
      if(relationResult.lcaId)set.add(relationResult.lcaId);
      if(relA)set.add(relA);
      if(relB)set.add(relB);
    }
    return set;
  },[cinematicBeat,relationOpen,relationResult,relA,relB]);
  const hasSelection=Boolean((selected&&ancestry.nodes.size>0)||relationResult);
  const canPlayAscent=Boolean(selectedPerson&&ancestry.nodes.size>1);

  return <div ref={attachViewer} className={'dgft3d-viewer'+(cinematic||tourActive?' is-cinematic':'')} data-testid="family-tree-3d-viewer" data-trace-state={traceState} data-ancestor-count={Math.max(0,ancestry.nodes.size-1)} tabIndex={0} role="region" aria-label="Bagan silsilah 3D" onKeyDown={navigateKey}
    onPointerDownCapture={event=>{
      if(activePointers.current.size===0)dragged.current=false;
      if(event.target.closest?.('.dgft3d-controls,.dgft3d-search,.dgft3d-space,.dgft3d-navigation,.dgft3d-actionbar,.dgft3d-cinema-hud,.dgft3d-journey,.dgft3d-rel-panel,.dgft3d-tour-pill')){event.stopPropagation();return;}
      activePointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(activePointers.current.size>=2)dragged.current=true;
      if(!event.target.closest?.(".dgft3d-person"))event.currentTarget.focus({preventScroll:true});
    }}
    onWheelCapture={event=>{if(event.target.closest?.('.dgft3d-controls,.dgft3d-search,.dgft3d-space,.dgft3d-navigation,.dgft3d-actionbar,.dgft3d-cinema-hud,.dgft3d-journey,.dgft3d-rel-panel,.dgft3d-tour-pill'))event.stopPropagation();}}
    onPointerMoveCapture={event=>{
      const start=activePointers.current.get(event.pointerId);
      if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>7)dragged.current=true;
    }}
    onPointerUpCapture={event=>{activePointers.current.delete(event.pointerId);}}
    onPointerCancel={event=>{activePointers.current.delete(event.pointerId);if(!activePointers.current.size)dragged.current=false;}}
    onClickCapture={event=>{
      if(event.target.closest?.('.dgft3d-controls,.dgft3d-search,.dgft3d-space,.dgft3d-navigation,.dgft3d-actionbar,.dgft3d-cinema-hud,.dgft3d-journey,.dgft3d-rel-panel,.dgft3d-tour-pill')){dragged.current=false;return;}
      if(dragged.current){event.preventDefault();event.stopPropagation();dragged.current=false;}
    }}>
    <Canvas dpr={[1,1.5]} frameloop="demand" style={{touchAction:'none'}}
      shadows gl={{antialias:true,alpha:false,powerPreference:'default',preserveDrawingBuffer:true}}
      onPointerMissed={()=>{if(!dragged.current){stopCinematic(false);setJourney(null);onDeselect?.();}}} fallback={<div className="dgft3d-unavailable">WebGL tidak tersedia. <button type="button" className="dg-ui-action" onClick={onBackTo2D}>Kembali ke 2D</button></div>}>
      <Suspense fallback={null}>
        <Scene people={people} layout={layout} appearance={appearance} thickness={thickness}
          reset={localReset} nodeRefs={nodeRefs} rotate={rotate} selected={selected} all={all} focusId={focusId} frameBox={relationFrameBox||defaultFrameBox} domElement={viewerElement} navigationRef={navigationRef} flow={flow} traceRun={traceRun} onTraceState={setTraceState} cinematic={cinematic} onCinematicBeat={handleCinematicBeat} onCinematicEnd={stopCinematic} spotlightIds={spotlightIds} highlightedIds={highlightedIds}/>
      </Suspense>
    </Canvas>

    {/* Cinema Letterbox Bars */}
    <div className="dgft3d-letterbox dgft3d-letterbox-top" aria-hidden="true"/>
    <div className="dgft3d-letterbox dgft3d-letterbox-bottom" aria-hidden="true"/>

    <span className="dgft3d-count" role="status" aria-live="polite">{layout.count} tokoh{selected&&ancestry.nodes.size>1&&<> · {traceState==="tracing"?"Menelusuri…":(ancestry.nodes.size-1)+" leluhur · "+ancestry.roots.size+" akar"}</>}</span>

    <div className="dgft3d-search" onPointerDown={event=>event.stopPropagation()}>
      <input aria-label="Cari tokoh di bagan 3D" type="search" value={search}
        placeholder="Cari tokoh…" onChange={event=>{setSearch(event.target.value);setSearchOpen(true);}}
        onFocus={()=>setSearchOpen(true)} onKeyDown={event=>{
          if(event.key==='Escape')setSearchOpen(false);
          if(event.key==='Enter'&&searchMatches.length){
            const id=searchMatches[0].id;
            stopCinematic();
            setFocusId(id);setAll(false);setLocalReset(v=>v+1);setSearchOpen(false);onSelect(id);
          }
        }}/>
      {searchOpen&&searchMatches.length>0&&<div className="dgft3d-results">
        {searchMatches.map(person=>{
          const meta=generationMeta.get(person.id);
          return <button type="button" key={person.id}
            onClick={()=>{
              stopTour();stopCinematic(false);
              setFocusId(person.id);setAll(false);setLocalReset(v=>v+1);setSearchOpen(false);onSelect(person.id);
            }}>
            <span className="dgft3d-res-name">{displayName(person)}</span>
            {meta&&<span className="dgft3d-res-meta">Gen {meta.gen} · {meta.parentLabel}</span>}
          </button>;
        })}
      </div>}
    </div>

    <div className="dgft3d-controls" role="group" aria-label="Navigasi 3D" onPointerDown={event=>event.stopPropagation()}>
      <button type="button" className="dg-ui-action" aria-pressed={!rotate}
        onClick={()=>setRotate(false)}>Geser</button>
      <button type="button" className="dg-ui-action" aria-pressed={rotate}
        onClick={()=>setRotate(true)}>Putar</button>
      <button type="button" className="dg-ui-action" onClick={()=>{
        stopTour();stopCinematic(false);setFocusId(null);setAll(true);setLocalReset(value=>value+1);
      }}>Seluruh</button>
      {selected&&<button type="button" className="dg-ui-action" onClick={()=>{
        stopTour();stopCinematic(false);setFocusId(selected);setAll(false);setLocalReset(value=>value+1);
      }}>Tokoh</button>}
      <button type="button" className="dg-ui-action" aria-pressed={relationOpen} onClick={()=>{
        setRelationOpen(v=>{
          const next=!v;
          if(next&&selected&&!relA)setRelA(selected);
          return next;
        });
        setSpaceOpen(false);
      }}>Hubungan</button>
      <button type="button" className="dg-ui-action" aria-expanded={spaceOpen} onClick={()=>{setSpaceOpen(v=>!v);setRelationOpen(false);}}>Ruang 3D</button>
      <button type="button" className="dg-ui-action" onClick={toggleFull}>
        {full?'Keluar penuh':'Layar penuh'}</button>
    </div>

    {relationOpen&&(
      <RelationFinderPanel
        people={people}
        generationMeta={generationMeta}
        personA={relA}
        personB={relB}
        onChangeA={id=>{setRelA(id);setTraceRun(v=>v+1);}}
        onChangeB={id=>{setRelB(id);setTraceRun(v=>v+1);}}
        result={relationResult}
        onFocusLca={lcaId=>{
          setFocusId(lcaId);setAll(false);setLocalReset(v=>v+1);
        }}
        onClose={()=>{setRelationOpen(false);setRelA(null);setRelB(null);}}
      />
    )}

    {tourActive&&(
      <div className="dgft3d-tour-pill" onPointerDown={event=>event.stopPropagation()}>
        <span>✦ Mode Haul · {tourStep}/{tourQueue.length}</span>
        <button type="button" onClick={()=>{stopTour();stopCinematic(false);}}>✕ Keluar</button>
      </div>
    )}

    {toast&&(
      <div className="dgft3d-toast" role="status" aria-live="polite">{toast}</div>
    )}

    {spaceOpen&&<div className="dgft3d-space" aria-label="Pengaturan ruang 3D">
      <label>Kedalaman <output>{Math.round(depth*100)}%</output>
        <input type="range" aria-label="Kedalaman ruang 3D" min=".6" max="2" step=".05"
          value={depth} onChange={event=>setDepth(Number(event.target.value))}/>
      </label>
      <label>Ketebalan <output>{Math.round(thickness*100)}%</output>
        <input type="range" aria-label="Ketebalan bingkai 3D" min=".7" max="2" step=".05"
          value={thickness} onChange={event=>setThickness(Number(event.target.value))}/>
      </label>
    </div>}

    {/* Side Journey Indicator (bottom → top ascent rail, stays complete with golden sweep on finish) */}
    {journey&&journey.steps.length>1&&(
      <aside className={'dgft3d-journey'+(journey.completed?' is-complete':'')} aria-label="Indikator perjalanan nasab" onPointerDown={event=>event.stopPropagation()}>
        <div className="dgft3d-journey-head">
          <span className="dgft3d-journey-title">
            {journey.completed?'Jalur Nasab Lengkap':'Perjalanan Nasab'}
          </span>
          {cinematic?(
            <button type="button" className="dgft3d-cinema-stop" onClick={()=>stopCinematic(false)}>✕ Hentikan</button>
          ):journey.completed?(
            <button type="button" className="dgft3d-journey-close" aria-label="Tutup indikator perjalanan" onClick={()=>setJourney(null)}>✕</button>
          ):null}
        </div>
        <div className="dgft3d-journey-scroll">
          <div className="dgft3d-journey-list" style={{'--journey-progress':`${journey.completed?100:Math.round((journey.activeIndex/Math.max(1,journey.steps.length-1))*100)}%`}}>
            <span className="dgft3d-journey-track" aria-hidden="true">
              <span className="dgft3d-journey-fill"/>
            </span>
            {journey.steps.map((step,idx)=>{
              const isCurrent=!journey.completed&&idx===journey.activeIndex;
              const isPassed=journey.completed||idx<journey.activeIndex;
              return (
                <button
                  type="button"
                  key={step.index}
                  ref={el=>{if(el)journeyItemRefs.current.set(idx,el);else journeyItemRefs.current.delete(idx);}}
                  className={'dgft3d-journey-step'+(isCurrent?' is-current':'')+(isPassed?' is-passed':'')+(step.isApex?' is-apex':'')}
                  style={{'--step-order':idx}}
                  onClick={()=>{
                    stopCinematic(false);
                    if(step.primaryId){
                      onSelect(step.primaryId);
                      setFocusId(step.primaryId);
                      setAll(false);
                      setLocalReset(v=>v+1);
                    }
                  }}
                >
                  <span className="dgft3d-journey-dot" aria-hidden="true"/>
                  <span className="dgft3d-journey-text">
                    <span className="dgft3d-journey-tag">{step.shortTag}</span>
                    <span className="dgft3d-journey-name">{step.names}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {journey.completed&&!tourActive&&(
          <div className="dgft3d-journey-foot">
            <button type="button" className="dgft3d-journey-action is-gold" onClick={()=>exportLineagePosterPng({steps:journey.steps})}>
              ⬇ Kartu PNG
            </button>
            <button type="button" className="dgft3d-journey-action" onClick={()=>sharePerson(journey.selectedId||selected)}>
              Bagikan
            </button>
          </div>
        )}
      </aside>
    )}

    {/* Floating Contextual Action Bar when a person is selected (or Play/Haul buttons on public) */}
    {!cinematic&&!tourActive&&selectedPerson&&(
      <div className="dgft3d-actionbar" role="toolbar" aria-label="Aksi tokoh terpilih" onPointerDown={event=>event.stopPropagation()}>
        <span className="dgft3d-actionbar-name" title={displayName(selectedPerson)}>{displayName(selectedPerson)}</span>
        {canPlayAscent&&(
          <button type="button" className="dgft3d-pill dgft3d-pill-gold" onClick={()=>startCinematicFor(selectedPerson.id)}>
            ▶ Play Sorot Leluhur
          </button>
        )}
        {cinematicOnSelect&&(
          <button type="button" className="dgft3d-pill" onClick={()=>sharePerson(selectedPerson.id)}>
            Bagikan
          </button>
        )}
        {onEditPerson&&(
          <button type="button" className="dgft3d-pill" onClick={()=>onEditPerson(selectedPerson)}>
            ✎ Edit
          </button>
        )}
        {onAddRelative&&(
          <>
            <button type="button" className="dgft3d-pill" onClick={()=>onAddRelative('child')}>＋ Anak</button>
            <button type="button" className="dgft3d-pill" onClick={()=>onAddRelative('spouse')}>＋ Pasangan</button>
            <button type="button" className="dgft3d-pill" onClick={()=>onAddRelative('parent')}>＋ Orang tua</button>
          </>
        )}
        {onOpenProfile&&(
          <button type="button" className="dgft3d-pill" onClick={onOpenProfile}>Profil</button>
        )}
      </div>
    )}

    {!cinematic&&!tourActive&&!selectedPerson&&cinematicOnSelect&&deepestDescendantId&&(
      <div className="dgft3d-actionbar" onPointerDown={event=>event.stopPropagation()}>
        <button type="button" className="dgft3d-pill dgft3d-pill-gold" onClick={()=>{
          onSelect(deepestDescendantId);
          startCinematicFor(deepestDescendantId);
        }}>
          ▶ Play Sorot Leluhur
        </button>
        {tourQueue.length>1&&(
          <button type="button" className="dgft3d-pill" onClick={startTour}>
            ✦ Mode Haul
          </button>
        )}
      </div>
    )}

    {!cinematic&&!selectedPerson&&!(cinematicOnSelect&&deepestDescendantId)&&(
      <span className="dgft3d-hint">Klik tokoh untuk sorot · Tarik untuk geser · Scroll untuk zoom</span>
    )}

    <div className="dgft3d-node-overlay" onClick={event=>{if(event.target===event.currentTarget){stopCinematic();onDeselect?.();}}}>
      {people.filter(person=>layout.coords.has(person.id)).map(person=>
        <PersonOverlay key={person.id} person={person} point={layout.coords.get(person.id)}
          selected={selected===person.id}
          traced={highlightedIds.has(person.id)||spotlightIds.has(person.id)}
          dimmed={hasSelection&&!highlightedIds.has(person.id)&&!spotlightIds.has(person.id)}
          spotlight={spotlightIds.has(person.id)}
          onSelect={choosePerson} appearance={appearance} nodeRefs={nodeRefs}/>)}
    </div>
  </div>;
}

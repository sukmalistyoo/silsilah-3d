import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { findAncestors } from '../family-tree/ancestry';

const CARD_W = 176;
const CARD_H = 84;

function displayName(p) {
  return [p?.data?.['first name'], p?.data?.['last name']].filter(Boolean).join(' ') || 'Tanpa nama';
}

function initialsOf(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');
}

export default function FamilyTree2D({ people = [], positions, selected, onSelect }) {
  const containerRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.78 });
  const dragRef = useRef(null);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const ancestry = useMemo(() => findAncestors(people, selected), [people, selected]);
  const highlightedIds = useMemo(() => new Set(ancestry.nodes.keys()), [ancestry]);

  const bounds = useMemo(() => {
    const pts = [...(positions?.values() || [])];
    if (!pts.length) return { minX: -200, maxX: 200, minY: -200, maxY: 200, cx: 0, cy: 0, w: 400, h: 400 };
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - CARD_W;
    const maxX = Math.max(...xs) + CARD_W;
    const minY = Math.min(...ys) - CARD_H;
    const maxY = Math.max(...ys) + CARD_H;
    return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
  }, [positions]);

  const fitView = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scaleX = (rect.width - 80) / Math.max(300, bounds.w);
    const scaleY = (rect.height - 80) / Math.max(300, bounds.h);
    const scale = Math.max(0.22, Math.min(1.05, Math.min(scaleX, scaleY)));
    setView({
      scale,
      x: rect.width / 2 - bounds.cx * scale,
      y: rect.height / 2 - bounds.cy * scale,
    });
  };

  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people.length, bounds.w, bounds.h]);

  const edges = useMemo(() => {
    const spouseLines = [];
    const childLines = [];
    const seenSpouse = new Set();
    const seenCoupleChild = new Set();

    for (const person of people) {
      const a = positions.get(person.id);
      if (!a) continue;

      for (const mateId of person.rels?.spouses || []) {
        const b = positions.get(mateId);
        if (!b) continue;
        const key = [person.id, mateId].sort().join('|');
        if (seenSpouse.has(key)) continue;
        seenSpouse.add(key);
        const active = highlightedIds.has(person.id) && highlightedIds.has(mateId);
        spouseLines.push({ key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, active });
      }

      for (const childId of person.rels?.children || []) {
        const b = positions.get(childId);
        if (!b) continue;
        const child = byId.get(childId);
        const mateId = (person.rels?.spouses || []).find(
          (id) =>
            positions.has(id) &&
            ((child?.rels?.parents || []).includes(id) || (byId.get(id)?.rels?.children || []).includes(childId)),
        );
        const c = mateId ? positions.get(mateId) : null;
        if (mateId) {
          const pairKey = [person.id, mateId].sort().join('|') + '|' + childId;
          if (seenCoupleChild.has(pairKey)) continue;
          seenCoupleChild.add(pairKey);
        }
        const sx = c ? (a.x + c.x) / 2 : a.x;
        const sy = (c ? (a.y + c.y) / 2 : a.y) + (c ? 0 : CARD_H / 2);
        const tx = b.x;
        const ty = b.y - CARD_H / 2;
        const midY = sy + (ty - sy) * 0.5;
        const active = highlightedIds.has(childId) && (highlightedIds.has(person.id) || (mateId && highlightedIds.has(mateId)));
        childLines.push({
          key: `${person.id}-${mateId || 's'}-${childId}`,
          d: `M ${sx} ${sy} V ${midY} H ${tx} V ${ty}`,
          active,
        });
      }
    }
    return { spouseLines, childLines };
  }, [people, positions, byId, highlightedIds]);

  const onWheel = (e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setView((prev) => {
      const nextScale = Math.max(0.18, Math.min(2.2, prev.scale * factor));
      const ratio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: mx - (mx - prev.x) * ratio,
        y: my - (my - prev.y) * ratio,
      };
    });
  };

  const onPointerDown = (e) => {
    if (e.target.closest('button[data-node], .s3d-2d-toolbar')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
    setView((prev) => ({
      ...prev,
      x: dragRef.current.vx + dx,
      y: dragRef.current.vy + dy,
    }));
  };
  const onPointerUp = () => {
    if (dragRef.current && !dragRef.current.moved) {
      onSelect(null);
    }
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="s3d-canvas-2d"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="s3d-2d-stage"
        style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
      >
        <svg className="s3d-2d-svg" width="1" height="1" style={{ overflow: 'visible' }}>
          {edges.childLines.map((line) => (
            <path
              key={line.key}
              d={line.d}
              fill="none"
              stroke={line.active ? '#f5c542' : 'rgba(148, 163, 184, 0.34)'}
              strokeWidth={line.active ? 2.6 : 1.5}
              strokeLinejoin="round"
            />
          ))}
          {edges.spouseLines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.active ? '#f5c542' : 'rgba(251, 191, 36, 0.45)'}
              strokeWidth={line.active ? 2.6 : 1.6}
              strokeDasharray="5 4"
            />
          ))}
        </svg>

        {people.map((person) => {
          const pt = positions.get(person.id);
          if (!pt) return null;
          const name = displayName(person);
          const isSelected = selected === person.id;
          const isHighlighted = highlightedIds.has(person.id);
          const tier = person.data?.tier || '';
          const arabic = person.data?.arabic || '';
          return (
            <button
              key={person.id}
              type="button"
              data-node={person.id}
              onClick={() => onSelect(person.id)}
              style={{
                left: pt.x - CARD_W / 2,
                top: pt.y - CARD_H / 2,
                width: CARD_W,
                height: CARD_H,
              }}
              className={`s3d-2d-card ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-ancestor' : ''} ${tier ? `tier-${tier}` : ''}`}
            >
              <span className="s3d-2d-avatar">
                {person.data?.avatar ? (
                  <img src={person.data.avatar} alt="" />
                ) : arabic ? (
                  <span className="s3d-2d-arabic" dir="rtl" lang="ar">{arabic}</span>
                ) : (
                  <span>{initialsOf(name)}</span>
                )}
              </span>
              <span className="s3d-2d-meta">
                <strong>{name}</strong>
                {person.data?.gelar ? <small>{person.data.gelar}</small> : person.data?.birthday ? <small>{person.data.birthday}{person.data?.death ? `–${person.data.death}` : ''}</small> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="s3d-2d-toolbar">
        <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.min(2.2, v.scale * 1.18) }))} title="Perbesar">
          <Plus size={16} />
        </button>
        <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.max(0.18, v.scale * 0.84) }))} title="Perkecil">
          <Minus size={16} />
        </button>
        <button type="button" onClick={fitView} title="Pas ke layar">
          <Maximize2 size={15} />
        </button>
        {selected && (
          <button type="button" onClick={() => onSelect(null)} title="Hapus pilihan">
            <RotateCcw size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

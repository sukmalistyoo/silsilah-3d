import React, {useMemo, useState} from 'react';

const displayName=person=>[person?.data?.['first name'],person?.data?.['last name']].filter(Boolean).join(' ')||'Tanpa nama';

function PersonPicker({label,valueId,people,generationMeta,onChange}){
  const [query,setQuery]=useState('');
  const [open,setOpen]=useState(false);
  const selectedPerson=useMemo(()=>people.find(p=>p.id===valueId)||null,[people,valueId]);
  const matches=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase('id');
    if(!term)return people.slice(0,7);
    return people.filter(p=>displayName(p).toLocaleLowerCase('id').includes(term)).slice(0,8);
  },[people,query]);

  return (
    <div className="dgft3d-rel-picker">
      <label className="dgft3d-rel-label">{label}</label>
      <div className="dgft3d-rel-input-wrap">
        <input
          type="text"
          value={open?query:(selectedPerson?displayName(selectedPerson):query)}
          placeholder="Ketik nama tokoh…"
          onFocus={()=>{setOpen(true);setQuery('');}}
          onBlur={()=>window.setTimeout(()=>setOpen(false),160)}
          onChange={e=>{setQuery(e.target.value);setOpen(true);}}
        />
        {valueId&&(
          <button type="button" className="dgft3d-rel-clear" aria-label={`Hapus ${label}`} onClick={()=>{onChange(null);setQuery('');}}>✕</button>
        )}
      </div>
      {open&&matches.length>0&&(
        <div className="dgft3d-rel-dropdown">
          {matches.map(p=>{
            const meta=generationMeta.get(p.id);
            return (
              <button
                type="button"
                key={p.id}
                onMouseDown={e=>{
                  e.preventDefault();
                  onChange(p.id);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <span className="dgft3d-res-name">{displayName(p)}</span>
                {meta&&<span className="dgft3d-res-meta">Gen {meta.gen} · {meta.parentLabel}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RelationFinderPanel({people,generationMeta,personA,personB,onChangeA,onChangeB,result,onFocusLca,onClose}){
  return (
    <div className="dgft3d-rel-panel" role="dialog" aria-label="Cek hubungan antar dua tokoh" onPointerDown={e=>e.stopPropagation()}>
      <div className="dgft3d-rel-head">
        <span>Cek Hubungan 2 Tokoh</span>
        <button type="button" className="dgft3d-journey-close" aria-label="Tutup cek hubungan" onClick={onClose}>✕</button>
      </div>
      <div className="dgft3d-rel-body">
        <PersonPicker label="Tokoh Pertama" valueId={personA} people={people} generationMeta={generationMeta} onChange={onChangeA}/>
        <PersonPicker label="Tokoh Kedua" valueId={personB} people={people} generationMeta={generationMeta} onChange={onChangeB}/>
        {result&&(
          <div className={'dgft3d-rel-result'+(result.found?' is-found':'')}>
            <div className="dgft3d-rel-badge">{result.found?'Hubungan Ditemukan':'Tidak Terhubung'}</div>
            <div className="dgft3d-rel-title">{result.label}</div>
            {result.found&&(
              <div className="dgft3d-rel-detail">
                Leluhur bersama: <strong>{result.lcaName}</strong>
                <span> ({result.nameA}: {result.distA} tingkat · {result.nameB}: {result.distB} tingkat)</span>
              </div>
            )}
            {result.found&&result.lcaId&&(
              <button type="button" className="dgft3d-pill dgft3d-pill-gold dgft3d-rel-focus" onClick={()=>onFocusLca(result.lcaId)}>
                Sorot Leluhur Bersama
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


import React from 'react';

function NavIcon({action}){
  const arrows={up:0,right:90,down:180,left:270};
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {action in arrows?<g transform={'rotate('+arrows[action]+' 12 12)'}><path d="M12 20V4M5 11l7-7 7 7"/></g>:
      action==='home'?<><circle cx="12" cy="12" r="5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></>:
      <><path d="M5 12h14"/>{action==='in'&&<path d="M12 5v14"/>}</>}
  </svg>;
}

export default function NavigationPad({onPan,onZoom,onReset}){
  const actions=[
    ['up','Geser bagan ke atas',()=>onPan(0,-1)],
    ['left','Geser bagan ke kiri',()=>onPan(-1,0)],
    ['home','Fokus ulang bagan',onReset],
    ['right','Geser bagan ke kanan',()=>onPan(1,0)],
    ['down','Geser bagan ke bawah',()=>onPan(0,1)],
  ];
  return <div className="dgft3d-navigation" role="group" aria-label="Geser dan zoom bagan">
    <div className="dgft3d-zoom">
      {[['in','Perbesar bagan 3D',()=>onZoom(true)],['out','Perkecil bagan 3D',()=>onZoom(false)]].map(([key,label,run])=>
        <button key={key} type="button" className="dg-ui-action" aria-label={label} title={label} onClick={run}>
          <NavIcon action={key}/>
        </button>)}
    </div>
    <div className="dgft3d-direction">
      {actions.map(([key,label,run])=><button key={key} type="button" className="dg-ui-action"
        data-direction={key} aria-label={label} title={label} onClick={run}>
        <NavIcon action={key}/>
      </button>)}
    </div>
  </div>;
}

import React, {useMemo, useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {makePortraitGeometry,resolvePortraitShape} from './portraitGeometry';

const displayName=person=>[person.data?.['first name'],person.data?.['last name']].filter(Boolean).join(' ')||'Tanpa nama';

function drawPortraitCanvas(ctx, size, { initials, arabic, tier }) {
  const cx = size / 2;
  const cy = size / 2;
  const bg = ctx.createRadialGradient(cx, size * 0.36, size * 0.07, cx, cy, size * 0.62);
  if (tier === 'rasul') {
    bg.addColorStop(0, '#3a3414');
    bg.addColorStop(0.55, '#1d2b22');
    bg.addColorStop(1, '#0b1817');
  } else if (tier === 'nabi') {
    bg.addColorStop(0, '#0f544c');
    bg.addColorStop(0.62, '#0a3334');
    bg.addColorStop(1, '#061a20');
  } else if (arabic) {
    bg.addColorStop(0, '#133a3a');
    bg.addColorStop(0.62, '#0c2329');
    bg.addColorStop(1, '#07141b');
  } else {
    bg.addColorStop(0, '#1e3a5c');
    bg.addColorStop(0.65, '#112238');
    bg.addColorStop(1, '#091424');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle inner luminous ring
  ctx.strokeStyle =
    tier === 'rasul'
      ? 'rgba(255, 224, 102, 0.78)'
      : tier === 'nabi'
        ? 'rgba(52, 211, 153, 0.65)'
        : arabic
          ? 'rgba(245, 207, 142, 0.36)'
          : 'rgba(245, 207, 142, 0.22)';
  ctx.lineWidth = tier === 'rasul' ? size * 0.016 : size * 0.012;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  if (arabic) {
    // Secondary fine ornamental ring for Arabic calligraphy cards
    ctx.strokeStyle =
      tier === 'rasul'
        ? 'rgba(255, 240, 166, 0.42)'
        : tier === 'nabi'
          ? 'rgba(94, 234, 212, 0.32)'
          : 'rgba(245, 207, 142, 0.16)';
    ctx.lineWidth = size * 0.005;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.425, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = tier === 'rasul' ? '#fff7d6' : tier === 'nabi' ? '#d1fae5' : '#fae5bc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.shadowColor = tier === 'rasul' ? 'rgba(255, 207, 64, 0.65)' : 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = tier === 'rasul' ? size * 0.06 : size * 0.04;

    const lines = arabic.split('\n').filter(Boolean);
    const maxWidth = size * 0.78;
    let fontSize = lines.length > 1 ? Math.round(size * 0.185) : Math.round(size * 0.25);
    const family = '"Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", serif';

    // Auto-fit font size so Arabic text never clips the circular/rounded frame
    while (fontSize > 28) {
      ctx.font = `700 ${fontSize}px ${family}`;
      const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
      if (widest <= maxWidth) break;
      fontSize -= 4;
    }

    const lineHeight = fontSize * 1.32;
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, cx, startY + idx * lineHeight);
    });
    ctx.direction = 'ltr';
    return;
  }

  // Crisp modern initials
  ctx.fillStyle = '#f6e6c8';
  ctx.font = `700 ${Math.round(size * 0.28)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.045;
  ctx.fillText(initials || '?', cx, cy + size * 0.015);
}

function usePortraitTexture(person){
  const invalidate=useThree(state=>state.invalidate);
  const name=displayName(person),src=person.data?.avatar||'';
  const arabic=(person.data?.arabic||'').trim();
  const tier=person.data?.tier||'';
  const initials=name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const texture=useMemo(()=>{
    const size=arabic?512:256;
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');
    drawPortraitCanvas(ctx,size,{initials,arabic,tier});
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
    return map;
  },[initials,arabic,tier,src]);
  useEffect(()=>{
    let active=true;
    if(arabic&&document.fonts?.ready){
      document.fonts.ready.then(()=>{
        if(!active)return;
        const canvas=texture.image,ctx=canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        drawPortraitCanvas(ctx,canvas.width,{initials,arabic,tier});
        texture.needsUpdate=true;invalidate();
      });
    }
    const img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';
    img.onload=()=>{
      if(!active)return;
      const canvas=texture.image,ctx=canvas.getContext('2d');
      ctx.shadowBlur=0;
      const side=Math.min(img.naturalWidth,img.naturalHeight);
      ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,canvas.width,canvas.height);
      texture.needsUpdate=true;invalidate();
    };
    if(/^(https?:\/\/|\/)/i.test(src))img.src=src;
    return()=>{active=false;img.onload=null;texture.dispose();};
  },[src,arabic,tier,initials,texture,invalidate]);
  return texture;
}

export default function PortraitMount({person,point,selected,accent,appearance,thickness,traced}){
  const texture=usePortraitTexture(person);
  const shape=resolvePortraitShape(person,appearance);
  const geometry=useMemo(()=>makePortraitGeometry(shape,thickness),[shape,thickness]);
  useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
  const tier=person.data?.tier||'';
  const ring=tier==='rasul'?'#fff3b0':tier==='nabi'?(selected?'#a7f3d0':'#34d399'):selected?'#ffd98a':traced?'#e8bf74':'#6e94ba';
  const rimEmissive=tier==='rasul'?'#ffcf40':tier==='nabi'?'#10b981':selected?'#e0a642':traced?'#9b6e24':'#1d3550';
  const rimIntensity=tier==='rasul'?(selected?1.45:1.18):tier==='nabi'?(selected?.98:.76):selected?.58:traced?.34:.15;
  const accentBar=tier==='rasul'?'#ffe066':tier==='nabi'?'#34d399':selected?'#ffd98a':traced?'#f5cf8e':accent;
  return <group position={point}>
    {/* Slim architectural floating plinth */}
    <RoundedBox args={[1.44,.065,.44]} radius={.03} smoothness={3}
      position={[0,-.79,-.02]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#0f1f34" metalness={.55} roughness={.28}
        clearcoat={.9} clearcoatRoughness={.16}/>
    </RoundedBox>
    {/* Glowing minimalist edge accent bar */}
    <mesh position={[0,-.752,.19]}>
      <boxGeometry args={[1.18,.022,.028]}/>
      <meshBasicMaterial color={accentBar} toneMapped={false}/>
    </mesh>
    {/* Sleek dark anodized obsidian portrait monolith */}
    <group position={[0,.02,.08]}>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshPhysicalMaterial color="#101f35" metalness={.52} roughness={.24}
          clearcoat={1} clearcoatRoughness={.14}/>
      </mesh>
      <mesh geometry={geometry.rim} castShadow>
        <meshPhysicalMaterial color={ring} metalness={.78} roughness={.18} clearcoat={1}
          emissive={rimEmissive}
          emissiveIntensity={rimIntensity}/>
      </mesh>
      <mesh geometry={geometry.face}>
        <meshBasicMaterial map={texture} toneMapped={false}/>
      </mesh>
    </group>
  </group>;
}

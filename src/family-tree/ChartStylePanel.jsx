import React from 'react';

export const nodeShapes = [
  ['rounded','Membulat'],['square','Persegi'],['pill','Kapsul'],
  ['oval','Oval'],['diamond','Berlian'],['hexagon','Heksagon'],['portrait','Foto bulat + nama'],
];
export const chartDefault = {
  shape:'rounded', fill:'#ffffff', stroke:'#cbd5df', line_color:'#2563eb',
  bg_color:'#081221', bg_image:'',
  cover:{enabled:false,title:'Silsilah Keluarga',subtitle:'Bagan keturunan',
    fill:'#17324a',text_color:'#ffffff',border_color:'#cbd5df',variant:'solid'},
};
export const hexColor = value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
export const cleanAppearance = source => {
  const input=source&&typeof source==='object'?source:{};
  const cover=input.cover&&typeof input.cover==='object'?input.cover:{};
  return {
    shape:nodeShapes.some(([name])=>name===input.shape)?input.shape:chartDefault.shape,
    fill:hexColor(input.fill)?input.fill:chartDefault.fill,
    stroke:hexColor(input.stroke)?input.stroke:chartDefault.stroke,
    line_color:hexColor(input.line_color)?input.line_color:chartDefault.line_color,
    bg_color:hexColor(input.bg_color)?input.bg_color:chartDefault.bg_color,
    bg_image:typeof input.bg_image==='string'&&(/^(data:image\/|https?:\/\/|\/)/i.test(input.bg_image))?input.bg_image:'',
    cover:{
      enabled:cover.enabled===true,
      title:typeof cover.title==='string'?cover.title.slice(0,120):chartDefault.cover.title,
      subtitle:typeof cover.subtitle==='string'?cover.subtitle.slice(0,180):chartDefault.cover.subtitle,
      fill:hexColor(cover.fill)?cover.fill:chartDefault.cover.fill,
      text_color:hexColor(cover.text_color)?cover.text_color:chartDefault.cover.text_color,
      border_color:hexColor(cover.border_color)?cover.border_color:chartDefault.cover.border_color,
      variant:['solid','outline','band'].includes(cover.variant)?cover.variant:chartDefault.cover.variant,
    },
  };
};
export const cleanStyle = source => {
  const data=source&&typeof source==='object'?source:{};
  return {
    ...(nodeShapes.some(([name])=>name===data.shape)?{shape:data.shape}:{}),
    ...(hexColor(data.fill)?{fill:data.fill}:{}),
    ...(hexColor(data.stroke)?{stroke:data.stroke}:{}),
  };
};
const colorInput=(title,value,onChange,disabled)=> <label className="dgft-color-control" key={title}>
  <span>{title}</span><div><input type="color" aria-label={title} value={value}
    onChange={event=>onChange(event.target.value)} disabled={disabled}/><small>{value}</small></div>
</label>;

export default function ChartStylePanel({appearance,onAppearance,selectedPerson,onPersonStyle,canManage}) {
  const style=selectedPerson?cleanStyle(selectedPerson.style):{};
  const chosen={shape:style.shape||appearance.shape,fill:style.fill||appearance.fill,stroke:style.stroke||appearance.stroke};
  const cover=appearance.cover;
  const change=(key,value)=>onAppearance({...appearance,[key]:value});
  const changeCover=(key,value)=>onAppearance({...appearance,cover:{...cover,[key]:value}});
  const changePerson=(key,value)=>onPersonStyle({...style,[key]:value});
  return <div id="family-style-panel" className="dgft-style-editor" aria-label="Kustomisasi bagan">
    <h3>MODEL BAGAN</h3>
    <label>Bentuk bawaan<select aria-label="Bentuk bawaan bagan" disabled={!canManage}
      value={appearance.shape} onChange={event=>change('shape',event.target.value)}>
      {nodeShapes.map(([key,name])=><option key={key} value={key}>{name}</option>)}
    </select></label>
    <div className="dgft-style-colors">
      {colorInput('Fill bagan',appearance.fill,value=>change('fill',value),!canManage)}
      {colorInput('Garis bingkai',appearance.stroke,value=>change('stroke',value),!canManage)}
      {colorInput('Line hubungan',appearance.line_color,value=>change('line_color',value),!canManage)}
    </div><hr/>
    <h3>BAGAN TOKOH</h3>
    <div className="dgft-style-person">{selectedPerson?
      <strong>{[selectedPerson.data?.['first name'],selectedPerson.data?.['last name']].filter(Boolean).join(' ')}</strong>:
      <span>Pilih tokoh di kanvas</span>}</div>
    {selectedPerson&&<>
      <label>Bentuk tokoh<select aria-label="Bentuk tokoh terpilih" disabled={!canManage}
        value={style.shape||''} onChange={event=>onPersonStyle({...style,...(event.target.value?{shape:event.target.value}:{shape:undefined})})}>
        <option value="">Ikuti bentuk bawaan</option>
        {nodeShapes.map(([key,name])=><option key={key} value={key}>{name}</option>)}
      </select></label>
      <div className="dgft-style-colors">
        {colorInput('Fill tokoh',chosen.fill,value=>changePerson('fill',value),!canManage)}
        {colorInput('Garis tokoh',chosen.stroke,value=>changePerson('stroke',value),!canManage)}
      </div>
      <button className="dg-ui-action" type="button" disabled={!canManage||!Object.keys(style).length}
        onClick={()=>onPersonStyle({})}>Reset tampilan tokoh</button>
    </>}<hr/>
    <h3>COVER BAGAN</h3>
    <label className="dgft-style-check"><input type="checkbox" aria-label="Tampilkan cover bagan"
      disabled={!canManage} checked={cover.enabled} onChange={event=>changeCover('enabled',event.target.checked)}/>Tampilkan cover</label>
    {cover.enabled&&<>
      <label>Judul cover<input aria-label="Judul cover" maxLength={120}
        disabled={!canManage} value={cover.title} onChange={event=>changeCover('title',event.target.value)}/></label>
      <label>Subjudul<input aria-label="Subjudul cover" maxLength={180}
        disabled={!canManage} value={cover.subtitle} onChange={event=>changeCover('subtitle',event.target.value)}/></label>
      <label>Model cover<select aria-label="Model cover" disabled={!canManage} value={cover.variant}
        onChange={event=>changeCover('variant',event.target.value)}>
        <option value="solid">Blok warna</option><option value="outline">Bingkai</option><option value="band">Pita</option>
      </select></label>
      <div className="dgft-style-colors">
        {colorInput('Fill cover',cover.fill,value=>changeCover('fill',value),!canManage)}
        {colorInput('Teks cover',cover.text_color,value=>changeCover('text_color',value),!canManage)}
        {colorInput('Garis cover',cover.border_color,value=>changeCover('border_color',value),!canManage)}
      </div>
    </>}
  </div>;
}

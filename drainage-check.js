/* MSMA 2 Chapter 14 lined open-drain hydraulic checking. */
(function(root){
 'use strict';
 const defaults={designer:'',shape:'',lining:'',condition:'',qDesign:'',depth:'',base:'',sideSlope:'',gradient:'',manning:''};
 const linings={
  'concrete-smooth':{label:'Concrete · smooth finish',n:0.015,minX:0},
  'concrete-rough':{label:'Concrete · rough finish',n:0.018,minX:0},
  'brickwork':{label:'Brickwork',n:0.020,minX:0},
  'dressed-stone':{label:'Dressed stone in mortar',n:0.017,minX:1.5},
  'random-stone':{label:'Random stones in mortar / rubble masonry',n:0.035,minX:1.5},
  'rock-riprap':{label:'Rock riprap',n:0.030,minX:2}
 };
 let draft={...defaults};
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const f=(x,n=3)=>Number.isFinite(x)?x.toFixed(n):'—';
 const num=x=>x===''?NaN:Number(x);
 function geometry(y,b,x){const top=b+2*x*y,area=y*(b+x*y),perimeter=b+2*y*Math.sqrt(1+x*x),radius=area/perimeter;return {top,area,perimeter,radius}}
 function discharge(y,b,x,n,slope){const g=geometry(y,b,x);return (1/n)*g.area*g.radius**(2/3)*Math.sqrt(slope)}
 function solveDepth(q,b,x,n,slope){
  if(![q,b,x,n,slope].every(Number.isFinite)||q<=0||b<=0||x<0||n<=0||slope<=0)return NaN;
  let lo=0,hi=Math.max(0.1,b);while(discharge(hi,b,x,n,slope)<q&&hi<100)hi*=2;
  if(hi>=100&&discharge(hi,b,x,n,slope)<q)return NaN;
  for(let i=0;i<90;i++){const mid=(lo+hi)/2;if(discharge(mid,b,x,n,slope)<q)lo=mid;else hi=mid}
  return (lo+hi)/2;
 }
 function calculate(input){
  const p={};for(const key of ['qDesign','depth','base','sideSlope','gradient','manning'])p[key]=num(input[key]);
  if(input.shape==='rectangular')p.sideSlope=0;
  const errors=[];
  if(!input.designer?.trim())errors.push('Prepared by');
  if(!['rectangular','trapezoidal'].includes(input.shape))errors.push('Drain shape');
  if(!linings[input.lining])errors.push('Lining material');
  if(!['uncovered','protected'].includes(input.condition))errors.push('Cover / safety condition');
  if(!(p.qDesign>0))errors.push('Design discharge, Qdesign');
  if(!(p.depth>0.05))errors.push('Overall depth, d');
  if(!(p.base>0))errors.push('Base width, b');
  if(input.shape==='trapezoidal'&&!(p.sideSlope>0))errors.push('Side slope, X H : 1V');
  if(!(p.gradient>0))errors.push('Longitudinal slope, 1 : N');
  if(!(p.manning>0))errors.push('Manning roughness, n');
  if(errors.length)return {valid:false,errors};
  const slope=1/p.gradient,maxWaterDepth=p.depth-0.05,capacityGeometry=geometry(maxWaterDepth,p.base,p.sideSlope),qAllow=discharge(maxWaterDepth,p.base,p.sideSlope,p.manning,slope),normalDepth=solveDepth(p.qDesign,p.base,p.sideSlope,p.manning,slope),g=geometry(normalDepth,p.base,p.sideSlope),velocity=p.qDesign/g.area,freeboard=p.depth-normalDepth,topWidth=p.base+2*p.sideSlope*p.depth;
  const lining=linings[input.lining],maxDepth=input.condition==='uncovered'?0.6:1.2;
  const checks={
   capacity:Number.isFinite(qAllow)&&qAllow>=p.qDesign&&freeboard>=0.05-1e-9,
   velocity:velocity>=0.6&&velocity<=2,
   velocityProtected:velocity>2&&velocity<4&&input.condition==='protected',
   width:p.base>=0.5&&p.base<=1.2,
   depth:p.depth<=maxDepth,
   slope:slope<=0.002+1e-12,
   side:input.shape==='rectangular'?lining.minX===0:p.sideSlope>=lining.minX
  };
  const pass=checks.capacity&&(checks.velocity||checks.velocityProtected)&&checks.width&&checks.depth&&checks.slope&&checks.side;
  return {valid:true,errors:[],...p,slope,maxWaterDepth,qAllow,normalDepth,...g,capacityArea:capacityGeometry.area,capacityPerimeter:capacityGeometry.perimeter,capacityRadius:capacityGeometry.radius,capacityTop:capacityGeometry.top,velocity,freeboard,topWidth,maxDepth,checks,pass,lining};
 }
 function getState(){return {...draft}}
 function restoreState(state){if(!state||typeof state!=='object')return false;draft={...defaults};for(const key of Object.keys(defaults))if(Object.prototype.hasOwnProperty.call(state,key))draft[key]=state[key];return true}
 const option=(value,label,current)=>`<option value="${value}" ${current===value?'selected':''}>${label}</option>`;
 const selectField=(name,label,options)=>`<label class="drain-field" for="dc-${name}"><span>${label}</span><select id="dc-${name}" name="${name}" required><option value="" disabled ${draft[name]?'':'selected'}>Select ${label.toLowerCase()}</option>${options}</select></label>`;
 const inputField=(name,label,unit,min='0')=>`<label class="drain-field" for="dc-${name}"><span>${label}${unit?` (${unit})`:''}</span><input id="dc-${name}" name="${name}" type="number" inputmode="decimal" step="any" min="${min}" value="${esc(draft[name])}" required></label>`;
 function sectionDiagram(r){
  const ok=r.valid,x=ok?r.sideSlope:(draft.shape==='rectangular'?0:1.5),d=ok?r.depth:0.65,b=ok?r.base:0.8,run=Math.min(145,65*x),leftTop=230-run,rightTop=370+run,waterY=ok&&Number.isFinite(r.normalDepth)?230-145*Math.min(r.normalDepth/d,1.08):180,waterLeft=x?230-run*Math.min((230-waterY)/145,1.08):230,waterRight=x?370+run*Math.min((230-waterY)/145,1.08):370,overflow=ok&&!r.checks.capacity,alert=ok&&!r.pass&&!overflow,waterClass=overflow?'overflow':alert?'alert':'',ratio=draft.shape==='rectangular'?'Vertical':draft.sideSlope!==''?`${Number(draft.sideSlope)}H:1V`:'XH:1V';
  const flow=ok?`<path class="water-fill ${waterClass}" d="M${overflow?leftTop-10:waterLeft} ${overflow?75:waterY}H${overflow?rightTop+10:waterRight}L370 230H230Z"/><path class="water-surface ${waterClass}" d="M${overflow?leftTop-10:waterLeft} ${overflow?75:waterY}H${overflow?rightTop+10:waterRight}"/>${overflow?'<text class="flow-alert" x="300" y="58" text-anchor="middle">Overflow · capacity insufficient</text>':''}`:`<path class="pending-flow" d="M190 185Q225 170 260 185T340 185T410 185"/><text class="pending-label" x="300" y="210" text-anchor="middle">Complete inputs to check the drain</text>`;
  return `<svg class="drain-section" viewBox="0 0 650 300" role="img" aria-label="${esc(ratio)} lined drain section"><defs><marker id="dc-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="#36594c"/></marker></defs><path d="M40 85H${leftTop}L230 230H370L${rightTop} 85H610" fill="none" stroke="#203f34" stroke-width="3"/>${flow}<g fill="none" stroke="#36594c"><path d="M${leftTop} 55H${rightTop}M230 264H370M610 85V230" marker-start="url(#dc-arrow)" marker-end="url(#dc-arrow)"/><path d="M${leftTop} 48V80M${rightTop} 48V80M230 240V276M370 240V276M596 85H620M596 230H620"/></g><g fill="#203f34" font-family="Arial,sans-serif" font-size="15"><text x="300" y="40" text-anchor="middle">T = ${ok?f(r.topWidth,2):'—'} m</text><text x="300" y="292" text-anchor="middle">b = ${ok?f(r.base,2):'—'} m</text><text x="626" y="158" transform="rotate(90 626 158)" text-anchor="middle">d = ${ok?f(r.depth,2):'—'} m</text><text x="${rightTop+8}" y="118">${esc(ratio)}</text></g></svg>`;
 }
 const checkRow=(label,ok,detail)=>`<div class="dc-check ${ok?'dc-pass':'dc-fail'}"><span>${ok?'✓':'!'}</span><div><b>${label}</b><small>${detail}</small></div></div>`;
 function resultHtml(r){
  if(!r.valid)return '<p>Complete the inputs to view the drainage check.</p>';
  const velocityOk=r.checks.velocity||r.checks.velocityProtected;
  return `<div class="drain-metrics"><div><span>Qdesign</span><strong>${f(r.qDesign)} <small>m³/s</small></strong></div><div><span>Qallow</span><strong>${f(r.qAllow)} <small>m³/s</small></strong></div><div><span>Normal depth</span><strong>${f(r.normalDepth)} <small>m</small></strong></div><div><span>Velocity</span><strong>${f(r.velocity,2)} <small>m/s</small></strong></div></div><div class="dc-verdict ${r.pass?'dc-verdict-pass':'dc-verdict-review'}"><b>${r.pass?'PASS':'REVIEW REQUIRED'}</b><span>${r.pass?'The proposed drain satisfies the configured MSMA checks.':'Revise the proposed dimensions, slope, lining or safety provision.'}</span></div><div class="dc-checks">${checkRow('Hydraulic capacity',r.checks.capacity,`Qallow ${f(r.qAllow)} m³/s · Freeboard ${f(r.freeboard,3)} m`)}${checkRow('Flow velocity',velocityOk,`${f(r.velocity,2)} m/s · target 0.6–2.0 m/s${r.checks.velocityProtected?' · protected condition applied':''}`)}${checkRow('Base width',r.checks.width,`${f(r.base,2)} m · MSMA range 0.5–1.2 m`)}${checkRow('Overall depth',r.checks.depth,`${f(r.depth,2)} m · maximum ${f(r.maxDepth,1)} m`)}${checkRow('Longitudinal slope',r.checks.slope,`${f(r.slope*100,3)}% · maximum 0.2%`)}${checkRow('Side slope / lining',r.checks.side,draft.shape==='rectangular'?'Vertical section':`${f(r.sideSlope,2)}H:1V · minimum ${f(r.lining.minX,1)}H:1V`)}</div>`;
 }
 function report(r){
  const project=esc(document.querySelector('#project-name').value||'—'),date=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date()),val=(x,n=3)=>`<mark>${f(x,n)}</mark>`,pair=(label,value,unit='')=>`<div class="calc-pair"><span>${label}</span><span>${value} ${unit}</span></div>`,row=(ref,content,remark='')=>`<tr><td class="calc-ref">${ref}</td><td>${content}</td><td class="calc-remark">${remark}</td></tr>`;
  const velocityOk=r.valid&&(r.checks.velocity||r.checks.velocityProtected);
  return `<article class="a4-sheet drainage-sheet"><div class="sheet-head"><h3>Drainage Calculation Sheet</h3><div>Project: ${project}<br>Sheet 1 / 1<small>Designed by: ${esc(draft.designer||'—')}</small></div></div><div class="sheet-meta"><div>Title: <b>LINED DRAIN HYDRAULIC CHECK</b></div><div>Date: ${date}</div></div><table class="calc-table"><colgroup><col style="width:18%"><col style="width:62%"><col style="width:20%"></colgroup><thead><tr><th>REF.</th><th>CALCULATION</th><th>REMARK</th></tr></thead><tbody>${row('Input','<h4>PROPOSED DRAIN</h4>'+pair('Shape',esc(draft.shape||'—'))+pair('Lining',esc(r.lining?.label||'—'))+pair('Qdesign',val(r.qDesign),'m³/s')+pair('Overall depth, d',val(r.depth),'m')+pair('Base width, b',val(r.base),'m')+pair('Side slope, X',draft.shape==='rectangular'?'Vertical':val(r.sideSlope))+pair('Longitudinal slope',`1 : ${esc(draft.gradient||'—')}`)+pair('Manning n',esc(draft.manning||'—')))}${row('MSMA 2<br>§14.2.5<br>Steps 3–4','<h4>CAPACITY CHECK</h4><p>Maximum design water depth, y = d − 0.05</p>'+pair('y',val(r.maxWaterDepth),'m')+pair('Flow area, A',val(r.capacityArea),'m²')+pair('Wetted perimeter, P',val(r.capacityPerimeter),'m')+pair('Hydraulic radius, R = A/P',val(r.capacityRadius),'m')+'<p>Q = (1/n)AR<sup>2/3</sup>S<sup>1/2</sup></p>'+pair('Qallow',val(r.qAllow),'m³/s')+pair('Qdesign',val(r.qDesign),'m³/s'),r.valid?`Capacity: <b>${r.checks.capacity?'OK':'NOT OK'}</b>`:'Not calculated')}${row('MSMA 2<br>§14.2.4<br>§14.2.5','<h4>FLOW AND CRITERIA CHECK</h4>'+pair('Normal depth',val(r.normalDepth),'m')+pair('Available freeboard',val(r.freeboard),'m')+pair('Average velocity, V = Q/A',val(r.velocity),'m/s')+pair('Base width',val(r.base),'m')+pair('Overall depth',val(r.depth),'m')+pair('Longitudinal slope',`${f(r.slope*100,3)} %`),r.valid?`Velocity: <b>${velocityOk?'OK':'NOT OK'}</b><br>Geometry: <b>${r.checks.width&&r.checks.depth&&r.checks.side?'OK':'NOT OK'}</b><br>Slope: <b>${r.checks.slope?'OK':'NOT OK'}</b>`:'Not calculated')}${row('Result',sectionDiagram(r),r.valid?`Overall check:<br><b>${r.pass?'PASS':'REVIEW REQUIRED'}</b>`:'Awaiting input')}</tbody></table><div class="sheet-foot">MSMA 2nd Edition: Chapter 14, Sections 14.2.4–14.2.5; Manning roughness values from Table 2.3.</div></article>`;
 }
 function update(){
  const r=calculate(draft),validation=document.querySelector('#dc-validation');validation.textContent=r.valid?'':`Complete or correct: ${r.errors.join(', ')}.`;
  document.querySelectorAll('#dc-form [required]').forEach(el=>el.setAttribute('aria-invalid',String(!el.checkValidity())));
  document.querySelector('#dc-print').disabled=!r.valid;document.querySelector('#dc-results').innerHTML=resultHtml(r);document.querySelector('#dc-section').innerHTML=sectionDiagram(r);document.querySelector('#dc-report').innerHTML=report(r);
  root.dispatchEvent(new CustomEvent('nadi:module-status',{detail:{key:'3/0',status:!r.valid?'incomplete':r.pass?'passed':'review'}}));
 }
 function mount(container){
  const liningOptions=Object.entries(linings).map(([key,v])=>option(key,v.label,draft.lining)).join('');
  container.innerHTML=`<a class="back" href="#module/3">← Back to Drainage System</a><div class="drain-toolbar"><div><h2>Drainage Check</h2><p>Check a proposed lined open drain against its design discharge and MSMA criteria.</p></div><button class="drain-button" id="dc-print" type="button">Print / Save PDF · A4</button></div><div class="drain-layout"><form id="dc-form" class="drain-form" novalidate><fieldset><legend>Sheet Information</legend><div class="drain-fields"><label class="drain-field"><span>Prepared by</span><input name="designer" type="text" value="${esc(draft.designer)}" placeholder="Name / initials" required></label></div></fieldset><fieldset><legend>Design Flow & Drain Type</legend><div class="drain-fields">${inputField('qDesign','Design discharge, Qdesign','m³/s')}${selectField('shape','Drain shape',option('rectangular','Rectangular',draft.shape)+option('trapezoidal','Trapezoidal',draft.shape))}${selectField('lining','Lining material',liningOptions)}${selectField('condition','Cover / safety condition',option('uncovered','Uncovered',draft.condition)+option('protected','Covered / handrail',draft.condition))}</div></fieldset><fieldset><legend>Dimensions & Hydraulic</legend><div class="drain-fields">${inputField('depth','Overall depth, d','m','0.05')}${inputField('base','Base width, b','m')}${inputField('sideSlope','Side slope, X H : 1V','X')}${inputField('gradient','Longitudinal slope, 1 : N','N')}${inputField('manning','Manning roughness, n','')}</div></fieldset><button class="table-trigger" id="dc-manning-table" type="button" aria-haspopup="dialog">View Manning roughness table · MSMA 2.3</button><p id="dc-validation" role="status"></p></form><div class="drain-results"><section class="result-panel"><h2>Check Results</h2><div id="dc-results" aria-live="polite"></div></section><section class="result-panel"><h2>Cross-Section</h2><div id="dc-section"></div></section></div></div><section class="calculation-preview"><div class="drain-toolbar"><div><h2>Calculation Sheet</h2><p>A4 · MSMA hydraulic and design-criteria check</p></div></div><div id="dc-report"></div></section><dialog id="dc-manning-dialog" class="reference-dialog value-dialog" aria-labelledby="dc-manning-title"><div class="reference-dialog-head"><div><h2 id="dc-manning-title">Manning’s Roughness, n</h2><p>MSMA 2nd Edition · Table 2.3 · p. 2-3</p></div><button type="button" id="dc-manning-close" aria-label="Close table">✕</button></div><table class="reference-data-table"><thead><tr><th>Drain lining</th><th>Manning n</th></tr></thead><tbody>${Object.values(linings).map(v=>`<tr><td>${v.label}</td><td>${v.n.toFixed(3)}</td></tr>`).join('')}</tbody></table></dialog>`;
  const form=container.querySelector('#dc-form');
  function syncConditional(){const side=form.elements.sideSlope,rect=draft.shape==='rectangular';side.disabled=rect;side.required=!rect;if(rect){draft.sideSlope=0;side.value=''}else if(draft.sideSlope===0){draft.sideSlope='';side.value=''}}
  form.addEventListener('input',e=>{if(!e.target.name)return;draft[e.target.name]=e.target.value;if(e.target.name==='shape')syncConditional();if(e.target.name==='lining'&&linings[e.target.value]){draft.manning=linings[e.target.value].n;form.elements.manning.value=draft.manning}update()});
  form.addEventListener('submit',e=>e.preventDefault());syncConditional();
  container.querySelector('#dc-print').addEventListener('click',()=>{if(calculate(draft).valid){document.body.classList.add('printing-drain');window.print()}});
  const dialog=container.querySelector('#dc-manning-dialog');container.querySelector('#dc-manning-table').addEventListener('click',()=>dialog.showModal());container.querySelector('#dc-manning-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});root.addEventListener('afterprint',()=>document.body.classList.remove('printing-drain'));
  update();
 }
 root.DrainageCheck={mount,calculate,getState,restoreState,defaults,linings};
 if(typeof module!=='undefined'&&module.exports)module.exports={calculate,defaults,linings};
})(typeof window!=='undefined'?window:globalThis);

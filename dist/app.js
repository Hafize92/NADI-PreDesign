const APP_VERSION='1.6.0';
const icons=[`<path d="m3 17 6-9 4 5 3-3 5 7M3 21h18M7 3h4"/>`,`<path d="M3 7h18M5 7l3 13h8l3-13M8 12h8M9 16h6M10 3v4m4-4v4"/>`,`<path d="m8 3-4 18M16 3l4 18M12 3v4m0 3v4m0 3v4"/>`,`<path d="M3 7h6v6h6v4h6M3 11h2v6h6v4h10M17 3v7m-3-3 3 3 3-3"/>`,`<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12ZM9 16a3 3 0 0 0 3 3"/>`,`<path d="M3 5h6v6h6V5h6M3 9h2v6h5v6h4v-6h5V9h2"/>`];
const modules=[{name:'Earthworks',subs:['Temp Earth Drain']},{name:'Erosion and Sediment Control',subs:['Sediment Trap','Sediment Basin']},{name:'Internal Roads',subs:[]},{name:'Drainage System',subs:['Drainage Check']},{name:'Water Reticulation',subs:[]},{name:'Sewerage Network',subs:[]}];
const shortNames=['Earthworks','Erosion','Roads','Drainage','Water','Sewerage'];
const icon=i=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[i]}</svg>`;
const moduleStatuses={'0/0':'incomplete','1/0':'incomplete','1/1':'incomplete','3/0':'incomplete'};
const grid=document.querySelector('#module-grid'),nav=document.querySelector('#nav');

document.querySelector('#discipline-grid').innerHTML=modules.map((m,i)=>`<div class="discipline-item" aria-label="${m.name}">${icon(i)}<b>${shortNames[i]}</b></div>`).join('');
modules.forEach((m,i)=>{
 nav.insertAdjacentHTML('beforeend',`<a href="#module/${i}"><span>${icon(i)}</span>${m.name}</a>`);
 grid.insertAdjacentHTML('beforeend',`<a class="module-card" data-module="${i}" href="#module/${i}" aria-label="Open ${m.name} module"><div class="card-top"><span class="module-icon">${icon(i)}</span></div><h3>${m.name}</h3><p>${m.subs.length?m.subs.join(' <span aria-hidden="true">·</span> '):'The design scope will be developed.'}</p><div class="card-bottom"><span class="status" data-module-status="${i}">Awaiting details</span><span aria-hidden="true">↗</span></div></a>`);
});

function moduleStatus(index){
 const subs=modules[index].subs;
 if(!subs.length)return {text:'Awaiting details',className:''};
 const savedStates=subs.map((_,j)=>moduleStatuses[`${index}/${j}`]);
 if(savedStates.every(x=>!x))return {text:'Awaiting details',className:''};
 const states=savedStates.map(x=>x||'incomplete');
 const passed=states.filter(x=>x==='passed').length;
 if(passed===states.length)return {text:`${passed}/${states.length} passed`,className:'passed'};
 if(states.includes('review'))return {text:`${passed}/${states.length} passed · Review`,className:'review'};
 return {text:`${passed}/${states.length} passed · Awaiting input`,className:''};
}
function statusLabel(status){return status==='passed'?'Passed':status==='review'?'Review required':status==='incomplete'?'Awaiting input':'Awaiting details'}
function refreshStatuses(){
 modules.forEach((_,i)=>{const data=moduleStatus(i),el=document.querySelector(`[data-module-status="${i}"]`);if(el){el.textContent=data.text;el.className=`status ${data.className}`.trim()}});
 document.querySelectorAll('[data-submodule-status]').forEach(el=>{const state=moduleStatuses[el.dataset.submoduleStatus];el.textContent=statusLabel(state);el.className=`status ${state==='passed'?'passed':state==='review'?'review':''}`.trim()});
}
window.addEventListener('nadi:module-status',event=>{if(event.detail&&event.detail.key){moduleStatuses[event.detail.key]=event.detail.status;refreshStatuses()}});

function render(){
 const match=location.hash.match(/^#module\/([0-5])(?:\/([0-1]))?$/),detail=document.querySelector('#detail');
 document.querySelector('.heading').hidden=!match;document.querySelector('#dashboard').hidden=!!match;detail.hidden=!match;
 document.querySelectorAll('#nav a').forEach((a,index)=>{const selected=match?index===Number(match[1])+1:index===0;a.classList.toggle('active',selected);selected?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current')});
 if(match){
  const i=Number(match[1]),m=modules[i],sub=match[2]!==undefined?m.subs[Number(match[2])]:null;
  document.querySelector('#page-title').textContent=sub||m.name;document.querySelector('#page-subtitle').textContent=sub?m.name:'Preliminary planning module / Master Plan';
  if(i===0&&sub==='Temp Earth Drain'){EarthDrain.mount(detail);window.scrollTo(0,0);return}
  if(i===1&&sub==='Sediment Trap'){ESCPDesign.mountTrap(detail);window.scrollTo(0,0);return}
  if(i===1&&sub==='Sediment Basin'){ESCPDesign.mountBasin(detail);window.scrollTo(0,0);return}
  if(i===3&&sub==='Drainage Check'){DrainageCheck.mount(detail);window.scrollTo(0,0);return}
  const parentStatus=moduleStatus(i),hasSubmodules=!sub&&m.subs.length;
  detail.innerHTML=`<a class="back" href="${sub?'#module/'+i:'#dashboard'}">← ${sub?'Back to '+m.name:'Back to dashboard'}</a><div class="detail-panel"><span class="status ${parentStatus.className}">${sub?statusLabel(moduleStatuses[`${i}/${match[2]}`]):parentStatus.text}</span><h2>${sub||m.name}</h2>${hasSubmodules?'<p>Components identified for this module.</p>'+m.subs.map((s,j)=>`<a class="submodule" href="#module/${i}/${j}">${s}<span class="status" data-submodule-status="${i}/${j}">${statusLabel(moduleStatuses[`${i}/${j}`])}</span></a>`).join(''):`<div class="empty"><h3>Design details to follow</h3><p>${sub?'Parameters, criteria, and calculation methods for '+sub+' will be added when the details are available.':'The design scope, parameters, and criteria will be completed when further information is available.'}</p><p>No calculations or design results are available at this stage.</p></div>`}</div>`;
  refreshStatuses();window.scrollTo(0,0);
 }else{
  document.querySelector('#page-title').textContent='Dashboard';document.querySelector('#page-subtitle').textContent='One workspace for every master plan component.';refreshStatuses();
  if(location.hash==='#modules')requestAnimationFrame(()=>document.querySelector('#modules').scrollIntoView({behavior:'smooth'}));
 }
}
window.addEventListener('hashchange',render);

const menuToggle=document.querySelector('.menu-toggle');
function closeMenu(){menuToggle.setAttribute('aria-expanded','false');document.querySelector('aside').classList.remove('menu-open')}
menuToggle.addEventListener('click',()=>{const open=menuToggle.getAttribute('aria-expanded')!=='true';menuToggle.setAttribute('aria-expanded',String(open));document.querySelector('aside').classList.toggle('menu-open',open)});
document.querySelector('#nav').addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuToggle.getAttribute('aria-expanded')==='true'){closeMenu();menuToggle.focus()}});
window.addEventListener('hashchange',closeMenu);

const projectName=document.querySelector('#project-name'),siteArea=document.querySelector('#site-area'),fileStatus=document.querySelector('#project-file-status'),uploadInput=document.querySelector('#upload-project'),uploadButton=document.querySelector('#upload-project-button');
function showFileStatus(message,error=false){fileStatus.textContent=message;fileStatus.classList.toggle('file-error',error)}
function localDate(){const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')}
function safeFileName(value){return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').replace(/[. ]+$/g,'').trim()||'NADI-Project'}
function saveProject(){
 const name=projectName.value.trim();
 if(!name){showFileStatus('Enter Project Name before saving.',true);projectName.focus();return}
 const payload={format:'NADI-PreDesign',schemaVersion:1,appVersion:APP_VERSION,savedAt:new Date().toISOString(),project:{name,siteArea:siteArea.value},modules:{earthDrain:EarthDrain.getState(),escp:ESCPDesign.getState(),drainageCheck:DrainageCheck.getState()},statuses:{...moduleStatuses}};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=`${safeFileName(name)}_${localDate()}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);showFileStatus(`Saved ${link.download}`);
}
async function restoreProject(file){
 try{
  const data=JSON.parse(await file.text());
  if(!data||data.format!=='NADI-PreDesign'||!data.project||!data.modules)throw new Error('This is not a NADI PreDesign save file.');
  projectName.value=data.project.name||'';siteArea.value=data.project.siteArea??'';EarthDrain.restoreState(data.modules.earthDrain||{});ESCPDesign.restoreState(data.modules.escp||{});DrainageCheck.restoreState(data.modules.drainageCheck||{});
  for(const key of Object.keys(moduleStatuses))delete moduleStatuses[key];
  if(data.statuses&&typeof data.statuses==='object')for(const [key,value] of Object.entries(data.statuses)){if(['incomplete','passed','review'].includes(value))moduleStatuses[key]=value}
  if(!moduleStatuses['0/0'])moduleStatuses['0/0']='incomplete';
  if(!moduleStatuses['1/0'])moduleStatuses['1/0']='incomplete';
  if(!moduleStatuses['1/1'])moduleStatuses['1/1']='incomplete';
  if(!moduleStatuses['3/0'])moduleStatuses['3/0']='incomplete';
  render();refreshStatuses();showFileStatus(`Restored ${file.name}`);
 }catch(error){showFileStatus(error.message||'Unable to restore this file.',true)}finally{uploadInput.value=''}
}
document.querySelector('#save-project').addEventListener('click',saveProject);
uploadButton.addEventListener('click',()=>uploadInput.click());
uploadInput.addEventListener('change',()=>{const file=uploadInput.files&&uploadInput.files[0];if(file)restoreProject(file)});
window.NADIProject={save:saveProject,restore:restoreProject};
render();

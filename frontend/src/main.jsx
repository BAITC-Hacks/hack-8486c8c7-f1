import React,{useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Zap,LayoutGrid,BriefcaseBusiness,Trophy,Users,ArrowUpRight,ArrowRight,Sparkles,Coins,Gift,CheckCircle2,LoaderCircle,CircleHelp,X} from 'lucide-react';
import {go,PRIZES,LevelIcon,Modal,Empty} from './ui';
import Catalog from './Catalog';
import {NewTask,Editor,ProposalForm,ProgressForm} from './forms';
import {TaskDetail} from './Detail';
import {Dashboard,Quests,Teams} from './Workspace';
import './styles.css';
function App(){
 const [role,setRole]=useState(localStorage.getItem('tq-role')||'Business'),[team,setTeam]=useState(Number(localStorage.getItem('tq-team')||1));
 const [route,setRoute]=useState(location.hash.slice(1)||'catalog'),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState(''),[modal,setModal]=useState(null);
 const locked=useRef(false);
 async function api(path,method='GET',body){
  const res=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json','X-Demo-Role':role},body:body?JSON.stringify(body):undefined});
  let v;try{v=await res.json();}catch{throw Error('Сервер недоступен. Проверьте запуск backend.');}
  if(!res.ok)throw Error(Array.isArray(v.detail)?v.detail.map(x=>x.loc.slice(1).join('.')+': '+x.msg).join('; '):v.detail||'Действие не выполнено');return v;
 }
 async function refresh(){const v=await api('/state');setData(v);return v;}
 async function act(fn){if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e.message||'Ошибка соединения. Проверьте запуск backend.');}finally{setBusy(false);locked.current=false;}}
 useEffect(()=>{const h=()=>{setRoute(location.hash.slice(1)||'catalog');setError('');window.scrollTo(0,0);};window.addEventListener('hashchange',h);return()=>window.removeEventListener('hashchange',h);},[]);
 useEffect(()=>{let active=true;setData(null);api('/state').then(v=>{if(active)setData(v);}).catch(()=>{if(active)setError('Не удалось загрузить данные. Запустите backend и повторите.');});localStorage.setItem('tq-role',role);return()=>{active=false;};},[role]);
 useEffect(()=>{localStorage.setItem('tq-team',String(team));},[team]);
 useEffect(()=>{if(toast){const id=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(id);}},[toast]);
 const tasks=data?.challenges||[],apps=data?.applications||[],teams=data?.teams||[],wallet=data?.wallet||{coins:0,xp:0,history:[]};
 const current=tasks.find(t=>t.id===Number(route.split('/')[1])),selectedTeam=teams.find(t=>t.id===team);
 const nav=[['catalog',LayoutGrid,'Каталог задач'],['dashboard',BriefcaseBusiness,role==='Business'?'Мой кабинет':'Мои отклики'],['quests',Trophy,'Квесты и награды'],['teams',Users,'Команды']];
 const mutate=(path,body,message)=>act(async()=>{await api(path,'POST',body);await refresh();setToast(message);});
 return <div className="app"><aside className="sidebar"><a className="brand" href="#catalog"><span className="brand-mark"><Zap size={23} fill="currentColor"/></span><span>TaskQuest<span className="brand-ai">AI</span></span></a><div className="workspace-label">AI SANA · CHALLENGE HUB</div><nav>{nav.map(([key,C,text])=><a key={key} href={'#'+key} className={route===key?'active':''}><C size={19}/>{text}{key==='quests'&&<span className="nav-dot"/>}</a>)}</nav><div className="sidebar-quest"><div className="flex items-center gap-2"><Sparkles size={18}/><strong>Идеи обретают силу</strong></div><p>Превратите задачу бизнеса в следующий большой проект.</p><button className="light-btn" onClick={()=>go(role==='Business'?'new':'catalog')}>{role==='Business'?'Создать challenge':'Найти challenge'}<ArrowUpRight size={16}/></button></div><div className="sidebar-bottom"><span className="avatar small">{role==='Business'?'S':'C'}</span><div><strong>{role==='Business'?'Sana Studio':selectedTeam?.name}</strong><small>{role==='Business'?'Business workspace':'Student workspace'}</small></div><span className="online-dot"/></div></aside>
 <div className="shell"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span><strong>{route.startsWith('edit')?'Конструктор':route.startsWith('task')?'Challenge':route==='new'?'Новая задача':nav.find(n=>n[0]===route)?.[2]||'TaskQuest'}</strong></div><div className="top-actions"><div className="role-switch" aria-label="Демо-роль">{['Business','Student'].map(v=><button key={v} disabled={busy} onClick={()=>{setRole(v);setModal(null);go('catalog');}} className={role===v?'chosen':''}>{v==='Business'?<BriefcaseBusiness size={14}/>:<Users size={14}/>} {v}</button>)}</div>{role==='Student'&&<select aria-label="Активная команда" value={team} onChange={e=>setTeam(Number(e.target.value))}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>}<div className="balance"><Coins size={17}/><b>{wallet.coins}</b><span>Sana Coins</span></div><div className="xp-pill"><Zap size={15}/>{role==='Business'?wallet.xp:selectedTeam?.xp||0} XP</div></div></header>
 <main>{error&&<div role="alert" className="alert"><CircleHelp size={18}/><span>{error}</span><button onClick={()=>act(refresh)}>Повторить загрузку</button><button aria-label="Закрыть ошибку" onClick={()=>setError('')}><X size={16}/></button></div>}
 {!data?<div className="loading"><LoaderCircle className="spin"/> Загружаем ваш workspace…</div>:<>
 {route==='catalog'&&<Catalog tasks={tasks} apps={apps} teams={teams} role={role}/>}
 {route==='new'&&(role==='Business'?<NewTask busy={busy} submit={body=>act(async()=>{const t=await api('/challenges','POST',body);await refresh();go('task/'+t.id);const r=await api('/challenges/'+t.id+'/analyze','POST');await refresh();setToast(r.notice);go('edit/'+t.id);})}/>:<Empty text="Создание задач доступно в режиме Business."/>)}
 {route.startsWith('edit/')&&(current&&role==='Business'?<Editor key={current.id+'-'+current.version} task={current} busy={busy} save={body=>act(async()=>{const r=await api('/challenges/'+current.id,'PUT',body);await refresh();if(r.level_up)setModal({type:'level',task:r.task,rewards:r.rewards});else setToast('Карточка подтверждена. Рейтинг пересчитан.');go('task/'+current.id);})}/>:<Empty text="Карточка недоступна."/>)}
 {route.startsWith('task/')&&(current?<TaskDetail task={current} role={role} busy={busy} onAnalyze={()=>act(async()=>{const r=await api('/challenges/'+current.id+'/analyze','POST');await refresh();setToast(r.notice);go('edit/'+current.id);})} onPublish={()=>mutate('/challenges/'+current.id+'/publish',undefined,'Challenge опубликован и доступен всем командам.')} onApply={()=>{setError('');setModal({type:'apply',task:current});}} onBox={()=>act(async()=>{const r=await api('/challenges/'+current.id+'/box','POST');await refresh();setModal({type:'box',prize:r.prize});})} onBuy={item=>mutate('/challenges/'+current.id+'/purchase',{item},PRIZES[item]+' активировано')} apps={apps.filter(a=>a.challenge_id===current.id)} teams={teams}/>:<Empty text="Задача не найдена или ещё не опубликована."/>)}
 {route==='dashboard'&&<Dashboard tasks={tasks} apps={apps} teams={teams} role={role} team={team} busy={busy} decide={(id,status)=>mutate('/applications/'+id+'/decision',{status},status==='selected'?'Команда выбрана вами':'Отклик отклонён')} progress={a=>{setError('');setModal({type:'progress',app:a});}}/>}
 {route==='quests'&&<Quests tasks={tasks} wallet={wallet} role={role} selectedTeam={selectedTeam}/>}
 {route==='teams'&&<Teams teams={teams} role={role} team={team} choose={id=>{setTeam(id);setToast('Активная команда изменена');}}/>}
 </>}
 <footer><span><Zap size={13}/> TaskQuest AI</span><span>AI Sana Challenge Hub · Hackathon MVP</span><span>Синтетические данные · Демо-режим</span></footer></main></div>
 {busy&&<div className="busy-bar" role="status"><LoaderCircle className="spin" size={16}/>Сохраняем ваш прогресс…</div>}
 {toast&&<div className="toast" role="status"><CheckCircle2 size={19}/>{toast}<button aria-label="Закрыть уведомление" onClick={()=>setToast('')}><X size={16}/></button></div>}
 {modal&&<Modal close={()=>{if(!busy)setModal(null);}}>
 {modal.type==='level'&&<div className="reward-modal"><div className="reward-icon"><LevelIcon index={modal.task.level_index} size={46}/></div><div className="eyebrow">CHALLENGE EVOLVED</div><h2>Level up!</h2><h3>{modal.task.level}</h3><p>Ваша задача стала понятнее для команды.</p><div className="reward-chips"><span><Coins/>+{modal.rewards.reduce((s,r)=>s+r.coins,0)}</span><span><Zap/>+{modal.rewards.reduce((s,r)=>s+r.xp,0)} XP</span><span><Gift/>+{modal.rewards.reduce((s,r)=>s+r.boxes,0)}</span></div><button className="primary w-full" onClick={()=>setModal(null)}>Продолжить <ArrowRight size={16}/></button></div>}
 {modal.type==='box'&&<div className="reward-modal"><div className="reward-icon box-icon"><Gift size={48}/></div><div className="eyebrow">MYSTERY BOX · НАГРАДА ОТКРЫТА</div><h2>{PRIZES[modal.prize]}</h2><p>Уже применено к вашей задаче!<br/>Readiness остался прежним.</p><button className="primary w-full" onClick={()=>setModal(null)}>Отлично <Sparkles size={16}/></button></div>}
 {modal.type==='apply'&&<ProposalForm task={modal.task} team={selectedTeam} busy={busy} error={error} submit={body=>act(async()=>{await api('/challenges/'+modal.task.id+'/applications','POST',{...body,team_id:team});await refresh();setModal(null);setToast('Отклик отправлен. Решение примет бизнес.');go('dashboard');})}/>}
 {modal.type==='progress'&&<ProgressForm app={modal.app} busy={busy} error={error} submit={body=>act(async()=>{const r=await api('/applications/'+modal.app.id+'/progress','POST',body);await refresh();setModal(null);setToast('Прогресс подтверждён: +'+r.xp+' XP команде');})}/>}
 </Modal>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);


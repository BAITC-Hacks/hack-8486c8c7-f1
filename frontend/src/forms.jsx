import React,{useState,useEffect,useRef} from 'react';
import {ChevronLeft,Bot,ArrowRight,Check,Sparkles,ArrowUpRight} from 'lucide-react';
import {TOPICS,LABELS,EXAMPLES,STAGES,go,Badge,Ring,ScoreBreakdown} from './ui';
export function NewTask({submit,busy}){
 const [title,setTitle]=useState(''),[raw,setRaw]=useState(''),[topic,setTopic]=useState(TOPICS[0]);
 return <div className="narrow"><button className="back" onClick={()=>go('catalog')}><ChevronLeft size={16}/>Каталог</button><div className="page-title"><div><div className="eyebrow">ШАГ 1 ИЗ 4 · БАЗОВЫЕ ВОПРОСЫ</div><h1>У каждого квеста есть начало.</h1><p>Опишите потребность. Sana Bot поможет задать правильные вопросы.</p></div></div><form className="panel creation-form" onSubmit={e=>{e.preventDefault();submit({title,raw,topic});}}><div className="bot-heading"><span><Bot size={26}/></span><div><h3>Привет, я Sana!</h3><p>Расскажите, какую задачу вы хотите решить.</p></div></div><label>Название задачи<input required minLength={3} maxLength={120} placeholder="Например, AI-анализ отзывов клиентов" value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Направление<select value={topic} onChange={e=>setTopic(e.target.value)}>{TOPICS.map(t=><option key={t}>{t}</option>)}</select></label><label>Ваша идея<textarea required minLength={10} maxLength={5000} rows={5} placeholder="Хотим сделать AI для анализа отзывов клиентов…" value={raw} onChange={e=>setRaw(e.target.value)}/></label><div className="form-tip"><Sparkles size={16}/>Не нужно идеального ТЗ. Начните с нескольких предложений.</div><div className="form-actions"><button type="button" className="secondary" onClick={()=>{setTitle('AI-анализ отзывов клиентов');setRaw('Хотим сделать AI для анализа отзывов клиентов.');}}>Вставить демо-идею</button><button className="primary" disabled={busy}>Далее: заполнить анкету <ArrowRight size={17}/></button></div></form></div>;
}
export function Editor({task,busy,save,analyze}) {
 const [fields,setFields]=useState({...task.fields});
 const [title,setTitle]=useState(task.title),[topic,setTopic]=useState(task.topic);
 const [phase,setPhase]=useState('survey'),[index,setIndex]=useState(0);
 const [questions,setQuestions]=useState([]),[answers,setAnswers]=useState({});
 const [base,setBase]=useState({}),[version,setVersion]=useState(task.version);
 const [mode,setMode]=useState('mock'),[confirmed,setConfirmed]=useState(false);
 const [asking,setAsking]=useState(false),[questionError,setQuestionError]=useState('');
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 function move(next) {setPhase(next);setConfirmed(false);window.scrollTo(0,0);}
 const change=(key,value)=>{setFields(previous=>({...previous,[key]:value}));setConfirmed(false);};
 async function ask() {
  setAsking(true);setQuestionError('');
  try {
   const result=await analyze({fields,topic,version});
   if(!mounted.current)return;
   setQuestions(result.questions);setMode(result.mode);setVersion(result.task.version);
   setBase({...fields});setAnswers({});setIndex(0);move('questions');
  }catch(error){if(mounted.current)setQuestionError(error.message||'Не удалось получить вопросы. Попробуйте ещё раз.');}
  finally{if(mounted.current)setAsking(false);}
 }
 function answer(value) {
  const key=questions[index].field;
  setAnswers(previous=>({...previous,[key]:value}));
  change(key,value.trim() ? ((base[key]||'').trim() ? base[key]+'\nУточнение: '+value : value) : (base[key]||''));
 }
 function field(key) {
  return <label key={key}>{LABELS[key]}<textarea rows={3} maxLength={3000} value={fields[key]||''} onChange={e=>change(key,e.target.value)} placeholder="Если пока не знаете, оставьте пустым — Sana Bot поможет уточнить."/></label>;
 }
 const step=phase==='survey'?2:phase==='questions'?3:4;
 const q=questions[index];
 return <div className="narrow">
  <button className="back" disabled={asking||busy} onClick={()=>phase==='questions'?move('survey'):phase==='review'?move('questions'):go('task/'+task.id)}><ChevronLeft size={16}/>Назад</button>
  <div className="page-title"><div><div className="eyebrow">ШАГ {step} ИЗ 4 · {phase==='survey'?'АНКЕТА':phase==='questions'?'ДИАЛОГ С SANA BOT':'ПРОВЕРКА КАРТОЧКИ'}</div><h1>{phase==='survey'?'Что уже известно о задаче?':phase==='questions'?'Уточним недостающие детали.':'Ваша карточка готова к проверке.'}</h1></div></div>
  <div className="wizard-steps" aria-label="Этапы создания">{['Базовые вопросы','Анкета','Вопросы AI','Подтверждение'].map((label,i)=><span key={label} className={i+1===step?'active':''}>{i+1}. {label}</span>)}</div>
  {questionError&&<p className="form-error" role="alert">{questionError}</p>}
  {phase==='survey'&&<form className="panel creation-form" onSubmit={e=>{e.preventDefault();ask();}}>
   <p className="muted">Заполните то, что знаете. После анкеты Sana Bot прочитает ответы и задаст минимум три вопроса о пробелах. Если всё заполнено — попросит уточнить детали.</p>
   <fieldset disabled={asking||busy} className="wizard-fieldset">
    <label>Название задачи<input required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Направление<select value={topic} onChange={e=>setTopic(e.target.value)}>{TOPICS.map(t=><option key={t}>{t}</option>)}</select></label>
    {Object.keys(LABELS).map(field)}
    <button type="button" className="secondary" onClick={()=>setFields({...EXAMPLES})}>Вставить демо-ответы</button>
    <button className="primary w-full"><Bot size={18}/>Проанализировать ответы и продолжить</button>
   </fieldset>
   {asking&&<p role="status">Sana Bot читает анкету и подбирает вопросы по вашей теме…</p>}
  </form>}
  {phase==='questions'&&q&&<section className="panel creation-form" aria-label="Вопрос Sana Bot">
   <div className="bot-inline"><Bot size={28}/><div><strong>Sana Bot · {mode==='openai'?'OpenAI':'локальный режим'}</strong><p>Вопрос {index+1} из {questions.length} · {LABELS[q.field]}</p></div></div>
   <div className="progress-track"><span style={{width:((index+1)/questions.length*100)+'%'}}/></div>
   <h2>{q.question}</h2>
   {base[q.field]?.trim()&&<div className="form-tip"><div><strong>Вы уже указали:</strong><p style={{whiteSpace:'pre-wrap'}}>{base[q.field]}</p><small>Дополнение сохранится вместе с исходным ответом.</small></div></div>}
   <label>Ваш ответ<textarea key={q.field} autoFocus rows={6} maxLength={Math.max(0,3000-(base[q.field]?.length||0)-(base[q.field]?.trim()?12:0))} value={answers[q.field]||''} onChange={e=>answer(e.target.value)} placeholder="Расскажите подробнее. Если пока не знаете, можно продолжить без ответа."/></label>
   <div className="form-actions"><button className="secondary" disabled={index===0} onClick={()=>{setIndex(index-1);window.scrollTo(0,0);}}>Предыдущий вопрос</button><button className="primary" onClick={()=>{if(index+1<questions.length){setIndex(index+1);window.scrollTo(0,0);}else move('review');}}>{index+1===questions.length?'Проверить карточку':'Следующий вопрос'}<ArrowRight size={17}/></button></div>
   <p className="muted">Неизвестные сведения можно оставить пустыми. Они не принесут баллов за полноту.</p>
  </section>}
  {phase==='review'&&<form className="panel creation-form" onSubmit={e=>{e.preventDefault();save({title,topic,fields,confirmed:true,version});}}>
   <h2>{title}</h2><p className="muted">{topic} · Ответы из анкеты и диалога собраны ниже. Вы можете их исправить.</p>
   {Object.keys(LABELS).map(field)}
   <label className="checkbox"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>Я проверил(а) карточку и подтверждаю достоверность заполненных полей.</span></label>
   <button className="primary w-full" disabled={busy||!confirmed}><Check size={17}/>Подтвердить и пересчитать рейтинг</button>
  </form>}
 </div>;
}
export function ProposalForm({task,team,busy,error,submit}){
 const [idea,setIdea]=useState(''),[plan,setPlan]=useState(''),[duration,setDuration]=useState(''),[prototype,setPrototype]=useState('');
 return <form onSubmit={e=>{e.preventDefault();submit({idea,plan,duration,prototype:prototype.trim()||null});}}><div className="eyebrow">STUDENT PROPOSAL</div><h2 className="mt-2">Предложите своё решение</h2><p className="muted mb-5">{team?.name} → {task.title}</p>{error&&<p className="form-error" role="alert">{error}</p>}<label>Идея решения<textarea required minLength={15} maxLength={3000} rows={3} value={idea} onChange={e=>setIdea(e.target.value)}/></label><label>План работы<textarea required minLength={15} maxLength={3000} rows={3} value={plan} onChange={e=>setPlan(e.target.value)}/></label><label>Срок<input required minLength={3} maxLength={100} placeholder="Например, 3 недели" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Ссылка на прототип · необязательно<input type="url" maxLength={2000} placeholder="https://…" value={prototype} onChange={e=>setPrototype(e.target.value)}/></label><button className="primary w-full" disabled={busy}>Отправить отклик <ArrowUpRight size={17}/></button></form>;
}
export function ProgressForm({app,busy,error,submit}){
 const choices=Object.keys(STAGES).filter(s=>!app.milestones.some(m=>m.stage===s));
 const [stage,setStage]=useState(choices[0]),[evidence,setEvidence]=useState(''),[confirmed,setConfirmed]=useState(false);
 return <form onSubmit={e=>{e.preventDefault();submit({stage,evidence,confirmed:true});}}><div className="eyebrow">ПОДТВЕРЖДЕНИЕ БИЗНЕСОМ</div><h2 className="mt-2 mb-4">Реальный прогресс → XP</h2>{error&&<p className="form-error" role="alert">{error}</p>}<label>Завершённый этап<select value={stage} onChange={e=>setStage(e.target.value)}>{choices.map(s=><option key={s} value={s}>{STAGES[s]} · +{s==='discovery'?50:s==='prototype'?100:150} XP</option>)}</select></label><label>Что проверено и принято<textarea required minLength={15} maxLength={2000} rows={4} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Опишите проверенный результат. Можно добавить ссылку на артефакт."/></label><label className="checkbox"><input required type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>Я проверил(а) результат и подтверждаю выполнение этапа.</span></label><button className="primary w-full" disabled={busy||!confirmed}>Подтвердить и начислить XP</button></form>;
}

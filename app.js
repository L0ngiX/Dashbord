const STORAGE_KEY = 'project-control-center-v1';
const COLORS = ['#b5ef23', '#53c7b7', '#7e9cf5', '#e7a35b', '#c28de8', '#ef7c88', '#6bc28a', '#d3c75f'];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const safe = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU', {day:'numeric', month:'short'}) : '—';
const stamp = value => new Date(value).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});

const seedData = () => {
  const teams = [
    {id:'team-1', name:'Research', color:'#b5ef23', progressMode:'auto', manualProgress:0},
    {id:'team-2', name:'Design', color:'#53c7b7', progressMode:'auto', manualProgress:0},
    {id:'team-3', name:'Development', color:'#7e9cf5', progressMode:'auto', manualProgress:0},
    {id:'team-4', name:'Testing', color:'#e7a35b', progressMode:'auto', manualProgress:0}
  ];
  const members = Array.from({length:40},(_,i)=>({
    id:`m${i+1}`,
    name:`Участник ${String(i+1).padStart(2,'0')}`,
    teamId:`team-${Math.floor(i/10)+1}`,
    role:i%10===0?'Leader':'Member',
    progressMode:'auto',
    manualProgress:0
  }));
  const tasks = members.flatMap((member,i)=>{
    const group=Math.floor(i/10), within=i%10;
    const firstDone=within < (8-group);
    const secondDone=within < (4-group);
    const firstStatus=firstDone?'Done':((within+group)%2===0?'In Progress':'To Do');
    const secondStatus=secondDone?'Done':((within+group)%3===0?'In Progress':'To Do');
    const day1=20+(i%10), day2=24+(i%10);
    return [
      {id:`task-${i*2+1}`,title:`Демо-задача ${String(i+1).padStart(2,'0')}.1 · подготовка`,teamId:member.teamId,assigneeId:member.id,dueDate:`2026-11-${String(day1).padStart(2,'0')}`,status:firstStatus,weight:1},
      {id:`task-${i*2+2}`,title:`Демо-задача ${String(i+1).padStart(2,'0')}.2 · проверка`,teamId:member.teamId,assigneeId:member.id,dueDate:`2026-12-${String((i%10)+1).padStart(2,'0')}`,status:secondStatus,weight:1}
    ];
  });
  const issues = [
    {id:'issue-1',title:'Неполные исходные данные',description:'Часть материалов для анализа ещё не получена.',teamId:'team-1',priority:'High',status:'Resolved',resolution:'Согласовали единый список источников и распределили сбор материалов.'},
    {id:'issue-2',title:'Несогласованность макетов',description:'У разных экранов отличались отступы и типографика.',teamId:'team-2',priority:'Medium',status:'In Progress',resolution:'Подготовлена общая дизайн-система, осталось проверить мобильные версии.'},
    {id:'issue-3',title:'Задержка интеграции',description:'Команде разработки не хватало согласованного формата данных.',teamId:'team-3',priority:'High',status:'Open',resolution:''}
  ];
  const activity = [
    {id:uid(),action:'Завершена задача',target:'Демо-задача 01.1 · подготовка',createdAt:new Date(Date.now()-1000*60*35).toISOString()},
    {id:uid(),action:'Обновлена проблема',target:'Несогласованность макетов',createdAt:new Date(Date.now()-1000*60*60*3).toISOString()},
    {id:uid(),action:'Изменён статус задачи',target:'Демо-задача 21.1 · подготовка',createdAt:new Date(Date.now()-1000*60*60*20).toISOString()}
  ];
  return {project:{id:1,title:'Project Alpha',subtitle:'Единая панель прогресса, команд и результатов',progressMode:'auto',manualProgress:45},teams,members,tasks,issues,activity};
};

let state = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedData(); }
  catch { return seedData(); }
})();
let supabase = null;
let remoteMode = false;
let currentUser = null;
let profile = null;
let activePage = 'overview';
let editingContext = null;

const config = window.APP_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

function saveLocal() {
  if (!remoteMode) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $('#last-saved').textContent = remoteMode ? 'Синхронизация с общей базой' : 'Сохранено в этом браузере';
}
function canManage(teamId=null) {
  if (!remoteMode) return true;
  if (!currentUser) return false;
  if (profile?.role === 'admin') return true;
  if (profile?.role === 'leader') return teamId ? profile.team_id === teamId : true;
  return false;
}
function canAdmin() { return !remoteMode || profile?.role === 'admin'; }
function teamName(id) { return state.teams.find(t=>t.id===id)?.name || 'Без группы'; }
function memberName(id) { return state.members.find(m=>m.id===id)?.name || 'Не назначен'; }
function completedCount(list) { return list.filter(t=>t.status==='Done').reduce((sum,t)=>sum+Number(t.weight||1),0); }
function totalWeight(list) { return list.reduce((sum,t)=>sum+Number(t.weight||1),0); }
function effectiveTaskProgress(task) {
  const team=state.teams.find(t=>t.id===task.teamId);
  if(team?.progressMode==='manual') return Math.max(0,Math.min(100,Number(team.manualProgress||0)));
  const member=state.members.find(m=>m.id===task.assigneeId);
  if(member?.progressMode==='manual') return Math.max(0,Math.min(100,Number(member.manualProgress||0)));
  return task.status==='Done'?100:0;
}
function weightedProgress(list) {
  const total=totalWeight(list);
  const value=list.reduce((sum,t)=>sum+Number(t.weight||1)*effectiveTaskProgress(t),0);
  return total?Math.round(value/total):0;
}
function groupStats(team) {
  const tasks = state.tasks.filter(t=>t.teamId===team.id);
  const done = completedCount(tasks);
  const total = totalWeight(tasks);
  const autoPercent=weightedProgress(tasks);
  return {tasks,done,total,percent:team.progressMode==='manual' ? Number(team.manualProgress||0) : autoPercent,autoPercent};
}
function overallStats() {
  const done = completedCount(state.tasks), total = totalWeight(state.tasks);
  const auto = weightedProgress(state.tasks);
  return {done,total,percent:state.project.progressMode==='manual' ? Number(state.project.manualProgress||0) : auto,auto};
}
function logActivity(action,target) {
  const entry = {id:uid(),action,target,createdAt:new Date().toISOString()};
  state.activity.unshift(entry); state.activity = state.activity.slice(0,30);
  return entry;
}
function toast(message, error=false) {
  const el=$('#toast'); el.textContent=message; el.classList.toggle('error',error); el.classList.add('show');
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),3000);
}

async function remoteLoad() {
  const [settings,teams,members,tasks,issues,activity,prof] = await Promise.all([
    supabase.from('project_settings').select('*').eq('id',1).maybeSingle(),
    supabase.from('teams').select('*').order('sort_order'),
    supabase.from('members').select('*').order('name'),
    supabase.from('tasks').select('*').order('created_at',{ascending:false}),
    supabase.from('issues').select('*').order('updated_at',{ascending:false}),
    supabase.from('activity_log').select('*').order('created_at',{ascending:false}).limit(20),
    currentUser ? supabase.from('profiles').select('*').eq('user_id',currentUser.id).maybeSingle() : Promise.resolve({data:null,error:null})
  ]);
  for (const r of [settings,teams,members,tasks,issues,activity,prof]) if (r.error) throw r.error;
  if (settings.data) state.project = {id:1,title:settings.data.title,subtitle:settings.data.subtitle,progressMode:settings.data.progress_mode||'auto',manualProgress:settings.data.manual_progress??0};
  state.teams=(teams.data||[]).map(t=>({id:t.id,name:t.name,color:t.color||COLORS[0],progressMode:t.progress_mode||'auto',manualProgress:t.manual_progress??0}));
  state.members=(members.data||[]).map(m=>({id:m.id,name:m.name,teamId:m.team_id,role:m.role,progressMode:m.progress_mode||'auto',manualProgress:m.manual_progress??0}));
  state.tasks=(tasks.data||[]).map(t=>({id:t.id,title:t.title,teamId:t.team_id,assigneeId:t.assignee_id,dueDate:t.due_date,status:t.status,weight:t.weight||1}));
  state.issues=(issues.data||[]).map(i=>({id:i.id,title:i.title,description:i.description,teamId:i.team_id,priority:i.priority,status:i.status,resolution:i.resolution||''}));
  state.activity=(activity.data||[]).map(a=>({id:a.id,action:a.action,target:a.target,createdAt:a.created_at}));
  profile=prof.data;
}
function subscribeRemoteChanges() {
  if (!supabase || !remoteMode) return;
  const tables=['project_settings','teams','members','tasks','issues','activity_log'];
  let channel=supabase.channel('project-control-center-live');
  for (const table of tables) {
    channel=channel.on('postgres_changes',{event:'*',schema:'public',table},async()=>{
      try { await remoteLoad(); render(); }
      catch(err) { console.warn('Live refresh failed',err); }
    });
  }
  channel.subscribe();
}

function dbRow(kind, item) {
  const map={
    project:{id:1,title:item.title,subtitle:item.subtitle,progress_mode:item.progressMode,manual_progress:Number(item.manualProgress||0)},
    team:{id:item.id,name:item.name,color:item.color,sort_order:state.teams.findIndex(t=>t.id===item.id),progress_mode:item.progressMode||'auto',manual_progress:Number(item.manualProgress||0)},
    member:{id:item.id,name:item.name,team_id:item.teamId,role:item.role,progress_mode:item.progressMode||'auto',manual_progress:Number(item.manualProgress||0)},
    task:{id:item.id,title:item.title,team_id:item.teamId,assignee_id:item.assigneeId||null,due_date:item.dueDate||null,status:item.status,weight:Number(item.weight||1)},
    issue:{id:item.id,title:item.title,description:item.description,team_id:item.teamId,priority:item.priority,status:item.status,resolution:item.resolution||'',updated_at:new Date().toISOString()}
  };
  return map[kind];
}
const tableFor={team:'teams',member:'members',task:'tasks',issue:'issues',project:'project_settings'};
async function remoteSave(kind,item) {
  if (!remoteMode) return;
  if (!currentUser || !canManage()) throw new Error('Недостаточно прав для изменения данных.');
  const {error}=await supabase.from(tableFor[kind]).upsert(dbRow(kind,item));
  if (error) throw error;
}
async function remoteDelete(kind,id) {
  if (!remoteMode) return;
  if (!currentUser || !canManage()) throw new Error('Недостаточно прав для удаления данных.');
  const {error}=await supabase.from(tableFor[kind]).delete().eq('id',id);
  if (error) throw error;
}
async function remoteActivity(entry) {
  if (!remoteMode) return;
  const {error}=await supabase.from('activity_log').insert({action:entry.action,target:entry.target,actor_name:profile?.display_name||currentUser?.email||'Участник'});
  if (error) console.warn('Activity write failed',error);
}
async function persistChange(kind,item,action,target) {
  try {
    await remoteSave(kind,item);
    const entry=logActivity(action,target);
    await remoteActivity(entry);
    saveLocal(); render(); toast('Изменения сохранены');
  } catch(err) { toast(err.message||'Не удалось сохранить изменения',true); }
}
async function removeEntity(kind,id,label) {
  if (!confirm(`Удалить «${label}»? Это действие нельзя отменить.`)) return;
  try {
    await remoteDelete(kind,id);
    const list={team:'teams',member:'members',task:'tasks',issue:'issues'}[kind];
    state[list]=state[list].filter(x=>x.id!==id);
    if(kind==='team'){state.members.forEach(m=>{if(m.teamId===id)m.teamId=null;});state.tasks.forEach(t=>{if(t.teamId===id)t.teamId=null;});state.issues.forEach(i=>{if(i.teamId===id)i.teamId=null;});}
    if(kind==='member')state.tasks.forEach(t=>{if(t.assigneeId===id)t.assigneeId=null;});
    const entry=logActivity('Удалена запись',label); await remoteActivity(entry);
    saveLocal(); render(); toast('Запись удалена');
  } catch(err) { toast(err.message||'Не удалось удалить запись',true); }
}

function render() {
  $('#project-title').textContent=state.project.title;
  $('#project-subtitle').textContent=state.project.subtitle;
  const stats=overallStats();
  $('#overall-percent').textContent=`${stats.percent}%`;
  $('#overall-bar').style.width=`${Math.max(0,Math.min(100,stats.percent))}%`;
  $('#overall-completed').textContent=`${stats.done} выполнено`;
  $('#overall-remaining').textContent=`${Math.max(0,stats.total-stats.done)} осталось`;
  $('#progress-caption').textContent=state.project.progressMode==='manual'?'ручное значение администратора':'по выполненным задачам';
  renderTaskKpi(); renderTeams(); renderMembers(); renderTasks(); renderActivity(); renderIssues(); renderAccess();
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${activePage}`));
  $$('.nav-item,.tab').forEach(b=>b.classList.toggle('active',b.dataset.page===activePage));
}
function renderTaskKpi() {
  const done=state.tasks.filter(t=>t.status==='Done').length;
  const inProgress=state.tasks.filter(t=>t.status==='In Progress').length;
  const todo=state.tasks.filter(t=>t.status==='To Do').length;
  const total=state.tasks.length;
  const d=total?done/total*100:0, p=total?inProgress/total*100:0;
  $('#task-donut').style.background=`conic-gradient(#b5ef23 0 ${d}%, #53c7b7 ${d}% ${d+p}%, #29332b ${d+p}% 100%)`;
  $('#task-total').textContent=total;
  $('#done-count').textContent=done; $('#progress-count').textContent=inProgress; $('#todo-count').textContent=todo;
  $('#task-legend').innerHTML=`<div><i style="background:#b5ef23"></i><span>Выполнено</span><b>${done}</b></div><div><i style="background:#53c7b7"></i><span>В процессе</span><b>${inProgress}</b></div><div><i style="background:#29332b"></i><span>Не начато</span><b>${todo}</b></div>`;
}
function renderTeams() {
  $('#team-circles').innerHTML=state.teams.map(team=>{
    const s=groupStats(team), people=state.members.filter(m=>m.teamId===team.id);
    // Each member owns a ring sector proportional to their assigned task weight.
    // The colored part of that sector is their completed share; the muted part is remaining work.
    const contributions=people.map((m,i)=>{
      const assigned=s.tasks.filter(t=>t.assigneeId===m.id);
      const total=totalWeight(assigned);
      const done=completedCount(assigned);
      const ratio=m.progressMode==='manual'?Math.max(0,Math.min(1,Number(m.manualProgress||0)/100)):(total?Math.max(0,Math.min(1,done/total)):0);
      return {member:m,total,done,ratio,color:COLORS[i%COLORS.length]};
    });
    const ringWeights=contributions.map(c=>c.total||1);
    const weightSum=ringWeights.reduce((a,b)=>a+b,0)||1;
    let cursor=0;
    const slices=contributions.map((c,i)=>{
      const start=cursor;
      const end=cursor+ringWeights[i]/weightSum*100;
      const filledEnd=start+(end-start)*c.ratio;
      cursor=end;
      return `${c.color} ${start}% ${filledEnd}%, #293329 ${filledEnd}% ${end}%`;
    }).join(', ') || '#293329 0 100%';
    const legend=contributions.length?contributions.map(c=>`<span class="contribution-chip" title="${safe(c.member.name)}: ${Math.round(c.ratio*100)}% · ${c.done} из ${c.total} веса задач"><i style="background:${c.color}"></i>${safe(c.member.name.split(' ')[0])} <b>${Math.round(c.ratio*100)}%</b></span>`).join(''):'<span class="muted tiny">Участников пока нет</span>';
    return `<article class="team-card" style="--team-color:${team.color}"><button class="team-card-main" data-team-details="${safe(team.id)}" title="Показать вклад участников"><div class="team-ring" style="background:conic-gradient(${slices})"><div class="team-ring-hole"><strong>${s.percent}%</strong><span>${s.done}/${s.total}</span></div></div><b class="team-name">${safe(team.name)}</b><span class="team-meta">${people.length} участников · ${s.tasks.length} задач</span><div class="contribution-list">${legend}</div></button><div class="team-card-actions"><button class="small-action" data-edit="team" data-id="${safe(team.id)}" title="Изменить группу">✎</button><button class="small-action danger" data-delete="team" data-id="${safe(team.id)}" title="Удалить группу">×</button></div></article>`;
  }).join('') || '<div class="empty-state">Добавьте первую подгруппу, чтобы увидеть статистику.</div>';
}
function renderMembers() {
  $('#member-count').textContent=`${state.members.length} участников`;
  $('#members-table').innerHTML=state.members.map(m=>`<tr><td><div class="person-cell"><span class="avatar">${safe(m.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('').toUpperCase())}</span><b>${safe(m.name)}</b></div></td><td>${safe(teamName(m.teamId))}</td><td><span class="role-pill ${m.role==='Leader'?'leader':''}">${m.role==='Leader'?'Руководитель':'Участник'}</span></td><td><div class="row-actions ${canManage(m.teamId)?'':'hidden'}"><button class="small-action" data-edit="member" data-id="${safe(m.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="member" data-id="${safe(m.id)}" title="Удалить">×</button></div></td></tr>`).join('') || '<tr><td colspan="4" class="empty-cell">Пока нет участников. Добавьте первого.</td></tr>';
}
const statusLabel={Done:'Выполнено','In Progress':'В процессе','To Do':'Не начато'};
function renderTasks() {
  $('#tasks-table').innerHTML=state.tasks.map(t=>`<tr><td><b>${safe(t.title)}</b></td><td>${safe(teamName(t.teamId))}</td><td>${safe(memberName(t.assigneeId))}</td><td>${dateLabel(t.dueDate)}</td><td><span class="task-status ${t.status==='Done'?'done':t.status==='In Progress'?'progress':'todo'}">${statusLabel[t.status]||safe(t.status)}</span></td><td><div class="row-actions ${canManage(t.teamId)?'':'hidden'}"><button class="small-action" data-edit="task" data-id="${safe(t.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="task" data-id="${safe(t.id)}" title="Удалить">×</button></div></td></tr>`).join('') || '<tr><td colspan="6" class="empty-cell">Задачи ещё не добавлены.</td></tr>';
}
function renderActivity() {
  $('#activity-list').innerHTML=state.activity.slice(0,8).map(a=>`<div class="activity-item"><span class="activity-mark"></span><div><b>${safe(a.action)}</b><p>${safe(a.target)}</p><time>${stamp(a.createdAt)}</time></div></div>`).join('') || '<div class="empty-state">Активность пока не зафиксирована.</div>';
}
function issueCard(i) {
  return `<article class="issue-card"><div class="issue-top"><span class="priority ${i.priority.toLowerCase()}">${i.priority==='High'?'Высокий':i.priority==='Medium'?'Средний':'Низкий'} приоритет</span><div class="row-actions ${canManage(i.teamId)?'':'hidden'}"><button class="small-action" data-edit="issue" data-id="${safe(i.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="issue" data-id="${safe(i.id)}" title="Удалить">×</button></div></div><h4>${safe(i.title)}</h4><p>${safe(i.description||'Описание не добавлено.')}</p><div class="issue-meta"><span>${safe(teamName(i.teamId))}</span><span>${i.status==='Resolved'?'Решено':i.status==='In Progress'?'В работе':'Открыто'}</span></div>${i.resolution?`<div class="resolution"><b>Решение</b><p>${safe(i.resolution)}</p></div>`:''}</article>`;
}
function renderIssues() {
  const open=state.issues.filter(i=>i.status!=='Resolved'), solved=state.issues.filter(i=>i.status==='Resolved');
  $('#open-issue-count').textContent=open.length; $('#solved-issue-count').textContent=solved.length;
  $('#open-issues').innerHTML=open.map(issueCard).join('')||'<div class="empty-state">Открытых проблем нет.</div>';
  $('#solved-issues').innerHTML=solved.map(issueCard).join('')||'<div class="empty-state">Решения появятся здесь после закрытия проблем.</div>';
  $('#issue-summary').innerHTML=`<div class="summary-tile"><span>Всего проблем</span><b>${state.issues.length}</b></div><div class="summary-tile"><span>Открыто / в работе</span><b>${open.length}</b></div><div class="summary-tile"><span>Решено</span><b>${solved.length}</b></div>`;
}
function renderAccess() {
  const badge=$('#mode-pill'), stateEl=$('#access-state');
  if(remoteMode){
    badge.textContent='LIVE DATABASE'; badge.className='mode-pill live';
    stateEl.innerHTML=currentUser?`<span class="status-dot"></span> ${safe(profile?.display_name||currentUser.email)} · ${safe(profile?.role||'viewer')}`:'<span class="status-dot public"></span> Публичный просмотр · без входа';
    $('#login-btn').classList.toggle('hidden',!!currentUser); $('#logout-btn').classList.toggle('hidden',!currentUser);
  } else {
    badge.textContent='DEMO'; badge.className='mode-pill';
    stateEl.innerHTML='<span class="status-dot"></span> Демо-режим · только это устройство';
    $('#login-btn').classList.remove('hidden'); $('#logout-btn').classList.add('hidden');
  }
  const editable=canManage(), admin=canAdmin();
  ['#edit-project-btn','#edit-progress-btn','#add-team-btn'].forEach(sel=>$(sel).classList.toggle('hidden',!admin));
  ['#add-member-btn','#add-task-btn','#add-issue-btn'].forEach(sel=>$(sel).classList.toggle('hidden',!editable));
  $$('#members-table [data-edit], #members-table [data-delete]').forEach(btn=>{const m=state.members.find(x=>x.id===btn.dataset.id);btn.classList.toggle('hidden',!canManage(m?.teamId));});
  $$('#tasks-table [data-edit], #tasks-table [data-delete]').forEach(btn=>{const t=state.tasks.find(x=>x.id===btn.dataset.id);btn.classList.toggle('hidden',!canManage(t?.teamId));});
  $$('#open-issues [data-edit], #open-issues [data-delete], #solved-issues [data-edit], #solved-issues [data-delete]').forEach(btn=>{const i=state.issues.find(x=>x.id===btn.dataset.id);btn.classList.toggle('hidden',!canManage(i?.teamId));});
  $$('.team-card-actions').forEach(el=>el.classList.toggle('hidden',!admin));
}

const field=(name,label,type='text',value='',options=[])=>({name,label,type,value,options});
function openEditor(kind,record=null) {
  if(remoteMode && (['project','team'].includes(kind)?!canAdmin():!canManage(record?.teamId||null))){toast('Для редактирования нужны соответствующие права доступа.',true);return;}
  editingContext={kind,id:record?.id||null};
  const teamOptions=state.teams.filter(t=>canManage(t.id)).map(t=>({value:t.id,label:t.name}));
  const memberOptions=state.members.filter(m=>canManage(m.teamId)).map(m=>({value:m.id,label:`${m.name} · ${teamName(m.teamId)}`}));
  let fields=[];
  if(kind==='project') fields=[field('title','Название проекта','text',record?.title??state.project.title),field('subtitle','Описание','text',record?.subtitle??state.project.subtitle),field('progressMode','Способ расчёта прогресса','select',record?.progressMode??state.project.progressMode,[{value:'auto',label:'Автоматически по выполненным задачам'},{value:'manual',label:'Вручную'}]),field('manualProgress','Процент прогресса (0–100)','number',record?.manualProgress??state.project.manualProgress)];
  if(kind==='team') fields=[field('name','Название группы','text',record?.name||''),field('color','Цвет группы','color',record?.color||COLORS[state.teams.length%COLORS.length]),field('progressMode','Способ расчёта прогресса','select',record?.progressMode||'auto',[{value:'auto',label:'Автоматически по задачам'},{value:'manual',label:'Вручную'}]),field('manualProgress','Процент прогресса (0–100)','number',record?.manualProgress??0)];
  if(kind==='member') fields=[field('name','Имя участника','text',record?.name||''),field('teamId','Подгруппа','select',record?.teamId||teamOptions[0]?.value,teamOptions),field('role','Роль','select',record?.role||'Member',[{value:'Member',label:'Участник'},{value:'Leader',label:'Руководитель группы'}]),field('progressMode','Способ расчёта личного прогресса','select',record?.progressMode||'auto',[{value:'auto',label:'Автоматически по задачам'},{value:'manual',label:'Вручную'}]),field('manualProgress','Личный прогресс (0–100%)','number',record?.manualProgress??0)];
  if(kind==='task') fields=[field('title','Название задачи','text',record?.title||''),field('teamId','Подгруппа','select',record?.teamId||state.teams[0]?.id,teamOptions),field('assigneeId','Ответственный','select',record?.assigneeId||'', [{value:'',label:'Не назначен'},...memberOptions]),field('dueDate','Дедлайн','date',record?.dueDate||''),field('status','Статус','select',record?.status||'To Do',[{value:'To Do',label:'Не начато'},{value:'In Progress',label:'В процессе'},{value:'Done',label:'Выполнено'}]),field('weight','Вес задачи','number',record?.weight??1)];
  if(kind==='issue') fields=[field('title','Название проблемы','text',record?.title||''),field('teamId','Подгруппа','select',record?.teamId||state.teams[0]?.id,teamOptions),field('priority','Приоритет','select',record?.priority||'Medium',[{value:'Low',label:'Низкий'},{value:'Medium',label:'Средний'},{value:'High',label:'Высокий'}]),field('status','Статус','select',record?.status||'Open',[{value:'Open',label:'Открыто'},{value:'In Progress',label:'В работе'},{value:'Resolved',label:'Решено'}]),field('description','Описание','textarea',record?.description||''),field('resolution','Решение / результат оптимизации','textarea',record?.resolution||'')];
  $('#dialog-title').textContent=({project:'Настройки проекта',team:record?'Изменить группу':'Добавить группу',member:record?'Изменить участника':'Добавить участника',task:record?'Изменить задачу':'Новая задача',issue:record?'Изменить проблему':'Добавить проблему'})[kind];
  $('#dialog-eyebrow').textContent=kind.toUpperCase();
  $('#dialog-fields').innerHTML=fields.map(f=>{
    if(f.type==='select') return `<label class="form-field"><span>${safe(f.label)}</span><select name="${f.name}">${f.options.map(o=>`<option value="${safe(o.value)}" ${String(o.value)===String(f.value)?'selected':''}>${safe(o.label)}</option>`).join('')}</select></label>`;
    if(f.type==='textarea') return `<label class="form-field"><span>${safe(f.label)}</span><textarea name="${f.name}" rows="3">${safe(f.value)}</textarea></label>`;
    const numberAttrs=f.type==='number'?(f.name==='weight'?'min="0.1" max="100" step="0.1"':'min="0" max="100" step="1"'):'';
    return `<label class="form-field"><span>${safe(f.label)}</span><input name="${f.name}" type="${f.type}" value="${safe(f.value)}" ${numberAttrs} required /></label>`;
  }).join('');
  $('#editor-dialog').showModal();
}
function openLogin() {
  editingContext={kind:'login',id:null};
  $('#dialog-title').textContent='Вход для участника'; $('#dialog-eyebrow').textContent='SUPABASE AUTH';
  $('#dialog-fields').innerHTML='<label class="form-field"><span>Email</span><input name="email" type="email" autocomplete="username" required /></label><label class="form-field"><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required /></label><p class="form-help">Учётные записи создаёт администратор проекта. Публичная регистрация отключена.</p>';
  $('#editor-dialog').showModal();
}

$('#editor-form').addEventListener('submit',async e=>{
  e.preventDefault(); if(!editingContext)return;
  const kind=editingContext.kind; const values=Object.fromEntries(new FormData(e.currentTarget).entries());
  if(kind==='login'){
    try {const {error}=await supabase.auth.signInWithPassword({email:values.email,password:values.password});if(error)throw error;$('#editor-dialog').close();toast('Вы вошли в систему');}
    catch(err){toast(err.message||'Ошибка входа',true);} return;
  }
  let item, list, action;
  if(kind==='project'){
    item={...state.project,title:values.title.trim(),subtitle:values.subtitle.trim(),progressMode:values.progressMode,manualProgress:Math.max(0,Math.min(100,Number(values.manualProgress)||0))};state.project=item;action='Обновлены настройки проекта';list='project';
  } else if(kind==='team'){
    item={id:editingContext.id||uid(),name:values.name.trim(),color:values.color,progressMode:values.progressMode,manualProgress:Math.max(0,Math.min(100,Number(values.manualProgress)||0))};list='teams';action='Обновлена группа';
  } else if(kind==='member'){
    item={id:editingContext.id||uid(),name:values.name.trim(),teamId:values.teamId,role:values.role,progressMode:values.progressMode,manualProgress:Math.max(0,Math.min(100,Number(values.manualProgress)||0))};list='members';action='Обновлён состав команды';
  } else if(kind==='task'){
    item={id:editingContext.id||uid(),title:values.title.trim(),teamId:values.teamId,assigneeId:values.assigneeId||null,dueDate:values.dueDate,status:values.status,weight:Math.max(0.1,Number(values.weight)||1)};list='tasks';action='Обновлена задача';
  } else if(kind==='issue'){
    item={id:editingContext.id||uid(),title:values.title.trim(),teamId:values.teamId,priority:values.priority,status:values.status,description:values.description.trim(),resolution:values.resolution.trim()};list='issues';action='Обновлена проблема / решение';
  }
  if(kind!=='project'){
    const idx=state[list].findIndex(x=>x.id===item.id); if(idx>=0)state[list][idx]=item;else state[list].push(item);
  }
  $('#editor-dialog').close(); await persistChange(kind,item,action,item.title||item.name||'Параметры проекта');
});

$('#dialog-close').addEventListener('click',()=>$('#editor-dialog').close());
$('#dialog-cancel').addEventListener('click',()=>$('#editor-dialog').close());
$('#edit-project-btn').addEventListener('click',()=>openEditor('project'));
$('#edit-progress-btn').addEventListener('click',()=>openEditor('project'));
$('#add-team-btn').addEventListener('click',()=>openEditor('team'));
$('#add-member-btn').addEventListener('click',()=>openEditor('member'));
$('#add-task-btn').addEventListener('click',()=>openEditor('task'));
$('#add-issue-btn').addEventListener('click',()=>openEditor('issue'));
$('#login-btn').addEventListener('click',()=>configured&&supabase?openLogin():toast('Сначала подключите проект Supabase в config.js и выполните SQL из папки supabase.',true));
$('#logout-btn').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut();});

$$('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{activePage=btn.dataset.page;render();}));
document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-edit]');
  if(edit){const kind=edit.dataset.edit;const list={team:'teams',member:'members',task:'tasks',issue:'issues'}[kind];openEditor(kind,state[list].find(x=>x.id===edit.dataset.id));return;}
  const del=e.target.closest('[data-delete]');
  if(del){const kind=del.dataset.delete;const list={team:'teams',member:'members',task:'tasks',issue:'issues'}[kind];const item=state[list].find(x=>x.id===del.dataset.id);if(item)removeEntity(kind,item.id,item.name||item.title);return;}
  const team=e.target.closest('[data-team-details]');
  if(team){const t=state.teams.find(x=>x.id===team.dataset.teamDetails);const members=state.members.filter(m=>m.teamId===t.id);const tasks=state.tasks.filter(x=>x.teamId===t.id);const lines=members.map(m=>`${m.name}: ${tasks.filter(x=>x.assigneeId===m.id&&x.status==='Done').length} выполнено`).join('\n');toast(`${t.name}\n${lines||'В группе пока нет участников.'}`);}
});

async function init() {
  if(configured){
    try{
      const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
      supabase=createClient(config.supabaseUrl,config.supabaseAnonKey);
      remoteMode=true;
      const {data:{session}}=await supabase.auth.getSession(); currentUser=session?.user||null;
      await remoteLoad();
      subscribeRemoteChanges();
      supabase.auth.onAuthStateChange(async(_event,session)=>{
        currentUser=session?.user||null;
        try{await remoteLoad();render();}catch(err){toast(err.message||'Не удалось загрузить данные',true);}
      });
    }catch(err){console.error(err);remoteMode=false;toast('Не удалось подключиться к Supabase. Проверьте config.js.',true);}
  }
  render(); saveLocal();
}

init();

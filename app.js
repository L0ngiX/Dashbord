const STORAGE_KEY = 'project-control-center-v1';
const COLORS = ['#c62f3b', '#e46a73', '#8b8c93', '#b4232d', '#77777f', '#d94a54', '#8f1d27', '#55565d'];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const safe = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateLabel = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU', {day:'numeric', month:'short'}) : '—';
const stamp = value => new Date(value).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});

const seedBuildingSystems = () => [
  ['facade','Фасад','Внешние конструкции'],['foundation','Фундамент','Несущие конструкции'],['portico','Портик и колонны','Архитектурный декор'],['roof','Кровля и водосток','Ограждающие конструкции'],['wood','Деревянные стены и обшивка','Несущие конструкции'],['electric','Электроснабжение','Инженерные системы'],['heating','Отопление','Инженерные системы'],['water','Водоснабжение и канализация','Инженерные системы'],['ventilation','Вентиляция','Инженерные системы'],['fire','Пожарная безопасность','Инженерные системы'],['basement','Подвал и гидроизоляция','Подземная часть']
].map(([id,name,category])=>({id,name,category,status:'unknown',location:'',details:'Актуальные сведения не внесены. Требуется осмотр и фиксация состояния.',lastInspected:null,inspectedBy:''}));
const seedMeasurements = () => [
  {id:'m-dim-1',label:'Габарит основного объёма по плану',value:'22,0 × 19,0',unit:'м',source:'Акт ГИКЭ от 05.04.2017, стр. 20',status:'documented',notes:'Прямоугольный основной объём; не является площадью участка.'},
  {id:'m-height-1',label:'Высота помещений парадной анфилады',value:'4,3–5,0',unit:'м',source:'Акт ГИКЭ от 05.04.2017, стр. 21',status:'documented',notes:'Зависит от пропорций помещений.'},
  {id:'m-columns',label:'Колонны главного портика',value:'6',unit:'шт.',source:'Описание предмета охраны / акт ГИКЭ',status:'documented',notes:'Шестиколонный портик с ионическими капителями.'},
  {id:'m-levels',label:'Уровни здания',value:'1 этаж + подвал + антресоль',unit:'описание',source:'Акт ГИКЭ от 05.04.2017, стр. 20',status:'documented',notes:'Подвал и антресоль устроены не под всей проекцией здания.'},
  {id:'m-area',label:'Общая площадь здания',value:'',unit:'м²',source:'Не найден подтверждённый показатель',status:'placeholder',notes:'Заполнить по актуальной экспликации помещений или техническому паспорту.'},
  {id:'m-roof',label:'Высота конька кровли',value:'',unit:'м',source:'Требуется натурный обмер / чертёж',status:'placeholder',notes:'Не подменять визуальной оценкой.'},
  {id:'m-walls',label:'Толщина наружных стен',value:'',unit:'мм',source:'Требуется обследование',status:'placeholder',notes:'Уточнить материал и конструкцию по участкам.'},
  {id:'m-openings',label:'Размеры оконных и дверных проёмов',value:'',unit:'мм',source:'Требуется обмер фасадов',status:'placeholder',notes:'Заполнить отдельными ведомостями по фасадам.'},
  {id:'m-rooms',label:'Размеры помещений / экспликация',value:'',unit:'—',source:'Требуется поэтажный обмерный план',status:'placeholder',notes:'В открытых источниках не найден полный актуальный обмерный комплект.'}
];
const seedData = () => {
  const teams = [
    {id:'team-1', name:'Research', color:'#c62f3b', progressMode:'auto', manualProgress:0},
    {id:'team-2', name:'Design', color:'#e46a73', progressMode:'auto', manualProgress:0},
    {id:'team-3', name:'Development', color:'#8b8c93', progressMode:'auto', manualProgress:0},
    {id:'team-4', name:'Testing', color:'#b4232d', progressMode:'auto', manualProgress:0}
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
      {id:`task-${i*2+1}`,title:`Демо-задача ${String(i+1).padStart(2,'0')}.1 · подготовка`,teamId:null,assigneeIds:[member.id],allocationMode:'split',createdBy:null,dueDate:`2026-11-${String(day1).padStart(2,'0')}`,status:firstStatus,weight:1},
      {id:`task-${i*2+2}`,title:`Демо-задача ${String(i+1).padStart(2,'0')}.2 · проверка`,teamId:null,assigneeIds:[member.id],allocationMode:'split',createdBy:null,dueDate:`2026-12-${String((i%10)+1).padStart(2,'0')}`,status:secondStatus,weight:1}
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
  return {project:{id:1,title:'Дом-музей И. С. Тургенева',subtitle:'Цифровой паспорт исторического здания',progressMode:'auto',manualProgress:0},teams,members,tasks,issues,activity,buildingSystems:seedBuildingSystems(),buildingIssues:[],buildingMeasurements:seedMeasurements(),buildingDocuments:[]};
};

let state = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedData(); }
  catch { return seedData(); }
})();
state.buildingSystems = state.buildingSystems || seedBuildingSystems();
state.buildingIssues = state.buildingIssues || [];
state.buildingMeasurements = state.buildingMeasurements || seedMeasurements();
state.buildingDocuments = state.buildingDocuments || [];
state.tasks = (state.tasks || []).map(task => ({
  ...task,
  assigneeIds: [...new Set(Array.isArray(task.assigneeIds) ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []))],
  allocationMode: task.allocationMode === 'full' ? 'full' : 'split',
  createdBy: task.createdBy || null
}));
let supabase = null;
let remoteMode = false;
let currentUser = null;
let profile = null;
let activePage = 'public';
let editingContext = null;
let memberTeamFilter = 'all';
let memberRoleFilter = 'all';

const config = window.APP_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

function saveLocal() {
  if (!remoteMode) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $('#last-saved').textContent = remoteMode ? 'Синхронизация с общей базой' : 'Сохранено в этом браузере';
}
const ROLE_LABELS = { visitor:'Посетитель', owner:'Собственник', maintenance:'Эксплуатация и ремонт', design:'Design Studio · Архитектура и дизайн', admin:'Администратор', leader:'Руководитель', member:'Участник', viewer:'Просмотр' };
const LOGIN_EMAILS = {
  visitor: 'visitor@pcc-login.example.com',
  owner: 'owner@pcc-login.example.com',
  maintenance: 'maintenance@pcc-login.example.com',
  design: 'design@pcc-login.example.com'
};
function currentRole() { return profile?.role || 'visitor'; }
function canManage(teamId=null) {
  if (!remoteMode) return true;
  if (!currentUser) return false;
  const role=currentRole();
  if (['admin','owner','maintenance','design'].includes(role)) return true;
  if (role === 'leader') return teamId ? profile.team_id === teamId : true;
  return false;
}
function canAdmin() { return !remoteMode || ['admin','owner'].includes(currentRole()); }
function canManageMembers(teamId=null) { return !remoteMode || ['admin','owner'].includes(currentRole()) || (currentRole()==='leader' && (!teamId || profile.team_id===teamId)); }
function canManageBuilding() { return !remoteMode || ['admin','owner','maintenance'].includes(currentRole()); }
function canManageDesign() { return !remoteMode || ['admin','owner','design'].includes(currentRole()); }
function roleView() { return remoteMode ? currentRole() : 'demo'; }
function pageAllowed(page, role=roleView()) {
  if (role==='demo') return true;
  if (page==='public') return true;
  if (page==='design') return ['owner','admin','design'].includes(role);
  if (page==='maintenance') return ['owner','admin','maintenance'].includes(role);
  if (['overview','problems'].includes(page)) return ['owner','admin'].includes(role);
  return false;
}
function applyRoleView() {
  const role=roleView();
  document.body.dataset.role=role;
  const pill=$('#role-pill');
  if(pill){ const label=ROLE_LABELS[role] || (role==='demo'?'Демо-режим':'Пользователь'); pill.textContent=label; pill.classList.toggle('hidden',role==='demo'); }
  $$('[data-page]').forEach(button=>button.classList.toggle('role-hidden',!pageAllowed(button.dataset.page,role)));
  $$('[data-roles]').forEach(button=>button.classList.toggle('role-hidden',!button.dataset.roles.split(',').includes(role) && !(role==='demo')));
  if(!pageAllowed(activePage,role)) activePage='public';
  const descriptions={owner:'Все разделы доступны · режим собственника',maintenance:'Техническое состояние, обслуживание и дефекты здания',design:'Архитектура, обмеры, чертежи и фотоматериалы',visitor:'Публичная историческая страница объекта',demo:'Демонстрационный режим · доступны все разделы'};
  const sub=$('#project-subtitle'); if(sub) sub.textContent=descriptions[role] || 'Цифровой паспорт исторического здания';
}
function teamName(id) { return state.teams.find(t=>t.id===id)?.name || 'Без группы'; }
function memberName(id) { return state.members.find(m=>m.id===id)?.name || 'Не назначен'; }
function taskAssigneeIds(task) {
  return [...new Set(Array.isArray(task.assigneeIds) ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []))].sort();
}
function roundPoints(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function formatPoints(value) {
  return new Intl.NumberFormat('ru-RU', {maximumFractionDigits:2}).format(roundPoints(value || 0));
}
function taskAllocations(task) {
  const ids = taskAssigneeIds(task);
  if (!ids.length) return [];
  const weightCents = Math.max(0, Math.round(Number(task.weight || 0) * 100));
  const full = task.allocationMode === 'full';
  if (full) return ids.map(memberId => ({memberId, points:weightCents / 100}));
  const base = Math.floor(weightCents / ids.length);
  const remainder = weightCents % ids.length;
  return ids.map((memberId,index) => ({memberId, points:(base + (index < remainder ? 1 : 0)) / 100}));
}
function taskAllocatedPoints(task) {
  return taskAllocations(task).reduce((sum,item)=>sum+item.points,0);
}
function taskEarnedPoints(task) {
  return task.status === 'Done' ? taskAllocatedPoints(task) : 0;
}
function memberPointStats(memberId) {
  let assigned=0, earned=0, taskCount=0, completedTasks=0;
  for (const task of state.tasks) {
    const allocation=taskAllocations(task).find(x=>x.memberId===memberId);
    if (!allocation) continue;
    assigned += allocation.points; taskCount++;
    if (task.status==='Done') { earned += allocation.points; completedTasks++; }
  }
  return {assignedPoints:roundPoints(assigned),earnedPoints:roundPoints(earned),taskCount,completedTasks};
}
function groupStats(team) {
  const memberIds = new Set(state.members.filter(m=>m.teamId===team.id).map(m=>m.id));
  const tasks = state.tasks.filter(task=>taskAllocations(task).some(a=>memberIds.has(a.memberId)));
  let assigned=0, earned=0;
  for (const task of tasks) {
    for (const allocation of taskAllocations(task)) {
      if (!memberIds.has(allocation.memberId)) continue;
      assigned += allocation.points;
      if (task.status==='Done') earned += allocation.points;
    }
  }
  const autoPercent=assigned?Math.round(earned/assigned*100):0;
  return {tasks,done:roundPoints(earned),total:roundPoints(assigned),earnedPoints:roundPoints(earned),assignedPoints:roundPoints(assigned),percent:team.progressMode==='manual' ? Number(team.manualProgress||0) : autoPercent,autoPercent};
}
function overallStats() {
  const assigned=state.tasks.reduce((sum,t)=>sum+taskAllocatedPoints(t),0);
  const earned=state.tasks.reduce((sum,t)=>sum+taskEarnedPoints(t),0);
  const auto=assigned?Math.round(earned/assigned*100):0;
  return {done:roundPoints(earned),total:roundPoints(assigned),earnedPoints:roundPoints(earned),assignedPoints:roundPoints(assigned),percent:state.project.progressMode==='manual' ? Number(state.project.manualProgress||0) : auto,auto,completedTasks:state.tasks.filter(t=>t.status==='Done').length};
}
function taskCanManage(task) {
  if (!remoteMode) return true;
  if (!currentUser || !profile) return false;
  if (['admin','owner','maintenance','design'].includes(profile.role)) return true;
  if (profile.role!=='leader') return false;
  if (task?.createdBy && task.createdBy===currentUser.id) return true;
  if (task?.teamId && profile.team_id===task.teamId) return true; // compatibility with older task records
  return taskAssigneeIds(task || {}).some(id=>state.members.some(m=>m.id===id && m.teamId===profile.team_id));
}
function canCreateTask() {
  return !remoteMode || (!!currentUser && ['admin','owner','leader','maintenance','design'].includes(profile?.role));
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
  const prof = currentUser
    ? await supabase.from('profiles').select('*').eq('user_id',currentUser.id).maybeSingle()
    : {data:null,error:null};
  if (prof.error) throw prof.error;
  profile=prof.data;
  const role=profile?.role || 'visitor';
  const owner=['admin','owner'].includes(role);
  const maint=owner || role==='maintenance';
  const design=owner || role==='design';
  const emptyRows={data:[],error:null};
  const emptySingle={data:null,error:null};
  const [settings,teams,members,tasks,taskAssignees,issues,activity,systems,bIssues,measurements,documents] = await Promise.all([
    owner ? supabase.from('project_settings').select('*').eq('id',1).maybeSingle() : Promise.resolve(emptySingle),
    owner ? supabase.from('teams').select('*').order('sort_order') : Promise.resolve(emptyRows),
    owner ? supabase.from('members').select('*').order('name') : Promise.resolve(emptyRows),
    owner ? supabase.from('tasks').select('*').order('created_at',{ascending:false}) : Promise.resolve(emptyRows),
    owner ? supabase.from('task_assignees').select('task_id,member_id') : Promise.resolve(emptyRows),
    owner ? supabase.from('issues').select('*').order('updated_at',{ascending:false}) : Promise.resolve(emptyRows),
    owner ? supabase.from('activity_log').select('*').order('created_at',{ascending:false}).limit(20) : Promise.resolve(emptyRows),
    maint ? supabase.from('building_systems').select('*').order('sort_order') : Promise.resolve(emptyRows),
    maint ? supabase.from('building_issues').select('*').order('updated_at',{ascending:false}) : Promise.resolve(emptyRows),
    design ? supabase.from('building_measurements').select('*').order('sort_order') : Promise.resolve(emptyRows),
    design ? supabase.from('building_documents').select('*').order('created_at',{ascending:false}) : Promise.resolve(emptyRows)
  ]);
  for (const r of [settings,teams,members,tasks,taskAssignees,issues,activity,systems,bIssues,measurements,documents]) if (r.error) throw r.error;
  if (settings.data) state.project = {id:1,title:settings.data.title,subtitle:settings.data.subtitle,progressMode:settings.data.progress_mode||'auto',manualProgress:settings.data.manual_progress??0};
  state.teams=(teams.data||[]).map(t=>({id:t.id,name:t.name,color:t.color||COLORS[0],progressMode:t.progress_mode||'auto',manualProgress:t.manual_progress??0}));
  state.members=(members.data||[]).map(m=>({id:m.id,name:m.name,teamId:m.team_id,role:m.role,progressMode:m.progress_mode||'auto',manualProgress:m.manual_progress??0}));
  const taskMembers = new Map();
  for (const link of (taskAssignees.data||[])) {
    if (!taskMembers.has(link.task_id)) taskMembers.set(link.task_id, []);
    taskMembers.get(link.task_id).push(link.member_id);
  }
  state.tasks=(tasks.data||[]).map(t=>({
    id:t.id,title:t.title,teamId:t.team_id,
    assigneeIds:taskMembers.get(t.id) || (t.assignee_id ? [t.assignee_id] : []),
    allocationMode:t.allocation_mode==='full'?'full':'split',createdBy:t.created_by||null,
    dueDate:t.due_date,status:t.status,weight:Number(t.weight||1)
  }));
  state.issues=(issues.data||[]).map(i=>({id:i.id,title:i.title,description:i.description,teamId:i.team_id,priority:i.priority,status:i.status,resolution:i.resolution||''}));
  state.activity=(activity.data||[]).map(a=>({id:a.id,action:a.action,target:a.target,createdAt:a.created_at}));
  state.buildingSystems=(systems.data||[]).map(x=>({id:x.id,name:x.name,category:x.category,status:x.status,location:x.location||'',details:x.details||'',lastInspected:x.last_inspected,inspectedBy:x.inspected_by||''}));
  state.buildingIssues=(bIssues.data||[]).map(x=>({id:x.id,title:x.title,category:x.category,location:x.location||'',severity:x.severity,status:x.status,description:x.description||'',resolution:x.resolution||'',reportedAt:x.reported_at,dueDate:x.due_date}));
  state.buildingMeasurements=(measurements.data||[]).map(x=>({id:x.id,label:x.label,value:x.value||'',unit:x.unit||'',source:x.source||'',status:x.status,notes:x.notes||''}));
  state.buildingDocuments=(documents.data||[]).map(x=>({id:x.id,title:x.title,documentType:x.document_type,level:x.level||'',fileUrl:x.file_url||'',status:x.status||'reference',notes:x.notes||''}));
}

function subscribeRemoteChanges() {
  if (!supabase || !remoteMode) return;
  const tables=['project_settings','teams','members','tasks','task_assignees','issues','activity_log','building_systems','building_issues','building_measurements','building_documents'];
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
    task:{id:item.id,title:item.title,team_id:null,assignee_id:taskAssigneeIds(item)[0]||null,allocation_mode:item.allocationMode||'split',created_by:item.createdBy||currentUser?.id||null,due_date:item.dueDate||null,status:item.status,weight:Number(item.weight||1)},
    issue:{id:item.id,title:item.title,description:item.description,team_id:item.teamId,priority:item.priority,status:item.status,resolution:item.resolution||'',updated_at:new Date().toISOString()},
    buildingSystem:{id:item.id,name:item.name,category:item.category,status:item.status,location:item.location||'',details:item.details||'',last_inspected:item.lastInspected||null,inspected_by:item.inspectedBy||'',sort_order:state.buildingSystems.findIndex(x=>x.id===item.id),updated_at:new Date().toISOString()},
    buildingIssue:{id:item.id,title:item.title,category:item.category,location:item.location||'',severity:item.severity,status:item.status,description:item.description||'',resolution:item.resolution||'',reported_at:item.reportedAt||new Date().toISOString(),due_date:item.dueDate||null,updated_at:new Date().toISOString()},
    buildingMeasurement:{id:item.id,label:item.label,value:item.value||'',unit:item.unit||'',source:item.source||'',status:item.status,notes:item.notes||'',sort_order:state.buildingMeasurements.findIndex(x=>x.id===item.id),updated_at:new Date().toISOString()},
    buildingDocument:{id:item.id,title:item.title,document_type:item.documentType,level:item.level||'',file_url:item.fileUrl||'',status:item.status||'reference',notes:item.notes||'',updated_at:new Date().toISOString()}
  };
  return map[kind];
}
const tableFor={team:'teams',member:'members',task:'tasks',issue:'issues',project:'project_settings',buildingSystem:'building_systems',buildingIssue:'building_issues',buildingMeasurement:'building_measurements',buildingDocument:'building_documents'};
async function remoteSave(kind,item) {
  if (!remoteMode) return;
  if (!currentUser) throw new Error('Сначала войдите в систему.');
  if (kind==='task') {
    if (!taskCanManage(item) && !(profile?.role==='leader' && taskAssigneeIds(item).some(id=>state.members.some(m=>m.id===id&&m.teamId===profile.team_id)))) {
      throw new Error('Для изменения задачи нужен доступ администратора, её создателя или руководителя одной из задействованных групп.');
    }
    const taskRow=dbRow('task',item);
    const isExistingTask=editingContext?.kind==='task' && editingContext.id===item.id;
    const taskWrite=isExistingTask
      ? await supabase.from('tasks').update(taskRow).eq('id',item.id)
      : await supabase.from('tasks').insert(taskRow);
    if (taskWrite.error) throw taskWrite.error;
    const selected=[...new Set(taskAssigneeIds(item))];
    if (selected.length===0) throw new Error('У задачи должен быть хотя бы один исполнитель.');
    const {data:existing,error:readError}=await supabase.from('task_assignees').select('member_id').eq('task_id',item.id);
    if (readError) throw readError;
    const existingIds=(existing||[]).map(x=>x.member_id);
    const toAdd=selected.filter(id=>!existingIds.includes(id));
    const toRemove=existingIds.filter(id=>!selected.includes(id));
    if (toAdd.length) {
      const {error:addError}=await supabase.from('task_assignees').insert(toAdd.map(member_id=>({task_id:item.id,member_id})));
      if (addError) throw addError;
    }
    if (toRemove.length) {
      const {error:deleteError}=await supabase.from('task_assignees').delete().eq('task_id',item.id).in('member_id',toRemove);
      if (deleteError) throw deleteError;
    }
    return;
  }
  if (kind==='buildingSystem' || kind==='buildingIssue') { if(!canManageBuilding()) throw new Error('Раздел доступен для редактирования профилю эксплуатации и собственнику.'); }
  else if (kind==='buildingMeasurement' || kind==='buildingDocument') { if(!canManageDesign()) throw new Error('Раздел доступен для редактирования Design Studio и собственнику.'); }
  else if (!canManage()) throw new Error('Недостаточно прав для изменения данных.');
  const {error}=await supabase.from(tableFor[kind]).upsert(dbRow(kind,item));
  if (error) throw error;
}
async function remoteDelete(kind,id) {
  if (!remoteMode) return;
  if (!currentUser) throw new Error('Сначала войдите в систему.');
  if (kind==='task') {
    const task=state.tasks.find(t=>t.id===id);
    if (!task || !taskCanManage(task)) throw new Error('Недостаточно прав для удаления этой задачи.');
  } else if (['buildingSystem','buildingIssue'].includes(kind) && !canManageBuilding()) throw new Error('Недостаточно прав для изменения состояния здания.');
  else if (['buildingMeasurement','buildingDocument'].includes(kind) && !canManageDesign()) throw new Error('Недостаточно прав для изменения проектных материалов.');
  else if (!['buildingSystem','buildingIssue','buildingMeasurement','buildingDocument'].includes(kind) && !canManage()) throw new Error('Недостаточно прав для удаления данных.');
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
  } catch(err) { if(remoteMode){try{await remoteLoad();render();}catch(reloadError){console.warn('Unable to restore remote state',reloadError);}} toast(err.message||'Не удалось сохранить изменения',true); }
}
async function removeEntity(kind,id,label) {
  if (!confirm(`Удалить «${label}»? Это действие нельзя отменить.`)) return;
  try {
    await remoteDelete(kind,id);
    const list={team:'teams',member:'members',task:'tasks',issue:'issues',buildingSystem:'buildingSystems',buildingIssue:'buildingIssues',buildingMeasurement:'buildingMeasurements',buildingDocument:'buildingDocuments'}[kind];
    state[list]=state[list].filter(x=>x.id!==id);
    if(kind==='team'){state.members.forEach(m=>{if(m.teamId===id)m.teamId=null;});state.tasks.forEach(t=>{if(t.teamId===id)t.teamId=null;});state.issues.forEach(i=>{if(i.teamId===id)i.teamId=null;});}
    if(kind==='member')state.tasks.forEach(t=>{t.assigneeIds=taskAssigneeIds(t).filter(memberId=>memberId!==id);if(t.assigneeId===id)t.assigneeId=null;});
    const entry=logActivity('Удалена запись',label); await remoteActivity(entry);
    saveLocal(); render(); toast('Запись удалена');
  } catch(err) { toast(err.message||'Не удалось удалить запись',true); }
}

function recordDateForIssue(id){return state.buildingIssues.find(x=>x.id===id)?.reportedAt||new Date().toISOString();}

function render() {
  $('#project-title').textContent='Дом-музей И. С. Тургенева';
  const stats=overallStats();
  $('#overall-percent').textContent=`${stats.percent}%`;
  $('#overall-bar').style.width=`${Math.max(0,Math.min(100,stats.percent))}%`;
  $('#overall-completed').textContent=`${formatPoints(stats.earnedPoints)} баллов заработано`;
  $('#overall-remaining').textContent=`${formatPoints(Math.max(0,stats.assignedPoints-stats.earnedPoints))} не заработано`;
  $('#progress-caption').textContent=state.project.progressMode==='manual'?'ручное значение администратора':'по начисленным баллам выполненных задач';
  renderTaskKpi(); renderTeams(); renderMembers(); renderTasks(); renderActivity(); renderIssues(); renderBuildingSystems(); renderBuildingIssues(); renderMeasurements(); renderBuildingDocuments(); applyRoleView(); renderAccess();
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${activePage}`));
  $$('.nav-item,.tab').forEach(b=>b.classList.toggle('active',b.dataset.page===activePage));
}
function renderTaskKpi() {
  const done=state.tasks.filter(t=>t.status==='Done').length;
  const inProgress=state.tasks.filter(t=>t.status==='In Progress').length;
  const todo=state.tasks.filter(t=>t.status==='To Do').length;
  const total=state.tasks.length;
  const d=total?done/total*100:0, p=total?inProgress/total*100:0;
  $('#task-donut').style.background=`conic-gradient(#c62f3b 0 ${d}%, #e46a73 ${d}% ${d+p}%, #d9d9dd ${d+p}% 100%)`;
  $('#task-total').textContent=total;
  $('#done-count').textContent=done; $('#progress-count').textContent=inProgress; $('#todo-count').textContent=todo;
  $('#task-legend').innerHTML=`<div><i style="background:#c62f3b"></i><span>Выполнено</span><b>${done}</b></div><div><i style="background:#e46a73"></i><span>В процессе</span><b>${inProgress}</b></div><div><i style="background:#d9d9dd"></i><span>Не начато</span><b>${todo}</b></div>`;
}
function renderTeams() {
  $('#team-circles').innerHTML=state.teams.map(team=>{
    const s=groupStats(team), people=state.members.filter(m=>m.teamId===team.id);
    const contributions=people.map((m,i)=>{
      const points=memberPointStats(m.id);
      const ratio=m.progressMode==='manual'?Math.max(0,Math.min(1,Number(m.manualProgress||0)/100)):(points.assignedPoints?Math.max(0,Math.min(1,points.earnedPoints/points.assignedPoints)):0);
      return {member:m,total:points.assignedPoints,done:points.earnedPoints,ratio,color:COLORS[i%COLORS.length]};
    });
    const ringWeights=contributions.map(c=>c.total||1);
    const weightSum=ringWeights.reduce((a,b)=>a+b,0)||1;
    let cursor=0;
    const slices=contributions.map((c,i)=>{
      const start=cursor, end=cursor+ringWeights[i]/weightSum*100;
      const filledEnd=start+(end-start)*c.ratio; cursor=end;
      return `${c.color} ${start}% ${filledEnd}%, #d9d9dd ${filledEnd}% ${end}%`;
    }).join(', ') || '#d9d9dd 0 100%';
    const legend=contributions.length?contributions.map(c=>`<span class="contribution-chip" title="${safe(c.member.name)}: ${formatPoints(c.done)} из ${formatPoints(c.total)} баллов"><i style="background:${c.color}"></i>${safe(c.member.name.split(' ')[0])} <b>${formatPoints(c.done)}/${formatPoints(c.total)}</b></span>`).join(''):'<span class="muted tiny">Участников пока нет</span>';
    return `<article class="team-card" style="--team-color:${team.color}"><button class="team-card-main" data-team-details="${safe(team.id)}" title="Показать вклад участников"><div class="team-ring" style="background:conic-gradient(${slices})"><div class="team-ring-hole"><strong>${s.percent}%</strong><span>${formatPoints(s.earnedPoints)}/${formatPoints(s.assignedPoints)} б.</span></div></div><b class="team-name">${safe(team.name)}</b><span class="team-meta">${people.length} участников · ${s.tasks.length} задач</span><span class="team-points">${formatPoints(s.earnedPoints)} / ${formatPoints(s.assignedPoints)} баллов</span><div class="contribution-list">${legend}</div></button><div class="team-card-actions"><button class="small-action" data-edit="team" data-id="${safe(team.id)}" title="Изменить группу">✎</button><button class="small-action danger" data-delete="team" data-id="${safe(team.id)}" title="Удалить группу">×</button></div></article>`;
  }).join('') || '<div class="empty-state">Добавьте первую подгруппу, чтобы увидеть статистику.</div>';
}
function renderMembers() {
  const teamSelect=$('#member-team-filter');
  const validTeamFilter=memberTeamFilter==='all'||state.teams.some(t=>t.id===memberTeamFilter);
  if(!validTeamFilter) memberTeamFilter='all';
  teamSelect.innerHTML='<option value="all">Все группы</option>'+state.teams.map(t=>`<option value="${safe(t.id)}">${safe(t.name)}</option>`).join('');
  teamSelect.value=memberTeamFilter;
  $$('#member-role-filters [data-member-role-filter]').forEach(button=>button.classList.toggle('active',button.dataset.memberRoleFilter===memberRoleFilter));

  const teamOrder=new Map(state.teams.map((team,index)=>[team.id,index]));
  const visibleMembers=state.members
    .filter(m=>memberTeamFilter==='all'||m.teamId===memberTeamFilter)
    .filter(m=>memberRoleFilter==='all'||m.role===memberRoleFilter)
    .sort((a,b)=>{
      const groupDifference=(teamOrder.get(a.teamId)??Number.MAX_SAFE_INTEGER)-(teamOrder.get(b.teamId)??Number.MAX_SAFE_INTEGER);
      if(groupDifference!==0) return groupDifference;
      const leaderDifference=(b.role==='Leader'?1:0)-(a.role==='Leader'?1:0);
      if(leaderDifference!==0) return leaderDifference;
      return a.name.localeCompare(b.name,'ru',{sensitivity:'base'});
    });

  $('#member-count').textContent=`Показано ${visibleMembers.length} из ${state.members.length}`;
  $('#members-table').innerHTML=visibleMembers.map(m=>{const points=memberPointStats(m.id);return `<tr><td><div class="person-cell"><span class="avatar">${safe(m.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('').toUpperCase())}</span><b>${safe(m.name)}</b></div></td><td>${safe(teamName(m.teamId))}</td><td><span class="role-pill ${m.role==='Leader'?'leader':''}">${m.role==='Leader'?'Руководитель':'Участник'}</span></td><td><span class="points-cell" title="Заработано / назначено баллов">${formatPoints(points.earnedPoints)} / ${formatPoints(points.assignedPoints)}</span></td><td><div class="row-actions ${canManage(m.teamId)?'':'hidden'}"><button class="small-action" data-edit="member" data-id="${safe(m.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="member" data-id="${safe(m.id)}" title="Удалить">×</button></div></td></tr>`;}).join('') || `<tr><td colspan="5" class="empty-cell">${state.members.length?'В этой категории пока никого нет.':'Пока нет участников. Добавьте первого.'}</td></tr>`;
}
const statusLabel={Done:'Выполнено','In Progress':'В процессе','To Do':'Не начато'};
function renderTasks() {
  $('#tasks-table').innerHTML=state.tasks.map(t=>{
    const allocations=taskAllocations(t);
    const assignees=allocations.map(a=>{
      const m=state.members.find(x=>x.id===a.memberId);
      return m?`<span class="task-assignee-chip">${safe(m.name)} <b>+${formatPoints(a.points)} б.</b><small>${safe(teamName(m.teamId))}</small></span>`:'';
    }).filter(Boolean).join('') || '<span class="muted">Не назначены</span>';
    const total=taskAllocatedPoints(t), earned=taskEarnedPoints(t);
    const mode=t.allocationMode==='full'?'Полный вес каждому':'Разделить между всеми';
    return `<tr><td><b>${safe(t.title)}</b></td><td><div class="task-assignee-list">${assignees}</div></td><td>${formatPoints(t.weight)} б.</td><td><span class="task-points-value">${formatPoints(earned)} / ${formatPoints(total)} б.</span><small class="task-allocation-label">${mode}</small></td><td>${dateLabel(t.dueDate)}</td><td><span class="task-status ${t.status==='Done'?'done':t.status==='In Progress'?'progress':'todo'}">${statusLabel[t.status]||safe(t.status)}</span></td><td><div class="row-actions ${taskCanManage(t)?'':'hidden'}"><button class="small-action" data-edit="task" data-id="${safe(t.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="task" data-id="${safe(t.id)}" title="Удалить">×</button></div></td></tr>`;
  }).join('') || '<tr><td colspan="7" class="empty-cell">Задачи ещё не добавлены.</td></tr>';
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
const BUILDING_STATUS = {unknown:'Не обследовано',good:'Исправно',watch:'Требует наблюдения',repair:'Нужен ремонт',critical:'Критическое'};
const ISSUE_STATUS = {Open:'Открыта','In Progress':'В работе',Resolved:'Устранена'};
function renderBuildingSystems(){
  const target=$('#building-systems'); if(!target)return;
  const list=state.buildingSystems||[];
  target.innerHTML=list.map(s=>`<article class="system-card status-${safe(s.status)}"><div class="system-card-top"><span class="system-icon">${s.category==='Инженерные системы'?'⌁':s.category==='Несущие конструкции'?'▥':'⌂'}</span><span class="condition-pill ${safe(s.status)}">${BUILDING_STATUS[s.status]||'Не обследовано'}</span></div><span class="system-category">${safe(s.category)}</span><h4>${safe(s.name)}</h4><p>${safe(s.details||'Актуальное описание отсутствует.')}</p><div class="system-meta"><span>${safe(s.location||'Локация не указана')}</span><span>${s.lastInspected?`Осмотр: ${dateLabel(s.lastInspected)}`:'Нет даты осмотра'}</span></div><div class="system-actions ${canManageBuilding()?'':'hidden'}"><button class="small-action" data-edit="buildingSystem" data-id="${safe(s.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="buildingSystem" data-id="${safe(s.id)}" title="Удалить">×</button></div></article>`).join('')||'<div class="empty-state">Элементы ещё не добавлены.</div>';
  const count={unknown:0,good:0,watch:0,repair:0,critical:0}; list.forEach(s=>count[s.status]=(count[s.status]||0)+1);
  $('#condition-summary').innerHTML=`<div class="condition-tile"><span class="condition-color gray"></span><small>Не обследовано</small><b>${count.unknown}</b></div><div class="condition-tile"><span class="condition-color green"></span><small>Исправно</small><b>${count.good}</b></div><div class="condition-tile"><span class="condition-color amber"></span><small>Наблюдение / ремонт</small><b>${count.watch+count.repair}</b></div><div class="condition-tile"><span class="condition-color red"></span><small>Критическое</small><b>${count.critical}</b></div>`;
}
function buildingIssueCard(i){return `<article class="building-issue-card"><div class="building-issue-head"><span class="severity-tag ${safe(i.severity)}">${i.severity==='High'?'Высокий риск':i.severity==='Medium'?'Средний риск':'Низкий риск'}</span><span class="building-issue-state ${i.status==='Resolved'?'resolved':''}">${ISSUE_STATUS[i.status]||i.status}</span></div><h4>${safe(i.title)}</h4><p>${safe(i.description||'Описание не добавлено.')}</p><div class="system-meta"><span>${safe(i.category)} · ${safe(i.location||'Локация не указана')}</span><span>${i.dueDate?`Срок: ${dateLabel(i.dueDate)}`:`Заявка: ${dateLabel((i.reportedAt||'').slice(0,10))}`}</span></div>${i.resolution?`<div class="building-resolution"><b>Результат</b><p>${safe(i.resolution)}</p></div>`:''}<div class="system-actions ${canManageBuilding()?'':'hidden'}"><button class="small-action" data-edit="buildingIssue" data-id="${safe(i.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="buildingIssue" data-id="${safe(i.id)}" title="Удалить">×</button></div></article>`;}
function renderBuildingIssues(){
 const open=(state.buildingIssues||[]).filter(i=>i.status!=='Resolved'), solved=(state.buildingIssues||[]).filter(i=>i.status==='Resolved');
 $('#building-open-count').textContent=open.length; $('#building-solved-count').textContent=solved.length;
 $('#building-open-issues').innerHTML=open.map(buildingIssueCard).join('')||'<div class="empty-state">Открытых проблем состояния здания нет. Если обнаружен дефект, зафиксируйте его отдельной заявкой.</div>';
 $('#building-solved-issues').innerHTML=solved.map(buildingIssueCard).join('')||'<div class="empty-state">Здесь будут отображаться устранённые неисправности.</div>';
}
function renderMeasurements(){
 const target=$('#measurements-table'); if(!target)return;
 target.innerHTML=(state.buildingMeasurements||[]).map(m=>`<tr><td><b>${safe(m.label)}</b></td><td>${m.value?safe(m.value):'<span class="placeholder-value">Не задано</span>'} ${safe(m.unit)}</td><td><span class="status-tag ${m.status==='documented'?'documented':'placeholder'}">${m.status==='documented'?'Подтверждено источником':'Нужен обмер'}</span><small class="table-source">${safe(m.source||'Источник не указан')}</small></td><td class="measurement-notes">${safe(m.notes||'—')}</td><td><div class="row-actions ${canManageDesign()?'':'hidden'}"><button class="small-action" data-edit="buildingMeasurement" data-id="${safe(m.id)}" title="Изменить">✎</button><button class="small-action danger" data-delete="buildingMeasurement" data-id="${safe(m.id)}" title="Удалить">×</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty-cell">Обмерные данные ещё не добавлены.</td></tr>';
}
function renderBuildingDocuments(){
 const target=$('#building-documents'); if(!target)return;
 target.innerHTML=(state.buildingDocuments||[]).map(d=>`<article class="document-card"><span class="document-icon">${d.documentType==='Чертёж'?'⌗':d.documentType==='Фотофиксация'?'▧':'▤'}</span><div class="document-kind">${safe(d.documentType)} ${d.level?`· ${safe(d.level)}`:''}</div><h4>${safe(d.title)}</h4><p>${safe(d.notes||'Описание не добавлено.')}</p><div class="document-actions">${d.fileUrl?`<a href="${safe(d.fileUrl)}" target="_blank" rel="noopener">Открыть материал ↗</a>`:'<span class="placeholder-value">Ссылка не добавлена</span>'}<span class="row-actions ${canManageDesign()?'':'hidden'}"><button class="small-action" data-edit="buildingDocument" data-id="${safe(d.id)}">✎</button><button class="small-action danger" data-delete="buildingDocument" data-id="${safe(d.id)}">×</button></span></div></article>`).join('')||'<div class="empty-state">Документы пока не добавлены. Добавьте ссылку на обмерный чертёж, фасад или разрез.</div>';
}

function renderAccess() {
  const badge=$('#mode-pill'), stateEl=$('#access-state');
  if(remoteMode){
    badge.textContent='LIVE DATABASE'; badge.className='mode-pill live';
    stateEl.innerHTML=currentUser?`<span class="status-dot"></span> ${safe(profile?.display_name||currentRole())} · ${safe(ROLE_LABELS[currentRole()]||currentRole())}`:'<span class="status-dot public"></span> Публичный просмотр · без входа';
    $('#login-btn').classList.toggle('hidden',!!currentUser); $('#logout-btn').classList.toggle('hidden',!currentUser);
  } else {
    badge.textContent='DEMO'; badge.className='mode-pill';
    stateEl.innerHTML='<span class="status-dot"></span> Демо-режим · только это устройство';
    $('#login-btn').classList.remove('hidden'); $('#logout-btn').classList.add('hidden');
  }
  const admin=canAdmin(), role=currentRole();
  ['#edit-project-btn','#edit-progress-btn','#add-team-btn'].forEach(sel=>$(sel).classList.toggle('hidden',!admin));
  $('#add-member-btn').classList.toggle('hidden',!canManageMembers());
  $('#add-issue-btn').classList.toggle('hidden',!canManage());
  $('#add-task-btn').classList.toggle('hidden',!canCreateTask());
  $$('#members-table [data-edit], #members-table [data-delete]').forEach(btn=>{const m=state.members.find(x=>x.id===btn.dataset.id);btn.classList.toggle('hidden',!canManageMembers(m?.teamId));});
  $$('#tasks-table [data-edit], #tasks-table [data-delete]').forEach(btn=>{const t=state.tasks.find(x=>x.id===btn.dataset.id);btn.classList.toggle('hidden',!taskCanManage(t||{}));});
  $$('#open-issues [data-edit], #open-issues [data-delete], #solved-issues [data-edit], #solved-issues [data-delete]').forEach(btn=>{const i=state.issues.find(x=>x.id===btn.dataset.id);btn.classList.toggle('hidden',!canManage(i?.teamId));});
  $$('.team-card-actions').forEach(el=>el.classList.toggle('hidden',!admin));
  $('#add-building-issue-btn')?.classList.toggle('hidden',!canManageBuilding());
  $('#add-system-btn')?.classList.toggle('hidden',!canManageBuilding());
  $('#add-measurement-btn')?.classList.toggle('hidden',!canManageDesign());
  $('#add-document-btn')?.classList.toggle('hidden',!canManageDesign());
  $('#add-issue-btn')?.classList.toggle('hidden',!canManage());
}

const field=(name,label,type='text',value='',options=[])=>({name,label,type,value,options});
function openEditor(kind,record=null) {
  if(remoteMode && (['buildingSystem','buildingIssue'].includes(kind)?!canManageBuilding():(['buildingMeasurement','buildingDocument'].includes(kind)?!canManageDesign():(kind==='task' ? (record?!taskCanManage(record):!canCreateTask()) : (['project','team'].includes(kind)?!canAdmin():(kind==='member'?!canManageMembers(record?.teamId||null):!canManage(record?.teamId||null))))))){toast('Для редактирования нужны соответствующие права доступа.',true);return;}
  editingContext={kind,id:record?.id||null};
  $('#dialog-fields').onchange=null;
  const teamOptions=state.teams.filter(t=>canManage(t.id)).map(t=>({value:t.id,label:t.name}));
  const memberOptions=state.members.filter(m=>canManage(m.teamId)).map(m=>({value:m.id,label:`${m.name} · ${teamName(m.teamId)}`}));
  let fields=[];
  if(kind==='project') fields=[field('title','Название проекта','text',record?.title??state.project.title),field('subtitle','Описание','text',record?.subtitle??state.project.subtitle),field('progressMode','Способ расчёта прогресса','select',record?.progressMode??state.project.progressMode,[{value:'auto',label:'Автоматически по выполненным задачам'},{value:'manual',label:'Вручную'}]),field('manualProgress','Процент прогресса (0–100)','number',record?.manualProgress??state.project.manualProgress)];
  if(kind==='team') fields=[field('name','Название группы','text',record?.name||''),field('color','Цвет группы','color',record?.color||COLORS[state.teams.length%COLORS.length]),field('progressMode','Способ расчёта прогресса','select',record?.progressMode||'auto',[{value:'auto',label:'Автоматически по задачам'},{value:'manual',label:'Вручную'}]),field('manualProgress','Процент прогресса (0–100)','number',record?.manualProgress??0)];
  if(kind==='member') fields=[field('name','Имя участника','text',record?.name||''),field('teamId','Подгруппа','select',record?.teamId||teamOptions[0]?.value,teamOptions),field('role','Роль','select',record?.role||'Member',[{value:'Member',label:'Участник'},{value:'Leader',label:'Руководитель группы'}]),field('progressMode','Способ расчёта личного прогресса','select',record?.progressMode||'auto',[{value:'auto',label:'Автоматически по задачам'},{value:'manual',label:'Вручную'}]),field('manualProgress','Личный прогресс (0–100%)','number',record?.manualProgress??0)];
  if(kind==='task') fields=[field('title','Название задачи','text',record?.title||''),field('assigneeIds','Исполнители — можно выбрать из разных групп','multiselect',taskAssigneeIds(record||{})),field('weight','Вес задачи (баллы)','number',record?.weight??1),field('allocationMode','Как распределять баллы?','select',record?.allocationMode||'split',[{value:'split',label:'Разделить вес поровну между исполнителями'},{value:'full',label:'Полный вес каждому исполнителю'}]),field('dueDate','Дедлайн','date',record?.dueDate||''),field('status','Статус','select',record?.status||'To Do',[{value:'To Do',label:'Не начато'},{value:'In Progress',label:'В процессе'},{value:'Done',label:'Выполнено'}])];
  if(kind==='issue') fields=[field('title','Название проблемы','text',record?.title||''),field('teamId','Подгруппа','select',record?.teamId||state.teams[0]?.id,teamOptions),field('priority','Приоритет','select',record?.priority||'Medium',[{value:'Low',label:'Низкий'},{value:'Medium',label:'Средний'},{value:'High',label:'Высокий'}]),field('status','Статус','select',record?.status||'Open',[{value:'Open',label:'Открыто'},{value:'In Progress',label:'В работе'},{value:'Resolved',label:'Решено'}]),field('description','Описание','textarea',record?.description||''),field('resolution','Решение / результат оптимизации','textarea',record?.resolution||'')];
  if(kind==='buildingSystem') fields=[field('name','Элемент / система','text',record?.name||''),field('category','Категория','select',record?.category||'Инженерные системы',[{value:'Внешние конструкции',label:'Внешние конструкции'},{value:'Несущие конструкции',label:'Несущие конструкции'},{value:'Инженерные системы',label:'Инженерные системы'},{value:'Пожарная безопасность',label:'Пожарная безопасность'},{value:'Внутренние помещения',label:'Внутренние помещения'}]),field('status','Состояние','select',record?.status||'unknown',[{value:'unknown',label:'Не обследовано'},{value:'good',label:'Исправно'},{value:'watch',label:'Требует наблюдения'},{value:'repair',label:'Нужен ремонт'},{value:'critical',label:'Критическое'}]),field('location','Расположение / участок','text',record?.location||''),field('lastInspected','Дата последнего осмотра','date',record?.lastInspected||''),field('inspectedBy','Кто проводил осмотр','text',record?.inspectedBy||''),field('details','Описание состояния / замечания','textarea',record?.details||'')];
  if(kind==='buildingIssue') fields=[field('title','Краткое название дефекта','text',record?.title||''),field('category','Категория','select',record?.category||'Конструкции',[{value:'Фасад',label:'Фасад'},{value:'Фундамент',label:'Фундамент'},{value:'Кровля',label:'Кровля'},{value:'Инженерные системы',label:'Инженерные системы'},{value:'Конструкции',label:'Конструкции'},{value:'Внутренние помещения',label:'Внутренние помещения'},{value:'Безопасность',label:'Безопасность'},{value:'Другое',label:'Другое'}]),field('location','Точное место','text',record?.location||''),field('severity','Уровень риска','select',record?.severity||'Medium',[{value:'Low',label:'Низкий'},{value:'Medium',label:'Средний'},{value:'High',label:'Высокий'}]),field('status','Статус','select',record?.status||'Open',[{value:'Open',label:'Открыта'},{value:'In Progress',label:'В работе'},{value:'Resolved',label:'Устранена'}]),field('dueDate','Плановый срок','date',record?.dueDate||''),field('description','Описание дефекта','textarea',record?.description||''),field('resolution','Выполненные работы / решение','textarea',record?.resolution||'')];
  if(kind==='buildingMeasurement') fields=[field('label','Параметр','text',record?.label||''),field('value','Значение','text',record?.value||''),field('unit','Единица измерения','text',record?.unit||''),field('source','Источник / документ','text',record?.source||''),field('status','Достоверность','select',record?.status||'placeholder',[{value:'documented',label:'Подтверждено документом'},{value:'measured',label:'Измерено командой'},{value:'placeholder',label:'Требует обмера / проверки'}]),field('notes','Примечание','textarea',record?.notes||'')];
  if(kind==='buildingDocument') fields=[field('title','Название материала','text',record?.title||''),field('documentType','Тип материала','select',record?.documentType||'Чертёж',[{value:'Чертёж',label:'Чертёж'},{value:'Фотофиксация',label:'Фотофиксация'},{value:'Документ',label:'Документ'},{value:'Модель',label:'3D-модель'},{value:'Другое',label:'Другое'}]),field('level','Этаж / участок','text',record?.level||''),field('fileUrl','Ссылка на файл или документ','url',record?.fileUrl||''),field('status','Статус','select',record?.status||'reference',[{value:'reference',label:'Справочный материал'},{value:'draft',label:'Черновик'},{value:'approved',label:'Согласовано'}]),field('notes','Описание','textarea',record?.notes||'')];
  $('#dialog-title').textContent=({project:'Настройки проекта',team:record?'Изменить группу':'Добавить группу',member:record?'Изменить участника':'Добавить участника',task:record?'Изменить задачу':'Новая задача',issue:record?'Изменить проблему':'Добавить проблему',buildingSystem:record?'Изменить состояние элемента':'Добавить элемент / систему',buildingIssue:record?'Изменить дефект':'Зафиксировать проблему здания',buildingMeasurement:record?'Изменить обмер':'Добавить обмерный параметр',buildingDocument:record?'Изменить материал':'Добавить проектный материал'})[kind];
  $('#dialog-eyebrow').textContent=kind.toUpperCase();
  $('#dialog-fields').innerHTML=fields.map(f=>{
    if(f.type==='select') return `<label class="form-field"><span>${safe(f.label)}</span><select name="${f.name}" ${f.name==='allocationMode'?'id="task-allocation-mode"':''}>${f.options.map(o=>`<option value="${safe(o.value)}" ${String(o.value)===String(f.value)?'selected':''}>${safe(o.label)}</option>`).join('')}</select></label>`;
    if(f.type==='multiselect') return `<div class="form-field"><span>${safe(f.label)}</span><div class="assignee-picker">${state.teams.map(team=>{const people=state.members.filter(m=>m.teamId===team.id);return people.length?`<div class="assignee-team"><b>${safe(team.name)}</b>${people.map(m=>`<label class="assignee-option"><input type="checkbox" name="assigneeIds" value="${safe(m.id)}" ${f.value.includes(m.id)?'checked':''}><span>${safe(m.name)}</span><small>${m.role==='Leader'?'Руководитель':'Участник'}</small></label>`).join('')}</div>`:'';}).join('')}${state.members.some(m=>!m.teamId)?`<div class="assignee-team"><b>Без группы</b>${state.members.filter(m=>!m.teamId).map(m=>`<label class="assignee-option"><input type="checkbox" name="assigneeIds" value="${safe(m.id)}" ${f.value.includes(m.id)?'checked':''}><span>${safe(m.name)}</span><small>${m.role==='Leader'?'Руководитель':'Участник'}</small></label>`).join('')}</div>`:''}</div><p class="form-help">Можно назначить любое количество участников из разных подгрупп. Статус задачи общий для всех исполнителей.</p><p id="task-allocation-preview" class="allocation-preview"></p></div>`;
    if(f.type==='textarea') return `<label class="form-field"><span>${safe(f.label)}</span><textarea name="${f.name}" rows="3">${safe(f.value)}</textarea></label>`;
    const numberAttrs=f.type==='number'?(f.name==='weight'?'min="0.01" max="100000" step="0.01"':'min="0" max="100" step="1"'):'';
    return `<label class="form-field"><span>${safe(f.label)}</span><input name="${f.name}" type="${f.type}" value="${safe(f.value)}" ${numberAttrs} ${['fileUrl','source','location','lastInspected','inspectedBy','dueDate','unit'].includes(f.name)?'':'required'} /></label>`;
  }).join('');
  $('#editor-dialog').showModal();
  if(kind==='task') {
    const updatePreview=()=>{
      const weight=Math.max(0,Number($('[name=weight]')?.value||0));
      const ids=$$('[name=assigneeIds]:checked').map(input=>input.value);
      const mode=$('[name=allocationMode]')?.value||'split';
      const preview=$('#task-allocation-preview'); if(!preview)return;
      if(!ids.length){preview.textContent='Выберите хотя бы одного исполнителя.';return;}
      const allocation=taskAllocations({weight,assigneeIds:ids,allocationMode:mode});
      const details=allocation.map(a=>`${state.members.find(m=>m.id===a.memberId)?.name||'Участник'} — ${formatPoints(a.points)} б.`).join(' · ');
      const total=allocation.reduce((sum,a)=>sum+a.points,0);
      preview.textContent=`${details}. Всего по задаче: ${formatPoints(total)} баллов.`;
    };
    $('#dialog-fields').onchange=updatePreview;
    $('[name=weight]')?.addEventListener('input',updatePreview);
    updatePreview();
  }
}
function openLogin() {
  editingContext={kind:'login',id:null};
  $('#dialog-fields').onchange=null;
  $('#dialog-title').textContent='Вход для участника'; $('#dialog-eyebrow').textContent='SUPABASE AUTH';
  $('#dialog-fields').innerHTML='<label class="form-field"><span>Логин</span><input name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="visitor / owner / maintenance / design" required /></label><label class="form-field"><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required /></label><p class="form-help">Доступны четыре профиля: visitor, owner, maintenance и design. Пароли выдаёт администратор проекта.</p>';
  $('#editor-dialog').showModal();
}

$('#editor-form').addEventListener('submit',async e=>{
  e.preventDefault(); if(!editingContext)return;
  const kind=editingContext.kind; const formData=new FormData(e.currentTarget); const values=Object.fromEntries(formData.entries());
  if(kind==='task') values.assigneeIds=formData.getAll('assigneeIds');
  if(kind==='login'){
    try {const username=String(values.username||'').trim().toLowerCase();const email=LOGIN_EMAILS[username];if(!email)throw new Error('Неизвестный логин. Используйте visitor, owner, maintenance или design.');const {error}=await supabase.auth.signInWithPassword({email,password:values.password});if(error)throw error;$('#editor-dialog').close();toast('Вы вошли в систему');}
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
    const assigneeIds=[...new Set((values.assigneeIds||[]).filter(id=>state.members.some(m=>m.id===id)))];
    if(!assigneeIds.length){toast('Выберите хотя бы одного исполнителя.',true);return;}
    if(remoteMode && profile?.role==='leader' && editingContext.id===null && !assigneeIds.some(id=>state.members.some(m=>m.id===id&&m.teamId===profile.team_id))){toast('Чтобы создать задачу, назначьте хотя бы одного участника своей группы. Остальных исполнителей можно выбрать из любых групп.',true);return;}
    item={id:editingContext.id||uid(),title:values.title.trim(),teamId:null,assigneeIds,allocationMode:values.allocationMode==='full'?'full':'split',createdBy:currentUser?.id||(editingContext.id?(state.tasks.find(t=>t.id===editingContext.id)?.createdBy||null):null),dueDate:values.dueDate,status:values.status,weight:Math.max(0.01,Math.round((Number(values.weight)||1)*100)/100)};list='tasks';action='Обновлена задача';
  } else if(kind==='issue'){
    item={id:editingContext.id||uid(),title:values.title.trim(),teamId:values.teamId,priority:values.priority,status:values.status,description:values.description.trim(),resolution:values.resolution.trim()};list='issues';action='Обновлена проблема / решение';  } else if(kind==='buildingSystem'){
    item={id:editingContext.id||uid(),name:values.name.trim(),category:values.category,status:values.status,location:values.location.trim(),details:values.details.trim(),lastInspected:values.lastInspected||null,inspectedBy:values.inspectedBy.trim()};list='buildingSystems';action='Обновлено состояние элемента здания';
  } else if(kind==='buildingIssue'){
    item={id:editingContext.id||uid(),title:values.title.trim(),category:values.category,location:values.location.trim(),severity:values.severity,status:values.status,dueDate:values.dueDate||null,description:values.description.trim(),resolution:values.resolution.trim(),reportedAt:recordDateForIssue(editingContext.id)};list='buildingIssues';action='Обновлена проблема состояния здания';
  } else if(kind==='buildingMeasurement'){
    item={id:editingContext.id||uid(),label:values.label.trim(),value:values.value.trim(),unit:values.unit.trim(),source:values.source.trim(),status:values.status,notes:values.notes.trim()};list='buildingMeasurements';action='Обновлены обмерные данные';
  } else if(kind==='buildingDocument'){
    item={id:editingContext.id||uid(),title:values.title.trim(),documentType:values.documentType,level:values.level.trim(),fileUrl:values.fileUrl.trim(),status:values.status,notes:values.notes.trim()};list='buildingDocuments';action='Обновлён проектный материал';
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
$('#add-building-issue-btn')?.addEventListener('click',()=>openEditor('buildingIssue'));
$('#add-system-btn')?.addEventListener('click',()=>openEditor('buildingSystem'));
$('#add-measurement-btn')?.addEventListener('click',()=>openEditor('buildingMeasurement'));
$('#add-document-btn')?.addEventListener('click',()=>openEditor('buildingDocument'));
$('#member-team-filter').addEventListener('change',e=>{memberTeamFilter=e.target.value;renderMembers();renderAccess();});
$('#member-role-filters').addEventListener('click',e=>{const button=e.target.closest('[data-member-role-filter]');if(!button)return;memberRoleFilter=button.dataset.memberRoleFilter;renderMembers();renderAccess();});
$('#login-btn').addEventListener('click',()=>configured&&supabase?openLogin():toast('Сначала подключите проект Supabase в config.js и выполните SQL из папки supabase.',true));
$('#logout-btn').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut();});

$$('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{activePage=btn.dataset.page;render();}));
document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-edit]');
  if(edit){const kind=edit.dataset.edit;const list={team:'teams',member:'members',task:'tasks',issue:'issues',buildingSystem:'buildingSystems',buildingIssue:'buildingIssues',buildingMeasurement:'buildingMeasurements',buildingDocument:'buildingDocuments'}[kind];openEditor(kind,state[list].find(x=>x.id===edit.dataset.id));return;}
  const del=e.target.closest('[data-delete]');
  if(del){const kind=del.dataset.delete;const list={team:'teams',member:'members',task:'tasks',issue:'issues',buildingSystem:'buildingSystems',buildingIssue:'buildingIssues',buildingMeasurement:'buildingMeasurements',buildingDocument:'buildingDocuments'}[kind];const item=state[list].find(x=>x.id===del.dataset.id);if(item)removeEntity(kind,item.id,item.name||item.title);return;}
  const team=e.target.closest('[data-team-details]');
  if(team){const t=state.teams.find(x=>x.id===team.dataset.teamDetails);const members=state.members.filter(m=>m.teamId===t.id);const stats=groupStats(t);const lines=members.map(m=>{const p=memberPointStats(m.id);return `${m.name}: ${formatPoints(p.earnedPoints)} / ${formatPoints(p.assignedPoints)} баллов`;}).join('\n');toast(`${t.name} · ${formatPoints(stats.earnedPoints)} / ${formatPoints(stats.assignedPoints)} баллов\n${lines||'В группе пока нет участников.'}`);}
});


// Theme preference: light is the default, dark can be toggled at any time.
function applyTheme(theme){
  const selected=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=selected;
  const button=$('#theme-toggle');
  if(button){button.textContent=selected==='dark'?'☀':'☾';button.title=selected==='dark'?'Включить светлую тему':'Включить тёмную тему';button.setAttribute('aria-label',button.title);}
  try{localStorage.setItem('pcc-theme',selected);}catch{}
}
applyTheme((()=>{try{return localStorage.getItem('pcc-theme')||'light';}catch{return 'light';}})());
$('#theme-toggle')?.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));

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

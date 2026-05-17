// ===== Helpers =====
function todayStr(){return ds(new Date())}
function ds(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fmtD(s){const p=s.split('-');return p[0]+'年'+(+p[1])+'月'+(+p[2])+'日'}
function fmtDs(s){const p=s.split('-');return (+p[1])+'月'+(+p[2])+'日'}
function getMon(d){const dt=new Date(d);const day=dt.getDay();dt.setDate(dt.getDate()-(day===0?6:day-1));dt.setHours(0,0,0,0);return dt}
function addD(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r}
const WN=['周一','周二','周三','周四','周五','周六','周日'];

// ===== Calendar =====
const CAL_START_HOUR=6;
function displayHour(i){return (CAL_START_HOUR+i)%24}
function calendarMinutePos(min){return ((min-CAL_START_HOUR*60+1440)%1440)/1440*100}
function switchView(v){calView=v;renderCal()}
function goToday(){const d=new Date();selectedDate=ds(d);calYear=d.getFullYear();calMonth=d.getMonth();calWeekStart=getMon(d);if(calView==='year')calView='month';renderCal()}
function navPrev(){if(calView==='month'){calMonth--;if(calMonth<0){calMonth=11;calYear--}}else if(calView==='year')calYear--;else if(calView==='day'){const d=new Date(calYear,calMonth,selectedDate?+selectedDate.split('-')[2]:new Date().getDate());d.setDate(d.getDate()-1);selectedDate=ds(d);calYear=d.getFullYear();calMonth=d.getMonth();calWeekStart=getMon(d)}else if(calView==='week')calWeekStart=addD(calWeekStart,-7);renderCal()}
function navNext(){if(calView==='month'){calMonth++;if(calMonth>11){calMonth=0;calYear++}}else if(calView==='year')calYear++;else if(calView==='day'){const d=new Date(calYear,calMonth,selectedDate?+selectedDate.split('-')[2]:new Date().getDate());d.setDate(d.getDate()+1);selectedDate=ds(d);calYear=d.getFullYear();calMonth=d.getMonth();calWeekStart=getMon(d)}else if(calView==='week')calWeekStart=addD(calWeekStart,7);renderCal()}
function renderCal(options={}){const animate=options.animate!==false,title=document.getElementById('calTitle'),body=document.getElementById('calBody');body.classList.remove('cal-anim');closeTodoEditor();if(calView==='month'){title.textContent=calYear+'年'+(calMonth+1)+'月';body.innerHTML='<div class="cal-month">'+monthGrid(calYear,calMonth)+'</div>'}else if(calView==='year'){title.textContent=calYear+'年';let h='<div class="cal-year">';for(let i=0;i<12;i++){if(i===6)h+='<div class="year-half-line"></div>';h+='<div class="mm" data-cal-action="select-month" data-year="'+calYear+'" data-month="'+i+'"><div class="mm-t">'+(i+1)+'月</div>'+monthGrid(calYear,i,false)+'</div>'}h+='</div>';body.innerHTML=h}else if(calView==='day'){if(!selectedDate)selectedDate=todayStr();const p=selectedDate.split('-');calYear=+p[0];calMonth=+p[1]-1;calWeekStart=getMon(new Date(calYear,calMonth,+p[2]));title.textContent=fmtD(selectedDate);body.innerHTML=dayView(selectedDate);scrollNow()}else if(calView==='week'){title.textContent=fmtDs(ds(calWeekStart))+' — '+fmtDs(ds(addD(calWeekStart,6)));body.innerHTML=weekView(calWeekStart);scrollNowW()}if(animate){void body.offsetWidth;body.classList.add('cal-anim')}if(pendingTodoEditor){const todo=pendingTodoEditor;pendingTodoEditor=null;requestAnimationFrame(()=>openTodoEditor(todo.date,todo.id))}}
function isoWeekNumber(d){const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=dt.getUTCDay()||7;dt.setUTCDate(dt.getUTCDate()+4-day);const y0=new Date(Date.UTC(dt.getUTCFullYear(),0,1));return Math.ceil((((dt-y0)/86400000)+1)/7)}
const LUNAR_DAY_NAMES=['','初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
const SOLAR_FESTIVALS={'01-01':'元旦','02-14':'情人节','03-08':'妇女节','05-01':'劳动节','05-04':'青年节','06-01':'儿童节','10-01':'国庆节','12-25':'圣诞节'};
const LUNAR_FESTIVALS={'正月-1':'春节','正月-15':'元宵','五月-5':'端午','七月-7':'七夕','七月-15':'中元','八月-15':'中秋','九月-9':'重阳','腊月-8':'腊八','腊月-23':'小年'};
const lunarFmt=typeof Intl!=='undefined'?new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{month:'long',day:'numeric'}):null;
function qingmingDay(y){return Math.floor(y*.2422+4.81)-Math.floor((y-1)/4)}
function lunarParts(d){
  if(!lunarFmt)return null;
  const parts=lunarFmt.formatToParts(d),month=(parts.find(p=>p.type==='month')||{}).value,day=parseInt((parts.find(p=>p.type==='day')||{}).value,10);
  return month&&day?{month,day}:null;
}
function calendarSubText(d){
  const md=String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let text=SOLAR_FESTIVALS[md]||'',fest=!!text;
  if(d.getMonth()===3&&d.getDate()===qingmingDay(d.getFullYear())){text='清明';fest=true}
  const lunar=lunarParts(d);
  if(lunar){
    const key=lunar.month.replace(/^闰/,'')+'-'+lunar.day;
    if(LUNAR_FESTIVALS[key]){text=LUNAR_FESTIVALS[key];fest=true}
    else {
      const next=lunarParts(addD(d,1));
      if(next&&next.month==='正月'&&next.day===1){text='除夕';fest=true}
      else if(!text)text=lunar.day===1?lunar.month:(LUNAR_DAY_NAMES[lunar.day]||'');
    }
  }
  return {text,fest};
}
function monthGrid(y,m,showWeeks=true){const wd=['一','二','三','四','五','六','日'],first=getMon(new Date(y,m,1)),last=new Date(y,m+1,0),td=todayStr(),ed=new Set(getDates()),stats=getStats();let h='<div class="cal-wk">'+(showWeeks?'<span></span>':'');wd.forEach(w=>h+='<span>'+w+'</span>');h+='</div><div class="cal-days">';for(let rowStart=new Date(first);rowStart<=last||rowStart.getMonth()===m;rowStart=addD(rowStart,7)){h+='<div class="cal-week">';if(showWeeks)h+='<span class="cal-week-no" data-cal-action="select-week" data-date="'+ds(rowStart)+'" title="第 '+isoWeekNumber(rowStart)+' 周">W'+isoWeekNumber(rowStart)+'</span>';for(let i=0;i<7;i++){const d=addD(rowStart,i),s=ds(d),count=stats[s]||0,level=statLevel(count),sub=showWeeks?calendarSubText(d):{text:'',fest:false};let c='cal-d';if(d.getMonth()!==m)c+=' om';if(s===td)c+=' td';if(s===selectedDate)c+=' sel';let mark='';if(level)mark='<span class="dot i'+level+'"></span><span class="amt" title="'+count+' 字">'+fmtAmt(count)+'</span>';else if(ed.has(s))mark='<span class="dot"></span>';h+='<span class="'+c+'" data-cal-action="select-date" data-date="'+s+'"><span class="cal-main">'+d.getDate()+'</span>'+(sub.text?'<span class="cal-sub'+(sub.fest?' fest':'')+'">'+sub.text+'</span>':'')+mark+'</span>'}h+='</div>'}h+='</div>';return h}
function categoryOptions(selected='Familiy'){return Object.keys(TODO_CATEGORIES).map(k=>'<option value="'+k+'"'+(k===selected?' selected':'')+'>'+TODO_CATEGORIES[k].label+'</option>').join('')}
function todoTimeLabel(item){const s=item.start||0,e=Math.min(1440,s+(item.duration||30));const f=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');return f(s)+'-'+f(e)}
function todoStyle(item){const top=calendarMinutePos(item.start||0),height=(item.duration||30)/1440*100,color=(TODO_CATEGORIES[item.category]||TODO_CATEGORIES.Familiy).color,hours=Math.max(1,Math.ceil((item.duration||30)/60));return 'top:'+top+'%;height:max(18px,'+height+'%);--todo-color:'+color+';--todo-hours:'+hours}
function weekTodoSegmentStyle(item,start,end){const top=calendarMinutePos(start),height=(end-start)/1440*100,color=(TODO_CATEGORIES[item.category]||TODO_CATEGORIES.Familiy).color;return 'top:calc('+top+'% + var(--week-col)*.1);height:max(4px,calc('+height+'% - var(--week-col)*.2));--todo-color:'+color+';--todo-hours:1'}
function todoHTML(date,item){return '<div class="cal-todo" data-cal-action="drag-todo" data-date="'+escAttr(date)+'" data-todo-id="'+escAttr(item.id)+'" data-drag-mode="move" style="'+todoStyle(item)+'"><div class="todo-resize top" data-cal-action="drag-todo" data-date="'+escAttr(date)+'" data-todo-id="'+escAttr(item.id)+'" data-drag-mode="top"></div><div class="todo-in"><span class="todo-text" title="'+escAttr(todoTimeLabel(item)+' '+item.text)+'">'+escHTML(item.text)+'</span><button class="todo-del" data-cal-action="delete-todo" data-date="'+escAttr(date)+'" data-todo-id="'+escAttr(item.id)+'" title="删除">×</button></div><div class="todo-resize bottom" data-cal-action="drag-todo" data-date="'+escAttr(date)+'" data-todo-id="'+escAttr(item.id)+'" data-drag-mode="bottom"></div></div>'}
function weekTodoHTML(item){const start=Math.max(0,Math.min(1439,item.start||0)),end=Math.max(start+1,Math.min(1440,start+(item.duration||30)));let h='';for(let s=start;s<end;){const next=Math.min(end,(Math.floor(s/60)+1)*60);h+='<div class="cal-todo" style="'+weekTodoSegmentStyle(item,s,next)+'" title="'+escAttr(todoTimeLabel(item)+' '+item.text)+'"></div>';s=next}return h}
function dayView(s){const todos=getTodos()[s]||[];let h='<div class="dv"><div class="dv-tl" id="dvTl">';for(let i=0;i<24;i++){const l=String(displayHour(i)).padStart(2,'0'),start=displayHour(i)*60;h+='<div class="dv-hr"><div class="dv-lb">'+l+':00</div><div class="dv-sl" data-cal-action="create-todo" data-start="'+start+'"></div></div>'}todos.forEach(item=>h+=todoHTML(s,item));if(s===todayStr()){const n=new Date(),t=n.getHours()*60+n.getMinutes(),top=calendarMinutePos(t);h+='<div class="dv-now" style="top:'+top+'%"></div>'}h+='</div></div>';return h}
function scrollNow(){requestAnimationFrame(()=>{const t=document.getElementById('dvTl');if(!t)return;const n=new Date(),top=calendarMinutePos(n.getHours()*60+n.getMinutes())/100*t.scrollHeight;t.scrollTop=top-t.clientHeight/3})}
function weekHourLabel(h){const dh=displayHour(h),n=dh%12||12;return String(n).padStart(2,'0')+(dh<12?'a':'p')}
function weekView(mon){const td=todayStr(),todos=getTodos(),weekNo=isoWeekNumber(mon);let h='<div class="wv"><div class="wv-hd"><div class="wv-gt">W'+weekNo+'</div><div class="wv-dhs">';for(let i=0;i<7;i++){const d=addD(mon,i),s=ds(d);h+='<div class="wv-dh'+(s===td?' td':'')+(s===selectedDate?' sel':'')+'" data-cal-action="select-date" data-date="'+s+'">'+WN[i]+'<span class="wn">'+d.getDate()+'</span></div>'}h+='</div></div><div class="wv-bd" id="wvBd"><div class="wv-tc">';for(let i=0;i<24;i++)h+='<div class="wv-tl">'+weekHourLabel(i)+'</div>';h+='</div><div class="wv-cols">';for(let i=0;i<7;i++){const date=ds(addD(mon,i)),items=todos[date]||[];h+='<div class="wv-col">';for(let j=0;j<24;j++)h+='<div class="wv-cl"></div>';items.forEach(item=>h+=weekTodoHTML(item));h+='</div>'}h+='</div>';if(td>=ds(mon)&&td<=ds(addD(mon,6))){const n=new Date(),t=n.getHours()*60+n.getMinutes(),top=calendarMinutePos(t);h+='<div class="wv-now" style="top:'+top+'%"></div>'}h+='</div></div>';return h}
function scrollNowW(){requestAnimationFrame(()=>{const b=document.getElementById('wvBd');if(!b)return;const n=new Date(),top=calendarMinutePos(n.getHours()*60+n.getMinutes()),line=b.querySelector('.wv-now');if(line)line.style.top=top+'%'})}
function selDate(s){selectedDate=s;const p=s.split('-');calYear=+p[0];calMonth=+p[1]-1;calWeekStart=getMon(new Date(calYear,calMonth,+p[2]));calView='day';renderCal();doc.focus()}
function selWeek(s){calWeekStart=getMon(new Date(s));selectedDate=null;calView='week';renderCal()}
function focusCalendarDate(){
  if(selectedDate){
    const p=selectedDate.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);
    if(d.getFullYear()===calYear&&d.getMonth()===calMonth)return d;
  }
  const now=new Date();
  if(now.getFullYear()===calYear&&now.getMonth()===calMonth)return now;
  return new Date(calYear,calMonth,1);
}
function zoomCalendar(direction){
  if(direction<0){
    if(calView==='year')calView='month';
    else if(calView==='month'){const d=focusCalendarDate();selectedDate=ds(d);calWeekStart=getMon(d);calView='week'}
    else if(calView==='week'){if(!selectedDate)selectedDate=ds(calWeekStart);calView='day'}
    else return;
  }else{
    if(calView==='day'){const p=(selectedDate||todayStr()).split('-');calWeekStart=getMon(new Date(+p[0],+p[1]-1,+p[2]));calView='week'}
    else if(calView==='week'){calYear=calWeekStart.getFullYear();calMonth=calWeekStart.getMonth();calView='month'}
    else if(calView==='month')calView='year';
    else return;
  }
  renderCal();
}
let calWheelLock=false;
function createCalendarTodoAt(e,start){
  if(e){e.preventDefault();e.stopPropagation()}
  if(!selectedDate)return;
  const todos=getTodos();
  const id=String(Date.now())+Math.random().toString(16).slice(2);
  const category='Familiy';
  const item={id,hour:Math.floor(start/60),start,duration:30,category,text:'新事项'};
  if(!todos[selectedDate])todos[selectedDate]=[];
  todos[selectedDate].push(item);
  markCalendarDate(selectedDate);
  pendingTodoEditor={date:selectedDate,id};
  saveTodos(todos);
}
function openTodoEditor(date,id){
  const todos=getTodos(),item=(todos[date]||[]).find(t=>t.id===id);
  const editor=document.getElementById('todoEditor'),text=document.getElementById('todoEditText'),cat=document.getElementById('todoEditCategory');
  if(!item||!editor||!text||!cat)return;
  activeTodoEdit={date,id};
  cat.innerHTML=categoryOptions(item.category);
  text.value=item.text;
  editor.classList.add('show');
  const anchor=document.querySelector('.cal-todo[data-todo-id="'+CSS.escape(id)+'"]');
  const rect=(anchor||document.getElementById('calendarPanel')).getBoundingClientRect();
  const top=Math.min(window.innerHeight-editor.offsetHeight-12,Math.max(12,rect.top));
  const left=Math.min(window.innerWidth-editor.offsetWidth-12,Math.max(12,rect.left-8));
  editor.style.top=top+'px';
  editor.style.left=left+'px';
  text.focus();
  text.select();
}
function closeTodoEditor(){
  const editor=document.getElementById('todoEditor');
  if(editor)editor.classList.remove('show');
  activeTodoEdit=null;
}
function saveTodoEditor(){
  if(!activeTodoEdit)return;
  const textEl=document.getElementById('todoEditText'),catEl=document.getElementById('todoEditCategory');
  const text=(textEl&&textEl.value||'').trim();
  const todos=getTodos(),items=todos[activeTodoEdit.date]||[],item=items.find(t=>t.id===activeTodoEdit.id);
  if(!item)return closeTodoEditor();
  if(!text){
    todos[activeTodoEdit.date]=items.filter(t=>t.id!==activeTodoEdit.id);
    if(!todos[activeTodoEdit.date].length)delete todos[activeTodoEdit.date];
  }else{
    item.text=text;
    item.category=TODO_CATEGORIES[catEl&&catEl.value]?catEl.value:item.category;
  }
  closeTodoEditor();
  saveTodos(todos);
}
function deleteCalendarTodo(date,id){const todos=getTodos();todos[date]=(todos[date]||[]).filter(t=>t.id!==id);if(!todos[date].length)delete todos[date];saveTodos(todos)}
function startCalendarTodoDrag(e,date,id,mode,sourceEl=e.currentTarget){
  e.preventDefault();e.stopPropagation();
  const block=sourceEl.closest('.cal-todo'),track=sourceEl.closest('.dv-tl,.wv-col');
  if(!block||!track)return;
  const todos=getTodos(),item=(todos[date]||[]).find(t=>t.id===id);
  if(!item)return;
  const startY=e.clientY,baseStart=item.start||0,baseDuration=item.duration||30;
  let moved=false;
  const snap=n=>Math.round(n/15)*15;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const apply=(nextStart,nextDuration)=>{
    item.start=clamp(snap(nextStart),0,1425);
    item.duration=clamp(snap(nextDuration),15,1440-item.start);
    item.hour=Math.floor(item.start/60);
    block.style.cssText=todoStyle(item);
    const text=block.querySelector('.todo-text');
    if(text)text.title=todoTimeLabel(item)+' '+item.text;
  };
  const move=ev=>{
    const delta=snap((ev.clientY-startY)/Math.max(1,track.scrollHeight)*1440);
    if(Math.abs(ev.clientY-startY)>3)moved=true;
    if(mode==='move')apply(baseStart+delta,baseDuration);
    else if(mode==='top')apply(baseStart+delta,baseDuration-delta);
    else apply(baseStart,baseDuration+delta);
  };
  const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);if(moved)saveTodos(todos);else openTodoEditor(date,id)};
  document.addEventListener('pointermove',move);
  document.addEventListener('pointerup',up,{once:true});
}


function handleCalendarClick(e){
  const actionEl=e.target.closest&&e.target.closest('[data-cal-action]');
  const body=document.getElementById('calBody');
  if(!actionEl||!body||!body.contains(actionEl))return;
  const action=actionEl.dataset.calAction;
  if(action==='select-month'){
    e.stopPropagation();
    calYear=+actionEl.dataset.year;
    calMonth=+actionEl.dataset.month;
    switchView('month');
  }else if(action==='select-week'){
    e.stopPropagation();
    selWeek(actionEl.dataset.date);
  }else if(action==='select-date'){
    e.stopPropagation();
    selDate(actionEl.dataset.date);
  }else if(action==='create-todo'){
    createCalendarTodoAt(e,+actionEl.dataset.start);
  }else if(action==='delete-todo'){
    e.preventDefault();
    e.stopPropagation();
    deleteCalendarTodo(actionEl.dataset.date,actionEl.dataset.todoId);
  }
}

function handleCalendarPointerDown(e){
  if(e.target.closest&&e.target.closest('[data-cal-action="delete-todo"]')){
    e.stopPropagation();
    return;
  }
  const actionEl=e.target.closest&&e.target.closest('[data-cal-action="drag-todo"]');
  const body=document.getElementById('calBody');
  if(!actionEl||!body||!body.contains(actionEl))return;
  startCalendarTodoDrag(e,actionEl.dataset.date,actionEl.dataset.todoId,actionEl.dataset.dragMode,actionEl);
}

function bindCalendarInteractions(){
  const body=document.getElementById('calBody');
  if(!body)return;
  body.addEventListener('click',handleCalendarClick);
  body.addEventListener('pointerdown',handleCalendarPointerDown);
  body.addEventListener('wheel',e=>{
    if(Math.abs(e.deltaY)<12)return;
    e.preventDefault();
    if(calWheelLock)return;
    calWheelLock=true;
    zoomCalendar(e.deltaY>0?1:-1);
    setTimeout(()=>calWheelLock=false,220);
  },{passive:false});
}
bindCalendarInteractions();

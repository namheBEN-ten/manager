const $=id=>document.getElementById(id);
let tasks=JSON.parse(localStorage.getItem("mk_tasks")||"[]");
let selectedDate=new Date().toISOString().slice(0,10), monthCursor=new Date();

const persianFmt=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"long",day:"numeric",weekday:"long"});
function pdate(d){return persianFmt.format(d)}
function localDate(d=new Date()){const z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
function save(){localStorage.setItem("mk_tasks",JSON.stringify(tasks))}
function esc(s){
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function renderTasks(){
 const list=$("taskList"), cal=$("calendarTasks"); list.innerHTML="";cal.innerHTML="";
 tasks.forEach((t,i)=>{
   const real=tasks.indexOf(t), e=document.createElement("div");e.className="task"+(t.done?" done":"");
   e.innerHTML=`<input class="check" type="checkbox" ${t.done?"checked":""} onchange="toggleTask(${real})"><div class="task-body"><div class="task-title">${esc(t.title)}</div><div class="meta">${t.date||"بدون تاریخ"} ${t.time?" · "+t.time:""} · ${t.priority}${t.note?" · "+esc(t.note):""}</div></div><div class="icon">${["📚","🎧","🧹","🛒","🏃"][real%5]}</div><button class="delete" onclick="removeTask(${real})">🗑️</button>`;
   list.appendChild(e);
 });
 const dayTasks=tasks.filter(t=>t.date===selectedDate);
 if(dayTasks.length) dayTasks.forEach(t=>{const x=document.createElement("div");x.className="task";x.innerHTML=`<div class="task-body"><b>${esc(t.title)}</b><div class="meta">${t.time||""}</div></div>`;cal.appendChild(x)});
 else cal.innerHTML='<p class="empty">کاری برای این روز ثبت نشده</p>';
 $("empty").style.display=tasks.length?"none":"block";
 renderStats();
}
function toggleTask(i){tasks[i].done=!tasks[i].done;tasks[i].doneAt=tasks[i].done?localDate():null;save();renderTasks()}
function removeTask(i){tasks.splice(i,1);save();renderTasks()}
function addTask(){
 const title=$("title").value.trim();if(!title)return alert("عنوان کار را وارد کن 🌸");
 const t={title,date:$("date").value,time:$("time").value,priority:$("priority").value,note:$("note").value.trim(),done:false};
 tasks.unshift(t);save(); scheduleAlarm(t,tasks.length+1000); closeTask();renderTasks();
 $("title").value="";$("time").value="";$("note").value="";
}
function openTask(){$("taskModal").classList.add("show");$("date").value=selectedDate}
function closeTask(){$("taskModal").classList.remove("show")}
function renderStats(){
 const total=tasks.length, done=tasks.filter(t=>t.done).length, p=total?Math.round(done*100/total):0;
 $("percent").textContent=p+"%";$("ring").style.setProperty("--p",p+"%");
 $("statText").textContent=`${done} کار از ${total} کار انجام شده`;
 $("total").textContent=total;$("done").textContent=done;$("remaining").textContent=total-done;
 const bars=$("bars");bars.innerHTML="";
 for(let i=6;i>=0;i--){let d=new Date();d.setDate(d.getDate()-i);let n=tasks.filter(t=>t.done&&t.doneAt===localDate(d)).length;let b=document.createElement("div");b.className="bar";b.style.height=Math.max(3,n*28)+"px";b.innerHTML=`<small>${new Intl.DateTimeFormat("fa-IR",{weekday:"narrow"}).format(d)}</small>`;bars.appendChild(b)}
}
function getPersianParts(d){let parts=new Intl.DateTimeFormat("en-US-u-ca-persian",{year:"numeric",month:"numeric",day:"numeric"}).formatToParts(d),o={};parts.forEach(x=>o[x.type]=x.value);return {y:+o.year,m:+o.month,d:+o.day}}
function renderCalendar(){
 const today=new Date(), p=getPersianParts(monthCursor), first=new Date(monthCursor); 
 // find first Gregorian day belonging to current Persian month
 while(getPersianParts(first).m===p.m && getPersianParts(first).d>1) first.setDate(first.getDate()-1);
 while(getPersianParts(first).m!==p.m) first.setDate(first.getDate()-1);
 const monthName=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"long"}).format(monthCursor);
 $("monthTitle").textContent=monthName;
 let start=new Date(first); const jsday=start.getDay(); const saturdayIndex=(jsday+1)%7; start.setDate(start.getDate()-saturdayIndex);
 const grid=$("calendarGrid");grid.innerHTML="";
 for(let i=0;i<42;i++){let d=new Date(start);d.setDate(start.getDate()+i);let pp=getPersianParts(d), cell=document.createElement("button");cell.className="day"+(pp.m!==p.m?" other":"")+(localDate(d)===localDate(today)?" today":"")+(localDate(d)===selectedDate?" selected":"");cell.textContent=new Intl.NumberFormat("fa-IR").format(pp.d);cell.onclick=()=>{selectedDate=localDate(d);renderCalendar();renderTasks()};grid.appendChild(cell)}
}
function moveMonth(dir){monthCursor.setMonth(monthCursor.getMonth()+dir*30);renderCalendar()}
async function requestNotifications(){
 try{
  if(window.Capacitor&&Capacitor.isNativePlatform()){
   const {LocalNotifications}=await import("@capacitor/local-notifications");
   await LocalNotifications.requestPermissions();
   await LocalNotifications.registerActionTypes({types:[]});
   alert("اجازه اعلان درخواست شد. بعد از تأیید، آلارم کارها فعال است 🔔");
  }else alert("آلارم واقعی هنگام اجرای APK فعال می‌شود. در مرورگر فقط نسخه وب اجراست.");
 }catch(e){alert("بعد از نصب Capacitor و sync، اعلان فعال می‌شود.")}
}
async function scheduleAlarm(t,id){
 if(!t.date||!t.time)return;
 try{
  if(window.Capacitor&&Capacitor.isNativePlatform()){
   const {LocalNotifications}=await import("@capacitor/local-notifications");
   const when=new Date(t.date+"T"+t.time+":00");
   if(when>new Date()) await LocalNotifications.schedule({notifications:[{id:id,title:"مدیریت کار 🔔",body:t.title,schedule:{at:when,allowWhileIdle:true},sound:"default",extra:{task:t.title}}]});
  }
 }catch(e){console.log(e)}
}
function saveName(){localStorage.setItem("mk_name",$("userName").value);$("helloName").textContent="سلام "+($("userName").value||"!")+" 💕"}
function saveAppName(){let n=$("appName").value||"مدیریت کار";localStorage.setItem("mk_app",n);document.title=n}
function toggleTheme(){document.documentElement.classList.toggle("dark");localStorage.setItem("mk_dark",document.documentElement.classList.contains("dark"))}
function clearTasks(){if(confirm("همه کارها حذف شوند؟")){tasks=[];save();renderTasks()}}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(b.dataset.page).classList.add("active");if(b.dataset.page==="calendar")renderCalendar()});
$("persianToday").textContent=pdate(new Date());
$("userName").value=localStorage.getItem("mk_name")||"نازنین";$("appName").value=localStorage.getItem("mk_app")||"مدیریت کار";saveName();saveAppName();
if(localStorage.getItem("mk_dark")==="true")document.documentElement.classList.add("dark");
renderCalendar();renderTasks();

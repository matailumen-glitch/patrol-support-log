
function routeRangeText(route){
  if(!route || !route.targets || route.targets.length===0){ return ""; }
  return `${route.targets[0]} ～ ${route.targets[route.targets.length-1]}`;
}

function updateTopRouteRanges(){
  const weekdayEl=document.getElementById("weekdayRangeText");
  const holidayEl=document.getElementById("holidayRangeText");
  if(weekdayEl && typeof ROUTE_CONFIG !== "undefined" && ROUTE_CONFIG.weekday){
    weekdayEl.innerText=routeRangeText(ROUTE_CONFIG.weekday);
  }
  if(holidayEl && typeof ROUTE_CONFIG !== "undefined" && ROUTE_CONFIG.holiday){
    holidayEl.innerText=routeRangeText(ROUTE_CONFIG.holiday);
  }
}

let selectedCourseKey="",selectedCourse=null,currentSessionNo=1,currentSession=null,sessions=[],targets=[],currentTargetIndex=null,histories=[],lastMoveBaseTime=null;
setInterval(updateClock,1000);updateClock();setTodayText();registerServiceWorker();restoreState();
function updateClock(){document.getElementById("clock").innerText=formatTime(new Date())}
function setTodayText(){document.getElementById("todayText").innerText="本日　"+formatJapaneseDate(new Date())}
function updateSessionHeader(){document.getElementById("sessionHeader").innerText=currentSessionNo+"回目巡回"}
function registerServiceWorker(){if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{})}
function showPage(p){["coursePage","sessionStartPage","listPage","detailPage","sessionSummaryPage","finalPage"].forEach(id=>document.getElementById(id).style.display=id===p?"block":"none")}
function selectCourse(k){selectedCourseKey=k;selectedCourse=ROUTE_CONFIG[k];currentSessionNo=1;sessions=[];histories=[];lastMoveBaseTime=null;targets=createTargets(selectedCourse.targets);document.getElementById("selectedCourseName").innerText=selectedCourse.name;document.getElementById("selectedTargetCount").innerText=targets.length+" 箇所";document.getElementById("sessionTitle").innerText="1回目 巡回開始";updateSessionHeader();clearHistory();saveAppState();showPage("sessionStartPage")}
function createTargets(names){return names.map((name,i)=>({id:i+1,name,status:"pending",runs:[],currentStart:null}))}
function backToCourse(){showPage("coursePage")}
function startSession(){const now=new Date();currentSession={no:currentSessionNo,departTime:now,arriveTime:null,targetNames:targets.filter(t=>t.status!=="done").map(t=>t.name)};lastMoveBaseTime=now;addHistory({type:"room",place:"警備室",lines:[`${currentSessionNo}回目　出発　${formatTime(now)}`]});updateSessionHeader();saveAppState();showListPage()}
function showListPage(){document.getElementById("listCourseName").innerText=selectedCourse.name;document.getElementById("listSessionName").innerText=currentSessionNo+"回目巡回";updateSessionHeader();renderTargetList();showPage("listPage")}
function renderTargetList(){const list=document.getElementById("targetList");list.innerHTML="";const remaining=targets.filter(t=>t.status!=="done").length;document.getElementById("remainCount").innerText="未巡回 "+remaining+" 箇所";targets.forEach((target,index)=>{const row=document.createElement("div");row.className="targetRow";const btn=document.createElement("button");btn.className="targetButton "+target.status;let mark="🔴",statusText="未巡回";if(target.status==="running"){mark="🔵";statusText="巡回中"}if(target.status==="done"){mark="🟢";statusText="完了"}btn.innerHTML=`${mark} ${escapeHtml(target.name)}<span class="small">${statusText}${makeTimeSummary(target)}</span>`;if(target.status!=="done")btn.onclick=()=>openTarget(index,false);row.appendChild(btn);if(target.status==="done"){const reBtn=document.createElement("button");reBtn.className="rePatrolButton";reBtn.innerText="再巡回";reBtn.onclick=()=>openTarget(index,true);row.appendChild(reBtn)}list.appendChild(row)})}
function makeTimeSummary(t){if(t.runs.length===0&&t.currentStart)return`　開始 ${formatTime(t.currentStart)}`;if(t.runs.length===0)return"";const last=t.runs[t.runs.length-1];return`<br>${formatTime(last.start)}～${formatTime(last.end)}<br>滞在 ${last.stayText}${t.runs.length>1?"　再巡回あり":""}`}
function openTarget(index,isRePatrol){currentTargetIndex=index;const t=targets[index];if(isRePatrol){t.status="pending";t.currentStart=null;addHistory({type:"place",place:t.name,session:currentSessionNo,lines:[`再巡回選択　${formatTime(new Date())}`]})}document.getElementById("detailName").innerText="📍 "+t.name;document.getElementById("detailStart").innerText=t.currentStart?formatTime(t.currentStart):"--:--:--";document.getElementById("detailEnd").innerText="--:--:--";document.getElementById("detailStay").innerText="--分--秒";if(t.status==="running"){document.getElementById("detailStatus").innerText="巡回中";document.getElementById("detailStatus").className="statusBox statusRunning";setDetailButton("■ 終了","endMode");document.getElementById("cancelButton").style.display="none"}else{document.getElementById("detailStatus").innerText=t.runs.length>0?"再巡回待ち":"未巡回";document.getElementById("detailStatus").className="statusBox";setDetailButton("▶ 開始","startMode");document.getElementById("cancelButton").style.display="block"}saveAppState();showPage("detailPage")}
function setDetailButton(text,cls){const btn=document.getElementById("detailMainButton");btn.innerText=text;btn.className="mainButton "+cls}
function detailMainAction(){const t=targets[currentTargetIndex],now=new Date();if(t.status!=="running"){t.status="running";t.currentStart=now;document.getElementById("detailStart").innerText=formatTime(now);document.getElementById("detailStatus").innerText="巡回中";document.getElementById("detailStatus").className="statusBox statusRunning";setDetailButton("■ 終了","endMode");document.getElementById("cancelButton").style.display="none";if(lastMoveBaseTime){addHistory({type:"move",lines:[`移動時間　${formatDiff(lastMoveBaseTime,now)}`]})}saveAppState()}else{const stayText=formatDiff(t.currentStart,now);t.runs.push({sessionNo:currentSessionNo,start:t.currentStart,end:now,stayText});t.status="done";document.getElementById("detailEnd").innerText=formatTime(now);document.getElementById("detailStay").innerText=stayText;document.getElementById("detailStatus").innerText="完了";document.getElementById("detailStatus").className="statusBox statusDone";const run=t.runs[t.runs.length-1];addHistory({type:"place",place:t.name,session:currentSessionNo,lines:[`　開始時刻　${formatTime(run.start)}`,`　終了時刻　${formatTime(run.end)}`,`　滞在時間　${stayText}`]});t.currentStart=null;lastMoveBaseTime=now;saveAppState();setTimeout(showListPage,700)}}
function finishSession(){const running=targets.find(t=>t.status==="running");if(running){alert("巡回中の箇所があります。終了を押してから警備室へ戻ってください。");return}const now=new Date();if(!currentSession)return;if(lastMoveBaseTime){addHistory({type:"move",lines:[`移動時間　${formatDiff(lastMoveBaseTime,now)}`]})}currentSession.arriveTime=now;currentSession.remainingNames=targets.filter(t=>t.status!=="done").map(t=>t.name);sessions.push(currentSession);addHistory({type:"room",place:"警備室",lines:[`${currentSessionNo}回目　帰着　${formatTime(now)}`]});lastMoveBaseTime=null;saveAppState();showSessionSummary()}
function showSessionSummary(){
  const remain=targets.filter(t=>t.status!=="done");
  document.getElementById("sessionSummaryTitle").innerText=currentSessionNo+"回目 巡回管理";
  document.getElementById("sessionDepart").innerText=formatTime(currentSession.departTime);
  document.getElementById("sessionArrive").innerText=formatTime(currentSession.arriveTime);
  document.getElementById("sessionDuration").innerText=formatDiff(currentSession.departTime,currentSession.arriveTime);
  document.getElementById("sessionRemain").innerText=remain.length+" 箇所";

  const secondArea=document.getElementById("secondSessionArea");
  const nextNo=currentSessionNo+1;
  const courseTitle=selectedCourse ? selectedCourse.name+"コース" : "巡回コース";

  if(remain.length>0){
    const rangeText=`${remain[0].name} ～ ${remain[remain.length-1].name}`;
    const remainNames=remain.map(t=>"🔴 "+escapeHtml(t.name)).join("<br>");
    secondArea.style.display="block";
    secondArea.innerHTML=
      `<div class="managementTitle">${escapeHtml(courseTitle)}（${currentSessionNo}回目巡回済）</div>
       <div class="managementLead">未巡回が残っています。巡回記録を確認後、必要なタイミングで再巡回を開始できます。</div>
       <div class="managementInfoGrid">
         <div class="infoCard">
           <div class="infoLabel">📍 未巡回箇所</div>
           <div class="infoValue dangerValue">${remain.length} 箇所</div>
         </div>
         <div class="infoCard">
           <div class="infoLabel">🎯 今回の巡回範囲</div>
           <div class="infoValue">${escapeHtml(rangeText)}</div>
         </div>
       </div>
       <div class="remainingNames">${remainNames}</div>
       <button class="managementButton green" onclick="prepareSecondSession()">
         <span class="mainText">↻ ${nextNo}回目巡回を開始</span>
         <span class="subText">未巡回箇所から巡回を再開します</span>
       </button>
       <button class="managementButton blue" onclick="showFinalSummary()">
         <span class="mainText">📋 巡回記録を見る</span>
         <span class="subText">${currentSessionNo}回目巡回の記録を確認</span>
       </button>
       <div class="guideSmall">ℹ️「${nextNo}回目巡回を開始」を押すと、未巡回箇所のみを対象に巡回を再開できます。</div>
       <button class="managementButton orange" onclick="finishDutyConfirm()">
         <span class="mainText">× 巡回を終了する</span>
         <span class="subText">確認後、初期画面へ戻ります</span>
       </button>`;
  }else{
    secondArea.style.display="block";
    secondArea.innerHTML=
      `<div class="managementTitle">${escapeHtml(courseTitle)}（${currentSessionNo}回目巡回済）</div>
       <div class="completeBox">未巡回はありません。<br>巡回記録を確認して、巡回業務を終了できます。</div>
       <button class="managementButton blue" onclick="showFinalSummary()">
         <span class="mainText">📋 巡回記録を見る</span>
         <span class="subText">${currentSessionNo}回目巡回の記録を確認</span>
       </button>
       <button class="managementButton orange" onclick="finishDutyConfirm()">
         <span class="mainText">🏁 巡回業務終了</span>
         <span class="subText">確認後、初期画面へ戻ります</span>
       </button>`;
  }

  showPage("sessionSummaryPage");
}

function prepareSecondSession(){currentSessionNo++;targets=targets.filter(t=>t.status!=="done").map((t,i)=>({id:i+1,name:t.name,status:"pending",runs:[],currentStart:null}));lastMoveBaseTime=null;document.getElementById("selectedCourseName").innerText=selectedCourse.name;document.getElementById("selectedTargetCount").innerText=targets.length+" 箇所";document.getElementById("sessionTitle").innerText=currentSessionNo+"回目 巡回開始";updateSessionHeader();saveAppState();showPage("sessionStartPage")}

function getSessionRange(sessionNo){
  const names=[];
  histories.forEach(h=>{
    if(h && h.type==="place" && Number(h.session)===Number(sessionNo) && h.place && !names.includes(h.place)){
      names.push(h.place);
    }
  });
  if(names.length===0){ return "－"; }
  return `${names[0]} ～ ${names[names.length-1]}`;
}

function makeSessionHistoryBlock(session){
  const block=document.createElement("div");
  block.className="sessionHistoryBlock";

  const range=getSessionRange(session.no);
  const title=document.createElement("div");
  title.className="sessionHistoryTitle";
  title.innerHTML=`📋 ${session.no}回目巡回`;
  block.appendChild(title);

  const summary=document.createElement("div");
  summary.className="sessionHistorySummary";
  summary.innerHTML=
    `<div><span>出発</span><strong>${formatTime(session.departTime)}</strong></div>
     <div><span>帰着</span><strong>${formatTime(session.arriveTime)}</strong></div>
     <div><span>巡回時間</span><strong>${formatDiff(session.departTime,session.arriveTime)}</strong></div>
     <div><span>未巡回</span><strong>${session.remainingNames.length} 箇所</strong></div>`;
  block.appendChild(summary);

  const inner=document.createElement("div");
  inner.className="sessionHistoryItems";
  histories
    .filter(h=>{
      if(!h){ return false; }
      if(h.type==="move"){ return Number(h.sessionNo || h.session || h.no || 0)===Number(session.no); }
      if(h.type==="room"){
        return h.lines && h.lines.some(line=>String(line).includes(`${session.no}回目`));
      }
      return Number(h.session)===Number(session.no);
    })
    .forEach(h=>inner.appendChild(createHistoryElement(h)));
  block.appendChild(inner);
  return block;
}

function showFinalSummary(){
  const final=document.getElementById("finalSummary");
  final.innerHTML="";
  const fh=document.getElementById("finalHistory");
  fh.innerHTML="";

  if(sessions.length===0){
    fh.innerHTML=`<div class="historyEmpty">まだ巡回記録はありません</div>`;
  }else{
    sessions.forEach(s=>{
      fh.appendChild(makeSessionHistoryBlock(s));
    });
  }

  saveAppState();
  showPage("finalPage");
}

function addHistory(entry){if(entry && entry.type==='move' && !entry.sessionNo){ entry.sessionNo=currentSessionNo; }
  histories.push(entry);const history=document.getElementById("history"),empty=document.querySelector(".historyEmpty");if(empty)empty.remove();history.appendChild(createHistoryElement(entry))}
function createHistoryElement(entry){const item=document.createElement("div");item.className=entry.type==="move"?"historyMove":"historyBlock";if(entry.type==="move"){item.innerHTML=`<span class="historyLine">${escapeHtml(entry.lines[0])}</span>`;return item}const icon=entry.place==="警備室"?"🏠":"🏭";const title=entry.place==="警備室"?`${icon} ${escapeHtml(entry.place)}`:`${icon} ${escapeHtml(entry.place)}　${entry.session}回目`;item.innerHTML=`<div class="historyTitle">${title}</div>`+entry.lines.map(l=>`<span class="historyLine">${escapeHtml(l)}</span>`).join("");return item}
function clearHistory(){document.getElementById("history").innerHTML=`<div class="historyEmpty">まだ記録はありません</div>`}
function resetConfirm(){if(confirm("現在の巡回記録を消して、最初からやり直しますか？"))resetAll()}

function finishDutyConfirm(){
  const remain=targets.filter(t=>t.status!=="done").length;
  let message="";
  if(remain>0){
    message=`未巡回が ${remain} 箇所 残っています。\n巡回業務を終了して初期画面へ戻りますか？`;
  }else{
    message="巡回業務を終了して初期画面へ戻りますか？";
  }
  if(confirm(message)){
    resetAll();
  }
}

function resetAll(){selectedCourseKey="";selectedCourse=null;currentSessionNo=1;currentSession=null;sessions=[];targets=[];currentTargetIndex=null;histories=[];lastMoveBaseTime=null;clearHistory();clearAppState();document.getElementById("sessionHeader").innerText="巡回開始前";showPage("coursePage")}
function restoreState(){const s=loadAppState();if(!s||!s.selectedCourseKey)return;selectedCourseKey=s.selectedCourseKey;selectedCourse=ROUTE_CONFIG[selectedCourseKey];currentSessionNo=s.currentSessionNo||1;currentSession=s.currentSession;sessions=s.sessions||[];targets=s.targets||[];currentTargetIndex=s.currentTargetIndex;histories=s.histories||[];lastMoveBaseTime=s.lastMoveBaseTime||null;clearHistory();histories.forEach(h=>document.getElementById("history").appendChild(createHistoryElement(h)));updateSessionHeader();if(!currentSession){showPage("coursePage");return}if(currentSession&&currentSession.arriveTime){showSessionSummary();return}showListPage()}
function formatTime(date){if(!(date instanceof Date))date=new Date(date);const h=String(date.getHours()).padStart(2,"0"),m=String(date.getMinutes()).padStart(2,"0"),s=String(date.getSeconds()).padStart(2,"0");return`${h}:${m}:${s}`}
function formatDiff(start,end){if(!(start instanceof Date))start=new Date(start);if(!(end instanceof Date))end=new Date(end);const diffSec=Math.max(0,Math.floor((end-start)/1000)),hour=Math.floor(diffSec/3600),min=Math.floor((diffSec%3600)/60),sec=diffSec%60;return hour>0?`${hour}時間${min}分${sec}秒`:`${min}分${sec}秒`}
function formatJapaneseDate(date){const y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate(),w=["日","月","火","水","木","金","土"][date.getDay()];const reiwa=y-2018;return`令和${toZenkakuNumber(reiwa)}年${m}月${d}日（${w}）`}
function toZenkakuNumber(n){return String(n).replace(/[0-9]/g,s=>"０１２３４５６７８９"[Number(s)])}
function escapeHtml(text){return String(text).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

document.addEventListener("DOMContentLoaded", function(){
  updateTopRouteRanges();
});

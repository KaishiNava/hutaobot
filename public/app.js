const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const welcome = document.getElementById("welcome");
const userName = "Guest";
const DB_NAME = "HutaoBotSession";
const DB_VERSION = 1;
const STORE = "messages";
document.getElementById("sideUser").textContent = userName;

let db;
let toastTimer;
function openDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const database=request.result;
      if(!database.objectStoreNames.contains(STORE)){
        const store=database.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});
        store.createIndex("createdAt","createdAt");
      }
    };
    request.onsuccess=()=>{db=request.result;resolve(db);};
    request.onerror=()=>reject(request.error);
  });
}
function dbAction(mode,action){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);
    const store=tx.objectStore(STORE);
    let result;
    try{result=action(store);}catch(e){reject(e);return;}
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}
async function saveMessage(message){return dbAction("readwrite",store=>store.add({...message,createdAt:Date.now()}));}
async function getMessages(){
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,"readonly").objectStore(STORE).getAll();
    request.onsuccess=()=>resolve(request.result||[]);
    request.onerror=()=>reject(request.error);
  });
}
async function clearStoredMessages(){await dbAction("readwrite",store=>store.clear());}
function scrollBottom(){chatArea.scrollTo({top:chatArea.scrollHeight,behavior:"smooth"});}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function colorClass(color){return ["violet","cyan","green","gold","rose","ember"].includes(color)?color:"default";}

function addUserMessage(text, persist=true){
  welcome.classList.add("hidden");
  const row=document.createElement("div");row.className="message-row user";
  row.innerHTML=`<div class="user-bubble">${escapeHTML(text)}</div>`;
  messages.appendChild(row);scrollBottom();
  if(persist)saveMessage({kind:"user",text}).catch(console.error);
}
function addTyping(){
  const row=document.createElement("div");row.className="message-row";row.id="typingRow";
  row.innerHTML='<div class="bot-avatar">火</div><div class="typing"><span></span><span></span><span></span></div>';
  messages.appendChild(row);scrollBottom();return row;
}
function renderResponse(data,persist=true){
  const row=document.createElement("div");row.className="message-row";
  const content=document.createElement("div");content.className="bot-content";
  let html='<div class="bot-card">';
  if(data.thumbnail)html+=`<div class="thumbnail-wrap"><img class="thumbnail" src="${escapeHTML(data.thumbnail)}" alt="Hutao Bot banner" loading="lazy"></div>`;
  if(data.marquee){const text=escapeHTML(data.marquee);html+=`<div class="marquee-wrap"><div class="marquee"><span>${text}　✦　</span><span>${text}　✦　</span></div></div>`;}
  html+='<div class="card-body"><div class="card-kicker"><span class="pulse"></span> HUTAO CORE <span>·</span> RESPONSE</div>';
  html+=`<h3 class="card-title">${escapeHTML(data.title||"Hutao Bot")}</h3><div class="card-text">${escapeHTML(data.text||"")}</div>`;
  if(data.user)html+=`<div class="user-info"><div class="info-chip"><small>CHAT USER</small><b>${escapeHTML(data.user)}</b></div><div class="info-chip"><small>SESSION STATUS</small><b style="color:#80dba5">● ONLINE</b></div></div>`;
  if(data.stats?.length)html+='<div class="stats">'+data.stats.map(s=>`<div class="stat"><small>${escapeHTML(s.label)}</small><b>${escapeHTML(s.value)}</b></div>`).join("")+'</div>';
  if(data.buttons?.length)html+='<div class="card-buttons">'+data.buttons.map(b=>`<button class="card-button ${colorClass(b.color||data.accent)}" data-command="${escapeHTML(b.command||"")}"><span class="btn-icon">${escapeHTML(b.icon||"✦")}</span><span>${escapeHTML(b.label)}</span><span class="btn-arrow">↗</span></button>`).join("")+'</div>';
  html+='</div></div>';content.innerHTML=html;
  row.innerHTML='<div class="bot-avatar">火</div>';row.appendChild(content);messages.appendChild(row);scrollBottom();
  if(persist)saveMessage({kind:"bot",response:data}).catch(console.error);
}
function renderStoredMessage(item){
  if(item.kind==="user")addUserMessage(item.text,false);
  else if(item.kind==="bot")renderResponse(item.response,false);
}
async function sendMessage(text){
  text=String(text||"").trim();if(!text)return;
  input.value="";addUserMessage(text);
  const typing=addTyping();
  const delay=400+Math.random()*600;
  try{
    const [response]=await Promise.all([
      fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,user:userName})}),
      new Promise(resolve=>setTimeout(resolve,delay))
    ]);
    const data=await response.json();typing.remove();
    if(!response.ok)throw new Error(data.error||"Request failed");
    renderResponse(data.response);
  }catch(err){
    typing.remove();
    renderResponse({title:"Connection issue",text:err.message||"Tidak bisa terhubung ke server.",accent:"rose",buttons:[{label:"Coba lagi",command:text,icon:"↻"}]});
  }
}
function showToast(message){
  const toast=document.getElementById("toast");toast.textContent=message;toast.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2600);
}
function openSettings(){document.getElementById("settingsModal").hidden=false;}
function closeSettings(){document.getElementById("settingsModal").hidden=true;}
async function clearConversation(){
  messages.innerHTML="";await clearStoredMessages();welcome.classList.remove("hidden");closeSettings();showToast("Conversation cleared");
}
async function clearLocalData(){
  if(!confirm("Hapus semua riwayat chat dan data lokal Hutao Bot di browser ini?"))return;
  await clearStoredMessages();
  try{localStorage.clear();sessionStorage.clear();}catch{}
  closeSettings();messages.innerHTML="";welcome.classList.remove("hidden");
  if("caches" in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}
  showToast("Local data cleared");
}
async function exportConversation(){
  const data=await getMessages();
  const blob=new Blob([JSON.stringify({app:"Hutao Bot",exportedAt:new Date().toISOString(),messages:data},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="hutao-chat-export.json";a.click();URL.revokeObjectURL(url);
  showToast("Chat export downloaded");
}
form.addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value);});
document.addEventListener("click",e=>{
  const target=e.target.closest("[data-command]");
  if(target){const command=target.dataset.command;if(command)sendMessage(command);}
});
document.getElementById("newChat").addEventListener("click",clearConversation);
document.getElementById("settingsButton").addEventListener("click",openSettings);
document.getElementById("closeSettings").addEventListener("click",closeSettings);
document.getElementById("settingsModal").addEventListener("click",e=>{if(e.target.id==="settingsModal")closeSettings();});
document.getElementById("clearChat").addEventListener("click",clearConversation);
document.getElementById("clearCache").addEventListener("click",clearLocalData);
document.getElementById("exportChat").addEventListener("click",exportConversation);
input.addEventListener("keydown",e=>{if(e.key==="Escape")input.value="";});
(async()=>{
  try{
    await openDB();
    const history=await getMessages();
    if(history.length){welcome.classList.add("hidden");history.forEach(renderStoredMessage);scrollBottom();}
  }catch(error){console.warn("IndexedDB unavailable; chat will be temporary.",error);showToast("Local session storage unavailable");}
})();

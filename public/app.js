const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const welcome = document.getElementById("welcome");
let userName = "Guest";
let sessionToken = null;
let accountProfile = null;
const BOT = { name: "Hutao Bot", version: "1.0.0", description: "Asisten digital untuk menjelajahi tools, downloader, informasi bot, dan fitur komunitas melalui antarmuka chat.", runtimeStarted: Date.now(), role: "USER FREE" };
let selectedImage = null;
let replyTarget = null;
const DB_NAME = "HutaoBotSession";
const DB_VERSION = 2;
const STORE = "messages";
const SESSION_STORE = "session";
document.getElementById("sideUser").textContent = userName;

let db;
let dbPromise;
let toastTimer;

// Open IndexedDB once and await readiness before every transaction.
// This prevents "Cannot read properties of undefined (reading 'transaction')"
// when a user submits a command before the asynchronous DB open finishes.
function openDB(){
  if(db && db.objectStoreNames.contains(STORE) && db.objectStoreNames.contains(SESSION_STORE)) {
    return Promise.resolve(db);
  }
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve,reject)=>{
    if(!("indexedDB" in window)) {
      reject(new Error("IndexedDB tidak didukung oleh browser ini."));
      return;
    }
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const database=request.result;
      if(!database.objectStoreNames.contains(STORE)){
        const store=database.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});
        store.createIndex("createdAt","createdAt");
      }
      if(!database.objectStoreNames.contains(SESSION_STORE)) {
        database.createObjectStore(SESSION_STORE,{keyPath:"key"});
      }
    };
    request.onsuccess=()=>{
      db=request.result;
      db.onversionchange=()=>{db.close();db=null;dbPromise=null;};
      resolve(db);
    };
    request.onerror=()=>{dbPromise=null;reject(request.error||new Error("Gagal membuka IndexedDB."));};
    request.onblocked=()=>console.warn("IndexedDB upgrade blocked by another open tab.");
  });
  return dbPromise;
}
async function saveSession(session){
  const database=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(SESSION_STORE,"readwrite");
    const store=tx.objectStore(SESSION_STORE);
    if(session)store.put({key:"active",token:session.token,user:session.user});
    else store.delete("active");
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error("Session transaction aborted."));
  });
}
async function loadSession(){
  const database=await openDB();
  return new Promise((resolve,reject)=>{
    const req=database.transaction(SESSION_STORE,"readonly").objectStore(SESSION_STORE).get("active");
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
}
async function dbAction(mode,action){
  const database=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(STORE,mode);
    const store=tx.objectStore(STORE);
    let result;
    try{result=action(store);}catch(e){reject(e);return;}
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error("IndexedDB transaction aborted."));
  });
}
async function saveMessage(message){return dbAction("readwrite",store=>store.add({...message,createdAt:Date.now()}));}
async function getMessages(){
  const database=await openDB();
  return new Promise((resolve,reject)=>{
    const request=database.transaction(STORE,"readonly").objectStore(STORE).getAll();
    request.onsuccess=()=>resolve(request.result||[]);
    request.onerror=()=>reject(request.error);
  });
}
async function clearStoredMessages(){await dbAction("readwrite",store=>store.clear());}
function scrollBottom(){chatArea.scrollTo({top:chatArea.scrollHeight,behavior:"smooth"});}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function colorClass(color){return ["violet","cyan","green","gold","rose","ember"].includes(color)?color:"default";}

function setReply(item){
  replyTarget = item || null;
  const box=document.getElementById("replyPreview");
  if(!replyTarget){box.hidden=true;box.innerHTML="";return;}
  box.hidden=false;box.innerHTML=`<span>REPLYING TO</span><b>${escapeHTML(replyTarget.kind==="user"?"You":BOT.name)}</b><small>${escapeHTML(replyTarget.text || replyTarget.response?.title || "Image")}</small><button type="button" id="cancelReply" aria-label="Cancel reply">×</button>`;
  document.getElementById("cancelReply").onclick=()=>setReply(null);
}
function addUserMessage(text, persist=true, image=null, reply=null){
  welcome.classList.add("hidden");
  const row=document.createElement("div");row.className="message-row user";
  row.innerHTML=`<div class="message-tools"><button class="reply-action" title="Reply" aria-label="Reply">↶</button></div><div class="user-bubble">${image?`<img class="chat-image" src="${image}" alt="Attached image">`:""}${escapeHTML(text)}</div>`;
  row.querySelector(".reply-action").onclick=()=>{setReply({kind:"user",text:text||"Image"});input.focus();};
  messages.appendChild(row);scrollBottom();
  if(persist)saveMessage({kind:"user",text,image,reply}).catch(console.error);
}
function botAvatar(){const src=localStorage.getItem("hutaoCustomLogo")||"/logo.png";return `<div class="bot-avatar"><img src="${escapeHTML(src)}" alt="Hutao Bot"></div>`;}
function addTyping(){
  const row=document.createElement("div");row.className="message-row";row.id="typingRow";
  row.innerHTML=botAvatar()+'<div class="typing"><span></span><span></span><span></span></div>';
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
  if(data.botInfo)html+=`<div class="bot-profile-grid"><div><small>BOT NAME</small><b>${escapeHTML(data.botInfo.name||BOT.name)}</b></div><div><small>VERSION</small><b>${escapeHTML(data.botInfo.version||BOT.version)}</b></div><div><small>USER ROLE</small><b class="role-badge">${escapeHTML(data.botInfo.role||BOT.role)}</b></div><div><small>RUNTIME</small><b>${escapeHTML(data.botInfo.runtime||"Starting…")}</b></div></div>`;
  if(data.image)html+=`<img class="chat-image response-image" src="${escapeHTML(data.image)}" alt="Bot image">`;
  if(data.network)html+='<div class="network-visual"><div class="network-head"><span class="network-dot"></span><b>LIVE NETWORK DIAGNOSTICS</b><span class="network-live">LIVE</span></div><div class="network-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><small>SERVER PROCESS · REAL-TIME SNAPSHOT</small></div>';
  if(data.stats?.length)html+='<div class="stats '+(data.network?'network-stats':'')+'">'+data.stats.map(s=>`<div class="stat"><small>${escapeHTML(s.label)}</small><b>${escapeHTML(s.value)}</b></div>`).join("")+'</div>';
  if(data.buttons?.length)html+='<div class="card-buttons">'+data.buttons.map(b=>`<button class="card-button ${colorClass(b.color||data.accent)} ${b.wide?"wide-button":""}" data-command="${escapeHTML(b.command||"")}"><span class="btn-icon">${escapeHTML(b.icon||"✦")}</span><span class="btn-label">${escapeHTML(b.label)}</span><span class="btn-arrow">↗</span></button>`).join("")+'</div>';
  html+='</div></div>';content.innerHTML=html;
  row.innerHTML=botAvatar()+'<div class="message-tools"><button class="reply-action" title="Reply" aria-label="Reply">↶</button></div>';row.querySelector(".reply-action").onclick=()=>{setReply({kind:"bot",text:data.title||data.text||"Bot response"});input.focus();};row.appendChild(content);messages.appendChild(row);scrollBottom();
  if(persist)saveMessage({kind:"bot",response:data}).catch(console.error);
}
function renderStoredMessage(item){
  if(item.kind==="user")addUserMessage(item.text,false,item.image||null,item.reply||null);
  else if(item.kind==="bot")renderResponse(item.response,false);
}
async function sendMessage(text){
  text=String(text||"").trim();if(!text&&!selectedImage)return;
  const image=selectedImage;const reply=replyTarget;
  input.value="";selectedImage=null;document.getElementById("imageInput").value="";document.getElementById("attachButton").classList.remove("has-file");setReply(null);
  addUserMessage(text||"",true,image,reply);
  const typing=addTyping();
  const delay=400+Math.random()*600;
  try{
    const [response]=await Promise.all([
      fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,user:userName,sessionToken,image,reply:reply?{kind:reply.kind,text:reply.text}:null,botInfo:{...BOT,runtime:formatRuntime(Date.now()-BOT.runtimeStarted)}})}),
      new Promise(resolve=>setTimeout(resolve,delay))
    ]);
    const data=await response.json();typing.remove();
    if(!response.ok)throw new Error(data.error||"Request failed");
    if(Object.prototype.hasOwnProperty.call(data,"session")){if(data.session){sessionToken=data.session.token;accountProfile=data.session.user;userName=accountProfile.username||"Guest";}else{sessionToken=null;accountProfile=null;userName="Guest";}await saveSession(data.session);document.getElementById("sideUser").textContent=userName;}
    renderResponse(data.response);
  }catch(err){
    typing.remove();
    renderResponse({title:"Connection issue",text:err.message||"Tidak bisa terhubung ke server.",accent:"rose",buttons:[{label:"Coba lagi",command:text,icon:"↻"}]});
  }
}
function formatRuntime(ms){const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return `${d}d ${h}h ${m}m`;}
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
document.getElementById("attachButton").addEventListener("click",()=>document.getElementById("imageInput").click());
document.getElementById("imageInput").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){showToast("Pilih file gambar ya");return;}if(file.size>5*1024*1024){showToast("Ukuran gambar maksimal 5 MB");e.target.value="";return;}selectedImage=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});document.getElementById("attachButton").classList.add("has-file");showToast("Gambar siap dikirim");});
document.getElementById("logoInput").addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){showToast("Pilih gambar logo");return;}const reader=new FileReader();reader.onload=()=>{localStorage.setItem("hutaoCustomLogo",reader.result);applyLogo(reader.result);showToast("Logo 1:1 diperbarui");};reader.readAsDataURL(file);});
function applyLogo(src){document.querySelectorAll(".brand-image").forEach(el=>{el.innerHTML=`<img src="${src}" alt="Hutao logo">`;});const orb=document.querySelector(".welcome-orb");if(orb){orb.innerHTML=`<img src="${src}" alt="Hutao Bot"><i></i>`;}document.querySelectorAll(".bot-avatar").forEach(el=>{el.innerHTML=`<img src="${src}" alt="Hutao Bot">`;});}

input.addEventListener("keydown",e=>{if(e.key==="Escape")input.value="";});
const savedLogo=localStorage.getItem("hutaoCustomLogo");if(savedLogo)applyLogo(savedLogo);
(async()=>{
  try{
    await openDB();
    const savedSession=await loadSession();if(savedSession){sessionToken=savedSession.token;accountProfile=savedSession.user;userName=accountProfile?.username||"Guest";document.getElementById("sideUser").textContent=userName;}
    const history=await getMessages();
    if(history.length){welcome.classList.add("hidden");history.forEach(renderStoredMessage);scrollBottom();}
  }catch(error){console.warn("IndexedDB unavailable; chat will be temporary.",error);showToast("Local session storage unavailable");}
})();

// Daily 17:00 WIB greeting. Delivered to open web sessions; browser polling is needed for live display.
async function checkDailyGreeting(){
  try{
    const response=await fetch('/api/daily-message',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json();
    if(!data.active)return;
    const key='hutaoDailyGreeting:'+data.day;
    if(localStorage.getItem(key))return;
    localStorage.setItem(key,'sent');
    renderResponse(data.message);
  }catch(error){console.debug('Daily greeting check failed',error);}
}
checkDailyGreeting();
setInterval(checkDailyGreeting,30000);

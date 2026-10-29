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
  if(/^\.daftar(?:\s|$)/i.test(text)){showAuth('register');showToast('Daftar melalui form web ya');return;}
  if(/^\.login(?:\s|$)/i.test(text)){showAuth('login');showToast('Login melalui form web ya');return;}
  if(/^\.logout$/i.test(text)&&sessionToken){try{await fetch('/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${sessionToken}`}});}catch{}sessionToken=null;accountProfile=null;userName='Guest';await saveSession(null);updateAccountUI();showToast('Logout berhasil');return;}
  const image=selectedImage;const reply=replyTarget;
  input.value="";selectedImage=null;document.getElementById("imageInput").value="";document.getElementById("attachButton").classList.remove("has-file");setReply(null);
  if (communityMode) {
    if (!sessionToken) { showAuth(); showToast("Login dulu untuk mengirim pesan komunitas"); return; }
    try {
      const r=await fetch('/api/community/messages',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${sessionToken}`},body:JSON.stringify({text,image,room:activeCommunityRoom})});
      const d=await r.json(); if(!r.ok)throw new Error(d.error||'Gagal mengirim pesan');
      await loadCommunityMessages();
    } catch(e) { showToast(e.message); }
    return;
  }
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
    const savedSession=await loadSession();if(savedSession){sessionToken=savedSession.token;accountProfile=savedSession.user;userName=accountProfile?.username||"Guest";document.getElementById("sideUser").textContent=userName;updateAccountUI(); try{const me=await fetch("/api/auth/me",{headers:{Authorization:`Bearer ${sessionToken}`}});if(me.ok){const md=await me.json();accountProfile=md.user;userName=md.user.username;updateAccountUI();}else{sessionToken=null;accountProfile=null;await saveSession(null);}}catch{}}
    const history=await getMessages();
    if(history.length){welcome.classList.add("hidden");history.forEach(renderStoredMessage);scrollBottom();}
    const page=document.body.dataset.page || (location.pathname.endsWith('community.html')?'community':location.pathname.endsWith('hutao.html')?'hutao':'home');
    document.querySelectorAll('[data-page-link]').forEach(link=>link.classList.toggle('active',link.dataset.pageLink===page));
    if(sessionToken && page==='community')openCommunity();
    else if(sessionToken && page==='hutao')openBotChat();
    else if(sessionToken && page==='profile')openProfilePage();
    if(!sessionToken){showAuth('login');document.getElementById('authClose').hidden=true;}
  }catch(error){console.warn("IndexedDB unavailable; chat will be temporary.",error);showToast("Local session storage unavailable");showAuth('login');document.getElementById('authClose').hidden=true;}
})();


// Web account + shared community workspace. Private bot history remains in this browser's IndexedDB.
let authMode = 'login';
let communityMode = false;
let activeCommunityRoom = 'general';
let communityTimer = null;
let lastCommunityId = null;
function updateAccountUI(){
  const sideUser=document.getElementById('sideUser'); const role=document.getElementById('sideRole'); const avatar=document.getElementById('sideAvatar');
  if(sideUser)sideUser.textContent=accountProfile?.username||'Guest User';
  if(role)role.textContent=accountProfile?`${accountProfile.role} · Level ${accountProfile.level||1}`:'Guest · local';
  if(avatar)avatar.textContent=(accountProfile?.username||'G').slice(0,1).toUpperCase();
}
function showAuth(mode=authMode){authMode=mode;document.getElementById('authBackdrop').hidden=false;setAuthMode(mode);}
function closeAuth(){document.getElementById('authBackdrop').hidden=true;}
function setAuthMode(mode){
  authMode=mode;const register=mode==='register';
  document.getElementById('authTitle').textContent=register?'Create your account':'Welcome back';
  document.getElementById('authDesc').textContent=register?'Daftar sekali, lalu gunakan Hutao dan komunitas dengan profil yang sama.':'Login untuk memulihkan akun dan bergabung ke komunitas.';
  document.getElementById('usernameField').hidden=!register;
  document.getElementById('authUsername').required=register;
  document.getElementById('authPassword').autocomplete=register?'new-password':'current-password';
  document.getElementById('authSubmit').textContent=register?'Buat akun':'Login ke Hutao';
  document.getElementById('loginTab').classList.toggle('active',!register);document.getElementById('registerTab').classList.toggle('active',register);
  document.getElementById('authError').textContent='';
}
async function authSubmit(e){
  e.preventDefault();const error=document.getElementById('authError');error.textContent='';
  const payload={email:document.getElementById('authEmail').value.trim(),password:document.getElementById('authPassword').value};
  if(authMode==='register')payload.username=document.getElementById('authUsername').value.trim();
  const button=document.getElementById('authSubmit');button.disabled=true;button.textContent='Please wait…';
  try{const r=await fetch(`/api/auth/${authMode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Authentication failed');
    sessionToken=d.session.token;accountProfile=d.session.user;userName=accountProfile.username;await saveSession(d.session);updateAccountUI();closeAuth();document.getElementById('authClose').hidden=false;showToast(authMode==='register'?'Akun berhasil dibuat!':'Login berhasil!');
    if(communityMode)await loadCommunityMessages();
  }catch(err){error.textContent=err.message;}finally{button.disabled=false;button.textContent=authMode==='register'?'Buat akun':'Login ke Hutao';}
}
function openCommunity(){
  if(!sessionToken){showAuth('login');return;}
  communityMode=true;welcome.classList.add('hidden');messages.hidden=true;document.getElementById('profileView').hidden=true;document.getElementById('communityView').hidden=false;
  input.placeholder='Message the Hutao community…';document.getElementById('breadcrumb').innerHTML='<span>Workspace</span><i>/</i><b>Community</b>';
  document.querySelectorAll('.side-item').forEach(x=>x.classList.remove('active'));document.getElementById('communityButton').classList.add('active');
  loadCommunityMessages();clearInterval(communityTimer);communityTimer=setInterval(loadCommunityMessages,3500);
}
function openBotChat(){communityMode=false;clearInterval(communityTimer);document.getElementById('communityView').hidden=true;document.getElementById('profileView').hidden=true;messages.hidden=false;input.placeholder='Message Hutao Bot... try .menu';document.getElementById('breadcrumb').innerHTML='<span>Workspace</span><i>/</i><b>Chat</b>';document.querySelectorAll('.side-item').forEach(x=>x.classList.remove('active'));document.getElementById('newChat').classList.add('active');}
async function loadCommunityMessages(){
  if(!communityMode||!sessionToken)return;
  try{const r=await fetch(`/api/community/messages?room=${encodeURIComponent(activeCommunityRoom)}`,{headers:{Authorization:`Bearer ${sessionToken}`},cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal memuat komunitas');
    const box=document.getElementById('communityMessages');const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<100;
    box.innerHTML=(d.messages||[]).map(m=>`<article class="community-message ${m.user_id===accountProfile?.id?'mine':''}"><div class="community-message-head"><b>${escapeHTML(m.username)}</b><span>${escapeHTML(m.role||'USER FREE')}</span><time>${new Date(m.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</time></div>${m.image?`<img class="community-image" src="${escapeHTML(m.image)}" alt="Shared image" loading="lazy">`:''}${m.text?`<p>${escapeHTML(m.text)}</p>`:''}</article>`).join('');
    const status=document.getElementById('communityStatus');status.classList.remove('is-error');status.textContent=(d.messages||[]).length?'':'Belum ada pesan di ruang ini. Jadilah yang pertama mengobrol!';
    if(atBottom)box.scrollTop=box.scrollHeight;
  }catch(e){
    console.warn('Community refresh:',e.message);
    const status=document.getElementById('communityStatus');
    status.textContent=/hutao_community_messages|schema cache|does not exist/i.test(e.message) ? 'Tabel komunitas belum terpasang di Supabase. Jalankan supabase/schema.sql lalu reload schema API.' : `Komunitas gagal dimuat: ${e.message}`;
    status.classList.add('is-error');
  }
}
document.getElementById('authOpen').addEventListener('click',()=>showAuth());
document.getElementById('authClose').addEventListener('click',()=>{if(!sessionToken){showToast('Login atau daftar dulu untuk membuka Hutao Community.');return;}closeAuth();});
document.getElementById('authBackdrop').addEventListener('click',e=>{if(e.target.id==='authBackdrop')closeAuth();});
document.getElementById('loginTab').addEventListener('click',()=>setAuthMode('login'));
document.getElementById('registerTab').addEventListener('click',()=>setAuthMode('register'));
document.getElementById('authForm').addEventListener('submit',authSubmit);
document.getElementById('communityButton').addEventListener('click',openCommunity);
document.getElementById('mobileProfileButton').addEventListener('click',openProfilePage);
document.getElementById('newChat').addEventListener('click',()=>{openBotChat();clearConversation();});
function openProfilePage(){
  if(!sessionToken||!accountProfile){showAuth('login');return;}
  communityMode=false;clearInterval(communityTimer);welcome.classList.add('hidden');messages.hidden=true;document.getElementById('communityView').hidden=true;document.getElementById('profileView').hidden=false;
  const u=accountProfile,exp=Number(u.exp||0),level=Math.floor(exp/100)+1,progress=exp%100;
  document.getElementById('profilePageName').textContent=u.username||'Hutao User';document.getElementById('profileAvatarLarge').textContent=(u.username||'H').slice(0,1).toUpperCase();
  document.getElementById('profileRolePill').textContent=u.role||'USER FREE';document.getElementById('profileUsername').textContent=u.username||'—';document.getElementById('profileEmail').textContent=u.email||'—';document.getElementById('profileLevel').textContent=String(level);document.getElementById('profileExp').textContent=String(exp);document.getElementById('profileProgressText').textContent=`${progress} / 100 EXP`;document.getElementById('profileProgressBar').style.width=`${progress}%`;
  document.getElementById('breadcrumb').innerHTML='<span>Workspace</span><i>/</i><b>My Profile</b>';document.querySelectorAll('.side-item').forEach(x=>x.classList.remove('active'));document.getElementById('profileButton').classList.add('active');
}
document.getElementById('profileButton').addEventListener('click',openProfilePage);
document.getElementById('profileBackChat').addEventListener('click',openBotChat);
document.getElementById('profileLogout').addEventListener('click',async()=>{if(sessionToken){try{await fetch('/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${sessionToken}`}});}catch{}}sessionToken=null;accountProfile=null;userName='Guest';await saveSession(null);updateAccountUI();document.getElementById('profileView').hidden=true;showAuth('login');document.getElementById('authClose').hidden=true;});
// Require web-based authentication for account/community features; guest can still explore bot chat.

// Community room tabs: each room has its own shared server history.
const roomMeta={general:['# general','Obrolan umum semua anggota Hutao.'], 'bot-talk':['# bot-talk','Diskusi command, fitur, dan ide bot.'], media:['# media','Bagikan gambar dan media komunitas.']};
document.querySelectorAll('.room-tab').forEach(tab=>tab.addEventListener('click',()=>{
  activeCommunityRoom=tab.dataset.room||'general';
  document.querySelectorAll('.room-tab').forEach(x=>x.classList.toggle('active',x===tab));
  const meta=roomMeta[activeCommunityRoom]||roomMeta.general;
  document.getElementById('roomTitle').textContent=meta[0];document.getElementById('roomDescription').textContent=meta[1];
  document.getElementById('communityMessages').innerHTML='';loadCommunityMessages();
}));

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

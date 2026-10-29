const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const welcome = document.getElementById("welcome");
const userName = "Guest";
document.getElementById("sideUser").textContent = userName;

function scrollBottom(){ chatArea.scrollTo({top: chatArea.scrollHeight, behavior:"smooth"}); }
function escapeHTML(value){return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function addUserMessage(text){
  welcome.classList.add("hidden");
  const row=document.createElement("div"); row.className="message-row user";
  row.innerHTML=`<div class="user-bubble">${escapeHTML(text)}</div>`;
  messages.appendChild(row); scrollBottom();
}
function addTyping(){
  const row=document.createElement("div"); row.className="message-row"; row.id="typingRow";
  row.innerHTML='<div class="bot-avatar">火</div><div class="typing"><span></span><span></span><span></span></div>';
  messages.appendChild(row); scrollBottom(); return row;
}
function colorClass(color){return ["violet","cyan","green","gold","rose","ember"].includes(color)?color:"default";}
function renderResponse(data){
  const row=document.createElement("div"); row.className="message-row";
  const content=document.createElement("div"); content.className="bot-content";
  let html='<div class="bot-card">';
  if(data.thumbnail){
    html+=`<div class="thumbnail-wrap"><img class="thumbnail" src="${escapeHTML(data.thumbnail)}" alt="Hutao Bot banner" loading="lazy"></div>`;
  }
  if(data.marquee){
    const text=escapeHTML(data.marquee);
    html+=`<div class="marquee-wrap"><div class="marquee"><span>${text}　✦　</span><span>${text}　✦　</span></div></div>`;
  }
  html+='<div class="card-body">';
  html+='<div class="card-kicker"><span class="pulse"></span> HUTAO CORE <span>·</span> RESPONSE</div>';
  html+=`<h3 class="card-title">${escapeHTML(data.title||"Hutao Bot")}</h3>`;
  html+=`<div class="card-text">${escapeHTML(data.text||"")}</div>`;
  if(data.user){
    html+=`<div class="user-info"><div class="info-chip"><small>CHAT USER</small><b>${escapeHTML(data.user)}</b></div><div class="info-chip"><small>SESSION STATUS</small><b style="color:#80dba5">● ONLINE</b></div></div>`;
  }
  if(data.stats?.length){
    html+='<div class="stats">'+data.stats.map(s=>`<div class="stat"><small>${escapeHTML(s.label)}</small><b>${escapeHTML(s.value)}</b></div>`).join("")+'</div>';
  }
  if(data.buttons?.length){
    html+='<div class="card-buttons">'+data.buttons.map(b=>`<button class="card-button ${colorClass(b.color||data.accent)}" data-command="${escapeHTML(b.command||"")}"><span class="btn-icon">${escapeHTML(b.icon||"✦")}</span><span>${escapeHTML(b.label)}</span><span class="btn-arrow">↗</span></button>`).join("")+'</div>';
  }
  html+='</div></div>';
  content.innerHTML=html;
  row.innerHTML='<div class="bot-avatar">火</div>'; row.appendChild(content);
  messages.appendChild(row); scrollBottom();
}
async function sendMessage(text){
  text=String(text||"").trim(); if(!text) return;
  input.value=""; addUserMessage(text);
  const typing=addTyping();
  const delay=450+Math.random()*650;
  try{
    const [response]=await Promise.all([
      fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,user:userName})}),
      new Promise(resolve=>setTimeout(resolve,delay))
    ]);
    const data=await response.json();
    typing.remove();
    if(!response.ok) throw new Error(data.error||"Request failed");
    renderResponse(data.response);
  }catch(err){
    typing.remove();
    renderResponse({title:"Connection issue",text:err.message||"Tidak bisa terhubung ke server.",accent:"rose",buttons:[{label:"Coba lagi",command:text,icon:"↻"}]});
  }
}
form.addEventListener("submit",e=>{e.preventDefault();sendMessage(input.value);});
document.addEventListener("click",e=>{
  const target=e.target.closest("[data-command]");
  if(target){const command=target.dataset.command;if(command)sendMessage(command);}
});
document.getElementById("newChat").addEventListener("click",()=>{
  messages.innerHTML="";welcome.classList.remove("hidden");input.focus();
});
input.addEventListener("keydown",e=>{if(e.key==="Escape")input.value="";});

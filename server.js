const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;
const COMMANDS_DIR = path.join(__dirname, "commands");
app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "public")));
function loadCommands(){const commands=new Map();for(const file of fs.readdirSync(COMMANDS_DIR).filter(f=>f.endsWith(".js"))){delete require.cache[require.resolve(path.join(COMMANDS_DIR,file))];const plugin=require(path.join(COMMANDS_DIR,file));for(const name of plugin.names||[plugin.name])if(name)commands.set(name.toLowerCase(),plugin);}return commands;}
app.get("/api/health",(_req,res)=>res.json({ok:true,name:"Hutao Bot",version:"1.0.0",runtime:process.uptime()}));
function wibClock(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
}
app.get("/api/daily-message",(_req,res)=>{
  const now=wibClock();
  const day=`${now.year}-${now.month}-${now.day}`;
  // Small delivery window allows browsers polling every 30 seconds to catch the 17:00 WIB event.
  const active=Number(now.hour)===17 && Number(now.minute)<=2;
  res.json({active,day,timeZone:"Asia/Jakarta",message:{title:"Selamat Sore 🌇",text:"Selamat sore! Semoga hari ini sudah memberi banyak hal baik untukmu. Kalau mulai lelah, jangan lupa istirahat sebentar, tarik napas, minum air, dan beri waktu untuk diri sendiri. Kamu nggak harus menyelesaikan semuanya sekaligus. Pelan-pelan saja—semoga soremu terasa hangat dan tenang. ✨",accent:"ember",stats:[{label:"DAILY GREETING",value:"17:00 WIB"}]}});
});

app.post("/api/chat",async(req,res)=>{const text=String(req.body?.text||"").trim();const user=String(req.body?.user||"Guest").slice(0,32);const image=typeof req.body?.image==="string"&&req.body.image.startsWith("data:image/")?req.body.image:null;const reply=req.body?.reply||null;const botInfo=req.body?.botInfo||{name:"Hutao Bot",version:"1.0.0",role:"USER FREE"};if(!text&&!image)return res.status(400).json({error:"Pesan atau gambar tidak boleh kosong."});
const commands=loadCommands();const isCommand=text.startsWith(".");const commandName=isCommand?text.slice(1).split(/\s+/)[0].toLowerCase():"";const args=isCommand?text.slice(1+commandName.length).trim().split(/\s+/).filter(Boolean):[];
try{let response;const plugin=commands.get(commandName);if(plugin)response=await plugin.execute({text,args,user,commands,botInfo,reply,image});else if(isCommand)response={type:"card",title:"Command tidak ditemukan",text:`Aku belum mengenali command .${commandName}. Coba ketik .help untuk melihat daftar command.`,accent:"rose",buttons:[{label:"Buka Help",command:".help",icon:"⌘"}]};else response={type:"card",title:image?"Image received":"Hutao Bot",text:image?`Gambar berhasil diterima${text?` dengan pesan: ${text}`:"."} ${reply?`(membalas ${reply.kind||"pesan"})`:""}`:`Hai ${user}! Aku menerima pesanmu. Untuk mulai menjelajahi fitur, ketik .menu ya.`,image,accent:"ember",buttons:[{label:"Menu Utama",command:".menu",icon:"✦"}]};if(response&&typeof response==="object"){response.botInfo=botInfo;}res.json({response});}catch(error){console.error(error);res.status(500).json({error:"Ada kendala saat menjalankan command."});}});
app.listen(PORT,()=>console.log(`Hutao Bot is running on port ${PORT}`));

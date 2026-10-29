const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
const app = express();
const PORT = process.env.PORT || 3000;
const COMMANDS_DIR = path.join(__dirname, 'commands');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const dbReady = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
async function db(pathname, options = {}) {
  if (!dbReady()) throw new Error('Akun database belum dikonfigurasi. Tambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment server.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: options.prefer || 'return=representation', ...(options.headers || {}) }
  });
  const body = await response.text();
  let data; try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) throw new Error(data?.message || data?.hint || 'Supabase request failed');
  return data;
}
async function loadCommands() {
  const commands = new Map();
  for (const file of fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'))) {
    delete require.cache[require.resolve(path.join(COMMANDS_DIR, file))];
    const plugin = require(path.join(COMMANDS_DIR, file));
    for (const name of plugin.names || [plugin.name]) if (name) commands.set(name.toLowerCase(), plugin);
  }
  return commands;
}
function parseCommaArgs(raw) { return String(raw || '').split(',').map(v => v.trim()); }
function publicUser(row) { return { id: row.id, username: row.username, email: row.email, role: row.role, exp: Number(row.exp || 0), level: Math.floor(Number(row.exp || 0) / 100) + 1 }; }
async function passwordHash(password) { const salt = crypto.randomBytes(16).toString('hex'); const key = await scrypt(password, salt, 64); return `${salt}:${key.toString('hex')}`; }
async function verifyPassword(password, stored) { const [salt, hex] = String(stored || '').split(':'); if (!salt || !hex) return false; const candidate = await scrypt(password, salt, 64); const expected = Buffer.from(hex, 'hex'); return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate); }
async function makeSession(row) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db('hutao_sessions', { method: 'POST', body: JSON.stringify({ token_hash: tokenHash, user_id: row.id, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }) });
  return { token, user: publicUser(row) };
}
async function getSession(token) {
  if (!token) return null;
  const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const rows = await db(`hutao_sessions?token_hash=eq.${encodeURIComponent(hash)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id`);
  if (!rows?.length) return null;
  const users = await db(`hutao_users?id=eq.${rows[0].user_id}&select=id,username,email,role,exp`);
  return users?.[0] ? publicUser(users[0]) : null;
}
async function grantExp(user, amount, event) {
  if (!user?.id) return user;
  const rows = await db(`hutao_users?id=eq.${user.id}&select=id,exp`);
  if (!rows?.length) return user;
  const next = Number(rows[0].exp || 0) + amount;
  await db(`hutao_users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ exp: next }) });
  await db('hutao_game_events', { method: 'POST', body: JSON.stringify({ user_id: user.id, event, exp_delta: amount }) });
  return { ...user, exp: next, level: Math.floor(next / 100) + 1 };
}

function bearer(req) { return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim(); }
async function requireAccount(req) { return getSession(bearer(req)); }
app.post('/api/auth/register', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: 'Username harus 3–24 karakter (huruf, angka, underscore).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email tidak valid.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    const existing = await db(`hutao_users?or=(username.eq.${encodeURIComponent(username)},email.eq.${encodeURIComponent(email)})&select=id`);
    if (existing.length) return res.status(409).json({ error: 'Username atau email sudah digunakan.' });
    const rows = await db('hutao_users', { method: 'POST', body: JSON.stringify({ username, email, password_hash: await passwordHash(password), role: 'USER FREE', exp: 0 }) });
    const session = await makeSession(rows[0]);
    return res.status(201).json({ session });
  } catch (e) { console.error('Web register:', e.message); return res.status(500).json({ error: e.message || 'Registrasi gagal.' }); }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase(); const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Isi email dan password.' });
    const rows = await db(`hutao_users?email=eq.${encodeURIComponent(email)}&select=id,username,email,password_hash,role,exp`);
    if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) return res.status(401).json({ error: 'Email atau password tidak cocok.' });
    await db(`hutao_users?id=eq.${rows[0].id}`, { method: 'PATCH', body: JSON.stringify({ last_login_at: new Date().toISOString() }) });
    return res.json({ session: await makeSession(rows[0]) });
  } catch (e) { console.error('Web login:', e.message); return res.status(500).json({ error: e.message || 'Login gagal.' }); }
});
app.get('/api/auth/me', async (req, res) => {
  try { const user = await requireAccount(req); if (!user) return res.status(401).json({ error: 'Sesi tidak valid.' }); return res.json({ user }); }
  catch (e) { return res.status(500).json({ error: e.message || 'Gagal memuat profil.' }); }
});
app.post('/api/auth/logout', async (req, res) => {
  try { const token = bearer(req); if (token) { const hash = crypto.createHash('sha256').update(token).digest('hex'); await db(`hutao_sessions?token_hash=eq.${encodeURIComponent(hash)}`, { method: 'DELETE', prefer: 'return=minimal' }); } return res.json({ ok: true }); }
  catch (e) { return res.status(500).json({ error: e.message || 'Logout gagal.' }); }
});
app.get('/api/community/messages', async (req, res) => {
  try {
    const user = await requireAccount(req); if (!user) return res.status(401).json({ error: 'Login diperlukan.' });
    const before = req.query.before ? encodeURIComponent(req.query.before) : null;
    const room = ['general','bot-talk','media'].includes(String(req.query.room || 'general')) ? String(req.query.room || 'general') : 'general';
    const q = `hutao_community_messages?room=eq.${encodeURIComponent(room)}&select=id,user_id,username,role,text,image,room,created_at&order=created_at.desc&limit=60${before ? `&created_at=lt.${before}` : ''}`;
    const rows = await db(q); return res.json({ messages: rows.reverse() });
  } catch (e) { return res.status(500).json({ error: e.message || 'Gagal memuat komunitas.' }); }
});
app.post('/api/community/messages', async (req, res) => {
  try {
    const user = await requireAccount(req); if (!user) return res.status(401).json({ error: 'Login diperlukan.' });
    const room = ['general','bot-talk','media'].includes(String(req.body?.room || 'general')) ? String(req.body?.room || 'general') : 'general';
    const text = String(req.body?.text || '').trim(); const image = typeof req.body?.image === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(req.body.image) ? req.body.image : null;
    if (!text && !image) return res.status(400).json({ error: 'Tulis pesan atau pilih gambar.' });
    if (text.length > 2000) return res.status(400).json({ error: 'Pesan maksimal 2000 karakter.' });
    if (image && image.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'Gambar terlalu besar. Maksimal sekitar 4 MB.' });
    const rows = await db('hutao_community_messages', { method: 'POST', body: JSON.stringify({ user_id: user.id, username: user.username, role: user.role, text, image, room }) });
    return res.status(201).json({ message: rows[0] });
  } catch (e) { return res.status(500).json({ error: e.message || 'Gagal mengirim pesan komunitas.' }); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'Hutao Bot', version: '1.1.0', runtime: process.uptime(), database: dbReady() ? 'configured' : 'not-configured' }));
function wibClock() { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value])); }
app.get('/api/daily-message', (_req, res) => { const now = wibClock(); const day = `${now.year}-${now.month}-${now.day}`; const active = Number(now.hour) === 17 && Number(now.minute) <= 2; res.json({ active, day, timeZone: 'Asia/Jakarta', message: { title: 'Selamat Sore 🌇', text: 'Selamat sore! Semoga hari ini sudah memberi banyak hal baik untukmu. Kalau mulai lelah, jangan lupa istirahat sebentar, tarik napas, minum air, dan beri waktu untuk diri sendiri. Kamu nggak harus menyelesaikan semuanya sekaligus. Pelan-pelan saja—semoga soremu terasa hangat dan tenang. ✨', accent: 'ember', stats: [{ label: 'DAILY GREETING', value: '17:00 WIB' }] } }); });
app.post('/api/chat', async (req, res) => {
  const text = String(req.body?.text || '').trim(); const image = typeof req.body?.image === 'string' && req.body.image.startsWith('data:image/') ? req.body.image : null; const reply = req.body?.reply || null;
  if (!text && !image) return res.status(400).json({ error: 'Pesan atau gambar tidak boleh kosong.' });
  const isCommand = text.startsWith('.'); const commandName = isCommand ? text.slice(1).split(/[\s,]/)[0].toLowerCase() : ''; const rawArgs = isCommand ? text.slice(1 + commandName.length).trim() : '';
  let account = null; try { account = await getSession(req.body?.sessionToken); } catch (e) { console.error('Session lookup:', e.message); }
  let sessionUpdate = null;
  try {
    if (commandName === 'daftar') {
      const [username, email, password] = parseCommaArgs(rawArgs);
      if (!username || !email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) return res.json({ response: { title: 'Format Daftar', text: 'Gunakan: .daftar username,email,password\nUsername minimal 3 karakter, email valid, password minimal 8 karakter.', accent: 'gold' } });
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.json({ response: { title: 'Username tidak valid', text: 'Username harus 3–24 karakter dan hanya boleh huruf, angka, atau underscore.', accent: 'rose' } });
      const exists = await db(`hutao_users?or=(username.eq.${encodeURIComponent(username)},email.eq.${encodeURIComponent(email.toLowerCase())})&select=id`);
      if (exists.length) return res.json({ response: { title: 'Akun sudah terdaftar', text: 'Username atau email tersebut sudah digunakan. Coba yang lain atau gunakan .login.', accent: 'gold' } });
      const created = await db('hutao_users', { method: 'POST', body: JSON.stringify({ username, email: email.toLowerCase(), password_hash: await passwordHash(password), role: 'USER FREE', exp: 0 }) });
      const session = await makeSession(created[0]); sessionUpdate = session;
      return res.json({ response: { title: 'Akun berhasil dibuat ✨', text: `Selamat datang, ${username}! Akunmu sudah terdaftar dan kamu otomatis masuk.\n\nUsername: ${username}\nRole: USER FREE\nLevel: 1\nEXP: 0\n\nSesi login disimpan di IndexedDB browser ini.`, accent: 'green', stats: [{ label: 'ACCOUNT', value: username }, { label: 'LEVEL', value: '1' }, { label: 'EXP', value: '0 / 100' }] }, session: sessionUpdate });
    }
    if (commandName === 'login') {
      const [email, password] = parseCommaArgs(rawArgs); if (!email || !password) return res.json({ response: { title: 'Format Login', text: 'Gunakan: .login email,password', accent: 'gold' } });
      const rows = await db(`hutao_users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,username,email,password_hash,role,exp`);
      if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) return res.json({ response: { title: 'Login gagal', text: 'Email atau password tidak cocok.', accent: 'rose' } });
      await db(`hutao_users?id=eq.${rows[0].id}`, { method: 'PATCH', body: JSON.stringify({ last_login_at: new Date().toISOString() }) });
      sessionUpdate = await makeSession(rows[0]);
      return res.json({ response: { title: `Selamat datang kembali, ${rows[0].username}!`, text: 'Login berhasil. Profil, level, dan EXP akunmu sudah dimuat.', accent: 'green', stats: [{ label: 'ACCOUNT', value: rows[0].username }, { label: 'ROLE', value: rows[0].role }, { label: 'LEVEL', value: String(sessionUpdate.user.level) }, { label: 'EXP', value: String(sessionUpdate.user.exp) }] }, session: sessionUpdate });
    }
    if (commandName === 'logout') {
      if (req.body?.sessionToken) { const hash = crypto.createHash('sha256').update(String(req.body.sessionToken)).digest('hex'); await db(`hutao_sessions?token_hash=eq.${encodeURIComponent(hash)}`, { method: 'DELETE', prefer: 'return=minimal' }); }
      return res.json({ response: { title: 'Berhasil logout', text: 'Sesi akun sudah diakhiri di server. Hapus juga sesi lokal browser dengan .logout bila diperlukan.', accent: 'gold' }, session: null });
    }
    if (commandName === 'game') {
      if (!account) return res.json({ response: { title: 'Login dulu ya', text: 'Fitur game dan EXP membutuhkan akun. Daftar dengan .daftar username,email,password lalu login memakai .login email,password.', accent: 'gold' } });
      const question = { prompt: 'Mini Quiz: Berapa hasil 7 × 8?', answer: '56', hint: 'Perkalian sederhana 😉' };
      return res.json({ response: { title: '🎮 Hutao Mini Quiz', text: `${question.prompt}\n\nKetik .jawab 56 untuk menjawab. Jawaban benar memberi +20 EXP.`, accent: 'violet', stats: [{ label: 'CURRENT LEVEL', value: String(account.level) }, { label: 'TOTAL EXP', value: String(account.exp) }] } });
    }
    if (commandName === 'jawab') {
      if (!account) return res.json({ response: { title: 'Login dulu ya', text: 'Daftar atau login untuk bermain dan mendapatkan EXP.', accent: 'gold' } });
      if (rawArgs.trim() === '56') { account = await grantExp(account, 20, 'mini-quiz-correct'); return res.json({ response: { title: 'Jawaban benar! 🎉', text: `Keren, ${account.username}! Kamu mendapatkan +20 EXP.`, accent: 'green', stats: [{ label: 'LEVEL', value: String(account.level) }, { label: 'TOTAL EXP', value: String(account.exp) }, { label: 'NEXT LEVEL', value: `${account.exp % 100} / 100 EXP` }] } }); }
      return res.json({ response: { title: 'Belum tepat', text: 'Coba lagi ya! Ketik .game untuk melihat soal.', accent: 'rose' } });
    }
    if (commandName === 'profile' || commandName === 'level') {
      if (!account) return res.json({ response: { title: 'Profil Guest', text: 'Kamu belum login. Daftar dengan .daftar username,email,password untuk membuat akun yang menyimpan level dan EXP.', accent: 'gold' } });
      return res.json({ response: { title: `Profil ${account.username}`, text: 'Data akun Hutao Bot kamu.', accent: 'green', stats: [{ label: 'USERNAME', value: account.username }, { label: 'ROLE', value: account.role }, { label: 'LEVEL', value: String(account.level) }, { label: 'EXP', value: `${account.exp} (${account.exp % 100}/100 menuju level berikutnya)` }] } });
    }
    const commands = await loadCommands(); const plugin = commands.get(commandName); let response;
    if (plugin) response = await plugin.execute({ text, args: rawArgs.split(/\s+/).filter(Boolean), user: account?.username || 'Guest', account, commands, botInfo: req.body?.botInfo || {}, reply, image });
    else if (isCommand) response = { type: 'card', title: 'Command tidak ditemukan', text: `Aku belum mengenali command .${commandName}. Coba ketik .help untuk melihat daftar command.`, accent: 'rose', buttons: [{ label: 'Buka Help', command: '.help', icon: '⌘' }] };
    else response = { type: 'card', title: image ? 'Image received' : 'Hutao Bot', text: image ? `Gambar berhasil diterima${text ? ` dengan pesan: ${text}` : '.'}` : `Hai ${account?.username || 'Guest'}! Aku menerima pesanmu. Untuk mulai menjelajahi fitur, ketik .menu ya.`, image, accent: 'ember', buttons: [{ label: 'Menu Utama', command: '.menu', icon: '✦' }] };
    if (response && typeof response === 'object') response.botInfo = { name: 'Hutao Bot', version: '1.1.0', role: account?.role || 'USER FREE', runtime: `${Math.floor(process.uptime()/3600)}h ${Math.floor(process.uptime()%3600/60)}m` };
    return res.json({ response });
  } catch (error) { console.error(error); return res.status(500).json({ error: error.message || 'Ada kendala saat menjalankan command.' }); }
});
app.listen(PORT, () => console.log(`Hutao Bot is running on port ${PORT}`));

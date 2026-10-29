const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const COMMANDS_DIR = path.join(__dirname, "commands");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function loadCommands() {
  const commands = new Map();
  for (const file of fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".js"))) {
    delete require.cache[require.resolve(path.join(COMMANDS_DIR, file))];
    const plugin = require(path.join(COMMANDS_DIR, file));
    for (const name of plugin.names || [plugin.name]) {
      if (name) commands.set(name.toLowerCase(), plugin);
    }
  }
  return commands;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "Hutao Bot" }));

app.post("/api/chat", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const user = String(req.body?.user || "Guest").slice(0, 32);
  if (!text) return res.status(400).json({ error: "Pesan tidak boleh kosong." });

  const commands = loadCommands();
  const isCommand = text.startsWith(".");
  const commandName = isCommand ? text.slice(1).split(/\s+/)[0].toLowerCase() : "";
  const args = isCommand ? text.slice(1 + commandName.length).trim().split(/\s+/).filter(Boolean) : [];

  try {
    const plugin = commands.get(commandName);
    let response;
    if (plugin) {
      response = await plugin.execute({ text, args, user, commands });
    } else if (isCommand) {
      response = {
        type: "card", title: "Command tidak ditemukan",
        text: `Aku belum mengenali command \`.${commandName}\`. Coba ketik .help untuk melihat daftar command.`,
        accent: "rose", buttons: [{ label: "Buka Help", command: ".help", icon: "⌘" }]
      };
    } else {
      response = {
        type: "card", title: "Hutao Bot",
        text: `Hai ${user}! Aku menerima pesanmu. Untuk mulai menjelajahi fitur, ketik .menu ya.`,
        accent: "violet", buttons: [{ label: "Menu Utama", command: ".menu", icon: "✦" }]
      };
    }
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ada kendala saat menjalankan command." });
  }
});

app.listen(PORT, () => console.log(`Hutao Bot is running on port ${PORT}`));

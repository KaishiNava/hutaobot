module.exports = {
  name: "menu",
  async execute({ user }) {
    return {
      type: "menu",
      title: "Welcome to Hutao Bot",
      marquee: "WELCOME TO HUTAO BOT  ✦  YOUR LITTLE DIGITAL COMPANION",
      text: `Halo, ${user}! 👋\nAku Hutao Bot, asisten digital dengan fitur downloader, tools, informasi akun, dan menu interaktif dalam satu ruang chat. Gunakan tombol di bawah atau ketik command seperti .help.\n\nBot dibuat agar pengalaman chat terasa praktis, responsif, dan mudah dijelajahi.`,
      thumbnail: "https://zfile.web.id/PK7vk7B.jpg",
      user,
      botInfo: { name: "Hutao Bot", version: "1.0.0", role: "USER FREE", runtime: "Live session" },
      stats: [{ label: "ACCOUNT", value: user }, { label: "ACCESS", value: "USER FREE" }, { label: "BOT VERSION", value: "v1.0.0" }, { label: "RUNTIME", value: "LIVE" }],
      accent: "ember",
      buttons: [
        { label: "Downloader", command: ".downloader", icon: "⇩", color: "violet" },
        { label: "Tools", command: ".tools", icon: "✣", color: "cyan" },
        { label: "Profile", command: ".profile", icon: "◉", color: "green" },
        { label: "Premium", command: ".premium", icon: "✦", color: "gold" },
        { label: "Bot Status", command: ".ping", icon: "⌁", color: "rose" }
      ]
    };
  }
};

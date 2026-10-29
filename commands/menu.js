module.exports = {
  name: "menu",
  names: ["menu", "mainmenu"],
  async execute({ user }) {
    return {
      type: "menu",
      title: "Hutao Bot · Main Menu",
      marquee: "HUTAO BOT  ✦  YOUR LITTLE DIGITAL COMPANION  ✦  READY TO HELP",
      text: `Halo, ${user}! 👋\nSelamat datang di ruang Hutao Bot. Pilih All Menu untuk melihat seluruh command, atau buka kategori yang kamu butuhkan.\n\nSetiap menu dirancang ringkas, nyaman, dan mudah dijelajahi.`,
      thumbnail: "https://zfile.web.id/PK7vk7B.jpg",
      user,
      botInfo: { name: "Hutao Bot", version: "1.1.0", role: "USER FREE", runtime: "Live session" },
      stats: [{ label: "ACCOUNT", value: user }, { label: "ACCESS", value: "USER FREE" }, { label: "BOT VERSION", value: "v1.1.0" }, { label: "RUNTIME", value: "LIVE" }],
      accent: "ember",
      buttons: [
        { label: "All Menu · Semua Command", command: ".allmenu", icon: "▦", color: "ember", wide: true },
        { label: "Main Menu", command: ".mainmenu", icon: "⌂", color: "default" },
        { label: "Premium Menu", command: ".premiummenu", icon: "✧", color: "gold" },
        { label: "Owner Menu", command: ".ownermenu", icon: "♛", color: "rose" },
        { label: "Tools Menu", command: ".toolsmenu", icon: "⌘", color: "cyan" },
        { label: "Game Menu", command: ".gamemenu", icon: "◈", color: "violet" }
      ]
    };
  }
};

module.exports = {
  name: "help",
  async execute() {
    return {
      type: "card", title: "Command Guide",
      text: "Jelajahi Hutao Bot dengan command berikut:\n\n.menu — menu utama\n.help — panduan command\n.ping — status bot\n.profile — profil kamu\n.tools — koleksi tools\n.downloader — menu downloader\n.premium — informasi premium",
      accent: "violet",
      buttons: [{ label: "Menu Utama", command: ".menu", icon: "✦" }]
    };
  }
};

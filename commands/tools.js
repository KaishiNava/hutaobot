module.exports = {
  name: "tools",
  async execute() {
    return {
      type: "card", title: "Tools Collection",
      text: "Pilih kategori tools yang ingin kamu jelajahi. Ini adalah demo UI; integrasi tools dapat ditambahkan melalui plugin.",
      accent: "cyan",
      buttons: [
        { label: "Text Tools", command: ".texttools", icon: "T", color: "cyan" },
        { label: "Media Tools", command: ".mediatools", icon: "▣", color: "violet" },
        { label: "Menu Utama", command: ".menu", icon: "⌂", color: "green" }
      ]
    };
  }
};

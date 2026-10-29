module.exports = {
  name: "downloader",
  names: ["downloader", "down"],
  async execute() {
    return {
      type: "card", title: "Downloader",
      text: "Downloader siap dikembangkan. Tambahkan provider dan validasi URL di plugin ini untuk menghubungkan layanan unduhan.",
      accent: "violet",
      buttons: [{ label: "Kembali ke Menu", command: ".menu", icon: "⌂" }]
    };
  }
};

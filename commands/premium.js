module.exports = {
  name: "premium",
  async execute() {
    return {
      type: "card", title: "Hutao Premium",
      text: "Unlock pengalaman lebih luas dengan fitur premium.\n\n• Limit lebih besar\n• Fitur eksklusif\n• Prioritas proses\n\nStatus pembelian belum diintegrasikan pada versi demo.",
      accent: "gold",
      buttons: [{ label: "Lihat Menu", command: ".menu", icon: "✦" }]
    };
  }
};

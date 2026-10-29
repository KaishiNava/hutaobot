module.exports = {
  name: "ping",
  async execute() {
    return {
      type: "card", title: "Bot Status",
      text: "● All systems operational\n\nHutao Bot sedang berjalan dengan baik.\nResponse: < 50ms (demo estimate)",
      accent: "green",
      stats: [{ label: "STATUS", value: "ONLINE" }, { label: "MODE", value: "WEB" }],
      buttons: [{ label: "Kembali ke Menu", command: ".menu", icon: "⌂" }]
    };
  }
};

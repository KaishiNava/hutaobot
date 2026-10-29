module.exports = {
  name: "menu",
  async execute({ user }) {
    return {
      type: "menu",
      title: "Welcome to Hutao Bot",
      marquee: "WELCOME TO HUTAO BOT  ✦  YOUR LITTLE DIGITAL COMPANION",
      text: `Halo, ${user}! 👋\nAku Hutao Bot — tempat kamu menjelajahi tools, info, dan fitur seru dalam satu chat. Pilih sesuatu di bawah untuk mulai.`,
      thumbnail: "https://zfile.web.id/PK7vk7B.jpg",
      user,
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

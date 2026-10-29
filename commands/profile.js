module.exports = {
  name: "profile",
  async execute({ user }) {
    return {
      type: "card", title: "Your Profile",
      text: `Profil chat kamu, ${user}.\n\nAkun: Guest session\nRole: User\nPlatform: Hutao Web`,
      accent: "green",
      stats: [{ label: "DISPLAY NAME", value: user }, { label: "ROLE", value: "USER" }],
      buttons: [{ label: "Menu Utama", command: ".menu", icon: "✦" }]
    };
  }
};

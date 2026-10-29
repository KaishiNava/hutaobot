module.exports = {
  name: "mainmenu",
  async execute() {
    return {
      type: "card", title: 'Main Menu',
      text: 'Menu utama Hutao Bot. Gunakan All Menu untuk melihat seluruh command atau pilih kategori di bawah.',
      accent: "ember",
      buttons: [{ label: 'All Menu', command: '.allmenu', icon: '▦', color: 'ember' },
{ label: 'Tools Menu', command: '.toolsmenu', icon: '⌘', color: 'cyan' },
{ label: 'Premium Menu', command: '.premiummenu', icon: '✧', color: 'gold' },
{ label: 'Game Menu', command: '.gamemenu', icon: '◈', color: 'violet' }]
    };
  }
};

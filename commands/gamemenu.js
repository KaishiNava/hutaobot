module.exports = {
  name: "gamemenu",
  async execute() {
    return {
      type: "card", title: 'Game Menu',
      text: 'Main, kumpulkan EXP, dan tingkatkan level akunmu!\n\n.game — mulai mini quiz\n.profile — lihat level dan EXP\n.jawab <jawaban> — kirim jawaban quiz\n\nEXP dan level memerlukan akun yang sudah login.',
      accent: "ember",
      buttons: [{ label: 'Start Game', command: '.game', icon: '▶', color: 'violet' },
{ label: 'My Profile', command: '.profile', icon: '◉', color: 'green' },
{ label: 'All Menu', command: '.allmenu', icon: '▦', color: 'ember' }]
    };
  }
};

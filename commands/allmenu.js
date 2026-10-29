module.exports = {
  name: "allmenu",
  async execute() {
    return {
      type: "card", title: 'All Menu · Command Directory',
      text: 'Berikut command yang tersedia saat ini. Pilih kategori dari menu utama untuk menjelajah lebih lanjut.\n\nGENERAL\n.menu / .mainmenu — menu utama\n.allmenu — semua command\n.help — panduan\n.ping — status jaringan/server\n\nACCOUNT\n.daftar username,email,password — daftar akun\n.login email,password — login\n.logout — keluar\n.profile / .level — profil, level, EXP\n\nTOOLS & MEDIA\n.tools / .toolsmenu — kategori tools\n.downloader — menu downloader\n\nPREMIUM & GAME\n.premium / .premiummenu — info premium\n.game / .gamemenu — mini game dan EXP\n.jawab <jawaban> — jawab quiz\n\nOWNER\n.ownermenu — menu owner (akses terbatas)',
      accent: "ember",
      buttons: [{ label: 'Main Menu', command: '.mainmenu', icon: '⌂', color: 'default' },
{ label: 'Tools Menu', command: '.toolsmenu', icon: '⌘', color: 'cyan' },
{ label: 'Game Menu', command: '.gamemenu', icon: '◈', color: 'violet' }]
    };
  }
};

module.exports = {
  name: "ownermenu",
  async execute() {
    return {
      type: "card", title: 'Owner Menu',
      text: 'Menu owner ditampilkan sebagai informasi. Command administratif sensitif harus dibatasi dengan validasi role owner di backend sebelum diberi akses.',
      accent: "ember",
      buttons: [{ label: 'Bot Status', command: '.ping', icon: '⌁', color: 'rose' },
{ label: 'All Menu', command: '.allmenu', icon: '▦', color: 'ember' }]
    };
  }
};

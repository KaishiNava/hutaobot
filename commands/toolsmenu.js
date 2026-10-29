module.exports = {
  name: "toolsmenu",
  async execute() {
    return {
      type: "card", title: 'Tools Menu',
      text: 'Pilih fitur tools yang tersedia. Beberapa tools masih berupa kerangka dan memerlukan integrasi provider.',
      accent: "ember",
      buttons: [{ label: 'Tools Collection', command: '.tools', icon: '⌘', color: 'cyan' },
{ label: 'Downloader', command: '.downloader', icon: '⇩', color: 'violet' },
{ label: 'All Menu', command: '.allmenu', icon: '▦', color: 'ember' }]
    };
  }
};

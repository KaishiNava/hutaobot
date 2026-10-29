module.exports = {
  name: "premiummenu",
  async execute() {
    return {
      type: "card", title: 'Premium Menu',
      text: 'Fitur Premium Hutao Bot\n\n✦ Akses fitur eksklusif\n✦ Limit penggunaan lebih besar\n✦ Pengalaman lebih nyaman\n\nStatus pembelian dan aktivasi premium perlu dihubungkan ke sistem pembayaran/owner.',
      accent: "ember",
      buttons: [{ label: 'Premium Info', command: '.premium', icon: '✧', color: 'gold' },
{ label: 'All Menu', command: '.allmenu', icon: '▦', color: 'ember' }]
    };
  }
};

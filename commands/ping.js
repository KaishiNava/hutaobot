const os = require("os");
module.exports = {
  name: "ping",
  async execute() {
    const started = process.hrtime.bigint();
    // Measure a real local event-loop round trip rather than displaying a fabricated ping.
    await new Promise(resolve => setImmediate(resolve));
    const latency = Number((process.hrtime.bigint() - started) / 1000000n);
    const uptime = Math.floor(process.uptime());
    const d = Math.floor(uptime / 86400), h = Math.floor(uptime % 86400 / 3600), m = Math.floor(uptime % 3600 / 60), s = uptime % 60;
    const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    const usedMem = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
    return {
      type: "card", title: "Hutao Network Monitor",
      text: "Status koneksi dan proses server diperiksa secara langsung. Nilai latency adalah waktu respons internal server, bukan pengukuran ping ke jaringan operator/perangkat kamu.",
      accent: "green", network: true,
      stats: [
        { label: "SERVER STATUS", value: "● ONLINE" },
        { label: "INTERNAL LATENCY", value: `${latency} ms` },
        { label: "PROCESS UPTIME", value: `${d}d ${h}h ${m}m ${s}s` },
        { label: "SERVER MEMORY", value: `${memory} MB RSS` },
        { label: "HOST MEMORY", value: `${usedMem} / ${totalMem} MB` },
        { label: "NODE VERSION", value: process.version }
      ],
      buttons: [{ label: "Refresh Status", command: ".ping", icon: "↻" }, { label: "Kembali ke Menu", command: ".menu", icon: "⌂" }]
    };
  }
};

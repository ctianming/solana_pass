export default function Apps() {
  const apps = [
    { name: "Payments", desc: "Pay and receive easily" },
    { name: "Gaming", desc: "Play-to-own experiences" },
    { name: "DeFi", desc: "Lend, borrow, earn" },
    { name: "NFT", desc: "Collect and trade" },
    { name: "Social", desc: "Web3-native social" },
  ];
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Ecosystem Apps</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((a) => (
          <div key={a.name} className="stat-card">
            <h3 className="text-lg font-semibold">{a.name}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{a.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

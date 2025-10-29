"use client";

export function FeaturesGrid({ lang }: { lang: "en" | "zh" }) {
  const items =
    lang === "zh"
      ? [
          { icon: "📱", title: "NFC", desc: "贴卡创建账户" },
          { icon: "💳", title: "法币", desc: "充值与代付" },
          { icon: "🔤", title: "SNS", desc: "注册 .sol 域名" },
          { icon: "🧩", title: "聚合", desc: "进入 Solana 生态" },
          { icon: "🛡️", title: "托管", desc: "低门槛体验" },
          { icon: "⚡", title: "快速", desc: "顺滑交互" },
        ]
      : [
          { icon: "📱", title: "NFC", desc: "Tap to create account" },
          { icon: "💳", title: "Fiat", desc: "Top-up & sponsored ops" },
          { icon: "🔤", title: "SNS", desc: "Get your .sol name" },
          { icon: "🧩", title: "Aggregator", desc: "Enter Solana ecosystem" },
          { icon: "🛡️", title: "Custody", desc: "Managed, low-friction" },
          { icon: "⚡", title: "Fast", desc: "Smooth UX" },
        ];
  return (
    <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <div key={f.title} className="stat-card">
          <div className="stat-icon">{f.icon}</div>
          <div className="stat-content">
            <h4>{f.title}</h4>
            <p className="stat-detail">{f.desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

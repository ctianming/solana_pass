"use client";

export function PriceChart({ title, period }: { title: string; period: string }) {
  return (
    <section className="price-chart-section max-w-lg mx-auto mt-8">
      <div className="chart-header">
        <h3>{title}</h3>
        <span className="time-period">{period}</span>
      </div>
      <div className="chart-container">
        <div className="price-line" />
      </div>
      <div className="price-info">
        <div className="price-value">1.023</div>
        <div className="price-change positive">+3.2%</div>
      </div>
    </section>
  );
}

export function StatsGrid({ accounts, fiat, sponsored, labelAcc, labelFiat, labelOps, note }:{ accounts:number; fiat:string; sponsored:number; labelAcc:string; labelFiat:string; labelOps:string; note:string; }){
  return (
    <section className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">🔐</div>
        <div className="stat-content">
          <h4>{labelAcc}</h4>
          <div className="stat-value">{accounts}</div>
          <p className="stat-detail">{note}</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">💳</div>
        <div className="stat-content">
          <h4>{labelFiat}</h4>
          <div className="stat-value">{fiat}</div>
          <p className="stat-detail">CNY</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">⚡</div>
        <div className="stat-content">
          <h4>{labelOps}</h4>
          <div className="stat-value">{sponsored}</div>
          <p className="stat-detail">{note}</p>
        </div>
      </div>
    </section>
  );
}

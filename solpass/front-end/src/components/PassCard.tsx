"use client";

export function PassCard({ active, name, id }: { active: boolean; name?: string; id?: string }) {
  return (
    <div className={`pass-card ${active ? "auto-flip" : ""}`}>
      <div className="pass-card-inner">
        <div className="pass-card-front">
          <div className="pass-header">
            <div className="pass-logo">Solana Pass</div>
            <div className="pass-status">{active ? "Active" : "solana"}</div>
          </div>
          <div className="pass-body">
            <div className="pass-photo" />
            <div>
              <div className="pass-name">{name ?? "Unnamed"}</div>
              <div className="pass-id">ID: {id ?? "-"}</div>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {active ? "Welcome back" : "Tap to create"}
          </div>
        </div>
        <div className="pass-card-back">
          <div className="advx-content">
            <div className="advx-title">App Hub</div>
            <div className="advx-subtitle">One-stop Solana access</div>
          </div>
        </div>
      </div>
    </div>
  );
}

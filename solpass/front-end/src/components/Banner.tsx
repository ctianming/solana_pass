"use client";

import { useState } from "react";

export function HeaderBanner({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="header-banner">
      <div className="banner-content">
        <span className="banner-icon">✨</span>
        <span className="banner-text">{text}</span>
        <button className="banner-close" onClick={() => setOpen(false)}>×</button>
      </div>
    </div>
  );
}

import React from "react";

export function SectionCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-indigo-500/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {actions}
      </div>
      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{children}</div>
    </div>
  );
}

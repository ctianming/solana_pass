"use client";

export function HowItWorks({ steps, title }: { steps: string[]; title: string }) {
  return (
    <section className="mt-12">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <ol className="list-decimal list-inside grid gap-2">
        {steps.map((s, i) => (
          <li key={i} className="rounded-lg border p-3 bg-white/60 dark:bg-zinc-900/60">
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FAQ({ items, title }: { items: { q: string; a: string }[]; title: string }) {
  return (
    <section className="mt-12">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="grid gap-3">
        {items.map((it, i) => (
          <details key={i} className="rounded-lg border p-3 bg-white/60 dark:bg-zinc-900/60">
            <summary className="cursor-pointer font-medium">{it.q}</summary>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{it.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

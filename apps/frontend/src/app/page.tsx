"use client";
import { DomainRegisterForm } from "@/components";
import dynamic from 'next/dynamic';
const SponsoredMemoForm = dynamic(() => import('@/components/SponsoredMemoForm'), { ssr: false });

export default function HomePage() {
  return (
    <main className="min-h-screen font-sans p-6 sm:p-10 bg-[var(--bg-color)] text-[var(--primary-text)] relative">
      <div className="animated-background">
        <div className="blur-orb orb1" />
        <div className="blur-orb orb2" />
        <div className="blur-orb orb3" />
      </div>
      <div className="max-w-4xl mx-auto grid gap-6 relative">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Solana Pass Demo</h1>
          <nav className="text-sm opacity-80">Demo UI</nav>
        </header>
        <section className="card card-pad grid gap-4">
          <h2 className="text-lg font-medium">Create SNS Subdomain</h2>
          <DomainRegisterForm />
        </section>
        <section className="card card-pad grid gap-4">
          <h2 className="text-lg font-medium">Send Sponsored Memo</h2>
          <SponsoredMemoForm />
        </section>
      </div>
    </main>
  );
}

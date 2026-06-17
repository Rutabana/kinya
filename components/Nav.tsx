"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Languages, Radio } from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/flashcards", label: "Drills", icon: BookOpen },
  { href: "/translate", label: "Lookup", icon: Languages },
  { href: "/radio", label: "Podcasts", icon: Radio },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 border-r z-40"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)" }}
          >
            <svg viewBox="0 0 100 100" width="18" height="18">
              <path d="M 71 29 A 30 30 0 1 0 71 71" fill="none" stroke="#0f0f0f" strokeWidth="12" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight leading-none block">
              Concur
            </span>
            <span className="text-[10px] leading-none" style={{ color: "var(--text-muted)" }}>
              Concurrency Ref
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-4" style={{ height: 1, background: "var(--border)" }} />

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 px-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: active ? "var(--surface2)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{
                      width: 3,
                      height: 18,
                      background: "var(--accent)",
                    }}
                  />
                )}
                <Icon
                  size={17}
                  style={{ color: active ? "var(--accent)" : undefined }}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-5 py-5">
          <p className="text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            async · threads · channels
          </p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t z-40 pb-safe"
        style={{ background: "var(--surface)", borderColor: "var(--border)", height: 64 }}
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2"
              style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
            >
              <Icon size={21} />
              <span className="text-[10px] font-medium">{label}</span>
              {active && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

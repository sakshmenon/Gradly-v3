"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "dashboard", href: "/",         match: (p: string) => p === "/" },
  { label: "planning",  href: "/planning",  match: (p: string) => p.startsWith("/planning") },
  { label: "explore",   href: "/explore",   match: (p: string) => p.startsWith("/explore") },
  { label: "profile",   href: "/profile",   match: (p: string) => p === "/profile" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth/");

  return (
    <div className="flex h-screen w-screen overflow-hidden relative">
      {/* White grid at 10% opacity */}
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      {/* Radial black vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "radial-gradient(circle at center, transparent 0%, #000000 95%)" }}
      />

      {/* Sidebar — hidden on auth pages */}
      {!isAuthPage && (
        <aside className="relative z-40 h-full flex items-center justify-center pl-10 flex-shrink-0">
          <div className="bg-gray-950/40 border border-gray-900 backdrop-blur-xl w-16 h-[75vh] rounded-3xl flex flex-col items-center py-16 shadow-2xl justify-between">
            {NAV.map((item) => (
              <div key={item.href} className="flex flex-col items-center gap-4">
                <NavLink
                  label={item.label}
                  href={item.href}
                  active={item.match(pathname)}
                />
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Page content */}
      <main className="relative z-20 flex-1 h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link href={href} className="no-underline">
      <div className="w-12 h-24 flex items-center justify-center relative">
        <span
          className={`
            rotate-[-90deg] origin-center whitespace-nowrap
            tracking-[0.5em] text-[10px] font-medium uppercase
            transition-all duration-300
            ${active
              ? "text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"
              : "text-gray-500 hover:text-white"
            }
          `}
        >
          {label}
        </span>
        {active && (
          <div className="absolute right-0 w-1 h-1 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
    </Link>
  );
}

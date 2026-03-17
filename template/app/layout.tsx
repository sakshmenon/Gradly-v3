'use client';
import Link from 'next/link';
import { Pixelify_Sans } from 'next/font/google';
import { usePathname } from 'next/navigation';
import './globals.css';

const pixelify = Pixelify_Sans({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={`${pixelify.className} bg-black text-white relative min-h-screen overflow-x-hidden`}>
      <div className="flex h-screen w-screen overflow-hidden relative">
        {/* Persistent Background Layer */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ 
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`, 
            backgroundSize: '20px 20px' 
          }}/>
          <div className="absolute inset-0 z-10 pointer-events-none" style={{ 
            background: 'radial-gradient(circle at center, transparent 0%, #000000 95%)' 
          }}/>

        {/* <aside className="relative z-40 h-full flex items-center justify-center pl-10 flex-shrink-0">
          <div className="bg-gray-950/40 border border-gray-900 backdrop-blur-xl w-16 h-[75vh] rounded-3xl flex flex-col items-center py-12 shadow-2xl">
            <div className="flex flex-col items-center gap-20">
              <NavLink label="dashboard" href="/dashboard" active={pathname === '/dashboard'} />
              <NavLink label="planning" href="/planning" active={pathname === '/planning'} />
              <NavLink label="explore" href="/explore" active={pathname === '/explore'} />
            </div>
            <div className="mt-auto flex flex-col items-center pb-4">
              <NavLink label="profile" href="/profile" active={pathname === '/profile'} />
            </div>
          </div>
        </aside> */}
        <aside className="relative z-40 h-full flex items-center justify-center pl-10 flex-shrink-0">
        <div className="bg-gray-950/40 border border-gray-900 backdrop-blur-xl w-16 h-[75vh] rounded-3xl flex flex-col items-center py-16 shadow-2xl justify-between">
          
          {/* TOP SLOT */}
          <div className="flex flex-col items-center gap-4">
            <NavLink label="dashboard" href="/dashboard" active={pathname === '/dashboard'} />
          </div>

          {/* MIDDLE SLOT 1 */}
          <div className="flex flex-col items-center gap-4">
            <NavLink label="planning" href="/planning" active={pathname === '/planning'} />
          </div>

          {/* MIDDLE SLOT 2 */}
          <div className="flex flex-col items-center gap-4">
            <NavLink label="explore" href="/explore" active={pathname === '/explore'} />
          </div>

          {/* BOTTOM SLOT */}
          <div className="flex flex-col items-center gap-4">
            <NavLink label="profile" href="/profile" active={pathname === '/profile'} />
          </div>

        </div>
      </aside>
        
        {/* Page Content */}
        <main className="relative z-20 flex-1 h-full overflow-hidden">
            {children}
        </main>
        </div>
      </body>
    </html>
  );
}

const NavLink = ({ label, href, active }: { label: string; href: string; active: boolean }) => (
  <Link href={href} className="no-underline">
    <div className="w-12 h-24 flex items-center justify-center relative">
      <button 
        className={`
          /* Rotation Logic */
          rotate-[-90deg] origin-center whitespace-nowrap
          
          /* Typography & Spacing */
          tracking-[0.5em] text-[10px] font-medium uppercase
          transition-all duration-300
          
          /* Active vs Inactive States */
          ${active 
            ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
            : 'text-gray-500 group-hover:text-white'
          }
        `}
      >
      {label}
      </button>
      {active && (
        <div className="absolute right-0 w-1 h-1 bg-green-500 rounded-full animate-pulse" />
      )}
    </div>
  </Link>
);
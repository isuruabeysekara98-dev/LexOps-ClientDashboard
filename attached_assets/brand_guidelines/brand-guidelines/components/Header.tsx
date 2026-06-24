"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type NavLink = { label: string; href: string; children?: { label: string; href: string }[] };

const navLinks: NavLink[] = [
  { label: "Services", href: "/services" },
  { label: "Why Lex Ops", href: "/why-lexops" },
  {
    label: "Who we work with",
    href: "#",
    children: [
      { label: "Law Firms", href: "/who-we-work-with/law-firms" },
      { label: "General Counsel & In-House", href: "/who-we-work-with/general-counsel" },
    ],
  },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

const CLIENT_PORTAL_URL = "https://client.lex-ops.io/";
const GET_STARTED_URL = "https://gkj6oqt5c58.typeform.com/to/TY3MJ6Gw?typeform-source=www.lex-ops.io";

export default function Header() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#FAFBFC]/85 border-b border-black/[0.06]">
      <div className="container-narrow flex items-center justify-between h-[72px]">
        {/* Logo */}
        <Link href="/" className="flex items-center no-underline shrink-0">
          <Image src="/logo.png" alt="LexOps" width={115} height={36} priority className="h-[26px] w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8 text-[14px] text-mid-gray">
          {navLinks.map((link) =>
            link.children ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => setOpen(link.label)}
                onMouseLeave={() => setOpen(null)}
              >
                <button className="flex items-center gap-1 hover:text-dark-gray transition-colors">
                  {link.label}
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {open === link.label && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
                    <div className="w-64 bg-white border border-black/[0.08] rounded-xl shadow-[0_20px_50px_-20px_rgba(35,42,52,0.4)] p-1.5">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-3.5 py-2.5 rounded-lg text-[14px] text-dark-gray hover:bg-light-blue hover:text-slate-blue transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link key={link.label} href={link.href} className="hover:text-dark-gray transition-colors">
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={CLIENT_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex text-[14px] font-medium text-dark-gray border border-black/[0.14] px-4 py-2 rounded-lg hover:border-slate-blue hover:text-slate-blue transition-colors"
          >
            Client Portal
          </a>
          <a
            href={GET_STARTED_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex text-[14px] font-medium bg-slate-blue text-white px-4 py-2 rounded-lg hover:bg-dark-gray transition-colors"
          >
            Get Started
          </a>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 ml-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-0.5 bg-dark-gray mb-1.5" />
            <div className="w-6 h-0.5 bg-dark-gray mb-1.5" />
            <div className="w-6 h-0.5 bg-dark-gray" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-black/[0.06] bg-white px-8 py-6 flex flex-col gap-4">
          {navLinks.map((link) => (
            <div key={link.label}>
              {link.children ? (
                <div className="text-[16px] font-medium text-dark-gray py-1">{link.label}</div>
              ) : (
                <Link
                  href={link.href}
                  className="text-[16px] font-medium text-dark-gray block py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              )}
              {link.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className="block pl-4 py-1 text-[14px] text-mid-gray hover:text-slate-blue"
                  onClick={() => setMobileOpen(false)}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex flex-col gap-2 mt-2">
            <a href={CLIENT_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium text-dark-gray border border-black/[0.14] px-4 py-2 rounded-lg text-center">
              Client Portal
            </a>
            <a href={GET_STARTED_URL} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium bg-slate-blue text-white px-4 py-2 rounded-lg text-center">
              Get Started
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

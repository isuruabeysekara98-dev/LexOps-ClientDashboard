import Link from "next/link";
import Image from "next/image";

const FOOTER_NAV = [
  { label: "Services", href: "/services" },
  { label: "Why Lex Ops", href: "/why-lexops" },
  { label: "Who we work with", href: "/who-we-work-with/law-firms" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E8E8E8]">
      <div className="container-site py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="lg:col-span-2 max-w-[320px]">
            <Link href="/" className="flex items-center mb-5 no-underline">
              <Image src="/logo.png" alt="LexOps" width={115} height={36} className="h-[28px] w-auto" />
            </Link>
            <p className="text-[15px] leading-[24px] text-mid-gray">
              Designing legal workflows that scale with your team.
            </p>
            <p className="text-[14px] leading-[22px] text-mid-gray mt-3">
              A{" "}
              <a
                href="http://teamsquared.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-blue hover:text-dark-gray transition-colors underline underline-offset-2"
              >
                Teams Squared
              </a>{" "}
              product.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[11px] uppercase tracking-widest font-medium text-dark-gray mb-4">Navigation</h4>
            <ul className="flex flex-col gap-2.5">
              {FOOTER_NAV.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[13px] leading-[20px] text-mid-gray hover:text-dark-gray transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[11px] uppercase tracking-widest font-medium text-dark-gray mb-4">Contact Us</h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href="mailto:hello@lex-ops.io" className="text-[13px] leading-[20px] text-mid-gray hover:text-dark-gray transition-colors">
                  hello@lex-ops.io
                </a>
              </li>
              <li>
                <a href="tel:+61451542739" className="text-[13px] leading-[20px] text-mid-gray hover:text-dark-gray transition-colors">
                  +61 451 542 739
                </a>
              </li>
            </ul>
            {/* Social icons */}
            <div className="flex items-center gap-2 mt-5">
              <a href="https://www.linkedin.com/company/lexops-global" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-8 h-8 rounded-lg bg-[#F4F8FB] flex items-center justify-center hover:bg-slate-blue group transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-blue group-hover:text-white transition-colors">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/lexops.global/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-lg bg-[#F4F8FB] flex items-center justify-center hover:bg-slate-blue group transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-blue group-hover:text-white transition-colors">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
                </svg>
              </a>
              <a href="https://web.facebook.com/lexops.global/?_rdc=1&_rdr#" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 rounded-lg bg-[#F4F8FB] flex items-center justify-center hover:bg-slate-blue group transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-blue group-hover:text-white transition-colors">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-[#E8E8E8] mt-12 pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-[12px] text-mid-gray">
            © {new Date().getFullYear()} LexOps. Legal workflow operations & automation consulting. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

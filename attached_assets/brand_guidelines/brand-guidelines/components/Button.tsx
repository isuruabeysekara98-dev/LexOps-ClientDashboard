"use client";
import Link from "next/link";

type ButtonProps = {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  children: React.ReactNode;
  className?: string;
  arrow?: boolean;
};

export default function Button({
  href,
  onClick,
  variant = "primary",
  children,
  className = "",
  arrow = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center gap-2 text-[16px] leading-[20px] font-medium transition-all duration-200 px-6 py-[10px] rounded-lg";

  const styles = {
    primary: "bg-slate-blue text-white hover:bg-dark-gray",
    ghost: "bg-transparent text-dark-gray border border-dark-gray hover:bg-dark-gray hover:text-white",
  };

  const cls = `${base} ${styles[variant]} ${className}`;

  const inner = (
    <>
      {children}
      {arrow && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
          <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

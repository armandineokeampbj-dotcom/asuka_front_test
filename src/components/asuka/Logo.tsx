import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-bold text-lg ${className}`}>
      <span className="tracking-tight text-primary">Asuka<span className="text-gradient ml-1">One</span></span>
    </Link>
  );
}
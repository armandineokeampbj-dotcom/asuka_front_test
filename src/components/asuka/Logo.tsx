import { Link } from "@tanstack/react-router";
import asukaLogo from "@/assets/asuka-logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <img 
        src={asukaLogo} 
        alt="Asuka One" 
        className="h-8 w-auto"
      />
    </Link>
  );
}
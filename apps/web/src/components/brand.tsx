import Link from "next/link";
import { Scale } from "lucide-react";
export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Lawmedy home">
      <span className="brand-mark">
        <Scale size={22} strokeWidth={1.6} />
      </span>
      lawmedy<span className="brand-dot">.</span>
    </Link>
  );
}

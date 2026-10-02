import Image from "next/image";
import Link from "next/link";

// "light" is the white logo for dark (navy/photo) backgrounds; "dark" is the black logo for light backgrounds.
export function Brand({ href = "/dashboard", tone = "light" }: { href?: string; tone?: "light" | "dark" }) {
  return (
    <Link href={href} className="brand-logo" aria-label="Lawmedy home">
      <Image
        src={tone === "light" ? "/images/brand/logo-light.png" : "/images/brand/logo-dark.png"}
        alt="Lawmedy"
        width={1460}
        height={390}
        priority
      />
    </Link>
  );
}

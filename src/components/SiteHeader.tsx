import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";
import { CartBadge } from "@/components/CartBadge";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="logo">
        <Image src={brand.logo} alt={`${brand.name} logo`} width={48} height={48} className="logo-img" priority />
        <span>
          <strong>{brand.name}</strong>
          <small>{brand.tagline}</small>
        </span>
      </Link>
      <nav>
        <Link href="/order">Order Online</Link>
        <Link href="/menu">Menu</Link>
        <Link href="/branches">Branches</Link>
        <Link href="/contact">Contact</Link>
        <CartBadge />
        <a href={brand.phoneHref} className="nav-call">
          Call
        </a>
        <Link href="/erp/login" className="nav-erp">
          Staff
        </Link>
      </nav>
    </header>
  );
}

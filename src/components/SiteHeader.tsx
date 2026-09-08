import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";

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
        <Link href="/menu">Menu</Link>
        <Link href="/branches">Branches</Link>
        <Link href="/order">Order</Link>
        <a href={brand.facebookUrl} target="_blank" rel="noreferrer">
          Facebook
        </a>
        <Link href="/erp/login" className="nav-erp">
          Staff ERP
        </Link>
      </nav>
    </header>
  );
}

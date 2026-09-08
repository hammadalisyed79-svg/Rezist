import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Image src={brand.logo} alt={brand.name} width={56} height={56} />
        <div>
          <strong>{brand.name}</strong>
          <p>{brand.slogan}</p>
          <nav className="lz-footer-nav" aria-label="Footer">
            <Link href="/menu">Menu</Link>
            <Link href="/order">Order</Link>
            <Link href="/branches">Branches</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </div>
      <div className="footer-meta">
        <p>{brand.hqAddress}</p>
        <a href={brand.phoneHref}>{brand.phone}</a>
        <a href={brand.emailHref}>{brand.email}</a>
        <a href={brand.instagramUrl} target="_blank" rel="noreferrer">
          Instagram @{brand.instagram}
        </a>
        <a href={brand.facebookUrl} target="_blank" rel="noreferrer">
          Facebook Rezistpk
        </a>
      </div>
      <Link href="/erp/login">Operations login</Link>
    </footer>
  );
}

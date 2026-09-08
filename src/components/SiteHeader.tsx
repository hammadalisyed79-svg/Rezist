"use client";

import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";
import { CartBadge } from "@/components/CartBadge";
import { LocationPill } from "@/components/LocationPill";

export function SiteHeader({
  cities = [],
  showLocation = true,
}: {
  cities?: string[];
  showLocation?: boolean;
}) {
  return (
    <header className="lz-header">
      <div className="lz-header-left">
        {showLocation ? <LocationPill cities={cities} /> : <span />}
      </div>
      <Link href="/" className="lz-logo">
        <Image src={brand.logo} alt={brand.name} width={44} height={44} className="lz-logo-img" priority />
        <span className="lz-logo-text">{brand.shortName.toUpperCase()}</span>
      </Link>
      <div className="lz-header-right">
        <Link href="/menu" className="lz-icon-link" aria-label="Browse menu">
          ⌕
        </Link>
        <Link href="/branches" className="lz-icon-link" aria-label="Branches">
          ◉
        </Link>
        <CartBadge />
      </div>
    </header>
  );
}

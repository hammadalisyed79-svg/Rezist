import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyCartBar } from "@/components/StickyCartBar";
import { MobileDock } from "@/components/MobileDock";
import { LocationGate } from "@/components/LocationGate";

export function SiteShell({
  cities = [],
  branches = [],
  showLocation = true,
  children,
}: {
  cities?: string[];
  branches?: { id: string; name: string; city: string; address?: string | null }[];
  showLocation?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="site lz-store">
      <a href="#main" className="lz-skip">
        Skip to content
      </a>
      <SiteHeader cities={cities} showLocation={showLocation} />
      {showLocation && branches.length ? (
        <LocationGate cities={cities} branches={branches} />
      ) : null}
      <div id="main">{children}</div>
      <SiteFooter />
      <StickyCartBar />
      <MobileDock />
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  text,
  href,
  linkLabel = "View all →",
}: {
  eyebrow: string;
  title: string;
  text?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="lz-shop-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {text ? <p className="muted">{text}</p> : null}
      </div>
      {href ? (
        <Link className="text-link" href={href}>
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

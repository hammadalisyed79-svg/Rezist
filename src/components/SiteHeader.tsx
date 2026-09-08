import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="logo">
        Rezist
      </Link>
      <nav>
        <Link href="/menu">Menu</Link>
        <Link href="/branches">Branches</Link>
        <Link href="/order">Order</Link>
        <Link href="/erp/login" className="nav-erp">
          Staff ERP
        </Link>
      </nav>
    </header>
  );
}

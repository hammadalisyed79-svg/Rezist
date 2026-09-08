import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <strong>Rezist</strong>
      <p>Multi-branch bakery · Pakistan</p>
      <Link href="/erp/login">Operations login</Link>
    </footer>
  );
}

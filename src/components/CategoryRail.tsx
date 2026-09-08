import Link from "next/link";

export function CategoryRail({
  categories,
  active,
}: {
  categories: { id: string; name: string; slug: string; count?: number }[];
  active?: string | null;
}) {
  return (
    <div className="lz-cats">
      <Link href="/menu" className={!active ? "active" : undefined}>
        All
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/menu?cat=${c.slug}`}
          className={active === c.slug ? "active" : undefined}
        >
          {c.name}
          {typeof c.count === "number" ? <em>{c.count}</em> : null}
        </Link>
      ))}
    </div>
  );
}

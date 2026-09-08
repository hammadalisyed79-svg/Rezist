"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { CategoryRail } from "@/components/CategoryRail";

type Product = {
  id: string;
  sku?: string;
  name: string;
  description: string | null;
  listPrice: number;
  imageUrl: string | null;
  allergens?: string | null;
  category?: { name: string; slug?: string } | null;
};

export function MenuExplorer({
  categories,
  products,
  activeCat,
}: {
  categories: { id: string; name: string; slug: string; count?: number }[];
  products: Product[];
  activeCat?: string | null;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.description || "").toLowerCase().includes(needle) ||
        (p.category?.name || "").toLowerCase().includes(needle)
    );
  }, [products, q]);

  return (
    <>
      <div className="lz-search-wrap">
        <label className="lz-search" htmlFor="menu-search">
          <span aria-hidden>⌕</span>
          <input
            id="menu-search"
            type="search"
            placeholder="Search cakes, brownies, donuts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
          {q ? (
            <button type="button" className="lz-search-clear" onClick={() => setQ("")}>
              Clear
            </button>
          ) : null}
        </label>
        <p className="lz-search-hint">
          {filtered.length} item{filtered.length === 1 ? "" : "s"}
          {activeCat ? " in this category" : ""}
        </p>
      </div>
      <CategoryRail categories={categories} active={activeCat} />
      <div className="lz-product-grid">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {!filtered.length ? (
        <div className="lz-empty">
          <h3>No matches</h3>
          <p>Try another search or browse all categories.</p>
        </div>
      ) : null}
    </>
  );
}

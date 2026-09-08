import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { ProductCreateForm } from "@/components/ProductCreateForm";

export default async function ProductsPage() {
  const user = await requireErpUser();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Products & pricing</h1>
        </div>
      </header>

      {user.role !== "CASHIER" ? <ProductCreateForm categories={categories} /> : null}

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Type</th>
              <th>Category</th>
              <th>List price</th>
              <th>Sellable</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.category?.name || "—"}</td>
                <td>{formatPKR(p.listPrice)}</td>
                <td>{p.isSellable ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ErpPage>
  );
}

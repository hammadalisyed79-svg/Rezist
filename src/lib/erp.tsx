import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErpShell } from "@/components/ErpShell";

export async function requireErpUser() {
  const session = await getSession();
  if (!session) redirect("/erp/login");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { branch: true },
  });
  if (!user) redirect("/erp/login");
  return user;
}

export function ErpPage({
  user,
  children,
}: {
  user: Awaited<ReturnType<typeof requireErpUser>>;
  children: React.ReactNode;
}) {
  return <ErpShell user={user}>{children}</ErpShell>;
}

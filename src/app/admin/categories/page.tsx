import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/permissions";
import { createCategory, deleteCategory } from "@/lib/actions/admin";
import { CategoryForm } from "@/components/admin/category-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "ক্যাটাগরি ম্যানেজমেন্ট" };

export default async function AdminCategoriesPage() {
  await requireAdminOrStaff("categories");

  const categories = await prisma.category.findMany({
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true, children: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">ক্যাটাগরি ম্যানেজমেন্ট</h1>
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">নতুন ক্যাটাগরি</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm parentOptions={categories} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border bg-card p-4"
            >
              <div>
                <p className="font-medium">
                  {c.name}
                  {c.parent && (
                    <Badge variant="secondary" className="ml-2">
                      সাব-ক্যাটাগরি: {c.parent.name}
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c._count.products} প্রোডাক্ট • {c._count.children} সাব-ক্যাটাগরি
                </p>
              </div>
              <form action={deleteCategory.bind(null, c.id)}>
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  মুছুন
                </Button>
              </form>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              এখনো কোনো ক্যাটাগরি নেই
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

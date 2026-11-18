export type InventoryRow = { variantId: string | null; stock: number };

// ভ্যারিয়েন্ট নির্দিষ্ট থাকলে সেই রো; না থাকলে ভ্যারিয়েন্ট রো-গুলোর মোট;
// ভ্যারিয়েন্ট না থাকলে বেস রো (variantId = null)
export function stockOf(rows: InventoryRow[], variantId: string | null = null): number {
  if (variantId !== null) {
    return rows.find((r) => r.variantId === variantId)?.stock ?? 0;
  }
  const variantRows = rows.filter((r) => r.variantId !== null);
  if (variantRows.length > 0) {
    return variantRows.reduce((sum, r) => sum + r.stock, 0);
  }
  return rows.find((r) => r.variantId === null)?.stock ?? 0;
}

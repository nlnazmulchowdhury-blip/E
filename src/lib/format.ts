type DecimalLike = { toNumber(): number };

export function formatBDT(amount: number | string | DecimalLike) {
  const value =
    typeof amount === "object" ? amount.toNumber() : typeof amount === "string" ? parseFloat(amount) : amount;
  return `৳${new Intl.NumberFormat("bn-BD-u-nu-latn", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatBDTWithDecimals(amount: number | string | DecimalLike) {
  const value =
    typeof amount === "object" ? amount.toNumber() : typeof amount === "string" ? parseFloat(amount) : amount;
  return `৳${new Intl.NumberFormat("bn-BD-u-nu-latn", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .trim()
    // বাংলা অক্ষর (U+0980–U+09FF) রাখা হয় যাতে বাংলা নামের স্লাগ খালি না হয়
    .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, "")
    .replace(/\s+/g, "-");
  return slug || `item-${Date.now().toString(36)}`;
}

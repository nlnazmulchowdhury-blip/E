// STAFF-এর জন্য বরাদ্দযোগ্য পারমিশন কী। ADMIN সবসময় সব পারমিশন পায়।
// নিরপেক্ষ মডিউল — ক্লায়েন্ট কম্পোনেন্টও নিরাপদে ইমপোর্ট করতে পারে।
export const STAFF_PERMISSION_KEYS = [
  "categories",
  "products",
  "orders",
  "returns",
  "sellers",
  "customers",
  "withdrawals",
  "commission",
  "coupons",
  "banners",
  "settings",
  "reports",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSION_KEYS)[number];

export const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  categories: "ক্যাটাগরি",
  products: "প্রোডাক্ট",
  orders: "অর্ডার",
  returns: "রিটার্ন",
  sellers: "সেলার",
  customers: "কাস্টমার",
  withdrawals: "উইথড্র",
  commission: "কমিশন",
  coupons: "কুপন",
  banners: "ব্যানার",
  settings: "সেটিংস",
  reports: "রিপোর্ট",
};

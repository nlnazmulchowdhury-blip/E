export const ORDER_FLOW = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
] as const;

export type FlowStatus = (typeof ORDER_FLOW)[number];
export type OrderStatus = FlowStatus | "CANCELLED" | "RETURNED" | "REFUNDED";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "পেন্ডিং",
  CONFIRMED: "নিশ্চিত হয়েছে",
  PROCESSING: "প্রস্তুত হচ্ছে",
  PACKED: "প্যাক করা হয়েছে",
  SHIPPED: "পাঠানো হয়েছে",
  DELIVERED: "পৌঁছে গেছে",
  CANCELLED: "বাতিল",
  RETURNED: "ফেরত",
  REFUNDED: "টাকা ফেরত",
};

// স্ট্যাটাস-বদল বাটনের লেবেল (সেলার ও অ্যাডমিন UI-তে একই)
export const TRANSITION_LABELS: Record<string, string> = {
  CONFIRMED: "কনফার্ম করুন",
  PROCESSING: "প্রসেসিং-এ নিন",
  PACKED: "প্যাক করেছেন",
  SHIPPED: "পাঠিয়ে দিন",
  DELIVERED: "ডেলিভারড করুন",
  CANCELLED: "বাতিল করুন",
  RETURNED: "রিটার্ন",
  REFUNDED: "রিফান্ড",
};

// সাব-অর্ডারের অনুমোদিত স্ট্যাটাস ট্রানজিশন
export const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: [],
};

export function computeParentStatus(statuses: OrderStatus[]): OrderStatus {
  if (statuses.length === 0) return "PENDING";
  if (statuses.every((s) => s === "CANCELLED")) return "CANCELLED";
  if (statuses.every((s) => s === "REFUNDED")) return "REFUNDED";
  if (statuses.some((s) => s === "RETURNED")) return "RETURNED";
  const active = statuses.filter(
    (s): s is FlowStatus => ORDER_FLOW.includes(s as FlowStatus)
  );
  if (active.length === 0) return "CANCELLED";
  const minIndex = Math.min(...active.map((s) => ORDER_FLOW.indexOf(s)));
  return ORDER_FLOW[minIndex];
}

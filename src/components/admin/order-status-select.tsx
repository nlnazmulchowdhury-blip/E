"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "@/lib/actions/orders";

const OPTIONS = [
  { value: "PENDING", label: "পেন্ডিং" },
  { value: "CONFIRMED", label: "কনফার্মড" },
  { value: "PROCESSING", label: "প্রসেসিং" },
  { value: "PACKED", label: "প্যাকড" },
  { value: "SHIPPED", label: "শিপড" },
  { value: "DELIVERED", label: "ডেলিভারড" },
  { value: "CANCELLED", label: "বাতিল" },
  { value: "RETURNED", label: "রিটার্নড" },
  { value: "REFUNDED", label: "রিফান্ডেড" },
];

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    startTransition(async () => {
      await updateOrderStatus(orderId, e.target.value);
    });
  }

  return (
    <select
      key={currentStatus}
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

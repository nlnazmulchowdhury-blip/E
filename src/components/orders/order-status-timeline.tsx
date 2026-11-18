import { CheckCircle2, Circle, PackageCheck, XCircle, RotateCcw, Undo2 } from "lucide-react";
import { ORDER_FLOW } from "@/lib/order-status";

const ORDER_STATUS_STEPS = [
  { key: "PENDING", label: "অর্ডার নেওয়া হয়েছে" },
  { key: "CONFIRMED", label: "কনফার্মড" },
  { key: "PROCESSING", label: "প্রসেসিং" },
  { key: "PACKED", label: "প্যাক করা হয়েছে" },
  { key: "SHIPPED", label: "শিপ করা হয়েছে" },
  { key: "DELIVERED", label: "ডেলিভারি সম্পন্ন" },
];

export function OrderStatusTimeline({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-sm font-medium text-destructive">
        <XCircle className="size-5" /> অর্ডারটি বাতিল করা হয়েছে
      </div>
    );
  }
  if (status === "RETURNED") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 p-4 text-sm font-medium text-amber-600">
        <RotateCcw className="size-5" /> অর্ডারটি রিটার্ন করা হয়েছে
      </div>
    );
  }
  if (status === "REFUNDED") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600">
        <Undo2 className="size-5" /> টাকা ফেরত দেওয়া হয়েছে
      </div>
    );
  }

  const currentIndex = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);

  return (
    <ol className="space-y-4">
      {ORDER_STATUS_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isLast = i === ORDER_STATUS_STEPS.length - 1;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              {done ? (
                <CheckCircle2 className="size-6 text-emerald-500" />
              ) : (
                <Circle className="size-6 text-muted-foreground/40" />
              )}
              {!isLast && (
                <span
                  className={`w-px flex-1 ${done ? "bg-emerald-500" : "bg-muted"}`}
                  style={{ minHeight: 16 }}
                />
              )}
            </div>
            <span
              className={`pt-1 text-sm ${
                done ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
              {i === currentIndex && status === "SHIPPED" && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary">
                  <PackageCheck className="size-3" /> ট্র্যাকিং কোডসহ কুরিয়ারে আছে
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

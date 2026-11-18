"use client";

import { useActionState } from "react";
import { updateShipment, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

const PARTNERS = [
  { value: "", label: "—" },
  { value: "INHOUSE", label: "In-house" },
  { value: "PATHOA", label: "Pathao" },
  { value: "STEADFAST", label: "Steadfast" },
  { value: "REDX", label: "RedX" },
];

const STATUSES = [
  { value: "PENDING", label: "পেন্ডিং" },
  { value: "PICKED_UP", label: "পিকআপ" },
  { value: "IN_TRANSIT", label: "ট্রানজিটে" },
  { value: "DELIVERED", label: "ডেলিভারড" },
  { value: "RETURNED", label: "রিটার্নড" },
];

export function ShipmentEditor({
  orderId,
  partner,
  trackingCode,
  status,
}: {
  orderId: string;
  partner: string | null;
  trackingCode: string | null;
  status: string;
}) {
  const [state, formAction, isPending] = useActionState<AdminState, FormData>(
    updateShipment.bind(null, orderId),
    {}
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <select
        name="partner"
        defaultValue={partner ?? ""}
        className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
      >
        {PARTNERS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <input
        name="trackingCode"
        defaultValue={trackingCode ?? ""}
        placeholder="ট্র্যাকিং"
        className="h-7 w-28 rounded-md border border-input bg-transparent px-1.5 font-mono text-xs"
      />
      <select
        name="status"
        defaultValue={status}
        className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        সেভ
      </Button>
      {state?.message && <span className="text-xs text-emerald-600">{state.message}</span>}
      {state?.errors?.status && (
        <span className="text-xs text-destructive">{state.errors.status[0]}</span>
      )}
    </form>
  );
}

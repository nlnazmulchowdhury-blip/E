"use client";

import { useActionState } from "react";
import { decideReturnRequest, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function ReturnDecisionForm({
  requestId,
  decision,
  itemTotal,
}: {
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  itemTotal: number;
}) {
  const [state, formAction, isPending] = useActionState<AdminState, FormData>(
    decideReturnRequest.bind(null, requestId),
    {}
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="decision" value={decision} />
      {decision === "APPROVED" && (
        <label className="text-xs">
          রিফান্ড (৳)
          <input
            name="refundAmount"
            type="number"
            min={0}
            step="0.01"
            placeholder={String(itemTotal)}
            className="mt-1 block h-8 w-28 rounded-md border border-input bg-transparent px-2 text-xs"
          />
        </label>
      )}
      <label className="text-xs">
        নোট
        <input
          name="adminNote"
          placeholder={decision === "APPROVED" ? "অনুমোদনের কারণ" : "বাতিলের কারণ"}
          className="mt-1 block h-8 w-44 rounded-md border border-input bg-transparent px-2 text-xs"
        />
      </label>
      <Button
        type="submit"
        size="sm"
        variant={decision === "APPROVED" ? "default" : "destructive"}
        disabled={isPending}
      >
        {decision === "APPROVED" ? "অনুমোদন ও রিফান্ড" : "বাতিল"}
      </Button>
      {state?.message && <span className="text-xs text-muted-foreground">{state.message}</span>}
      {state?.errors?.refundAmount && (
        <span className="text-xs text-destructive">{state.errors.refundAmount[0]}</span>
      )}
    </form>
  );
}

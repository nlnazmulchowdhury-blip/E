"use client";

import { useState } from "react";
import { Truck, Zap } from "lucide-react";
import { formatBDT } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SummaryItem = {
  id: string;
  image: string;
  title: string;
  quantity: number;
  lineTotal: number;
};

const PRICING = {
  STANDARD: { inside: 60, outside: 120 },
  EXPRESS: { inside: 120, outside: 200 },
} as const;

export function OrderSummaryCard({
  items,
  subtotal,
  isDhaka,
}: {
  items: SummaryItem[];
  subtotal: number;
  isDhaka: boolean;
}) {
  const [method, setMethod] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const shipping = PRICING[method][isDhaka ? "inside" : "outside"];

  return (
    <Card className="sticky top-32">
      <CardHeader>
        <CardTitle>অর্ডার সামারি</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-52 space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                className="size-12 shrink-0 rounded-md border object-cover"
              />
              <span className="line-clamp-1 flex-1 text-muted-foreground">
                {item.title} × {item.quantity}
              </span>
              <span className="font-medium">{formatBDT(item.lineTotal)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            ডেলিভারি মেথড
          </p>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-muted/50">
            <input
              type="radio"
              name="deliveryMethod"
              value="STANDARD"
              form="checkout-form"
              checked={method === "STANDARD"}
              onChange={() => setMethod("STANDARD")}
            />
            <Truck className="size-4 text-primary" />
            <span className="flex-1">স্ট্যান্ডার্ড (২-৪ দিন)</span>
            <span className="font-medium">{formatBDT(PRICING.STANDARD[isDhaka ? "inside" : "outside"])}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-muted/50">
            <input
              type="radio"
              name="deliveryMethod"
              value="EXPRESS"
              form="checkout-form"
              checked={method === "EXPRESS"}
              onChange={() => setMethod("EXPRESS")}
            />
            <Zap className="size-4 text-amber-500" />
            <span className="flex-1">এক্সপ্রেস (১-২ দিন)</span>
            <span className="font-medium">{formatBDT(PRICING.EXPRESS[isDhaka ? "inside" : "outside"])}</span>
          </label>
        </div>

        <div className="flex justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">সাবটোটাল</span>
          <span className="font-medium">{formatBDT(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
          <span className="font-medium">{formatBDT(shipping)}</span>
        </div>
        <div className="flex justify-between border-t pt-3 text-base">
          <span className="font-semibold">সর্বমোট</span>
          <span className="font-bold text-price">{formatBDT(subtotal + shipping)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

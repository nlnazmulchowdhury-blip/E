"use client";

import { useActionState, useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { placeOrder, type CheckoutState } from "@/lib/actions/checkout";
import { addAddressAction, type AddressState } from "@/lib/actions/address";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  division: string;
  district: string;
  thana: string;
  addressLine: string;
  isDefault: boolean;
};

const PAYMENT_METHODS = [
  { value: "COD", label: "ক্যাশ অন ডেলিভারি", available: true, desc: "প্রোডাক্ট হাতে পেয়ে টাকা দিন" },
  { value: "BKASH", label: "bKash", available: false, desc: "শীঘ্রই আসছে" },
  { value: "NAGAD", label: "Nagad", available: false, desc: "শীঘ্রই আসছে" },
  { value: "SSLCOMMERZ", label: "SSLCommerz (কার্ড)", available: false, desc: "শীঘ্রই আসছে" },
];

export function CheckoutForm({ addresses }: { addresses: Address[] }) {
  const [orderState, orderAction, orderPending] = useActionState<CheckoutState, FormData>(
    placeOrder,
    {}
  );
  const [addrState, addrAction, addrPending] = useActionState<AddressState, FormData>(
    addAddressAction,
    {}
  );
  const [showAddressForm, setShowAddressForm] = useState(addresses.length === 0);
  const [selectedAddress, setSelectedAddress] = useState("");
  // অ্যাড্রেস সেভের পরে প্রপ আপডেট হলেও স্টেট আপডেট হয় না —
  // ডিফল্ট/প্রথম ঠিকানা অটো-সিলেক্ট রাখি যাতে অর্ডার বাটন আটকে না থাকে
  const effectiveAddressId =
    selectedAddress ||
    addresses.find((a) => a.isDefault)?.id ||
    addresses[0]?.id ||
    "";

  useEffect(() => {
    if (addrState.message === "ঠিকানা যোগ হয়েছে") setShowAddressForm(false);
  }, [addrState.message, addresses.length]);

  return (
    <div className="space-y-6">
      {/* Address */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-primary" /> ডেলিভারি ঠিকানা
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAddressForm((v) => !v)}
          >
            <Plus className="size-4" /> নতুন ঠিকানা
          </Button>
        </div>

        {addresses.length > 0 && (
          <div className="space-y-3">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  effectiveAddressId === a.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="addressId"
                  value={a.id}
                  checked={effectiveAddressId === a.id}
                  onChange={() => setSelectedAddress(a.id)}
                  className="mt-1"
                />
                <span className="text-sm">
                  <span className="font-medium">
                    {a.fullName} — {a.phone}
                    {a.isDefault && (
                      <Badge variant="secondary" className="ml-2">ডিফল্ট</Badge>
                    )}
                  </span>
                  <span className="block text-muted-foreground">
                    {a.addressLine}, {a.thana}, {a.district}, {a.division}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {showAddressForm && (
          <form action={addrAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">পুরো নাম</Label>
              <Input id="fullName" name="fullName" placeholder="আপনার নাম" />
              {addrState.errors?.fullName && (
                <p className="mt-1 text-xs text-destructive">{addrState.errors.fullName[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">মোবাইল নম্বর</Label>
              <Input id="phone" name="phone" placeholder="01700000000" />
              {addrState.errors?.phone && (
                <p className="mt-1 text-xs text-destructive">{addrState.errors.phone[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="division">বিভাগ</Label>
              <Input id="division" name="division" placeholder="ঢাকা" />
              {addrState.errors?.division && (
                <p className="mt-1 text-xs text-destructive">{addrState.errors.division[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="district">জেলা</Label>
              <Input id="district" name="district" placeholder="ঢাকা" />
              {addrState.errors?.district && (
                <p className="mt-1 text-xs text-destructive">{addrState.errors.district[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="thana">থানা/উপজেলা</Label>
              <Input id="thana" name="thana" placeholder="ধানমন্ডি" />
              {addrState.errors?.thana && (
                <p className="mt-1 text-xs text-destructive">{addrState.errors.thana[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="addressLine">সম্পূর্ণ ঠিকানা</Label>
              <Input id="addressLine" name="addressLine" placeholder="বাসা, রোড, এলাকা" />
              {addrState.errors?.addressLine && (
                <p className="mt-1 text-xs text-destructive">{addrState.errors.addressLine[0]}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={addrPending}>
                {addrPending ? "সংরক্ষণ হচ্ছে..." : "ঠিকানা সংরক্ষণ করুন"}
              </Button>
              {addrState.message && (
                <span className="ml-3 text-sm text-emerald-600">{addrState.message}</span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Payment + coupon + order action in one form */}
      <form action={orderAction} id="checkout-form" className="space-y-6">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">পেমেন্ট পদ্ধতি</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.value}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  m.available ? "cursor-pointer hover:bg-muted/50" : "opacity-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.value}
                  defaultChecked={m.value === "COD"}
                  disabled={!m.available}
                  className="mt-1"
                />
                <span className="text-sm">
                  <span className="font-medium">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">কুপন ও নোট</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="couponCode">কুপন কোড (ঐচ্ছিক)</Label>
              <Input id="couponCode" name="couponCode" placeholder="যেমন: WELCOME10" className="uppercase" />
            </div>
            <div>
              <Label htmlFor="note">ডেলিভারি নোট (ঐচ্ছিক)</Label>
              <Textarea id="note" name="note" rows={1} placeholder="বিশেষ কোনো নির্দেশনা" />
            </div>
          </div>
        </section>

        <div className="space-y-3">
          {effectiveAddressId && <input type="hidden" name="addressId" value={effectiveAddressId} />}
          <Button type="submit" size="lg" className="w-full" disabled={orderPending || !effectiveAddressId}>
            {orderPending ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
          </Button>
          {!effectiveAddressId && (
            <p className="text-center text-xs text-destructive">অর্ডারের জন্য ঠিকানা প্রয়োজন</p>
          )}
          {orderState.message && (
            <p className="text-center text-sm text-destructive">{orderState.message}</p>
          )}
          {orderState.errors?.addressId && (
            <p className="text-center text-sm text-destructive">{orderState.errors.addressId[0]}</p>
          )}
        </div>
      </form>
    </div>
  );
}

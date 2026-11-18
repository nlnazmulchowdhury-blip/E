"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type SellerDetailData = {
  shopName: string | null;
  description: string | null;
  address: string | null;
  ownerName: string;
  email: string;
  phone: string | null;
  bkashNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNo: string | null;
  appliedAt: string;
  status: string;
  statusLabel: string;
  rejectionReason: string | null;
  productCount: number;
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function SellerDetailButton({ seller }: { seller: SellerDetailData }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          বিস্তারিত
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{seller.shopName ?? "নামহীন শপ"}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="secondary">{seller.statusLabel}</Badge>
            <span>আবেদন: {seller.appliedAt}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              মালিক
            </p>
            <div className="space-y-2">
              <Row label="নাম" value={seller.ownerName} />
              <Row label="ইমেইল" value={seller.email} />
              <Row label="মোবাইল" value={seller.phone} />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              শপ
            </p>
            <div className="space-y-2">
              <Row label="ঠিকানা" value={seller.address} />
              <Row label="বিবরণ" value={seller.description} />
              <Row label="প্রোডাক্ট সংখ্যা" value={String(seller.productCount)} />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              পেমেন্ট তথ্য
            </p>
            <div className="space-y-2">
              <Row label="বিকাশ নম্বর" value={seller.bkashNumber} />
              <Row label="ব্যাংকের নাম" value={seller.bankName} />
              <Row label="অ্যাকাউন্টধারীর নাম" value={seller.bankAccountName} />
              <Row label="অ্যাকাউন্ট নম্বর" value={seller.bankAccountNo} />
            </div>
          </div>

          {seller.rejectionReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive">বাতিলের কারণ</p>
              <p className="mt-1 text-sm">{seller.rejectionReason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

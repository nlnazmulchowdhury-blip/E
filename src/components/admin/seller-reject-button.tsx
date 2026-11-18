"use client";

import { useState } from "react";
import { rejectSeller } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SellerRejectButton({ sellerId }: { sellerId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleReject() {
    setError("");
    setPending(true);
    try {
      await rejectSeller(sellerId, reason);
      setOpen(false);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "কিছু ভুল হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive">
          বাতিল
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>আবেদন বাতিল করুন</DialogTitle>
          <DialogDescription>
            সেলার আবেদনকারী এই কারণটি দেখতে পাবেন এবং তথ্য ঠিক করে আবার আবেদন করতে পারবেন
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="যেমন: শপের নামের সাথে তথ্যের মিল নেই, প্রয়োজনীয় কাগজপত্র সঠিক নয়"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            ফিরে যান
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || reason.trim().length < 5}
            onClick={handleReject}
          >
            {pending ? "বাতিল হচ্ছে..." : "নিশ্চিতভাবে বাতিল করুন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

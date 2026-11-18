"use client";

import { useActionState } from "react";
import { Star } from "lucide-react";
import { submitReview, type ReviewState } from "@/lib/actions/review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ReviewForm({
  productId,
  hasReviewed,
}: {
  productId: string;
  hasReviewed: boolean;
}) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    (prev, formData) => submitReview(productId, prev, formData),
    {}
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border bg-card p-5"
    >
      <h3 className="mb-4 font-semibold">
        {hasReviewed ? "আপনার রিভিউ আপডেট করুন" : "একটি রিভিউ লিখুন"}
      </h3>

      <div className="mb-4">
        <Label className="mb-2 block text-sm">আপনার রেটিং</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={value}
                defaultChecked={value === 5}
                className="peer sr-only"
              />
              <Star className="size-6 fill-muted text-muted transition-colors peer-checked:fill-amber-400 peer-checked:text-amber-400" />
            </label>
          ))}
        </div>
        {state.errors?.rating && (
          <p className="mt-1 text-xs text-destructive">{state.errors.rating[0]}</p>
        )}
      </div>

      <div className="mb-4">
        <Label htmlFor="comment" className="mb-2 block text-sm">
          আপনার মতামত (ঐচ্ছিক)
        </Label>
        <Textarea
          id="comment"
          name="comment"
          rows={3}
          placeholder="এই প্রোডাক্টটি কেমন লাগলো?"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "জমা হচ্ছে..." : "রিভিউ জমা দিন"}
      </Button>
      {state.message && (
        <p
          className={`mt-2 text-sm ${
            state.errors ? "text-destructive" : "text-emerald-600"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

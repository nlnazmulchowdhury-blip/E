"use client";

import { useActionState } from "react";
import {
  createSellerProduct,
  updateSellerProduct,
  type SellerState,
} from "@/lib/actions/seller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUrlInput } from "@/components/shared/image-url-input";

type CategoryOption = { id: string; name: string };

type ProductDefaults = {
  title: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  imageUrls: string;
  categoryId: string;
};

export function SellerProductForm({
  categories,
  defaults,
  productId,
}: {
  categories: CategoryOption[];
  defaults?: ProductDefaults;
  productId?: string;
}) {
  const action = productId
    ? updateSellerProduct.bind(null, productId)
    : createSellerProduct;
  const [state, formAction, pending] = useActionState<SellerState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-card p-6">
      <div>
        <Label htmlFor="title">প্রোডাক্টের নাম</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaults?.title}
          placeholder="যেমন: পাঞ্জাবি প্রিমিয়াম কটন"
        />
        {state.errors?.title && (
          <p className="mt-1 text-xs text-destructive">{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="categoryId">ক্যাটাগরি</Label>
        <select
          id="categoryId"
          name="categoryId"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue={defaults?.categoryId ?? ""}
        >
          <option value="">— ক্যাটাগরি নির্বাচন করুন —</option>
          {categories
            .filter((c) => !c.name.includes("→"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {state.errors?.categoryId && (
          <p className="mt-1 text-xs text-destructive">{state.errors.categoryId[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="price">দাম (৳)</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={defaults?.price} />
          {state.errors?.price && (
            <p className="mt-1 text-xs text-destructive">{state.errors.price[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="compareAtPrice">আগের দাম (ঐচ্ছিক)</Label>
          <Input
            id="compareAtPrice"
            name="compareAtPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults?.compareAtPrice}
          />
          {state.errors?.compareAtPrice && (
            <p className="mt-1 text-xs text-destructive">{state.errors.compareAtPrice[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="stock">স্টক</Label>
          <Input id="stock" name="stock" type="number" min="0" step="1" defaultValue={defaults?.stock ?? "1"} />
          {state.errors?.stock && (
            <p className="mt-1 text-xs text-destructive">{state.errors.stock[0]}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">বিবরণ</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults?.description}
          placeholder="প্রোডাক্টের বিস্তারিত — ম্যাটেরিয়াল, সাইজ, ফিচার ইত্যাদি"
        />
        {state.errors?.description && (
          <p className="mt-1 text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <ImageUrlInput
        id="imageUrls"
        name="imageUrls"
        defaultValue={defaults?.imageUrls}
        error={state.errors?.imageUrls?.[0]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "জমা হচ্ছে..." : productId ? "আপডেট করুন" : "প্রোডাক্ট যোগ করুন"}
        </Button>
        <Button asChild variant="outline">
          <a href="/seller/products">বাতিল</a>
        </Button>
      </div>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{state.message}</p>
      )}
    </form>
  );
}

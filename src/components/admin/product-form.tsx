"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProduct, updateProduct, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUrlInput } from "@/components/shared/image-url-input";

type CategoryOption = { id: string; name: string };

export type ProductFormDefaults = {
  title: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  description: string;
  imageUrls: string;
  isFlashSale: boolean;
  flashSalePrice: string;
  status: string;
};

export function ProductForm({
  categories,
  productId,
  defaults,
}: {
  categories: CategoryOption[];
  productId?: string;
  defaults?: ProductFormDefaults;
}) {
  const action = productId ? updateProduct.bind(null, productId) : createProduct;
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});
  const isEdit = !!productId;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="title">প্রোডাক্টের নাম</Label>
        <Input
          id="title"
          name="title"
          placeholder="যেমন: Panjabi Premium Cotton"
          defaultValue={defaults?.title ?? ""}
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
          {categories.map((c) => (
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
          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="2499"
            defaultValue={defaults?.price ?? ""}
          />
          {state.errors?.price && (
            <p className="mt-1 text-xs text-destructive">{state.errors.price[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="compareAtPrice">পুরনো দাম (ঐচ্ছিক)</Label>
          <Input
            id="compareAtPrice"
            name="compareAtPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="2999"
            defaultValue={defaults?.compareAtPrice ?? ""}
          />
          {state.errors?.compareAtPrice && (
            <p className="mt-1 text-xs text-destructive">{state.errors.compareAtPrice[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="stock">স্টক (পিস)</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            placeholder="50"
            defaultValue={defaults?.stock ?? ""}
          />
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
          placeholder="প্রোডাক্টের বিস্তারিত বিবরণ লিখুন..."
          defaultValue={defaults?.description ?? ""}
        />
        {state.errors?.description && (
          <p className="mt-1 text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <ImageUrlInput
        id="imageUrls"
        name="imageUrls"
        defaultValue={defaults?.imageUrls ?? ""}
        error={state.errors?.imageUrls?.[0]}
      />

      <div className="rounded-xl border bg-card p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox name="isFlashSale" className="size-4" defaultChecked={defaults?.isFlashSale} />
          ফ্ল্যাশ সেলে দেখান
        </label>
        <div className="mt-3 max-w-56">
          <Label htmlFor="flashSalePrice">ফ্ল্যাশ সেল দাম (৳)</Label>
          <Input
            id="flashSalePrice"
            name="flashSalePrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="1999"
            defaultValue={defaults?.flashSalePrice ?? ""}
          />
          {state.errors?.flashSalePrice && (
            <p className="mt-1 text-xs text-destructive">{state.errors.flashSalePrice[0]}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="status">স্ট্যাটাস</Label>
        <select
          id="status"
          name="status"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue={defaults?.status ?? "APPROVED"}
        >
          <option value="APPROVED">অনুমোদিত (সাইটে দেখাবে)</option>
          <option value="PENDING">অনুমোদন অপেক্ষায়</option>
          <option value="INACTIVE">নিষ্ক্রিয়</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? (isEdit ? "আপডেট হচ্ছে..." : "তৈরি হচ্ছে...") : isEdit ? "প্রোডাক্ট আপডেট করুন" : "প্রোডাক্ট তৈরি করুন"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/products">বাতিল</Link>
        </Button>
      </div>

      {state.message && !state.errors && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.message}{" "}
          <Link href="/admin/products" className="font-medium underline">
            প্রোডাক্ট লিস্টে যান
          </Link>
        </p>
      )}
    </form>
  );
}

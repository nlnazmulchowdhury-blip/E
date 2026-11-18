"use client";

import { useActionState } from "react";
import { createCategory, type AdminState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ParentOption = { id: string; name: string };

export function CategoryForm({ parentOptions }: { parentOptions: ParentOption[] }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createCategory,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">ক্যাটাগরির নাম</Label>
        <Input id="name" name="name" placeholder="যেমন: Electronics" />
        {state.errors?.name && (
          <p className="mt-1 text-xs text-destructive">{state.errors.name[0]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="description">বিবরণ (ঐচ্ছিক)</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div>
        <Label htmlFor="parentId">প্যারেন্ট ক্যাটাগরি (ঐচ্ছিক)</Label>
        <select
          id="parentId"
          name="parentId"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">— কোনোটি না —</option>
          {parentOptions
            .filter((c) => !c.name.includes("→"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "তৈরি হচ্ছে..." : "ক্যাটাগরি তৈরি করুন"}
      </Button>
      {state.message && !state.errors && (
        <p className="text-sm text-emerald-600">{state.message}</p>
      )}
    </form>
  );
}

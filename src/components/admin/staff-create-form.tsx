"use client";

import { useActionState } from "react";
import { createStaff, type AdminState } from "@/lib/actions/admin";
import { STAFF_PERMISSION_KEYS, STAFF_PERMISSION_LABELS } from "@/lib/staff-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function StaffCreateForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(createStaff, {});

  return (
    <form action={formAction} className="space-y-4 rounded-xl border p-4">
      <h2 className="font-semibold">নতুন স্টাফ তৈরি</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="name">নাম</Label>
          <Input id="name" name="name" placeholder="স্টাফের নাম" />
          {state.errors?.name && (
            <p className="mt-1 text-xs text-destructive">{state.errors.name[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="email">ইমেইল</Label>
          <Input id="email" name="email" type="email" placeholder="staff@example.com" />
          {state.errors?.email && (
            <p className="mt-1 text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="password">পাসওয়ার্ড</Label>
          <Input id="password" name="password" type="password" />
          {state.errors?.password && (
            <p className="mt-1 text-xs text-destructive">{state.errors.password[0]}</p>
          )}
        </div>
      </div>
      <div>
        <Label>পারমিশন</Label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAFF_PERMISSION_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox name="permissions" value={key} className="size-4" />
              {STAFF_PERMISSION_LABELS[key]}
            </label>
          ))}
        </div>
        {state.errors?.permissions && (
          <p className="mt-1 text-xs text-destructive">{state.errors.permissions[0]}</p>
        )}
      </div>
      {state.message && <p className="text-sm text-green-600">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "তৈরি হচ্ছে..." : "স্টাফ তৈরি করুন"}
      </Button>
    </form>
  );
}

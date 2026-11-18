"use client";

import { useActionState } from "react";
import { deleteStaff, updateStaffPermissions, type AdminState } from "@/lib/actions/admin";
import { STAFF_PERMISSION_KEYS, STAFF_PERMISSION_LABELS } from "@/lib/staff-permissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type StaffCard = {
  id: string;
  name: string;
  email: string;
  permissions: unknown;
};

export function StaffPermissionsForm({ staff }: { staff: StaffCard }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    updateStaffPermissions.bind(null, staff.id),
    {}
  );
  const [delState, delAction, delPending] = useActionState<AdminState, FormData>(
    deleteStaff.bind(null, staff.id),
    {}
  );
  const current = Array.isArray(staff.permissions) ? (staff.permissions as string[]) : [];

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{staff.name}</p>
          <p className="text-xs text-muted-foreground">{staff.email}</p>
        </div>
        <form action={delAction}>
          <Button type="submit" variant="destructive" size="sm" disabled={delPending}>
            {delPending ? "ডিলিট হচ্ছে..." : "ডিলিট"}
          </Button>
        </form>
      </div>
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAFF_PERMISSION_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                name="permissions"
                value={key}
                className="size-4"
                defaultChecked={current.includes(key)}
              />
              {STAFF_PERMISSION_LABELS[key]}
            </label>
          ))}
        </div>
        {state.message && <p className="text-sm text-green-600">{state.message}</p>}
        {state.errors?.permissions && (
          <p className="text-xs text-destructive">{state.errors.permissions[0]}</p>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "সেভ হচ্ছে..." : "পারমিশন সেভ করুন"}
        </Button>
      </form>
      {delState.message && <p className="text-sm text-green-600">{delState.message}</p>}
      {delState.errors?.form && (
        <p className="text-xs text-destructive">{delState.errors.form[0]}</p>
      )}
    </div>
  );
}

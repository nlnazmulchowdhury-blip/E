"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(registerAction, {});

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">অ্যাকাউন্ট খুলুন</CardTitle>
        <CardDescription>ফ্রিতে রেজিস্টার করে শপিং শুরু করুন</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">পুরো নাম</Label>
            <Input id="name" name="name" placeholder="আপনার নাম" />
            {state.errors?.name && (
              <p className="mt-1 text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">ইমেইল</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" />
            {state.errors?.email && (
              <p className="mt-1 text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">মোবাইল নম্বর (ঐচ্ছিক)</Label>
            <Input id="phone" name="phone" placeholder="01700000000" />
            {state.errors?.phone && (
              <p className="mt-1 text-xs text-destructive">{state.errors.phone[0]}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input id="password" name="password" type="password" placeholder="কমপক্ষে ৬ অক্ষর" />
            {state.errors?.password && (
              <p className="mt-1 text-xs text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="********" />
            {state.errors?.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">{state.errors.confirmPassword[0]}</p>
            )}
          </div>
          {state.message && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {state.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "রেজিস্টার হচ্ছে..." : "রেজিস্টার করুন"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          আগে থেকেই অ্যাকাউন্ট আছে?{" "}
          <Link href="/login" className="font-medium text-navy hover:underline">
            লগইন করুন
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

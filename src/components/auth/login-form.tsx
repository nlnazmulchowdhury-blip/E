"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/actions/auth";
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

export function LoginForm({ registered }: { registered: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">লগইন করুন</CardTitle>
        <CardDescription>আপনার অ্যাকাউন্টে প্রবেশ করুন</CardDescription>
      </CardHeader>
      <CardContent>
        {registered && (
          <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            রেজিস্ট্রেশন সফল হয়েছে! এখন লগইন করুন।
          </p>
        )}
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">ইমেইল</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" />
            {state.errors?.email && (
              <p className="mt-1 text-xs text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input id="password" name="password" type="password" placeholder="********" />
            {state.errors?.password && (
              <p className="mt-1 text-xs text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          {state.message && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {state.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "লগইন হচ্ছে..." : "লগইন"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          অ্যাকাউন্ট নেই?{" "}
          <Link href="/register" className="font-medium text-navy hover:underline">
            রেজিস্টার করুন
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

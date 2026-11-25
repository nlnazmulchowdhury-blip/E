import { cache } from "react";
import { auth } from "@/auth";

// একই রিকোয়েস্টে হেডার, মোবাইল নেভ, প্রোডাক্ট কার্ড — সবাই সেশন চায়।
// React-এর cache() ডুপ্লিকেট auth() কলগুলো এক রিকোয়েস্টে একবারেই চালায়,
// ফলে কুকি/টোকেন ডিকোড বারবার হয় না।
export const getSession = cache(auth);

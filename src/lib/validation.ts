import { z } from "zod";
import { STAFF_PERMISSION_KEYS } from "@/lib/staff-permissions";

export const registerSchema = z.object({
  name: z.string().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে").trim(),
  email: z.email("সঠিক ইমেইল দিন"),
  phone: z
    .string()
    .regex(/^01[0-9]{9}$/, "সঠিক মোবাইল নম্বর দিন (যেমন: 01700000000)")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে")
    .regex(/[a-zA-Z]/, "পাসওয়ার্ডে অন্তত একটি ইংরেজি অক্ষর থাকতে হবে")
    .regex(/[0-9]/, "পাসওয়ার্ডে অন্তত একটি সংখ্যা থাকতে হবে"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "পাসওয়ার্ড দুটি মিলছে না",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.email("সঠিক ইমেইল দিন"),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "রেটিং দিন").max(5),
  comment: z.string().trim().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "ক্যাটাগরির নাম দিন").trim(),
  description: z.string().trim().optional(),
  parentId: z.string().optional().or(z.literal("")),
});

const optionalPrice = z.union([
  z.coerce.number().positive("সঠিক দাম দিন"),
  z.literal(""),
]);

export const productSchema = z
  .object({
    title: z.string().min(3, "প্রোডাক্টের নাম দিন (কমপক্ষে ৩ অক্ষর)").trim(),
    description: z.string().min(10, "বিবরণ দিন (কমপক্ষে ১০ অক্ষর)").trim(),
    price: z.coerce.number().positive("সঠিক দাম দিন"),
    compareAtPrice: optionalPrice.optional(),
    categoryId: z.string().min(1, "ক্যাটাগরি নির্বাচন করুন"),
    stock: z.coerce.number().int("পূর্ণ সংখ্যা দিন").min(0, "স্টক ০ বা তার বেশি হতে হবে"),
    imageUrls: z
      .string()
      .min(1, "অন্তত একটি ছবির লিংক দিন")
      .refine(
        (v) =>
          v
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .every((u) => /^(https?:\/\/|\/(?!\/))/i.test(u)),
        { message: "প্রতিটি ছবির লিংক http(s):// বা / দিয়ে শুরু হতে হবে, প্রতি লাইনে একটি" }
      ),
    isFlashSale: z.string().optional(),
    flashSalePrice: optionalPrice.optional(),
    status: z.enum(["PENDING", "APPROVED"]),
  })
  .refine((d) => !d.isFlashSale || typeof d.flashSalePrice === "number", {
    message: "ফ্ল্যাশ সেল চালু করলে ফ্ল্যাশ সেল দাম দিতে হবে",
    path: ["flashSalePrice"],
  });

export const sellerApplicationSchema = z.object({
  shopName: z.string().min(3, "শপের নাম দিন (কমপক্ষে ৩ অক্ষর)").trim(),
  description: z
    .string()
    .min(20, "শপের বিবরণ দিন (কমপক্ষে ২০ অক্ষর)")
    .trim(),
  phone: z
    .string()
    .regex(/^01[0-9]{9}$/, "সঠিক মোবাইল নম্বর দিন (যেমন: 01700000000)")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(300, "ঠিকানা সর্বোচ্চ ৩০০ অক্ষর হতে পারবে")
    .optional()
    .or(z.literal("")),
  bankName: z.string().trim().optional(),
  bankAccountName: z.string().trim().optional(),
  bankAccountNo: z.string().trim().optional(),
  bkashNumber: z
    .string()
    .regex(/^01[0-9]{9}$/, "সঠিক বিকাশ নম্বর দিন")
    .optional()
    .or(z.literal("")),
});

export const withdrawalSchema = z.object({
  amount: z.coerce
    .number()
    .positive("সঠিক পরিমাণ দিন")
    .min(100, "সর্বনিম্ন ১০০ টাকা তুলতে পারবেন"),
  method: z.enum(["BKASH", "BANK"], { message: "পদ্ধতি নির্বাচন করুন" }),
});

export const checkoutSchema = z.object({
  addressId: z.string().min(1, "ডেলিভারি ঠিকানা নির্বাচন করুন"),
  deliveryMethod: z.enum(["STANDARD", "EXPRESS"], {
    message: "ডেলিভারি মেথড নির্বাচন করুন",
  }),
  paymentMethod: z.enum(["COD", "BKASH", "NAGAD", "SSLCOMMERZ"]),
  couponCode: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional(),
});

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().min(0, "সঠিক পরিমাণ দিন").optional()
);

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "কুপন কোড দিন (কমপক্ষে ৩ অক্ষর)")
      .max(20, "সর্বোচ্চ ২০ অক্ষর"),
    type: z.enum(["PERCENT", "FIXED"], { message: "টাইপ নির্বাচন করুন" }),
    value: z.coerce.number({ message: "সঠিক পরিমাণ দিন" }).positive("সঠিক পরিমাণ দিন"),
    minOrderAmount: optionalNumber,
    maxUses: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().int("পূর্ণ সংখ্যা দিন").min(1, "সর্বনিম্ন ১").optional()
    ),
    startsAt: z.string().trim().optional().or(z.literal("")),
    endsAt: z.string().trim().optional().or(z.literal("")),
    isActive: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.type === "PERCENT" && d.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "শতাংশ ১০০-এর বেশি হতে পারে না",
      });
    }
  });

export const bannerSchema = z.object({
  title: z.string().trim().max(120, "সর্বোচ্চ ১২০ অক্ষর").optional().or(z.literal("")),
  subtitle: z.string().trim().max(200, "সর্বোচ্চ ২০০ অক্ষর").optional().or(z.literal("")),
  imageUrl: z
    .string()
    .trim()
    .min(1, "ছবির লিংক দিন")
    .regex(/^(https?:\/\/|\/(?!\/))/i, "ছবির লিংক http(s):// বা / দিয়ে শুরু হতে হবে"),
  linkUrl: z.string().trim().optional().or(z.literal("")),
  position: z.enum(["HERO", "STRIP", "PROMO"], { message: "পজিশন নির্বাচন করুন" }),
  sortOrder: z.coerce.number().int("পূর্ণ সংখ্যা দিন").min(0, "০ বা তার বেশি দিন"),
  isActive: z.string().optional(),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে").max(60, "সর্বোচ্চ ৬০ অক্ষর"),
  email: z.string().trim().email("সঠিক ইমেইল দিন"),
  password: z
    .string()
    .min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে")
    .regex(/[a-zA-Z]/, "পাসওয়ার্ডে অন্তত একটি ইংরেজি অক্ষর থাকতে হবে")
    .regex(/[0-9]/, "পাসওয়ার্ডে অন্তত একটি সংখ্যা থাকতে হবে"),
  permissions: z.array(z.enum(STAFF_PERMISSION_KEYS)).default([]),
});

export const staffPermissionsSchema = staffSchema.pick({ permissions: true });

export const adminRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "কারণ কমপক্ষে ৫ অক্ষরের হতে হবে")
    .max(500, "সর্বোচ্চ ৫০০ অক্ষর"),
});

export const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(2, "সাইটের নাম দিন (কমপক্ষে ২ অক্ষর)").max(60, "সর্বোচ্চ ৬০ অক্ষর"),
  siteTagline: z.string().trim().max(120, "সর্বোচ্চ ১২০ অক্ষর").optional().or(z.literal("")),
  supportPhone: z.string().trim().max(30, "সর্বোচ্চ ৩০ অক্ষর").optional().or(z.literal("")),
  supportEmail: z.string().trim().max(60, "সর্বোচ্চ ৬০ অক্ষর").optional().or(z.literal("")),
  orderPhone: z
    .string()
    .trim()
    .regex(/^01\d{9}$/, "সঠিক মোবাইল নম্বর দিন (যেমন: 01700000000)")
    .optional()
    .or(z.literal("")),
  announcement: z.string().trim().max(200, "সর্বোচ্চ ২০০ অক্ষর").optional().or(z.literal("")),
  showFlashSale: z.string().optional(),
  showNewArrivals: z.string().optional(),
  showBestRated: z.string().optional(),
});

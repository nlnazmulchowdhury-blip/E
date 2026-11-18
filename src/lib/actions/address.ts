"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  fullName: z.string().min(2, "নাম দিন").trim(),
  phone: z.string().regex(/^01[0-9]{9}$/, "সঠিক মোবাইল নম্বর দিন"),
  division: z.string().min(2, "বিভাগ দিন").trim(),
  district: z.string().min(2, "জেলা দিন").trim(),
  thana: z.string().min(2, "থানা/উপজেলা দিন").trim(),
  addressLine: z.string().min(5, "সম্পূর্ণ ঠিকানা লিখুন").trim(),
});

export type AddressState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function addAddressAction(
  _prevState: AddressState,
  formData: FormData
): Promise<AddressState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    division: formData.get("division"),
    district: formData.get("district"),
    thana: formData.get("thana"),
    addressLine: formData.get("addressLine"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "ফর্মে ভুল আছে" };
  }

  const userId = session.user.id;
  const count = await prisma.address.count({ where: { userId } });

  await prisma.address.create({
    data: {
      userId,
      ...parsed.data,
      isDefault: count === 0,
    },
  });

  revalidatePath("/checkout");
  return { message: "ঠিকানা যোগ হয়েছে" };
}

export async function deleteAddress(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  await prisma.address.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/checkout");
}

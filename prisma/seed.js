const { PrismaClient } = require("@prisma/client");
const { pbkdf2Sync, randomBytes } = require("node:crypto");

// অ্যাপের `src/lib/password.ts`-এর সাথে একই ফরম্যাট: pbkdf2$iterations$salt$hash
function hashPassword(password) {
  const iterations = 100000;
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `pbkdf2$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

const prisma = new PrismaClient();

async function reset() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
}

async function main() {
  await reset();

  const adminPassword = hashPassword("admin123");
  const customerPassword = hashPassword("customer123");
  const sellerPassword = hashPassword("seller123");

  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@shopdesh.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Demo Customer",
      email: "customer@shopdesh.com",
      password: customerPassword,
      role: "CUSTOMER",
      addresses: {
        create: {
          fullName: "Demo Customer",
          phone: "01700000000",
          division: "Dhaka",
          district: "Dhaka",
          thana: "Dhanmondi",
          addressLine: "House 12, Road 5, Dhanmondi",
          isDefault: true,
        },
      },
    },
  });

  // ডেমো সেলার + দোকান (ফেজ ২-এর জন্য)
  const sellerUser = await prisma.user.create({
    data: {
      name: "Demo Seller",
      email: "seller@shopdesh.com",
      password: sellerPassword,
      role: "SELLER",
      phone: "01800000000",
      sellerProfile: {
        create: {
          status: "APPROVED",
          verifiedAt: new Date(),
          commissionRate: 5,
          bkashNumber: "01800000000",
          shop: {
            create: {
              name: "Demo Store",
              slug: "demo-store",
              description: "ডেমো স্টোর — ফেজ ২ টেস্টিংয়ের জন্য",
            },
          },
        },
      },
    },
  });
  const seller = await prisma.sellerProfile.findUniqueOrThrow({
    where: { userId: sellerUser.id },
  });

  const categories = [];
  const categoryData = [
    { name: "Electronics", slug: "electronics", description: "Phones, laptops, accessories" },
    { name: "Fashion", slug: "fashion", description: "Clothing for men and women" },
    { name: "Home & Living", slug: "home-living", description: "Furniture and home decor" },
    { name: "Beauty & Care", slug: "beauty-care", description: "Cosmetics and personal care" },
    { name: "Groceries", slug: "groceries", description: "Daily essentials and food items" },
    { name: "Sports & Outdoors", slug: "sports-outdoors", description: "Sports gear and fitness" },
  ];

  for (const c of categoryData) {
    const cat = await prisma.category.create({ data: c });
    categories.push(cat);
  }

  const productData = [
    {
      title: "Smartphone X200 Pro 5G",
      slug: "smartphone-x200-pro-5g",
      category: "electronics",
      price: 45999,
      compareAtPrice: 52999,
      stock: 25,
      seller: false,
      description:
        "6.7-inch AMOLED display, 108MP camera, 5000mAh battery, 256GB storage. The best flagship phone with 5G support and fast charging.",
      images: ["https://picsum.photos/seed/x200/600/600", "https://picsum.photos/seed/x200b/600/600"],
      isFlashSale: true,
      flashSalePrice: 39999,
    },
    {
      title: "Wireless Noise Cancelling Headphones",
      slug: "wireless-noise-cancelling-headphones",
      category: "electronics",
      price: 8999,
      compareAtPrice: 11999,
      stock: 40,
      seller: false,
      description:
        "Active noise cancellation, 30-hour battery life, comfortable over-ear design with premium sound quality.",
      images: ["https://picsum.photos/seed/headphones/600/600"],
      isFlashSale: true,
      flashSalePrice: 6999,
    },
    {
      title: "Men's Cotton Panjabi",
      slug: "mens-cotton-panjabi",
      category: "fashion",
      price: 2499,
      compareAtPrice: 3299,
      stock: 0, // ভ্যারিয়েন্টে স্টক
      seller: true,
      description:
        "Premium cotton panjabi with elegant design. Available in multiple colors and sizes. Perfect for any occasion.",
      images: ["https://picsum.photos/seed/panjabi/600/600"],
      variants: [
        { name: "সাইজ: S", sku: "PANJ-S", stock: 15 },
        { name: "সাইজ: M", sku: "PANJ-M", stock: 20 },
        { name: "সাইজ: L", sku: "PANJ-L", stock: 15 },
        { name: "সাইজ: XL", sku: "PANJ-XL", stock: 10 },
      ],
    },
    {
      title: "Women's Designer Saree",
      slug: "womens-designer-saree",
      category: "fashion",
      price: 3499,
      compareAtPrice: 4999,
      stock: 35,
      seller: true,
      description:
        "Beautiful designer saree with blouse piece. Soft fabric, stunning patterns, ideal for weddings and festivals.",
      images: ["https://picsum.photos/seed/saree/600/600"],
    },
    {
      title: "Wooden Study Desk",
      slug: "wooden-study-desk",
      category: "home-living",
      price: 12500,
      compareAtPrice: 15000,
      stock: 12,
      seller: false,
      description:
        "Solid wood study desk with drawer storage. Durable finish, modern design, easy assembly.",
      images: ["https://picsum.photos/seed/desk/600/600"],
    },
    {
      title: "Ceramic Dinner Set (24 Pieces)",
      slug: "ceramic-dinner-set-24",
      category: "home-living",
      price: 4999,
      compareAtPrice: 6499,
      stock: 20,
      seller: false,
      description:
        "Elegant 24-piece ceramic dinner set for 6 people. Microwave and dishwasher safe.",
      images: ["https://picsum.photos/seed/dinnerset/600/600"],
    },
    {
      title: "Organic Face Serum with Vitamin C",
      slug: "organic-face-serum-vitamin-c",
      category: "beauty-care",
      price: 1499,
      compareAtPrice: 1999,
      stock: 80,
      seller: true,
      description:
        "Brightening Vitamin C serum made from organic ingredients. Reduces dark spots and improves skin texture.",
      images: ["https://picsum.photos/seed/serum/600/600"],
      isFlashSale: true,
      flashSalePrice: 999,
    },
    {
      title: "Herbal Hair Oil (200ml)",
      slug: "herbal-hair-oil-200ml",
      category: "beauty-care",
      price: 649,
      stock: 100,
      seller: true,
      description:
        "Traditional herbal hair oil with amla, bhringraj and coconut. Strengthens hair and reduces hair fall.",
      images: ["https://picsum.photos/seed/hairoil/600/600"],
    },
    {
      title: "Premium Basmati Rice (5kg)",
      slug: "premium-basmati-rice-5kg",
      category: "groceries",
      price: 1150,
      compareAtPrice: 1350,
      stock: 200,
      seller: false,
      description:
        "Long-grain premium basmati rice. Aged for extra aroma and taste. Perfect for biryani and polao.",
      images: ["https://picsum.photos/seed/rice/600/600"],
    },
    {
      title: "Organic Honey (500g)",
      slug: "organic-honey-500g",
      category: "groceries",
      price: 850,
      stock: 150,
      seller: false,
      description:
        "100% pure organic honey collected from natural sources. No added sugar or preservatives.",
      images: ["https://picsum.photos/seed/honey/600/600"],
    },
    {
      title: "Yoga Mat with Carry Bag",
      slug: "yoga-mat-carry-bag",
      category: "sports-outdoors",
      price: 1299,
      compareAtPrice: 1799,
      stock: 45,
      seller: false,
      description:
        "6mm thick non-slip yoga mat with free carry bag. Ideal for yoga, pilates and home workouts.",
      images: ["https://picsum.photos/seed/yogamat/600/600"],
    },
    {
      title: "Cricket Bat (English Willow)",
      slug: "cricket-bat-english-willow",
      category: "sports-outdoors",
      price: 5499,
      compareAtPrice: 6999,
      stock: 15,
      seller: false,
      description:
        "Professional grade English willow cricket bat. Well balanced with excellent pick-up.",
      images: ["https://picsum.photos/seed/cricketbat/600/600"],
    },
  ];

  for (const p of productData) {
    const category = categories.find((c) => c.slug === p.category);
    if (!category) continue;
    const product = await prisma.product.create({
      data: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        status: "APPROVED",
        isFlashSale: p.isFlashSale ?? false,
        flashSalePrice: p.flashSalePrice ?? null,
        categoryId: category.id,
        sellerId: p.seller ? seller.id : null,
        inventory: {
          create: { stock: p.stock },
        },
        images: {
          create: p.images.map((url, i) => ({ url, position: i })),
        },
      },
    });

    for (const v of p.variants ?? []) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: v.name,
          sku: v.sku,
          inventory: { create: { productId: product.id, stock: v.stock } },
        },
      });
    }
  }

  const phone = await prisma.product.findUniqueOrThrow({ where: { slug: "smartphone-x200-pro-5g" } });
  await prisma.review.create({
    data: {
      rating: 5,
      comment: "Excellent phone! Battery lasts two days and the camera is amazing.",
      userId: customer.id,
      productId: phone.id,
    },
  });

  // কুপন — চেকআউট টেস্টিংয়ের জন্য
  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      minOrderAmount: 1000,
      maxUses: 100,
      isActive: true,
    },
  });

  console.log("Seed completed:");
  console.log("  Admin    — admin@shopdesh.com / admin123");
  console.log("  Customer — customer@shopdesh.com / customer123");
  console.log("  Seller   — seller@shopdesh.com / seller123 (Demo Store)");
  console.log("  Coupon   — WELCOME10 (১০% ছাড়, সর্বনিম্ন ১০০০৳)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

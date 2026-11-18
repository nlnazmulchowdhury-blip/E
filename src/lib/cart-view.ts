import { stockOf } from "@/lib/inventory";

export type CartDrawerItem = {
  id: string;
  productId: string;
  quantity: number;
  stock: number;
  title: string;
  slug: string;
  imageUrl: string;
  unitPrice: number;
  originalPrice: number | null;
};

type DecimalLike = { toString(): string };

type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    title: string;
    slug: string;
    price: DecimalLike | string | number;
    isFlashSale: boolean;
    flashSalePrice: DecimalLike | string | number | null;
    images: { url: string | null }[];
    inventory: Parameters<typeof stockOf>[0];
  };
};

export function toCartDrawerItems(items: CartLine[]): CartDrawerItem[] {
  return items.map((item) => {
    const price = Number(item.product.price);
    const flashPrice =
      item.product.isFlashSale && item.product.flashSalePrice !== null
        ? Number(item.product.flashSalePrice)
        : null;
    const unitPrice = flashPrice ?? price;
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      stock: stockOf(item.product.inventory, item.variantId),
      title: item.product.title,
      slug: item.product.slug,
      imageUrl: item.product.images[0]?.url ?? "/placeholder.svg",
      unitPrice,
      originalPrice: flashPrice !== null && flashPrice !== price ? price : null,
    };
  });
}

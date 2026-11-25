import { getSession } from "@/lib/session";
import { getCartCount, getCategories } from "@/lib/data";
import { MobileNavBar } from "@/components/layout/mobile-nav-bar";

export async function MobileNav() {
  const session = await getSession();
  const [cartCount, categories] = await Promise.all([
    session?.user?.id ? getCartCount(session.user.id) : Promise.resolve(0),
    getCategories(),
  ]);

  return (
    <MobileNavBar
      cartCount={cartCount}
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      accountHref={session?.user ? "/account" : "/login"}
    />
  );
}

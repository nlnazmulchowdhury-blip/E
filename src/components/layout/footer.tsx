import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t border-[#2f2f2f] bg-[#1d1d1d] text-[#b8b8b8]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="inline-flex items-center">
            <img
              src="/temobay-logo-light.png"
              alt="TemoBay"
              width={608}
              height={128}
              className="h-8 w-auto"
            />
          </div>
          <p className="mt-3 text-sm text-[#8f8f8f]">
            {t("tagline")}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-white">{t("quickLinks")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#8f8f8f]">
            <li><Link href="/categories" className="hover:text-white">{t("allCategories")}</Link></li>
            <li><Link href="/search?q=" className="hover:text-white">{t("productSearch")}</Link></li>
            <li><Link href="/cart" className="hover:text-white">{t("cart")}</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">{t("wishlist")}</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">{t("orderTracking")}</Link></li>
            <li><Link href="/become-seller" className="font-medium text-brand hover:text-white">{t("becomeSeller")}</Link></li>
            <li><Link href="/become-admin" className="font-medium text-brand hover:text-white">{t("becomeAdmin")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white">{t("customerService")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#8f8f8f]">
            <li>{t("helpCenter")}</li>
            <li>{t("returnPolicy")}</li>
            <li>{t("shippingPolicy")}</li>
            <li>{t("privacyPolicy")}</li>
            <li>{t("terms")}</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-white">{t("contact")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#8f8f8f]">
            <li>{t("hotline")}</li>
            <li>{t("email")}</li>
            <li>{t("address")}</li>
            <li className="pt-2 text-xs">
              {t("paymentMethods")}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#2f2f2f] py-4 text-center text-xs text-[#8f8f8f]">
        © {new Date().getFullYear()} TemoBay — {t("copyright")}
      </div>
    </footer>
  );
}

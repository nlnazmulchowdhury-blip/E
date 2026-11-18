import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const LOCALES = ["bn", "en"];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale = cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : "bn";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

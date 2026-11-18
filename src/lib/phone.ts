export function toIntlPhone(phone: string): string | null {
  const digits = phone.replace(/[\s()-]/g, "");
  if (!/^(\+?880|0)?1\d{9}$/.test(digits)) return null;
  const bare = digits.replace(/^\+?880/, "").replace(/^0/, "");
  return `880${bare}`;
}

export function telLink(phone: string): string | null {
  const intl = toIntlPhone(phone);
  return intl ? `tel:+${intl}` : null;
}

export function whatsappLink(phone: string, message: string): string | null {
  const intl = toIntlPhone(phone);
  return intl ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}` : null;
}

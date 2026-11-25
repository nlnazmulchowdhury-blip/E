// Cloudflare Workers-এ প্রতিটি ডেটাবেস কুয়েরির জন্য নতুন কানেকশন (TCP + TLS + auth)
// খুলতে হয়। তাই ক্যাটাগরি/ব্যানার/সাইট সেটিংসের মতো প্রায়-স্থির ডেটা কিছুক্ষণ
// মেমোরিতে রাখি — এতে প্রতি পেজ ভিউতে কয়েকশো মিলিসেকেন্ড বাঁচে।
//
// ক্যাশ প্রতিটি Worker isolate-এর মেমোরিতে আলাদা, তাই অ্যাডমিন কিছু বদলালে
// `invalidateCache()` শুধু ওই isolate-এ কাজ করে; বাকিগুলো TTL শেষে নিজেই
// নতুন ডেটা নেয় (সর্বোচ্চ ~৩০ সেকেন্ড পুরোনো দেখাতে পারে)।

type CacheEntry = { value: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export const CACHE_TTL = 30_000;

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  // একই সময়ে একাধিক কম্পোনেন্ট একই ডেটা চাইলে একটাই কুয়েরি চালাবে
  const pending = inFlight.get(key);
  if (pending) {
    return (await pending) as T;
  }

  const promise = load()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return (await promise) as T;
}

// key-এর প্রিফিক্স মিলিয়ে ক্যাশ ফাঁকা করে (যেমন "categories")
export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

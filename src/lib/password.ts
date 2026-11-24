// পাসওয়ার্ড হ্যাশিং Web Crypto (PBKDF2-SHA256) দিয়ে করি।
//
// আগে bcryptjs (pure JavaScript) ব্যবহার হতো। Cloudflare Workers-এ bcrypt-এর
// ~১০ রাউন্ড হিসাব করতে যে CPU লাগে তা ফ্রি প্ল্যানের CPU সীমা ছাড়িয়ে যায়,
// ফলে লগইন রিকোয়েস্ট ৫০৩ ("Worker exceeded CPU time limit") হয়ে ফেল করত।
// PBKDF2 Web Crypto-র নেটিভ অংশে চলে, তাই CPU বাজেটের মধ্যে থাকে।

const ITERATIONS = 100_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;
const PREFIX = "pbkdf2";

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/** `pbkdf2$<iterations>$<salt-b64>$<hash-b64>` ফরম্যাটে হ্যাশ ফেরত দেয়। */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [prefix, iterationsRaw, saltRaw, hashRaw] = stored.split("$");

  // পুরোনো bcrypt হ্যাশ ($2a$…) Workers-এ যাচাই করা সম্ভব নয় (CPU সীমা)।
  // `npm run db:seed` চালালে ডেমো অ্যাকাউন্টগুলোর হ্যাশ নতুন ফরম্যাটে বসে যায়।
  if (prefix !== PREFIX || !iterationsRaw || !saltRaw || !hashRaw) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 1) return false;

  let expected: Uint8Array;
  let salt: Uint8Array;
  try {
    expected = fromBase64(hashRaw);
    salt = fromBase64(saltRaw);
  } catch {
    return false;
  }

  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;

  // টাইমিং অ্যাটাক এড়াতে সব বাইট তুলনা করি।
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

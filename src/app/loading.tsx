// রুট লেভেলের লোডিং স্কেলেটন — ক্লিক করার সঙ্গে সঙ্গে দেখায়, তাই সার্ভার
// রেন্ডার শেষ হওয়ার আগেই ইউজার বুঝে যায় পেজ আসছে।
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-4 py-8" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="h-7 w-44 rounded-md bg-muted" />
      <div className="mt-3 h-4 w-64 rounded-md bg-muted" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border p-3">
            <div className="aspect-square rounded-lg bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

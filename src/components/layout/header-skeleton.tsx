// হেডার প্রতিটি পেজে সেশন/কার্ট/ক্যাটাগরি কুয়েরি করে, তাই সেটা শেষ হওয়ার আগেই
// ইউজারকে একই উচ্চতার হেডার দেখাই — পেজ ঝাঁপ দেয় না আর স্ক্রিন খালি লাগে না।
export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="hidden h-10 flex-1 animate-pulse rounded-lg bg-muted md:block md:max-w-xl" />
        <div className="ml-auto flex items-center gap-2">
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <nav className="hidden border-t md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-20 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </nav>
    </header>
  );
}

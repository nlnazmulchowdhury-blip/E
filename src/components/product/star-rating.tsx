import { Star } from "lucide-react";

export function StarRating({
  rating,
  size = "size-4",
  showValue = false,
}: {
  rating: number;
  size?: string;
  showValue?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${size} ${
              i <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </span>
      {showValue && (
        <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </span>
  );
}

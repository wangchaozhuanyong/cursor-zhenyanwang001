import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import * as reviewService from "@/services/reviewService";
import type { FeaturedReview } from "@/types/review";
import { Skeleton } from "@/components/ui/skeleton";
import Reveal from "@/components/Reveal";

interface Props {
  limit?: number;
  className?: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating}星`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < rating
              ? "fill-gold text-gold"
              : "text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

function ReviewCard({ r }: { r: FeaturedReview }) {
  return (
    <Link
      to={`/product/${r.product_id}`}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        {r.avatar ? (
          <img
            src={r.avatar}
            alt={r.nickname}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-xs font-bold text-primary-foreground">
            {(r.nickname || "买家")[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {r.nickname || "匿名用户"}
          </p>
          <StarRow rating={r.rating} />
        </div>
      </div>

      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-foreground">
        {r.content}
      </p>

      {r.images?.length > 0 && (
        <div className="flex gap-1.5 overflow-hidden">
          {r.images.slice(0, 3).map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              loading="lazy"
              className="h-14 w-14 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {r.product_name && (
        <div className="mt-auto flex items-center gap-2 rounded-xl bg-secondary/60 px-2.5 py-2">
          {r.product_cover && (
            <img
              src={r.product_cover}
              alt=""
              className="h-9 w-9 shrink-0 rounded object-cover"
            />
          )}
          <span className="line-clamp-1 text-xs text-muted-foreground group-hover:text-foreground">
            {r.product_name}
          </span>
        </div>
      )}
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="mt-auto h-12 w-full rounded-xl" />
    </div>
  );
}

export default function FeaturedReviewsSection({
  limit = 6,
  className = "",
}: Props) {
  const [list, setList] = useState<FeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    reviewService
      .fetchFeaturedReviews(limit)
      .then((data) => {
        if (alive) setList(data);
      })
      .catch(() => {
        if (alive) setList([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  if (!loading && list.length === 0) return null;

  return (
    <section className={`px-4 md:px-0 ${className}`}>
      <Reveal index={0} className="mb-3 block">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground md:text-lg">
              ⭐ 真实用户口碑
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              来自已购顾客的真实评价
            </p>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)
          : list.map((r, i) => (
              <Reveal key={r.id} index={i} className="h-full">
                <ReviewCard r={r} />
              </Reveal>
            ))}
      </div>
    </section>
  );
}

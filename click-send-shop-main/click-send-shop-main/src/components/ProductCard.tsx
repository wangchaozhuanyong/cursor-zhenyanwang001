import { useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import type { Product } from "@/types/product";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(product.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className="relative aspect-square overflow-hidden bg-secondary"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        {!imgLoaded && <Skeleton className="absolute inset-0 h-full w-full" />}
        <img
          src={product.cover_image}
          alt={product.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute left-2 top-2 flex gap-1">
          {product.is_hot && (
            <span className="rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
              热销
            </span>
          )}
          {product.is_new && (
            <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
              新品
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
            toast.success(isFavorite ? "已取消收藏" : "已收藏");
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-all active:scale-90"
        >
          <Heart
            size={16}
            className={isFavorite ? "fill-destructive text-destructive" : "text-foreground"}
          />
        </button>
      </div>
      <div className="p-3">
        <h3
          className="mb-1.5 line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-tight text-foreground"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          {product.name}
        </h3>
        <div className="flex items-end justify-between gap-1">
          <div className="min-w-0">
            <span className="text-lg font-bold leading-none text-gold">
              RM {product.price}
            </span>
            <span className="ml-1 whitespace-nowrap text-[10px] text-muted-foreground">
              +{product.points}积分
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addItem(product);
              toast.success("已加入购物车");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all active:scale-90 hover:bg-gold touch-target"
          >
            <ShoppingCart size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

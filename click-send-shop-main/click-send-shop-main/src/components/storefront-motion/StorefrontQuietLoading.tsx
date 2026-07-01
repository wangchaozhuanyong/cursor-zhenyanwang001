import { cn } from "@/lib/utils";

type StorefrontQuietLoadingProps = {
  label: string;
  className?: string;
};

export default function StorefrontQuietLoading({ label, className }: StorefrontQuietLoadingProps) {
  return (
    <section className={cn("sf-motion-inline-loading", className)} aria-busy="true" aria-label={label}>
      <span className="sf-motion-inline-loading__line" aria-hidden="true" />
    </section>
  );
}

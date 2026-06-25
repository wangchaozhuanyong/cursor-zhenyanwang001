import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ClientCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  padded?: boolean;
};

const ClientCard = forwardRef<HTMLDivElement, ClientCardProps>(
  ({ interactive = false, padded = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "sf-next-card",
          interactive && "sf-next-card--interactive",
          padded && "sf-next-card--padded",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ClientCard.displayName = "ClientCard";

export default ClientCard;

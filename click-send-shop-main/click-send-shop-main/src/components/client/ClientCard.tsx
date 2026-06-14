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
          "client-card",
          interactive && "client-card--interactive",
          padded && "client-card--padded",
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

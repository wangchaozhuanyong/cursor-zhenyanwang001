interface PriceTagProps {
  amount: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export default function PriceTag({ amount, currency = "RM", size = "md" }: PriceTagProps) {
  return (
    <span className={`font-semibold text-gold ${sizeMap[size]}`}>
      {currency} {amount}
    </span>
  );
}

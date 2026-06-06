type TelegramIconProps = {
  size?: number;
  color?: string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

export default function TelegramIcon({
  size = 24,
  color = "#229ED9",
  className,
  "aria-hidden": ariaHidden,
}: TelegramIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.269c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.572-4.462c.537-.194 1.006.131.831.953z"
        fill={color}
      />
    </svg>
  );
}

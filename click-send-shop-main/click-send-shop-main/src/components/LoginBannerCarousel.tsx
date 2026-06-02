import BannerCarousel from "@/components/BannerCarousel";
import type { Banner } from "@/types/banner";

interface LoginBannerCarouselProps {
  banners: Banner[];
  paused?: boolean;
}

export default function LoginBannerCarousel({ banners, paused = false }: LoginBannerCarouselProps) {
  return (
    <BannerCarousel
      banners={banners}
      paused={paused}
      trackingModule="login_banner"
      ariaLabelPrefix="登录页轮播图"
    />
  );
}

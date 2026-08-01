import { Toaster, type ToasterProps } from "@/components/ui/sonner";
import { useAdminAppearance } from "@/contexts/AdminAppearanceProvider";

export default function AdminToastHost(props: ToasterProps) {
  const { mode } = useAdminAppearance();

  return <Toaster {...props} theme={mode} />;
}

import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { ScrollBarsProvider } from "@/contexts/ScrollBarsContext";

const FrontLayout = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <ScrollBarsProvider>
      <div ref={ref}>
        <Outlet />
        <BottomNav />
      </div>
    </ScrollBarsProvider>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

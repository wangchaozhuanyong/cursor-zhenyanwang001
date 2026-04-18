import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const FrontLayout = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref}>
      <Outlet />
      <BottomNav />
    </div>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

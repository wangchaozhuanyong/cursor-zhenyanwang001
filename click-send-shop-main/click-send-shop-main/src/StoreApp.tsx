import { BrowserRouter } from "react-router-dom";
import { StoreAppRoutes } from "@/routes/StoreAppRoutes";

const StoreApp = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <StoreAppRoutes />
  </BrowserRouter>
);

export default StoreApp;

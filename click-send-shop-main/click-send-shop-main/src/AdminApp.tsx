import { BrowserRouter } from "react-router-dom";
import { AdminAppRoutes } from "@/routes/AdminAppRoutes";

const AdminApp = () => (
  <BrowserRouter
    future={{
      v7_relativeSplatPath: true,
    }}
  >
    <AdminAppRoutes />
  </BrowserRouter>
);

export default AdminApp;

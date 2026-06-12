import { BrowserRouter } from "react-router-dom";
import { NavigationHistoryRecorder } from "@/components/NavigationHistoryRecorder";
import { AdminAppRoutes } from "@/routes/AdminAppRoutes";

const AdminApp = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <NavigationHistoryRecorder />
    <AdminAppRoutes />
  </BrowserRouter>
);

export default AdminApp;

import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routes/AppRoutes";

const App = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <AppRoutes />
  </BrowserRouter>
);

export default App;

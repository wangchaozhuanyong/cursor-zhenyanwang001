import { Navigate } from "react-router-dom";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";

export default function NewArrivals() {
  return <Navigate to={NEW_ARRIVAL_CATEGORY_PATH} replace />;
}

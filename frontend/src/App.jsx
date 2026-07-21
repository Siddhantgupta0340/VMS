import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "sonner";

function App() {
  return (
    <>
      <AppRoutes />
      <Toaster richColors closeButton position="top-right" />
    </>
  );
}

export default App;

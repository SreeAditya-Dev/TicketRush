import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ShowList from "./pages/ShowList";
import BookingPage from "./pages/BookingPage";
import PaymentPage from "./pages/PaymentPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ShowList />} />
          <Route path="book/:id" element={<BookingPage />} />
          <Route path="payment/:id" element={<PaymentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

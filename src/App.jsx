import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SupportChatProvider } from './context/SupportChatContext';

// Layout Components (Load immediately - they're needed on every page)
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Modal Components (Load immediately - small and frequently used)
import LoginModal from './components/modals/LoginModal';
import LocationModal from './components/modals/LocationModal';

// Cart Components (Load immediately - frequently used)
import CartDrawer from './components/cart/CartDrawer';

// Support Chat Widget (Load immediately - global component)
import SupportChatWidget from './components/support/SupportChatWidget';

// Lazy load page components (code splitting)
const HomePage = lazy(() => import('./pages/home/HomePage'));
const CategoryPage = lazy(() => import('./pages/product/CategoryPage'));
const ProductDetailPage = lazy(() => import('./pages/product/ProductDetailPage'));
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const OrderTrackingPage = lazy(() => import('./pages/checkout/OrderTrackingPage'));
const OrderSummaryPage = lazy(() => import('./pages/checkout/OrderSummaryPage'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const SearchPage = lazy(() => import('./pages/search/SearchPage'));
const AboutPage = lazy(() => import('./pages/static/AboutPage'));
const FAQsPage = lazy(() => import('./pages/static/FAQsPage'));
const ContactPage = lazy(() => import('./pages/static/ContactPage'));
const TermsPage = lazy(() => import('./pages/static/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/static/PrivacyPage'));
const SecurityPage = lazy(() => import('./pages/static/SecurityPage'));

// Lazy load marketing components (not critical for initial render)
const MembershipNotification = lazy(() => import('./components/membership/MembershipNotification'));
const NewsletterPopup = lazy(() => import('./components/marketing/NewsletterPopup'));

const RecentPurchaseNotification = lazy(() => import('./components/marketing/RecentPurchaseNotification'));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <CartProvider>
        <SupportChatProvider>
          <div className="min-h-screen flex flex-col pt-0 relative">


            <Header />
            <LoginModal />
            <LocationModal />
            <CartDrawer />

            <Suspense fallback={null}>
              <MembershipNotification />
            </Suspense>

            <main className="flex-1 bg-white">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/category/:categoryId" element={<CategoryPage />} />
                  <Route path="/product/:productId" element={<ProductDetailPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-tracking/:orderId" element={<OrderTrackingPage />} />
                  <Route path="/order-summary/:orderId" element={<OrderSummaryPage />} />
                  <Route path="/orders" element={<AccountPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/faqs" element={<FAQsPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                </Routes>
              </Suspense>
            </main>

            <Footer />

            <Suspense fallback={null}>
              <NewsletterPopup />
              <RecentPurchaseNotification />
            </Suspense>

            {/* Support Chat Widget */}
            <SupportChatWidget />
          </div>
        </SupportChatProvider>
      </CartProvider>
    </Router>
  );
}

export default App;

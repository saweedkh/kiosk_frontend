"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ProductCard } from "@/components/customer/ProductCard";
import { CartView } from "@/components/customer/CartView";
import { CategoryFilter } from "@/components/customer/CategoryFilter";
import { PaymentModal } from "@/components/customer/PaymentModal";
import { productsApi } from "@/lib/api/products";
import { ordersApi } from "@/lib/api/orders";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatNumber } from "@/lib/utils";

export default function CustomerPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "waiting" | "success" | "failed" | "cancelled"
  >("waiting");
  const [currentOrder, setCurrentOrder] = useState<{
    id: number;
    orderNumber: string;
  } | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cartClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getTotalItems, items, getTotalPrice, clearCart } = useCartStore();

  useEffect(() => {
    setIsMounted(true);
    
    // همیشه token های authentication را پاک کن برای امنیت
    // صفحه مشتری نباید نیاز به authentication داشته باشد
    const clearAuthTokens = () => {
      if (typeof window === "undefined") return;

      // پاک کردن auth-storage از localStorage
      localStorage.removeItem("auth-storage");
      
      // همچنین از store هم پاک کن
      const { logout } = useAuthStore.getState();
      logout();
    };

    clearAuthTokens();

    // Clear other localStorage when coming from admin panel or direct access
    // This ensures user needs to login again when accessing admin
    const clearStorage = () => {
      if (typeof window === "undefined") return;
      
      const referrer = document.referrer;
      const currentOrigin = window.location.origin;
      
      // Check if we're coming from admin (check referrer or sessionStorage flag)
      const isFromAdmin = 
        (referrer && referrer.includes("/admin")) ||
        sessionStorage.getItem("from-admin") === "true";
      
      // Check if user came directly (no referrer or referrer is from different origin)
      // This means user typed URL directly or came from external site
      const isDirectAccess =
        !referrer ||
        referrer === "" ||
        !referrer.startsWith(currentOrigin) ||
        referrer === window.location.href;
      
      // Clear other localStorage if coming from admin OR direct access
      if (isFromAdmin || isDirectAccess) {
        // Clear other Zustand persisted stores (but not auth-storage, already cleared)
        localStorage.removeItem("cart-storage");
        localStorage.removeItem("theme-storage");
        
        // Clear sessionStorage flag
        sessionStorage.removeItem("from-admin");
      }
    };
    
    clearStorage();
  }, []);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (cartClearTimeoutRef.current) {
        clearTimeout(cartClearTimeoutRef.current);
      }
    };
  }, []);

  // پاک کردن خودکار سبد خرید بعد از یک دقیقه
  useEffect(() => {
    // اگر سبد خرید خالی است، timer را پاک کن
    if (items.length === 0) {
      if (cartClearTimeoutRef.current) {
        clearTimeout(cartClearTimeoutRef.current);
        cartClearTimeoutRef.current = null;
      }
      return;
    }

    // اگر timer قبلی وجود دارد، آن را پاک کن
    if (cartClearTimeoutRef.current) {
      clearTimeout(cartClearTimeoutRef.current);
    }

    // Timer جدید برای پاک کردن سبد خرید بعد از یک دقیقه
    cartClearTimeoutRef.current = setTimeout(() => {
      clearCart();
      cartClearTimeoutRef.current = null;
    }, 60000); // 60 ثانیه = 60000 میلی‌ثانیه

    // Cleanup function
    return () => {
      if (cartClearTimeoutRef.current) {
        clearTimeout(cartClearTimeoutRef.current);
        cartClearTimeoutRef.current = null;
      }
    };
  }, [items, clearCart]);

  const handleLogoClick = () => {
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    // If clicked 5 times, redirect to admin
    if (newCount >= 5) {
      // Clear the from-admin flag since we're going TO admin, not FROM admin
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("from-admin");
      }
      router.push("/admin");
      setLogoClickCount(0);
      return;
    }

    // Reset count after 2 seconds of no clicks
    clickTimeoutRef.current = setTimeout(() => {
      setLogoClickCount(0);
    }, 2000);
  };

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productsApi.getCategories({ page_size: 1000 }), // Get all categories
  });

  // Extract categories array from response (handle both array and paginated response)
  const categories = (() => {
    if (!categoriesData?.result) return [];
    
    // If result is an array, return it directly
    if (Array.isArray(categoriesData.result)) {
      return categoriesData.result;
    }
    
    // If result is paginated (has results property), return results array
    if (
      categoriesData.result &&
      typeof categoriesData.result === "object" &&
      "results" in categoriesData.result
    ) {
      return Array.isArray(categoriesData.result.results)
        ? categoriesData.result.results
        : [];
    }
    
    return [];
  })();
  
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", selectedCategory],
    queryFn: () => productsApi.getProducts({
        category: selectedCategory || undefined,
        is_active: true,
      }),
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };
      // این API به صورت blocking کار می‌کند و منتظر می‌ماند تا کاربر کارت بکشد
      return await ordersApi.createOrder(orderData);
    },
    onSuccess: (response) => {
      if (response.result) {
        const order = response.result;
        setCurrentOrder({
          id: order.id,
          orderNumber: order.order_number || `#${order.id}`,
        });

        // بررسی وضعیت پرداخت از response
        // API بعد از انجام پرداخت (موفق یا ناموفق) response برمی‌گرداند
        if (
          order.payment_status === "paid" ||
          order.payment_status === "success" ||
          order.status === "paid"
        ) {
          setPaymentStatus("success");
          clearCart();
          
          // به‌روزرسانی لیست محصولات و موجودی‌ها بعد از پرداخت موفق
          // این باعث می‌شود که موجودی‌های جدید از سرور fetch شوند
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          
          // بعد از 10 ثانیه مودال را ببند
          setTimeout(() => {
            setIsPaymentModalOpen(false);
            setCurrentOrder(null);
          }, 10000);
        } else if (
          order.payment_status === "failed" ||
          order.status === "cancelled"
        ) {
          setPaymentStatus("failed");
          // پیام در PaymentModal نمایش داده می‌شود، نیازی به alert نیست
          // بعد از 10 ثانیه مودال را ببند
          setTimeout(() => {
            setIsPaymentModalOpen(false);
            setCurrentOrder(null);
          }, 10000);
        } else {
          // اگر وضعیت مشخص نبود، به عنوان waiting نمایش بده
          setPaymentStatus("waiting");
        }
      }
    },
    onError: (error: any) => {
      console.error("Error creating order:", error);
      
      // بررسی اینکه آیا timeout بوده یا خطای دیگر
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        setPaymentStatus("failed");
        // پیام در PaymentModal نمایش داده می‌شود
      } else {
        // بررسی اینکه آیا این خطای پرداخت است یا خطای واقعی API
        // اگر response.data وجود دارد و payment_status failed است، این خطای پرداخت است
        const responseData = error.response?.data;
        const isPaymentError = 
          (responseData?.result?.payment_status === "failed" ||
           responseData?.result?.status === "failed" ||
           responseData?.result?.status === "cancelled") &&
          responseData?.result?.id; // اگر order id وجود دارد، یعنی order ایجاد شده و فقط پرداخت ناموفق بوده
        
        if (isPaymentError) {
          // این یک خطای پرداخت است، نه خطای API
          // وضعیت را failed تنظیم می‌کنیم و پیام در PaymentModal نمایش داده می‌شود
          setPaymentStatus("failed");
          // اگر order data وجود دارد، آن را تنظیم کنیم
          if (responseData?.result) {
            const order = responseData.result;
            setCurrentOrder({
              id: order.id,
              orderNumber: order.order_number || `#${order.id}`,
            });
          }
          // بعد از 10 ثانیه مودال را ببند
          setTimeout(() => {
            setIsPaymentModalOpen(false);
            setCurrentOrder(null);
          }, 10000);
        } else {
          // این یک خطای واقعی API است (مثلاً 500، 400، network error)
          setPaymentStatus("failed");
          // پیام در PaymentModal نمایش داده می‌شود، نیازی به alert نیست
          // در صورت خطای واقعی API، مودال را بعد از 10 ثانیه ببند
          setTimeout(() => {
            setIsPaymentModalOpen(false);
            setCurrentOrder(null);
          }, 10000);
        }
      }
    },
  });

  const handleCheckout = () => {
    if (items.length === 0) {
      return;
    }
    
    // ابتدا مودال را باز می‌کنیم با وضعیت "waiting"
    // چون API به صورت blocking کار می‌کند و منتظر می‌ماند
    setPaymentStatus("waiting");
    setIsPaymentModalOpen(true);
    setCurrentOrder(null); // هنوز order ایجاد نشده
    
    // سپس درخواست را ارسال می‌کنیم
    // این درخواست تا زمانی که کاربر کارت بکشد و پرداخت انجام شود منتظر می‌ماند
    createOrderMutation.mutate();
  };

  const handlePaymentCancel = () => {
    // اگر درخواست در حال انجام است، نمی‌توانیم آن را لغو کنیم
    // چون API در حال انتظار برای پرداخت است
    // فقط می‌توانیم مودال را ببندیم و به کاربر بگوییم که باید منتظر بماند
    if (createOrderMutation.isPending) {
      // نمی‌توانیم در حین پردازش لغو کنیم
      return;
    }
    
    // اگر status failed است، فقط مودال را ببند (بدون timeout)
    if (paymentStatus === "failed") {
      setIsPaymentModalOpen(false);
      setCurrentOrder(null);
      setPaymentStatus("waiting");
      return;
    }
    
    // برای cancelled، بعد از 2 ثانیه ببند
    setPaymentStatus("cancelled");
    setTimeout(() => {
      setIsPaymentModalOpen(false);
      setCurrentOrder(null);
      setPaymentStatus("waiting");
    }, 2000);
  };

  const handlePaymentConfirm = () => {
    // فقط برای success مودال را ببند
    if (paymentStatus === "success") {
      setIsPaymentModalOpen(false);
      setCurrentOrder(null);
      setPaymentStatus("waiting");
      clearCart();
    }
    // برای failed و cancelled، مودال را باز نگه دار
    // کاربر باید با دکمه "بستن" یا کلیک روی backdrop ببندد
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background dark:bg-background-dark">
      {/* Left Section - Header + Products (2/3) */}
      <div className="w-2/3 flex flex-col border-l border-border dark:border-border-dark overflow-hidden">
        {/* Header */}
        <header className="bg-card dark:bg-card-dark border-b border-border dark:border-border-dark flex-shrink-0 z-30">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-14 h-14 bg-primary rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleLogoClick}
                  title="کلیک کنید"
                >
                  {!logoError ? (
                    <Image
                      src="/logo.png"
                      alt="لوگو نانوایی ستاره سرخ"
                      width={56}
                      height={56}
                      className="object-cover"
                      unoptimized
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <span className="text-white font-bold text-xl">ن</span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text dark:text-text-dark">
                    {process.env.NEXT_PUBLIC_STORE_NAME || 'فروشگاه ساوید'}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Products Section - Scrollable */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          {/* Category Filter */}
          <div className="mb-8">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card dark:bg-card-dark rounded-2xl h-96 animate-pulse"
                />
              ))}
            </div>
          ) : productsData?.result?.results ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productsData.result.results.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-text-secondary dark:text-gray-400">
                محصولی یافت نشد
              </p>
            </div>
          )}
        </main>
        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-border dark:border-border-dark ">
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-text-secondary dark:text-gray-400 text-center">
              © {new Date().getFullYear()} نانوایی ستاره سرخ. تمامی حقوق محفوظ
              است.
            </p>
          </div>
        </footer>
      </div>

      {/* Right Section - Cart View (1/3) */}
      <div className="w-1/3 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <CartView onCheckout={handleCheckout} />
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={getTotalPrice()}
        orderNumber={currentOrder?.orderNumber}
        onCancel={handlePaymentCancel}
        onConfirm={handlePaymentConfirm}
        isLoading={createOrderMutation.isPending}
        status={paymentStatus}
      />
    </div>
  );
}

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { reportsApi } from '@/lib/api/reports'
import { Button } from '@/components/shared/Button'
import { DatePicker } from '@/components/admin/DatePicker'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { formatJalaliDate, formatJalaliDateTime, getTodayJalali, convertJalaliToMiladi } from '@/lib/utils/date'
import type { SalesReport, TransactionReport, ProductReport, StockReport, DailyReport } from '@/lib/api/reports'

export function ReportsManager() {
  const [activeReport, setActiveReport] = useState<'sales' | 'transactions' | 'products' | 'stock' | 'daily'>('sales')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dailyDate, setDailyDate] = useState(getTodayJalali())
  
  // Pagination states for each report
  const [salesPage, setSalesPage] = useState(1)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [productsPage, setProductsPage] = useState(1)
  const [stockPage, setStockPage] = useState(1)
  const [dailyPage, setDailyPage] = useState(1)
  const [pageSize] = useState(20) // Items per page

  // گزارش فروش
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', startDate, endDate, salesPage, pageSize],
    queryFn: () => reportsApi.getSalesReport({
      start_date: convertJalaliToMiladi(startDate) || undefined,
      end_date: convertJalaliToMiladi(endDate) || undefined,
      page: salesPage,
      page_size: pageSize,
    }),
    enabled: activeReport === 'sales',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش تراکنش‌ها
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions-report', startDate, endDate, transactionsPage, pageSize],
    queryFn: () => reportsApi.getTransactionReport({
      start_date: convertJalaliToMiladi(startDate) || undefined,
      end_date: convertJalaliToMiladi(endDate) || undefined,
      page: transactionsPage,
      page_size: pageSize,
    }),
    enabled: activeReport === 'transactions',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش محصولات
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-report', productsPage, pageSize],
    queryFn: () => reportsApi.getProductReport({
      page: productsPage,
      page_size: pageSize,
    }),
    enabled: activeReport === 'products',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش موجودی
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-report', stockPage, pageSize],
    queryFn: () => reportsApi.getStockReport({
      page: stockPage,
      page_size: pageSize,
    }),
    enabled: activeReport === 'stock',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش روزانه
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-report', dailyDate, dailyPage, pageSize],
    queryFn: () => {
      const miladiDate = convertJalaliToMiladi(dailyDate)
      return reportsApi.getDailyReport({
        date: miladiDate || undefined,
        page: dailyPage,
        page_size: pageSize,
      })
    },
    enabled: activeReport === 'daily',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  const isLoading = salesLoading || transactionsLoading || productsLoading || stockLoading || dailyLoading

  // Reset page when report type changes
  const handleReportChange = (report: 'sales' | 'transactions' | 'products' | 'stock' | 'daily') => {
    setActiveReport(report)
    setSalesPage(1)
    setTransactionsPage(1)
    setProductsPage(1)
    setStockPage(1)
    setDailyPage(1)
  }

  // Helper function to render pagination
  const renderPagination = (
    currentPage: number,
    setPage: (page: number) => void,
    totalCount?: number,
    hasNext?: boolean
  ) => {
    // If count is available, use it. Otherwise, check if there's a next page
    if (!totalCount && !hasNext) return null
    if (totalCount && totalCount <= pageSize) return null
    
    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : (hasNext ? currentPage + 1 : currentPage)
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          قبلی
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
            }
            
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "primary" : "outline"}
                size="sm"
                onClick={() => setPage(pageNum)}
                className="min-w-[40px]"
              >
                {pageNum}
              </Button>
            )
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          بعدی
        </Button>
      </div>
    )
  }

  // Helper function to translate order status
  const translateOrderStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'در انتظار',
      'processing': 'در حال پردازش',
      'paid': 'پرداخت شده',
      'completed': 'تکمیل شده',
      'cancelled': 'لغو شده',
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Helper function to translate payment status
  const translatePaymentStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'در انتظار',
      'processing': 'در حال پردازش',
      'success': 'موفق',
      'paid': 'پرداخت شده',
      'failed': 'ناموفق',
      'cancelled': 'لغو شده',
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Helper function to download blob as file
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Export functions using backend API
  const handleExportSales = async () => {
    try {
      const blob = await reportsApi.exportSalesReport({
        start_date: convertJalaliToMiladi(startDate) || undefined,
        end_date: convertJalaliToMiladi(endDate) || undefined,
      })
      const date = formatJalaliDate(new Date()).replace(/\//g, '-')
      downloadBlob(blob, `گزارش_فروش_${date}.xlsx`)
    } catch (error) {
      console.error('Error exporting sales report:', error)
    }
  }

  const handleExportTransactions = async () => {
    try {
      const blob = await reportsApi.exportTransactionReport({
        start_date: convertJalaliToMiladi(startDate) || undefined,
        end_date: convertJalaliToMiladi(endDate) || undefined,
      })
      const date = formatJalaliDate(new Date()).replace(/\//g, '-')
      downloadBlob(blob, `گزارش_تراکنش_${date}.xlsx`)
    } catch (error) {
      console.error('Error exporting transactions report:', error)
    }
  }

  const handleExportProducts = async () => {
    try {
      const blob = await reportsApi.exportProductReport()
      const date = formatJalaliDate(new Date()).replace(/\//g, '-')
      downloadBlob(blob, `گزارش_محصولات_${date}.xlsx`)
    } catch (error) {
      console.error('Error exporting products report:', error)
    }
  }

  const handleExportStock = async () => {
    try {
      const blob = await reportsApi.exportStockReport()
      const date = formatJalaliDate(new Date()).replace(/\//g, '-')
      downloadBlob(blob, `گزارش_موجودی_${date}.xlsx`)
    } catch (error) {
      console.error('Error exporting stock report:', error)
    }
  }

  const handleExportDaily = async () => {
    try {
      const blob = await reportsApi.exportDailyReport({
        date: convertJalaliToMiladi(dailyDate) || undefined,
      })
      const date = formatJalaliDate(new Date()).replace(/\//g, '-')
      downloadBlob(blob, `گزارش_روزانه_${date}.xlsx`)
    } catch (error) {
      console.error('Error exporting daily report:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text dark:text-text-dark">
          گزارشات
        </h2>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeReport === 'sales' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleReportChange('sales')}
          >
            گزارش فروش
          </Button>
          <Button
            variant={activeReport === 'transactions' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleReportChange('transactions')}
          >
            گزارش تراکنش‌ها
          </Button>
          <Button
            variant={activeReport === 'products' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleReportChange('products')}
          >
            گزارش محصولات
          </Button>
          <Button
            variant={activeReport === 'stock' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleReportChange('stock')}
          >
            گزارش موجودی
          </Button>
          <Button
            variant={activeReport === 'daily' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleReportChange('daily')}
          >
            گزارش روزانه
          </Button>
        </div>

        {/* Date Filters */}
        {(activeReport === 'sales' || activeReport === 'transactions') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <DatePicker
              label="از تاریخ"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setSalesPage(1)
                setTransactionsPage(1)
              }}
            />
            <DatePicker
              label="تا تاریخ"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setSalesPage(1)
                setTransactionsPage(1)
              }}
            />
          </div>
        )}

        {activeReport === 'daily' && (
          <div className="mb-6">
            <DatePicker
              label="تاریخ"
              value={dailyDate}
              onChange={(e) => {
                setDailyDate(e.target.value)
                setDailyPage(1)
              }}
            />
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={() => {
              if (activeReport === 'sales') handleExportSales()
              else if (activeReport === 'transactions') handleExportTransactions()
              else if (activeReport === 'products') handleExportProducts()
              else if (activeReport === 'stock') handleExportStock()
              else if (activeReport === 'daily') handleExportDaily()
            }}
            disabled={isLoading || !(
              (activeReport === 'sales' && salesData?.result) ||
              (activeReport === 'transactions' && transactionsData?.result) ||
              (activeReport === 'products' && productsData?.result) ||
              (activeReport === 'stock' && stockData?.result) ||
              (activeReport === 'daily' && dailyData?.result)
            )}
            className="bg-green-600 hover:bg-green-700 text-white border-0 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700"
            size="sm"
          >
            📥 دانلود اکسل
          </Button>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="bg-card dark:bg-card-dark rounded-2xl p-8 border border-border dark:border-border-dark text-center">
          <p className="text-text-secondary dark:text-gray-400">در حال بارگذاری...</p>
        </div>
      ) : (
        <>
          {/* Sales Report */}
          {activeReport === 'sales' && salesData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">مجموع فروش</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(salesData.result.summary?.total_sales || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تعداد سفارشات</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(salesData.result.summary?.total_orders || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">میانگین ارزش سفارش</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(salesData.result.summary?.average_order_value || 0)}
                  </p>
                </div>
              </div>

              {salesData.result.results && salesData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">شماره سفارش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">مبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">وضعیت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {salesData.result.results.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{order.order_number}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(order.total_amount)}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  order.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                  {translateOrderStatus(order.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">
                                {formatJalaliDate(order.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {renderPagination(salesPage, setSalesPage, salesData.result.count, !!salesData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Transactions Report */}
          {activeReport === 'transactions' && transactionsData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">کل تراکنش‌ها</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(transactionsData.result.summary?.total_transactions || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تراکنش‌های موفق</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatNumber(transactionsData.result.summary?.successful_transactions || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تراکنش‌های ناموفق</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatNumber(transactionsData.result.summary?.failed_transactions || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">مجموع مبلغ</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(transactionsData.result.summary?.total_amount || 0)}
                  </p>
                </div>
              </div>

              {transactionsData.result.results && transactionsData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">شماره تراکنش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">شماره سفارش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">مبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">وضعیت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {transactionsData.result.results.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{transaction.transaction_id}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{transaction.order_number}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(transaction.amount)}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  transaction.status === 'success' || transaction.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                  transaction.status === 'pending' || transaction.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  transaction.status === 'cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {translatePaymentStatus(transaction.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">
                                {formatJalaliDate(transaction.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {renderPagination(transactionsPage, setTransactionsPage, transactionsData.result.count, !!transactionsData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Products Report */}
          {activeReport === 'products' && productsData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">کل محصولات</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(productsData.result.summary?.total_products || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">محصولات فعال</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatNumber(productsData.result.summary?.active_products || 0)}
                  </p>
                </div>
              </div>

              {productsData.result.results && productsData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">نام محصول</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">دسته‌بندی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">قیمت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">تعداد فروخته شده</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">درآمد کل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {productsData.result.results.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{product.name}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{product.category_name}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(product.price)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatNumber(product.stock_quantity)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatNumber(product.total_sold)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(product.total_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {renderPagination(productsPage, setProductsPage, productsData.result.count, !!productsData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Stock Report */}
          {activeReport === 'stock' && stockData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">ارزش کل موجودی</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(stockData.result.summary?.total_stock_value || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تعداد کل آیتم‌ها</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(stockData.result.summary?.total_items || 0)}
                  </p>
                </div>
              </div>

              {stockData.result.results && stockData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">نام محصول</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">قیمت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">ارزش موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {stockData.result.results.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{item.name}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatNumber(item.stock_quantity)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(item.price)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(item.stock_value)}</td>
                              <td className="px-6 py-4 text-sm">
                                {item.is_out_of_stock ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    تمام شده
                                  </span>
                                ) : item.is_low_stock ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    کم موجودی
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    موجود
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {renderPagination(stockPage, setStockPage, stockData.result.count, !!stockData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Daily Report */}
          {activeReport === 'daily' && dailyData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">مجموع فروش</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(dailyData.result.summary?.total_sales || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تعداد سفارشات</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(dailyData.result.summary?.total_orders || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">میانگین ارزش سفارش</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(dailyData.result.summary?.average_order_value || 0)}
                  </p>
                </div>
              </div>

              {dailyData.result.results && dailyData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">شماره سفارش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">مبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">وضعیت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {dailyData.result.results.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{order.order_number}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(order.total_amount)}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  order.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                  {translateOrderStatus(order.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">
                                {formatJalaliDate(order.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {renderPagination(dailyPage, setDailyPage, dailyData.result.count, !!dailyData.result.next)}
                </>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}


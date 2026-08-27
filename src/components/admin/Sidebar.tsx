'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useVisibleInterval } from '@/inventory/lib/use-visible-interval'
import { useRealtimeRefresh } from '@/inventory/lib/use-realtime-refresh'
import { useAuth } from '@/lib/auth-context'
import type { AdminPermission } from '@/lib/admin/permissions'
import styles from './Sidebar.module.css'
import { UserCog } from 'lucide-react'
import {
  LayoutDashboard,
  Landmark,
  Zap,
  ClipboardList,
  ChefHat,
  Calendar,
  FileText,
  DollarSign,
  CalendarDays,
  CheckCircle,
  Salad,
  Beer,
  TrendingDown,
  Tag,
  Package,
  RefreshCw,
  Sparkles,
  Truck,
  Receipt,
  BookOpen,
  Factory,
  Trash2,
  ReceiptText,
  LinkIcon,
  MapPin,
  Download,
  Bell,
  Flame,
  BarChart3,
  Settings,
  UtensilsCrossed,
  FolderOpen,
  PartyPopper,
  Gift,
  Image,
  Film,
  Megaphone,
  MessageCircle,
  Mail,
  Users,
  Target,
  Palette,
  ExternalLink,
  LogOut,
  Home,
  Utensils,
  FileEdit,
  ShoppingCart,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  permission?: AdminPermission
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Admin · Overview',
    items: [
      { label: 'Owner Dashboard', icon: <Landmark size={18} />, href: '/dashboard', permission: 'view:owner_dashboard' },
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/admin/dashboard' },
      { label: 'Background Jobs', icon: <Zap size={18} />, href: '/admin/background-jobs', permission: 'background_jobs.read' },
    ],
  },
  {
    label: 'Operations & Stock · Open',
    items: [
      { label: 'Daily Stock Input', icon: <ClipboardList size={18} />, href: '/admin/operations/daily-stock' },
      { label: 'Weekly View', icon: <CalendarDays size={18} />, href: '/admin/operations/weekly' },
      { label: 'Gas Tracker', icon: <Flame size={18} />, href: '/admin/operations/gas' },
      { label: 'Opening Checklist', icon: <CheckCircle size={18} />, href: '/admin/operations' },
      { label: 'Reconcile — Food', icon: <Salad size={18} />, href: '/admin/operations/food/reconcile' },
      { label: 'Reconcile — Beverage', icon: <Beer size={18} />, href: '/admin/operations/beverage/reconcile' },
      { label: 'Stock Counts', icon: <ClipboardList size={18} />, href: '/admin/operations/stock-counts' },
      { label: 'Variance Report', icon: <TrendingDown size={18} />, href: '/admin/operations/variance' },
    ],
  },
  {
    label: 'Operations & Stock · Inventory',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/admin/operations/dashboard' },
      { label: 'All Products', icon: <Tag size={18} />, href: '/admin/operations/products' },
      { label: 'Food Products', icon: <Salad size={18} />, href: '/admin/operations/food/products' },
      { label: 'Beverage Products', icon: <Beer size={18} />, href: '/admin/operations/beverage/products' },
      { label: 'Containers', icon: <Package size={18} />, href: '/admin/operations/beverage/containers' },
      { label: 'Reorder Suggestions', icon: <RefreshCw size={18} />, href: '/admin/operations/reorder' },
      { label: 'Forecasting', icon: <Sparkles size={18} />, href: '/admin/operations/forecast' },
      { label: 'Analytics', icon: <BarChart3 size={18} />, href: '/admin/operations/analytics' },
    ],
  },
  {
    label: 'Operations & Stock · Purchasing',
    items: [
      { label: 'Purchase Orders', icon: <ClipboardList size={18} />, href: '/admin/operations/purchase-orders' },
      { label: 'Receiving', icon: <Package size={18} />, href: '/admin/operations/receiving' },
      { label: 'Suppliers', icon: <Truck size={18} />, href: '/admin/operations/suppliers' },
      { label: 'Supplier Performance', icon: <BarChart3 size={18} />, href: '/admin/operations/supplier-performance', permission: 'view:reports' },
      { label: 'Price History', icon: <DollarSign size={18} />, href: '/admin/operations/price-history', permission: 'view:reports' },
    ],
  },
  {
    label: 'Operations & Stock · Production',
    items: [
      { label: 'Recipes', icon: <BookOpen size={18} />, href: '/admin/operations/recipes' },
      { label: 'Production Runs', icon: <Factory size={18} />, href: '/admin/operations/production-runs' },
      { label: 'Waste & Breakage', icon: <Trash2 size={18} />, href: '/admin/operations/waste' },
      { label: 'Order Items', icon: <ReceiptText size={18} />, href: '/admin/operations/order-items' },
      { label: 'Menu Integration', icon: <LinkIcon size={18} />, href: '/admin/operations/menu-items' },
    ],
  },
  {
    label: 'Operations & Stock · Records',
    items: [
      { label: 'Locations', icon: <MapPin size={18} />, href: '/admin/operations/locations' },
      { label: 'Transactions', icon: <RefreshCw size={18} />, href: '/admin/operations/transactions' },
      { label: 'Imports', icon: <Download size={18} />, href: '/admin/operations/imports' },
      { label: 'Notifications', icon: <Bell size={18} />, href: '/admin/operations/notifications' },
    ],
  },
  {
    label: 'Operations & Stock · Reports',
    items: [
      { label: 'Reports', icon: <BarChart3 size={18} />, href: '/admin/operations/reports', permission: 'view:reports' },
    ],
  },
  {
    label: 'Operations & Stock · Settings',
    items: [
      { label: 'Settings', icon: <Settings size={18} />, href: '/admin/operations/settings', permission: 'view:settings' },
    ],
  },
  {
    label: 'Orders',
    items: [
      { label: 'Orders', icon: <ClipboardList size={18} />, href: '/admin/orders' },
      { label: 'Kitchen', icon: <ChefHat size={18} />, href: '/admin/kitchen' },
    ],
  },
  {
    label: 'Bookings',
    items: [
      { label: 'Bookings', icon: <Calendar size={18} />, href: '/admin/bookings' },
      { label: 'Quotes', icon: <FileText size={18} />, href: '/admin/quotes' },
      { label: 'Pricing', icon: <DollarSign size={18} />, href: '/admin/pricing', permission: 'pricing.write' },
      { label: 'Availability', icon: <CalendarDays size={18} />, href: '/admin/availability', permission: 'settings.write' },
    ],
  },
  {
    label: 'Menu',
    items: [
      { label: 'Menu Items', icon: <UtensilsCrossed size={18} />, href: '/admin/menu', permission: 'cms.write' },
      { label: 'Categories', icon: <FolderOpen size={18} />, href: '/admin/categories', permission: 'cms.write' },
      { label: 'Bar Menu', icon: <Beer size={18} />, href: '/admin/bar-menu', permission: 'bar_menu.write' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Site Settings', icon: <Settings size={18} />, href: '/admin/site-settings', permission: 'settings.write' },
      { label: 'Events', icon: <PartyPopper size={18} />, href: '/admin/events', permission: 'cms.write' },
      { label: 'Promotions', icon: <Gift size={18} />, href: '/admin/promotions', permission: 'cms.write' },
      { label: 'Gallery', icon: <Image size={18} />, href: '/admin/gallery', permission: 'cms.write' },
      { label: 'Media Library', icon: <Film size={18} />, href: '/admin/media', permission: 'media.write' },
      { label: 'Popup', icon: <Megaphone size={18} />, href: '/admin/popup', permission: 'cms.write' },
      { label: 'Announcement', icon: <Megaphone size={18} />, href: '/admin/announcement', permission: 'cms.write' },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Messages', icon: <MessageCircle size={18} />, href: '/admin/messages' },
      { label: 'Inquiries', icon: <Mail size={18} />, href: '/admin/inquiries', permission: 'cms.write' },
      { label: 'Waiters', icon: <Users size={18} />, href: '/admin/waiters', permission: 'view:staff_management' },
      { label: 'Admin Accounts', icon: <UserCog size={18} />, href: '/admin/accounts', permission: 'view:accounts' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Analytics', icon: <BarChart3 size={18} />, href: '/admin/analytics' },
      { label: 'Marketing', icon: <Palette size={18} />, href: '/admin/marketing' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
}

export default function Sidebar({ open, onClose, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const { can, role } = useAuth()
  // R1.1: staff identities (kitchen/bar/waiter) reach this sidebar from
  // /admin/messages — never send them to /admin/dashboard (admin-only).
  const dashboardHref =
    role === 'kitchen' ? '/staff/kitchen'
    : role === 'bar' ? '/staff/bar'
    : role === 'waiter' ? '/staff/waiter'
    : '/admin/dashboard'
  const [unreadCount, setUnreadCount] = useState(0)
  const [inventoryUnread, setInventoryUnread] = useState(0)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const fetchInventoryUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/notifications/unread-count?location_id=main')
      if (res.ok) {
        const json = await res.json()
        setInventoryUnread(json.data?.count ?? 0)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    void fetchInventoryUnread()
  }, [fetchInventoryUnread])

  useVisibleInterval(fetchInventoryUnread, 300000)

  // E1-1: new low/out-of-stock alert (any admin tab, any device) updates
  // the badge within ~1s. 300s poll stays as the fallback.
  useRealtimeRefresh({
    channel: 'e1-sidebar-inventory',
    events: ['stock.low'],
    onRefresh: () => { void fetchInventoryUnread() },
  })

  // E1-5: staff_messages is RLS-blocked for the anon browser key, so the
  // old postgres_changes channel on that table never fired. Consume the
  // anon-readable realtime_events signal table (migration 093) and
  // refetch the unread total — recomputed server-side, idempotent.
  const fetchUnread = useCallback(async () => {
    try {
      const sessionRes = await fetch('/api/staff/session')
      if (!sessionRes.ok) return
      const session = await sessionRes.json()
      if (!session.authenticated) return

      const res = await fetch(`/api/staff/conversations?user_id=${session.staff.id}`)
      if (res.ok) {
        const conversations = await res.json()
        const total = conversations.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0)
        setUnreadCount(total)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    void fetchUnread()
  }, [fetchUnread])

  useRealtimeRefresh({
    channel: 'e1-sidebar-messages',
    events: ['chat.message'],
    onRefresh: () => { void fetchUnread() },
  })

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} />}

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <Link href={dashboardHref} className={styles.logo} onClick={onClose}>
            <span className={styles.logoText}>The Boma Café</span>
          </Link>
          <span className={styles.logoSub}>Admin</span>
        </div>

        <nav className={styles.nav}>
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => !item.permission || can(item.permission))
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label} className={styles.navGroup}>
                <div className={styles.navGroupLabel}>{group.label}</div>
                {visibleItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href === '/admin/dashboard' ? dashboardHref : item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
                  onClick={onClose}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.href === '/admin/messages' && unreadCount > 0 && (
                    <span className={styles.navBadge}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.href === '/admin/operations/notifications' && inventoryUnread > 0 && (
                    <span className={styles.navBadge}>
                      {inventoryUnread > 99 ? '99+' : inventoryUnread}
                    </span>
                  )}
                </Link>
                ))}
              </div>
            )
          })}
        </nav>

        <div className={styles.footer}>
          <Link href="/" className={styles.footerLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} />
            View Website
          </Link>
          <button onClick={onLogout} className={styles.footerButton}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

export function BottomNav({ onMoreClick }: { onMoreClick?: () => void }) {
  const pathname = usePathname()
  const { role } = useAuth()
  // R1.1: staff identities see this nav on /admin/messages — keep Home out of
  // the admin-only /admin/dashboard for them.
  const dashboardHref =
    role === 'kitchen' ? '/staff/kitchen'
    : role === 'bar' ? '/staff/bar'
    : role === 'waiter' ? '/staff/waiter'
    : '/admin/dashboard'

  const tabs = [
    { label: 'Home', icon: <Home size={20} />, href: dashboardHref },
    { label: 'Orders', icon: <ClipboardList size={20} />, href: '/admin/orders' },
    { label: 'Menu', icon: <Utensils size={20} />, href: '/admin/menu' },
    { label: 'Content', icon: <FileEdit size={20} />, href: '/admin/events' },
    { label: 'More', icon: <ShoppingCart size={20} />, href: '#' },
  ]

  return (
    <nav className={styles.bottomNav}>
      {tabs.map(tab => {
        if (tab.label === 'More') {
          return (
            <button key={tab.label} className={styles.bottomNavItem} onClick={onMoreClick}>
              <span className={styles.bottomNavIcon}>{tab.icon}</span>
              <span className={styles.bottomNavLabel}>{tab.label}</span>
            </button>
          )
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.bottomNavItem} ${pathname === tab.href || pathname.startsWith(tab.href + '/') ? styles.bottomNavItemActive : ''}`}
          >
            <span className={styles.bottomNavIcon}>{tab.icon}</span>
            <span className={styles.bottomNavLabel}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

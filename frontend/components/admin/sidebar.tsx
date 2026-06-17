'use client'

import React from 'react'
import { 
  LayoutDashboard, 
  Music, 
  Ticket, 
  Users, 
  TrendingUp, 
  UserCheck, 
  Settings, 
  LogOut,
  Sparkles
} from 'lucide-react'

interface MenuItem {
  name: string
  icon: React.ComponentType<any>
  id: string
}

interface SidebarProps {
  activeSection: string
  onSectionChange: (id: string) => void
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { name: 'Concerts', icon: Music, id: 'concerts' },
    { name: 'Ticket Types', icon: Ticket, id: 'ticket-types' },
    { name: 'Guest List', icon: Users, id: 'guests' },
    { name: 'Revenue Report', icon: TrendingUp, id: 'revenue' },
    { name: 'Staff Management', icon: UserCheck, id: 'staff' },
    { name: 'Settings', icon: Settings, id: 'settings' },
  ]

  return (
    <aside className="w-64 border-r border-slate-200 bg-[#F8F9FA] flex flex-col justify-between h-screen fixed left-0 top-0 text-slate-800 font-sans z-30 shadow-sm">
      {/* Top Section: Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#6C47FF] p-2.5 rounded-xl text-white shadow-md shadow-indigo-200 flex items-center justify-center">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-900">
              TicketBox <span className="text-[#6C47FF] font-semibold text-xs bg-indigo-55 px-1.5 py-0.5 rounded ml-1 border border-indigo-100">Admin</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">BỔN BAN TỔ CHỨC</p>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="mt-8 space-y-1">
          <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quản lý</p>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#6C47FF] text-white shadow-sm shadow-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
                {item.id === 'concerts' && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    9
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section: User Profile & Logout */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-[#6C47FF] text-sm border border-indigo-200 shadow-inner">
              LD
            </div>
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-slate-900 truncate">Lê Duy Minh</h4>
            <p className="text-[10px] text-slate-500 truncate font-mono">minh.le@ticketbox.vn</p>
          </div>
        </div>

        <button 
          onClick={() => alert('Đăng xuất thành công!')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}

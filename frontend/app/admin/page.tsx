'use client'

import React, { useState } from 'react'
import { Sidebar } from '@/components/admin/sidebar'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('concerts')

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex font-sans antialiased">
      {/* Fixed Sidebar component on the left */}
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* Main content area on the right */}
      <main className="flex-1 ml-64 min-h-screen relative p-8 md:p-10 overflow-y-auto">
        {/* Subtle decorative glow in top-right corner of main area */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-b from-[#6C47FF]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {activeSection === 'concerts' ? (
          <AdminDashboard />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] border border-dashed border-slate-800 rounded-2xl bg-[#161D2B]/40 p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Phân hệ "{activeSection}"</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Chức năng quản lý này đang được thiết lập và đồng bộ hóa với hệ thống quản trị TicketBox.
            </p>
            <button 
              onClick={() => setActiveSection('concerts')}
              className="mt-6 text-xs bg-[#6C47FF]/10 text-[#6C47FF] hover:bg-[#6C47FF] hover:text-white border border-[#6C47FF]/30 px-4 py-2 rounded-xl font-medium transition-all"
            >
              Quay lại Quản lý Concert
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

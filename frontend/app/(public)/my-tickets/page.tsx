'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function MyTicketsPage() {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Mock data for tickets since we don't have user authentication in this mockup
  const orders = [
    {
      id: 'ORD-123456',
      concertName: 'The Eras Tour - Taylor Swift',
      date: '2026-10-25T19:30:00Z',
      location: 'Sân vận động Mỹ Đình',
      tickets: [
        {
          id: 'tkt-111',
          seatNumber: 'A12',
          ticketType: 'VIP',
          qrToken: 'abc123mocktoken1',
          isCheckedIn: false,
          status: 'BOOKED',
        },
        {
          id: 'tkt-222',
          seatNumber: 'A13',
          ticketType: 'VIP',
          qrToken: 'abc123mocktoken2',
          isCheckedIn: true, // Already checked in
          status: 'BOOKED',
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-indigo-400 mb-8">Vé của tôi</h1>
        
        {orders.map(order => (
          <div key={order.id} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 mb-6 shadow-xl">
            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{order.concertName}</h2>
                <p className="text-slate-400 mt-1">{new Date(order.date).toLocaleString('vi-VN')}</p>
                <p className="text-slate-400">{order.location}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Mã đơn hàng</p>
                <p className="font-mono font-bold">{order.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.tickets.map((ticket, index) => (
                <div key={ticket.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-indigo-300">Vé {index + 1} - {ticket.ticketType}</p>
                    <p className="text-sm text-slate-400">Ghế: {ticket.seatNumber}</p>
                    {ticket.isCheckedIn ? (
                      <span className="inline-block mt-2 text-xs font-bold px-2 py-1 bg-red-900/30 text-red-400 rounded-lg border border-red-800/50">Đã sử dụng</span>
                    ) : (
                      <span className="inline-block mt-2 text-xs font-bold px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded-lg border border-emerald-800/50">Sẵn sàng</span>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedTicket({ ...ticket, order })}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25"
                  >
                    Xem mã QR
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 p-8 rounded-3xl max-w-sm w-full border border-slate-800 shadow-2xl relative">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-center text-xl font-bold text-white mb-2">E-Ticket</h3>
            <p className="text-center text-slate-400 text-sm mb-6">{selectedTicket.order.concertName}</p>
            
            <div className="bg-white p-4 rounded-2xl flex justify-center mb-6">
              <QRCodeSVG 
                value={selectedTicket.qrToken}
                size={250}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-indigo-400">{selectedTicket.ticketType} - Ghế {selectedTicket.seatNumber}</p>
              {selectedTicket.isCheckedIn ? (
                <p className="text-red-400 font-semibold">Vé đã được check-in</p>
              ) : (
                <p className="text-emerald-400 font-semibold">Đưa mã này cho nhân viên soát vé</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

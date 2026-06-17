'use client'

import { Check } from 'lucide-react'
import Image from 'next/image'

interface PaymentMethodSelectorProps {
  selectedMethod: string | null
  onSelect: (method: string) => void
}

const paymentMethods = [
  {
    id: 'vnpay',
    name: 'VNPAY',
    description: 'Thanh toán qua ví điện tử hoặc ngân hàng',
    icon: '🏦',
  },
  {
    id: 'momo',
    name: 'MoMo',
    description: 'Ứng dụng thanh toán di động phổ biến',
    icon: '📱',
  },
]

export function PaymentMethodSelector({ selectedMethod, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-4">
      {paymentMethods.map((method) => (
        <label
          key={method.id}
          className={`block p-6 rounded-lg border-2 cursor-pointer transition-all ${
            selectedMethod === method.id
              ? 'border-primary bg-primary/5'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center">
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={() => onSelect(method.id)}
              className="w-4 h-4 accent-primary"
            />

            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{method.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-50">{method.name}</p>
                    <p className="text-sm text-slate-400">{method.description}</p>
                  </div>
                </div>

                {selectedMethod === method.id && (
                  <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}

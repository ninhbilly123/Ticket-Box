'use client'

import { Input } from '@/components/ui/input'

interface BuyerInfoFormProps {
  onSubmit: (data: BuyerInfo) => void
}

export interface BuyerInfo {
  fullName: string
  email: string
  phone: string
}

export function BuyerInfoForm({ onSubmit }: BuyerInfoFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-50 mb-2">
          Họ tên
        </label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="Nhập họ tên của bạn"
          className="bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-50 mb-2">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="example@email.com"
          className="bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
          required
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-50 mb-2">
          Số điện thoại
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="0912345678"
          className="bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
      >
        Tiếp tục
      </button>
    </form>
  )
}

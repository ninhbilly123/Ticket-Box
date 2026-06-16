'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  expiredAt?: string
}

export function CountdownTimer({ expiredAt }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (!expiredAt) return

    const target = new Date(expiredAt).getTime()

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const diff = Math.max(0, Math.floor((target - now) / 1000))
      return diff
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiredAt])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  if (!expiredAt || timeLeft <= 0) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-8 flex items-center gap-3">
        <Clock className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-slate-50 font-medium">
            ⏱ <span className="text-red-500 font-bold">Đã hết thời gian giữ vé</span>
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Đơn hàng đã bị hủy. Vui lòng đặt vé lại.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-8 flex items-center gap-3">
      <Clock className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-slate-50 font-medium">
          ⏱ Giữ vé trong{' '}
          <span className="text-red-500 font-bold">{formattedTime}</span>
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Vui lòng hoàn tất thanh toán trước khi hết thời gian
        </p>
      </div>
    </div>
  )
}

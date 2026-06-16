'use client'

import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
}

const steps = [
  { id: 1, name: 'Thông tin' },
  { id: 2, name: 'Thanh toán' },
  { id: 3, name: 'Xác nhận' },
]

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step.id < currentStep
                  ? 'bg-primary text-white'
                  : step.id === currentStep
                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-slate-900'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {step.id < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                step.id
              )}
            </div>

            {/* Step Label */}
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  step.id <= currentStep
                    ? 'text-slate-50'
                    : 'text-slate-500'
                }`}
              >
                {step.name}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 ml-6 transition-all ${
                  step.id < currentStep
                    ? 'bg-primary'
                    : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

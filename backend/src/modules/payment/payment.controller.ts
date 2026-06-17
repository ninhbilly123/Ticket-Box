import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';

const paymentService = new PaymentService();

export class PaymentController {
  /**
   * Initiate payment and return redirect URL
   */
  public async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, gateway } = req.body;

      if (!orderId || !gateway) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thiếu thông tin bắt buộc: orderId, gateway.',
          },
        });
      }

      const result = await paymentService.createPaymentUrl({
        orderId: String(orderId),
        gateway: String(gateway).toLowerCase() as 'vnpay' | 'momo',
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Render a mock HTML payment screen for demonstration/simulation
   */
  public async renderMockCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId, gateway, amount } = req.query;

      if (!paymentId || !gateway || !amount) {
        return res.status(400).send('<h2>Thiếu thông tin thanh toán (paymentId, gateway, amount).</h2>');
      }

      // Return a beautiful simulation screen in HTML
      const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mô phỏng Cổng Thanh Toán</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
            <h1 class="text-2xl font-extrabold text-indigo-400 mb-2">TICKETBOX PAYMENT SIMULATOR</h1>
            <p class="text-xs text-slate-400 mb-6">Bạn đang thực hiện thanh toán cho giao dịch mua vé</p>

            <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-8 space-y-3 text-left text-sm">
              <div class="flex justify-between">
                <span class="text-slate-500">Mã thanh toán:</span>
                <span class="font-mono font-bold text-white">${paymentId}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Cổng thanh toán:</span>
                <span class="font-bold text-indigo-400 uppercase">${gateway}</span>
              </div>
              <div class="flex justify-between border-t border-slate-800 pt-3">
                <span class="text-slate-400 font-semibold">Số tiền cần thanh toán:</span>
                <span class="font-extrabold text-lg text-emerald-400">${Number(amount).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div class="space-y-3">
              <button onclick="submitPayment('SUCCESS')" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-950/20">
                Thanh toán THÀNH CÔNG (SUCCESS)
              </button>
              <button onclick="submitPayment('FAILED')" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-950/20">
                Thanh toán THẤT BẠI (FAILED)
              </button>
            </div>
          </div>

          <script>
            async function submitPayment(status) {
              try {
                const response = await fetch('/api/v1/payments/webhook', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    paymentId: '${paymentId}',
                    status: status,
                    transactionId: 'MOCK-TX-' + Math.floor(100000 + Math.random() * 900000),
                    responseCode: status === 'SUCCESS' ? '00' : '99'
                  })
                });
                const result = await response.json();
                
                if (result.success) {
                  alert('Đã gửi kết quả giao dịch về hệ thống! Trạng thái: ' + status);
                  // Render success/error state inside the simulator
                  document.body.innerHTML = \`
                    <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
                      <div class="\${status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'} text-5xl mb-4">
                        \${status === 'SUCCESS' ? '✓' : '✗'}
                      </div>
                      <h2 class="text-xl font-bold mb-2">Thanh toán hoàn tất</h2>
                      <p class="text-xs text-slate-400 mb-6">Trạng thái giao dịch: \${status}</p>
                      <button onclick="window.close()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-xl text-xs">
                        Đóng cửa sổ
                      </button>
                    </div>
                  \`;
                } else {
                  alert('Lỗi khi gửi webhook: ' + result.error.message);
                }
              } catch (err) {
                alert('Lỗi kết nối API simulator: ' + err.message);
              }
            }
          </script>
        </body>
        </html>
      `;

      return res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Process webhook transaction notification callback
   */
  public async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId, status, transactionId, responseCode } = req.body;

      if (!paymentId || !status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Thiếu thông tin webhook: paymentId, status.',
          },
        });
      }

      const result = await paymentService.processPaymentWebhook({
        paymentId: String(paymentId),
        status: status as 'SUCCESS' | 'FAILED',
        transactionId: transactionId ? String(transactionId) : undefined,
        responseCode: responseCode ? String(responseCode) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

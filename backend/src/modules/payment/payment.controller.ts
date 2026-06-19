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

      // Determine returnUrl dynamically based on incoming request host (e.g. ngrok domain)
      const host = req.get('host');
      const protocol = req.headers['x-forwarded-proto'] as string || req.protocol;
      const returnUrl = `${protocol}://${host}/api/v1/payments/vnpay-return`;
      const ipAddr = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      const result = await paymentService.createPaymentUrl({
        orderId: String(orderId),
        gateway: String(gateway).toLowerCase() as 'vnpay' | 'momo',
        returnUrl,
        ipAddr,
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
   * Process VNPAY Webhook IPN (Server-to-Server)
   */
  public async handleVNPAYIpn(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[VNPAY IPN Query Received]:', req.query);
      const result = await paymentService.processVNPAYIpn(req.query);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Process VNPAY Return URL (Browser Redirection)
   */
  public async handleVNPAYReturn(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[VNPAY Return Query Received]:', req.query);
      const result = await paymentService.processVNPAYReturn(req.query);

      const status = result.success ? 'SUCCESS' : 'FAILED';
      const paymentId = result.payment?.id || 'N/A';
      const amount = result.payment?.amount || '0';

      // Beautiful dark-themed result page matching premium TicketBox design
      const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kết quả thanh toán VNPAY - TicketBox</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
            }
          </style>
        </head>
        <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4">
          <div class="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
            <div class="flex justify-center mb-6">
              ${
                status === 'SUCCESS'
                  ? `<div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 text-3xl font-bold animate-pulse">✓</div>`
                  : `<div class="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 text-3xl font-bold">✗</div>`
              }
            </div>

            <h1 class="text-2xl font-extrabold tracking-tight ${status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'} mb-2">
              ${status === 'SUCCESS' ? 'THANH TOÁN THÀNH CÔNG' : 'THANH TOÁN THẤT BẠI'}
            </h1>
            <p class="text-xs text-slate-400 mb-6">Cảm ơn bạn đã sử dụng dịch vụ đặt vé của TicketBox</p>

            <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-8 space-y-3 text-left text-sm">
              <div class="flex justify-between">
                <span class="text-slate-500">Mã giao dịch:</span>
                <span class="font-mono font-bold text-white">${paymentId}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Cổng thanh toán:</span>
                <span class="font-bold text-indigo-400 uppercase">VNPAY Sandbox</span>
              </div>
              <div class="flex justify-between border-t border-slate-800 pt-3">
                <span class="text-slate-400 font-semibold">Số tiền thanh toán:</span>
                <span class="font-extrabold text-lg text-emerald-400">${Number(amount).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div class="space-y-3">
              <button onclick="window.close()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-950/20">
                Đóng cửa sổ và quay lại
              </button>
            </div>
          </div>
        </body>
        </html>
      `;

      return res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Render a mock HTML payment screen for demonstration/simulation (deprecated but kept for compatibility)
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
   * Process webhook transaction results from MoMo/VNPAY (mock webhook)
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

      // Convert mock callback format to shared updater helper
      const updateResult = await paymentService.processPaymentStatusUpdate(
        String(paymentId),
        status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        transactionId ? String(transactionId) : undefined,
        responseCode ? String(responseCode) : undefined
      );

      return res.status(200).json({
        success: true,
        data: updateResult,
      });
    } catch (err) {
      next(err);
    }
  }
}

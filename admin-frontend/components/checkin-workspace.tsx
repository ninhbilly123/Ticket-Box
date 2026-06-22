'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Camera, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Search, 
  UserCheck, 
  Users, 
  BarChart3, 
  QrCode, 
  RefreshCw, 
  Laptop,
  LogOut
} from 'lucide-react';
import {
  AuthSession,
  CheckinConcert,
  CheckinStats,
  ScanResult,
  VipGuestDetail,
  adminApi,
} from '../lib/api';
import { Html5Qrcode } from 'html5-qrcode';
import { formatStatusLabel } from '../lib/ui-labels';

interface CheckinWorkspaceProps {
  session: AuthSession;
  onLogout: () => void;
}

interface OfflineCheckinLog {
  ticketId: string;
  scannedAtLocal: string;
  concertId: string;
}

export default function CheckinWorkspace({ session, onLogout }: CheckinWorkspaceProps) {
  // Môi trường
  const [concerts, setConcerts] = useState<CheckinConcert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<string>('');
  const [selectedGateId, setSelectedGateId] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Trạng thái tab: 'scan' | 'vip' | 'stats'
  const [activeTab, setActiveTab] = useState<'scan' | 'vip' | 'stats'>('scan');
  
  // Quét QR
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualTicketId, setManualTicketId] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);
  
  // Offline
  const [offlineLogs, setOfflineLogs] = useState<OfflineCheckinLog[]>([]);
  const [syncingOffline, setSyncingOffline] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  
  // VIP Guest
  const [vipQuery, setVipQuery] = useState<string>('');
  const [vipGuests, setVipGuests] = useState<VipGuestDetail[]>([]);
  const [loadingVip, setLoadingVip] = useState<boolean>(false);

  // Thống kê
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const qrCodeInstance = useRef<Html5Qrcode | null>(null);
  const offlineStorageKey = `ticketbox_checkin_offline_${session.user.id}`;
  const selectedConcert = useMemo(
    () => concerts.find((concert) => concert.id === selectedConcertId) || null,
    [concerts, selectedConcertId]
  );
  const currentOfflineLogs = useMemo(
    () => offlineLogs.filter((log) => log.concertId === selectedConcertId),
    [offlineLogs, selectedConcertId]
  );

  // Phát âm thanh báo hiệu qua Web Audio API (không cần tệp .mp3)
  const playSound = (type: 'success' | 'warning' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // Âm bíp cao ngắn (A5)
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'warning') {
        // Âm kép cảnh báo (vé đã dùng)
        osc.frequency.setValueAtTime(440, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(440, ctx.currentTime);
          gain2.gain.setValueAtTime(0.12, ctx.currentTime);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.12);
        }, 180);
      } else {
        osc.frequency.setValueAtTime(180, ctx.currentTime); // Âm ù thấp dài (F3)
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn("Sound API not supported or user gesture required.");
    }
  };

  // 1. Khởi động và kiểm tra kết nối mạng
  useEffect(() => {
    // Theo dõi trạng thái mạng
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load danh sách concert
    const loadInitData = async () => {
      try {
        const data = await adminApi.listCheckinConcerts(session.accessToken);
        setConcerts(data);
        if (data.length > 0) {
          setSelectedConcertId(data[0].id);
        } else {
          setScanErrorMsg('Bạn chưa được phân công soát vé cho sự kiện nào.');
        }
      } catch (err) {
        console.error('Failed to load concerts:', err);
        setScanErrorMsg((err as Error).message || 'Không thể tải sự kiện được phân công.');
      }
    };

    // Load offline logs từ LocalStorage
    const stored = localStorage.getItem(offlineStorageKey);
    if (stored) {
      try {
        setOfflineLogs(JSON.parse(stored) as OfflineCheckinLog[]);
      } catch {
        localStorage.removeItem(offlineStorageKey);
      }
    }

    loadInitData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      void stopScanner();
    };
  }, [session.accessToken, offlineStorageKey]);

  useEffect(() => {
    const firstGate = selectedConcert?.gateIds[0] || '';
    setSelectedGateId(firstGate);
    setDeviceId(firstGate ? `${firstGate}-${session.user.id.slice(0, 8)}` : '');
  }, [selectedConcert?.id, session.user.id]);

  // 2. Tự động đồng bộ khi online trở lại
  useEffect(() => {
    if (isOnline && currentOfflineLogs.length > 0 && selectedConcertId) {
      void triggerOfflineSync();
    }
  }, [isOnline, selectedConcertId, currentOfflineLogs.length]);

  // Load VIP / Stats khi chuyển Tab hoặc đổi Concert
  useEffect(() => {
    if (selectedConcertId) {
      if (activeTab === 'vip') {
        loadVipGuests();
      } else if (activeTab === 'stats') {
        loadStats();
      }
    }
  }, [activeTab, selectedConcertId]);

  // Lưu offline logs vào LocalStorage
  const saveOfflineLogs = (newLogs: OfflineCheckinLog[]) => {
    setOfflineLogs(newLogs);
    localStorage.setItem(offlineStorageKey, JSON.stringify(newLogs));
  };

  // Hàm đồng bộ offline logs lên server
  const triggerOfflineSync = async () => {
    if (!isOnline || currentOfflineLogs.length === 0 || !selectedConcertId) return;
    setSyncingOffline(true);
    setSyncSummary(null);
    try {
      const result = await adminApi.syncOfflineLogs(session.accessToken, {
        concertId: selectedConcertId,
        deviceId,
        logs: currentOfflineLogs.map(({ ticketId, scannedAtLocal }) => ({ ticketId, scannedAtLocal })),
      });
      
      let summary = `Đã đồng bộ thành công ${result.syncedCount} vé.`;
      if (result.conflictCount > 0) {
        summary += ` Phát hiện ${result.conflictCount} vé quét trùng (Tranh chấp).`;
        playSound('error');
      } else {
        playSound('success');
      }
      setSyncSummary(summary);
      saveOfflineLogs(offlineLogs.filter((log) => log.concertId !== selectedConcertId));
      
      // Load lại stats nếu đang ở tab stats
      if (activeTab === 'stats') {
        loadStats();
      }
    } catch (err: any) {
      console.error('[Sync Error]', err);
      setSyncSummary(`Lỗi đồng bộ: ${err.message || 'Không kết nối được máy chủ'}`);
    } finally {
      setSyncingOffline(false);
    }
  };

  // Bật camera quét QR
  const startScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    setScanErrorMsg(null);
    
    // Đợi 200ms để DOM kết xuất phần tử #qr-reader
    setTimeout(async () => {
      try {
        const instance = new Html5Qrcode('qr-reader');
        qrCodeInstance.current = instance;

        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 12,
          },
          (text) => {
            // Nhận diện mã QR
            handleTicketScanned(text);
          },
          () => {
            // Bỏ qua lỗi quét
          }
        );
      } catch (err: any) {
        console.error('Camera startup error:', err);
        setScanErrorMsg('Không thể mở máy quét QR. Vui lòng cấp quyền truy cập thiết bị ghi hình.');
        setIsScanning(false);
      }
    }, 200);
  };

  // Tắt camera
  const stopScanner = async () => {
    if (qrCodeInstance.current && qrCodeInstance.current.isScanning) {
      try {
        await qrCodeInstance.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    qrCodeInstance.current = null;
    setIsScanning(false);
  };

  // Xử lý quét hoặc nhập mã vé
  const handleTicketScanned = async (ticketId: string) => {
    const trimmedId = ticketId.trim();
    if (!trimmedId) return;

    // Tắt quét tạm thời để xử lý kết quả
    if (qrCodeInstance.current) {
      await stopScanner();
    }

    setScanResult(null);
    setScanErrorMsg(null);

    const scannedTime = new Date().toISOString();

    // 1. XỬ LÝ OFFLINE
    if (!isOnline) {
      // Kiểm tra trùng lặp offline cục bộ trước
      const isAlreadyScannedOffline = currentOfflineLogs.some((log) => log.ticketId === trimmedId);
      
      if (isAlreadyScannedOffline) {
        playSound('warning');
        setScanResult({
          status: 'ALREADY_USED',
          deviceId: 'Thiết bị này (quét ngoại tuyến)',
        });
      } else {
        // Lưu tạm vào LocalStorage
        const updated = [...offlineLogs, { ticketId: trimmedId, scannedAtLocal: scannedTime, concertId: selectedConcertId }];
        saveOfflineLogs(updated);
        
        playSound('success');
        setScanResult({
          status: 'VALID',
          ticket: {
            id: trimmedId,
            seatNumber: 'Ngoại tuyến',
            ticketType: 'Vé ngoại tuyến',
            usedAt: scannedTime,
          },
        });
      }
      return;
    }

    // 2. XỬ LÝ ONLINE (Gửi API trực tiếp)
    try {
      const result = await adminApi.scanTicket(session.accessToken, {
        ticketId: trimmedId,
        deviceId,
        scannedAtLocal: scannedTime,
        concertId: selectedConcertId,
      });

      setScanResult(result);

      if (result.status === 'VALID') {
        playSound('success');
      } else if (result.status === 'ALREADY_USED') {
        playSound('warning');
      } else {
        playSound('error');
      }
    } catch (err: any) {
      playSound('error');
      setScanErrorMsg(err.message || 'Lỗi hệ thống khi quét vé.');
    }
  };

  // Xử lý nhập mã tay
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTicketId && selectedConcertId) {
      handleTicketScanned(manualTicketId);
      setManualTicketId('');
    }
  };

  // Tra cứu VIP
  const loadVipGuests = async () => {
    if (!selectedConcertId) return;
    setLoadingVip(true);
    try {
      const list = await adminApi.fetchVipGuests(session.accessToken, selectedConcertId, vipQuery);
      setVipGuests(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVip(false);
    }
  };

  // Check-in VIP
  const handleCheckinVip = async (vipGuestId: string) => {
    try {
      const result = await adminApi.checkinVipGuest(session.accessToken, vipGuestId, deviceId);
      
      if (result.status === 'VALID') {
        playSound('success');
        alert(`Soát vé khách VIP thành công!\nHạng vé: ${result.ticket?.ticketType}`);
      } else {
        playSound('error');
        alert(`Lỗi soát vé VIP: ${formatStatusLabel(result.status)}`);
      }
      loadVipGuests(); // Reload list
    } catch (err: any) {
      playSound('error');
      alert(`Lỗi: ${err.message}`);
    }
  };

  // Load Thống kê
  const loadStats = async () => {
    if (!selectedConcertId) return;
    setLoadingStats(true);
    try {
      const data = await adminApi.fetchCheckinStats(session.accessToken, selectedConcertId);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              TICKETBOX SOÁT VÉ
            </h1>
            <p className="text-xs text-slate-500 font-semibold">Cổng soát vé di động chuyên nghiệp</p>
          </div>
        </div>

        {/* Network & Device Info Panel */}
        <div className="flex items-center gap-4 flex-wrap">
          
          {/* Mạng */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            isOnline 
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'TRỰC TUYẾN' : 'NGOẠI TUYẾN'}
          </div>

          {/* Máy quét */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300 font-medium">
            <Laptop className="w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              value={deviceId} 
              onChange={(e) => setDeviceId(e.target.value)} 
              className="bg-transparent border-0 outline-none w-24 text-slate-200 font-bold"
              placeholder="Mã máy quét" 
            />
          </div>

          {/* Offline Cache Status */}
          {currentOfflineLogs.length > 0 && (
            <button
              onClick={triggerOfflineSync}
              disabled={syncingOffline || !isOnline}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 transition-colors text-slate-950 px-3 py-1.5 rounded-full text-xs font-extrabold shadow-md shadow-amber-500/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
              ĐỒNG BỘ ({currentOfflineLogs.length})
            </button>
          )}
          <div className="text-right text-xs">
            <p className="font-bold text-slate-200">{session.user.fullName}</p>
            <p className="text-slate-500">{selectedGateId || 'Chưa có cổng'}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
            title="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Concert Select & Camera Scan (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Cấu hình Concert chính */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                Đêm diễn được phân công
                <select
                  value={selectedConcertId}
                  onChange={(event) => setSelectedConcertId(event.target.value)}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {concerts.length === 0 ? (
                    <option value="">Chưa có sự kiện được phân công</option>
                  ) : (
                    concerts.map((concert) => (
                      <option key={concert.id} value={concert.id}>
                        {concert.eventCode} · {concert.name} · {new Date(concert.startAt).toLocaleDateString('vi-VN')}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                Cổng phụ trách
                <select
                  value={selectedGateId}
                  onChange={(event) => {
                    setSelectedGateId(event.target.value);
                    setDeviceId(`${event.target.value}-${session.user.id.slice(0, 8)}`);
                  }}
                  disabled={!selectedConcert?.gateIds.length}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {(selectedConcert?.gateIds || []).map((gateId) => (
                    <option key={gateId} value={gateId}>{gateId}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Camera Scanning Core Box */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                MÁY QUÉT QR VÉ
              </span>
              
              {isScanning ? (
                <button
                  onClick={stopScanner}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500/20 transition-all"
                >
                  TẮT MÁY QUÉT
                </button>
              ) : (
                <button
                  onClick={startScanner}
                  disabled={!selectedConcertId}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
                >
                  BẬT MÁY QUÉT VÉ
                </button>
              )}
            </div>

            {/* Camera View Area */}
            <div className="relative bg-black aspect-video flex items-center justify-center border-b border-slate-800 min-h-[300px]">
              {isScanning ? (
                <div id="qr-reader" className="w-full h-full"></div>
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-slate-900 border border-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-slate-400 font-medium text-sm">Máy quét chưa được kích hoạt</p>
                  <p className="text-slate-600 text-xs mt-1">Nhấn nút 'Bật máy quét vé' ở trên để bắt đầu</p>
                </div>
              )}

              {/* Scanning Overlay (Aim Target UI overlay) */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-indigo-400/50 rounded-2xl relative">
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-500"></div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-500"></div>
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-500"></div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-500"></div>
                  </div>
                  {/* Laser line animation */}
                  <div className="absolute w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent h-1.5 animate-bounce top-1/4"></div>
                </div>
              )}
            </div>

            {/* Nhập mã tay dự phòng */}
            <form onSubmit={handleManualSubmit} className="p-4 bg-slate-900/40 flex gap-2">
              <input
                type="text"
                value={manualTicketId}
                onChange={(e) => setManualTicketId(e.target.value)}
                disabled={!selectedConcertId}
                placeholder="Nhập thủ công mã vé (nếu QR hỏng)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!selectedConcertId}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 rounded-xl text-xs font-bold border border-slate-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                KIỂM TRA
              </button>
            </form>
          </div>

          {/* Sync Summary Alert */}
          {syncSummary && (
            <div className="bg-indigo-950/50 border border-indigo-800 text-indigo-200 p-4 rounded-xl text-xs font-medium flex items-start gap-2.5">
              <CheckCircle className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>{syncSummary}</span>
            </div>
          )}

          {/* Visual Indicator of Scan Result */}
          {scanResult && (
            <div className={`p-6 rounded-2xl border text-slate-100 shadow-xl transition-all ${
              scanResult.status === 'VALID' 
                ? 'bg-emerald-950/85 border-emerald-800/80 text-emerald-100' 
                : scanResult.status === 'ALREADY_USED'
                ? 'bg-amber-950/85 border-amber-800/80 text-amber-100'
                : 'bg-rose-950/85 border-rose-800/80 text-rose-100'
            }`}>
              <div className="flex items-start gap-4">
                
                {/* Result Icon */}
                <div className={`p-3 rounded-xl ${
                  scanResult.status === 'VALID' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : scanResult.status === 'ALREADY_USED'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {scanResult.status === 'VALID' && <CheckCircle className="w-8 h-8" />}
                  {scanResult.status === 'ALREADY_USED' && <AlertTriangle className="w-8 h-8" />}
                  {(scanResult.status === 'INVALID_TICKET' || scanResult.status === 'WRONG_CONCERT' || scanResult.status === 'WRONG_DATE' || scanResult.status === 'CANCELLED') && <XCircle className="w-8 h-8" />}
                </div>

                <div className="flex-1">
                  
                  {/* Status Title */}
                  <h3 className="text-lg font-bold tracking-wide uppercase">
                    {scanResult.status === 'VALID' && 'VÉ HỢP LỆ — CHO VÀO'}
                    {scanResult.status === 'ALREADY_USED' && 'CẢNH BÁO — VÉ ĐÃ SỬ DỤNG'}
                    {scanResult.status === 'INVALID_TICKET' && 'VÉ KHÔNG HỢP LỆ (VÉ GIẢ)'}
                    {scanResult.status === 'WRONG_CONCERT' && 'VÉ KHÔNG THUỘC SỰ KIỆN NÀY'}
                    {scanResult.status === 'WRONG_DATE' && 'SAI NGÀY DIỄN RA ĐÊM NHẠC'}
                  </h3>

                  {/* Ticket Details */}
                  {scanResult.ticket && (
                    <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold bg-black/30 p-3 rounded-xl border border-white/5">
                      <div>
                        <span className="text-slate-400 block font-normal text-[10px] uppercase">Loại vé</span>
                        <span className="text-white text-sm">{scanResult.ticket.ticketType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal text-[10px] uppercase">Khu vực</span>
                        <span className="text-white text-sm">{scanResult.ticket.seatNumber || 'GA (Không số ghế)'}</span>
                      </div>
                      <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                        <span className="text-slate-400 block font-normal text-[10px] uppercase">Mã vé (UUID)</span>
                        <span className="text-indigo-300 font-mono tracking-wider">{scanResult.ticket.id}</span>
                      </div>
                    </div>
                  )}

                  {/* Already Used details */}
                  {scanResult.status === 'ALREADY_USED' && (
                    <div className="mt-2 text-xs text-amber-200/90 font-medium">
                      Vé này đã được quét vào cổng lúc:{' '}
                      <strong className="text-white">{scanResult.checkedInAt ? new Date(scanResult.checkedInAt).toLocaleTimeString('vi-VN') : 'Không rõ'}</strong>
                      {' '}bởi máy quét: <strong className="text-white">{scanResult.deviceId || 'Không rõ'}</strong>.
                    </div>
                  )}

                  {/* Errors details */}
                  {scanResult.status === 'INVALID_TICKET' && (
                    <p className="mt-1.5 text-xs text-rose-200/90 font-medium">
                      Mã vé không tồn tại trên hệ thống dữ liệu. Vui lòng kiểm tra kỹ hoặc hướng dẫn khách hàng đến quầy BTC để được giải quyết.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {scanErrorMsg && (
            <div className="bg-rose-950/70 border border-rose-800/80 text-rose-200 p-5 rounded-2xl flex items-start gap-3 shadow-xl">
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">LỖI XỬ LÝ QUÉT VÉ</h4>
                <p className="text-xs text-rose-300 mt-1">{scanErrorMsg}</p>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Control Tabs (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Tab Selection */}
          <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex shadow-xl">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'scan' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Trạng thái quét
            </button>
            <button
              onClick={() => setActiveTab('vip')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'vip' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Khách mời VIP
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Thống kê
            </button>
          </div>

          {/* TAB CONTENT 1: Active Scan Logs (Overview) */}
          {activeTab === 'scan' && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex-1 flex flex-col min-h-[400px]">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                Lịch sử quét hiện tại
              </h3>
              
              {currentOfflineLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-600 flex-1 flex flex-col justify-center">
                  <CheckCircle className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                  <p className="text-sm font-bold">Không có vé ngoại tuyến chưa đồng bộ</p>
                  <p className="text-xs mt-1">Tất cả dữ liệu đã được đẩy trực tiếp lên hệ thống.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="text-xs text-amber-400 font-bold bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl mb-4">
                    Phát hiện {currentOfflineLogs.length} bản ghi ngoại tuyến chưa đồng bộ. Kết nối mạng để tiến hành đồng bộ.
                  </div>
                  
                  <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1 flex-1">
                    {currentOfflineLogs.map((log, index) => (
                      <div key={index} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-mono text-indigo-400 font-bold tracking-wider">{log.ticketId.substring(0, 16)}...</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Quét lúc: {new Date(log.scannedAtLocal).toLocaleTimeString('vi-VN')}
                          </p>
                        </div>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md font-bold uppercase border border-amber-500/10">
                          NGOẠI TUYẾN
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={triggerOfflineSync}
                    disabled={syncingOffline || !isOnline}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 disabled:shadow-none"
                  >
                    {syncingOffline ? 'Đang đồng bộ...' : 'ĐỒNG BỘ DỮ LIỆU NGOẠI TUYẾN'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 2: VIP Guest Search & Check-in */}
          {activeTab === 'vip' && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex-1 flex flex-col min-h-[400px]">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                Danh sách khách VIP
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/15 px-2.5 py-0.5 rounded-full font-bold">
                  Nhập CSV
                </span>
              </h3>

              {/* Ô tìm kiếm */}
              <form onSubmit={(e) => { e.preventDefault(); loadVipGuests(); }} className="flex gap-2 mb-4">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={vipQuery}
                    onChange={(e) => setVipQuery(e.target.value)}
                    placeholder="Tìm tên hoặc SĐT/Email..."
                    className="w-full bg-transparent border-0 outline-none text-xs text-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl text-xs font-bold transition-all"
                >
                  TÌM
                </button>
              </form>

              {/* Kết quả tìm kiếm */}
              <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-2.5">
                {loadingVip ? (
                  <p className="text-center py-8 text-xs text-slate-500 animate-pulse">Đang tải danh sách VIP...</p>
                ) : vipGuests.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-600">Nhập tên hoặc số điện thoại để tìm kiếm.</p>
                ) : (
                  vipGuests.map((guest) => (
                    <div key={guest.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">{guest.fullName}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{guest.identifier}</p>
                        </div>
                        <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/10 font-bold tracking-wider uppercase">
                          {guest.zone}
                        </span>
                      </div>

                      {/* Trạng thái vé */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-xs">
                        {guest.ticketDetails ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              {guest.ticketDetails.checkedIn ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                  <CheckCircle className="w-3.5 h-3.5" /> ĐÃ VÀO CỔNG
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                                  VÉ CHƯA SỬ DỤNG
                                </span>
                              )}
                            </div>

                            {!guest.ticketDetails.checkedIn && (
                              <button
                                onClick={() => handleCheckinVip(guest.id)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-md transition-all flex items-center gap-1"
                              >
                                <UserCheck className="w-3 h-3" /> SOÁT VÉ VIP
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-slate-500 italic">Chưa phát hành vé</span>
                            <button
                              onClick={() => handleCheckinVip(guest.id)}
                              className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-md transition-all flex items-center gap-1"
                            >
                              PHÁT VÉ & IN
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: Real-time Stats dashboard */}
          {activeTab === 'stats' && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex-1 flex flex-col min-h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Thống Kê Tiến Độ Soát Vé
                </h3>
                <button
                  onClick={loadStats}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loadingStats ? (
                <p className="text-center py-8 text-xs text-slate-500 animate-pulse">Đang tính toán số liệu...</p>
              ) : !stats ? (
                <p className="text-center py-8 text-xs text-slate-600">Chọn sự kiện để xem dữ liệu thống kê soát vé.</p>
              ) : (
                <div className="space-y-5 flex-1 flex flex-col justify-between">
                  
                  {/* Progress circle info */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 text-center relative overflow-hidden">
                    <div className="relative z-10">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block">Tỉ lệ hoàn thành</span>
                      <span className="text-4xl font-extrabold text-indigo-400 block mt-1 tracking-tight">{stats.percent}%</span>
                      <p className="text-xs font-semibold text-slate-300 mt-2">
                        Đã soát: <strong className="text-white text-sm">{stats.checkedInTickets}</strong> / {stats.totalTickets} vé
                      </p>
                    </div>
                    {/* Background decor bar */}
                    <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-500" style={{ width: `${stats.percent}%` }}></div>
                  </div>

                  {/* breakdown by ticket types */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[200px] mt-2 pr-1">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi tiết theo hạng vé:</h4>
                    {Object.entries(stats.byTicketType).map(([typeName, details]) => (
                      <div key={typeName} className="bg-slate-950/50 p-3 rounded-xl border border-slate-850/50">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-slate-200">{typeName}</span>
                          <span className="text-slate-400">{details.checkedIn}/{details.total} ({details.percent}%)</span>
                        </div>
                        {/* Progress Bar container */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${details.percent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-600 text-center italic mt-2">
                    Dữ liệu được cập nhật tự động mỗi khi máy quét soát vé trực tuyến thành công.
                  </p>
                </div>
              )}
            </div>
          )}

        </section>

      </main>

    </div>
  );
}

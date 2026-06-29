import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Role = 'AUDIENCE' | 'ORGANIZER' | 'CHECKIN_STAFF' | string;

type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

type AssignedConcert = {
  id: string;
  eventCode?: string | null;
  name: string;
  venue: string;
  startAt: string;
  status: string;
  gateIds: string[];
};

type ScanStatus =
  | 'VALID'
  | 'ALREADY_USED'
  | 'WRONG_CONCERT'
  | 'WRONG_DATE'
  | 'INVALID_TICKET'
  | 'INVALID_SCAN_TIME'
  | 'CANCELLED'
  | string;

type ScanResult = {
  status: ScanStatus;
  checkedInAt?: string | null;
  deviceId?: string | null;
  ticket?: {
    id: string;
    seatNumber?: string | null;
    ticketType?: string | null;
    usedAt?: string | null;
    guestType?: string | null;
  };
};

type OfflineScan = {
  localId: string;
  ticketId: string;
  concertId: string;
  gateId: string;
  deviceId: string;
  staffId: string;
  scannedAtLocal: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  lastError?: string;
};

const API_BASE_URL_STORAGE_KEY = 'ticketbox.scanner.apiBaseUrl';
const SESSION_STORAGE_KEY = 'ticketbox.scanner.session';
const OFFLINE_QUEUE_STORAGE_KEY = 'ticketbox.scanner.offlineQueue';
const DEVICE_ID_STORAGE_KEY = 'ticketbox.scanner.deviceId';
const DEFAULT_API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) || 'http://localhost:3000/api/v1';

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function statusCopy(status: ScanStatus) {
  switch (status) {
    case 'VALID':
      return { title: 'Vé hợp lệ', tone: 'success' as const, detail: 'Đã ghi nhận check-in thành công.' };
    case 'ALREADY_USED':
      return { title: 'Vé đã sử dụng', tone: 'warning' as const, detail: 'Vé này đã được quét trước đó.' };
    case 'WRONG_CONCERT':
      return { title: 'Sai sự kiện', tone: 'danger' as const, detail: 'Vé không thuộc concert đang chọn.' };
    case 'WRONG_DATE':
      return { title: 'Sai ngày', tone: 'danger' as const, detail: 'Vé không được quét trong ngày diễn.' };
    case 'CANCELLED':
      return { title: 'Vé đã hủy', tone: 'danger' as const, detail: 'Vé/khách mời này đã bị hủy.' };
    case 'INVALID_SCAN_TIME':
      return { title: 'Thời gian không hợp lệ', tone: 'danger' as const, detail: 'Thiết bị gửi thời gian quét không hợp lệ.' };
    default:
      return { title: 'Vé không hợp lệ', tone: 'danger' as const, detail: 'Không tìm thấy hoặc QR không hợp lệ.' };
  }
}

async function readJsonStorage<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function apiRequest<T>(
  apiBaseUrl: string,
  path: string,
  options: { method?: string; body?: unknown; accessToken?: string } = {}
): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message || payload?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload.data as T;
}

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [draftApiBaseUrl, setDraftApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assignedConcerts, setAssignedConcerts] = useState<AssignedConcert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(null);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineScan[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);

  const selectedConcert = useMemo(
    () => assignedConcerts.find((concert) => concert.id === selectedConcertId) || null,
    [assignedConcerts, selectedConcertId]
  );

  const pendingCount = offlineQueue.filter((item) => item.syncStatus === 'PENDING').length;
  const conflictCount = offlineQueue.filter((item) => item.syncStatus === 'CONFLICT').length;

  const persistQueue = useCallback(async (items: OfflineScan[]) => {
    setOfflineQueue(items);
    await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(items));
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const [storedBaseUrl, storedSession, storedQueue, storedDeviceId] = await Promise.all([
        AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY),
        SecureStore.getItemAsync(SESSION_STORAGE_KEY),
        readJsonStorage<OfflineScan[]>(OFFLINE_QUEUE_STORAGE_KEY, []),
        AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY),
      ]);

      if (!mounted) return;

      const nextBaseUrl = storedBaseUrl || DEFAULT_API_BASE_URL;
      const nextDeviceId = storedDeviceId || `scanner-${Math.random().toString(36).slice(2, 8)}`;
      if (!storedDeviceId) await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, nextDeviceId);

      setApiBaseUrl(nextBaseUrl);
      setDraftApiBaseUrl(nextBaseUrl);
      setDeviceId(nextDeviceId);
      setOfflineQueue(storedQueue);

      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession) as AuthSession;
          setSession(parsed);
        } catch {
          await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        }
      }
      setLoading(false);
    };

    bootstrap();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const saveApiBaseUrl = async () => {
    const normalized = normalizeBaseUrl(draftApiBaseUrl);
    setApiBaseUrl(normalized);
    setDraftApiBaseUrl(normalized);
    await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
    setLastMessage('Đã lưu API base URL.');
  };

  const login = async () => {
    setBusy(true);
    setLastMessage(null);
    try {
      const data = await apiRequest<AuthSession>(apiBaseUrl, '/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (data.user.role !== 'CHECKIN_STAFF') {
        throw new Error('Tài khoản này không có quyền soát vé. Cần role CHECKIN_STAFF.');
      }

      setSession(data);
      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(data));
      setPassword('');
      await loadAssignedConcerts(data.accessToken);
    } catch (error) {
      Alert.alert('Không thể đăng nhập', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setSession(null);
    setAssignedConcerts([]);
    setSelectedConcertId(null);
    setSelectedGateId(null);
    setLastResult(null);
    setCameraActive(false);
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  };

  const loadAssignedConcerts = useCallback(
    async (token = session?.accessToken) => {
      if (!token) return;
      setBusy(true);
      try {
        const data = await apiRequest<AssignedConcert[]>(apiBaseUrl, '/checkins/concerts', {
          accessToken: token,
        });
        setAssignedConcerts(data);
        const first = data[0];
        if (first) {
          setSelectedConcertId((current) => current || first.id);
          setSelectedGateId((current) => current || first.gateIds[0] || null);
        }
      } catch (error) {
        Alert.alert('Không thể tải phân công', (error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [apiBaseUrl, session?.accessToken]
  );

  useEffect(() => {
    if (session) loadAssignedConcerts();
  }, [session?.accessToken, apiBaseUrl]);

  const enqueueOfflineScan = useCallback(
    async (ticketId: string, reason: string) => {
      if (!session || !selectedConcertId || !selectedGateId) return;
      const scan: OfflineScan = {
        localId: createLocalId(),
        ticketId,
        concertId: selectedConcertId,
        gateId: selectedGateId,
        deviceId,
        staffId: session.user.id,
        scannedAtLocal: new Date().toISOString(),
        syncStatus: 'PENDING',
        lastError: reason,
      };
      await persistQueue([scan, ...offlineQueue]);
      setLastResult(null);
      setLastMessage('Đã lưu lượt quét tạm vào hàng đợi offline.');
    },
    [deviceId, offlineQueue, persistQueue, selectedConcertId, selectedGateId, session]
  );

  const submitScan = useCallback(
    async (ticketId: string) => {
      const trimmed = ticketId.trim();
      if (!trimmed || !session || !selectedConcertId || !selectedGateId) return;

      setLastMessage(null);
      setLastResult(null);

      if (!isOnline) {
        await enqueueOfflineScan(trimmed, 'Thiết bị đang offline.');
        return;
      }

      setBusy(true);
      try {
        const data = await apiRequest<ScanResult>(apiBaseUrl, '/checkins/scan', {
          method: 'POST',
          accessToken: session.accessToken,
          body: {
            ticketId: trimmed,
            concertId: selectedConcertId,
            gateId: selectedGateId,
            deviceId,
            scannedAtLocal: new Date().toISOString(),
          },
        });
        setLastResult(data);
      } catch (error) {
        await enqueueOfflineScan(trimmed, (error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [apiBaseUrl, deviceId, enqueueOfflineScan, isOnline, selectedConcertId, selectedGateId, session]
  );

  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanLocked || !cameraActive) return;
    setScanLocked(true);
    await submitScan(result.data);
    setTimeout(() => setScanLocked(false), 1600);
  };

  const submitManualCode = async () => {
    await submitScan(manualCode);
    setManualCode('');
  };

  const syncOfflineQueue = async () => {
    if (!session || !selectedConcertId) return;
    const pending = offlineQueue.filter(
      (item) =>
        item.syncStatus === 'PENDING' &&
        item.staffId === session.user.id &&
        item.concertId === selectedConcertId &&
        item.deviceId === deviceId
    );

    if (pending.length === 0) {
      setLastMessage('Không có lượt offline nào cần đồng bộ cho concert đang chọn.');
      return;
    }

    setBusy(true);
    try {
      const data = await apiRequest<{
        syncedCount: number;
        conflictCount: number;
        conflicts: Array<{ ticketId: string; scannedAtLocal: string; reason: string }>;
      }>(apiBaseUrl, '/checkins/sync', {
        method: 'POST',
        accessToken: session.accessToken,
        body: {
          concertId: selectedConcertId,
          gateId: selectedGateId,
          deviceId,
          logs: pending.map((item) => ({
            ticketId: item.ticketId,
            scannedAtLocal: item.scannedAtLocal,
          })),
        },
      });

      const conflictKeys = new Map(
        data.conflicts.map((item) => [`${item.ticketId}|${item.scannedAtLocal}`, item.reason])
      );

      const nextQueue = offlineQueue.map((item) => {
        if (!pending.some((pendingItem) => pendingItem.localId === item.localId)) return item;
        const conflictReason = conflictKeys.get(`${item.ticketId}|${item.scannedAtLocal}`);
        if (conflictReason) {
          return { ...item, syncStatus: 'CONFLICT' as const, lastError: conflictReason };
        }
        return { ...item, syncStatus: 'SYNCED' as const, lastError: undefined };
      });

      await persistQueue(nextQueue);
      setLastMessage(`Đồng bộ xong: ${data.syncedCount} thành công, ${data.conflictCount} xung đột.`);
    } catch (error) {
      const nextQueue = offlineQueue.map((item) =>
        pending.some((pendingItem) => pendingItem.localId === item.localId)
          ? { ...item, syncStatus: 'FAILED' as const, lastError: (error as Error).message }
          : item
      );
      await persistQueue(nextQueue);
      Alert.alert('Đồng bộ thất bại', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clearResolvedQueue = async () => {
    const nextQueue = offlineQueue.filter((item) => item.syncStatus === 'PENDING' || item.syncStatus === 'CONFLICT');
    await persistQueue(nextQueue);
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Thiếu quyền camera', 'Hãy cấp quyền camera để quét QR.');
        return;
      }
    }
    setCameraActive(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#2563eb" />
        <Text style={styles.muted}>Đang khởi động scanner...</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.authContent}>
            <Text style={styles.brand}>TicketBox Scanner</Text>
            <Text style={styles.subtitle}>Ứng dụng soát vé dành cho nhân viên cổng.</Text>

            <View style={styles.panel}>
              <Text style={styles.label}>API base URL</Text>
              <TextInput
                value={draftApiBaseUrl}
                onChangeText={setDraftApiBaseUrl}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                placeholder="http://192.168.1.10:3000/api/v1"
              />
              <Pressable style={styles.secondaryButton} onPress={saveApiBaseUrl}>
                <Text style={styles.secondaryButtonText}>Lưu API URL</Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
              <Pressable style={[styles.primaryButton, busy && styles.disabledButton]} onPress={login} disabled={busy}>
                <Text style={styles.primaryButtonText}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const resultCopy = lastResult ? statusCopy(lastResult.status) : null;
  const selectedGateOptions = selectedConcert?.gateIds || [];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandSmall}>TicketBox Scanner</Text>
            <Text style={styles.muted}>{session.user.fullName}</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.badge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.badge}>Pending {pendingCount}</Text>
          <Text style={styles.badge}>Conflict {conflictCount}</Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Phân công</Text>
            <Pressable onPress={() => loadAssignedConcerts()}>
              <Text style={styles.linkText}>Tải lại</Text>
            </Pressable>
          </View>
          {assignedConcerts.length === 0 ? (
            <Text style={styles.muted}>Tài khoản này chưa được phân công concert/gate.</Text>
          ) : (
            <View style={styles.chipWrap}>
              {assignedConcerts.map((concert) => (
                <Pressable
                  key={concert.id}
                  style={[styles.chip, selectedConcertId === concert.id && styles.selectedChip]}
                  onPress={() => {
                    setSelectedConcertId(concert.id);
                    setSelectedGateId(concert.gateIds[0] || null);
                  }}
                >
                  <Text style={[styles.chipText, selectedConcertId === concert.id && styles.selectedChipText]}>
                    {concert.name}
                  </Text>
                  <Text style={[styles.chipSubText, selectedConcertId === concert.id && styles.selectedChipText]}>
                    {concert.eventCode || 'Không có mã'} • {new Date(concert.startAt).toLocaleDateString('vi-VN')}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {selectedConcert ? (
            <>
              <Text style={styles.label}>Cổng</Text>
              <View style={styles.chipWrap}>
                {selectedGateOptions.map((gateId) => (
                  <Pressable
                    key={gateId}
                    style={[styles.gateChip, selectedGateId === gateId && styles.selectedGateChip]}
                    onPress={() => setSelectedGateId(gateId)}
                  >
                    <Text style={[styles.gateText, selectedGateId === gateId && styles.selectedGateText]}>
                      {gateId}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.muted}>Thiết bị: {deviceId}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Quét vé</Text>
          {cameraActive ? (
            <View style={styles.cameraFrame}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onBarcodeScanned}
              />
              <View style={styles.scanBox} />
              <Pressable style={styles.closeCameraButton} onPress={() => setCameraActive(false)}>
                <Text style={styles.primaryButtonText}>Đóng camera</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.primaryButton, (!selectedConcertId || !selectedGateId) && styles.disabledButton]}
              onPress={openCamera}
              disabled={!selectedConcertId || !selectedGateId}
            >
              <Text style={styles.primaryButtonText}>Mở camera quét QR</Text>
            </Pressable>
          )}

          <Text style={styles.label}>Nhập mã thủ công</Text>
          <View style={styles.manualRow}>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              style={[styles.input, styles.manualInput]}
              placeholder="Dán QR token hoặc mã vé"
            />
            <Pressable style={styles.compactButton} onPress={submitManualCode}>
              <Text style={styles.primaryButtonText}>Gửi</Text>
            </Pressable>
          </View>
        </View>

        {resultCopy ? (
          <View style={[styles.resultPanel, styles[`${resultCopy.tone}Panel`]]}>
            <Text style={styles.resultTitle}>{resultCopy.title}</Text>
            <Text style={styles.resultDetail}>{resultCopy.detail}</Text>
            {lastResult?.ticket ? (
              <Text style={styles.resultMeta}>
                {lastResult.ticket.ticketType || 'Vé'} • {lastResult.ticket.id}
              </Text>
            ) : null}
          </View>
        ) : null}

        {lastMessage ? (
          <View style={styles.infoPanel}>
            <Text style={styles.infoText}>{lastMessage}</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Offline queue</Text>
            <Pressable onPress={clearResolvedQueue}>
              <Text style={styles.linkText}>Dọn đã sync</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.secondaryButton, (!isOnline || pendingCount === 0) && styles.disabledLightButton]}
            disabled={!isOnline || pendingCount === 0}
            onPress={syncOfflineQueue}
          >
            <Text style={styles.secondaryButtonText}>Đồng bộ lượt offline</Text>
          </Pressable>
          <FlatList
            scrollEnabled={false}
            data={offlineQueue.slice(0, 8)}
            keyExtractor={(item) => item.localId}
            ListEmptyComponent={<Text style={styles.muted}>Chưa có lượt offline.</Text>}
            renderItem={({ item }) => (
              <View style={styles.queueItem}>
                <Text style={styles.queueTitle}>{item.ticketId}</Text>
                <Text style={styles.queueMeta}>
                  {item.syncStatus} • {new Date(item.scannedAtLocal).toLocaleString('vi-VN')}
                </Text>
                {item.lastError ? <Text style={styles.queueError}>{item.lastError}</Text> : null}
              </View>
            )}
          />
        </View>

        {busy ? <ActivityIndicator color="#2563eb" /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f6f8fb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fb' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  authContent: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  brandSmall: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 22 },
  muted: { color: '#64748b', fontSize: 13, marginTop: 4 },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 4 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#eff6ff',
  },
  secondaryButtonText: { color: '#1d4ed8', fontWeight: '800' },
  compactButton: {
    width: 74,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  logoutText: { color: '#334155', fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  disabledLightButton: { opacity: 0.45 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e2e8f0',
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  onlineBadge: { backgroundColor: '#dcfce7', color: '#166534' },
  offlineBadge: { backgroundColor: '#fee2e2', color: '#991b1b' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { color: '#2563eb', fontWeight: '800' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 10,
    minWidth: '48%',
    backgroundColor: '#fff',
  },
  selectedChip: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  chipText: { fontWeight: '800', color: '#0f172a' },
  chipSubText: { color: '#64748b', fontSize: 12, marginTop: 3 },
  selectedChipText: { color: '#fff' },
  gateChip: { borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 8 },
  selectedGateChip: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  gateText: { color: '#334155', fontWeight: '800' },
  selectedGateText: { color: '#fff' },
  cameraFrame: { height: 360, borderRadius: 16, overflow: 'hidden', backgroundColor: '#020617' },
  scanBox: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    top: '22%',
    bottom: '22%',
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 18,
  },
  closeCameraButton: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: { flex: 1 },
  resultPanel: { borderRadius: 14, padding: 16, borderWidth: 1 },
  successPanel: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  warningPanel: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  dangerPanel: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  resultTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  resultDetail: { marginTop: 4, color: '#334155', fontWeight: '600' },
  resultMeta: { marginTop: 8, color: '#475569' },
  infoPanel: { borderRadius: 12, padding: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { color: '#1e40af', fontWeight: '700' },
  queueItem: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, marginTop: 10 },
  queueTitle: { color: '#0f172a', fontWeight: '800' },
  queueMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  queueError: { color: '#b91c1c', fontSize: 12, marginTop: 3 },
});

import { Queue } from 'bullmq';
import { queueConnection } from './queue';

let aiBioQueue: Queue | null = null;
let emailQueue: Queue | null = null;
let vipGuestImportQueue: Queue | null = null;

export function getAiBioQueue() {
  aiBioQueue ||= new Queue('aiBioQueue', { connection: queueConnection });
  return aiBioQueue;
}

export function getEmailQueue() {
  emailQueue ||= new Queue('emailQueue', { connection: queueConnection });
  return emailQueue;
}

export function getVipGuestImportQueue() {
  vipGuestImportQueue ||= new Queue('vipGuestImportQueue', { connection: queueConnection });
  return vipGuestImportQueue;
}

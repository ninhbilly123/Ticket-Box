import { ImapFlow } from 'imapflow';

export interface CsvMailAttachment {
  messageId: string;
  senderEmail: string;
  fileName: string;
  content: Buffer;
}

function normalizeEnvSecret(value: string | undefined): string | undefined {
  return value?.replace(/\s+/g, '');
}

interface MailBodyPart {
  part?: string;
  type?: string;
  parameters?: { [key: string]: string };
  disposition?: string;
  dispositionParameters?: { [key: string]: string };
  childNodes?: MailBodyPart[];
}

interface CsvPart {
  part: string;
  fileName: string;
}

function collectCsvParts(node: MailBodyPart | undefined, parts: CsvPart[] = []): CsvPart[] {
  if (!node) {
    return parts;
  }

  const fileName =
    node.dispositionParameters?.filename ||
    node.dispositionParameters?.Filename ||
    node.parameters?.name ||
    node.parameters?.Name;

  const isCsvFile = Boolean(fileName?.toLowerCase().endsWith('.csv'));
  if (node.part && fileName && isCsvFile) {
    parts.push({ part: node.part, fileName });
  }

  for (const child of node.childNodes || []) {
    collectCsvParts(child, parts);
  }

  return parts;
}

export async function fetchCsvAttachmentsFromMailbox(): Promise<CsvMailAttachment[]> {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = normalizeEnvSecret(process.env.IMAP_PASSWORD);

  if (!host || !user || !pass) {
    console.warn('[IMAP] Missing IMAP configuration. Skipping mailbox poll.');
    return [];
  }

  const client = new ImapFlow({
    host,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: { user, pass },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
  client.on('error', (error: Error) => {
    console.warn(`[IMAP] Connection error - ${error.message}`);
  });

  const mailbox = process.env.IMAP_MAILBOX || 'INBOX';
  const attachments: CsvMailAttachment[] = [];

  try {
    await client.connect();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown IMAP connection error';
    console.warn(`[IMAP] Cannot connect to mailbox ${host}:${process.env.IMAP_PORT || '993'} - ${message}`);
    return [];
  }

  try {
    await client.mailboxOpen(mailbox);
    const unseenUids = await client.search({ seen: false }, { uid: true });
    if (!unseenUids || unseenUids.length === 0) {
      return [];
    }

    const lock = await client.getMailboxLock(mailbox);
    try {
      for await (const message of client.fetch(
        unseenUids,
        { uid: true, envelope: true, bodyStructure: true },
        { uid: true }
      )) {
        const senderEmail = message.envelope?.from?.[0]?.address?.toLowerCase();
        if (!senderEmail) {
          continue;
        }

        const csvParts = collectCsvParts(message.bodyStructure as MailBodyPart | undefined);
        if (csvParts.length === 0) {
          await client.messageFlagsAdd(String(message.uid), ['\\Seen'], { uid: true });
          continue;
        }

        const downloadedParts = await client.downloadMany(
          String(message.uid),
          csvParts.map((part) => part.part),
          { uid: true }
        );

        const messageId = message.envelope?.messageId || `${mailbox}:${message.uid}`;
        for (const csvPart of csvParts) {
          const downloaded = downloadedParts[csvPart.part];
          if (!downloaded?.content) {
            continue;
          }

          attachments.push({
            messageId,
            senderEmail,
            fileName: downloaded.meta.filename || csvPart.fileName,
            content: downloaded.content,
          });
        }

        await client.messageFlagsAdd(String(message.uid), ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown IMAP fetch error';
    console.warn(`[IMAP] Cannot fetch CSV attachments - ${message}`);
    return [];
  } finally {
    try {
      await client.logout();
    } catch {
      // The socket may already be closed after a timeout. No cleanup action is needed.
    }
  }

  return attachments;
}

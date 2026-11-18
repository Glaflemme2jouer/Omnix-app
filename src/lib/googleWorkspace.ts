export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface GoogleFormSummary {
  formId: string;
  title: string;
  responderUri?: string;
  responses: Array<{
    responseId: string;
    lastSubmittedTime: string;
    answersSummary: string[];
  }>;
}

async function googleFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur Google API (${res.status}) : ${errText.slice(0, 180)}`);
  }
  return res.json() as Promise<T>;
}

// --- Google Calendar ---
export async function listGoogleCalendarEvents(token: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date().toISOString();
  const params = new URLSearchParams({
    timeMin: now,
    maxResults: '15',
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  const data = await googleFetch<{ items?: GoogleCalendarEvent[] }>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    token
  );
  return data.items || [];
}

export async function createGoogleCalendarEvent(
  token: string,
  payload: {
    summary: string;
    description: string;
    startIso: string;
    durationMin: number;
  }
): Promise<GoogleCalendarEvent> {
  const startDate = new Date(payload.startIso);
  const endDate = new Date(startDate.getTime() + payload.durationMin * 60000);
  return googleFetch<GoogleCalendarEvent>(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: payload.summary,
        description: payload.description,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      }),
    }
  );
}

// --- Google Drive ---
export async function listGoogleDriveFiles(
  token: string,
  query?: string
): Promise<GoogleDriveFile[]> {
  const qParts = ['trashed = false'];
  if (query?.trim()) {
    const safe = query.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${safe}'`);
  }
  const params = new URLSearchParams({
    q: qParts.join(' and '),
    pageSize: '20',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    orderBy: 'modifiedTime desc',
  });
  const data = await googleFetch<{ files?: GoogleDriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    token
  );
  return data.files || [];
}

export async function createGoogleDriveFolder(
  token: string,
  folderName: string
): Promise<GoogleDriveFile> {
  return googleFetch<GoogleDriveFile>(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
}

export async function uploadHtmlToGoogleDrive(
  token: string,
  fileName: string,
  htmlContent: string
): Promise<GoogleDriveFile> {
  const metadata = {
    name: fileName,
    mimeType: 'text/html',
  };
  const boundary = 'awj_drive_boundary_' + Date.now();
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
    `${htmlContent}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    throw new Error(`Erreur upload Google Drive (${res.status})`);
  }
  return res.json() as Promise<GoogleDriveFile>;
}

// --- Gmail ---
export async function listRecentGmailMessages(
  token: string,
  searchQuery = ''
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({ maxResults: '8' });
  if (searchQuery.trim()) {
    params.set('q', searchQuery.trim());
  }
  const listData = await googleFetch<{ messages?: Array<{ id: string; threadId: string }> }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    token
  );
  const refs = listData.messages || [];
  const details = await Promise.all(
    refs.slice(0, 8).map(async (ref) => {
      const msg = await googleFetch<any>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(ref.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        token
      );
      const headers: Array<{ name: string; value: string }> = msg.payload?.headers || [];
      const getH = (n: string) =>
        headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || '';
      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: getH('Subject') || '(Sans objet)',
        from: getH('From') || 'Expéditeur inconnu',
        date: getH('Date') || '',
        snippet: msg.snippet || '',
      } as GmailMessageSummary;
    })
  );
  return details;
}

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailMessage(
  token: string,
  payload: { to: string; subject: string; body: string }
): Promise<void> {
  const mime = [
    `To: ${payload.to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    payload.body,
  ].join('\r\n');

  await googleFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodeBase64Url(mime) }),
    }
  );
}

// --- Google Forms ---
export async function fetchGoogleFormWithResponses(
  token: string,
  formId: string
): Promise<GoogleFormSummary> {
  const safeId = encodeURIComponent(formId.trim());
  const [formMeta, responsesData] = await Promise.all([
    googleFetch<any>(`https://forms.googleapis.com/v1/forms/${safeId}`, token),
    googleFetch<any>(`https://forms.googleapis.com/v1/forms/${safeId}/responses`, token),
  ]);

  const rawResponses: any[] = responsesData.responses || [];
  const responses = rawResponses.map((r) => {
    const answersObj = r.answers || {};
    const answersSummary = Object.values(answersObj).map((ans: any) => {
      const vals = ans?.textAnswers?.answers?.map((a: any) => a.value) || [];
      return vals.join(', ');
    });
    return {
      responseId: r.responseId,
      lastSubmittedTime: r.lastSubmittedTime,
      answersSummary: answersSummary.filter(Boolean),
    };
  });

  return {
    formId: formMeta.formId || formId,
    title: formMeta.info?.title || 'Formulaire Google',
    responderUri: formMeta.responderUri,
    responses,
  };
}

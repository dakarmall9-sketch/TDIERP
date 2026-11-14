export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

const BACKUP_FOLDER_NAME = 'TransMove_ERP_Backups';

/**
 * Find or create the TransMove_ERP_Backups folder on Google Drive
 */
export async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  // Check if folder exists
  const query = encodeURIComponent(
    `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Drive lors de la recherche du dossier : ${errorText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder if it doesn't exist
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dossier de stockage et sauvegardes automatiques pour l’ERP TransMove OS',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Erreur lors de la création du dossier Drive : ${errorText}`);
  }

  const createdFolder = await createRes.json();
  return createdFolder.id;
}

/**
 * Upload an ERP snapshot JSON directly to Google Drive (Multipart)
 */
export async function uploadBackupToDrive(
  accessToken: string,
  backupData: Record<string, any>,
  customName?: string
): Promise<DriveFile> {
  const folderId = await getOrCreateBackupFolder(accessToken);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const fileName =
    customName ||
    `TransMove_ERP_Backup_${backupData.company?.name ? backupData.company.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Full'}_${timestamp}.json`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
    description: `Sauvegarde ERP TransMove OS générée le ${new Date().toLocaleString('fr-FR')}`,
  };

  const fileContent = JSON.stringify(backupData, null, 2);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec du téléversement sur Google Drive : ${err}`);
  }

  return await res.json();
}

/**
 * Upload any document (text/json/html) to Google Drive
 */
export async function uploadDocumentToDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<DriveFile> {
  const folderId = await getOrCreateBackupFolder(accessToken);

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec de l'export sur Google Drive : ${err}`);
  }

  return await res.json();
}

/**
 * List files stored in the TransMove Drive folder
 */
export async function listDriveBackups(accessToken: string): Promise<DriveFile[]> {
  try {
    const folderId = await getOrCreateBackupFolder(accessToken);

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)&orderBy=createdTime desc&pageSize=50`;

    const res = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erreur lors de la récupération des fichiers Drive : ${err}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('List backups error:', error);
    throw error;
  }
}

/**
 * Fetch and parse a backup file's JSON content from Google Drive
 */
export async function downloadBackupFromDrive(accessToken: string, fileId: string): Promise<any> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Impossible de télécharger le fichier depuis Google Drive : ${err}`);
  }

  return await res.json();
}

/**
 * Delete a file on Google Drive (destructive)
 */
export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  const deleteUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const res = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur lors de la suppression sur Google Drive : ${err}`);
  }
}

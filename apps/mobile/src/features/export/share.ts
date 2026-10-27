import { Directory, File, Paths } from 'expo-file-system';
import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';

// Exports live in the app's cache only until the next export: each one clears the last, so copies of financial data
// don't pile up on the phone. Sharing hands the file to the app the user picks (Drive, WhatsApp, email…).
const EXPORTS = new Directory(Paths.cache, 'exports');

function freshFolder(): void {
  if (EXPORTS.exists) EXPORTS.delete();
  EXPORTS.create();
}

export async function shareCsv(name: string, csv: string): Promise<void> {
  freshFolder();
  const file = new File(EXPORTS, `${name}.csv`);
  await file.write(csv);
  await shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share transactions' });
}

export async function sharePdf(name: string, html: string): Promise<void> {
  freshFolder();
  const printed = new File((await printToFileAsync({ html })).uri);
  const file = new File(EXPORTS, `${name}.pdf`);
  await printed.move(file);
  await shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Share statement' });
}

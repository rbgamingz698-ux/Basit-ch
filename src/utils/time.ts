/**
 * Timezone Utility for PKT (UTC+5:30 / Pakistan Time)
 */

export const PKT_OFFSET_HOURS = 5.5; // UTC + 5:30

/**
 * Returns current date/time adjusted to PKT (UTC+5:30)
 */
export function getPktDate(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + PKT_OFFSET_HOURS * 3600000);
}

/**
 * Formats a Date or Unix timestamp into PKT (UTC+5:30) time string (HH:mm:ss)
 */
export function formatPktTimeString(date: Date = new Date()): string {
  const pkt = getPktDate(date);
  const h = String(pkt.getHours()).padStart(2, '0');
  const m = String(pkt.getMinutes()).padStart(2, '0');
  const s = String(pkt.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Formats Unix timestamp (in seconds) into full PKT date & time string
 */
export function formatPktDateTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const pkt = getPktDate(date);
  const y = pkt.getFullYear();
  const m = String(pkt.getMonth() + 1).padStart(2, '0');
  const d = String(pkt.getDate()).padStart(2, '0');
  
  let hours = pkt.getHours();
  const minutes = String(pkt.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strHours = String(hours).padStart(2, '0');

  return `${y}-${m}-${d} ${strHours}:${minutes} ${ampm} PKT`;
}

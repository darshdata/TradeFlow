// Indian Equity Market Hours calculation utility (Asia/Kolkata timezone)

export function getClientMarketStatus() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const weekday = partMap.weekday; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);
  const timeInMinutes = hour * 60 + minute;

  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
  const isPreMarket = isWeekday && timeInMinutes >= 540 && timeInMinutes < 555; // 09:00 - 09:15
  const isRegularOpen = isWeekday && timeInMinutes >= 555 && timeInMinutes < 930; // 09:15 - 15:30
  const isPostMarket = isWeekday && timeInMinutes >= 930 && timeInMinutes < 960; // 15:30 - 16:00

  let session = 'CLOSED';
  let sessionLabel = 'Market Closed';
  if (isRegularOpen) {
    session = 'REGULAR_OPEN';
    sessionLabel = 'Regular Market Open';
  } else if (isPreMarket) {
    session = 'PRE_MARKET';
    sessionLabel = 'Pre-Market Session';
  } else if (isPostMarket) {
    session = 'POST_MARKET';
    sessionLabel = 'Post-Market Closed';
  }

  return {
    isRegularOpen,
    isPreMarket,
    isPostMarket,
    session,
    sessionLabel,
    istTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} IST`,
    istTimeShort: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} IST`,
    weekday,
    regularHours: '09:15 - 15:30 IST (Mon–Fri)',
  };
}

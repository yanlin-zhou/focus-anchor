const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toLocalDateKey(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextLocalDateKey(dateInput) {
  const date = new Date(dateInput);
  date.setDate(date.getDate() + 1);
  return toLocalDateKey(date);
}

export function weekdayForDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

export function daysBetween(startDateKey, endDateKey) {
  const start = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${endDateKey}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function isSameOrAfter(dateKey, maybeEarlierDateKey) {
  return daysBetween(maybeEarlierDateKey, dateKey) >= 0;
}

const CAP = 9;

export function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function rememberVisit(stored, today, cap = CAP) {
  const days = [];
  for (const value of stored) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !days.includes(value)) days.push(value);
  }
  if (!days.includes(today) && days.length < cap) days.push(today);
  return days.slice(0, cap);
}

export const leafCap = CAP;

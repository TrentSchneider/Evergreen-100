// ---------------------------------------------------------
// Today String (YYYY-MM-DD)
// ---------------------------------------------------------
export function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------
// Parse Local Date (YYYY-MM-DD → Date object)
// ---------------------------------------------------------
export function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// ---------------------------------------------------------
// Format Short Date (YYYY-MM-DD → "Jan 15")
// ---------------------------------------------------------
export function formatShort(dateString) {
  const date = parseLocalDate(dateString);

  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    })
    .replace(",", ""); // normalize across browsers
}


// ---------------------------------------------------------
// Format History Date (Today / Yesterday / Friendly Format)
// ---------------------------------------------------------
export function formatHistoryDate(dateString) {
  const date = parseLocalDate(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  const sameYear = date.getFullYear() === today.getFullYear();
  const options = sameYear
    ? { weekday: "short", month: "short", day: "numeric" }
    : { year: "numeric", month: "short", day: "numeric" };

  return date.toLocaleDateString(undefined, options);
}

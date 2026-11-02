// =====================================================================
//  РАСПИСАНИЕ ДЛЯ ЗАПИСИ.
//  ВАЖНО: всё ниже это ПРИМЕРЫ. Замените дни и время на реальные.
//  days: 1 = понедельник ... 7 = воскресенье
//  Одна запись длится 1 час (см. SLOT_HOURS в bookingStore.js).
//  Расписание занятий (раздел «Занятия») задаётся в App.jsx, в поле slots.
// =====================================================================
import { fromKey, weekdayOf } from "./bookingStore";

// Экскурсии по саду (для всех форматов одинаково)
const TOUR = [
  { days: [1, 2, 3, 4, 5], times: ["10:30", "11:30", "12:30", "15:30"] },
  { days: [6], times: ["11:00", "12:00"] },
];

// Няня на час
const NANNY = [
  {
    days: [1, 2, 3, 4, 5, 6],
    times: ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"],
  },
];

// Логопед и нейропсихолог (id совпадают с массивом specialists в App.jsx)
const SPECIALISTS = {
  speech: [{ days: [2, 4], times: ["15:00", "16:00", "17:00"] }],
  neuro: [{ days: [1, 3, 5], times: ["15:00", "16:00"] }],
};

function timesFor(rules, dateKey) {
  const wd = weekdayOf(fromKey(dateKey));
  const out = new Set();
  rules.forEach((r) => {
    if (r.days.includes(wd)) r.times.forEach((t) => out.add(t));
  });
  return [...out].sort();
}

// Свободное время на выбранную дату для экскурсий, няни и специалистов
export function getSlotTimes(kind, refId, dateKey) {
  if (kind === "tour") return timesFor(TOUR, dateKey);
  if (kind === "nanny") return timesFor(NANNY, dateKey);
  if (kind === "specialist") return timesFor(SPECIALISTS[refId] || [], dateKey);
  return [];
}

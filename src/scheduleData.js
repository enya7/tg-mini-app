// =====================================================================
//  РАСПИСАНИЕ ДЛЯ ЗАПИСИ.
//  ВАЖНО: всё ниже это ПРИМЕРЫ. Замените имена, дни и время на реальные.
//  days: 1 = понедельник ... 7 = воскресенье
//  Одна запись длится 1 час (см. SLOT_HOURS в bookingStore.js).
// =====================================================================
import { fromKey, weekdayOf } from "./bookingStore";

// Экскурсия по саду с выбором времени (кнопка на главной)
const TOUR = [
  { days: [1, 2, 3, 4, 5], times: ["10:30", "11:30", "12:30", "15:30"] },
  { days: [6], times: ["11:00", "12:00"] },
];

// Форматы сада, где выбирается только ДЕНЬ (время не выбираем).
// start нужен только для напоминаний: «за сутки до начала».
export const DAY_VISITS = {
  full:    { days: [1, 2, 3, 4, 5], start: "08:00" }, // полный день: пн–пт
  short:   { days: [1, 2, 3, 4, 5], start: "08:00" }, // кратковременного: пн–пт
  weekend: { days: [6, 7],          start: "10:00" }, // выходного дня: сб и вс
};

// Няни на час (ПРИМЕРЫ: впишите реальные ФИО и стаж).
// id нельзя менять после запуска: он попадает в ID записи.
export const NANNIES = [
  { id: "n1", name: "Иванова Марина Сергеевна",  experience: "8 лет" },
  { id: "n2", name: "Петрова Ольга Андреевна",   experience: "5 лет" },
  { id: "n3", name: "Сидорова Елена Викторовна", experience: "12 лет" },
];

const HOURS_ALL = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

// Когда работает каждая няня (у каждой может быть своё)
const NANNY_RULES = {
  n1: [{ days: [1, 2, 3, 4, 5, 6], times: HOURS_ALL }],
  n2: [{ days: [1, 2, 3, 4, 5],    times: HOURS_ALL }],
  n3: [{ days: [2, 4, 6],          times: ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00"] }],
};

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

// Няни, которые работают в это время (занятость другими людьми проверяет таблица)
export function getNanniesAt(dateKey, time) {
  return NANNIES.filter((n) => timesFor(NANNY_RULES[n.id] || [], dateKey).includes(time));
}

// Время на выбранную дату
export function getSlotTimes(kind, refId, dateKey) {
  if (kind === "tour") return timesFor(TOUR, dateKey);
  if (kind === "nanny") {
    // любое время, когда работает хотя бы одна няня
    const all = new Set();
    NANNIES.forEach((n) => timesFor(NANNY_RULES[n.id] || [], dateKey).forEach((t) => all.add(t)));
    return [...all].sort();
  }
  if (kind === "specialist") return timesFor(SPECIALISTS[refId] || [], dateKey);
  if (kind === "class") return ["10:00", "11:00", "16:00", "17:00"]; // заглушка
  return [];
}

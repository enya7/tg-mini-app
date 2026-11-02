// =====================================================================
//  Записи: даты, правила и хранение.
//
//  Сейчас записи хранятся на устройстве пользователя
//  (Telegram CloudStorage, а если его нет, то localStorage).
//  Когда появится сервер, заменяются только функции в блоке «ХРАНЕНИЕ»,
//  а правила из блока «ПРАВИЛА» дублируются на сервере.
// =====================================================================

/* ---------- НАСТРОЙКИ ПРАВИЛ ---------- */
export const SLOT_HOURS = 1;            // одна запись = 1 час
export const MAX_ACTIVE = 5;            // сколько будущих записей может быть одновременно
export const MIN_LEAD_HOURS = 2;        // записаться можно не позднее чем за N часов
export const CANCEL_BEFORE_HOURS = 2;   // отменить можно не позднее чем за N часов
export const MAX_CANCELS_PER_DAY = 3;   // сколько отмен разрешено за сутки
export const MAX_DAYS_AHEAD = 28;       // на сколько дней вперёд открыта запись
export const ADMIN_PHONE = "+7 (993) 618-16-18";

/* ---------- ДАТЫ ---------- */
const pad = (n) => String(n).padStart(2, "0");

export const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// 1 = понедельник ... 7 = воскресенье
export const weekdayOf = (d) => (d.getDay() === 0 ? 7 : d.getDay());

export const startOfWeek = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -(weekdayOf(x) - 1));
};

export const slotStart = (dateKey, time) => {
  const [h, m] = time.split(":").map(Number);
  const d = fromKey(dateKey);
  d.setHours(h, m, 0, 0);
  return d;
};

export const endTime = (time) => {
  const [h, m] = time.split(":").map(Number);
  return `${pad(h + SLOT_HOURS)}:${pad(m)}`;
};

const SHORT_DOW = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

// «ср 04.11»
export const formatShortDate = (key) => {
  const d = fromKey(key);
  return `${SHORT_DOW[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
};

/* ---------- ПРАВИЛА ---------- */
export const makeBookingId = (slot) =>
  `${slot.kind}:${slot.refId}:${slot.date}:${slot.time}`;

const HOUR = 3600 * 1000;

// Вернёт текст ошибки или null, если записаться можно
export function checkBooking(state, slot, now = new Date()) {
  const start = slotStart(slot.date, slot.time);

  if (start - now < MIN_LEAD_HOURS * HOUR) {
    return `Запись закрыта: до начала меньше ${MIN_LEAD_HOURS} часов. Позвоните администратору: ${ADMIN_PHONE}`;
  }
  if (start - now > MAX_DAYS_AHEAD * 24 * HOUR) {
    return `Записаться можно не более чем на ${MAX_DAYS_AHEAD} дней вперёд.`;
  }

  const id = makeBookingId(slot);
  if (state.list.some((b) => b.id === id)) {
    return "Вы уже записаны на это время.";
  }

  const clash = state.list.find(
    (b) => Math.abs(slotStart(b.date, b.time) - start) < SLOT_HOURS * HOUR
  );
  if (clash) {
    return `На это время у вас уже есть запись: «${clash.title}».`;
  }

  if (state.list.length >= MAX_ACTIVE) {
    return `Можно иметь не более ${MAX_ACTIVE} активных записей. Отмените ненужную или дождитесь занятия.`;
  }

  const recentCancels = state.cancels.filter((t) => now - t < 24 * HOUR).length;
  if (recentCancels >= MAX_CANCELS_PER_DAY) {
    return `Слишком много отмен за сутки. Свяжитесь с администратором: ${ADMIN_PHONE}`;
  }

  return null;
}

export function checkCancel(booking, now = new Date()) {
  const start = slotStart(booking.date, booking.time);
  if (start - now < CANCEL_BEFORE_HOURS * HOUR) {
    return `Отменить можно не позднее чем за ${CANCEL_BEFORE_HOURS} часа до начала. Позвоните администратору: ${ADMIN_PHONE}`;
  }
  return null;
}

// Убирает прошедшие записи и старые отметки об отменах
export function pruneState(state, now = new Date()) {
  const list = state.list.filter(
    (b) => slotStart(b.date, b.time).getTime() + SLOT_HOURS * HOUR > now.getTime()
  );
  const cancels = state.cancels.filter((t) => now - t < 24 * HOUR);
  if (list.length === state.list.length && cancels.length === state.cancels.length) {
    return state;
  }
  return { list, cancels };
}

export const sortBookings = (list) =>
  [...list].sort((a, b) => slotStart(a.date, a.time) - slotStart(b.date, b.time));

/* ---------- ТЕЛЕФОН ---------- */
// Приводит к виду +7XXXXXXXXXX или возвращает null, если номер неверный
export function normalizePhone(raw) {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10 || digits[0] !== "9") return null; // мобильные РФ
  return `+7${digits}`;
}

export function formatPhone(normalized) {
  const d = normalized.replace(/\D/g, "").slice(1);
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}

/* ---------- ХРАНЕНИЕ ---------- */
const KEY_STATE = "bookings_v1";
const KEY_PROFILE = "profile_v1";

function cloud() {
  const tg = window.Telegram?.WebApp;
  if (tg?.CloudStorage && tg.isVersionAtLeast?.("6.9")) return tg.CloudStorage;
  return null;
}

function cloudGet(cs, key) {
  return new Promise((resolve) => {
    try {
      cs.getItem(key, (err, value) => resolve(err ? null : value || null));
    } catch {
      resolve(null);
    }
  });
}

function cloudSet(cs, key, value) {
  return new Promise((resolve) => {
    try {
      cs.setItem(key, value, (err, ok) => resolve(!err && !!ok));
    } catch {
      resolve(false);
    }
  });
}

async function getItem(key) {
  const cs = cloud();
  if (cs) {
    const v = await cloudGet(cs, key);
    if (v) return v;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function setItem(key, value) {
  const cs = cloud();
  if (cs) await cloudSet(cs, key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage может быть недоступен */
  }
}

export async function loadState() {
  try {
    const raw = await getItem(KEY_STATE);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      list: Array.isArray(parsed?.list) ? parsed.list : [],
      cancels: Array.isArray(parsed?.cancels) ? parsed.cancels : [],
    };
  } catch {
    return { list: [], cancels: [] };
  }
}

export const saveState = (state) => setItem(KEY_STATE, JSON.stringify(state));

export async function loadProfile() {
  try {
    const raw = await getItem(KEY_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const saveProfile = (profile) =>
  setItem(KEY_PROFILE, JSON.stringify(profile));

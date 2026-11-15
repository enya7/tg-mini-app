// =====================================================================
//  Google Apps Script: записи, отмены, занятость нянь и напоминания в Telegram
//
//  ОДИН РАЗ:
//   1. Project settings (шестерёнка) -> Script properties -> Add:
//        BOT_TOKEN = токен бота от @BotFather (НИКОГДА не вставляйте его в App.jsx)
//   2. Project settings -> Time zone: (GMT+03:00) Moscow
//   3. Выберите функцию setup и нажмите Run. Разрешите доступ.
//      (Если окно «Доступ заблокирован»: Advanced -> Go to ... (unsafe) -> Allow)
//   4. Deploy -> Manage deployments -> карандаш -> Version: New version -> Deploy.
//      Execute as: Me, Who has access: Anyone.
//      (без новой версии сайт продолжит работать со старым кодом!)
//
//  БОТ С КОМАНДАМИ И РАССЫЛКОЙ РАСПИСАНИЯ (один раз):
//   5. Script properties -> Add: WEBAPP_URL = адрес веб-приложения (оканчивается на /exec)
//   6. Deploy -> New version (обязательно ДО следующего шага)
//   7. Запустите функцию setupBot. Остановите бота в ноутбуке (он больше не нужен).
// =====================================================================

var SHEET_NAME = "Записи";
var TZ = "Europe/Moscow";
var TZ_OFFSET = "+03:00";

var REMIND_DAY_HOURS = 24;   // первое напоминание: за сутки
var REMIND_NEAR_HOURS = 2;   // второе напоминание: за 2 часа
var SLOT_HOURS = 1;          // длительность записи

var ADDRESS = "Рябиновая ул., 5, корп. 1, этаж 1, офис 138, Одинцово";
var ADMIN_PHONE = "+7 (993) 618-16-18";

// Номера колонок
var C = { CREATED: 1, NAME: 2, PHONE: 3, TITLE: 4, DATE: 5, TIME: 6, STATUS: 7,
          CANCELLED: 8, TG: 9, ID: 10, CONSENT: 11, REM_DAY: 12, REM_NEAR: 13,
          ALLDAY: 14, NICK: 15 };
var HEADERS = ["Создано", "Имя", "Телефон", "Что", "Дата", "Время", "Статус",
               "Отменено", "Telegram ID", "ID записи", "Согласие на ПДн",
               "Напоминание за сутки", "Напоминание за 2 часа", "Весь день", "Ник Telegram"];

/* ---------- Приём запросов от мини-приложения ---------- */
function doPost(e) { return handle(e); }
function doGet(e)  { return handle(e); }

function handle(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Сообщения от Telegram (команды бота) приходят с ?hook=СЕКРЕТ
    if (e && e.parameter && e.parameter.hook) return handleTelegram(e);

    var p = (e && e.parameter) || {};
    if (e && e.postData && e.postData.type === "application/json") {
      try { p = JSON.parse(e.postData.contents); } catch (err) {}
    }
    var sheet = getSheet();
    var action = p.action || "";

    if (action === "busy") {
      return json({ status: "success", busy: busyNannyIds(sheet) });
    }
    if (action === "cancel") {
      cancelBooking(sheet, p);
      return json({ status: "success" });
    }
    if (action === "book") {
      var result = bookBooking(sheet, p);
      return json({ status: result === "busy" ? "busy" : "success" });
    }
    return json({ error: "unknown action" });
  } catch (error) {
    return json({ error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

// Заголовки всегда в 1-й строке. Если там уже данные, сдвигаем их вниз.
function ensureHeaders(sheet) {
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }
  var first = sheet.getLastRow() > 0 ? String(sheet.getRange(1, 1).getValue()) : "";
  if (sheet.getLastRow() > 0 && first !== HEADERS[0]) sheet.insertRowBefore(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

/* ---------- Запись ---------- */
// Возвращает "busy", если няню на это время уже занял другой человек
function bookBooking(sheet, p) {
  var id = p.id || "";
  var tg = String(p.tg_id || "");
  var allDay = String(p.all_day) === "1";

  var existing = id ? findActiveRow(sheet, id) : 0;
  if (existing) {
    if (id.indexOf("nanny:") === 0) {
      var rowTg = String(sheet.getRange(existing, C.TG).getValue());
      var rowPhone = String(sheet.getRange(existing, C.PHONE).getValue());
      var same = tg ? rowTg === tg : rowPhone === String(p.phone || "");
      if (!same) return "busy";
    }
    return "ok"; // повторная отправка от того же человека: игнорируем
  }

  var start = startOf(p.date, p.time);
  var created = new Date();
  // Если до начала меньше суток, напоминание «за сутки» не нужно
  var remDay = (start - created) < REMIND_DAY_HOURS * 3600000 ? "—" : "";
  // Для записи «на день» напоминание за 2 часа не нужно
  var remNear = allDay ? "—" : "";

  appendTextRow(sheet, [
    stamp(created), p.name || "", p.phone || "", p.title || "",
    ruDate(p.date), p.time || "", "Записан", "", tg, id,
    p.consent || "", remDay, remNear, allDay ? "1" : "", p.tg_username || ""
  ]);

  if (tg) {
    sendTelegram(tg,
      "✅ Вы записаны\n" + p.title + "\n" + whenText(p.date, p.time, allDay) +
      "\n\n📍 " + ADDRESS +
      "\nЕсли планы изменятся, отмените запись в приложении или позвоните " + ADMIN_PHONE);
  }
  return "ok";
}

/* ---------- Отмена ---------- */
function cancelBooking(sheet, p) {
  var id = p.id || "";
  var allDay = String(p.all_day) === "1";
  var row = findActiveRow(sheet, id);
  var now = stamp(new Date());

  if (row) {
    var r = sheet.getRange(row, C.STATUS, 1, 2);
    r.setNumberFormat("@");
    r.setValues([["Отменена", now]]);
  } else {
    // Записи в таблице не нашли: добавляем строку
    appendTextRow(sheet, [
      now, p.name || "", p.phone || "", p.title || "",
      ruDate(p.date), p.time || "", "Отменена", now, p.tg_id || "", id,
      p.consent || "", "—", "—", allDay ? "1" : "", p.tg_username || ""
    ]);
  }

  if (p.tg_id) {
    sendTelegram(p.tg_id,
      "❌ Запись отменена\n" + p.title + "\n" + whenText(p.date, p.time, allDay));
  }
}

// Ищет снизу вверх строку с этим ID и статусом «Записан»
function findActiveRow(sheet, id) {
  var last = sheet.getLastRow();
  if (!id || last < 2) return 0;
  var vals = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][C.ID - 1]) === id && vals[i][C.STATUS - 1] === "Записан") {
      return i + 2;
    }
  }
  return 0;
}

// ID всех будущих броней нянь (приложение по ним скрывает занятые)
function busyNannyIds(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var vals = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var now = new Date().getTime(), out = [];
  for (var i = 0; i < vals.length; i++) {
    var id = String(vals[i][C.ID - 1]);
    if (id.indexOf("nanny:") !== 0 || vals[i][C.STATUS - 1] !== "Записан") continue;
    var s = startFromRu(vals[i][C.DATE - 1], vals[i][C.TIME - 1]);
    if (s && s.getTime() + SLOT_HOURS * 3600000 > now) out.push(id);
  }
  return out;
}

/* ---------- Напоминания (запускается по таймеру) ---------- */
function sendReminders() {
  try { sendRemindersOnly(); } catch (err) { Logger.log("Ошибка напоминаний: " + err); }
  try { sendDigests(); } catch (err) { Logger.log("Ошибка расписания на завтра: " + err); }
}

function sendRemindersOnly() {
  var sheet = getSheet();
  var last = sheet.getLastRow();
  if (last < 2) return;

  var now = new Date();
  var vals = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();

  for (var i = 0; i < vals.length; i++) {
    var row = vals[i], rowNum = i + 2;
    if (row[C.STATUS - 1] !== "Записан") continue;

    var start = startFromRu(row[C.DATE - 1], row[C.TIME - 1]);
    if (!start) continue;
    var diff = start - now;
    var tg = row[C.TG - 1];
    var title = row[C.TITLE - 1];
    var allDay = String(row[C.ALLDAY - 1]) === "1";
    var when = whenText(cellIso(row[C.DATE - 1]), cellTime(row[C.TIME - 1]), allDay);
    var remDay = row[C.REM_DAY - 1], remNear = row[C.REM_NEAR - 1];

    if (diff <= 0) {
      if (!remNear) setText(sheet, rowNum, C.REM_NEAR, "—");
      continue;
    }

    if (diff <= REMIND_NEAR_HOURS * 3600000) {
      if (!remNear) {
        if (tg && !allDay) sendTelegram(tg, "⏰ Скоро занятие\n" + title + "\n" + when +
          "\n\n📍 " + ADDRESS);
        setText(sheet, rowNum, C.REM_NEAR, stamp(now));
      }
      if (!remDay) setText(sheet, rowNum, C.REM_DAY, "—");
    } else if (diff <= REMIND_DAY_HOURS * 3600000) {
      if (!remDay) {
        if (tg) sendTelegram(tg, "🔔 Напоминаем о записи\n" + title + "\n" + when +
          "\n\n📍 " + ADDRESS +
          "\nЕсли планы изменились, отмените запись в приложении или позвоните " + ADMIN_PHONE);
        setText(sheet, rowNum, C.REM_DAY, stamp(now));
      }
    }
  }
}

/* ---------- Telegram ---------- */
function tgApi(method, payload) {
  var token = PropertiesService.getScriptProperties().getProperty("BOT_TOKEN");
  if (!token) { Logger.log("BOT_TOKEN не задан"); return null; }
  var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    // Частая причина: пользователь не нажимал Start у бота (403) или неверный токен (401)
    Logger.log("Telegram " + method + " " + res.getResponseCode() + ": " + res.getContentText());
    return null;
  }
  return JSON.parse(res.getContentText());
}

// extra: необязательные поля, например { parse_mode: "HTML", reply_markup: {...} }
function sendTelegram(chatId, text, extra) {
  var payload = { chat_id: chatId, text: text };
  if (extra) for (var k in extra) payload[k] = extra[k];
  return !!tgApi("sendMessage", payload);
}

/* =====================================================================
   БОТ: команды в чате и расписание на завтра
   /start      приветствие и кнопка «Открыть приложение»
   /schedule   все ближайшие записи
   /tomorrow   записи на завтра
   /time       во сколько присылать расписание на завтра (или /time 19:30, /time выкл)
   ===================================================================== */
var APP_URL = "https://enya7.github.io/tg-mini-app/";  // адрес мини-приложения
var DEFAULT_DIGEST_TIME = "20:00";   // время рассылки по умолчанию (по Москве)
var DIGEST_WINDOW_MIN = 180;         // если скрипт опоздал, ещё можно отправить в течение 3 часов
var SETTINGS_SHEET = "Настройки";
var SET_HEADERS = ["Telegram ID", "Время расписания на завтра", "Включено", "Последняя отправка"];

function handleTelegram(e) {
  var secret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
  if (!secret || e.parameter.hook !== secret) return json({ ok: false });

  var update;
  try { update = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: true }); }

  // Telegram может прислать одно и то же обновление дважды: второй раз игнорируем
  var cache = CacheService.getScriptCache();
  var key = "upd_" + update.update_id;
  if (cache.get(key)) return json({ ok: true });
  cache.put(key, "1", 21600);

  try {
    if (update.message) onMessage(update.message);
    else if (update.callback_query) onCallback(update.callback_query);
  } catch (err) {
    Logger.log("Ошибка бота: " + err);
  }
  return json({ ok: true });
}

function onMessage(msg) {
  if (!msg.chat || msg.chat.type !== "private") return;
  var chatId = msg.chat.id;
  var text = String(msg.text || "").trim();
  if (!text) return;
  var parts = text.split(/\s+/);
  var cmd = parts[0].split("@")[0].toLowerCase();
  var arg = parts.slice(1).join(" ");

  if (cmd === "/start") {
    sendTelegram(chatId,
      "👋 Здравствуйте! Я помощник «Матрёшки».\n\n" +
      "Запись, отмену и напоминания смотрите в приложении. Здесь я пришлю:\n" +
      "• /schedule — ваши ближайшие записи\n" +
      "• /tomorrow — записи на завтра\n" +
      "• /time — во сколько присылать расписание на завтра",
      { reply_markup: appButton() });
  } else if (cmd === "/schedule" || cmd === "/raspisanie") {
    sendUpcoming(chatId);
  } else if (cmd === "/tomorrow" || cmd === "/zavtra") {
    sendTomorrow(chatId);
  } else if (cmd === "/time") {
    onTimeCommand(chatId, arg);
  } else {
    sendTelegram(chatId, "Команды: /schedule, /tomorrow, /time. Записаться можно в приложении.",
      { reply_markup: appButton() });
  }
}

function onCallback(cq) {
  tgApi("answerCallbackQuery", { callback_query_id: cq.id });
  var data = String(cq.data || "");
  if (data.indexOf("t:") !== 0 || !cq.message) return;
  var text = applyDigestTime(cq.from.id, data.slice(2)) || "Не понял время.";
  tgApi("editMessageText", {
    chat_id: cq.message.chat.id, message_id: cq.message.message_id,
    text: text, parse_mode: "HTML"
  });
}

/* ---------- Расписание ---------- */
function appButton() {
  return { inline_keyboard: [[{ text: "Открыть приложение", web_app: { url: APP_URL } }]] };
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dowOf(iso) {
  var days = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  return days[new Date(iso + "T12:00:00" + TZ_OFFSET).getUTCDay()];
}

function shortDate(iso) { var a = iso.split("-"); return a[2] + "." + a[1]; }

function endOfSlot(time) {
  var p = time.split(":");
  return ("0" + (Number(p[0]) + SLOT_HOURS)).slice(-2) + ":" + p[1];
}

function minutesOf(t) { var p = String(t).split(":"); return Number(p[0]) * 60 + Number(p[1]); }

function todayIso() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }

function tomorrowIso() {
  return Utilities.formatDate(new Date(new Date().getTime() + 24 * 3600000), TZ, "yyyy-MM-dd");
}

// Все активные записи из таблицы
function readActive() {
  var sheet = getSheet(), last = sheet.getLastRow();
  if (last < 2) return [];
  var vals = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var out = [];
  vals.forEach(function (row) {
    if (row[C.STATUS - 1] !== "Записан" || !row[C.TG - 1]) return;
    out.push({
      tg: String(row[C.TG - 1]),
      iso: cellIso(row[C.DATE - 1]),
      time: cellTime(row[C.TIME - 1]),
      title: row[C.TITLE - 1],
      allDay: String(row[C.ALLDAY - 1]) === "1"
    });
  });
  return out;
}

function sortBookings(list) {
  return list.sort(function (a, b) { return (a.iso + a.time) < (b.iso + b.time) ? -1 : 1; });
}

function upcomingOf(tg) {
  var now = new Date().getTime(), today = todayIso();
  return sortBookings(readActive().filter(function (b) {
    if (b.tg !== String(tg) || b.iso < today) return false;
    if (b.iso === today && !b.allDay) {
      return startOf(b.iso, b.time).getTime() + SLOT_HOURS * 3600000 > now;
    }
    return true;
  }));
}

function renderBookings(items) {
  var out = [], lastIso = "";
  items.forEach(function (b) {
    if (b.iso !== lastIso) {
      out.push((out.length ? "\n" : "") + "<b>🗓 " + dowOf(b.iso) + ", " + shortDate(b.iso) + "</b>");
      lastIso = b.iso;
    }
    out.push((b.allDay ? "📌 " : "🕒 " + b.time + "–" + endOfSlot(b.time) + " · ") + esc(b.title));
  });
  return out.join("\n");
}

function sendUpcoming(chatId) {
  var items = upcomingOf(chatId);
  if (!items.length) {
    sendTelegram(chatId, "У вас пока нет предстоящих записей. Записаться можно в приложении.",
      { reply_markup: appButton() });
    return;
  }
  sendTelegram(chatId,
    "📋 <b>Ваши ближайшие записи</b>\n\n" + renderBookings(items) + "\n\n📍 " + esc(ADDRESS),
    { parse_mode: "HTML", reply_markup: appButton() });
}

function tomorrowText(items) {
  return "📅 <b>Расписание на завтра</b>\n\n" + renderBookings(items) + "\n\n📍 " + esc(ADDRESS);
}

function sendTomorrow(chatId) {
  var t = tomorrowIso();
  var items = upcomingOf(chatId).filter(function (b) { return b.iso === t; });
  if (!items.length) {
    sendTelegram(chatId, "На завтра у вас записей нет.", { reply_markup: appButton() });
    return;
  }
  sendTelegram(chatId, tomorrowText(items), { parse_mode: "HTML", reply_markup: appButton() });
}

/* ---------- Настройки времени рассылки (лист «Настройки») ---------- */
function settingsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SETTINGS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SETTINGS_SHEET);
    sh.getRange(1, 1, 1, SET_HEADERS.length).setValues([SET_HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function loadSettings() {
  var sh = settingsSheet(), last = sh.getLastRow(), map = {};
  if (last < 2) return map;
  sh.getRange(2, 1, last - 1, SET_HEADERS.length).getValues().forEach(function (r, i) {
    var tg = String(r[0]);
    if (!tg) return;
    map[tg] = {
      row: i + 2,
      time: cellTime(r[1]) || DEFAULT_DIGEST_TIME,
      on: String(r[2]) !== "0",
      last: cellIso(r[3])
    };
  });
  return map;
}

function getSetting(tg) {
  return loadSettings()[String(tg)] || { time: DEFAULT_DIGEST_TIME, on: true, last: "" };
}

function saveSetting(tg, s) {
  var sh = settingsSheet(), cur = loadSettings()[String(tg)];
  var row = cur ? cur.row : sh.getLastRow() + 1;
  var range = sh.getRange(row, 1, 1, SET_HEADERS.length);
  range.setNumberFormat("@");
  range.setValues([[String(tg), s.time, s.on ? "1" : "0", s.last || ""]]);
}

// v: "off" или время вида 19:30. Возвращает текст ответа или null, если время не понято
function applyDigestTime(tg, v) {
  var cur = getSetting(tg);
  if (v === "off") {
    saveSetting(tg, { time: cur.time, on: false, last: cur.last });
    return "🔕 Расписание на завтра больше не будет приходить. Включить снова: /time";
  }
  var m = String(v).match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  var time = ("0" + m[1]).slice(-2) + ":" + m[2];
  var passed = minutesOf(Utilities.formatDate(new Date(), TZ, "HH:mm")) >= minutesOf(time);
  saveSetting(tg, { time: time, on: true, last: passed ? todayIso() : cur.last });
  return "✅ Готово: расписание на завтра будет приходить в <b>" + time + "</b> (по Москве)" +
    (passed ? ". Первое придёт завтра." : ".");
}

function onTimeCommand(chatId, arg) {
  if (arg) {
    var v = /^(off|выкл)/i.test(arg) ? "off" : arg;
    sendTelegram(chatId,
      applyDigestTime(chatId, v) || "Не понял время. Напишите, например: /time 19:30 или /time выкл",
      { parse_mode: "HTML" });
    return;
  }
  var s = getSetting(chatId);
  sendTelegram(chatId,
    "⏰ Расписание на завтра: " + (s.on ? "приходит в <b>" + s.time + "</b>" : "выключено") +
    ".\n\nВыберите время или напишите своё, например: /time 19:30",
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [
        [{ text: "18:00", callback_data: "t:18:00" }, { text: "19:00", callback_data: "t:19:00" },
         { text: "20:00", callback_data: "t:20:00" }, { text: "21:00", callback_data: "t:21:00" }],
        [{ text: "🔕 Выключить", callback_data: "t:off" }]
      ] }
    });
}

/* ---------- Рассылка расписания на завтра (вызывается из sendReminders) ---------- */
function sendDigests() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    var t = tomorrowIso(), today = todayIso();
    var nowMin = minutesOf(Utilities.formatDate(new Date(), TZ, "HH:mm"));

    var byUser = {};
    readActive().forEach(function (b) {
      if (b.iso === t) (byUser[b.tg] = byUser[b.tg] || []).push(b);
    });

    var settings = loadSettings();
    for (var tg in byUser) {
      var s = settings[tg] || { time: DEFAULT_DIGEST_TIME, on: true, last: "" };
      if (!s.on || s.last === today) continue;
      var at = minutesOf(s.time);
      if (nowMin < at || nowMin > at + DIGEST_WINDOW_MIN) continue;

      var ok = sendTelegram(tg, tomorrowText(sortBookings(byUser[tg])),
        { parse_mode: "HTML", reply_markup: appButton() });
      if (ok) saveSetting(tg, { time: s.time, on: true, last: today });
    }
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Подключение бота (один раз) ---------- */
// Перед запуском: Script properties -> WEBAPP_URL = адрес веб-приложения (оканчивается на /exec)
function setupBot() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty("WEBAPP_URL");
  if (!url) {
    Logger.log("Добавьте в Script properties: WEBAPP_URL = адрес веб-приложения (Deploy -> Manage deployments -> Web app URL, оканчивается на /exec)");
    return;
  }
  var secret = props.getProperty("WEBHOOK_SECRET");
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, "");
    props.setProperty("WEBHOOK_SECRET", secret);
  }
  var r = tgApi("setWebhook", {
    url: url + "?hook=" + secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true
  });
  Logger.log(r && r.ok ? "Webhook установлен" : "Webhook НЕ установлен, смотрите журнал выше");

  tgApi("setMyCommands", { commands: [
    { command: "schedule", description: "Мои ближайшие записи" },
    { command: "tomorrow", description: "Расписание на завтра" },
    { command: "time", description: "Время рассылки расписания" }
  ] });
  settingsSheet();
}

// Показывает, как Telegram видит webhook (последняя ошибка, очередь)
function webhookInfo() {
  var token = PropertiesService.getScriptProperties().getProperty("BOT_TOKEN");
  var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getWebhookInfo",
    { muteHttpExceptions: true });
  var info = JSON.parse(res.getContentText()).result || {};
  Logger.log("Адрес задан: " + (info.url ? "да" : "НЕТ") +
    " | в очереди: " + info.pending_update_count +
    " | последняя ошибка: " + (info.last_error_message || "нет"));
}

/* ---------- Проверка ---------- */
// Шлёт тестовое сообщение тому, кто записывался последним (ID берётся из таблицы).
function testSend() {
  var sheet = getSheet(), last = sheet.getLastRow();
  var chatId = "";
  for (var r = last; r >= 2 && !chatId; r--) chatId = String(sheet.getRange(r, C.TG).getValue());
  if (!chatId) { Logger.log("В таблице нет ни одного Telegram ID"); return; }
  var ok = sendTelegram(chatId, "Проверка связи: бот может писать вам в чат ✅");
  Logger.log(ok ? "Отправлено на ID " + chatId : "Не отправлено, смотрите журнал выше");
}

// Показывает, что скрипт «видит» в ваших записях и почему напоминание могло не уйти
function debugReminders() {
  var sheet = getSheet(), last = sheet.getLastRow();
  if (last < 2) { Logger.log("Нет записей"); return; }
  var now = new Date();
  Logger.log("Сейчас: " + stamp(now) + " (" + TZ + ")");
  var vals = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var shown = 0;
  for (var i = vals.length - 1; i >= 0 && shown < 8; i--) {
    var row = vals[i];
    if (row[C.STATUS - 1] !== "Записан") continue;
    var start = startFromRu(row[C.DATE - 1], row[C.TIME - 1]);
    var mins = start ? Math.round((start - now) / 60000) : "не удалось разобрать дату";
    Logger.log("строка " + (i + 2) + ": " + row[C.TITLE - 1] +
      " | " + cellIso(row[C.DATE - 1]) + " " + cellTime(row[C.TIME - 1]) +
      " | до начала, мин: " + mins +
      " | TG: " + (row[C.TG - 1] || "ПУСТО") +
      " | за сутки: [" + row[C.REM_DAY - 1] + "]" +
      " | за 2 часа: [" + row[C.REM_NEAR - 1] + "]" +
      " | весь день: [" + row[C.ALLDAY - 1] + "]");
    shown++;
  }
  if (!shown) Logger.log("Активных записей (статус «Записан») нет");
}

// Запустите и посмотрите журнал: функция сама покажет, что не так с уведомлениями
function diagnose() {
  var token = PropertiesService.getScriptProperties().getProperty("BOT_TOKEN");
  Logger.log("1) BOT_TOKEN задан: " + (token ? "да" : "НЕТ, добавьте в Script properties"));
  if (token) {
    var r = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getMe",
      { muteHttpExceptions: true });
    Logger.log("2) Проверка токена: " + r.getResponseCode() +
      (r.getResponseCode() === 200 ? " (токен рабочий, бот: @" +
        JSON.parse(r.getContentText()).result.username + ")" : " (токен неверный, возьмите новый у @BotFather)"));
  }
  var n = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === "sendReminders"; }).length;
  Logger.log("3) Триггер напоминаний: " + (n ? "есть" : "НЕТ, запустите setup"));

  var sheet = getSheet(), last = sheet.getLastRow();
  if (last < 2) { Logger.log("4) В таблице пока нет записей"); return; }
  var tg = sheet.getRange(2, C.TG, last - 1, 1).getValues();
  var empty = tg.filter(function (x) { return !x[0]; }).length;
  Logger.log("4) Записей: " + (last - 1) + ", без Telegram ID: " + empty +
    (empty ? " (им уведомления слать некому, см. шаг про запуск приложения)" : ""));
}

/* ---------- Установка таймера ---------- */
function setup() {
  getSheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendReminders") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sendReminders").timeBased().everyMinutes(10).create();
  Logger.log("Готово: напоминания проверяются каждые 10 минут");
}

/* ---------- Вспомогательное ---------- */
function appendTextRow(sheet, values) {
  var r = sheet.getLastRow() + 1;
  var range = sheet.getRange(r, 1, 1, values.length);
  range.setNumberFormat("@");
  range.setValues([values]);
}

function setText(sheet, row, col, value) {
  var cell = sheet.getRange(row, col);
  cell.setNumberFormat("@");
  cell.setValue(value);
}

function stamp(d) { return Utilities.formatDate(d, TZ, "dd.MM.yyyy HH:mm"); }

function ruDate(iso) {            // 2026-11-06 -> 06.11.2026
  var a = String(iso || "").split("-");
  return a.length === 3 ? a[2] + "." + a[1] + "." + a[0] : String(iso || "");
}

function toIso(ru) {              // 06.11.2026 -> 2026-11-06
  var a = String(ru).split(".");
  return a.length === 3 ? a[2] + "-" + a[1] + "-" + a[0] : String(ru);
}

function startOf(iso, time) {     // начало записи по московскому времени
  return new Date(iso + "T" + time + ":00" + TZ_OFFSET);
}

// Google Таблицы иногда превращают «16.11.2026» и «10:00» в настоящие дату и время.
// Эти функции понимают оба варианта: и текст, и настоящую дату.
function isDateObj(v) { return Object.prototype.toString.call(v) === "[object Date]"; }

function sheetTz() {
  return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || TZ;
}

function cellIso(v) {             // -> 2026-11-16
  if (isDateObj(v)) return Utilities.formatDate(v, sheetTz(), "yyyy-MM-dd");
  return toIso(v);
}

function cellTime(v) {            // -> 10:00
  if (isDateObj(v)) return Utilities.formatDate(v, sheetTz(), "HH:mm");
  var m = String(v).match(/^(\d{1,2}):(\d{2})/);
  return m ? ("0" + m[1]).slice(-2) + ":" + m[2] : String(v);
}

function startFromRu(ru, time) {
  var d = startOf(cellIso(ru), cellTime(time));
  return isNaN(d.getTime()) ? null : d;
}

function whenText(iso, time, allDay) {
  var days = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  var dow = days[new Date(iso + "T12:00:00" + TZ_OFFSET).getUTCDay()];
  if (allDay) return "🗓 " + dow + ", " + ruDate(iso);
  var parts = String(time).split(":");
  var end = ("0" + (Number(parts[0]) + SLOT_HOURS)).slice(-2) + ":" + parts[1];
  return "🗓 " + dow + ", " + ruDate(iso) + ", " + time + "–" + end;
}

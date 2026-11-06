import flowerLeft from "./assets/flower_left.svg";
import flowerRight from "./assets/flower_right.svg";
import logo from "./assets/matreshka_doll.svg";
import cherry from "./assets/cherry.svg";
import bear from "./assets/teddy-bear.svg";
import scheduleIcon from "./assets/Book.svg";
import homeIcon from "./assets/home.svg";
import docIcon from "./assets/Л.svg";
import gardenIcon from "./assets/Carousel.svg";
import mainFlower from "./assets/Main_flower.svg"; 
import halloweenImg from "./assets/Halloween.svg";
import phoneIcon from "./assets/Phone.svg";
import mapPoint from "./assets/Map_point.svg"; 
import approveIcon from "./assets/approve.svg"; 
import { 
  loadState, saveState, loadProfile, saveProfile, 
  checkBooking, checkCancel, makeBookingId, 
  addDays, toKey, formatShortDate, pruneState 
} from "./bookingStore";
import { getSlotTimes } from "./scheduleData";

import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const sections = [
  { id: "home", icon: homeIcon, label: "Главная" },
  { id: "kindergarten", icon: gardenIcon, label: "Детский сад" },
  { id: "classes", icon: scheduleIcon, label: "Занятия" },
  { id: "doctors", icon: docIcon, label: "Логопед" },
];

// Вставьте СЮДА скопированный URL из первого шага!
const GOOGLE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx4tZ0wWkYqJ91Z_ezNvXpWPcbfi4sQ9zTdSmCleYDuaMbr7qu3yikhYkqOk-rZqCNU/exec";

// ---------- Telegram и ссылки ----------
const tgApp = () => window.Telegram?.WebApp;
const inTelegram = () => !!tgApp()?.initData;
const tgUserId = () => tgApp()?.initDataUnsafe?.user?.id || "";

// Полный адрес файла из папки public (работает и на GitHub Pages, и локально)
const absUrl = (path) =>
  new URL(import.meta.env.BASE_URL + path, window.location.origin).href;

// В Telegram ссылки tel: не открываются. Вместо этого открываем в браузере
// страницу call.html с кнопкой «Позвонить». Вне Telegram работает обычный tel:.
function callAdmin(e) {
  if (inTelegram() && tgApp().openLink) {
    e.preventDefault();
    tgApp().openLink(absUrl("call.html"));
  }
}

// Политика конфиденциальности (файл public/privacy.html)
function openPrivacy(e) {
  e.preventDefault();
  const url = absUrl("https://www.fa.ru/privacy-policy/");
  if (inTelegram() && tgApp().openLink) tgApp().openLink(url);
  else window.open(url, "_blank", "noopener");
}

// Отправка события в Google Таблицу: action = "book" или "cancel"
function sendToSheet(action, booking, profile) {
  if (!GOOGLE_WEBHOOK_URL || !GOOGLE_WEBHOOK_URL.startsWith("http")) return;

  const p = new URLSearchParams();
  p.append("action", action);
  p.append("id", booking.id);
  p.append("name", profile?.name || "");
  p.append("phone", profile?.phone || "");
  p.append("title", booking.title);
  p.append("date", booking.date); // 2026-11-06
  p.append("time", booking.time); // 10:30
  p.append("tg_id", String(tgUserId()));
  p.append("consent", profile?.consentAt || "");

  fetch(GOOGLE_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: p.toString(),
  }).catch((err) => console.error("Ошибка отправки", err));
}


const events = [
  {
    id: "halloween-2026",
    image: halloweenImg,
    title: "Хеллоуин",
    date: "31 октября\n2026 года",
    sessions: [
      { time: "10:00", ages: "3-5 лет" },
      { time: "11:00", ages: "5-12 лет" },
    ],
  },
  // следующее мероприятие добавляйте сюда в таком же формате
];

function MatryoshkaLogo() {
  return (
    <div className="logo-picture" aria-label="Матрёшка с ребёнком">
      <img className="logo-flower flower-left" src={flowerLeft} alt="Левый цветок" />
      <img className="logo-doll doll-shape" src={logo} alt="Матрёшка" />
      <img className="logo-flower flower-right" src={flowerRight} alt="Правый цветок" />
    </div>
  );
}

function SplashScreen() {
  return (
    <section className="splash-screen">

      <div className="splash-content">
        <MatryoshkaLogo />

        <p className="brand-caption">Центр детского развития</p>
        <h1 className="brand-name">«Матрёшка»</h1>
      </div>
    </section>
  );
}

function WelcomeScreen() {
  return (
    <section className="welcome-screen">

      <img className="deco deco-cherry" src={cherry} alt="Вишня" />
      <img className="deco deco-branch-top" src={flowerLeft} alt="Левый цветок" />

      <div className="welcome-content">
        <p>
          Здравствуйте!
          <br />
          Я — помощник «Матрёшки».
          <br />
          Помогу быстро найти
          <br />
          подходящий вариант для
          <br />
          Вашего ребёнка
        </p>
      </div>

      <img className="deco deco-bear" src={bear} alt="Мишка" />
      <img className="deco deco-branch-bottom" src={flowerRight} alt="Правый цветок" />
    </section>
  );
}

function Reveal({ children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    },
    { threshold: 0, rootMargin: "0px 0px 60px 0px" }
  );

  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);

  return (
    <div ref={ref} className={visible ? "reveal visible" : "reveal"}>
      {children}
    </div>
  );
}

function EventCard({ event }) {
  return (
    <article className="event">
      <img className="event-image" src={event.image} alt={event.title} />

      <div className="event-info">
        <h3 className="event-name">{event.title}</h3>
        <p className="event-date">{event.date}</p>
      </div>

      <div className="event-sessions">
        {event.sessions.map((s) => (
          <div className="event-session" key={s.time}>
            Начало в {s.time}
            <br />
            для детей {s.ages}
          </div>
        ))}
      </div>
    </article>
  );
}

// Ссылка на Яндекс Карты. Можно заменить на ссылку на карточку организации
// (яндекс.ру/maps/org/...), тогда откроется именно ваш центр.
const MAP_URL =
  "https://yandex.ru/maps/?text=" +
  encodeURIComponent("Одинцово, Рябиновая улица, 5к1");

// В Telegram внешние ссылки лучше открывать через его собственный метод
function openExternal(e, url) {
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) {
    e.preventDefault();
    tg.openLink(url);
  }
}

function EventsSection() {
  return (
    <section className="events-section">
      <h2 className="events-heading">Мероприятия</h2>
      <p className="events-subtitle">Ближайшие мероприятия</p>

      {events.map((event) => (
        <Reveal key={event.id}>
          <EventCard event={event} />
        </Reveal>
      ))}

      <Reveal>
        <div className="events-contacts">
          <a className="contact-row" href="tel:+79936181618" onClick={callAdmin}>
            <img src={phoneIcon} alt="" />
            <span>8 (993) 618-16-18</span>
          </a>
          <a
            className="contact-row"
            href={MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternal(e, MAP_URL)}
          >
            <img src={mapPoint} alt="" />
            <span>
              Одинцово, ЖК “Одинцово-1”, ул.&nbsp;Рябиновая, д.5, к.1,
              подъезд 3, офис 138
            </span>
          </a>
        </div>
      </Reveal>
    </section>
  );
}


// =================================================================
// 1. Компонент авторизации (запрашивает данные перед первой записью)
// =================================================================
function AuthModal({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) return setError("Введите ваше имя");
    if (digits.length < 10 || digits.length > 15)
      return setError("Введите корректный номер телефона");
    if (!agreed) return setError("Нужно согласиться с политикой конфиденциальности");

    // Просим у Telegram разрешение писать пользователю (для напоминаний в чате)
    try {
      tgApp()?.requestWriteAccess?.();
    } catch {
      /* старые версии Telegram */
    }

    onSave({
      name: name.trim(),
      phone: phone.trim(),
      consentAt: new Date().toISOString(), // когда дано согласие
    });
  };

  return (
    <div className="cl-overlay">
      <div className="cl-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Давайте познакомимся</h3>
        <p className="kg-paragraph">
          Чтобы сохранить запись, укажите ваши данные для связи (один раз).
        </p>
        <input
          className="auth-input"
          placeholder="Имя и фамилия"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
        />
        <input
          className="auth-input"
          placeholder="Телефон (+7...)"
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(""); }}
        />

        <label className="auth-consent">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => { setAgreed(e.target.checked); setError(""); }}
          />
          <span>
            Я согласен(на) на обработку персональных данных и принимаю{" "}
            <a href={absUrl("privacy.html")} onClick={openPrivacy}>
              политику конфиденциальности
            </a>
          </span>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="kg-actions">
          <button
            className="kg-btn kg-btn-primary"
            onClick={handleSave}
            disabled={!agreed}
          >
            Сохранить и записаться
          </button>
          <button className="kg-btn kg-btn-secondary" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}


// =================================================================
// Универсальное модальное окно выбора даты и времени
// =================================================================
function BookingModal({ params, onClose, onConfirm }) {
  const [selectedDate, setSelectedDate] = useState(params.initialDate || toKey(new Date()));
  const [selectedTime, setSelectedTime] = useState(null);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { key: toKey(d), dayObj: d };
  });
  const DOW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  const times = getSlotTimes(params.kind, params.refId, selectedDate);

  const handleConfirm = () => {
    if (!selectedTime) return alert("Пожалуйста, выберите время");
    onConfirm({
      kind: params.kind,
      refId: params.refId,
      title: params.title,
      date: selectedDate,
      time: selectedTime
    });
  };

  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-modal" onClick={e => e.stopPropagation()}>
        <button className="cl-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
        <h3>Выберите время</h3>
        <p className="kg-paragraph">{params.title}</p>
        
        <div className="calendar-strip" style={{marginTop: 0, paddingBottom: 0}}>
          {dates.map(({ key, dayObj }) => (
            <button 
              key={key} 
              className={`calendar-day ${selectedDate === key ? 'active' : ''}`} 
              onClick={() => { setSelectedDate(key); setSelectedTime(null); }}
            >
              <span className="calendar-dow">{DOW[dayObj.getDay()]}</span>
              <span className="calendar-date">{dayObj.getDate()}</span>
            </button>
          ))}
        </div>

        <div className="time-slots">
           {times.length === 0 ? <p className="cl-empty" style={{marginTop: "10px"}}>Нет свободного времени</p> : 
             times.map(t => (
               <button key={t} className={`time-slot ${selectedTime === t ? 'active' : ''}`} onClick={() => setSelectedTime(t)}>
                 {t}
               </button>
             ))
           }
        </div>

        <button className="kg-btn kg-btn-primary" onClick={handleConfirm} style={{marginTop: "20px"}}>
          Продолжить
        </button>
      </div>
    </div>
  );
}


// =================================================================
// 2. Главная страница (Вывод активных записей)
// =================================================================

function HomeContent({ state, setState, profile }) {
  const handleCancel = (booking) => {
    const error = checkCancel(booking);
    if (error) return alert(error);
    if (!window.confirm(`Точно отменить запись на "${booking.title}"?`)) return;
    
    const newState = {
      ...state,
      list: state.list.filter(b => b.id !== booking.id),
      cancels: [...state.cancels, Date.now()]
    };
    setState(newState);
    sendToSheet("cancel", booking, profile);
  };
  return (
    <>
      <div className="page-heading">
        <h1>Информация</h1>
      </div>

      <div className="information-card">
        <p>
          Адрес:
          <br />
          <a
            className="info-address"
            href={MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternal(e, MAP_URL)}
          >
            Рябиновая ул., 5, корп. 1,
            <br />
            этаж 1, офис 138
            <br />
            Одинцово
          </a>
        </p>

        <p className="phone">
          Телефон:{" "}
          <a href="tel:+79936181618" onClick={callAdmin}>+7 (993) 618-16-18</a>
        </p>
      </div>

      {state.list.length === 0 ? (
        <div className="schedule-card"><p>Вашего расписания пока нет</p></div>
      ) : (
        <div className="booking-list">
          {state.list.map(b => (
            <div key={b.id} className="booking-card">
              <div className="booking-header">
                <img src={scheduleIcon} alt="" />
                {formatShortDate(b.date)} {b.time}
              </div>
              <p className="booking-title">{b.title}</p>
              <div className="booking-actions">
                <img className="booking-approved" src={approveIcon} alt="Подтверждено" />
                <button className="booking-cancel" onClick={() => handleCancel(b)}>Отменить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EventsSection />
    </>
  );
}

/* Детский сад: выбор формата и подробности */

const formats = [
  {
    id: "full",
    cardLines: ["Полный день", "8:00-19:00"],
    title: "Полный день 8:00-19:00",
    lead: "Детский сад полного дня · 2+",
    list: [
      "8:00–19:00",
      "4-разовое питание",
      "Небольшая группа",
      "Развивающие занятия в течение дня",
      "Дневной сон и прогулки",
      "ЖК Одинцово-1",
    ],
    price: "33 000 ₽/мес. + питание 400 ₽/день",
    cta: "Записаться на экскурсию",
  },
  {
    id: "short",
    cardLines: ["Группа кратковременного", "пребывания", "8:00-12:00"],
    title: "Группа кратковременного пребывания 8:00-12:00",
    lead: "Группа кратковременного пребывания · 2+",
    list: [
      "8:00–12:00",
      "Мягкая адаптация к саду",
      "Игры и занятия",
      "Питание по желанию",
      "Небольшая группа",
    ],
    price: "23 000 ₽/мес.",
    cta: "Записаться на экскурсию",
  },
  {
    id: "weekend",
    cardLines: ["Сад", "выходного дня"],
    title: "Сад выходного дня",
    lead: "Сад выходного дня · 2+",
    list: [
      "Суббота",
      "10:00 - 14:00",
      "Игры, занятия и присмотр",
      "На территории «Матрёшки»",
    ],
    note: "Посещение по предварительной записи",
    cta: "Записаться на экскурсию",
  },
  {
    id: "nanny",
    cardLines: ["Няня на час"],
    title: "Няня на час",
    list: [
      "Персональный присмотр за ребёнком на территории центра",
      "Подходит, когда родителям нужно освободить несколько часов",
    ],
    paragraph:
      "Укажите удобные дату и время – администратор подтвердит возможность записи",
    cta: "Забронировать время",
  },
];

function KindergartenContent({ startBooking }) {
  const [formatId, setFormatId] = useState(null);
  const format = formats.find((f) => f.id === formatId);

  // замените ссылку на вашего бота / администратора
  const openChat = () =>
    window.Telegram?.WebApp?.openTelegramLink("https://t.me/kiraen07");

  // Экран 1: выбор карточки
  if (!format) {
    return (
      <div className="kg-page">
        <div className="page-heading"><h1>Детский сад</h1></div>
        <p className="kg-subtitle">Выберите удобный формат:</p>
        <div className="kg-grid">
          {formats.map((f) => (
            <button key={f.id} className="kg-card" onClick={() => setFormatId(f.id)}>
              {f.cardLines.map((line) => <span key={line}>{line}</span>)}
              {f.id === "short" && <img className="kg-card-flower" src={flowerRight} alt="" />}
              {f.id === "weekend" && <img className="kg-card-cherry" src={cherry} alt="" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="kg-page kg-detail">
      <button className="kg-back" onClick={() => setFormatId(null)}>
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
      </button>
      <div className="page-heading"><h1>Выбор формата</h1></div>
      <h2 className="kg-format-title">{format.title}</h2>
      {format.lead && <p className="kg-lead">{format.lead}</p>}
      <ul className="kg-list">{format.list.map((item) => <li key={item}>{item}</li>)}</ul>
      {format.paragraph && <p className="kg-paragraph">{format.paragraph}</p>}
      {format.note && <p className="kg-note">{format.note}</p>}
      {format.price && <p className="kg-price">{format.price}</p>}
      <div className="kg-actions">
        {/* Кнопка теперь открывает модалку бронирования вместо чата */}
        <button className="kg-btn kg-btn-primary" onClick={() => {
           const kind = format.id === "nanny" ? "nanny" : "tour";
           const title = format.id === "nanny" ? "Няня на час" : `Экскурсия: ${format.title}`;
           startBooking(kind, format.id, title);
        }}>
          {format.cta}
        </button>
        <button className="kg-btn kg-btn-secondary" onClick={openChat}>Задать вопрос</button>
      </div>
    </div>
  );
}


/* Занятия */

const ageGroups = [
  { id: "1-2", label: "1-2 года", items: [] },
  { id: "2-4", label: "2–4 года", items: [] },
  {
    id: "4-5",
    label: "4–5 лет",
    items: [
      {
        id: "chess",
        name: "Шахматы",
        age: "4+",
        teacher: "ФИО педагога",
        price: "750 ₽ / занятие",
        details: [
          "4+",
          "Для начинающих и продолжающих",
          "Педагог с 10-летним опытом",
          "Логика, внимание и стратегическое мышление",
        ],
      },
      // Для остальных занятий впишите age, teacher, price и details.
      // Пока поля пустые, на карточке стоят заглушки.
      { id: "dance", name: "Хореография", age: "", teacher: "", price: "", details: [] },
      { id: "music", name: "Музыка", age: "", teacher: "", price: "", details: [] },
      { id: "sand", name: "Песочная анимация", age: "", teacher: "", price: "", details: [] },
      { id: "science", name: "Научная лаборатория", age: "", teacher: "", price: "", details: [] },
    ],
  },
  { id: "5-6", label: "5–6 лет", items: [] },
  { id: "6+", label: "6+", items: [] },
];

// =================================================================
// 3. Обновленные Занятия (Лента календаря и логика записи)
// =================================================================

function ClassesContent({ state, startBooking }) {
  const [ageId, setAgeId] = useState("4-5");
  const [openItem, setOpenItem] = useState(null);
  const [selectedDate, setSelectedDate] = useState(toKey(new Date()));
  
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { key: toKey(d), dayObj: d };
  });

  const age = ageGroups.find((a) => a.id === ageId);
  const DOW = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const openChat = () => window.Telegram?.WebApp?.openTelegramLink("https://t.me/kiraen07");

  return (
    <div className="cl-page">
      <div className="page-heading"><h1>Занятия для детей</h1></div>
      <p className="cl-subtitle">Выберите удобный формат:</p>

      <div className="cl-tabs">
        {ageGroups.map((a) => (
          <button key={a.id} className={a.id === ageId ? "cl-tab active" : "cl-tab"} onClick={() => setAgeId(a.id)}>
            {a.label}
          </button>
        ))}
      </div>

      <div className="calendar-strip">
        {dates.map(({ key, dayObj }) => (
          <button key={key} className={`calendar-day ${selectedDate === key ? 'active' : ''}`} onClick={() => setSelectedDate(key)}>
            <span className="calendar-dow">{DOW[dayObj.getDay()]}</span>
            <span className="calendar-date">{dayObj.getDate()}</span>
          </button>
        ))}
      </div>

      {age.items.length === 0 ? (
        <p className="cl-empty">Занятия для этого возраста скоро появятся.</p>
      ) : (
        <ul className="cl-list">
          {age.items.map((item) => {
            const isBooked = state.list.some(b => b.kind === "class" && b.refId === item.id && b.date === selectedDate);
            return (
              <li key={item.id} className="cl-card">
                {isBooked && <img className="cl-booked-icon" src={approveIcon} alt="Записан" />}
                <button className="cl-card-name" onClick={() => setOpenItem(item)}>
                  {item.name} <span>{item.age || "..+"}</span>
                </button>
                <p className="cl-teacher">({item.teacher || "ФИО педагога"})</p>
                <div className="cl-card-bottom">
                  <span className="cl-card-price">{item.price || "... ₽"}</span>
                  {isBooked ? (
                     <button className="cl-action cancel" onClick={() => alert("Для отмены перейдите в раздел Главная -> Расписание")}>Уже записаны</button>
                  ) : (
                     <button className="cl-action" onClick={() => startBooking("class", item.id, `Занятие: ${item.name}`, selectedDate)}>
                       Записаться
                     </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {openItem && (
        <div className="cl-overlay" onClick={() => setOpenItem(null)}>
          <div className="cl-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cl-close" onClick={() => setOpenItem(null)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
            <h3>{openItem.name}</h3>
            {openItem.details.length > 0 ? (
              <ul className="cl-details">{openItem.details.map((d) => <li key={d}>{d}</li>)}</ul>
            ) : <p className="cl-details-empty">Подробности уточняйте у администратора.</p>}
            <button className="kg-btn kg-btn-secondary" onClick={openChat}>Задать вопрос</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Специалисты */

const specialists = [
  {
    id: "speech",
    button: "Логопед",
    title: "Логопед",
    intro: "Помогаем, если ребёнок:",
    bullets: [
      "плохо говорит или говорит мало;",
      "не произносит отдельные звуки;",
      "испытывает сложности с речью.",
    ],
    outro: "Можно начать с консультации специалиста.",
    actions: [
      { label: "Записаться", kind: "primary" },
      { label: "Задать вопрос", kind: "secondary" },
    ],
  },
  {
    id: "neuro",
    button: "Нейропсихолог",
    title: "Нейропсихолог",
    intro: "Помогаем, если ребёнок:",
    bullets: ["впишите сюда пункт"], // заполните текстом
    outro: "",
    actions: [
      { label: "Записаться", kind: "primary" },
      { label: "Задать вопрос", kind: "secondary" },
    ],
  },
  {
    id: "unknown",
    button: "Не знаю, помогите выбрать",
    title: "Не знаю, кого выбрать",
    intro: "Напишите в двух словах, что вас беспокоит.",
    bullets: [],
    outro:
      "Администратор подскажет, к какому специалисту лучше обратиться.",
    actions: [{ label: "Написать администратору", kind: "primary" }],
  },
];

function SpecialistsContent({ startBooking }) {
  const [openId, setOpenId] = useState(null);
  const spec = specialists.find((s) => s.id === openId);
  const openChat = () => window.Telegram?.WebApp?.openTelegramLink("https://t.me/kiraen07");

  return (
    <div className="lg-page">
      <div className="page-heading"><h1>Логопед/нейропсихолог</h1></div>
      <p className="lg-subtitle">Выберите удобный формат:</p>
      <div className="lg-choices">
        {specialists.map((s) => (
          <button key={s.id} className="lg-choice" onClick={() => setOpenId(s.id)}>{s.button}</button>
        ))}
      </div>

      {spec && (
        <div className="cl-overlay" onClick={() => setOpenId(null)}>
          <div className="cl-modal lg-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cl-close" onClick={() => setOpenId(null)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
            <h3>{spec.title}</h3>
            <p className="lg-text">{spec.intro}</p>
            {spec.bullets.length > 0 && <ul className="lg-bullets">{spec.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
            {spec.outro && <p className="lg-text">{spec.outro}</p>}
            
            <div className="lg-modal-actions">
              {spec.actions.map((a) => (
                <button
                  key={a.label}
                  className={a.kind === "primary" ? "kg-btn kg-btn-primary" : "kg-btn kg-btn-secondary"}
                  onClick={() => {
                    if (a.kind === "primary" && spec.id !== "unknown") {
                       // Кнопка записывает через универсальный компонент
                       startBooking("specialist", spec.id, `Прием: ${spec.title}`);
                    } else {
                       openChat();
                    }
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Главный экран с навигацией по разделам */

function MainScreen({ state, setState, profile, setProfile }) {
  const [activeSection, setActiveSection] = useState("home");
  
  // Состояния для универсального бронирования
  const [bookingParams, setBookingParams] = useState(null); 
  const [showAuth, setShowAuth] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null); 

  // Вызывается из любого раздела, открывает модалку с датой/временем
  const startBooking = (kind, refId, title, initialDate = null) => {
    setBookingParams({ kind, refId, title, initialDate });
  };

  // Вызывается, когда пользователь выбрал дату и время
  const handleTimeSelected = (slot) => {
    setBookingParams(null);
    if (!profile) {
      setPendingSlot(slot);
      setShowAuth(true); // Запрашиваем номер, если его еще нет
    } else {
      finalizeBooking(slot, profile);
    }
  };

  const handleAuthSave = (newProfile) => {
    setProfile(newProfile);
    setShowAuth(false);
    if (pendingSlot) {
      finalizeBooking(pendingSlot, newProfile);
      setPendingSlot(null);
    }
  };

  const finalizeBooking = (slot, userProfile) => {
    const error = checkBooking(state, slot);
    if (error) return alert(error);

    slot.id = makeBookingId(slot);

    sendToSheet("book", slot, userProfile);

    setState(prev => ({ ...prev, list: [...prev.list, slot] }));
    alert("Вы успешно записаны! Запись добавлена в ваше расписание на главном экране.");
    setActiveSection("home"); // Перебрасываем на главную, чтобы показать расписание
  };

  return (
    <section className="main-screen">
      {/* Универсальные модалки (поверх всех экранов) */}
      {bookingParams && <BookingModal params={bookingParams} onClose={() => setBookingParams(null)} onConfirm={handleTimeSelected} />}
      {showAuth && <AuthModal onSave={handleAuthSave} onCancel={() => setShowAuth(false)} />}

      <main className={activeSection === "home" ? "content-area" : "content-area static"} key={activeSection}>
        {activeSection === "home" && <HomeContent state={state} setState={setState} profile={profile} />}
        {activeSection === "kindergarten" && <KindergartenContent startBooking={startBooking} />}
        {activeSection === "classes" && <ClassesContent state={state} startBooking={startBooking} />}
        {activeSection === "doctors" && <SpecialistsContent startBooking={startBooking} />}
      </main>
      
      <nav className="bottom-navigation">
        {sections.map((section) => (
          <button
            key={section.id}
            className={activeSection === section.id ? "nav-item active" : "nav-item"}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="nav-icon" style={{ "--icon": `url("${section.icon}")` }} />
          </button>
        ))}
      </nav>
    </section>
  );
}


export default function App() {
  const [screen, setScreen] = useState("splash");
  
  // Добавляем хранилище записей и профиля
  const [state, setState] = useState({ list: [], cancels: [] });
  const [profile, setProfile] = useState(null);

  // Загружаем данные при старте и запускаем таймеры
  useEffect(() => {
    loadState().then(s => setState(pruneState(s)));
    loadProfile().then(p => setProfile(p));

    const welcomeTimer = setTimeout(() => {
      setScreen("welcome");
    }, 2200);

    const homeTimer = setTimeout(() => {
      setScreen("home");
    }, 5200);

    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(homeTimer);
    };
  }, []);

  // Автоматически сохраняем данные при любом их изменении
  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => { if (profile) saveProfile(profile); }, [profile]);

  return (
    <div className="app-wrapper">
      <div className="screen-container">
        {screen === "splash" && <SplashScreen />}
        {screen === "welcome" && <WelcomeScreen />}
        {screen === "home" && (
          <MainScreen 
            state={state} 
            setState={setState} 
            profile={profile} 
            setProfile={setProfile} 
          />
        )}
      </div>
    </div>
  );
}
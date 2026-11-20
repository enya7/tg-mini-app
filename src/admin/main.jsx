import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Classes from './Classes.jsx'
import Mailings from './Mailings.jsx'
import './admin.css'

const groups = [
  { items: [['home', '⌂', 'Главная'], ['content', '▤', 'Контент сайта', 'Главная страница, страницы, новости, статьи, услуги и цены']] },
  { label: 'Программы', items: [
    ['classes', '◇', 'Занятия'],
    ['tours', '↗', 'Экскурсии', 'Программы, даты и время'],
    ['events', '☆', 'Мероприятия', 'Афиша, события и участники'],
    ['schedule', '▦', 'Расписание'],
    ['bookings', '☷', 'Бронирования'],
    ['waitlist', '◷', 'Лист ожидания', 'Ожидающие посетители и освободившиеся места'],
  ] },
  { label: 'Управление', items: [
    ['analytics', '▥', 'Аналитика', 'Популярность занятий, клики и конверсия'],
    ['users', '♙', 'Пользователи', 'Сотрудники и права доступа'],
    ['mailings', '✉', 'Рассылки'],
    ['settings', '⚙', 'Настройки', 'Уведомления'],
  ] },
]
const sections = groups.flatMap(({ items }) => items)
const demoBookings = [
  { id: 104, name: 'Анна К.', program: 'Лепка из глины', status: 'Новая' },
  { id: 103, name: 'Мария С.', program: 'Семейная экскурсия', status: 'Новая' },
  { id: 102, name: 'Елена В.', program: 'Роспись матрёшек', status: 'Подтверждена' },
]
const dateLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const today = new Date()
const demoEvents = [
  { id: 1, name: 'Лепка из глины', type: 'Занятие', time: '11:00', places: 4 },
  { id: 2, name: 'Семейная экскурсия', type: 'Экскурсия', time: '14:30', places: 2 },
  { id: 3, name: 'Роспись матрёшек', type: 'Занятие', time: '12:00', places: 6 },
].map((event, i) => ({ ...event, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + i) }))

function readSection(route) {
  const id = route.slice(1).split('?')[0]
  return sections.find(([key]) => key === id) ?? sections[0]
}

function Calendar() {
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today.toDateString())
  const year = month.getFullYear()
  const index = month.getMonth()
  const leading = (month.getDay() + 6) % 7
  const days = new Date(year, index + 1, 0).getDate()
  const visibleEvents = demoEvents.filter(({ date }) => date.toDateString() === selected)

  return <section className="panel calendar">
    <div className="panel-head">
      <h2>Календарь</h2>
      <div className="month-controls">
        <button aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(year, index - 1, 1))}>‹</button>
        <span>{monthLabel.format(month)}</span>
        <button aria-label="Следующий месяц" onClick={() => setMonth(new Date(year, index + 1, 1))}>›</button>
      </div>
    </div>
    <div className="calendar-grid">
      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <span key={day}>{day}</span>)}
      {Array.from({ length: leading }, (_, i) => <span key={'blank' + i} />)}
      {Array.from({ length: days }, (_, i) => {
        const date = new Date(year, index, i + 1)
        const key = date.toDateString()
        const hasEvents = demoEvents.some(event => event.date.toDateString() === key)
        return <button key={key} aria-label={dateLabel.format(date) + (hasEvents ? ', есть события' : '')}
          aria-pressed={key === selected} className={hasEvents ? 'has-events' : ''}
          onClick={() => setSelected(key)}>{i + 1}</button>
      })}
    </div>
    <div className="calendar-summary" aria-live="polite">
      <strong>{dateLabel.format(new Date(selected))}</strong>
      {visibleEvents.length
        ? visibleEvents.map(event => <div key={event.id}>{event.time} · {event.name} · Свободно {event.places}</div>)
        : <div>На эту дату событий нет</div>}
    </div>
  </section>
}

function Bookings({ preview = false, onlyNew = false }) {
  const [filter, setFilter] = useState(onlyNew ? 'Новая' : '')
  const rows = demoBookings.filter(booking => !(preview || filter) || booking.status === (preview ? 'Новая' : filter))
  return <section className="panel">
    <div className="panel-head">
      <h2>{preview ? 'Новые заявки' : 'Все заявки'}</h2>
      {preview ? <a href="#bookings?new">Открыть заявки →</a> :
        <select aria-label="Статус заявки" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="">Все статусы</option>
          <option>Новая</option>
          <option>Подтверждена</option>
        </select>}
    </div>
    {rows.map(booking => <div className="list-row" key={booking.id}>
      <span className="tile" aria-hidden="true">{booking.name[0]}</span>
      <div className="row-copy"><strong>{booking.program}</strong><small>№{booking.id} · {booking.name}</small></div>
      <span className={'status ' + (booking.status === 'Новая' ? 'new' : '')}>{booking.status}</span>
    </div>)}
  </section>
}

function Dashboard() {
  return <>
    <div className="metrics">
      <a href="#bookings?new"><small>Новые заявки</small><strong>{demoBookings.filter(booking => booking.status === 'Новая').length}</strong><span>К списку заявок →</span></a>
      <a href="#schedule"><small>Ближайшие события</small><strong>{demoEvents.length}</strong><span>К расписанию →</span></a>
      <a href="#schedule"><small>Свободные места</small><strong>{demoEvents.reduce((total, event) => total + event.places, 0)}</strong><span>На ближайших событиях</span></a>
    </div>
    <div className="dashboard-grid">
      <Calendar />
      <div className="stack">
        <Bookings preview />
        <section className="panel">
          <div className="panel-head"><h2>Ближайшие события</h2></div>
          {demoEvents.map(event => <div className="list-row" key={event.id}>
            <span className="tile event-date" aria-hidden="true">{event.date.getDate()}</span>
            <div className="row-copy"><strong>{event.name}</strong><small>{dateLabel.format(event.date)} · {event.time} · {event.type}</small></div>
            <span className="places">Свободно {event.places}</span>
          </div>)}
        </section>
      </div>
    </div>
  </>
}

function Admin() {
  const [route, setRoute] = useState(window.location.hash)
  const [open, setOpen] = useState(false)
  const [id, , title, description] = readSection(route)

  useEffect(() => {
    const updateRoute = () => {
      setRoute(window.location.hash)
      setOpen(false)
    }
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  return <div className="shell">
    <aside className="sidebar" aria-label="Боковая панель">
      <a className="brand" href="#home"><span aria-hidden="true">✿</span><div>Матрешка<small>Админ-панель</small></div></a>
      <button className="menu-toggle" aria-controls="admin-nav" aria-expanded={open} onClick={() => setOpen(!open)}>Меню {open ? '−' : '+'}</button>
      <nav id="admin-nav" className={open ? 'open' : ''} aria-label="Разделы админ-панели">
        {groups.map(({ label, items }) => <div className="nav-group" key={label ?? 'main'}>
          {label && <p>{label}</p>}
          {items.map(([key, icon, name]) => <a key={key} href={'#' + key}
            aria-current={key === id ? 'page' : undefined} onClick={() => setOpen(false)}>
            <span aria-hidden="true">{icon}</span>{name}
          </a>)}
        </div>)}
      </nav>
    </aside>
    <main>
      <header className="topbar">
        <div><h1>{title}</h1>{id === 'home' && <p>Заявки, расписание и свободные места</p>}</div>
        <span className="demo">Демоданные</span>
      </header>
      {id === 'home' && <Dashboard />}
      {id === 'schedule' && <Calendar />}
      {id === 'bookings' && <Bookings key={route} onlyNew={route === '#bookings?new'} />}
      {id === 'classes' && <Classes />}
      {id === 'mailings' && <Mailings />}
      {description && <section className="panel placeholder"><h2>Раздел в разработке</h2><p>{description}</p></section>}
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<StrictMode><Admin /></StrictMode>)

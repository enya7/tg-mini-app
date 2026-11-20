import { useState } from 'react'

const storageKey = 'matreshka.admin.demo-classes'
const ages = ['3–5 лет', '6–8 лет', '9–12 лет', 'Для всей семьи']
const demoClasses = [
  { id: 'clay', name: 'Лепка из глины', age: ages[1], teacher: 'Анна Соколова', duration: '60', description: 'Лепим небольшую фигурку из глины.' },
  { id: 'painting', name: 'Роспись матрёшек', age: ages[3], teacher: 'Мария Орлова', duration: '45', description: 'Знакомимся с орнаментами и расписываем деревянную заготовку.' },
  { id: 'drawing', name: 'Рисуем сказку', age: ages[0], teacher: 'Анна Соколова', duration: '40', description: 'Придумываем героя и рисуем иллюстрацию к его истории.' },
]
const blank = { name: '', age: '', teacher: '', duration: '', description: '' }

function loadClasses() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    return Array.isArray(saved) ? saved : demoClasses
  } catch {
    return demoClasses
  }
}

export default function Classes() {
  const [classes, setClasses] = useState(loadClasses)
  const [age, setAge] = useState('')
  const [teacher, setTeacher] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(null)
  const [notice, setNotice] = useState('')
  const teachers = [...new Set(classes.map(item => item.teacher))].sort((a, b) => a.localeCompare(b, 'ru'))
  const visible = classes.filter(item =>
    (!age || item.age === age) &&
    (!teacher || item.teacher === teacher) &&
    item.name.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))
  )

  function save(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const name = data.name.trim()
    const teacherName = data.teacher.trim()
    if (!name || !teacherName) {
      setNotice('Заполни название и имя преподавателя.')
      return
    }
    const entry = { ...data, name, teacher: teacherName, description: data.description.trim(), id: draft.id ?? crypto.randomUUID() }
    const updated = draft.id
      ? classes.map(item => item.id === draft.id ? entry : item)
      : [...classes, entry]

    setClasses(updated)
    setAge('')
    setTeacher('')
    setQuery('')
    setDraft(null)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
      setNotice('Занятие сохранено.')
    } catch {
      setNotice('Занятие добавлено в текущий список. Браузер не сохранил изменения.')
    }
  }

  return <div className="classes">
    <div className="panel-head classes-heading">
      <div><h2>Каталог занятий</h2><p>Демоданные · {classes.length} в каталоге</p></div>
      {!draft && <button type="button" className="classes-primary" onClick={() => {
        setDraft(blank)
        setNotice('')
      }}>Добавить занятие</button>}
    </div>
    {notice && <p role="status" className="classes-notice">{notice}</p>}
    {draft && <form key={draft.id ?? 'new'} className="panel classes-form" onSubmit={save}>
      <h2>{draft.id ? 'Редактирование занятия' : 'Новое занятие'}</h2>
      <div className="classes-fields">
        <label>Название<input name="name" defaultValue={draft.name} required maxLength={100} autoFocus /></label>
        <label>Возрастная группа<select name="age" defaultValue={draft.age} required>
          <option value="" disabled>Выбрать группу</option>
          {ages.map(group => <option key={group}>{group}</option>)}
        </select></label>
        <label>Преподаватель<input name="teacher" defaultValue={draft.teacher} list="class-teachers" required maxLength={100} /></label>
        <datalist id="class-teachers">{teachers.map(name => <option key={name} value={name} />)}</datalist>
        <label>Длительность, мин<input name="duration" type="number" min="1" step="1" defaultValue={draft.duration} required /></label>
      </div>
      <label>Описание<textarea name="description" rows={3} maxLength={1000} defaultValue={draft.description} /></label>
      <div className="classes-actions">
        <button type="submit" className="classes-primary">Сохранить занятие</button>
        <button type="button" className="classes-secondary" onClick={() => {
          setDraft(null)
          setNotice('')
        }}>Отмена</button>
      </div>
    </form>}
    <div className="panel classes-filters">
      <label>Поиск по названию<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Например, лепка" /></label>
      <label>Возрастная группа<select value={age} onChange={event => setAge(event.target.value)}>
        <option value="">Все группы</option>
        {ages.map(group => <option key={group}>{group}</option>)}
      </select></label>
      <label>Преподаватель<select value={teacher} onChange={event => setTeacher(event.target.value)}>
        <option value="">Все преподаватели</option>
        {teachers.map(name => <option key={name}>{name}</option>)}
      </select></label>
    </div>
    {visible.length === 0 && <p className="panel">По этим фильтрам занятий нет.</p>}
    <div className="classes-grid">
      {visible.map(item => <article className="panel class-card" key={item.id}>
        <div className="class-card-meta"><span>{item.age}</span><span>{item.duration} мин</span></div>
        <h2>{item.name}</h2>
        <p>Преподаватель · {item.teacher}</p>
        {item.description && <p className="class-description">{item.description}</p>}
        <button type="button" className="classes-secondary" aria-label={'Редактировать ' + item.name}
          disabled={Boolean(draft)} onClick={() => {
            setDraft(item)
            setNotice('')
          }}>Редактировать</button>
      </article>)}
    </div>
  </div>
}

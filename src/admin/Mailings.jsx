import { useState } from 'react'

const recipientCount = 128
const maxLength = 4096
const maxImageSize = 1024 * 1024
const historyKey = 'matreshka.admin.demo-mailings'
const dateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export default function Mailings() {
  const [draft, setDraft] = useState('')
  const [image, setImage] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [history, setHistory] = useState(loadHistory)
  const [notice, setNotice] = useState('')
  const message = draft.trim()

  function loadImage(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    setImageError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > maxImageSize) {
      setImageError('Выбери JPG, PNG или WebP размером до 1 МБ.')
      return
    }
    const reader = new FileReader()
    setImageLoading(true)
    reader.onload = () => setImage({ name: file.name, url: reader.result })
    reader.onerror = () => setImageError('Не удалось открыть картинку. Попробуй выбрать её ещё раз.')
    reader.onloadend = () => setImageLoading(false)
    reader.readAsDataURL(file)
  }

  function confirmMailing() {
    const entry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      message: confirmation.message,
      image: confirmation.image,
      recipients: recipientCount,
    }
    const updatedHistory = [entry, ...history]
    setHistory(updatedHistory)
    setConfirmation(null)
    setDraft('')
    setImage(null)
    setImageError('')
    try {
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory))
      setNotice('Демо-рассылка добавлена в историю.')
    } catch {
      setNotice('Демо-рассылка добавлена в историю до закрытия раздела.')
    }
  }

  return <div className="mailings">
    <p className="mailings-note">Демо-режим. Сообщения в Telegram не отправляются.</p>
    <div className="mailings-grid">
      <form className="panel mailing-form" onSubmit={event => {
        event.preventDefault()
        if ((message || image) && !imageLoading && !confirmation) setConfirmation({ message, image })
      }}>
        <h2>Новая рассылка</h2>
        <div className="mailing-audience">
          <strong>Все, кто запустил бота</strong>
          <span>{recipientCount} демополучателей</span>
        </div>
        <label htmlFor="mailing-message">Текст сообщения</label>
        <textarea id="mailing-message" value={draft} maxLength={maxLength} rows={6}
          readOnly={Boolean(confirmation)} aria-describedby="mailing-length"
          placeholder="Например, на субботнюю экскурсию открылась запись!"
          onChange={event => {
            setDraft(event.target.value)
            setNotice('')
          }} />
        <small id="mailing-length">{draft.length} / {maxLength}</small>
        {!confirmation && <div className="mailing-attachment">
          <label htmlFor="mailing-image">Картинка</label>
          <input id="mailing-image" type="file" accept="image/jpeg,image/png,image/webp"
            disabled={imageLoading} aria-describedby="mailing-image-hint" onChange={loadImage} />
          <small id="mailing-image-hint">JPG, PNG или WebP, до 1 МБ</small>
          {image && <div className="mailing-actions">
            <span>{image.name}</span>
            <button type="button" className="mailing-secondary" disabled={imageLoading}
              onClick={() => { setImage(null)
                setImageError('') }}>Удалить картинку</button>
          </div>}
          {imageError && <p role="alert">{imageError}</p>}
        </div>}
        {!confirmation && <button className="mailing-primary" disabled={imageLoading || (!message && !image)}>Отправить демо-рассылку</button>}
        {confirmation && <div className="mailing-confirm">
          <strong>Подтвердить демо-рассылку для {recipientCount} получателей?</strong>
          <div className="mailing-actions">
            <button type="button" className="mailing-secondary" onClick={() => setConfirmation(null)}>Вернуться к редактированию</button>
            <button type="button" className="mailing-primary" onClick={confirmMailing}>Подтвердить</button>
          </div>
        </div>}
        <div role="status">{notice}</div>
      </form>
      <section className="panel mailing-preview">
        <h2>Предпросмотр</h2>
        <div className="mailing-bubble">
          {image && <img className="mailing-image" src={image.url} alt={image.name} />}
          {message || (!image && 'Здесь появится сообщение.')}
        </div>
      </section>
    </div>
    <section className="panel mailing-history">
      <h2>История рассылок</h2>
      {history.length === 0 && <p>Рассылок пока нет.</p>}
      {history.map(entry => <article key={entry.id}>
        <div className="panel-head">
          <strong>Демо-рассылка</strong>
          <time dateTime={entry.createdAt}>{dateTime.format(new Date(entry.createdAt))}</time>
        </div>
        {entry.image && <img className="mailing-image" src={entry.image.url} alt={entry.image.name} />}
        {entry.message && <p className="mailing-text">{entry.message}</p>}
        <small>Администратор (демо) · {entry.recipients} получателей · отправлено 0</small>
      </article>)}
    </section>
  </div>
}

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем приложение на весь экран

// Функция переключения вкладок нижнего меню
function switchTab(tabId, event) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    document.querySelector('.content').scrollTop = 0;
}

// Пример функции, которая будет отправлять данные на ваш бэкенд/в базу
function sendDataToBot(formatName) {
    // Пока просто выводим уведомление для проверки
    alert(`Вы выбрали: ${formatName}. В будущем эти данные полетят в базу детского сада.`);
    
    // Когда бэкенд будет готов, можно отправлять данные обратно в бота:
    // tg.sendData(JSON.stringify({ action: 'select_format', format: formatName }));
}
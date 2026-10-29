import flowerLeft from "./assets/flower_left.svg";
import flowerRight from "./assets/flower_right.svg";
import logo from "./assets/matreshka_doll.svg";

import React, { useEffect, useState } from "react";
import "./App.css";

const sections = [
  { id: "home", icon: "⌂", label: "Главная" },
  { id: "schedule", icon: "♧", label: "Расписание" },
  { id: "books", icon: "▤", label: "Материалы" },
  { id: "activities", icon: "♧", label: "Занятия" },
];

function TelegramHeader() {
  return (
    <header className="telegram-header">
      <button
        className="close-button"
        onClick={() => window.Telegram?.WebApp?.close()}
      >
        Закрыть
      </button>

      <div className="telegram-title">
        Матрешка Садик Бот
        <span>мини-приложение</span>
      </div>

      <button className="more-button" aria-label="Дополнительное меню">
        •••
      </button>
    </header>
  );
}

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
      <TelegramHeader />

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
      <TelegramHeader />

      <span className="decoration cherry">🍒</span>
      <span className="decoration branch branch-top">❧</span>

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

      <span className="decoration teddy">🧸</span>
      <span className="decoration branch branch-bottom">❧</span>
    </section>
  );
}

function HomeContent() {
  return (
    <>
      <div className="page-heading">
        <h1>Информация</h1>
      </div>

      <div className="information-card">
        <p>
          Адрес:
          <br />
          Рябиновая ул., 5, корп. 1,
          <br />
          этаж 1, офис 138
          <br />
          Одинцово
        </p>

        <p className="phone">
          Телефон:{" "}
          <a href="tel:+79936181618">+7 (993) 618-16-18</a>
        </p>
      </div>

      <div className="schedule-heading">
        <h2>Расписание</h2>
        <span className="leaf-decoration">♧</span>
      </div>

      <div className="schedule-card">
        <p>Вашего расписания пока нет</p>
      </div>
    </>
  );
}

function PlaceholderContent({ section }) {
  const titles = {
    schedule: "Расписание",
    books: "Материалы",
    activities: "Занятия",
  };

  return (
    <div className="placeholder-content">
      <h1>{titles[section] || "Раздел"}</h1>
      <p>Здесь скоро появится информация.</p>
    </div>
  );
}

function MainScreen() {
  const [activeSection, setActiveSection] = useState("home");

  return (
    <section className="main-screen">
      <TelegramHeader />

      <main className="content-area" key={activeSection}>
        {activeSection === "home" ? (
          <HomeContent />
        ) : (
          <PlaceholderContent section={activeSection} />
        )}
      </main>

      <nav className="bottom-navigation">
        {sections.map((section) => (
          <button
            key={section.id}
            className={
              activeSection === section.id
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActiveSection(section.id)}
            aria-label={section.label}
            aria-current={
              activeSection === section.id ? "page" : undefined
            }
          >
            <span className="nav-icon">{section.icon}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState("splash");

  useEffect(() => {
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

  return (
    <div className="app-wrapper">
      <div className="screen-container">
        {screen === "splash" && <SplashScreen />}
        {screen === "welcome" && <WelcomeScreen />}
        {screen === "home" && <MainScreen />}
      </div>
    </div>
  );
}

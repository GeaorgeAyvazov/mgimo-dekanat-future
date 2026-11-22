"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { findEmployees, findPublicContacts, type Employee } from "@/lib/employees";
import { publicContacts } from "@/lib/public-contacts";
import { topics } from "@/lib/catalog";

export function EmployeeDirectory({
  selected,
  go,
  canAsk,
  embedded = false,
}: {
  selected: string;
  go: (view: string, id?: string) => void;
  canAsk: boolean;
  embedded?: boolean;
}) {
  const [people, setPeople] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [showPeople, setShowPeople] = useState(false);
  const [department, setDepartment] = useState("all");
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/portal/employees", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          employees: Employee[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || "Не удалось загрузить сотрудников");
        setPeople(result.employees);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(""), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setCopyError("");
    } catch {
      setCopyError(
        "Не удалось скопировать. Выделите контакт и скопируйте его вручную.",
      );
    }
  }
  const departments = [...new Set(people.map((person) => person.department))];
  const results = findEmployees(people, query, department);
  const person = people.find((item) => item.id === selected);
  const initials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
  const reset = () => {
    setQuery("");
    setDepartment("all");
  };
  function contact(kind: "email" | "phone", value: string) {
    const Icon = kind === "email" ? Mail : Phone;
    return (
      <div className="employee-contact">
        <Icon size={19} aria-hidden="true" />
        <div>
          <span>{kind === "email" ? "Рабочая почта" : "Рабочий телефон"}</span>
          <a
            href={
              kind === "email"
                ? `mailto:${value}`
                : `tel:${value.replace(/[^+\d]/g, "")}`
            }
          >
            {value}
          </a>
        </div>
        <button
          className="icon-btn"
          onClick={() => void copy(value)}
          aria-label={`Скопировать ${kind === "email" ? "почту" : "телефон"}`}
          title="Скопировать"
        >
          {copied === value ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
    );
  }
  return (
    <>
      {selected && (
        <button className="back-button" onClick={() => go("employees")}>
          <ArrowLeft size={16} /> Все сотрудники
        </button>
      )}
      {!embedded && (
        <div className="page-heading employee-heading">
          <div>
            <h1>{person ? person.name : "Сотрудники"}</h1>
            <p>
              {person
                ? person.position
                : "Найдите человека по имени, подразделению или своему вопросу."}
            </p>
          </div>
        </div>
      )}
      {!selected && <div className="segmented" aria-label="Справочник">
        <button className={!showPeople ? "active" : ""} onClick={() => { setShowPeople(false); reset(); }}>Подразделения МГИМО</button>
        <button className={showPeople ? "active" : ""} onClick={() => { setShowPeople(true); reset(); }}>Сотрудники прототипа</button>
      </div>}
      {!selected && !showPeople ? <section className="panel">
        <label className="directory-search"><Search size={18}/><input aria-label="Найти подразделение" placeholder="Факультет, оплата, договор…" value={query} onChange={e => setQuery(e.target.value)}/></label>
        {findPublicContacts(publicContacts, query).map(unit => <article className="public-unit" key={unit.name}>
          <h3>{unit.name}</h3><p>{unit.detail} {unit.room}</p>
          <div>{unit.phones.map(phone => <a key={phone} href={"tel:" + phone.split("доб")[0].replace(/[^+0-9]/g, "")}>{phone}</a>)}
          {unit.email && <a href={"mailto:" + unit.email}>{unit.email}</a>}
          <a href={unit.source} target="_blank" rel="noreferrer">Страница МГИМО ↗</a></div>
        </article>)}
        {!findPublicContacts(publicContacts, query).length && <p role="status">По этому запросу подразделений нет. Попробуйте название факультета или услуги.</p>}
      </section> : <><p className="directory-demo">
        <Building2 size={16} /> Демонстрационный справочник. Имена, контакты и
        часы приёма вымышлены.
      </p>
      {loading ? (
        <div className="directory-state" role="status">
          Загружаем справочник…
        </div>
      ) : error ? (
        <div className="directory-state">
          <p role="alert">{error}</p>
          <button
            className="button secondary"
            onClick={() => setRetry(retry + 1)}
          >
            Попробовать снова
          </button>
        </div>
      ) : selected ? (
        person ? (
          <div className="employee-detail">
            <section className="panel employee-detail-main">
              <div className="employee-identity">
                <span className="employee-avatar large">
                  {initials(person.name)}
                </span>
                <div>
                  <p>{person.department}</p>
                  <h2>С чем поможет</h2>
                </div>
              </div>
              <ul className="employee-responsibilities">
                {person.responsibilities.map((item) => (
                  <li key={item}>
                    <Check size={16} />
                    {item}
                  </li>
                ))}
              </ul>
              {canAsk && (
                <div className="employee-routing">
                  <h3>Решить вопрос в кабинете</h3>
                  <p>
                    Обращение получит{" "}
                    {topics
                      .find((topic) => topic.id === person.topic)
                      ?.department.toLocaleLowerCase("ru-RU")}
                    . Ответ и история сохранятся в «Моих обращениях».
                  </p>
                  <button
                    className="button primary"
                    onClick={() =>
                      go("order", `question?topic=${person.topic}`)
                    }
                  >
                    <MessageCircle size={18} /> Обратиться в подразделение
                  </button>
                </div>
              )}
            </section>
            <section className="panel employee-detail-contacts">
              <h2>Контакты и приём</h2>
              {contact("email", person.email)}
              {contact("phone", person.phone)}
              <div className="employee-contact">
                <MapPin size={19} />
                <div>
                  <span>Кабинет</span>
                  <strong>{person.room}</strong>
                </div>
              </div>
              <div className="employee-contact">
                <Clock3 size={19} />
                <div>
                  <span>Часы приёма · московское время</span>
                  <strong>{person.hours}</strong>
                </div>
              </div>
              <p className="employee-contact-note">
                Это учебные контакты. Для реального обращения используйте
                официальный сайт вуза.
              </p>
            </section>
          </div>
        ) : (
          <div className="directory-state">
            <UsersRound size={32} />
            <h2>Сотрудник не найден</h2>
            <p>Вернитесь в справочник и найдите нужное подразделение.</p>
            <button
              className="button secondary"
              onClick={() => go("employees")}
            >
              Все сотрудники
            </button>
          </div>
        )
      ) : (
        <>
          <section
            className="panel directory-filters"
            aria-label="Поиск сотрудников"
          >
            <div className="directory-search">
              <Search size={20} />
              <input
                id="employee-search"
                aria-label="Поиск сотрудников"
                placeholder="Имя, отдел или вопрос — например, пересдача"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  className="icon-btn"
                  aria-label="Очистить поиск сотрудников"
                  onClick={() => setQuery("")}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="directory-department">
              <label htmlFor="employee-department">Подразделение</label>
              <select
                id="employee-department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="all">Все подразделения</option>
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="directory-suggestions">
              <span>По вопросу:</span>
              {[
                { text: "Справки", query: "справк" },
                { text: "Пересдача", query: "пересдача" },
                { text: "Оплата", query: "оплат" },
                { text: "Обмен", query: "обмен" },
                { text: "Доступ в ЛК", query: "доступ" },
              ].map((item) => (
                <button
                  key={item.text}
                  onClick={() => {
                    setQuery(item.query);
                    setDepartment("all");
                  }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          </section>
          <div className="directory-results-heading">
            <p role="status" aria-live="polite">
              Найдено сотрудников: <strong>{results.length}</strong>
            </p>
            {(query || department !== "all") && (
              <button className="text-button" onClick={reset}>
                Сбросить фильтры
              </button>
            )}
          </div>
          {results.length ? (
            <div className="employee-grid">
              {results.map((item) => (
                <article className="employee-card" key={item.id}>
                  <button
                    className="employee-card-open"
                    onClick={() => go("employees", item.id)}
                  >
                    <span className="employee-avatar">
                      {initials(item.name)}
                    </span>
                    <span>
                      <h2>{item.name}</h2>
                      <p>{item.position}</p>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                  <p className="employee-department-name">
                    <Building2 size={15} />
                    {item.department}
                  </p>
                  <div className="employee-card-tasks">
                    <span>С чем поможет</span>
                    <ul>
                      {item.responsibilities.map((task) => (
                        <li key={task}>{task}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="employee-card-footer">
                    <a
                      href={`mailto:${item.email}`}
                      aria-label={`Написать: ${item.name}`}
                    >
                      <Mail size={17} />
                      Почта
                      <ArrowUpRight size={13} />
                    </a>
                    <button onClick={() => go("employees", item.id)}>
                      Контакты и приём <ChevronRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="directory-state">
              <Search size={32} />
              <h2>Никого не нашли</h2>
              <p>Попробуйте фамилию или более короткое название вопроса.</p>
              <button className="button secondary" onClick={reset}>
                Сбросить фильтры
              </button>
            </div>
          )}
        </>
      )}
      </>}
      <span className="sr-only" role="status">
        {copied ? "Контакт скопирован" : ""}
      </span>
      {copyError && (
        <p className="error" role="alert">
          {copyError}
        </p>
      )}
    </>
  );
}

export type PublicContact = {
  name: string;
  subject: string;
  detail: string;
  phones: string[];
  email?: string;
  room?: string;
  keywords: string;
  source: string;
};

export const contactsCheckedOn = "2026-11-22";
const university = "https://mgimo.ru/about/contacts/";
const tuition = "https://mgimo.ru/payedu/info/";

export const publicContacts: PublicContact[] = [
  {
    name: "Факультет международных отношений", subject: "Учёба",
    detail: "Вопросы по программам бакалавриата факультета МО.",
    phones: ["+7 495 225-40-83"], email: "mo@inno.mgimo.ru",
    keywords: "деканат мо бакалавриат", source: "https://mo.mgimo.ru/",
  },
  {
    name: "Факультет международных экономических отношений", subject: "Учёба",
    detail: "Контакты факультета МЭО в Москве.",
    phones: ["+7 495 439-70-30", "+7 495 439-70-32"],
    keywords: "деканат мэо экономика", source: university,
  },
  {
    name: "Международно-правовой факультет", subject: "Учёба",
    detail: "Контакт факультета для студентов МП.",
    phones: ["+7 495 234-84-74"], keywords: "деканат мп право юрист", source: university,
  },
  {
    name: "Сектор по учебно-договорной работе", subject: "Оплата",
    detail: "Вопросы по договору на платное обучение.",
    phones: ["+7 495 234-84-89"], keywords: "оплатить договор платное стоимость", source: tuition,
  },
  {
    name: "Бухгалтерия", subject: "Оплата",
    detail: "Вопросы по оплате обучения и платежам.",
    phones: ["+7 495 234-58-20"], keywords: "оплатить платеж квитанция счёт", source: tuition,
  },
  {
    name: "Международное управление", subject: "Обмен",
    detail: "Международные образовательные программы и вопросы иностранных студентов.",
    phones: ["+7 495 225-39-23"], email: "international@inno.mgimo.ru", room: "1037",
    keywords: "академическая мобильность стажировка обмен за рубежом",
    source: "https://mgimo.ru/about/structure/int/",
  },
  {
    name: "Дистанционные технологии в образовании", subject: "ИТ-поддержка",
    detail: "Помощь с доступом к корпоративной почте студента.",
    phones: ["+7 495 225-38-45"], email: "e-learning@my.mgimo.ru", room: "ГЦ-39",
    keywords: "пароль почта доступ поддержка аккаунт",
    source: "https://mgimo.ru/upload/2025/09/pamyatka-studentu.pdf#page=56",
  },
  {
    name: "Канцелярия", subject: "Документы",
    detail: "Отдел документационного обеспечения МГИМО.",
    phones: ["+7 495 439-70-80"], keywords: "корреспонденция письмо канцелярия", source: university,
  },
];

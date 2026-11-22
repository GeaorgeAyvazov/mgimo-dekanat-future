type Source = { label: string; href: string };
export const serviceCategories = [
  { id: "all", label: "Все услуги" },
  { id: "documents", label: "Справки и документы" },
  { id: "personal-data", label: "Персональные данные" },
  { id: "student-status", label: "Статус студента" },
  { id: "study", label: "Учёба" },
  { id: "finance", label: "Договор и оплата" },
  { id: "campus", label: "Жизнь в кампусе" },
  { id: "visit", label: "Приём" },
] as const;

type Category = Exclude<(typeof serviceCategories)[number]["id"], "all">;

type ServiceInfo = {
  id: string;
  title: string;
  description: string;
  category: Category;
  icon: "file" | "list" | "book" | "message" | "calendar";
  preparation: string;
  sources: readonly Source[];
};

const miem = {
  label: "Порядок подачи в ВШЭ",
  href: "https://miem.hse.ru/applications",
};
const itmoStatus = "https://student.itmo.ru/ru/education/status";
const mgimoSubmission = "Подача через ЛК МГИМО в Москве не подтверждена.";

export const applicationServices = [
  {
    id: "library-help",
    title: "Вопрос в библиотеку",
    description: "Найти издание, уточнить часы работы или получить помощь с электронными ресурсами",
    category: "campus",
    icon: "book",
    topic: "library",
    preparation: "Для поиска издания укажите автора и название. Если не открывается электронный ресурс, укажите его название и что происходит при входе.",
    campusStatus: "В прототипе обращение сохраняется в кабинете. Для реального вопроса воспользуйтесь контактами библиотеки.",
    sources: [{ label: "Контакты библиотеки МГИМО", href: "https://kp.rsl.ru/holders/moscow/moscow21" }],
  },
  {
    id: "exam-request",
    title: "Обращение по экзамену",
    description: "Подтвердить уважительный пропуск или запросить перенос экзамена или пересдачи",
    category: "study",
    icon: "calendar",
    topic: "academic",
    preparation:
      "Выберите экзамен и причину обращения. Для подтверждения пропуска прикрепите файл с вымышленными данными или готовый учебный образец.",
    campusStatus:
      "Ответ по демо-заявке — до 3 рабочих дней. Допустимый срок подачи и необходимость принести оригинал уточняются в учебном офисе вашей программы.",
    sources: [
      {
        label: "Положение об образовательной деятельности МГИМО",
        href: "https://mgimo.ru/upload/2025/06/polozhenie-o-poryadke-organizacii-i-osushchestvleniya-obrazovatelnoj-deyatelnosti-v-mgimo.pdf",
      },
    ],
  },
  {
    id: "profile-correction",
    title: "Исправить данные",
    description: "Уточнить данные профиля, сообщить об ошибке в студенческом или оформить изменение данных",
    category: "personal-data",
    icon: "list",
    topic: "documents",
    preparation:
      "Выберите, где нужна правка. Для официального изменения данных прикрепите файл с вымышленными данными или готовый учебный образец.",
    campusStatus:
      "Данные в профиле и справках меняются после проверки. В демо заявка сохраняется со статусом, данные профиля остаются прежними.",
    sources: [],
  },
  {
    id: "academic-leave",
    title: "Академический отпуск",
    description: "Оформить отпуск или вернуться к занятиям",
    category: "student-status",
    icon: "book",
    topic: "academic",
    preparation:
      "Укажите, нужен ли отпуск или выход из него, и желаемую дату. Комплект документов зависит от основания. Если нужны оригиналы, сотрудник может уточнить это в ответе.",
    campusStatus: mgimoSubmission,
    sources: [
      miem,
      {
        label: "Этапы и документы в ИТМО",
        href: `${itmoStatus}/academic_leave`,
      },
    ],
  },
  {
    id: "readmission",
    title: "Восстановление",
    description: "Уточнить условия возвращения к учёбе после отчисления",
    category: "student-status",
    icon: "book",
    topic: "academic",
    preparation:
      "Укажите прежнюю программу, когда прервали обучение и на какой семестр хотите вернуться. Подготовьте сведения о предыдущем обучении для сверки.",
    campusStatus: mgimoSubmission,
    sources: [
      miem,
      {
        label: "Этапы восстановления в ИТМО",
        href: `${itmoStatus}/readmissions`,
      },
    ],
  },
  {
    id: "program-transfer",
    title: "Перевод на другую программу",
    description: "Узнать, как сменить образовательную программу внутри вуза",
    category: "student-status",
    icon: "book",
    topic: "academic",
    preparation:
      "Укажите текущую и желаемую программу, курс и предполагаемый семестр. До перевода уточняются наличие мест и разница в учебных планах.",
    campusStatus:
      "По регламенту МГИМО заявление подают в принимающий факультет, институт или Управление магистерской подготовки. Уточните способ подачи у принимающего подразделения.",
    sources: [
      {
        label: "Регламент МГИМО",
        href: "https://mgimo.ru/upload/2022/08/reglament-o-perevode-obuchayushchihsya-vnutri-mgimo_22.pdf#page=3",
      },
      {
        label: "Онлайн-подача в ИТМО",
        href: `${itmoStatus}/transfers/another_program`,
      },
    ],
  },
  {
    id: "budget-transfer",
    title: "Перевод на бюджет",
    description: "Уточнить подачу заявки на свободное бюджетное место",
    category: "student-status",
    icon: "book",
    topic: "academic",
    preparation:
      "Укажите программу, курс и семестр. Перед подачей проверьте актуальные места, условия отбора и окно приёма заявлений.",
    campusStatus:
      "В объявлении МГИМО за 2024 год указан очный приём документов. Текущий способ подачи не подтверждён.",
    sources: [
      {
        label: "Архивное объявление МГИМО",
        href: "https://mgimo.ru/upload/2024/06/perevod-06-2024.pdf",
      },
      {
        label: "Онлайн-подача в ИТМО",
        href: `${itmoStatus}/transfers/tuition_free`,
      },
    ],
  },
  {
    id: "contract-request",
    title: "Договор об обучении",
    description:
      "Запросить копию, уточнить переоформление или платное обучение",
    category: "finance",
    icon: "file",
    topic: "finance",
    preparation:
      "Укажите, нужна ли копия, переоформление или консультация о договоре. Не указывайте паспортные данные и реквизиты.",
    campusStatus: mgimoSubmission,
    sources: [
      {
        label: "Договор и онлайн-оплата в ИТМО",
        href: "https://student.itmo.ru/ru/education/general/contract",
      },
    ],
  },
  {
    id: "study-leave-certificate",
    title: "Справка-вызов",
    description: "Документ для работодателя на время учебного отпуска",
    category: "documents",
    icon: "file",
    topic: "documents",
    preparation:
      "Укажите работодателя, период учебного отпуска и удобный формат получения. Даты и возможность выдачи сверяются перед оформлением.",
    campusStatus: mgimoSubmission,
    sources: [
      {
        label: "Заказ и получение в НИТУ МИСИС",
        href: "https://misis.ru/students/sto-services/studserv/reference/sp7/",
      },
    ],
  },
  {
    id: "student-id-replacement",
    title: "Дубликат студенческого билета",
    description: "Запросить замену при утрате или повреждении",
    category: "documents",
    icon: "file",
    topic: "documents",
    preparation:
      "Укажите причину замены. В ответе можно уточнить, что взять с собой и когда забирать новый билет.",
    campusStatus: mgimoSubmission,
    sources: [miem],
  },
  {
    id: "order-extract",
    title: "Выписка из приказа",
    description: "Запросить выписку о зачислении, переводе или другом решении",
    category: "documents",
    icon: "list",
    topic: "documents",
    preparation:
      "Укажите вид приказа и, если знаете, дату или номер. Напишите, нужен ли бумажный экземпляр.",
    campusStatus:
      "В ЛК МГИМО виден список приказов. Онлайн-заказ выписки не подтверждён.",
    sources: [
      {
        label: "Мои приказы в ЛК МГИМО",
        href: "https://lks.mgimo.ru/app/profile;mode=docs/orders",
      },
      {
        label: "Онлайн-заказ выписки в ИТМО",
        href: "https://student.itmo.ru/ru/services/documents",
      },
    ],
  },
  {
    id: "visit-request",
    title: "Запросить приём",
    description: "Указать удобное время и получить ответ о визите",
    category: "visit",
    icon: "calendar",
    topic: "documents",
    preparation:
      "Укажите услугу или вопрос и удобное время. Дата и время визита согласуются в ответе на заявку.",
    campusStatus:
      "Единая онлайн-запись в деканат МГИМО в Москве не подтверждена.",
    sources: [
      {
        label: "Запись в студенческий офис NTU",
        href: "https://www.ntu.edu.sg/life-at-ntu/student-life/student-services/onestop",
      },
    ],
  },
] as const satisfies readonly (ServiceInfo & {
  topic: "documents" | "academic" | "finance" | "library";
  campusStatus: string;
})[];

export type ApplicationService = (typeof applicationServices)[number];

export const mgimoRequestsUrl = "https://lks.mgimo.ru/app/requests/dashboard";
const mgimoStudentHandbook = "https://mgimo.ru/upload/2025/09/pamyatka-studentu.pdf";
const mgimoRequestsAction = {
  href: mgimoRequestsUrl,
  label: "Открыть Центр заявок МГИМО",
};

export const officialServices = [
  {
    id: "clearance",
    title: "Обходной лист",
    description: "Оформить электронный обходной лист",
    category: "study",
    icon: "list",
    channel: "В личном кабинете МГИМО",
    action: mgimoRequestsAction,
    preparation:
      "Войдите в личный кабинет МГИМО и выберите «Обходной лист» в Центре заявок. Следуйте инструкции университета.",
    sources: [
      {
        label: "Инструкция МГИМО",
        href: "https://mgimo.ru/upload/2025/05/clearance-students.pdf",
      },
    ],
  },
  {
    id: "practice",
    title: "Практика",
    description: "Открыть раздел практики в Центре заявок МГИМО",
    category: "study",
    icon: "book",
    channel: "В личном кабинете МГИМО",
    action: mgimoRequestsAction,
    preparation:
      "В Центре заявок найдите карточку «Практика». Порядок оформления зависит от вида практики. На сайте Центра карьеры есть образцы заявлений и список необходимых документов.",
    sources: [
      {
        label: "Порядок прохождения практики в МГИМО",
        href: "https://career.mgimo.ru/page/adaptive/id310880/",
      },
    ],
  },
  {
    id: "academic-rating-report",
    title: "Справка об академическом рейтинге",
    description: "Запросить результаты по дисциплинам или средний рейтинг",
    category: "documents",
    icon: "list",
    channel: "По почте или лично",
    action: {
      href: "mailto:rating@inno.mgimo.ru",
      label: "Написать в Отдел качества образования",
    },
    preparation:
      "Напишите в Отдел качества образования или обратитесь в кабинет 3069а. Укажите период и нужные сведения. Р1 содержит результаты по дисциплинам за семестр, Р15 — средний рейтинг за год или весь период обучения. Итоговый показатель за последний семестр можно посмотреть в ЛК МГИМО.",
    sources: [
      {
        label: "Памятка студента МГИМО, стр. 24–25",
        href: `${mgimoStudentHandbook}#page=24`,
      },
    ],
  },
  {
    id: "dormitory-move-in",
    title: "Заселение в общежитие",
    description: "Подать заявку на заселение и записаться на визит",
    category: "campus",
    icon: "calendar",
    channel: "Онлайн на платформе общежитий МГИМО",
    action: {
      href: "https://dorm.mgimo.ru/",
      label: "Открыть платформу общежитий",
    },
    preparation:
      "Зарегистрируйтесь на платформе. После подтверждения регистрации откройте «Заявки и Услуги», создайте новую заявку и выберите «Заселение». После письма о посещении общежития запишитесь на визит через электронную очередь на той же платформе.",
    sources: [
      {
        label: "Инструкция по заселению МГИМО",
        href: "https://mgimo.ru/upload/2024/07/dorm-online.pdf",
      },
    ],
  },
  {
    id: "international-student-support",
    title: "Поддержка иностранных студентов",
    description: "Уточнить вопросы о визе, миграционном учёте и страховке",
    category: "campus",
    icon: "message",
    channel: "На платформе «Иностранный студент»",
    action: {
      href: "https://intsup.mgimo.ru/",
      label: "Открыть платформу «Иностранный студент»",
    },
    preparation:
      "Войдите на платформу МГИМО, чтобы связаться с подразделением по своему вопросу о въезде, пребывании, визе или медицинском страховании.",
    sources: [
      {
        label: "Описание сервиса МГИМО",
        href: "https://intsup.mgimo.ru/",
      },
    ],
  },
  {
    id: "teaching-feedback",
    title: "Оценка качества преподавания",
    description: "Заполнить анкеты по дисциплинам семестра",
    category: "study",
    icon: "list",
    channel: "Онлайн по коду из университетской почты",
    action: {
      href: "https://survey.mgimo.ru/auth/pin",
      label: "Открыть анкетирование МГИМО",
    },
    preparation:
      "В период опроса найдите персональный PIN-код в университетской почте и введите его на платформе «Мониторинг». Оцените обязательные дисциплины и те предметы по выбору, которые вы изучали.",
    sources: [
      {
        label: "Памятка студента МГИМО, стр. 45–46",
        href: `${mgimoStudentHandbook}#page=45`,
      },
    ],
  },
  {
    id: "student-email-access",
    title: "Доступ к университетской почте",
    description: "Найти свой адрес или обратиться за помощью со входом",
    category: "study",
    icon: "message",
    channel: "ЛК МГИМО, поддержка по почте или лично",
    action: {
      href: "https://lks.mgimo.ru/",
      label: "Открыть личный кабинет МГИМО",
    },
    preparation:
      "Откройте «Профиль» в личном кабинете МГИМО, чтобы найти свой адрес @my.mgimo.ru и данные для входа. Если доступа к почте нет, напишите в поддержку на e-learning@my.mgimo.ru или обратитесь в кабинет ГЦ-39.",
    sources: [
      {
        label: "Памятка студента МГИМО, стр. 46",
        href: `${mgimoStudentHandbook}#page=46`,
      },
    ],
  },
] as const satisfies readonly (ServiceInfo & {
  channel: string;
  action: Source;
})[];

export type OfficialService = (typeof officialServices)[number];

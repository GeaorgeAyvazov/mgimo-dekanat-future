from pathlib import Path
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'process-report.pdf'
PUBLIC = ROOT / 'public' / 'submission' / 'process-report.pdf'

font_dir = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('DejaVu', str(font_dir / 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVu-Bold', str(font_dir / 'DejaVuSans-Bold.ttf')))

BLUE = colors.HexColor('#1557C0')
INK = colors.HexColor('#17243B')
MUTED = colors.HexColor('#5F7087')
PALE = colors.HexColor('#F1F5FC')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Cover', fontName='DejaVu-Bold', fontSize=30, leading=36, textColor=INK, spaceAfter=18))
styles.add(ParagraphStyle(name='H1x', fontName='DejaVu-Bold', fontSize=20, leading=25, textColor=INK, spaceAfter=12))
styles.add(ParagraphStyle(name='H2x', fontName='DejaVu-Bold', fontSize=12, leading=16, textColor=BLUE, spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle(name='Bodyx', fontName='DejaVu', fontSize=10.5, leading=15, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name='Smallx', fontName='DejaVu', fontSize=8.5, leading=12, textColor=MUTED))
styles.add(ParagraphStyle(name='Cellx', fontName='DejaVu', fontSize=9, leading=12, textColor=INK))

def P(text, style='Bodyx'):
    return Paragraph(text, styles[style])

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#D7E1EF'))
    canvas.line(42, 42, A4[0]-42, 42)
    canvas.setFont('DejaVu', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(42, 27, 'Деканат будущего · описание процесса')
    canvas.drawRightString(A4[0]-42, 27, str(doc.page))
    canvas.restoreState()

def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=42, leftMargin=42, topMargin=48, bottomMargin=55, title='Деканат будущего — описание процесса')
    story = []
    story += [P('Деканат будущего', 'Cover'), P('Короткое описание конкурсного прототипа личного кабинета студента МГИМО', 'H1x'), P('Версия для подачи · ноябрь 2026', 'Smallx'), Spacer(1, 24)]
    story += [P('1. Проблема', 'H1x'), P('Учебная жизнь студента разбросана по расписанию, LMS, почте и очному деканату. Для простой справки приходится искать нужный контакт и повторно объяснять ситуацию. На телефоне этот путь особенно неудобен.', 'Bodyx'), P('Цель проекта — собрать ежедневные учебные действия и сервисные обращения в одном кабинете: быстро увидеть следующую пару, понять успеваемость, заказать документ и проверить, что происходит с заявкой.', 'Bodyx')]
    story += [P('2. Решение', 'H1x'), P('«Деканат будущего» — рабочий прототип для московского кампуса МГИМО. Навигация разделена по задачам, а не по внутренней структуре систем.', 'Bodyx')]
    data = [[P('<b>Раздел</b>', 'Cellx'), P('<b>Что можно сделать</b>', 'Cellx')], [P('Учёба', 'Cellx'), P('Открыть расписание своей группы и языковой подгруппы, посмотреть преподавателя, аудиторию и изменения; перейти к электронным образовательным системам.', 'Cellx')], [P('Успеваемость', 'Cellx'), P('Увидеть дисциплины, оценки по 100-балльной шкале, зачёты и общую картину прогресса.', 'Cellx')], [P('Центр сервиса', 'Cellx'), P('Выбрать справку или обращение, указать формат получения, отправить заявку и следить за статусом.', 'Cellx')], [P('Документы', 'Cellx'), P('Скачать демонстрационные PDF и SIG, увидеть электронную отметку и историю подготовки документа.', 'Cellx')], [P('Кампус', 'Cellx'), P('Открыть общую карту корпусов и план этажа, найти аудиторию и проверить занятость помещения.', 'Cellx')], [P('Сотрудники', 'Cellx'), P('Найти подразделение или сотрудника по вопросу, увидеть зону ответственности и контакты.', 'Cellx')]]
    table = Table(data, colWidths=[110, 388], repeatRows=1)
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#D7E1EF')),('INNERGRID',(0,0),(-1,-1),0.35,colors.HexColor('#D7E1EF')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    story += [table, PageBreak()]
    story += [P('3. Основной пользовательский сценарий', 'H1x'), P('<b>Вход → расписание → сервис → статус → документ.</b> Студент входит под своей учётной записью, видит только собственные данные, открывает ближайшее занятие, выбирает «Центр сервиса», заказывает справку и возвращается в карточку заявки. После обработки доступен результат и история изменений.', 'Bodyx'), P('Для жюри подготовлены две студенческие записи с разными профилями и отдельная роль сотрудника. Это позволяет проверить разделение данных и полный цикл заявки.', 'Bodyx'), P('4. Что сделано в прототипе', 'H1x')]
    for item in ['Вход по логину и паролю; профиль: ФИО, факультет, направление, курс и группа.', 'Расписание на день и неделю; занятия связаны с языковой подгруппой, преподавателем и аудиторией; изменения выделены.', 'Успеваемость по дисциплинам, зачёты и сводка прогресса в 100-балльной шкале.', 'Каталог сервисов и онлайн-заявка на справки; статус «Принято / В работе / Готово / Выдано».', 'Уведомления открываются компактной панелью, не уводя пользователя в новую вкладку.', 'Поиск сотрудников и подразделений с описанием ответственности.', 'Общая карта корпусов МГИМО, планы этажей и переход к аудитории из расписания.', 'Адаптивный интерфейс: ключевые сценарии рассчитаны на ширину от 360 px.']:
        story.append(P('• ' + item, 'Bodyx'))
    story += [P('5. Процесс и ИИ-инструменты', 'H1x'), P('Участник команды сформулировал проблему справочного стола, показал реальные кабинеты и примеры документов, задавал приоритеты и принимал решения по интерфейсу. Codex использовался для исследования, декомпозиции сценариев, генерации React/TypeScript-кода, текстов, тестов и итераций UI. Открытые UX-наработки сервисных кабинетов вузов использованы как ориентир, затем адаптированы под МГИМО.', 'Bodyx'), P('Ручная работа: вход в учебные системы, выбор обязательного ядра, проверка мобильных сценариев, сверка карт и расписания, подготовка демонстрационных данных и финальная проверка маршрутов.', 'Bodyx'), PageBreak()]
    story += [P('6. Данные и безопасность', 'H1x'), P('В конкурсной версии используются вымышленные учебные записи. У каждой заявки есть владелец; сервер проверяет сессию и роль перед чтением заявки или файла. Пароли хранятся как хеши, ключи не вшиты в браузерный код. В продакшене потребуются единый вход вуза, официальное хранилище и доверенная электронная подпись МГИМО.', 'Bodyx'), P('7. Как проверить', 'H1x')]
    creds = [[P('<b>Роль</b>', 'Cellx'),P('<b>Логин</b>', 'Cellx'),P('<b>Пароль</b>', 'Cellx')],[P('Студент 1', 'Cellx'),P('alina.demo', 'Cellx'),P('Student2026!', 'Cellx')],[P('Студент 2', 'Cellx'),P('maxim.demo', 'Cellx'),P('Student2026!', 'Cellx')],[P('Сотрудник', 'Cellx'),P('office.demo', 'Cellx'),P('Student2026!', 'Cellx')]]
    t2=Table(creds,colWidths=[150,180,168]); t2.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#D7E1EF')),('INNERGRID',(0,0),(-1,-1),0.35,colors.HexColor('#D7E1EF')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    story += [t2, Spacer(1,12)]
    for item in ['Войти как alina.demo и открыть расписание, успеваемость и Центр сервиса.', 'Заказать «Справку об обучении», открыть созданную заявку и скачать PDF.', 'В отдельном окне войти как office.demo, найти заявку и перевести её по статусам.', 'Вернуться к студенту и проверить историю и уведомление.', 'Войти как maxim.demo: профиль и заявки Алины недоступны.']:
        story.append(P('• ' + item, 'Bodyx'))
    story += [P('8. Ограничения конкурсной версии', 'H1x'), P('Это прототип с демонстрационной базой, а не подключение к реальным информационным системам МГИМО. Для пилота нужны согласованные API расписания и успеваемости, единый вход, регламент выдачи документов и официальное подписание.', 'Bodyx'), P('Исходный код, инструкции запуска и дополнительные материалы находятся в репозитории проекта.', 'Bodyx')]
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    shutil.copyfile(OUT, PUBLIC)
    print(OUT)

if __name__ == '__main__':
    build()

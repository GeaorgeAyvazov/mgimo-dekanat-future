# Источники встроенной карты МГИМО, Москва

Дата снимка: 6 ноября 2026. Все планы получены обычной навигацией по публичной карте МГИМО, без обхода проверок.

Собрано 31 план этажа и 1293 помещения/объекта. Это не 1293 учебные аудитории: в число входят лестницы, входы, переходы и другие объекты. Спортцентр и общежитие присутствуют на общем плане территории; поэтажных вариантов для них исходный селектор не предоставил.

Исходные scripts.html прочитаны статическим AST-парсером; скрипты сайта не исполнялись генератором. SVG очищены от активных элементов, обработчиков событий и внешних ресурсов. Цвета и подписи материализованы; для неинициализированных исходной страницей схем применены подтверждённые типы Rooms и реальные координаты DOM.

JSON содержит только id, название, тип и прямоугольник объекта. Описания, телефоны, email и полный HTML в приложение не перенесены. Объекты без действительных координат опущены; полный список в build-report.json и validation-report.json.

Точные хеши исходных четырёх файлов каждого этажа и итогового SVG приведены в validation-report.json.

| План | Источник | Объектов |
|---|---|---|
| a1 | [Публичный план](https://mgimo.ru/territory/map/?building=a&floor=1) | 12 |
| a2 | [Публичный план](https://mgimo.ru/territory/map/?building=a&floor=2) | 23 |
| b0 | [Публичный план](https://mgimo.ru/territory/map/?building=b&floor=0) | 47 |
| b1 | [Публичный план](https://mgimo.ru/territory/map/?building=b&floor=1) | 78 |
| b2 | [Публичный план](https://mgimo.ru/territory/map/?building=b&floor=2) | 73 |
| b3 | [Публичный план](https://mgimo.ru/territory/map/?building=b&floor=3) | 75 |
| b4 | [Публичный план](https://mgimo.ru/territory/map/?building=b&floor=4) | 72 |
| v0 | [Публичный план](https://mgimo.ru/territory/map/?building=v&floor=0) | 4 |
| v1 | [Публичный план](https://mgimo.ru/territory/map/?building=v&floor=1) | 46 |
| v2 | [Публичный план](https://mgimo.ru/territory/map/?building=v&floor=2) | 74 |
| v3 | [Публичный план](https://mgimo.ru/territory/map/?building=v&floor=3) | 55 |
| v4 | [Публичный план](https://mgimo.ru/territory/map/?building=v&floor=4) | 44 |
| g0 | [Публичный план](https://mgimo.ru/territory/map/?building=g&floor=0) | 68 |
| g1 | [Публичный план](https://mgimo.ru/territory/map/?building=g&floor=1) | 73 |
| g2 | [Публичный план](https://mgimo.ru/territory/map/?building=g&floor=2) | 79 |
| g3 | [Публичный план](https://mgimo.ru/territory/map/?building=g&floor=3) | 77 |
| g4 | [Публичный план](https://mgimo.ru/territory/map/?building=g&floor=4) | 75 |
| g5 | [Публичный план](https://mgimo.ru/territory/map/?building=g&floor=5) | 11 |
| g6 | [Публичный план](https://mgimo.ru/territory/map/?building=g&floor=6) | 3 |
| n1 | [Публичный план](https://mgimo.ru/territory/map/?building=n&floor=1) | 54 |
| n2 | [Публичный план](https://mgimo.ru/territory/map/?building=n&floor=2) | 54 |
| n3 | [Публичный план](https://mgimo.ru/territory/map/?building=n&floor=3) | 49 |
| n4 | [Публичный план](https://mgimo.ru/territory/map/?building=n&floor=4) | 53 |
| n5 | [Публичный план](https://mgimo.ru/territory/map/?building=n&floor=5) | 50 |
| l0 | [Публичный план](https://mgimo.ru/territory/map/?building=l&floor=0) | 1 |
| l1 | [Публичный план](https://mgimo.ru/territory/map/?building=l&floor=1) | 14 |
| l2 | [Публичный план](https://mgimo.ru/territory/map/?building=l&floor=2) | 9 |
| l3 | [Публичный план](https://mgimo.ru/territory/map/?building=l&floor=3) | 4 |
| d1 | [Публичный план](https://mgimo.ru/territory/map/?building=d&floor=1) | 6 |
| d2 | [Публичный план](https://mgimo.ru/territory/map/?building=d&floor=2) | 5 |
| d3 | [Публичный план](https://mgimo.ru/territory/map/?building=d&floor=3) | 5 |

Повторная сборка из корня проекта: `node research/evidence/map-assets/build-map-assets.mjs --strict`. Генератор использует TypeScript из student-portal и стандартную XML-библиотеку Python. При необходимости путь Python задаётся через `--python <path>` или MAP_PYTHON.

Финальная статическая проверка: все 31 SVG корректны как XML, активных элементов/событий/внешних ресурсов не найдено, метаданные содержат только id/name/type/box, каждый объект связан с существующим SVG-элементом. 13 объектов исходной карты без действительной геометрии не включены. У пяти повторных декоративных фигур A2 удалён только повторный id; геометрия сохранена.

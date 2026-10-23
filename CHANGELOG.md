# Changelog

## 0.4.130 — 2026-10-23

- Начат полный редизайн нативного Android-приложения, а не только веб-интерфейса.
- Обновлена палитра тёмной и светлой тем: более спокойные OLED-поверхности, холодные акценты и более чистый контраст.
- Переработан общий фон экранов с мягким вертикальным градиентом.
- Обновлены карточки сохранений, счётчики, форма быстрого сохранения и группы настроек: увеличены радиусы, улучшены отступы, добавлена аккуратная глубина.
- Сделаны более цельными элементы поиска и верхняя панель, при этом сохранены локальные данные, навигация, фильтры, импорт/экспорт и механика обновления.
- Версия Android пока требует проверки CI-сборкой; публикация APK не считается завершённой до успешной сборки.

# Changelog

## 0.4.129 — 2026-10-23

- Полностью обновлён визуальный слой веб-версии: более собранная типографика, глубокий фон, аккуратные полупрозрачные поверхности и единая система отступов.
- Переработаны карточки библиотеки: тонкие границы, мягкая глубина, спокойные состояния при наведении и стабильные пропорции обложек.
- Улучшена адаптация сетки: три колонки на широком экране, две на планшете и одна на телефоне.
- Обновлены поле быстрого сохранения, фильтры, кнопки и окно настроек; уменьшено визуальное давление элементов.
- Интерфейс сайта переведён на русский язык, включая основные действия и сообщения.
- Добавлены более плавные переходы и скелетон-загрузка обложек; для систем с настройкой уменьшения движения анимации отключаются.
- Облачная синхронизация и проверка версии Windows сохранены; реальная синхронизация между устройствами по-прежнему требует настроенного проекта Linka Cloud.

## 0.3.0 — 2026-10-23

- New consistent Linka logo assets for the web/Windows surface and Android launcher.
- Redesigned web inbox with restrained glass blur, ambient light, staggered title/card motion, refined responsive spacing and light/dark/system themes.
- Added persistent appearance settings, reduced-motion setting, and a one-time in-app user agreement.
- Redesigned Android Compose layout and added persistent dark/light/system appearance, animated UI transitions, one-time agreement acknowledgement, and terms view in Settings.
- Fixed Windows installer configuration to explicitly include the ICO icon for NSIS/MSI packaging.
- Added a written agreement describing local storage, manual backup, no automatic sync and external-link limitations.

## 0.2.0

- Local-first inbox capture, pin, edit, delete, copy, filter and export features.
- Web storage tests and CI build.
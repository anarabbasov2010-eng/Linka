# Changelog

## Next — Unified twilight theme correction

- Removed the pulsing sphere and old generated ambient audio; the twilight forest is now Linka's single built-in appearance across Android, Web, and Windows.
- Migrated older installations to make the forest backdrop and the user's supplied “как всё заебало..” MP3 the defaults, while retaining user-added tracks and backgrounds.
- Added verified Pexels dusk-path fallback clips and a matching poster so a failed video source does not leave the background black.
- Removed alternate theme and accent choices from settings and the command palette.
- Moved the Android mini-player into a compact floating dock above navigation; the expanded player still contains the playlist and controls.
- Kept custom photo/video backgrounds, local playlists, animated text entry, wind-like movement, and subtle film grain.


## Next — Twilight atmosphere and music player

- Windows/Web: added the Linka twilight background layer with a slowly drifting dusk-forest video, dark readability veil, gentle wind-like gradients and extremely subtle moving film grain.
- Windows/Web: the supplied MP3, “как всё заебало..”, is the default soundtrack in a compact dock player; the expanded player includes seek, volume, previous/next, and a persistent playlist.
- Windows/Web: added local photo/video backgrounds and local audio tracks stored in IndexedDB; user media is not uploaded by the atmosphere feature.
- Windows/Web: added per-character ink/fade animation for newly typed capture text, with reduced-motion handling.
- Android: added a looping forest-video/photo background layer, quiet grain, subtle animated newly typed glyph, a bottom mini-player and an expanded playlist dialog.
- Android: users can choose persisted local photo/video backgrounds, import multiple audio files, choose tracks, skip, pause/resume, and set music volume.
- The default MP3 is streamed from a hosted asset to avoid adding about 28.5 MB to each install package. Playback in browser-based clients starts from the play control because autoplay can be blocked by the platform.
- Background-video source: [Pexels — Serene Forest Path at Dusk](https://www.pexels.com/video/serene-forest-path-at-dusk-36928855/). The clip page labels it “Free to use”; verify source availability in the installed build and fallback to user-selected media if the provider URL changes.
- Validation and release publishing must pass GitHub Actions before this update is treated as installable.

## Next — Interface and feature update (in progress)

- Android: refined the existing ambient sphere with slow orbital motion and restrained rim lighting; quiet mode and OLED black remain unaffected.
- Android: added directional, spring-timed page transitions and horizontally scrollable appearance controls for narrow screens.
- Android: improved selected/pinned capture distinction, header hierarchy and settings group labels.
- Windows/Web: refined shared Tauri/Web visual surfaces, navigation active-state rail, accessible focus rings, touch targets, and small-window spacing.
- Windows/Web: added multi-select management for pin/unpin, copy, export and batch delete, including a confirmation before destructive bulk deletion.
- Windows/Web: added advanced search operators for type, pinned state, domain and saved date.
- Added a 200-item feature roadmap that separates implemented features from proposals.
- Build and test status must be confirmed by GitHub Actions before treating this branch as release-ready.

## Next — Linka interface refinement

- Android: added a slow, very subtle orbital drift and restrained rim-light detail to the existing ambient sphere; quiet mode and OLED black remain unaffected.
- Android: section changes now combine a small directional slide, fade and spring timing instead of relying on vertical movement alone.
- Android: appearance, accent, effects and density options now scroll horizontally on narrow screens rather than being clipped or compressed.
- Android: pinned captures receive a clearer accent state, unpinned cards use quieter elevation, and settings groups have a compact accent marker.
- Windows/Web: refined the shared Tauri/Web visual layer with a restrained moving navigation rail, clearer active states, consistent touch targets, focus rings, smoother surface transitions and more careful narrow-window layout.
- Added a 200-item interface improvement roadmap, clearly separating the first implemented wave from future ideas.
- Validation: GitHub Actions checks and installable builds must pass before this branch is treated as release-ready.

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
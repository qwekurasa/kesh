# Кэш — трекер трат

Простой учёт расходов и доходов без регистрации и облака. Данные хранятся только на устройстве.

**Kesh** — offline expense tracker & budget app (PWA, iOS, Android). No sign-up, no cloud.

→ **https://kesh-money.vercel.app/**

## Что умеет

- расходы и доходы по категориям, аналитика за любой период
- бюджет, счета и лимиты
- вклады, ипотека, кредиты, кредитные карты, долги
- импорт выписки Т-Банка (PDF, CSV), экспорт в Excel, резервная копия
- офлайн, русский и английский, 10 валют, виджет для iPhone

## Установка

- **Любой телефон:** открыть ссылку → «На экран „Домой“» (Safari) или «Установить приложение» (Chrome)
- **Android:** [Kesh.apk](https://kesh-money.vercel.app/dl/Kesh.apk)
- **iPhone с виджетом:** [Kesh.ipa](https://kesh-money.vercel.app/dl/Kesh.ipa) через AltStore или Sideloadly; подробная инструкция — в приложении: Профиль → «Установка на другие устройства»
- **Компьютер:** та же ссылка — отчёты, Excel, перенос данных с телефона

## Запуск

```bash
git clone https://github.com/qwekurasa/kesh && cd kesh
python3 -m http.server 8080
```

Сборка не нужна. `ios/` — проект Xcode, `android/` — Android.

## Поддержать

- Solana: `64kwY5adPeQVfzvsyvEpke5wsJuVEPXAY3bm6VuFBZf`
- Ethereum: `0xad4a06e063d0e83e783f9fb17efc6524a83a40f2`
- USDT TRC20: `TERWLLYABDAvMQTKPkpXwdKpU4AS5k8ff3`

## Лицензия

Все права защищены. Сторонние компоненты: PDF.js (Apache-2.0), Air Datepicker (MIT), шрифты Onest, Outfit, JetBrains Mono (OFL), иконки Phosphor (MIT).

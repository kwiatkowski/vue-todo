# vue-todo

Osobista aplikacja Todo z podziałem na kategorie i projekty – Vue 3 + Pinia, własny styl „Atrament” (bez bibliotek UI).
Dane i logowanie zapewnia WordPress z pluginem [wp-plugin-todo](https://github.com/kwiatkowski/wp-plugin-todo).

## Jak to działa

```
przeglądarka ── /todo/ ───────────► WordPress (wp-plugin-todo)
                                     • niezalogowany → strona logowania → z powrotem
                                     • zalogowany → web/index.html + window.__TODO__ (REST URL, nonce, użytkownik)
             ── /todo/web/assets/* ► pliki z buildu (Apache, .htaccess)
             ── /wp-json/todo/v1/* ► REST API pluginu (cookie logowania + nonce)
```

W bundlu nie ma adresów, tokenów ani haseł – konfigurację wstrzykuje WordPress w chwili otwarcia strony.

## Instalacja

Katalog aplikacji to `{web root}/todo` (w Bedrocku `web/todo`), obok WordPressa:

```
git clone https://github.com/kwiatkowski/vue-todo.git web/todo
```

Zbudowana wersja (`web/`) jest w repozytorium, więc na serwerze wystarczy `git pull` – Node nie jest tam potrzebny.

## Praca lokalna

```
npm install
npm run build        # type-check + build do web/
npm test             # testy jednostkowe (Vitest)
npm run lint         # ESLint
```

Po `npm run build` aplikacja działa pod `https://{domena}/todo/` (zalogowany administrator WordPressa).

### Hot reload (`npm run dev`)

Dev server (port 3000) przekazuje `/wp-json` do WordPressa i dokleja hasło aplikacji – po stronie Node,
nie trafia ono do przeglądarki. Hasło tworzysz w WordPressie: *Użytkownicy → Profil → Hasła aplikacji*.

`.env.development.local` (ignorowany przez git):

```
TODO_DEV_API=https://kwiatkowski.local
TODO_DEV_AUTH=login:xxxx xxxx xxxx xxxx xxxx xxxx
```

Potem `npm run dev` i `http://localhost:3000/todo/web/`.

## Budowa

```
src/
├── api/          klient fetch (nonce, odświeżanie nonce, błędy) i endpointy todo/v1
├── stores/       Pinia: tasks (optimistic updates + cofanie), projects, areas (kategorie), ui (okna, menu), notify
├── utils/        czyste funkcje: widoki, sortowanie, daty, układ osi dnia, szybkie dodawanie – pokryte testami
├── components/   panel boczny, wiersz i karta zadania, tablica, oś dnia, okna edycji, ui/ (dialog, menu, toast)
├── composables/  motyw jasny/ciemny
├── pages/        dzień, lista/tablica (jedna strona dla wszystkich widoków), 404
├── styles/       app.css – tokeny kolorów (jasne i ciemne), typografia, przyciski, pola, chipy
└── config.ts     konfiguracja z window.__TODO__ (prod) lub wartości domyślne (dev)
```

Widoki:

- **Plan** (`/plan` – otwiera ostatnio używaną zakładkę) z zakładkami **Dziś**, **Jutro**, **Ten tydzień**, **Przyszły tydzień**
  (`/today`, `/tomorrow`, `/week`, `/next-week`) – zadania z tego okresu ze wszystkich projektów, pogrupowane po projektach
  (kolejność z panelu, przy projekcie jego kategoria, na końcu „Do posortowania”). W „Dziś” i „Ten tydzień” zaległe są osobno
  na górze; „Ten tydzień” to dziś–niedziela. Na listach jednego dnia kolumna po prawej pokazuje już tylko godzinę.
- **Kalendarz** (`/calendar` – otwiera ostatnio używany widok): **Dzień** (`/calendar/day/RRRR-MM-DD`) – oś godzin
  z zadaniami jako blokami (godzina + czas trwania), nad nią pasek „Cały dzień” z zadaniami bez godziny, obok zaległe;
  **Tydzień** (`/calendar/week/RRRR-MM-DD`, poniedziałek–niedziela) – te same bloki w siedmiu kolumnach, klik w nagłówek
  dnia otwiera ten dzień. Przeciągnij zadanie na godzinę (także na inny dzień), na pasek „Cały dzień” – żeby zdjąć godzinę;
  dolną krawędzią bloku zmienisz czas trwania, kliknięcie w wolne miejsce dodaje zadanie o tej porze. ← → przełączają
  dni / tygodnie, T – dziś, D / W – dzień / tydzień.
- **Do posortowania** (zadania bez projektu – dawna „Skrzynka”), **Nadchodzące** (pogrupowane po dniu), **Wszystkie**, **kategorie** i **projekty** –
  każdy jako lista albo **tablica** (Do zrobienia / W toku / Zrobione, przeciąganie kart między kolumnami;
  na dotyku – menu „…” karty). Adres tablicy to adres listy + `/board`.
- **Duplikowanie zadania**: menu „…” → „Duplikuj…” albo przycisk w oknie zadania – otwiera się okno z kopią
  (wszystko poza historią; ukończone wraca jako „Do zrobienia”), w którym przed zapisem zmienisz projekt albo cokolwiek innego.
- **Nazwę zadania** na liście zmienisz w miejscu: ołówek za nazwą (widoczny po najechaniu na wiersz), Enter zapisuje, Esc anuluje.
- **Kolejność zadań na listach**: najpierw zadania z terminem (dzień, godzina, priorytet), potem bez terminu z priorytetem
  (od najwyższego), na końcu bez terminu i priorytetu – te układasz sam, przeciągając wiersz (zielona linia pokazuje miejsce).
  Na tablicy kolejność w kolumnach jest w całości ręczna. Nadchodzące i kalendarz sortują po dacie i godzinie,
  „Zrobione” – po dacie ukończenia.

Kategorie (np. Praca, Dom) grupują projekty w panelu bocznym; WordPress tworzy „Praca” i „Dom” przy pierwszym uruchomieniu.
Kolejność kategorii zmieniasz, przeciągając je za nagłówek w panelu bocznym albo przez menu „…” kategorii
(Przesuń w górę / w dół); zapisuje się w WordPressie, nowa kategoria trafia na koniec.
Projekty przeciągasz w panelu tak samo – w obrębie kategorii albo do innej (upuszczenie na nagłówek
kategorii dokłada projekt na koniec); nowy projekt trafia na koniec swojej kategorii.

Szybkie dodawanie rozumie skróty: `dziś` / `jutro` / `pojutro`, godzinę `18:30` lub `o 18` i priorytet `!` / `!!` / `!!!`,
np. „Zadzwonić do Kasi jutro 18:00 !!”.

## Wersje

Vue 3.5, Pinia 4, Vue Router 5, Vite 8, ikony Lucide, fonty Geist i Geist Mono, TypeScript 5.9 (vue-tsc nie obsługuje jeszcze TS 7), Vitest 5.

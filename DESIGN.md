# Design system „Atrament”

Wzorzec wyglądu Todo – ten sam co w liście projektów (kwiatkowski.co). Kolejne zmiany interfejsu trzymają się tego pliku;
wartości mieszkają w `src/styles/app.css`, a `src/styles/__tests__/tokens.spec.ts` pilnuje kontrastu.

## Kierunek

**Minimalizm / styl szwajcarski, gęsty układ** – narzędzie do pracy, nie wizytówka: czytelna hierarchia, funkcjonalne
kolory, mikrointerakcje zamiast ozdób. Ciepły papier, atramentowy tekst, cienkie linie zamiast cieni, **jeden** zielony akcent.
Ciemny motyw domyślny, jasny do wyboru (`data-theme` na `<html>`).

## Kolory – role

Komponenty używają ról (`var(--…)`), nigdy surowych kolorów.

| Rola | Ciemny | Jasny | Do czego |
|---|---|---|---|
| `--bg` | `#151513` | `#f6f5f1` | tło strony |
| `--panel` | `#1b1a18` | `#efede7` | panel boczny, belki okien |
| `--surface` | `#201f1c` | `#fffefb` | karty, okna, pola |
| `--line` / `--line-strong` | `#2e2d29` / `#403e38` | `#e4e1d8` / `#d2cec2` | linie, obramowania |
| `--text` | `#ecebe6` | `#1c1b18` | tekst główny |
| `--text-2` | `#aaa79e` | `#5f5c54` | tekst drugorzędny |
| `--text-3` | `#918e85` | `#6f6c64` | podpisy, liczniki, podpowiedzi |
| `--accent` | `#a6c46a` | `#56731c` | marka: przycisk główny, aktywne zakładki, fokus |
| `--accent-ink` | `#151513` | `#fffefb` | tekst na `--accent` |
| `--accent-soft` | `#29321a` | `#e6edd5` | tło wyróżnień (wiersz w toku, liczniki) |
| `--accent-text` | `#b9d585` | `#45601a` | zielony tekst |
| `--danger` | `#ee7d67` | `#c2412d` | zaległe, usuwanie, priorytet wysoki |
| `--warn` | `#e2aa4f` | `#9a5f0e` | ostrzeżenia, niezapisane zmiany, priorytet średni |
| `--info` | `#86aedc` | `#3a6ea5` | informacje, priorytet niski |

**Kontrast:** każdy kolor tekstu (`--text*`, `--accent-text`, `--danger`, `--warn`, `--info`) ma co najmniej **4,5:1**
na `--bg` i `--surface` w obu motywach, `--accent-ink` na `--accent` też – sprawdza to `__tests__/tokens.spec.ts`.

**Znaczenie nigdy samym kolorem** – zawsze też kształt albo słowo:

| Co | Kształt | Kolor |
|---|---|---|
| do zrobienia / w toku / zrobione | puste kółko / pół kółka / kółko z ptaszkiem | obwódka w kolorze priorytetu |
| priorytet wysoki / średni / niski | flaga + nazwa | `--danger` / `--warn` / `--info` |
| termin zaległy | data („wczoraj”, „28 paź”) | `--danger` |
| w toku | pół kółka + tło wiersza | `--accent-soft` |

## Typografia

- **Geist Variable** – cały tekst; **Geist Mono** – liczby: liczniki, godziny, numer wersji.
- Skala: **11** (etykiety wersalikami, liczniki, wersja – i nic więcej) / **12** (tekst pomocniczy) / **13** (lista, tekst
  podstawowy) / **15** (tytuł strony na belce) / **18** (tytuł zadania w oknie).
- Grubości 400 / 500 / 650. Pogrubienie dla nagłówków i tytułów stron – nie do oznaczania stanów.
- Etykiety wersalikami: 11 px, `letter-spacing: .06–.08em`, `--text-3`.

## Odstępy i kształt

- Siatka **4 px**: 4 / 8 / 12 / 16 / 24; margines strony `--edge` 18 px; wiersz listy 7 px w pionie.
- Zaokrąglenia: `--radius-sm` 6 (etykiety), `--radius` 8 (pola, przyciski, wiersze), `--radius-lg` 12 (okna, karty).
- Bez cieni na powierzchniach – linie `--line`; cień tylko dla elementów nad treścią (okna, menu, dymki).

## Interakcja

- **Fokus:** jedna zielona linia 1 px (`--accent`), widoczna przy klawiaturze; nigdy nie usuwać.
- **Pola klikalne** co najmniej **24×24 px** (WCAG 2.2) – mniejszy wygląd powiększa niewidoczny obszar (`::after`).
- **Nic tylko po najechaniu:** akcje ukryte do hovera pokazują się też przy fokusie i na ekranach dotykowych.
- **Dymki:** `v-tip` (TipLayer) w stylu listy projektów – nie systemowy `title`.
- **Menu wyboru** (status, priorytet, projekt): `DropMenu` z pozycjami `menuitemradio` i ptaszkiem przy bieżącej.

## Ruch

- 120–200 ms, `ease-out`; wejście dłuższe niż wyjście; animujemy `opacity` i `transform`, nie wymiary.
- `prefers-reduced-motion: reduce` wyłącza animacje i przejścia (reguła w `app.css`).

## Ikony

- Wyłącznie **Lucide** (SVG), 14–16 px w tekście; **bez emoji**.

## Lista kontrolna przed wdrożeniem

- [ ] tylko role kolorów, bez surowych wartości w komponentach
- [ ] `__tests__/tokens.spec.ts` przechodzi (kontrast 4,5:1)
- [ ] znaczenie nie tylko kolorem; pola klikalne ≥ 24 px; fokus widoczny
- [ ] tekst treści ≥ 12 px
- [ ] oba motywy i wąski ekran obejrzane na zrzucie

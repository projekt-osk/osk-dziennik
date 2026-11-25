# OSK Dziennik

Dziennik instruktora nauki jazdy (PWA, Firebase: logowanie Google + Firestore z pamięcią offline).
To repozytorium zawiera tylko kod, bez żadnych danych.

- `src/` – jedyne źródło (tu edytujemy).
- `node narzedzia/buduj.mjs` – buduje produkcję (katalog główny, projekt `osk-dziennik`)
  i test (`test/`, projekt `osk-test-3c32a`, pasek „WERSJA TESTOWA”, dane przykładowe). Wygenerowanych plików nie edytować.
- `reguly/` – reguły Firestore do wklejenia w konsoli (prod i test).
- `node narzedzia/porownaj.mjs kopia-A.json kopia-B.json` – porównuje dwie kopie bazy (stary format z artefaktu i `osk-kopia-*.json`): liczby, salda, płatności, stawka; wynik OK albo lista różnic (po ID)
- Produkcja: https://projekt-osk.github.io/osk-dziennik/ · test: https://projekt-osk.github.io/osk-dziennik/test/

© 2026 projekt-osk. Wszelkie prawa zastrzeżone. Kod nie może być wykorzystywany bez zgody autora.

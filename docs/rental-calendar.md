# Nomas rezervāciju kalendārs

Kontrolpaneļa sadaļā **Nomas kalendārs** pieejams mēneša un nedēļas skats,
produktu filtrs un rezervāciju izveide, labošana un dzēšana. Datumu intervāli
ietver abas robeždienas. Statusi: gaida apstiprinājumu, apstiprināta, pabeigta,
atcelta. Tikai atcelta rezervācija atbrīvo datumus. Viena produkta pārklājošies
intervāli un sākotnēji aizņemtie datumi tiek noraidīti.

Klientu identificē tikai ar kodu `GS-0001` (4–8 cipari). Vārdiem, telefoniem,
e-pastiem un piezīmēm nav rezervācijas lauku. Kodu sasaisti ar cilvēku glabā
ārpus šīs sistēmas. Produktiem izmanto tikai publiski rādāmu informāciju.

## Privātās glabātuves sagatavošana

1. GitHub īpašnieka `WeirdAsHell` kontā izveido **privātu** repozitoriju,
   piemēram, `garazas-studija-reservations`, ar sākotnēju commit (piem., README).
2. Kontrolpaneļa esošajai fine-grained GitHub atslēgai piešķir
   **Contents: Read and write** tiesības gan mājaslapas, gan privātajam
   repozitorijam. Atslēgu neievieto kodā vai čatā.
3. Autorizējies panelī un nomas sadaļā ievadi privātā repozitorija nosaukumu
   bez īpašnieka. Panelis pārbauda GitHub `private: true`; publisks repozitorijs
   tiek noraidīts pirms jebkādas rakstīšanas.
4. Pirmajā saglabāšanā privātā repozitorija noklusējuma zarā izveidojas
   `reservations.json`. Atslēga un privātā faila saturs netiek glabāti
   localStorage vai publiskajā repozitorijā.

Privātā repozitorija izveide un reāla autorizēta rakstīšana nav veikta šī PR
izstrādes laikā. Integrācijas tests izmanto imitētu GitHub API.

## Dati un kļūdu apstrāde

Esošais `data/noma.json` šajā PR nav mainīts. Pirmajā saglabāšanā produkti
saņem stabilus ID, bet esošie `busy` datumi tiek kopēti uz privātā faila
`legacyBusy` un saglabāti publiskajā pieejamībā. Tos var rediģēt atsevišķi no
rezervācijām. Produktus var pievienot un mainīt, saglabājot esošo informāciju.

Privātajā failā glabājas versija, rezervācijas, produktu informācija,
iepriekšējie bloķējumi un publiskā faila sākotnējais SHA. Publiskajā failā
nonāk tikai produkta ID, nosaukums, apraksts, cena, attēls un aizņemtie datumi;
klientu kodi, rezervāciju ID un statusi netiek publicēti. Esošā `noma.html`
lapa šo pašu formātu jau prot attēlot; publiskās vietnes dizains nav mainīts.

Vispirms saglabā privāto failu, tad atjauno publisko pieejamību. GitHub SHA
pārbaudes aizsargā pret novecojušas sesijas pārrakstīšanu. Divu repozitoriju
rakstīšana nav atomāra: publiskās saglabāšanas kļūdas gadījumā panelis rāda
brīdinājumu un sinhronizācijas atkārtošanas pogu, bloķējot turpmākas izmaiņas.
Nepabeigtā sinhronizācija tiek atpazīta arī pēc sadaļas pārlādēšanas. Ja cita
sesija mainījusi publisko failu pēc privātās saglabāšanas, nepieciešama manuāla
salāgošana; panelis šādus datus nepārraksta. Nelieto veco paneli paralēli jaunajam.
Publiskā pieejamība atjaunojas pēc GitHub Pages publicēšanas aiztures.

Produktu informācijas un bloķējumu rediģēšana ir sadaļā
**Produkti un iepriekšējie bloķējumi**. Produkta dzēšana ar rezervācijām vai
bloķējumiem nav atļauta, lai nezaudētu vēsturi.

## Pārbaudes

No repozitorija saknes:

```sh
node --test tests/reservations.test.cjs
node --check panelis/rental-calendar.js
node --check panelis/panel.js
python3 -m http.server 8000 --bind 127.0.0.1
```

Atsevišķā terminālī ar pieejamu Playwright:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/rental-calendar.browser.cjs
```

`CHROMIUM_PATH` var izlaist, ja Playwright pārlūks ir instalēts. `BASE_URL`
ļauj izvēlēties citu testa serveri. Tests imitē tikai GitHub API, pārējās lapas
un skripti tiek ielādēti no faktiskā servera. Tas pārbauda publiskas glabātuves
noraidīšanu, izveidi, pārklāšanos, nedēļas skatu, atcelšanu, daļēji neizdevušās
saglabāšanas atkopšanu pēc pārlādēšanas, dzēšanu un privāto datu neiekļaušanu
publiskajā JSON. Īstas rezervācijas un GitHub commit šajā testā netiek veidoti.

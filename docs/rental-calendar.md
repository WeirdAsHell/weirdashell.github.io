# Nomas rezervāciju kalendārs

Kontrolpaneļa sadaļā **Nomas kalendārs** pieejams mēneša un nedēļas skats,
produktu un klientu numuru filtri un rezervāciju izveide, labošana un dzēšana. Datumu intervāli
ietver abas robeždienas. Pieejami tikai divi statusi: **Rezervēts** (pelēks) un **Apstiprināts**
(zaļš). Lai atbrīvotu datumus, rezervāciju dzēš ar apstiprinājumu. Viena produkta pārklājošies
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
   bez īpašnieka. Sākotnēji jau piedāvāts `garazas-studija-reservations`; pēc
   veiksmīgas atvēršanas nosaukumu atceras šajā pārlūkā arī pēc pārlādēšanas.
   Blakus ievadei ir saglabāto repozitoriju izvēlne: izvēloties nosaukumu, tas
   tiek ievietots ievades laukā. Pēc veiksmīgas atvēršanas pārlūks atceras līdz
   10 repozitoriju nosaukumiem. Piekļuves atslēga netiek saglabāta. Ja pārlūka glabātuve bloķēta, kalendārs
   turpina darboties bez nosaukuma iegaumēšanas. Panelis pārbauda GitHub `private: true`; publisks repozitorijs
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

Nomas sadaļā ir divas atsevišķas izvēlnes: **Rezervāciju kalendārs** un
**Produktu pārvaldība**. Kalendāra statusu leģendā rezervētās rezervācijas ir
pelēkas un apstiprinātās zaļas. Statusa teksts redzams arī rezervāciju sarakstā.
Iepriekšējā versijā saglabātās pabeigtās rezervācijas tiek attēlotas kā
apstiprinātas; to iekšējās atslēgas nav masveidā pārrakstītas. Rediģējot
šādu rezervāciju, izvēlas vienu no abiem aktuālajiem statusiem. Iepriekš
atceltās rezervācijas ir atsevišķā vēstures sadaļā, neaizņem datumus un
netiek piedāvātas aktīvo statusu izvēlnē.

**Klienta numurs** atlasa klienta kodu, piemēram, `GS-0001`. Tas darbojas
kopā ar produkta filtru mēneša/nedēļas kalendārā, aktīvo rezervāciju sarakstā
un vēstures sadaļā. **Notīrīt atlasi** atjauno visus produktus un klientus.
Filtri nemaina rezervācijas vai to pieejamības aprēķinu.

Panelim izmantoti versēti CSS un JavaScript URL, lai pēc atjauninājuma
pārlūks neizmantotu iepriekšējo failu kešatmiņu. Pēc PR apvienošanas un
Pages publicēšanas pārlādē pašu paneļa lapu; ja saglabājusies vecā HTML
versija, veic pilnu pārlādi (Ctrl+Shift+R vai Cmd+Shift+R).

**Produktu pārvaldība** rāda produktu sarakstu ar cenu, rezervāciju un
iepriekšējo aizņemto dienu skaitu. Poga **Pievienot produktu** atver tukšu
formu; produkts netiek saglabāts, kamēr nav nospiests **Izveidot produktu**.
**Rediģēt** atver izvēlētā produkta nosaukumu, aprakstu, cenu, attēla ceļu un
iepriekšējos bloķējumus. **Atcelt** aizver redaktoru bez saglabāšanas.
**Dzēst produktu** prasa apstiprinājumu. Produkta dzēšana ar rezervācijām vai
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

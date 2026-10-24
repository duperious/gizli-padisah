# Savaş Konseyi — Proje Durumu ve Devir Teslim

Bu dosya projenin canlı devir teslim belgesidir. Yeni bir özellik, hata
düzeltmesi, refactor, test/altyapı/deploy değişikliği yapıldığında **aynı iş
içinde** bu dosya güncellenir. Ayrıntılı çalışma kuralları `AGENTS.md` içindedir.

## Son güncelleme

- **Tarih:** 24 Ekim 2026
- **Son doğrulanan özellik sürümü:** `99a0375` — Savaş Konseyi yeniden teması
- **Bu güncellemenin konusu:** Gizli Padişah kimliğinin Savaş Konseyi kimliğine
  dönüştürülmesi, rollerin ve tüm ürün dilinin yeniden adlandırılması
- **Durum:** Yerel doğrulama, GitHub Actions dağıtımı ve canlı duman testi
  tamamlandı
- **Canlı adres:** https://duperious.github.io/gizli-padisah/

## Ürün özeti

Savaş Konseyi, Secret Hitler mekaniğinden esinlenen, tarayıcıdan oynanan çevrim
içi gizli rol oyunudur. 5–10 oyuncu bir odada toplanır. Roller gizli dağıtılır;
Barışçıllar Konsey'i korumaya, Saldırganlar ise Savaş Kararları'nı yürürlüğe
sokup Savaş Çığırtkanı'nı Savaş Bakanı koltuğuna oturtmaya çalışır.

Oda sahibi eksik oyuncuları botlarla tamamlayabilir. Tek bir insan ve dört botla
5 kişilik oyun başlatılabilir; botlar sıraları geldiğinde otomatik oynar.

### Kazanma koşulları

- **Barışçıllar:** 5 Barış Kararı geçirir veya Savaş Çığırtkanı'nı Tutuklama ile
  Konsey'den çıkarır.
- **Saldırganlar:** 6 Savaş Kararı geçirir veya 3 Savaş Kararı'ndan sonra Savaş
  Çığırtkanı'nı Savaş Bakanı yapar.

### Rol dağılımı

| Oyuncu | Saldırgan | Savaş Çığırtkanı | Barışçıl |
| ------ | --------- | ---------------- | -------- |
| 5–6    | 1         | 1                | 3–4      |
| 7–8    | 2         | 1                | 4–5      |
| 9–10   | 3         | 1                | 5–6      |

Savaş Çığırtkanı 5–6 kişilik oyunda Saldırganları tanır. 7 ve üzeri oyunda Savaş
Çığırtkanı kimseyi tanımaz; Saldırganlar ise Savaş Çığırtkanı'nı ve birbirini
tanır.

### Yetki tablosu

| Oyuncu | 1. Savaş Kararı | 2. Savaş Kararı | 3. Savaş Kararı | 4. Savaş Kararı | 5. Savaş Kararı |
| ------ | --------------- | --------------- | --------------- | --------------- | --------------- |
| 5–6    | —               | —               | İstihbarat      | Tutuklama       | Tutuklama       |
| 7–8    | —               | Soruşturma      | Özel Seçim      | Tutuklama       | Tutuklama       |
| 9–10   | Soruşturma      | Soruşturma      | Özel Seçim      | Tutuklama       | Tutuklama       |

5 Savaş Kararı sonrası veto açılır. Veto kabul edilirse iki karar atılır ve seçim
sayacı artar.

## Mimari

Uygulama sunucusuzdur ve **host-authoritative** çalışır. Tek doğruluk kaynağı
oda sahibinin tarayıcısındaki `GameState` nesnesidir.

```text
Oda sahibi tarayıcı
  ├─ src/game/engine.ts      → saf kural motoru ve GameState
  ├─ src/game/bots.ts        → saf bot kararı (nextBotMove)
  ├─ src/net/session.ts      → PeerJS host, bot zamanlayıcısı, reconnect
  └─ src/game/view.ts        → oyuncuya özel projeksiyon (project)

Misafir tarayıcılar
  └─ PeerJS/WebRTC → host → yalnızca kendi projeksiyonlarını alır
```

### Katmanlar

- `src/game/` — saf motor, tipler, Türkçe etiketler, bot karar motoru ve
  istemci projeksiyonu. DOM, ağ veya PeerJS bilmez.
- `src/net/` — PeerJS oda/istemci oturumları, protokol, yerel depolama,
  yeniden bağlanma ve host bot zamanlayıcısı.
- `src/ui/` — ana sayfa, lobi, oyun ekranı, kurallar ve ortak bileşenler.
- `public/` ve `vite.config.ts` — PWA manifesti, ikonlar ve service worker.
- `tests/` — motor ve bot davranışı testleri.

### Ağ ve bağlantı akışı

1. Host, PeerJS üzerinden oda koduyla bir peer açar.
2. Misafir oda kodu veya davet linkiyle bağlanır; `hello` mesajında ad, avatar
   ve varsa yeniden bağlanma token'ını gönderir.
3. Host her aksiyonu `apply()` ile doğrular ve güncel projeksiyonu tüm
   istemcilere yayınlar.
4. İstemci token'ı `localStorage` üzerinde saklanır; sayfa yenilenirse aynı
   oyuncu olarak geri dönebilir.
5. Host oyun durumunu en fazla 6 saat `localStorage` üzerinde tutar. Host
   sekmesi kapanırsa oda dağılır.

### Gizlilik sınırı

- `project()` oyun bitmeden diğer oyuncuların rollerini `null` olarak gönderir.
- Eller yalnızca ilgili Konsey Başkanı'na veya Savaş Bakanı'na, soruşturma
  sonucu yalnızca Konsey Başkanı'na gösterilir.
- Oylar sonuç açıklanana kadar değerleriyle yayınlanmaz.
- Host teknik olarak geliştirici araçlarıyla tüm rolleri görebilir; bu,
  sunucusuz modelin bilinçli bir sınırıdır.

## Bot oyuncular

Botlar host tarafında yerel oyunculardır (`isBot: true`). PeerJS bağlantısı
açmazlar, sohbet etmezler ve her zaman `connected: true`, `ready: true` olarak
tutulurlar.

### Lobi davranışı

- Bot ekleme/çıkarma yalnızca oda sahibine açıktır ve yalnızca lobide yapılır.
- Oda sahibi hedef kadroyu 5–10 arasında seçer; eksik koltuklar tek seferde
  botlarla doldurulur.
- Botlar isim ve avatar alır; oyuncu kartında **Bot** rozeti görünür.
- Oyun başladıktan sonra bot eklenemez veya çıkarılamaz.
- Tekrar oyunda botlar hazır kalır; insan oyuncular yeniden hazır olur.

### Bot karar motoru

`src/game/bots.ts` içindeki `nextBotMove(state)` saftır; sadece bir hamle veya
`null` döndürür. Host oturumu bu hamleyi mevcut `apply()` fonksiyonuyla uygular.
Botlar için ayrı bir kural motoru yoktur.

Botlar şu aşamaları otomatik oynar:

- Savaş Bakanı adayı gösterme
- Evet/Hayır oyu verme
- Konsey Başkanı olarak üç karardan birini eleme
- Savaş Bakanı olarak kalan iki karardan birini yürürlüğe koyma
- Veto isteme ve veto yanıtı verme
- Soruşturma, İstihbarat, Özel Seçim ve Tutuklama hedefi seçme
- Yetki sonucunu onaylama (`ack`)

Bot kararları deterministik bir karışımla üretilir; aynı durumda öngörülebilir ve
test edilebilir. Botlar yalnızca kendi rollerinin bildiği bilgiyi kullanır:

- Barışçıl bot kimseyi tanımaz.
- Saldırgan bot Savaş Çığırtkanı'nı ve diğer Saldırganları tanır.
- Savaş Çığırtkanı botu 5–6 oyunda Saldırganları tanır, 7+ oyunda kimseyi
  tanımaz.
- Soruşturma sonuçları sonraki turlarda hatırlanmaz.

### Zamanlayıcı

Host oturumu `scheduleBots()` ile sıradaki bot hamlesini planlar. Gecikmeler
lobi temposuna göre ölçeklenir:

| Tempo  | Bot gecikmesi |
| ------ | ------------- |
| Sakin  | 1600–2400 ms  |
| Normal | 950–1600 ms   |
| Hızlı  | 550–1000 ms   |

Zamanlayıcı anahtarı `faz + tur + aday + oyuncu + aksiyon` bilgisinden oluşur.
Sohbet veya ilgisiz snapshot değişiklikleri bekleyen bot zamanlayıcısını
sıfırlamaz. Host sayfası yenilendiğinde botlar bağlı kabul edilir ve zamanlayıcı
yeniden başlar.

## Özellik envanteri

- Oda kodu ve tek tık davet linkiyle katılım
- Masa düzenli oyun ekranı: oyuncu koltukları, büyük Savaş/Barış Kararları
  tahtası, deste/atık göstergeleri ve Konsey Defteri paneli
- 5–10 oyuncu, gizli rol dağıtımı ve rol reveal ekranı
- Botlarla eksik kadro tamamlama ve hedef oyuncu sayısı seçimi
- Konsey Başkanı/Savaş Bakanı seçimi, oylama, seçim sayacı ve dönem sınırları
- 6 Barış Kararı / 11 Savaş Kararı'ndan oluşan deste ve yeniden karıştırma
- Soruşturma, İstihbarat, Özel Seçim ve Tutuklama
- 5 Savaş Kararı sonrası veto
- Savaş Çığırtkanı'nın Savaş Bakanı seçilmesi veya tutuklanmasıyla biten oyun
- Gerçek zamanlı sohbet, oyun günlüğü ve sistem mesajları
- Yeniden bağlanma ve host yenileme desteği
- Sesli tempo ayarı (`Sakin`, `Normal`, `Hızlı`)
- Kurallar ekranı
- Telefona kurulabilen PWA ve çevrimdışı uygulama kabuğu
- Barışçıllar için mavi, Saldırganlar için kırmızı takım paleti
- `SK` monogramlı marka rozeti ve PWA ikonları

## Doğrulama durumu

Savaş Konseyi yeniden teması sonrası doğrulama:

- `npx tsc --noEmit` — geçti
- `npm test` — 61 test geçti
- `npm run build` — geçti
- `npm run docs:check` — geçti
- `npm run icons` — PWA ve favicon PNG'leri `SK` kaynağından yeniden üretildi
- Playwright duman testi — ana sayfa, lobi, oyun başlangıcı, bot akışı ve
  masa düzeni; 5 ve 10 oyuncu, mobil/masaüstü genişlikleri
- GitHub Actions — run `40108305859` başarılı: doküman kontrolü, 61 test, üretim
  derlemesi ve GitHub Pages dağıtımı
- Canlı site — 24 Ekim 2026'da ana sayfa, lobi, 4 bot ekleme, oyun başlatma,
  oylama, masa düzeni ve mavi Barışçıl / kırmızı Saldırgan görünümü doğrulandı;
  390 ve 1440 px genişlikte yatay taşma ve sayfa hatası yok

Önceki sürüm doğrulaması (masa düzeni, `e7c6f5b`):

- Playwright duman testleri — 1440×1000 masaüstü ve 390×844 mobil; 5 ve 10
  oyunculu koltuk düzeni, hedef seçimi, oylama ve karar eleme ekranı; yatay
  taşma yok
- Solo host + 4 bot, otomatik aday gösterme/oylama, yasama zinciri, host
  yenileme ve devam etme
- GitHub Actions run `40092468239` başarılı

Dokümantasyon kontrolü:

```bash
npm run docs:check
```

CI, kaynak dosyalar değişip `docs/PROJECT_STATE.md` değişmediyse dağıtımı
durdurur.

## Bilinen sınırlamalar

- Oda sahibinin sekmesi açık kalmalıdır; gerçek bir sunucu yoktur.
- Host, geliştirici araçlarıyla tüm rolleri görebilir.
- Botlar sohbet etmez ve soruşturma sonuçlarını sonraki turlarda hatırlamaz.
- Botlar gelişmiş strateji, ittifak takibi veya insan benzeri pazarlık yapmaz.
- PeerJS bağlantısı kısıtlı ağlarda STUN/TURN nedeniyle kurulamayabilir.
- PWA `autoUpdate` kullanır; yine de eski açık sekmelerde yeni sürümü görmek
  için sayfayı yenilemek gerekebilir.
- Oda durumu 6 saatten sonra yerel depodan temizlenir.
- Uygulama içi yönlendirme hash tabanlıdır; GitHub Pages alt diziniyle uyumludur.

## Önemli kararlar

- **Sunucusuz kal:** Ücretli backend, Cloudflare Workers veya yeni sunucu
  eklenmeyecek. Dağıtım GitHub Pages'te sürecek.
- **Tek motor:** Botlar da insanlar da aynı `apply()` kural motorunu kullanır.
- **Host otoritesi:** Roller ve gerçek durum yalnızca host'ta tutulur;
  istemciler projeksiyon alır.
- **Adil bot bilgisi:** Botlar gizli rolleri veya diğer oyuncuların ellerini
  göremez.
- **Türkçe ürün, İngilizce anahtar:** Arayüz Türkçe; motor anahtarları İngilizce.
- **Dokümantasyon zorunlu:** Her anlamlı değişiklik aynı iş içinde bu dosyayı
  günceller; CI bunu denetler.
- **Kimlik:** Görünen ad **Savaş Konseyi**; marka rozeti `SK`; canlı URL ve depo
  adı geriye dönük uyumluluk için `gizli-padisah` olarak kalır.

## Dosya haritası

| Yol | Görev |
| --- | --- |
| `src/game/engine.ts` | Saf kural motoru, bot ekleme/çıkarma, faz akışı |
| `src/game/bots.ts` | Saf bot karar motoru (`nextBotMove`) |
| `src/game/types.ts` | `GameState`, `Player.isBot`, aksiyon tipleri |
| `src/game/view.ts` | Oyuncuya özel `ClientState` projeksiyonu |
| `src/game/labels.ts` | Türkçe rol, faz, yetki, tempo ve kazanma etiketleri |
| `src/game/grammar.ts` | Oyuncu adlarına gelen Türkçe belirtme, yönelme ve tamlayan ekleri |
| `src/net/session.ts` | Host/istemci oturumları, PeerJS, bot zamanlayıcısı |
| `src/net/protocol.ts` | Host/istemci mesajları ve aksiyon allowlist'i |
| `src/net/storage.ts` | Profil, token ve host durumu için `localStorage` |
| `src/ui/Lobby.tsx` | Lobi, bot yönetimi ve hedef kadro seçimi |
| `src/ui/Game.tsx` | Oyun ekranı, masa düzeni, oyuncu seçimi ve faz arayüzleri |
| `src/ui/parts.tsx` | Ortak kartlar, oyuncu koltukları, Karar tahtası ve paneller |
| `src/ui/Rules.tsx` | Kurallar ekranı |
| `src/index.css` | Tema, masa, koltuk, tahta ve karar kartı stilleri |
| `public/icon.svg` | `SK` marka rozetinin PWA ikon kaynağı |
| `scripts/icons.mjs` | SVG kaynağından PNG ikonları üretir |
| `tests/engine.test.ts` | Motor, gizli bilgi, zamanlayıcı ve bot lobisi testleri |
| `tests/bots.test.ts` | Bot kararları ve tam oyun simülasyonu |
| `tests/grammar.test.ts` | Türkçe ad ekleri testleri |
| `scripts/check-docs.mjs` | Dokümantasyon güncelleme denetimi |
| `.github/workflows/deploy.yml` | Test, doküman kontrolü, build ve Pages dağıtımı |
| `AGENTS.md` | Ajan çalışma kuralları ve mimari sınırlar |
| `docs/PROJECT_STATE.md` | Bu devir teslim belgesi |

## Son değişiklik günlüğü

### 24 Ekim 2026 — Savaş Konseyi yeniden teması

- Gizli Padişah kimliği **Savaş Konseyi** olarak yeniden temalandırıldı.
  Roller **Barışçıl**, **Saldırgan** ve **Savaş Çığırtkanı**; takımlar
  **Barışçıllar** ve **Saldırganlar** oldu.
- Makamlar **Konsey Başkanı** ve **Savaş Bakanı**; kararlar **Barış Kararı** ve
  **Savaş Kararı**; yetkiler **Soruşturma**, **Özel Seçim**, **İstihbarat** ve
  **Tutuklama** olarak adlandırıldı.
- Tüm kullanıcı metinleri, motor logları, hata mesajları, kurallar, README,
  ajan dokümanları ve test adları yeni terminolojiye taşındı.
- Oyuncu adlarına gelen belirtme, yönelme ve tamlayan ekleri Türkçe ünlü
  uyumuna göre üretilir; "Bilge Elçi'yi", "Poyraz Nişancı'ya" gibi yazımlar
  düzeltildi.
- Barışçıllar mavi palete geçirildi (`#2f5d8a` / `#5b8fc7`); marka rozeti `SK`,
  sayfa başlığı, PWA manifesti ve ikon kaynakları güncellendi. PNG ikonlar
  `npm run icons` ile yeniden üretildi.
- Deste belgeleri **6 Barış Kararı / 11 Savaş Kararı** olarak düzeltildi.
- Oyun ekranına geçişte sayfa başına dönülür; 10 oyunculu mobil lobide aşağı
  kaydırılmış olsa bile oyun koltuklardan başlar.
- Oyun kuralları, bot kararları, ağ protokolü ve gizli rol projeksiyonu
  değiştirilmedi; yalnızca kimlik, metin ve görsel tema yenilendi.
- Doğrulama: `tsc`, 61 test, üretim derlemesi ve doküman kontrolü geçti; GitHub
  Actions dağıtımı ve canlı tarayıcı duman testi de tamamlandı.

### 24 Ekim 2026 — Oyun arayüzü masa düzeni

- Oyun ekranı masa merkezli düzene taşındı: üstte oyuncu koltukları, ortada
  büyük Savaş/Barış Kararları tahtası, altta faz kararı ve sağda Konsey Defteri
  paneli.
- `Board` iki ayrı karar rayı, dolan koltuklar, yetki etiketleri, deste/atık
  yığınları ve seçim sayacıyla yeniden tasarlandı.
- `PlayerCard` oyuncu koltuklarına dönüştürüldü; Konsey Başkanı, Savaş Bakanı,
  aday, bot, sahip, oy verdi/oy vermedi ve ölü/kopuk durumları tek bakışta
  görünüyor.
- `src/index.css` içine masa yüzeyi, koltuk, karar rayı, deste yığını ve karar
  kartı bileşen stilleri eklendi; mobilde 5 ve 10 oyuncu düzeni doğrulandı.
- Ana sayfa ve lobi korundu. Motor, bot kararları, ağ protokolü ve gizli rol
  projeksiyonu değiştirilmedi.
- Değişiklik GitHub Actions ile yayınlandı ve canlı oyun ekranı Playwright ile
  doğrulandı.

### 24 Ekim 2026 — Dokümantasyon sistemi

- `AGENTS.md` eklendi: mimari sınırlar, bot kuralları, doğrulama ve zorunlu
  dokümantasyon protokolü.
- `docs/PROJECT_STATE.md` eklendi: canlı durum, mimari, bot tasarımı, test
  durumu, sınırlamalar ve devir teslim bilgisi.
- `scripts/check-docs.mjs` ve `npm run docs:check` eklendi.
- CI'a doküman kontrolü eklendi: kaynak değişip bu dosya güncellenmezse
  dağıtım durur.
- `README.md` geliştirici notlarına bu belgelerin bağlantıları eklendi.

### 24 Ekim 2026 — Bot oyuncular (`062e268`)

- Lobide bot ekleme/çıkarma ve 5–10 arası hedef kadro seçimi.
- Botlar için aday gösterme, oylama, karar eleme/yürürlüğe koyma, veto ve tüm
  yetkilerde otomatik karar.
- Host tarafında bot zamanlayıcısı, tempo gecikmeleri ve host yenileme sonrası
  devam.
- Bot rozetleri, hazır durumu ve tekrar oyunda hazır kalma.
- 59 test ve tarayıcı duman testleri.

### 23 Ekim 2026 — İlk sürüm

- Çevrim içi oda, gizli roller, oylama, kararlar, yetkiler, veto ve kazanma
  koşulları.
- Sohbet, oyun günlüğü, yeniden bağlanma ve PWA.
- GitHub Pages dağıtımı.

## Sıradaki işler

- Botlar için isteğe bağlı daha güçlü strateji/soruşturma hafızası.
- Host oturumu ve bot zamanlayıcısı için daha fazla birim testi.
- PWA sürüm güncellemesi için kullanıcıya görünür bir bildirim.
- Yeni oyuncu deneyimi için kısa bir ilk tur rehberi.

## Değişiklik yapınca güncelleme rehberi

| Değişiklik türü | Zorunlu güncelleme |
| --- | --- |
| Yeni özellik / davranış | `docs/PROJECT_STATE.md` + gerekirse `README.md` |
| Hata düzeltmesi | `docs/PROJECT_STATE.md` değişiklik günlüğü |
| Refactor / mimari | `docs/PROJECT_STATE.md` + `AGENTS.md` |
| Komut / CI / deploy | `docs/PROJECT_STATE.md` + `AGENTS.md` + `README.md` |
| Test sayısı / doğrulama | `docs/PROJECT_STATE.md` doğrulama durumu |
| Kullanıcıya görünen metin | `README.md` + gerekirse `docs/PROJECT_STATE.md` |

Commit öncesi:

```bash
npx tsc --noEmit
npm test
npm run build
npm run docs:check
```

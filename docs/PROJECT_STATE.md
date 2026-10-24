# Gizli Padişah — Proje Durumu ve Devir Teslim

Bu dosya projenin canlı devir teslim belgesidir. Yeni bir özellik, hata
düzeltmesi, refactor, test/altyapı/deploy değişikliği yapıldığında **aynı iş
içinde** bu dosya güncellenir. Ayrıntılı çalışma kuralları `AGENTS.md` içindedir.

## Son güncelleme

- **Tarih:** 24 Ekim 2026
- **Son doğrulanan özellik sürümü:** `062e268` — Bot oyuncular
- **Bu güncellemenin konusu:** Zorunlu proje dokümantasyonu ve CI doküman kontrolü
- **Durum:** Aktif geliştirme; canlı sürüm GitHub Pages'te yayında
- **Canlı adres:** https://duperious.github.io/gizli-padisah/

## Ürün özeti

Gizli Padişah, Secret Hitler mekaniğinden esinlenen Türk temalı, tarayıcıdan
oynanan çevrim içi gizli rol oyunudur. 5–10 oyuncu bir odada toplanır. Roller
gizli dağıtılır; Islahatçılar Divan'ı korumaya, Saraylılar ise Fermanları
yürürlüğe sokup Padişah'ı iktidara taşımaya çalışır.

Oda sahibi eksik oyuncuları botlarla tamamlayabilir. Tek bir insan ve dört botla
5 kişilik oyun başlatılabilir; botlar sıraları geldiğinde otomatik oynar.

### Kazanma koşulları

- **Islahatçılar:** 5 Islahat fermanı geçirir veya Padişah'ı Kalebend ile
  Divan'dan çıkarır.
- **Saraylılar:** 6 Ferman geçirir veya Padişah Vezir seçilir.

### Rol dağılımı

| Oyuncu | Saraylı | Padişah | Islahatçı |
| ------ | ------- | ------- | --------- |
| 5–6    | 1       | 1       | 3–4       |
| 7–8    | 2       | 1       | 4–5       |
| 9–10   | 3       | 1       | 5–6       |

Padişah 5–6 kişilik oyunda Saraylıları tanır. 7 ve üzeri oyunda Padişah
kimseyi tanımaz; Saraylılar ise Padişah'ı ve birbirini tanır.

### Yetki tablosu

| Oyuncu | 1. Ferman | 2. Ferman | 3. Ferman | 4. Ferman | 5. Ferman |
| ------ | --------- | --------- | --------- | --------- | --------- |
| 5–6    | —         | —         | İstihbarat| Kalebend  | Kalebend  |
| 7–8    | —         | Teftiş    | Ferman-ı Şahane | Kalebend | Kalebend |
| 9–10   | Teftiş    | Teftiş    | Ferman-ı Şahane | Kalebend | Kalebend |

5 Ferman sonrası veto açılır. Veto kabul edilirse iki ferman atılır ve seçim
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
- Eller yalnızca ilgili Reis/Vezir'e, teftiş sonucu yalnızca Reis'e gösterilir.
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

### Karar motoru

`src/game/bots.ts` içindeki `nextBotMove(state)` saftır; sadece bir hamle veya
`null` döndürür. Host oturumu bu hamleyi mevcut `apply()` fonksiyonuyla uygular.
Botlar için ayrı bir kural motoru yoktur.

Botlar şu aşamaları otomatik oynar:

- Reis adayı gösterme
- Evet/Hayır oyu verme
- Reis olarak üç fermandan birini eleme
- Vezir olarak kalan iki fermandan birini yürürlüğe koyma
- Veto isteme ve veto yanıtı verme
- Teftiş, İstihbarat, Ferman-ı Şahane ve Kalebend hedefi seçme
- Yetki sonucunu onaylama (`ack`)

Kararlar deterministik bir karışımla üretilir; aynı durumda öngörülebilir ve
test edilebilir. Botlar yalnızca kendi rollerinin bildiği bilgiyi kullanır:

- Islahatçı bot kimseyi tanımaz.
- Saraylı bot Padişah'ı ve diğer Saraylıları tanır.
- Padişah botu 5–6 oyunda Saraylıları tanır, 7+ oyunda kimseyi tanımaz.
- Teftiş sonuçları sonraki turlarda hatırlanmaz.

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
- 5–10 oyuncu, gizli rol dağıtımı ve rol reveal ekranı
- Botlarla eksik kadro tamamlama ve hedef oyuncu sayısı seçimi
- Reis/Vezir seçimi, oylama, seçim sayacı ve dönem sınırları
- 6 Islahat / 11 Ferman kartından oluşan deste ve yeniden karıştırma
- Teftiş, İstihbarat, Ferman-ı Şahane ve Kalebend
- 5 Ferman sonrası veto
- Padişah'ın Vezir seçilmesi veya Kalebend ile öldürülmesiyle biten oyun
- Gerçek zamanlı sohbet, oyun günlüğü ve sistem mesajları
- Yeniden bağlanma ve host yenileme desteği
- Sesli tempo ayarı (`Sakin`, `Normal`, `Hızlı`)
- Kurallar ekranı
- Telefona kurulabilen PWA ve çevrimdışı uygulama kabuğu

## Doğrulama durumu

Son doğrulanan özellik sürümü `062e268` için:

- `npx tsc --noEmit` — geçti
- `npm test` — 59 test geçti
- `npm run build` — geçti
- `npm run docs:check` — geçti
- Playwright duman testleri — solo host + 4 bot, otomatik aday gösterme/oylama,
  yasama zinciri, host yenileme ve devam etme
- GitHub Actions — test, build ve GitHub Pages dağıtımı başarılı
- Canlı site — ana sayfa, bot ekleme, oyun başlatma ve bot oy verme doğrulandı

Dokümantasyon kontrolü bu sürümle birlikte eklendi:

```bash
npm run docs:check
```

CI, kaynak dosyalar değişip `docs/PROJECT_STATE.md` değişmediyse dağıtımı
durdurur.

## Bilinen sınırlamalar

- Oda sahibinin sekmesi açık kalmalıdır; gerçek bir sunucu yoktur.
- Host, geliştirici araçlarıyla tüm rolleri görebilir.
- Botlar sohbet etmez ve teftiş sonuçlarını sonraki turlarda hatırlamaz.
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

## Dosya haritası

| Yol | Görev |
| --- | --- |
| `src/game/engine.ts` | Saf kural motoru, bot ekleme/çıkarma, faz akışı |
| `src/game/bots.ts` | Saf bot karar motoru (`nextBotMove`) |
| `src/game/types.ts` | `GameState`, `Player.isBot`, aksiyon tipleri |
| `src/game/view.ts` | Oyuncuya özel `ClientState` projeksiyonu |
| `src/game/labels.ts` | Türkçe rol, faz, yetki ve tempo etiketleri |
| `src/net/session.ts` | Host/istemci oturumları, PeerJS, bot zamanlayıcısı |
| `src/net/protocol.ts` | Host/istemci mesajları ve aksiyon allowlist'i |
| `src/net/storage.ts` | Profil, token ve host durumu için `localStorage` |
| `src/ui/Lobby.tsx` | Lobi, bot yönetimi ve hedef kadro seçimi |
| `src/ui/Game.tsx` | Oyun ekranı ve faz arayüzleri |
| `src/ui/Rules.tsx` | Kurallar ekranı |
| `tests/engine.test.ts` | Motor, gizli bilgi, zamanlayıcı ve bot lobisi testleri |
| `tests/bots.test.ts` | Bot kararları ve tam oyun simülasyonu |
| `scripts/check-docs.mjs` | Dokümantasyon güncelleme denetimi |
| `.github/workflows/deploy.yml` | Test, doküman kontrolü, build ve Pages dağıtımı |
| `AGENTS.md` | Ajan çalışma kuralları ve mimari sınırlar |
| `docs/PROJECT_STATE.md` | Bu devir teslim belgesi |

## Son değişiklik günlüğü

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
- Botlar için aday gösterme, oylama, ferman eleme/yürürlüğe koyma, veto ve tüm
  yetkilerde otomatik karar.
- Host tarafında bot zamanlayıcısı, tempo gecikmeleri ve host yenileme sonrası
  devam.
- Bot rozetleri, hazır durumu ve tekrar oyunda hazır kalma.
- 59 test ve tarayıcı duman testleri.

### 23 Ekim 2026 — İlk sürüm

- Çevrim içi oda, gizli roller, oylama, fermanlar, yetkiler, veto ve kazanma
  koşulları.
- Sohbet, oyun günlüğü, yeniden bağlanma ve PWA.
- GitHub Pages dağıtımı.

## Sıradaki işler

- Botlar için isteğe bağlı daha güçlü strateji/teftiş hafızası.
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

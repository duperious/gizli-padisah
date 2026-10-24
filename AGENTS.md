# AGENTS.md

Bu dosya; OpenCode ve diğer kod ajanlarının bu depoda çalışırken uyması gereken
kuralları, proje mimarisini ve doğrulama adımlarını tanımlar. Türkçe ürün metni
ve kod içi İngilizce anahtarlar korunmalıdır.

## Zorunlu dokümantasyon protokolü

Her yeni özellik, hata düzeltmesi, refactor, test/altyapı/deploy değişikliği
**aynı iş içinde** dokümantasyonu güncellemelidir. Dokümantasyon güncellenmeden
iş tamamlanmış sayılmaz.

1. `docs/PROJECT_STATE.md` içindeki şu alanları güncelle:
   - `Son güncelleme`
   - `Son değişiklik günlüğü` (tarih ve kısa, somut bir madde)
   - Değişiklikten etkilenen mimari, özellik, dosya, test veya sınırlamalar
2. Komutlar, mimari kurallar, kritik dosyalar veya çalışma politikası değiştiyse
   bu dosyayı (`AGENTS.md`) da güncelle.
3. Kullanıcıya görünen bir davranış değiştiyse `README.md` içeriğini güncelle.
4. Commit öncesi `npm run docs:check` çalıştır.
5. CI, kaynak dosyalar değişip `docs/PROJECT_STATE.md` değişmediyse dağıtımı
   durdurur. Bu kontrolü atlamak yerine dokümanı gerçekten güncelle.

## Proje özeti

- Ürün: **Savaş Konseyi**, Secret Hitler mekaniğinden esinlenen savaş konseyi
  temalı, tarayıcıdan oynanan gizli rol oyunu.
- Canlı adres: https://duperious.github.io/gizli-padisah/
- Teknoloji: React 19, TypeScript, Vite, Tailwind CSS 4, PeerJS, Vitest, PWA.
- Oda modeli: Sunucusuz ve **host-authoritative**. Oyun durumu oda sahibinin
  tarayıcısında tutulur; misafirler PeerJS/WebRTC ile doğrudan host'a bağlanır.
- Botlar: Host tarafında yerel oyuncular olarak tutulur. PeerJS bağlantısı
  açmazlar; host'un zamanlayıcısı tarafından otomatik oynatılırlar.

## Komutlar

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # Vitest; tüm motor ve bot testleri
npx tsc --noEmit     # tip kontrolü
npm run build        # tsc + üretim derlemesi
npm run docs:check   # dokümantasyon güncelleme kontrolü
```

PWA alt dizin testi için `vite preview` yeterli değildir. Üretim derlemesini
`GITHUB_PAGES_BASE=/<repo>/` ile alıp `dist` klasörünü gerçek alt yol altında
sunmak gerekir.

## Mimari sınırlar

- `src/game/engine.ts` saf oyun motorudur. Ağ, DOM veya PeerJS bilmemelidir.
- `src/game/bots.ts` saf bot karar modülüdür; host oturumu dışında yan etki
  üretmemelidir.
- Bot hamleleri `apply()` üzerinden uygulanır. Botlar için ayrı, paralel bir
  kural motoru yazılmamalıdır.
- Oyun durumunun tek doğruluk kaynağı host'un `GameState` nesnesidir.
- Misafir istemciler yalnızca `src/game/view.ts` içindeki `project()` ile
  üretilen kişiselleştirilmiş görünümü alır. Roller istemciye sızdırılmamalıdır.
- Botlar host tarafında `connected: true`, `ready: true`, `isBot: true` olarak
  tutulur. Botları PeerJS bağlantısı gibi ele alma.
- Host yenilendiğinde botlar bağlı kalmalı ve bot zamanlayıcısı yeniden
  başlamalıdır. İnsan kopma temizliği botları kapsamamalıdır.
- Sohbet veya ilgisiz snapshot değişiklikleri bekleyen bot zamanlayıcısını
  sıfırlamamalıdır; zamanlayıcı anahtarı bu yüzden kullanılır.
- Oyun içi zorunlu aksiyonlar `StageOverlay` ile merkezî sahnede gösterilir.
  İzleyiciler masa altındaki karar panelini kullanmaya devam eder.
- Rol açılışı istemci tarafındadır; oyun motorunu veya faz süresini durdurmaz.
  Rol kartı kapandıktan sonra oyuncu mevcut faza devam eder.

## Bot davranışı

- Oda sahibi lobide 5–10 arasında hedef kadro seçer ve eksikleri botla
  tamamlayabilir. Tek insan + 4 bot geçerli bir 5 kişilik oyundur.
- Botlar aday gösterme, oy verme, karar eleme/yürürlüğe koyma, veto ve tüm
  yetkilerde otomatik karar verir.
- Botlar sohbet etmez.
- Botlar hile yapmamalıdır:
  - Barışçıl bot kimseyi tanımaz.
  - Saldırgan botlar Savaş Çığırtkanı'nı ve birbirini tanır.
  - Savaş Çığırtkanı 5–6 oyunda Saldırganları tanır; 7+ oyunda kimseyi tanımaz.
  - Botlar yalnızca kendi rolleri, elleri ve herkese açık tahta bilgisiyle karar
    verir.
- Bot gecikmeleri lobi temposuna (`sakin`, `normal`, `hizli`) göre ölçeklenir.

## Kritik dosyalar

- `src/game/engine.ts` — saf kural motoru, bot ekleme/çıkarma ve akış.
- `src/game/bots.ts` — bot karar mantığı (`nextBotMove`).
- `src/game/types.ts` — `Player.isBot`, aksiyon tipleri.
- `src/game/view.ts` — istemci projeksiyonu ve `isBot` alanı.
- `src/game/grammar.ts` — oyuncu adlarına gelen Türkçe ekler.
- `src/net/session.ts` — host oturumu, PeerJS, bot zamanlayıcısı, yeniden bağlanma.
- `src/net/protocol.ts` — istemci aksiyon allowlist'i.
- `src/ui/Lobby.tsx` — bot ekleme/çıkarma, hedef kadro seçimi.
- `src/ui/parts.tsx` — ortak oyuncu kartları ve bot rozeti.
- `tests/engine.test.ts` — kural motoru ve bot lobisi testleri.
- `tests/bots.test.ts` — bot kararları ve tam oyun simülasyonu.
- `tests/grammar.test.ts` — Türkçe ad ekleri testleri.
- `.github/workflows/deploy.yml` — test, doküman kontrolü, build ve Pages dağıtımı.

## Dil ve ürün kuralları

- Kullanıcıya görünen metinler Türkçe olmalı.
- Motor içi anahtarlar İngilizce kalmalı: `liberal`, `fascist`, `hitler`,
  `nominate`, `vote`, `discard` vb. Türkçe etiketler `src/game/labels.ts` içinde.
- Oyuncu adlarına gelen belirtme, yönelme ve tamlayan ekleri `src/game/grammar.ts`
  üzerinden üretilmeli; sabit `'i` / `'e` ekleri kullanılmamalı.
- Temel terimler korunmalı: Savaş Konseyi, Savaş Çığırtkanı, Barışçıllar,
  Saldırganlar, Barış Kararı, Savaş Kararı, Konsey Başkanı, Savaş Bakanı,
  Tutuklama, Soruşturma, Özel Seçim.
- Ücretli backend, Cloudflare Workers veya yeni bir sunucu eklenmemeli. Dağıtım
  GitHub Pages üzerinde kalmalı.
- Gizli roller istemci görünümünde oyun bitmeden açılmamalı.

## Doğrulama

Bir değişiklikten sonra en az şunlar çalıştırılmalı:

```bash
npx tsc --noEmit
npm test
npm run build
npm run docs:check
```

Kullanıcıya görünen akış değiştiyse ayrıca gerçek tarayıcıda duman testi yap:
oda kur, bot ekle, oyunu başlat, botların aday gösterdiğini/oy verdiğini gör,
gerekirse host sayfasını yenileyip botların devam ettiğini doğrula. Canlı site
testi için `https://duperious.github.io/gizli-padisah/` kullanılabilir.

## Yayın

`main` dalına push edildiğinde `.github/workflows/deploy.yml` çalışır. Akış:

1. Bağımlılıkları kurar.
2. Dokümantasyon kontrolünü ve testleri çalıştırır.
3. `GITHUB_PAGES_BASE=/<repo>/` ile derler.
4. `dist` klasörünü GitHub Pages'e yayınlar.

Dağıtımdan sonra canlı sitede en azından ana sayfa, bot ekleme, oyun başlatma ve
bot oy verme akışını doğrula.

## Bilinen sınırlamalar

- Oda sahibinin sekmesi açık kalmalıdır; gerçek bir sunucu yoktur.
- Host, geliştirici araçlarıyla tüm rolleri görebilir. Bu mimarinin bilinçli bir
  sınırıdır.
- Botlar sohbet etmez ve soruşturma sonuçlarını sonraki turlarda hatırlamaz.
- PeerJS bağlantısı kısıtlı ağlarda STUN/TURN nedeniyle kurulamayabilir.
- PWA önbelleği eski sürümü gösterebilir; canlı doğrulamada yeni bağlam kullan.

## Son durum

Güncel özellik ve doğrulama durumu için `docs/PROJECT_STATE.md` dosyasını oku.
Bu dosyayı kısa tut; ayrıntılı devir teslim bilgisi orada yaşar.

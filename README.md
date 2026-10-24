# Gizli Padişah

Divan-ı Hümayun'da geçen, tarayıcıdan oynanan çevrim içi gizli rol oyunu. 5–10
arkadaş bir oda kurar, rolleri gizli tutar ve Divan'ı ya Islahatçılar ya da
Saraylılar kazanır.

**Oyna:** https://duperious.github.io/gizli-padisah/

> Gizli Padişah, Secret Hitler oyunundan esinlenen ticari olmayan bir hayran
> projesidir. Orijinal oyunun görsel veya metin varlıkları kullanılmamıştır.

## Neler var?

- Oda kodu veya tek tık davet linkiyle katılım
- 5–10 oyuncu için gizli rol dağıtımı (Islahatçı, Saraylı, Padişah)
- Eksik kadroyu botlarla tamamlama: tek başına 4 botla oynayabilir veya hedef
  oyuncu sayısını 5–10 arasında seçebilirsin
- 6 Saray Fermanı / 11 Islahatçı fermanından oluşan deste
- Reis ve Vezir seçimi, dönem sınırları, seçim sayacı
- Teftiş, İstihbarat, Ferman-ı Şahane ve Kalebend yetkileri
- 5 Ferman sonrası veto
- Padişah'ın Vezir seçilmesi ve Padişah'ın kalebende gönderilmesiyle biten oyun
- Gerçek zamanlı sohbet, oyun günlüğü ve yeniden bağlanma
- Telefona kurulabilen PWA ve çevrimdışı uygulama kabuğu

## Nasıl oynanır?

1. Bir kişi **Divan Kur**'a basar ve oda kodunu arkadaşlarıyla paylaşır.
2. Herkes adını ve simgesini seçip odaya katılır. Yeterli oyuncu yoksa oda
   sahibi lobide **Botlar** bölümünden hedef kadroyu seçip eksikleri botlarla
   tamamlayabilir.
3. En az 5 kişi (botlar dahil) hazır olduğunda oda sahibi **Divan'ı Aç**'a basar.
4. Roller gizli dağıtılır. Kimse rol kartını göstermemelidir.
5. Her turda Reis bir Vezir adayı gösterir; Divan Evet/Hayır oyu verir.
6. Seçim geçerse Reis üç fermandan birini eler, Vezir kalan iki fermandan birini
   yürürlüğe koyar.
7. Islahatçılar 5 Islahat geçirirse veya Padişah'ı kalebende gönderirse kazanır.
   Saraylılar 6 Ferman geçirirse veya Padişah'ı Vezir yaparsa kazanır.

Botlar sıraları geldiğinde otomatik oynar; sohbet etmez ve rolleri gizli kalır.
Oda sahibi, oyun başlamadan önce istediği botu lobiden çıkarabilir.

Oyun içindeki **Kurallar** ekranında yetkiler, rol dağılımı ve dönem sınırları
ayrıntılı olarak anlatılır.

## Oda modeli ve gizlilik

Sunucusuz çalışır: oyun durumu oda sahibinin tarayıcısında tutulur, oyuncular
PeerJS/WebRTC üzerinden doğrudan oda sahibine bağlanır. Bu nedenle:

- Oda sahibinin sekmesi açık kalmalıdır. Sekme kapanırsa oda dağılır.
- Teknik olarak oda sahibi, tarayıcı geliştirici araçlarıyla tüm rolleri
  görebilir. Arayüz bunu göstermez; ama bu modelde oda sahibine tam güven
  gerekir.
- Oyun kodu veya bağlantı, odaya katılmak için yeterlidir. Rol gizliliği
  oyuncuların birbirine kartını göstermemesine dayanır.
- GitHub Pages yalnızca statik dosyaları sunar; oyun verisi bir sunucuya
  kaydedilmez. Oda durumu oda sahibinin tarayıcısında en fazla 6 saat saklanır.
- WebRTC bağlantısı için genel STUN/TURN sunucuları kullanılır. Kurumsal veya
  çok kısıtlı ağlarda bağlantı kurulamayabilir.

## Geliştirme

Gereksinimler: Node.js 22 veya daha yenisi, npm.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # motor ve bot testleri
npx tsc --noEmit   # tip kontrolü
npm run build      # tsc + üretim derlemesi
npm run preview    # derlemeyi yerelde sun
npm run docs:check # dokümantasyon güncelleme kontrolü
```

Proje yapısı:

- `src/game/` — saf oyun motoru, tipler, Türkçe etiketler, bot karar motoru ve
  istemciye özel durum projeksiyonu
- `src/net/` — PeerJS oda/istemci oturumları, protokol, yeniden bağlanma ve
  yerel depolama
- `src/ui/` — ana sayfa, lobi, oyun ekranı, kurallar ve ortak bileşenler
- `tests/engine.test.ts` — rol dağılımı, oylama, fermanlar, yetkiler, veto,
  bot lobisi ve kazanma koşulları testleri
- `tests/bots.test.ts` — bot kararları ve tam oyun otomasyonu testleri
- `AGENTS.md` — kod ajanları için mimari kurallar ve dokümantasyon protokolü
- `docs/PROJECT_STATE.md` — güncel proje durumu, devir teslim notları ve
  değişiklik günlüğü

## GitHub Pages'e yayınlama

Depo `main` dalına push edildiğinde `.github/workflows/deploy.yml` çalışır:

1. Bağımlılıkları kurar, dokümantasyon kontrolünü ve testleri çalıştırır.
2. `GITHUB_PAGES_BASE=/<depo-adı>/` ile derler.
3. `dist` klasörünü GitHub Pages'e yükler.

İlk yayın için deponun **Settings → Pages → Build and deployment → Source**
ayarını **GitHub Actions** yapmak gerekir. Proje siteleri
`https://<kullanıcı>.github.io/<depo-adı>/` altında yayınlanır; uygulama hash
tabanlı yönlendirme kullandığı için alt dizinde sorunsuz çalışır.

## Proje durumu ve geliştirici notları

Bu proje üzerinde çalışan herkesin (ve kod ajanlarının) şu iki belgeyi okuması
ve güncel tutması beklenir:

- [`AGENTS.md`](AGENTS.md) — mimari sınırlar, bot kuralları, komutlar ve zorunlu
  dokümantasyon protokolü.
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — canlı proje durumu, son
  doğrulama sonuçları, bilinen sınırlamalar ve değişiklik günlüğü.

Yeni bir özellik, hata düzeltmesi veya altyapı değişikliği yapıldığında
`docs/PROJECT_STATE.md` aynı iş içinde güncellenmelidir. `npm run docs:check`
kaynak dosyalar değişip proje durumu güncellenmediğinde hata verir; CI de aynı
kontrolü çalıştırarak eski dokümantasyonla dağıtım yapılmasını engeller.

## Lisans ve atıf

Kaynak kodu MIT lisansı altındadır (bkz. `LICENSE`). Oyun mekaniği ve ilham
kaynağı:

- **Secret Hitler**, Max Temkin, Mike Boxleiter, Tommy Maranges ve Mac
  Schubert tarafından tasarlandı; Goat, Wolf, & Cabbage tarafından yayımlandı.
- Secret Hitler, [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
  lisansı altında paylaşılmaktadır.
- Bu proje resmî değildir, Secret Hitler'in yayıncılarıyla bağlantılı değildir
  ve ticari amaç taşımaz. Orijinal oyunun görselleri, kartları veya metinleri
  kullanılmamıştır.

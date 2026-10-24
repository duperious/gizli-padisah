import { Bot, Crown, Eye, Gavel, ScrollText, Shield, Sparkles, Users, Vote } from "lucide-react";
import { Badge, Modal } from "./parts";
import { POWER_LABEL } from "../game/labels";

export function RulesContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-parchment-2">
      <p className="rounded-xl border border-gold/20 bg-gold/5 p-3 text-[13px] text-parchment-2">
        Divan-ı Hümayun toplanmıştır. Islahatçılar Divan'ı ayakta tutmaya, Saraylılar ise
        Padişah'ı Vezir koltuğuna oturtmaya çalışır. Roller gizli, oylar açıktır.
      </p>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Vote className="h-4 w-4 text-gold" /> Bir tur nasıl işler?
        </h3>
        <ol className="space-y-2">
          {[
            "Reis, Vezir adayını gösterir. Reis kendini aday gösteremez; son seçilen Vezir de aday olamaz.",
            "Herkes aynı anda Evet veya Hayır oyu verir. Çoğunluk Evet ise seçim geçer.",
            "Seçim düşerse sayaç bir artar. Sayaç 3 olursa destenin üstündeki ferman yürürlüğe girer ve dönem sınırları sıfırlanır.",
            "Seçim geçerse Reis 3 fermanı görür, 1'ini eler. Vezir kalan 2 ferman arasından 1'ini seçer.",
            "Ferman yürürlüğe girince tahtadaki yetki açılır ve Reis onu kullanır.",
            "Sonraki turda Reis sırası bir sonraki hayattaki oyuncuya geçer.",
          ].map((text, index) => (
            <li key={text} className="flex gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 text-[10px] font-semibold text-gold-2">
                {index + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Sparkles className="h-4 w-4 text-gold" /> Ferman yetkileri
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              icon: Eye,
              title: POWER_LABEL.investigate,
              text: "Bir oyuncunun hangi tarafta olduğunu öğrenirsin. Padişah da Saraylı görünür.",
            },
            {
              icon: Crown,
              title: POWER_LABEL.special,
              text: "Bir sonraki Reis'i sen seçersin. Sıra atlanır.",
            },
            {
              icon: ScrollText,
              title: POWER_LABEL.peek,
              text: "Destenin en üstündeki 3 fermanı görürsün. Sıraları değişmez.",
            },
            {
              icon: Gavel,
              title: POWER_LABEL.execute,
              text: "Bir oyuncuyu Divan'dan çıkarırsın. Padişah'ı bulursan Islahatçılar kazanır.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-gold/15 bg-ink/50 p-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-2">
                <Icon className="h-3.5 w-3.5" /> {title}
              </p>
              <p className="mt-1 text-[11px] text-muted">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {POWER_LABEL.execute} dışındaki yetkiler sonucu herkes görmez; yalnızca Reis görür.
        </p>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Bot className="h-4 w-4 text-gold" /> Botlarla oynamak
        </h3>
        <p className="rounded-lg border border-gold/15 bg-ink/50 p-2.5 text-[11px] leading-relaxed text-muted">
          Oda sahibi, lobide istediği oyuncu sayısını seçip eksik kadroyu botlarla
          tamamlayabilir. Botlar her zaman hazır olur ve Reis seçimi, oylama, ferman
          eleme, yetki kullanımı gibi sıraları geldiğinde otomatik oynar. Sohbet etmezler
          ve rolleri diğer oyuncular gibi gizli kalır. Yalnız başlasan bile 4 botla
          Divan'ı açabilirsin.
        </p>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Users className="h-4 w-4 text-gold" /> Kim kaç kişi?
        </h3>        <div className="overflow-hidden rounded-lg border border-gold/15">
          <table className="w-full text-[11px]">
            <thead className="bg-gold/10 text-gold-2">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">Oyuncu</th>
                <th className="px-2 py-1.5 text-left font-semibold">Islahatçı</th>
                <th className="px-2 py-1.5 text-left font-semibold">Saraylı</th>
                <th className="px-2 py-1.5 text-left font-semibold">Padişah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10 text-parchment-2">
              {[
                ["5–6", "3–4", "1", "1"],
                ["7–8", "4–5", "2", "1"],
                ["9–10", "5–6", "3", "1"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index} className="px-2 py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Shield className="h-4 w-4 text-gold" /> Tahtadaki yetkiler
        </h3>
        <div className="space-y-1.5 text-[11px]">
          {[
            ["5–6 oyuncu", "3. İstihbarat · 4. Kalebend · 5. Kalebend"],
            ["7–8 oyuncu", "2. Teftiş · 3. Ferman-ı Şahane · 4–5. Kalebend"],
            ["9–10 oyuncu", "1–2. Teftiş · 3. Ferman-ı Şahane · 4–5. Kalebend"],
          ].map(([count, powers]) => (
            <div
              key={count}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/10 bg-ink/40 px-2.5 py-1.5"
            >
              <span className="font-semibold text-gold-2">{count}</span>
              <span className="text-muted">{powers}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Crown className="h-4 w-4 text-gold" /> Nasıl kazanılır?
        </h3>
        <div className="space-y-1.5 text-[11px]">
          <p>
            <Badge tone="liberal">Islahatçılar</Badge> 5 Islahat geçirirse ya da Padişah'ı
            kalebende gönderirse kazanır.
          </p>
          <p>
            <Badge tone="fascist">Saraylılar</Badge> 6 Ferman geçirirse ya da 3 Ferman'dan
            sonra Padişah'ı Vezir yaparsa kazanır.
          </p>
          <p className="text-muted">
            Beşinci Ferman'dan sonra veto açılır: Vezir iki fermanı da iade edebilir; Reis kabul
            ederse seçim sayacı artar.
          </p>
        </div>
      </section>

      <p className="border-t border-gold/10 pt-3 text-[10px] leading-relaxed text-muted/70">
        Bu oyun, Max Temkin ve arkadaşlarının CC BY-NC-SA 4.0 lisanslı Secret Hitler oyunundan
        esinlenen, ticari olmayan bir hayran projesidir. Tüm metin ve görseller bu proje için
        yeniden yazılmıştır. Orijinal oyun:{" "}
        <a
          href="https://www.secrethitler.com"
          target="_blank"
          rel="noreferrer"
          className="text-gold/80 underline decoration-gold/30 underline-offset-2"
        >
          secrethitler.com
        </a>
        .
      </p>
    </div>
  );
}

export function RulesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nasıl oynanır?"
      eyebrow="Divan âdâbı"
      wide
    >
      <RulesContent />
    </Modal>
  );
}

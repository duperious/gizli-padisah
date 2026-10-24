import { Bot, Crown, Eye, Gavel, ScrollText, Shield, Sparkles, Users, Vote } from "lucide-react";
import { Badge, Modal } from "./parts";
import { POWER_LABEL } from "../game/labels";

export function RulesContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-parchment-2">
      <p className="rounded-xl border border-gold/20 bg-gold/5 p-3 text-[13px] text-parchment-2">
        Savaş Konseyi toplanmıştır. Barışçıllar Konsey'i ayakta tutmaya, Saldırganlar ise
        Savaş Çığırtkanı'nı Savaş Bakanı koltuğuna oturtmaya çalışır. Roller gizli, oylar açıktır.
      </p>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Vote className="h-4 w-4 text-gold" /> Bir tur nasıl işler?
        </h3>
        <ol className="space-y-2">
          {[
            "Konsey Başkanı, Savaş Bakanı adayını gösterir. Konsey Başkanı kendini aday gösteremez; son seçilen Savaş Bakanı da aday olamaz.",
            "Herkes aynı anda Evet veya Hayır oyu verir. Çoğunluk Evet ise seçim geçer.",
            "Seçim düşerse sayaç bir artar. Sayaç 3 olursa destenin üstündeki karar yürürlüğe girer ve dönem sınırları sıfırlanır.",
            "Seçim geçerse Konsey Başkanı 3 kararı görür, 1'ini eler. Savaş Bakanı kalan 2 karar arasından 1'ini seçer.",
            "Karar yürürlüğe girince tahtadaki yetki açılır ve Konsey Başkanı onu kullanır.",
            "Sonraki turda başkanlık sırası bir sonraki hayattaki oyuncuya geçer.",
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
          <Sparkles className="h-4 w-4 text-gold" /> Karar yetkileri
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              icon: Eye,
              title: POWER_LABEL.investigate,
              text: "Bir oyuncunun hangi tarafta olduğunu öğrenirsin. Savaş Çığırtkanı da Saldırgan görünür.",
            },
            {
              icon: Crown,
              title: POWER_LABEL.special,
              text: "Bir sonraki Konsey Başkanı'nı sen seçersin. Sıra atlanır.",
            },
            {
              icon: ScrollText,
              title: POWER_LABEL.peek,
              text: "Destenin en üstündeki 3 kararı görürsün. Sıraları değişmez.",
            },
            {
              icon: Gavel,
              title: POWER_LABEL.execute,
              text: "Bir oyuncuyu Konsey'den çıkarırsın. Savaş Çığırtkanı'nı bulursan Barışçıllar kazanır.",
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
          {POWER_LABEL.execute} dışındaki yetkilerin sonucunu herkes görmez; yalnızca Konsey Başkanı görür.
        </p>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Bot className="h-4 w-4 text-gold" /> Botlarla oynamak
        </h3>
        <p className="rounded-lg border border-gold/15 bg-ink/50 p-2.5 text-[11px] leading-relaxed text-muted">
          Oda sahibi, lobide istediği oyuncu sayısını seçip eksik kadroyu botlarla
          tamamlayabilir. Botlar her zaman hazır olur ve Konsey Başkanı seçimi, oylama, karar
          eleme, yetki kullanımı gibi sıraları geldiğinde otomatik oynar. Sohbet etmezler
          ve rolleri diğer oyuncular gibi gizli kalır. Yalnız başlasan bile 4 botla
          Konsey'i açabilirsin.
        </p>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-parchment">
          <Users className="h-4 w-4 text-gold" /> Kim kaç kişi?
        </h3>
        <div className="overflow-hidden rounded-lg border border-gold/15">
          <table className="w-full text-[11px]">
            <thead className="bg-gold/10 text-gold-2">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">Oyuncu</th>
                <th className="px-2 py-1.5 text-left font-semibold">Barışçıl</th>
                <th className="px-2 py-1.5 text-left font-semibold">Saldırgan</th>
                <th className="px-2 py-1.5 text-left font-semibold">Savaş Çığırtkanı</th>
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
            ["5–6 oyuncu", "3. İstihbarat · 4. Tutuklama · 5. Tutuklama"],
            ["7–8 oyuncu", "2. Soruşturma · 3. Özel Seçim · 4–5. Tutuklama"],
            ["9–10 oyuncu", "1–2. Soruşturma · 3. Özel Seçim · 4–5. Tutuklama"],
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
            <Badge tone="liberal">Barışçıllar</Badge> 5 Barış Kararı geçirirse ya da Savaş
            Çığırtkanı'nı tutuklarsa kazanır.
          </p>
          <p>
            <Badge tone="fascist">Saldırganlar</Badge> 6 Savaş Kararı geçirirse ya da 3 Savaş
            Kararı'ndan sonra Savaş Çığırtkanı'nı Savaş Bakanı yaparsa kazanır.
          </p>
          <p className="text-muted">
            Beşinci Savaş Kararı'ndan sonra veto açılır: Savaş Bakanı iki kararı da iade
            edebilir; Konsey Başkanı kabul ederse seçim sayacı artar.
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
      eyebrow="Konsey âdâbı"
      wide
    >
      <RulesContent />
    </Modal>
  );
}

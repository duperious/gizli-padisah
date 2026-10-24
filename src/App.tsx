import { Home as HomeIcon, ScrollText } from "lucide-react";
import { Brand, Button, Ornament } from "./ui/parts";
import { Home } from "./ui/Home";
import { RoomPage } from "./ui/RoomPage";
import { navigate, useRoute } from "./ui/router";

function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -right-48 -top-40 text-gold/10">
        <Ornament className="h-[500px] w-[500px]" />
      </div>
      <section className="panel relative z-10 w-full max-w-md p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/30 bg-gold/10">
          <ScrollText className="h-7 w-7 text-gold" />
        </div>
        <p className="eyebrow mt-4">Kayıp ferman</p>
        <h1 className="title mt-1 text-2xl">Bu sayfa divanda yok</h1>
        <p className="mt-2 text-sm leading-relaxed text-parchment-2">
          Aradığın sayfa bulunamadı. Belki divan çoktan dağılmıştır.
        </p>
        <Button variant="gold" className="mt-5 w-full" onClick={() => navigate("/")}>
          <HomeIcon className="h-4 w-4" /> Ana Sayfaya Dön
        </Button>
        <div className="mt-4 flex justify-center">
          <Brand compact />
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const route = useRoute();

  if (route.name === "home") return <Home />;
  if (route.name === "room") {
    return <RoomPage key={route.code} code={route.code} />;
  }
  return <NotFound />;
}

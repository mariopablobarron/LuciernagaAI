import HomeCanvas from "@/components/home/HomeCanvas";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Canvas principal - ocupa todo el espacio disponible */}
      <main className="flex-1">
        <HomeCanvas />
      </main>
    </div>
  );
}

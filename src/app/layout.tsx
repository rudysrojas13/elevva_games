import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ElevvaGames - Juegos PS4, PS5 y Suscripciones',
  description: 'Adquiere tus juegos digitales favoritos y suscripciones de PlayStation de forma rápida, segura y económica.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
        {children}
      </body>
    </html>
  );
}

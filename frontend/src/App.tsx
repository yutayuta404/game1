import { useEffect } from 'react';
import GamePage from './pages/GamePage';
import { initTelegram } from './utils/telegram';

export default function App() {
  // Telegram Mini App bootstrap (no-ops in a regular browser)
  useEffect(() => {
    initTelegram();
  }, []);

  return <GamePage />;
}
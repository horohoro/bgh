import React, { useState } from 'react';
import { useSocket, SocketProvider } from './context/SocketContext';
import { LobbyHeader } from './components/lobby/LobbyHeader';
import { JoinRoomModal } from './components/lobby/JoinRoomModal';
import { DeckExplorer } from './components/decks/DeckExplorer';
import { ScoreTable } from './components/scorekeeper/ScoreTable';
import { TurnOrder } from './components/tools/TurnOrder';
import { DiceRoller } from './components/tools/DiceRoller';
import { SetManager } from './components/sets/SetManager';
import { Navbar, ActiveTab } from './components/common/Navbar';

const MainApp: React.FC = () => {
  const { room } = useSocket();
  const [activeTab, setActiveTab] = useState<ActiveTab>('decks');

  if (!room) {
    return <JoinRoomModal />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Lobby Bar */}
      <LobbyHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4">
        {activeTab === 'decks' && <DeckExplorer />}
        {activeTab === 'score' && <ScoreTable />}
        {activeTab === 'tools' && (
          <div className="space-y-6 pb-20">
            <TurnOrder />
            <DiceRoller />
          </div>
        )}
        {activeTab === 'library' && <SetManager />}
      </main>

      {/* Mobile Bottom Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SocketProvider>
      <MainApp />
    </SocketProvider>
  );
};

export default App;

import React, { useState } from 'react';
import {
  Gavel,
  Coins,
  Users,
  Trophy,
  History,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const AuctionView = ({
  tournament,
  teams,
  players,
  currentUser,
  auctionConfig,
  auctionBids,
  onPlaceBid,
  onFinalizeSale,
  onMarkUnsold,
  onUpdateConfig
}) => {
  const isOrganizer = currentUser?.role === 'organizer';
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    auctionConfig?.activePlayerId || players.find(p => p.auctionStatus === 'available')?.id || ''
  );
  const [bidStatusMessage, setBidStatusMessage] = useState(null);

  const activePlayer = players.find(p => p.id === selectedPlayerId);
  const leadingTeam = teams.find(t => t.id === auctionConfig?.currentLeadingTeamId);
  const currentBid = auctionConfig?.currentHighestBid || activePlayer?.basePrice || 500000;

  const soldPlayers = players.filter(p => p.auctionStatus === 'sold');
  const unsoldPlayers = players.filter(p => p.auctionStatus === 'unsold');
  const availablePlayers = players.filter(p => p.auctionStatus === 'available');

  const handleSelectNewPlayer = (pId) => {
    setSelectedPlayerId(pId);
    const p = players.find(x => x.id === pId);
    if (p) {
      onUpdateConfig({
        activePlayerId: pId,
        currentHighestBid: p.basePrice,
        currentLeadingTeamId: undefined
      });
      setBidStatusMessage(null);
    }
  };

  const handleBidClick = (team, increment) => {
    if (!activePlayer) return;
    const newAmount = currentBid + increment;
    const res = onPlaceBid(activePlayer.id, team.id, newAmount);
    setBidStatusMessage({ text: res.message, error: !res.success });
  };

  const handleHammerSold = () => {
    if (!activePlayer || !auctionConfig.currentLeadingTeamId) {
      setBidStatusMessage({ text: 'Cannot hammer sold without an active bidding franchise!', error: true });
      return;
    }
    onFinalizeSale(activePlayer.id, auctionConfig.currentLeadingTeamId, currentBid);
    setBidStatusMessage({ text: `HAMMER DOWN! Sold to ${leadingTeam?.name} for ₹${currentBid.toLocaleString()}!`, error: false });
    // Pick next available player automatically
    const nextP = availablePlayers.find(p => p.id !== activePlayer.id);
    if (nextP) {
      setTimeout(() => handleSelectNewPlayer(nextP.id), 1200);
    }
  };

  const handleMarkPassUnsold = () => {
    if (!activePlayer) return;
    onMarkUnsold(activePlayer.id);
    setBidStatusMessage({ text: `${activePlayer.name} passed unsold into the reserve pool.`, error: false });
    const nextP = availablePlayers.find(p => p.id !== activePlayer.id);
    if (nextP) {
      setTimeout(() => handleSelectNewPlayer(nextP.id), 1000);
    }
  };

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          🔨
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Active Tournament Edition</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          The player auction stage belongs to an active tournament edition. Select or initialize a tournament edition to start the auction gavel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Bidding Room · Purse Validation Active
          </div>
          <h1 className="text-xl font-bold text-slate-900">Franchise Player Auction Stage</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live player point bidding, franchise purse tracking, squad constraints, and auction gavel operations conducted by Warhawks for {tournament?.name || 'Tournament'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVideoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-rose-600" />
            Auction Demo Video
          </button>
        </div>
      </div>

      {/* Main Grid: Podium & Bidding console on left, Team purses on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Podium & Interactive Auction Bidding Console */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Podium Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 text-white p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">
                  CURRENT PLAYER ON THE PODIUM
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight mt-1">
                  {activePlayer ? activePlayer.name : 'No Player in Ring'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2 font-medium">
                  <span>{activePlayer?.role || '—'}</span>
                  <span>·</span>
                  <span>{activePlayer?.battingStyle}</span>
                  <span>·</span>
                  <span>{activePlayer?.bowlingStyle}</span>
                </div>
              </div>

              {/* Player Selector Dropdown */}
              <div className="shrink-0">
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Call Next Player
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={e => handleSelectNewPlayer(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Select from pool...</option>
                  <optgroup label="Available Pool">
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role} · Base ₹{(p.basePrice || 0).toLocaleString()})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Unsold Pool">
                    {unsoldPlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Unsold · Base ₹{(p.basePrice || 0).toLocaleString()})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Current Bid Display */}
            <div className="mt-6 p-3.5 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] sm:text-xs text-slate-400 block font-medium">
                  Leading Bid & Franchise
                </span>
                <div className="flex flex-wrap items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                    ₹{currentBid.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({(currentBid || 0).toLocaleString()} Pts)
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-1">
                  {leadingTeam ? (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Held by {leadingTeam.name} ({leadingTeam.shortCode})</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Starting at Base Price</span>
                  )}
                </div>
              </div>

              {/* Hammer Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isOrganizer ? (
                  <>
                    <button
                      onClick={handleHammerSold}
                      disabled={!leadingTeam}
                      className="flex-1 sm:flex-none px-4 py-2.5 min-h-[42px] rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Gavel className="w-4 h-4 shrink-0" />
                      <span>Hammer Sold</span>
                    </button>
                    <button
                      onClick={handleMarkPassUnsold}
                      className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[42px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-600 transition-colors cursor-pointer flex items-center justify-center text-center"
                    >
                      Pass Unsold
                    </button>
                  </>
                ) : (
                  <div className="px-3.5 py-2 rounded-lg bg-slate-800/90 text-slate-300 text-xs border border-slate-700 flex items-center gap-2">
                    <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Spectator Mode · Official Warhawks Gavel</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Alert if any */}
            {bidStatusMessage && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  bidStatusMessage.error
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                }`}
              >
                {bidStatusMessage.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
                <span className="break-words">{bidStatusMessage.text}</span>
              </div>
            )}

            {/* Team Bidding Paddle Action Grid */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wider text-[10px]">
                  {isOrganizer ? 'Raise Paddle / Bid by Franchise (+50k / +100k):' : 'Franchise Purse & Live Standing:'}
                </span>
                {!isOrganizer && (
                  <span className="text-[10px] text-blue-400 font-medium">Bids registered by Warhawks Auctioneer</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {teams.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">
                    No franchise teams registered for auction bidding yet. Add teams to begin bidding.
                  </div>
                ) : teams.map(team => {
                  const cannotAfford = currentBid + 50000 > team.budgetRemaining;

                  return (
                    <div
                      key={team.id}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                        team.id === leadingTeam?.id
                          ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-slate-800/60 border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: team.primaryColor }}
                          />
                          <span className="font-bold text-slate-200 truncate">{team.shortCode}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          ₹{team.budgetRemaining.toLocaleString()}
                        </span>
                      </div>

                      {cannotAfford ? (
                        <div className="text-[10px] text-rose-400 font-semibold py-1.5 text-center bg-rose-950/30 rounded">
                          Budget Depleted
                        </div>
                      ) : isOrganizer ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleBidClick(team, 50000)}
                            className="py-1.5 px-2 min-h-[36px] rounded bg-slate-700 hover:bg-slate-600 text-white font-mono text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center"
                          >
                            +50k
                          </button>
                          <button
                            onClick={() => handleBidClick(team, 100000)}
                            className="py-1.5 px-2 min-h-[36px] rounded bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center"
                          >
                            +100k
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 text-center py-1 bg-slate-900/40 rounded">
                          {team.id === leadingTeam?.id ? 'Leading Bidder' : 'Eligible to Bid'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Auction Transaction History Feed */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">Bid Transaction Ledger</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">Real-time audit log of all auction bids</p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500 shrink-0">
                {auctionBids.length} bids
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {auctionBids.map(bid => {
                const team = teams.find(t => t.id === bid.teamId);
                const player = players.find(p => p.id === bid.playerId);
                return (
                  <div
                    key={bid.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs gap-1.5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: team?.primaryColor || '#0284c7' }}
                      />
                      <span className="font-bold text-slate-900 truncate max-w-[120px]">{team?.name}</span>
                      <span className="text-slate-400">bid on</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[120px]">{player?.name}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                      <span className="font-mono font-bold text-emerald-700">
                        ₹{bid.amount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Franchise Purse & Remaining Budgets */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Franchise Purse Leaderboard</h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time remaining purse validation to prevent budget cap breaches.
            </p>

            <div className="space-y-3.5">
              {teams.map(team => {
                const percent = Math.min(100, Math.round((team.budgetSpent / team.budgetTotal) * 100));
                return (
                  <div key={team.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 text-xs">
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: team.primaryColor }}
                        />
                        <span className="text-slate-900">{team.name}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">
                        ₹{team.budgetRemaining.toLocaleString()} Rem.
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1.5">
                      <div
                        className={`h-full rounded-full ${percent > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Spent: ₹{team.budgetSpent.toLocaleString()}</span>
                      <span>Squad: {team.totalPlayersAssigned}/{tournament?.maxSquadSize || 18}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unsold Players Pool */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Unsold Reserves Pool</h3>
              <span className="text-xs font-mono text-slate-500">{unsoldPlayers.length} players</span>
            </div>

            {unsoldPlayers.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No players passed unsold yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {unsoldPlayers.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      <span className="text-[11px] text-slate-400 block">{p.role} · Base ₹{(p.basePrice || 0).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => handleSelectNewPlayer(p.id)}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-[10px] transition-colors cursor-pointer"
                    >
                      Re-call
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auction Demo Video Modal */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title="Official Auctioneer Walkthrough & Rules Tutorial"
        subtitle="Operational video guide for franchise table bidding etiquette and purse governance."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            <video
              controls
              className="w-full h-full object-cover"
              src={auctionConfig.auctionDemoVideoUrl}
            >
              Your browser does not support HTML5 video streaming.
            </video>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900">Auction Guidelines & Protocols:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Opening bid begins at the player base price approved during registration.</li>
              <li>Franchises cannot bid beyond their remaining purse minus the minimum base reserves for remaining squad slots.</li>
              <li>Once the third call is announced by the lead auctioneer, the hammer down is final and logged to the permanent database.</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

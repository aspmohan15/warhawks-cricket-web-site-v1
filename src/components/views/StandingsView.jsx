import React from 'react';
import {
  ListOrdered,
  Download,
  Info,
  Trophy,
  ArrowUpRight
} from 'lucide-react';
import { exportToCsv } from '../../utils/csv';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const StandingsView = ({
  tournament,
  standings,
  teams
}) => {
  const handleExportStandings = () => {
    const rows = standings.map((s, idx) => {
      const team = teams.find(t => t.id === s.teamId);
      return {
        Position: idx + 1,
        Team: team ? team.name : s.teamId,
        Played: s.matchesPlayed,
        Won: s.won,
        Lost: s.lost,
        Tied: s.tied,
        Points: s.points,
        RunsScored: s.runsScored,
        OversFaced: s.oversFaced,
        RunsConceded: s.runsConceded,
        OversBowled: s.oversBowled,
        NetRunRate: s.netRunRate
      };
    });
    exportToCsv(`${tournament?.name?.replace(/\s+/g, '_') || 'Tournament'}_Official_Standings`, rows);
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold mb-1 border border-emerald-200">
            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>Official Standings · Certified by Warhawks</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Points Table & Net Run Rate (NRR)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-calculated standings from verified match scorecards with ICC standard Net Run Rate formulas for {tournament?.name} (Organized by Warhawks).
          </p>
        </div>

        <button
          onClick={handleExportStandings}
          className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Points Table (CSV)</span>
        </button>
      </div>

      {/* Mobile Standings Cards (Mobile < 768px) */}
      <div className="md:hidden space-y-3">
        {standings.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            <ListOrdered className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">No standings available yet.</p>
            <p className="text-slate-400 mt-1">Standings and Net Run Rate (NRR) calculate automatically as match results are recorded.</p>
          </div>
        ) : standings.map((row, idx) => {
          const team = teams.find(t => t.id === row.teamId);
          const isTop4 = idx < 4;

          return (
            <div
              key={row.teamId}
              className={`bg-white rounded-xl border p-3.5 shadow-xs space-y-2.5 ${
                isTop4 ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono ${
                      isTop4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: team?.primaryColor || '#0284c7' }}
                      />
                      <span className="font-bold text-slate-900 text-sm truncate">{team?.name || row.teamId}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({team?.shortCode})</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-mono font-extrabold text-slate-900 px-2 py-0.5 bg-slate-100 rounded">
                    {row.points} Pts
                  </span>
                </div>
              </div>

              {/* Match Stats Grid */}
              <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-50 p-2 rounded-lg text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans uppercase">P</span>
                  <span className="font-bold text-slate-800">{row.matchesPlayed}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 block font-sans uppercase">W</span>
                  <span className="font-bold text-emerald-700">{row.won}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 block font-sans uppercase">L</span>
                  <span className="font-bold text-rose-700">{row.lost}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans uppercase">NRR</span>
                  <span
                    className={`font-bold ${
                      row.netRunRate > 0
                        ? 'text-emerald-700'
                        : row.netRunRate < 0
                        ? 'text-rose-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {row.netRunRate > 0 ? `+${row.netRunRate.toFixed(2)}` : row.netRunRate.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-sans">
                <span className="text-slate-400">
                  Runs: {row.runsScored}/{row.oversFaced}ov · Conceded: {row.runsConceded}/{row.oversBowled}ov
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Standings Table Card (md+) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">Pos</th>
                <th className="py-3 px-4">Franchise Team</th>
                <th className="py-3 px-3 text-center">P</th>
                <th className="py-3 px-3 text-center">W</th>
                <th className="py-3 px-3 text-center">L</th>
                <th className="py-3 px-3 text-center">T/NR</th>
                <th className="py-3 px-4 text-center font-bold text-slate-900">Pts</th>
                <th className="py-3 px-4 text-right">Runs (For / Against)</th>
                <th className="py-3 px-4 text-right">NRR</th>
                <th className="py-3 px-4 text-center">Qualification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                    <ListOrdered className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800">No standings available yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Standings and Net Run Rate (NRR) calculate automatically as match results are recorded.</p>
                  </td>
                </tr>
              ) : standings.map((row, idx) => {
                const team = teams.find(t => t.id === row.teamId);
                const isTop4 = idx < 4;

                return (
                  <tr
                    key={row.teamId}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isTop4 ? 'bg-emerald-50/10' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: team?.primaryColor || '#0284c7' }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {team?.name || 'Unknown Team'}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({team?.shortCode})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {team?.city}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center text-slate-800 font-medium">
                      {row.matchesPlayed}
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-700 font-bold">
                      {row.won}
                    </td>
                    <td className="py-3.5 px-3 text-center text-rose-700 font-medium">
                      {row.lost}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-500">
                      {row.tied + row.noResult}
                    </td>

                    <td className="py-3.5 px-4 text-center text-sm font-extrabold text-slate-900 bg-slate-50/50">
                      {row.points}
                    </td>

                    <td className="py-3.5 px-4 text-right text-[11px] text-slate-600">
                      <div>{row.runsScored} / {row.oversFaced} ov</div>
                      <div className="text-slate-400">{row.runsConceded} / {row.oversBowled} ov</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold">
                      <span
                        className={`${
                          row.netRunRate > 0
                            ? 'text-emerald-700'
                            : row.netRunRate < 0
                            ? 'text-rose-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {row.netRunRate > 0 ? `+${row.netRunRate.toFixed(3)}` : row.netRunRate.toFixed(3)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-sans">
                      {isTop4 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                          Playoff Bound <ArrowUpRight className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Elimination Zone
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* NRR Formula Explainer Note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-700">ICC Net Run Rate Calculation:</span> NRR is calculated as (Total Runs Scored / Total Overs Faced) minus (Total Runs Conceded / Total Overs Bowled). In matches where a team is bowled out inside 20 overs, their full quota of 20 overs is applied. Ties are awarded {tournament?.pointsPerTie || 1} point each; wins receive {tournament?.pointsPerWin || 2} points.
          </div>
        </div>
      </div>
    </div>
  );
};

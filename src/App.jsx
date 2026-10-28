import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AnnouncementRibbon } from './components/layout/AnnouncementRibbon';
import { ToastContainer } from './components/common/Toast';

// Views
import { DashboardView } from './components/views/DashboardView';
import { EditionsView } from './components/views/EditionsView';
import { TeamsPlayersView } from './components/views/TeamsPlayersView';
import { FixturesResultsView } from './components/views/FixturesResultsView';
import { StandingsView } from './components/views/StandingsView';
import { AuctionView } from './components/views/AuctionView';
import { SponsorshipView } from './components/views/SponsorshipView';
import { ExpensesView } from './components/views/ExpensesView';
import { FoodPreferencesView } from './components/views/FoodPreferencesView';
import { RulesVideosView } from './components/views/RulesVideosView';
import { RegistrationView } from './components/views/RegistrationView';
import { MediaLibraryView } from './components/views/MediaLibraryView';
import { ImportHistoryView } from './components/views/ImportHistoryView';
import { UserAccessView } from './components/views/UserAccessView';
import { SettingsView } from './components/views/SettingsView';
import { PlayerDashboardView } from './components/views/PlayerDashboardView';
import { OrganizerLoginModal } from './components/common/OrganizerLoginModal';
import { ChangePasswordModal } from './components/common/ChangePasswordModal';
import { DatabaseStatusModal } from './components/common/DatabaseStatusModal';
import { getOrganizerSession, logoutOrganizer } from './services/auth';
import { isSupabaseConfigured } from './services/supabase';
import { WARHAWKS_LOGO_URL } from './constants';

const PUBLIC_ALLOWED_SECTIONS = [
  'dashboard',
  'sponsorships',
  'fixtures_results',
  'standings',
  'registrations',
  'teams_players',
  'auction',
  'expenses',
  'rules_videos'
];

export default function App() {
  const organizerSession = getOrganizerSession();

  // Default page is always dashboard for both players and organizers on landing or refresh
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [organizerLoginModalOpen, setOrganizerLoginModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [databaseModalOpen, setDatabaseModalOpen] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(() => isSupabaseConfigured());

  // Database snapshot states
  const [tournaments, setTournaments] = useState(() => db.getTournaments());
  const [activeTournamentId, setActiveTournamentId] = useState(() => {
    const list = db.getTournaments();
    return list.length > 0 ? list[0].id : null;
  });

  // Current user: authenticated organizer if session exists; otherwise player
  const [currentUser, setCurrentUser] = useState(() => {
    if (organizerSession && organizerSession.user) {
      return organizerSession.user;
    }
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('warhawks_player_email') : '';
    return {
      id: 'player-user',
      name: 'Player',
      role: 'player',
      email: storedEmail || ''
    };
  });

  const isOrganizer = currentUser?.role === 'organizer';

  // Derived active tournament
  const activeTournament = tournaments.find(t => t.id === activeTournamentId) || tournaments[0] || null;

  // Reload data for the active tournament
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [auctionConfig, setAuctionConfig] = useState(() => db.getAuctionConfig(activeTournamentId));
  const [sponsors, setSponsors] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]);
  const [rules, setRules] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [importJobs, setImportJobs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcements, setAnnouncements] = useState(() => db.getAnnouncements(activeTournamentId));
  const [settings, setSettings] = useState(() => db.getSettings());

  const refreshTournamentData = (tId) => {
    const currentTournaments = db.getTournaments();
    setTournaments(currentTournaments);

    // Resolve target tournament ID safely
    let resolvedId = tId || activeTournamentId;
    if (!resolvedId || !currentTournaments.some(t => t.id === resolvedId)) {
      resolvedId = currentTournaments[0]?.id || null;
    }
    if (resolvedId && resolvedId !== activeTournamentId) {
      setActiveTournamentId(resolvedId);
    }

    if (!resolvedId) {
      setTeams([]);
      setPlayers([]);
      setMatches([]);
      setStandings([]);
      setAuctionConfig({ baseBudget: 10000000, currentHighestBid: 0, isAuctionLive: false });
      setSponsors([]);
      setExpenses([]);
      setFoodOrders([]);
      setRules([]);
      setRegistrations([]);
      setMediaAssets([]);
      setImportJobs([]);
      setAuditLogs([]);
      setAnnouncements(db.getAnnouncements(null));
      setSettings(db.getSettings());
      return;
    }

    setTeams(db.getTeams(resolvedId));
    setPlayers(db.getPlayers(resolvedId));
    setMatches(db.getMatches(resolvedId));
    setStandings(db.getStandings(resolvedId));
    setAuctionConfig(db.getAuctionConfig(resolvedId));
    setSponsors(db.getSponsors(resolvedId));
    setExpenses(db.getExpenses(resolvedId));
    setFoodOrders(db.getFoodOrders(resolvedId));
    setRules(db.getRules(resolvedId));
    setRegistrations(db.getRegistrations(resolvedId));
    setMediaAssets(db.getMediaAssets(resolvedId));
    setImportJobs(db.getImportJobs(resolvedId));
    setAuditLogs(db.getAuditLogs(resolvedId));
    setAnnouncements(db.getAnnouncements(resolvedId));
    setSettings(db.getSettings());
  };

  useEffect(() => {
    refreshTournamentData(activeTournamentId);
    if (activeTournamentId) {
      db.syncTournamentData(activeTournamentId).then(() => {
        refreshTournamentData(activeTournamentId);
      });
    }
  }, [activeTournamentId]);

  // Initial cloud & backend sync on mount for any browser
  useEffect(() => {
    db.initSupabaseSync().then(() => {
      const list = db.getTournaments();
      setTournaments(list);
      if (list.length > 0 && !activeTournamentId) {
        setActiveTournamentId(list[0].id);
        db.syncTournamentData(list[0].id).then(() => {
          refreshTournamentData(list[0].id);
        });
      }
    });
  }, []);

  // Synchronize database connection state
  useEffect(() => {
    const handleConfigChange = () => {
      const configured = isSupabaseConfigured();
      setIsDbConnected(configured);
      if (configured) {
        db.initSupabaseSync().then(() => {
          const list = db.getTournaments();
          setTournaments(list);
          if (list.length > 0 && !activeTournamentId) {
            setActiveTournamentId(list[0].id);
          }
          refreshTournamentData(activeTournamentId || list[0]?.id);
        });
      }
    };

    window.addEventListener('supabase-config-changed', handleConfigChange);
    return () => window.removeEventListener('supabase-config-changed', handleConfigChange);
  }, [activeTournamentId]);

  const handleDatabaseConnectionUpdated = () => {
    const configured = isSupabaseConfigured();
    setIsDbConnected(configured);
    if (configured) {
      db.initSupabaseSync().then(() => {
        const list = db.getTournaments();
        setTournaments(list);
        if (list.length > 0 && !activeTournamentId) {
          setActiveTournamentId(list[0].id);
        }
        refreshTournamentData(activeTournamentId || list[0]?.id);
      });
    }
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Switch Active Edition
  const handleSelectEdition = (id) => {
    setActiveTournamentId(id);
    const target = tournaments.find(t => t.id === id);
    showToast(`Switched active partition to: ${target?.name || id}`, 'info');
  };

  // Role Simulator
  const handleSwitchRole = (role) => {
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('warhawks_player_email') : '';
    const u = db.getUsers().find(user => user.role === role) || {
      ...currentUser,
      name: role === 'player' ? 'Player' : 'Organizer',
      role,
      email: role === 'player' ? (storedEmail || currentUser.email) : currentUser.email
    };
    setCurrentUser(u);
    if (role === 'player' && !PUBLIC_ALLOWED_SECTIONS.includes(currentSection)) {
      setCurrentSection('dashboard');
    }
    showToast(`Session authority updated: ${role === 'player' ? 'Player' : 'Organizer'}`, 'info');
  };

  // Organizer Authentication Handlers
  const handleOrganizerLoginSuccess = (user) => {
    setCurrentUser(user);
    setOrganizerLoginModalOpen(false);
    setCurrentSection('dashboard');
    showToast(`Welcome back, ${user.name}! Organizer session active.`, 'success');
  };

  const handleOrganizerLogout = () => {
    logoutOrganizer();
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('warhawks_player_email') : '';
    setCurrentUser({
      id: 'player-user',
      name: 'Player',
      role: 'player',
      email: storedEmail || ''
    });
    setCurrentSection('dashboard');
    showToast('Logged out of organizer session. Player Dashboard active.', 'info');
  };

  // Quick Action Handler from Topbar
  const handleQuickAction = (action) => {
    if (action === 'add_team') {
      setCurrentSection('teams_players');
    } else if (action === 'schedule_match') {
      setCurrentSection('fixtures_results');
    } else if (action === 'record_expense') {
      setCurrentSection('expenses');
    } else if (action === 'import_cricheroes') {
      setCurrentSection('import_history');
    } else if (action === 'register_tournament') {
      setCurrentSection('registrations');
    } else if (action === 'view_fixtures') {
      setCurrentSection('fixtures_results');
    } else if (action === 'view_standings') {
      setCurrentSection('standings');
    } else if (action === 'view_sponsors') {
      setCurrentSection('sponsorships');
    } else if (action === 'view_expenses') {
      setCurrentSection('expenses');
    }
  };

  // Player Self-Service Registration
  const handlePlayerRegister = (data) => {
    try {
      const newReg = db.createRegistration(data);
      refreshTournamentData(activeTournamentId);
      showToast('Registration application submitted to Warhawks Operations!', 'success');
      return newReg;
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    }
  };

  const handleCancelRegistration = (regId) => {
    try {
      db.cancelRegistration(regId, currentUser?.email);
      refreshTournamentData(activeTournamentId);
      showToast('Registration application cancelled.', 'info');
    } catch (err) {
      showToast(err.message || 'Cancellation failed', 'error');
    }
  };

  // Tournament CRUD
  const handleCreateTournament = (data) => {
    const newT = db.createTournament(data);
    refreshTournamentData(newT.id);
    setActiveTournamentId(newT.id);
    showToast(`Edition #${newT.editionNumber} initialized!`, 'success');
  };

  const handleUpdateTournament = (id, updates) => {
    db.updateTournament(id, updates);
    refreshTournamentData(activeTournamentId);
    showToast('Tournament parameters updated', 'success');
  };

  const handleDeleteTournament = (id) => {
    try {
      const editionToDelete = tournaments.find(t => t.id === id);
      const editionName = editionToDelete?.name || `Edition #${editionToDelete?.editionNumber || id}`;

      db.deleteTournament(id);

      const remainingTournaments = db.getTournaments();
      const nextActiveId = id === activeTournamentId
        ? (remainingTournaments[0]?.id || null)
        : activeTournamentId;

      setActiveTournamentId(nextActiveId);
      refreshTournamentData(nextActiveId);

      showToast(`Tournament "${editionName}" and associated partition data deleted.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete tournament edition.', 'error');
    }
  };

  // Team CRUD
  const handleCreateTeam = (data) => {
    const targetTournamentId = data.tournamentId || activeTournamentId || activeTournament?.id;
    if (!targetTournamentId) {
      showToast('Cannot create team: No active tournament edition selected. Create an edition first.', 'error');
      return;
    }
    db.createTeam({ ...data, tournamentId: targetTournamentId });
    refreshTournamentData(targetTournamentId);
    showToast(`Team ${data.name} created!`, 'success');
  };

  const handleUpdateTeam = (id, updates) => {
    db.updateTeam(id, updates);
    refreshTournamentData(activeTournamentId);
    showToast('Franchise updated', 'success');
  };

  const handleDeleteTeam = (id) => {
    db.deleteTeam(id);
    refreshTournamentData(activeTournamentId);
    showToast('Team removed from tournament partition', 'info');
  };

  // Player CRUD
  const handleCreatePlayer = (data) => {
    const targetTournamentId = data.tournamentId || activeTournamentId || activeTournament?.id;
    if (!targetTournamentId) {
      showToast('Cannot add player: No active tournament edition selected. Create an edition first.', 'error');
      return;
    }
    db.createPlayer({ ...data, tournamentId: targetTournamentId });
    refreshTournamentData(targetTournamentId);
    showToast(`Player ${data.name} added to roster`, 'success');
  };

  const handleUpdatePlayer = (id, updates) => {
    db.updatePlayer(id, updates);
    refreshTournamentData(activeTournamentId);
    showToast('Player profile updated', 'success');
  };

  const handleDeletePlayer = (id) => {
    db.deletePlayer(id);
    refreshTournamentData(activeTournamentId);
    showToast('Player deleted', 'info');
  };

  // Match CRUD & CricHeroes
  const handleCreateMatch = (data) => {
    const targetTournamentId = data.tournamentId || activeTournamentId || activeTournament?.id;
    if (!targetTournamentId) {
      showToast('Cannot schedule match: No active tournament edition selected. Create an edition first.', 'error');
      return;
    }
    db.createMatch({ ...data, tournamentId: targetTournamentId });
    refreshTournamentData(targetTournamentId);
    showToast(`Match #${data.matchNumber} scheduled!`, 'success');
  };

  const handleUpdateMatch = (id, updates) => {
    db.updateMatch(id, updates);
    refreshTournamentData(activeTournamentId);
    showToast('Scorecard sign-off recorded & Standings recalculated!', 'success');
  };

  const handleDeleteMatch = (id) => {
    db.deleteMatch(id);
    refreshTournamentData(activeTournamentId);
    showToast('Match deleted', 'info');
  };

  // Auction System
  const handlePlaceBid = (playerId, teamId, amount) => {
    const res = db.placeAuctionBid(activeTournamentId, playerId, teamId, amount);
    refreshTournamentData(activeTournamentId);
    if (!res.success) {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleFinalizeSale = (playerId, teamId, amount) => {
    db.finalizePlayerSale(activeTournamentId, playerId, teamId, amount);
    refreshTournamentData(activeTournamentId);
    showToast('Player sale successfully locked into team purse!', 'success');
  };

  const handleMarkUnsold = (playerId) => {
    db.markPlayerUnsold(activeTournamentId, playerId);
    refreshTournamentData(activeTournamentId);
    showToast('Player moved to unsold reserves pool', 'info');
  };

  // Sponsors
  const handleCreateSponsor = (data) => {
    const targetTournamentId = data.tournamentId || activeTournamentId || activeTournament?.id;
    if (!targetTournamentId) {
      showToast('Cannot add sponsor: No active tournament edition selected. Create an edition first.', 'error');
      return;
    }
    db.createSponsor({ ...data, tournamentId: targetTournamentId });
    refreshTournamentData(targetTournamentId);
    showToast('Sponsor partnership logged', 'success');
  };

  const handleUpdateSponsor = (id, updates) => {
    db.updateSponsor(id, updates);
    refreshTournamentData(activeTournamentId);
    showToast('Sponsor details updated', 'success');
  };

  const handleDeleteSponsor = (id) => {
    db.deleteSponsor(id);
    refreshTournamentData(activeTournamentId);
    showToast('Sponsor removed', 'info');
  };

  // Expenses
  const handleCreateExpense = async (data) => {
    const targetTournamentId = data.tournamentId || activeTournamentId || activeTournament?.id;
    if (!targetTournamentId) {
      showToast('Cannot record expense: No active tournament edition selected. Create an edition first.', 'error');
      return;
    }
    try {
      await db.createExpense({ ...data, tournamentId: targetTournamentId });
      refreshTournamentData(targetTournamentId);
      showToast('Expense voucher recorded in financial ledger', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to record expense', 'error');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await db.deleteExpense(id);
      refreshTournamentData(activeTournamentId);
      showToast('Expense voucher removed', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to remove expense', 'error');
    }
  };

  // Food
  const handleCreateFoodOrder = (data) => {
    db.createFoodOrder(data);
    refreshTournamentData(activeTournamentId);
    showToast('Meal distribution logged for catering staff', 'success');
  };

  const handleUpdateFoodStatus = (id, status) => {
    db.updateFoodOrderStatus(id, status);
    refreshTournamentData(activeTournamentId);
    showToast(`Meal marked as ${status}`, 'success');
  };

  // Rules
  const handleCreateRule = (data) => {
    const targetTournamentId = data.tournamentId || activeTournamentId || activeTournament?.id;
    if (!targetTournamentId) {
      showToast('Cannot publish rule: No active tournament edition selected. Create an edition first.', 'error');
      return;
    }
    db.createRule({ ...data, tournamentId: targetTournamentId });
    refreshTournamentData(targetTournamentId);
    showToast('Rule clause published', 'success');
  };

  const handleUpdateRule = (id, updates) => {
    db.updateRule(id, updates);
    refreshTournamentData(activeTournamentId);
    showToast('Rule updated', 'success');
  };

  const handleDeleteRule = (id) => {
    db.deleteRule(id);
    refreshTournamentData(activeTournamentId);
    showToast('Rule deleted', 'info');
  };

  // Registrations
  const handleToggleRegistration = (isOpen) => {
    db.updateTournament(activeTournamentId, { registrationOpen: isOpen });
    refreshTournamentData(activeTournamentId);
    showToast(`Registration window ${isOpen ? 'OPENED' : 'CLOSED'}`, 'info');
  };

  const handleUpdateRegistrationDates = (start, end) => {
    db.updateTournament(activeTournamentId, {
      registrationStartDate: start,
      registrationEndDate: end
    });
    refreshTournamentData(activeTournamentId);
    showToast('Registration schedule updated', 'success');
  };

  const handleUpdateRegistrationStatus = (id, status, notes) => {
    db.updateRegistrationStatus(id, status, notes);
    refreshTournamentData(activeTournamentId);
    showToast(`Application marked as ${status}!`, 'success');
  };

  const handleUpdateRegistrationCatering = (id, cateringStatus) => {
    db.updateRegistrationCateringStatus(id, cateringStatus);
    refreshTournamentData(activeTournamentId);
    showToast(`Catering status marked as ${cateringStatus}!`, 'success');
  };

  const handleUpdateRegistrationDetails = (id, updates) => {
    db.updateRegistration(id, updates);
    refreshTournamentData(activeTournamentId);
    showToast('Registration dietary requirements updated', 'success');
  };

  // Media
  const handleAddMedia = (data) => {
    const targetTournamentId = data.tournamentId || activeTournamentId || activeTournament?.id;
    if (!targetTournamentId) {
      showToast('Cannot add media: No active tournament edition selected. Create an edition first.', 'error');
      return;
    }
    db.addMediaAsset({ ...data, tournamentId: targetTournamentId });
    refreshTournamentData(targetTournamentId);
    showToast('Media uploaded to library', 'success');
  };

  const handleDeleteMedia = (id) => {
    db.deleteMediaAsset(id);
    refreshTournamentData(activeTournamentId);
    showToast('Media asset removed', 'info');
  };

  // Tournament Announcements Handlers
  const handleCreateAnnouncement = async (data) => {
    try {
      const created = await db.createAnnouncement({
        ...data,
        tournamentId: activeTournamentId
      });
      setAnnouncements(db.getAnnouncements(activeTournamentId));
      showToast('Announcement posted on player ribbon!', 'success');
      return created;
    } catch (err) {
      showToast(err.message || 'Failed to create announcement', 'error');
      throw err;
    }
  };

  const handleUpdateAnnouncement = async (id, updates) => {
    try {
      const updated = await db.updateAnnouncement(id, updates);
      setAnnouncements(db.getAnnouncements(activeTournamentId));
      showToast('Announcement updated', 'success');
      return updated;
    } catch (err) {
      showToast(err.message || 'Failed to update announcement', 'error');
      throw err;
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await db.deleteAnnouncement(id);
      setAnnouncements(db.getAnnouncements(activeTournamentId));
      showToast('Announcement removed', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete announcement', 'error');
      throw err;
    }
  };

  const handleSwapAnnouncements = async (id1, id2) => {
    try {
      const swapped = await db.swapAnnouncements(id1, id2);
      setAnnouncements(db.getAnnouncements(activeTournamentId));
      showToast('Announcement order updated', 'info');
      return swapped;
    } catch (err) {
      showToast(err.message || 'Failed to reorder announcements', 'error');
      throw err;
    }
  };

  // Imports
  const handleImportMatches = (importedMatches, fileTitle) => {
    importedMatches.forEach(m => db.createMatch(m));
    db.recordImportJob({
      tournamentId: activeTournamentId,
      jobType: 'cricheroes_matches',
      fileName: fileTitle,
      totalRows: importedMatches.length,
      importedRows: importedMatches.length,
      skippedRows: 0,
      status: 'completed',
      importSummary: `Ingested ${importedMatches.length} CricHeroes official match summaries. Points table updated.`,
      importedBy: currentUser.name
    });
    refreshTournamentData(activeTournamentId);
    showToast(`Imported ${importedMatches.length} CricHeroes fixtures into database!`, 'success');
  };

  const handleImportPlayers = (importedPlayers, fileTitle) => {
    importedPlayers.forEach(p => db.createPlayer(p));
    db.recordImportJob({
      tournamentId: activeTournamentId,
      jobType: 'players_roster',
      fileName: fileTitle,
      totalRows: importedPlayers.length,
      importedRows: importedPlayers.length,
      skippedRows: 0,
      status: 'completed',
      importSummary: `Bulk enrolled ${importedPlayers.length} athletes into auction pool.`,
      importedBy: currentUser.name
    });
    refreshTournamentData(activeTournamentId);
    showToast(`Bulk imported ${importedPlayers.length} athletes!`, 'success');
  };

  // Reset to clean empty database state (zero records)
  const handleResetDatabase = () => {
    db.resetToCleanEmptyState();
    const cleanList = db.getTournaments();
    setTournaments(cleanList);
    setActiveTournamentId(null);
    refreshTournamentData(null);
    showToast('Database reset to clean empty state (zero records).', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Toast Alert System */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Responsive Collapsible Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        activeTournament={activeTournament}
        currentUser={currentUser}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenOrganizerLogin={() => setOrganizerLoginModalOpen(true)}
        onLogout={handleOrganizerLogout}
        onOpenDatabaseModal={() => setDatabaseModalOpen(true)}
        isDbConnected={isDbConnected}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0 w-full overflow-x-hidden">
        {/* Top Header Bar */}
        <TopBar
          currentSection={currentSection}
          tournaments={tournaments}
          activeTournament={activeTournament}
          onSelectTournament={handleSelectEdition}
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onQuickAction={handleQuickAction}
          onOpenOrganizerLogin={() => setOrganizerLoginModalOpen(true)}
          onOpenChangePassword={() => setChangePasswordModalOpen(true)}
          onLogout={handleOrganizerLogout}
          onOpenDatabaseModal={() => setDatabaseModalOpen(true)}
          isDbConnected={isDbConnected}
        />

        {/* Player View: Continuous scrolling marquee/ribbon directly below the header */}
        <AnnouncementRibbon announcements={announcements} />

        {/* Viewport Content Canvas */}
        <main className="flex-1 px-3 py-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {currentUser.role === 'player' &&
          !PUBLIC_ALLOWED_SECTIONS.includes(currentSection) ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs my-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
                🔒
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Warhawks Organizer Privilege Required</h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                This administrative console is restricted to the tournament host (<strong>Warhawks</strong>).
                As a registered <strong>Player</strong>, you have access to official match schedules, live scores, points standings, franchise squad rosters, live auction stream, and self-service tournament registration.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentSection('fixtures_results')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  View Fixtures & Live Scores
                </button>
                <button
                  onClick={() => setCurrentSection('registrations')}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Go to Registration Portal
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentSection === 'dashboard' && (
                isOrganizer ? (
                  <DashboardView
                    tournament={activeTournament}
                    teams={teams}
                    players={players}
                    matches={matches}
                    sponsors={sponsors}
                    expenses={expenses}
                    auditLogs={auditLogs}
                    registrations={registrations}
                    announcements={announcements}
                    onCreateAnnouncement={handleCreateAnnouncement}
                    onUpdateAnnouncement={handleUpdateAnnouncement}
                    onDeleteAnnouncement={handleDeleteAnnouncement}
                    onSwapAnnouncements={handleSwapAnnouncements}
                    onNavigate={setCurrentSection}
                    onQuickAction={handleQuickAction}
                  />
                ) : (
                  <PlayerDashboardView
                    tournament={activeTournament}
                    teams={teams}
                    players={players}
                    matches={matches}
                    standings={standings}
                    registrations={registrations}
                    announcements={announcements}
                    currentUser={currentUser}
                    onNavigate={setCurrentSection}
                  />
                )
              )}

              {currentSection === 'editions' && (
                <EditionsView
                  tournaments={tournaments}
                  activeTournamentId={activeTournamentId}
                  teams={teams}
                  currentUser={currentUser}
                  onSelectEdition={handleSelectEdition}
                  onCreateEdition={handleCreateTournament}
                  onUpdateEdition={handleUpdateTournament}
                  onDeleteEdition={handleDeleteTournament}
                />
              )}

              {currentSection === 'teams_players' && (
                <TeamsPlayersView
                  tournament={activeTournament}
                  teams={teams}
                  players={players}
                  currentUser={currentUser}
                  onCreateTeam={handleCreateTeam}
                  onUpdateTeam={handleUpdateTeam}
                  onDeleteTeam={handleDeleteTeam}
                  onCreatePlayer={handleCreatePlayer}
                  onUpdatePlayer={handleUpdatePlayer}
                  onDeletePlayer={handleDeletePlayer}
                  onOpenImport={() => setCurrentSection('import_history')}
                  onNavigateToEditions={() => setCurrentSection('editions')}
                />
              )}

              {currentSection === 'fixtures_results' && (
                <FixturesResultsView
                  tournament={activeTournament}
                  matches={matches}
                  teams={teams}
                  players={players}
                  currentUser={currentUser}
                  onCreateMatch={handleCreateMatch}
                  onUpdateMatch={handleUpdateMatch}
                  onDeleteMatch={handleDeleteMatch}
                  onNavigateToEditions={() => setCurrentSection('editions')}
                />
              )}

              {currentSection === 'standings' && (
                <StandingsView
                  tournament={activeTournament}
                  standings={standings}
                  teams={teams}
                  currentUser={currentUser}
                />
              )}

              {currentSection === 'auction' && (
                <AuctionView
                  tournament={activeTournament}
                  teams={teams}
                  players={players}
                  currentUser={currentUser}
                  auctionConfig={auctionConfig}
                  auctionBids={db.getAuctionBids(activeTournamentId)}
                  onPlaceBid={handlePlaceBid}
                  onFinalizeSale={handleFinalizeSale}
                  onMarkUnsold={handleMarkUnsold}
                  onUpdateConfig={updates => {
                    db.updateAuctionConfig(activeTournamentId, updates);
                    refreshTournamentData(activeTournamentId);
                  }}
                />
              )}

              {currentSection === 'sponsorships' && (
                <SponsorshipView
                  tournament={activeTournament}
                  sponsors={sponsors}
                  currentUser={currentUser}
                  onCreateSponsor={handleCreateSponsor}
                  onUpdateSponsor={handleUpdateSponsor}
                  onDeleteSponsor={handleDeleteSponsor}
                />
              )}

              {currentSection === 'expenses' && (
                <ExpensesView
                  tournament={activeTournament}
                  expenses={expenses}
                  currentUser={currentUser}
                  isOrganizer={currentUser?.role === 'organizer'}
                  onCreateExpense={handleCreateExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}

              {currentSection === 'food_preferences' && (
                <FoodPreferencesView
                  tournament={activeTournament}
                  registrations={registrations}
                  onUpdateRegistrationCatering={handleUpdateRegistrationCatering}
                  onUpdateRegistrationDetails={handleUpdateRegistrationDetails}
                />
              )}

              {currentSection === 'rules_videos' && (
                <RulesVideosView
                  tournament={activeTournament}
                  rules={rules}
                  currentUser={currentUser}
                  onCreateRule={handleCreateRule}
                  onUpdateRule={handleUpdateRule}
                  onDeleteRule={handleDeleteRule}
                />
              )}

              {currentSection === 'registrations' && (
                <RegistrationView
                  tournament={activeTournament}
                  settings={settings}
                  registrations={registrations}
                  sponsors={sponsors}
                  currentUser={currentUser}
                  onToggleRegistration={handleToggleRegistration}
                  onUpdateRegistrationDates={handleUpdateRegistrationDates}
                  onUpdateStatus={handleUpdateRegistrationStatus}
                  onPlayerRegister={handlePlayerRegister}
                  onCancelRegistration={handleCancelRegistration}
                  onNavigateToSponsors={() => setCurrentSection('sponsorships')}
                />
              )}

              {currentSection === 'media_library' && (
                <MediaLibraryView
                  tournament={activeTournament}
                  mediaAssets={mediaAssets}
                  onAddMediaAsset={handleAddMedia}
                  onDeleteMediaAsset={handleDeleteMedia}
                />
              )}

              {currentSection === 'import_history' && (
                <ImportHistoryView
                  tournament={activeTournament}
                  importJobs={importJobs}
                  onImportMatches={handleImportMatches}
                  onImportPlayers={handleImportPlayers}
                />
              )}

              {currentSection === 'user_access' && (
                <UserAccessView
                  tournament={activeTournament}
                  users={db.getUsers()}
                  currentUser={currentUser}
                  onSwitchRole={handleSwitchRole}
                  onOpenChangePassword={() => setChangePasswordModalOpen(true)}
                  onShowToast={showToast}
                />
              )}

              {currentSection === 'settings' && (
                <SettingsView
                  settings={settings}
                  tournament={activeTournament}
                  currentUser={currentUser}
                  onUpdateSettings={updates => {
                    db.updateSettings(updates);
                    setSettings(db.getSettings());
                    if (activeTournament?.id) {
                      db.updateTournament(activeTournament.id, {
                        upiQrCodeUrl: updates.upiQrCodeUrl,
                        upiId: updates.upiId,
                        upiMobileNumber: updates.upiMobileNumber,
                        registrationFee: updates.registrationFee
                      });
                      refreshTournamentData(activeTournament.id);
                    }
                  }}
                  onUpdateTournament={handleUpdateTournament}
                  onResetDatabase={handleResetDatabase}
                  onShowToast={showToast}
                />
              )}
            </>
          )}
        </main>

        {/* Official Warhawks Tournament Organizer Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 sm:py-5 px-3 sm:px-6 lg:px-8 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-sm flex items-center gap-2">
                <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-5 h-5 object-contain rounded bg-white p-0.2 border border-slate-200 shrink-0" />
                <span>Warhawks</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-600 font-medium">Official Tournament Host & Organizing Branch</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400 text-[11px]">
              <span>Tournament Creation & Roster Governance</span>
              <span className="hidden sm:inline">•</span>
              <span>All Editions Partitioned</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Organizer Authentication Modal (Strictly Mobile + Password) */}
      <OrganizerLoginModal
        isOpen={organizerLoginModalOpen}
        onClose={() => setOrganizerLoginModalOpen(false)}
        onSuccess={handleOrganizerLoginSuccess}
        onShowToast={showToast}
      />

      {/* Individual Administrator Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      {/* Database Connection & Diagnostics Modal (Strictly Restricted to Admin) */}
      <DatabaseStatusModal
        isOpen={databaseModalOpen}
        onClose={() => setDatabaseModalOpen(false)}
        currentUser={currentUser}
        onOpenOrganizerLogin={() => setOrganizerLoginModalOpen(true)}
        onConnectionUpdated={handleDatabaseConnectionUpdated}
        onShowToast={showToast}
      />
    </div>
  );
}

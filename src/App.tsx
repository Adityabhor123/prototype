/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  runTransaction,
  serverTimestamp,
  where,
  limit,
  getDocs
} from 'firebase/firestore';
import { 
  User as UserIcon, 
  UserCog as AdminIcon, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ChevronRight, 
  LogOut,
  Info,
  Users,
  Trophy,
  UserPlus2,
  Radio,
  User2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Token, TokenStatus, TokenPriority, ServiceType, QueueCounters } from './types';

// Enum for internal routing
enum View {
  LANDING = 'landing',
  CITIZEN = 'citizen',
  STAFF = 'staff'
}

export default function App() {
  const [view, setView] = useState<View>(View.LANDING);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<Token[]>([]);
  const [counters, setCounters] = useState<QueueCounters | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to queue changes
  useEffect(() => {
    try {
      const q = query(collection(db, 'tokens'), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Token));
        setQueue(docs);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'tokens');
      });
      return () => unsubscribe();
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'tokens');
    }
  }, []);

  // Listen to counters
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(doc(db, 'meta', 'counters'), (docSnap) => {
        if (docSnap.exists()) {
          setCounters(docSnap.data() as QueueCounters);
        } else {
          // Initialize if doesn't exist
          setCounters({ lastTokenNumber: 0, activeNormalSinceLastSenior: 0 });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'meta/counters');
      });
      return () => unsubscribe();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'meta/counters');
    }
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50">Loading TokenEase...</div>;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 font-sans">
      <AnimatePresence mode="wait">
        {view === View.LANDING && (
          <LandingView key="landing" onRoleSelect={setView} />
        )}
        {view === View.CITIZEN && (
          <CitizenView 
            key="citizen" 
            onBack={() => setView(View.LANDING)} 
            queue={queue}
            counters={counters}
          />
        )}
        {view === View.STAFF && (
          <StaffView 
            key="staff" 
            onBack={() => setView(View.LANDING)} 
            queue={queue}
            counters={counters}
          />
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 w-full p-4 text-center text-xs text-slate-400 bg-white/50 backdrop-blur-sm border-t border-slate-100">
        TokenEase Hybrid Queue Management System • RTO Digital Services
      </footer>
    </div>
  );
}

// --- VIEWS ---

function LandingView({ onRoleSelect, key }: { onRoleSelect: (v: View) => void, key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
    >
      <div className="mb-12">
        <div className="bg-blue-600 inline-flex p-4 rounded-3xl mb-6 shadow-xl shadow-blue-200">
          <Clock className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">TokenEase</h1>
        <p className="text-slate-500 max-w-md mx-auto">
          Intelligent hybrid queue management for modern Regional Transport Offices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        <RoleCard 
          title="Citizen"
          description="Book a token online, view live queue status and get notified of your turn."
          icon={<UserIcon className="w-8 h-8" />}
          onClick={() => onRoleSelect(View.CITIZEN)}
          accent="blue"
        />
        <RoleCard 
          title="RTO Staff"
          description="Manage digital and walk-in queues, call next tokens, and monitor operations."
          icon={<AdminIcon className="w-8 h-8" />}
          onClick={() => onRoleSelect(View.STAFF)}
          accent="slate"
        />
      </div>
    </motion.div>
  );
}

function RoleCard({ title, description, icon, onClick, accent }: { 
  title: string, description: string, icon: React.ReactNode, onClick: () => void, accent: 'blue' | 'slate' 
}) {
  return (
    <motion.button
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start p-8 text-left rounded-3xl border transition-all duration-300 bg-white",
        accent === 'blue' ? "border-blue-100 hover:border-blue-400" : "border-slate-200 hover:border-slate-400"
      )}
    >
      <div className={cn(
        "p-3 rounded-2xl mb-6",
        accent === 'blue' ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-600"
      )}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      <div className="mt-6 flex items-center font-semibold text-sm group">
        <span>Get Started</span>
        <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
      </div>
    </motion.button>
  );
}

// --- CITIZEN VIEW ---

function CitizenView({ onBack, queue, counters, key }: { 
  onBack: () => void, queue: Token[], counters: QueueCounters | null, key?: string 
}) {
  const [showBooking, setShowBooking] = useState(false);
  const [name, setName] = useState('');
  const [service, setService] = useState<ServiceType>('License Services');
  const [isSenior, setIsSenior] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<Token | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // For prototype with no auth, we'll store local token in state for this session
  const [myTokenId, setMyTokenId] = useState<string | null>(localStorage.getItem('myTokenId'));
  const activeToken = queue.find(t => t.id === myTokenId && t.status !== 'completed' && t.status !== 'missed');

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setIsBusy(true);

    try {
      const counterPath = 'meta/counters';
      const tokensPath = 'tokens';

      await runTransaction(db, async (transaction) => {
        const counterDoc = doc(db, counterPath);
        const snap = await transaction.get(counterDoc);
        
        let nextNum = 1;
        if (snap.exists()) {
          nextNum = (snap.data().lastTokenNumber || 0) + 1;
        }
        
        const tokenDisplayId = `RTO-${100 + nextNum}`;
        const newToken = {
          tokenDisplayId,
          tokenNumber: nextNum,
          name,
          serviceType: service,
          mode: 'online',
          priority: isSenior ? 'senior' : 'normal',
          status: 'waiting',
          timestamp: serverTimestamp()
        };

        transaction.set(counterDoc, { lastTokenNumber: nextNum }, { merge: true });
        const newTokenRef = doc(collection(db, tokensPath));
        transaction.set(newTokenRef, newToken);
        setBookingSuccess({ ...newToken, id: newTokenRef.id } as any);
        setMyTokenId(newTokenRef.id);
        localStorage.setItem('myTokenId', newTokenRef.id);
      });
      setShowBooking(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transaction: online_booking');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      className="max-w-4xl mx-auto p-4 md:p-8 pt-12"
    >
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors flex items-center">
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Back
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Board */}
        <div className="lg:col-span-2 space-y-6">
          <LiveBoard queue={queue} />
          
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Your Service Token</h2>
            {activeToken ? (
              <TokenStatusCard token={activeToken} queue={queue} />
            ) : bookingSuccess ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-900">Booking Confirmed!</h3>
                <p className="text-green-700 text-sm mb-4">You are now in the queue. Watch the live status below.</p>
                <div className="bg-white p-4 rounded-xl inline-block shadow-sm">
                   <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Your Token</p>
                   <p className="text-3xl font-black text-slate-900">{bookingSuccess.tokenDisplayId}</p>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-slate-500 mb-6">You don't have an active token.</p>
                <button 
                  onClick={() => setShowBooking(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-1"
                >
                  Book Online Token
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6 text-sm text-slate-500">
          <div className="bg-white p-6 rounded-3xl border border-slate-100">
            <h3 className="text-slate-900 font-bold mb-4 flex items-center">
              <Info className="w-4 h-4 mr-2 text-blue-500" />
              How it works
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mr-3 mt-0.5">1</span>
                <span>Select your service type and provide your name.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mr-3 mt-0.5">2</span>
                <span>Get a digital token instantly placed in our smart queue.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mr-3 mt-0.5">3</span>
                <span>Wait for your turn while tracking real-time status.</span>
              </li>
              <li className="flex items-start">
                <span className="bg-orange-100 text-orange-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mr-3 mt-0.5">!</span>
                <span>Senior Citizens are prioritized (1 served per 3 normal users).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBooking(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-2">Book a Token</h2>
              <p className="text-slate-500 mb-8">Choose your service for RTO visit.</p>
              
              <form onSubmit={handleBook} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                  <input 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Service Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['License Services', 'Vehicle Registration', 'Renewal'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setService(s as ServiceType)}
                        className={cn(
                          "p-4 rounded-2xl text-left border-2 transition-all font-semibold",
                          service === s ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-100 bg-slate-50 text-slate-600"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl text-orange-800">
                  <input 
                    type="checkbox"
                    id="senior"
                    checked={isSenior}
                    onChange={e => setIsSenior(e.target.checked)}
                    className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="senior" className="text-sm font-medium cursor-pointer">
                    I am a Senior Citizen (Priority Queue)
                  </label>
                </div>
                
                <button 
                  type="submit"
                  disabled={isBusy}
                  className="w-full bg-blue-600 text-white rounded-2xl p-4 font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBusy ? 'Processing...' : 'Confirm Booking'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LiveBoard({ queue }: { queue: Token[] }) {
  const calling = queue.filter(t => t.status === 'calling');
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [flashTokenId, setFlashTokenId] = useState<string | null>(null);

  useEffect(() => {
    if (calling.length > 0) {
      const mostRecent = [...calling].sort((a,b) => (b.calledAt?.seconds || 0) - (a.calledAt?.seconds || 0))[0];
      if (mostRecent && mostRecent.id !== lastAnnouncedId) {
        setLastAnnouncedId(mostRecent.id);
        setFlashTokenId(mostRecent.id);
        const utterance = new SpeechSynthesisUtterance(`Now calling token ${mostRecent.tokenDisplayId.replace(/-/g, ' ')} to Counter ${mostRecent.counterNumber || 1}`);
        window.speechSynthesis.speak(utterance);
        const timer = setTimeout(() => setFlashTokenId(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [calling, lastAnnouncedId]);

  const waitingTokens = queue.filter(t => t.status === 'waiting').slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-3 bg-[#003366] text-white p-10 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        <p className="text-white/60 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">Currently Serving</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {calling.length > 0 ? calling.map(token => (
            <motion.div 
              key={token.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: flashTokenId === token.id ? [1, 1.05, 1] : 1,
                opacity: 1,
                borderColor: flashTokenId === token.id ? 'rgb(59, 130, 246)' : 'rgba(255, 255, 255, 0.1)'
              }}
              transition={{ scale: { repeat: flashTokenId === token.id ? 2 : 0, duration: 0.5 } }}
              className={cn(
                "p-6 rounded-2xl border bg-white/5 backdrop-blur-sm shadow-xl",
                flashTokenId === token.id && "shadow-blue-500/20"
              )}
            >
              <h1 className="text-5xl font-black mb-1 text-white">{token.tokenDisplayId}</h1>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 uppercase">Counter {token.counterNumber || 1}</span>
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-500/30">CALLING</span>
              </div>
            </motion.div>
          )) : (
            <div className="flex items-baseline gap-4 mb-4">
              <h1 className="text-7xl font-black">NONE</h1>
            </div>
          )}
        </div>
        
        <div className="flex gap-8 mt-10">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-white/40 uppercase">Live Board Active</span>
           </div>
           <div className="flex items-center gap-2">
              <User2 className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{queue.filter(t => t.status === 'waiting').length} waiting</span>
           </div>
        </div>
      </div>
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-4">Coming Up Next</p>
        <div className="space-y-4">
          {waitingTokens.length > 0 ? waitingTokens.map(t => (
            <div key={t.id} className="flex items-center justify-between">
              <span className="font-black text-slate-800">{t.tokenDisplayId}</span>
              <span className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                t.priority === 'senior' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
              )}>
                {t.priority}
              </span>
            </div>
          )) : <p className="text-slate-300 italic text-xs">No tokens waiting</p>}
          {queue.filter(t => t.status === 'waiting').length > 5 && (
            <p className="text-[10px] text-slate-400 font-bold text-center mt-2">+{queue.filter(t => t.status === 'waiting').length - 5} more</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TokenStatusCard({ token, queue }: { token: Token, queue: Token[] }) {
  const waitingList = queue.filter(t => t.status === 'waiting');
  const position = waitingList.findIndex(t => t.id === token.id);
  
  // Dynamic wait time based on last 3 tokens
  const avgTimePerUser = React.useMemo(() => {
    const completed = queue
      .filter(t => t.status === 'completed' && t.calledAt && t.completedAt)
      .sort((a,b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
      .slice(0, 3);
    
    if (completed.length === 0) return 5;

    const totalDuration = completed.reduce((acc, t) => {
      const call = t.calledAt.toMillis ? t.calledAt.toMillis() : t.calledAt.seconds * 1000;
      const comp = t.completedAt.toMillis ? t.completedAt.toMillis() : t.completedAt.seconds * 1000;
      return acc + (comp - call);
    }, 0);

    return Math.max(1, Math.round(totalDuration / completed.length / 1000 / 60));
  }, [queue]);

  const estWaitTime = position >= 0 ? position * avgTimePerUser : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              token.status === 'calling' ? "bg-green-500" : "bg-orange-500"
            )} />
            <span className="font-bold text-slate-700 capitalize">{token.status === 'calling' ? 'Please proceed to counter' : 'Waiting in queue'}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Queue ID</p>
          <p className="text-2xl font-black text-slate-900">{token.tokenDisplayId}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">Estimated Wait</p>
           <p className="text-3xl font-black text-slate-800">{token.status === 'calling' ? 'NOW' : `${estWaitTime}m`}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
           <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mb-2">People Ahead</p>
           <p className="text-3xl font-black text-blue-800">{token.status === 'calling' ? '0' : position}</p>
        </div>
      </div>

      {token.status === 'calling' && (
        <motion.div 
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="bg-green-100 p-4 rounded-2xl border border-green-200 text-green-800 text-sm font-semibold text-center"
        >
          🔊 Token {token.tokenDisplayId} please proceed to Window 1
        </motion.div>
      )}
    </div>
  );
}

// --- STAFF VIEW ---

function StaffView({ onBack, queue, counters, key }: { 
  onBack: () => void, queue: Token[], counters: QueueCounters | null, key?: string 
}) {
  const [showAddWalkin, setShowAddWalkin] = useState(false);
  const [name, setName] = useState('');
  const [service, setService] = useState<ServiceType>('License Services');
  const [isSenior, setIsSenior] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [counterNumber, setCounterNumber] = useState(1);

  const STAFF_SECRET = "RTO2026";

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey === STAFF_SECRET) {
      setIsAuthorized(true);
    } else {
      alert("Invalid Access Key");
    }
  };

  const handleAddWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setIsBusy(true);
    const counterPath = 'meta/counters';
    const tokensPath = 'tokens';
    
    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = doc(db, counterPath);
        const snap = await transaction.get(counterDoc);
        
        let nextNum = 1;
        if (snap.exists()) {
          nextNum = (snap.data().lastTokenNumber || 0) + 1;
        }
        
        const tokenDisplayId = `RTO-${100 + nextNum}`;
        const newToken = {
          tokenDisplayId,
          tokenNumber: nextNum,
          name,
          serviceType: service,
          mode: 'offline',
          priority: isSenior ? 'senior' : 'normal',
          status: 'waiting',
          timestamp: serverTimestamp(),
        };

        transaction.set(counterDoc, { lastTokenNumber: nextNum }, { merge: true });
        const newTokenRef = doc(collection(db, tokensPath));
        transaction.set(newTokenRef, newToken);
      });
      setShowAddWalkin(false);
      setName('');
      setIsSenior(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${counterPath} / ${tokensPath}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCallNext = async () => {
    if (!counters || isBusy || !isAuthorized) return;
    setIsBusy(true);

    try {
      const waitingTokens = queue.filter(t => t.status === 'waiting');
      if (waitingTokens.length === 0) {
        setIsBusy(false);
        return;
      }

      const normalWaiting = waitingTokens.filter(t => t.priority === 'normal');
      const seniorWaiting = waitingTokens.filter(t => t.priority === 'senior');

      let nextToken: Token | null = null;
      const servedSinceLastSenior = counters.activeNormalSinceLastSenior || 0;

      if (seniorWaiting.length > 0 && (servedSinceLastSenior >= 3 || normalWaiting.length === 0)) {
        nextToken = seniorWaiting[0];
      } else if (normalWaiting.length > 0) {
        nextToken = normalWaiting[0];
      } else if (seniorWaiting.length > 0) {
        nextToken = seniorWaiting[0];
      }

      if (nextToken) {
        const isPriority = nextToken.priority === 'senior';
        await runTransaction(db, async (transaction) => {
          const currentlyCallingAtThisCounter = queue.find(t => t.status === 'calling' && t.counterNumber === counterNumber);
          if (currentlyCallingAtThisCounter) {
            transaction.update(doc(db, 'tokens', currentlyCallingAtThisCounter.id), { 
              status: 'completed', 
              completedAt: serverTimestamp() 
            });
          }

          transaction.update(doc(db, 'tokens', nextToken!.id), { 
            status: 'calling', 
            calledAt: serverTimestamp(),
            counterNumber: counterNumber
          });

          transaction.set(doc(db, 'meta', 'counters'), {
            activeNormalSinceLastSenior: isPriority ? 0 : servedSinceLastSenior + 1
          }, { merge: true });
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transaction: call_next');
    } finally {
      setIsBusy(false);
    }
  };

  const history = queue.filter(t => t.status === 'completed' || t.status === 'missed').sort((a,b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0)).slice(0, 5);

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[2.5rem] shadow-xl w-full max-w-md border border-slate-100">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-blue-600">
             <AdminIcon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black mb-2 text-slate-800">Staff Authentication</h2>
          <p className="text-slate-500 mb-8 font-medium">Please enter the security key to access control room.</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password"
              placeholder="Security Key (Try RTO2026)"
              value={accessKey}
              onChange={e => setAccessKey(e.target.value)}
              className="w-full bg-slate-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button className="w-full bg-slate-900 text-white rounded-2xl p-4 font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              Unlock Terminal
            </button>
            <button onClick={onBack} type="button" className="w-full text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
              Return to Portal
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const currentAtCounter = queue.find(t => t.status === 'calling' && t.counterNumber === counterNumber);

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      className="max-w-7xl mx-auto p-4 md:p-8 pt-12 pb-24"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors flex items-center mb-2">
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
            Back to Portal
          </button>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
             <AdminIcon className="w-8 h-8 text-blue-600" />
             Staff Control Room
          </h1>
        </div>
        
        <div className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Current Terminal</span>
            <select 
              value={counterNumber}
              onChange={(e) => setCounterNumber(Number(e.target.value))}
              className="bg-transparent border-0 font-black text-slate-800 focus:ring-0 text-xl cursor-pointer"
            >
              {[1, 2, 3, 4].map(num => (
                <option key={num} value={num}>Counter {num}</option>
              ))}
            </select>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          <button 
            onClick={() => setShowAddWalkin(true)}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 group"
          >
            <UserPlus2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold pr-1">Add Offline</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Stats */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Queue Ratio</p>
             <p className="text-3xl font-black text-slate-900">{counters?.activeNormalSinceLastSenior || 0}/3</p>
             <p className="text-[10px] text-slate-400 mt-2 italic">Normal users served since last priority</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
               <Trophy className="w-4 h-4 text-orange-500" />
               Daily Summary
             </h3>
             <div className="space-y-4">
               {[
                 { label: 'Completed', value: queue.filter(t => t.status === 'completed').length, color: 'bg-green-50 text-green-600' },
                 { label: 'Missed', value: queue.filter(t => t.status === 'missed').length, color: 'bg-red-50 text-red-600' },
                 { label: 'Waiting', value: queue.filter(t => t.status === 'waiting').length, color: 'bg-blue-50 text-blue-600' },
               ].map(stat => (
                 <div key={stat.label} className="flex items-center justify-between">
                   <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                   <span className={cn("px-2 py-0.5 rounded-lg text-xs font-black", stat.color)}>{stat.value}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Center: Live Manager */}
        <div className="lg:col-span-3 space-y-8">
          {/* Current Serving Banner */}
          <div className="bg-[#003366] text-white p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
             <div className="relative z-10 text-center md:text-left">
                <p className="text-blue-300 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Serving at Counter {counterNumber}</p>
                <h2 className="text-6xl font-black mb-2">{currentAtCounter?.tokenDisplayId || "IDLE"}</h2>
                <div className="flex flex-wrap gap-4 mt-4">
                   <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-blue-300" />
                      <span className="font-bold text-sm">{currentAtCounter?.name || "No User"}</span>
                   </div>
                   <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-300" />
                      <span className="font-bold text-sm">{currentAtCounter?.serviceType || "No Service"}</span>
                   </div>
                </div>
             </div>
             
             {currentAtCounter ? (
               <div className="relative z-10 flex gap-4">
                  <button 
                     onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'tokens', currentAtCounter.id), { status: 'completed', completedAt: serverTimestamp() });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `tokens/${currentAtCounter.id}`);
                        }
                     }}
                     className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/20"
                   >
                     <CheckCircle2 className="w-5 h-5" />
                     Complete
                  </button>
                  <button 
                     onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'tokens', currentAtCounter.id), { status: 'missed', completedAt: serverTimestamp() });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `tokens/${currentAtCounter.id}`);
                        }
                     }}
                     className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold"
                  >
                     Absent
                  </button>
               </div>
             ) : (
               <div className="relative z-10">
                  <button 
                    onClick={handleCallNext}
                    disabled={isBusy || queue.filter(t => t.status === 'waiting').length === 0}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    {isBusy ? 'Calling...' : 'CALL NEXT'}
                  </button>
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Waiting List Table */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm h-fit">
              <h3 className="text-lg font-bold mb-6 flex justify-between items-center">
                <span>Waiting Queue</span>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-500">{queue.filter(t => t.status === 'waiting').length} users</span>
              </h3>
              <div className="space-y-4">
                {queue.filter(t => t.status === 'waiting').length > 0 ? queue.filter(t => t.status === 'waiting').map(t => (
                  <div key={t.id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                         t.priority === 'senior' ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600 shadow-sm"
                       )}>
                         {t.tokenDisplayId.split('-')[1]}
                       </div>
                       <div>
                          <p className="font-bold text-slate-800 text-sm leading-none mb-1">{t.name}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-slate-400">
                             <span>{t.serviceType}</span>
                             <span className="text-slate-200">•</span>
                             <span className={cn(t.mode === 'online' ? "text-blue-400" : "text-slate-400")}>{t.mode}</span>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'tokens', t.id), { status: 'calling', calledAt: serverTimestamp() });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `tokens/${t.id}`);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
                    >
                      CALL
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Queue is empty</p>
                  </div>
                )}
              </div>
            </div>

            {/* History Feed */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm h-fit">
              <h3 className="text-lg font-bold mb-6">Recent Completion</h3>
              <div className="space-y-4">
                {history.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                       <div className={cn("w-2 h-2 rounded-full", t.status === 'completed' ? "bg-green-400" : "bg-red-400")} />
                       <div>
                          <p className="text-sm font-bold text-slate-700">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Token {t.tokenDisplayId} • {t.status}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">
                      {t.completedAt ? new Date(t.completedAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '---'}
                    </span>
                  </div>
                ))}
                {history.length === 0 && <p className="text-center py-8 text-sm text-slate-400 italic">No history yet</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Walk-in Modal */}
      <AnimatePresence>
        {showAddWalkin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddWalkin(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 italic">Queue Walk-in Citizen</h2>
              <form onSubmit={handleAddWalkin} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Name at Counter</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-slate-500 transition-all" placeholder="Enter name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Service</label>
                  <select value={service} onChange={e => setService(e.target.value as ServiceType)} className="w-full bg-slate-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-slate-500 transition-all font-semibold">
                    <option value="DL">Driving License (DL)</option>
                    <option value="Registration">Registration</option>
                    <option value="Renewal">Renewal</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl text-orange-800">
                  <input type="checkbox" id="senior-walkin" checked={isSenior} onChange={e => setIsSenior(e.target.checked)} className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500" />
                  <label htmlFor="senior-walkin" className="text-sm font-bold cursor-pointer">Priority Case (Senior/Special)</label>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white rounded-2xl p-4 font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">Add to Queue</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Calendar, 
  FileText, 
  History, 
  LayoutDashboard, 
  QrCode, 
  Settings, 
  Users, 
  Video,
  ChevronRight,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { collection, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';

// Views
import CitizenHome from './views/citizen/CitizenHome';
import ProcedureDetail from './views/citizen/ProcedureDetail';
import TrackAppointment from './views/citizen/TrackAppointment';
import AdminDashboard from './views/admin/AdminDashboard';
import AdminAppointments from './views/admin/AdminAppointments';
import AdminProcedures from './views/admin/AdminProcedures';
import AdminManagement from './views/admin/AdminManagement';
import AdminSettings from './views/admin/AdminSettings';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Emblem_of_the_Vietnam_People%27s_Public_Security.svg/320px-Emblem_of_the_Vietnam_People%27s_Public_Security.svg.png'
  });

  useEffect(() => {
    // Check for redirect result
    getRedirectResult(auth).catch(err => {
      console.error("Redirect auth error:", err);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is admin
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const isBootstrapAdmin = user.email?.toLowerCase() === 'batdongsanphuan379@gmail.com';
          setIsAdmin(adminDoc.exists() || isBootstrapAdmin);
        } catch (error) {
          console.error("Admin check failed:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setUser(user);
      setLoading(false);
    });
    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[#1A5FB4] font-bold text-xl uppercase tracking-tighter"
        >
          LONG NGUYÊN SMART GOV
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#F8F9FA] text-[#1D1D1F]">
        <Routes>
          {/* Citizen Routes */}
          <Route path="/" element={<CitizenLayout settings={settings}><CitizenHome /></CitizenLayout>} />
          <Route path="/procedure/:id" element={<CitizenLayout settings={settings}><ProcedureDetail /></CitizenLayout>} />
          <Route path="/track" element={<CitizenLayout settings={settings}><TrackAppointment /></CitizenLayout>} />

          {/* Admin Routes */}
          <Route path="/admin" element={user ? (isAdmin ? <AdminLayout user={user} settings={settings}><AdminDashboard /></AdminLayout> : <UnAuthorized user={user} />) : <AdminLogin settings={settings} />} />
          <Route path="/admin/appointments" element={user ? (isAdmin ? <AdminLayout user={user} settings={settings}><AdminAppointments /></AdminLayout> : <UnAuthorized user={user} />) : <AdminLogin settings={settings} />} />
          <Route path="/admin/procedures" element={user ? (isAdmin ? <AdminLayout user={user} settings={settings}><AdminProcedures /></AdminLayout> : <UnAuthorized user={user} />) : <AdminLogin settings={settings} />} />
          <Route path="/admin/management" element={user ? (isAdmin ? <AdminLayout user={user} settings={settings}><AdminManagement /></AdminLayout> : <UnAuthorized user={user} />) : <AdminLogin settings={settings} />} />
          <Route path="/admin/settings" element={user ? (isAdmin ? <AdminLayout user={user} settings={settings}><AdminSettings /></AdminLayout> : <UnAuthorized user={user} />) : <AdminLogin settings={settings} />} />
        </Routes>
      </div>
    </Router>
  );
}

function UnAuthorized({ user }: { user: any }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5] p-6 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-6">
        <ShieldCheck size={48} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h1>
      <p className="text-gray-500 mb-4 max-w-xs">
        Tài khoản của bạn không có quyền truy cập vào hệ thống quản trị.
      </p>
      
      <div className="bg-white p-4 rounded-2xl border border-red-100 mb-8 w-full max-w-xs text-left">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">UID của bạn:</p>
        <code className="text-xs font-mono bg-gray-50 p-2 rounded block break-all text-gray-600">
          {user?.uid}
        </code>
        <p className="text-[10px] text-gray-400 mt-2 italic">Hãy gửi mã này cho Quản trị viên để được cấp quyền.</p>
      </div>

      <button 
        onClick={() => {
          signOut(auth);
          navigate('/');
        }}
        className="px-6 py-3 bg-[#1A5FB4] text-white rounded-xl font-bold shadow-lg"
      >
        Trở về Trang chủ
      </button>
    </div>
  );
}

function CitizenLayout({ children, settings }: { children: React.ReactNode, settings: any }) {
  const location = useLocation();
  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8F9FA] shadow-2xl relative pb-20 overflow-hidden">
      <header className="px-6 pt-12 pb-14 bg-gradient-to-br from-[#1A5FB4] to-[#0D3B75] text-white rounded-b-[3.5rem] shadow-[0_20px_50px_rgba(26,95,180,0.3)] mb-8 relative">
        {/* Decorative subtle light effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-300/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
        
        <div className="flex flex-col items-center text-center gap-5 relative z-10">
          <div className="w-22 h-22 bg-white/15 backdrop-blur-xl rounded-[2rem] p-3.5 shadow-[0_15px_35px_rgba(0,0,0,0.2)] border border-white/30 transform hover:scale-105 transition-transform duration-500">
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className="w-full h-full object-contain drop-shadow-2xl"
              crossOrigin="anonymous"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold leading-tight uppercase tracking-tight text-white drop-shadow-md">
              CÔNG AN PHƯỜNG LONG NGUYÊN
            </h1>
            <div className="flex items-center justify-center gap-3">
              <span className="h-[1px] w-6 bg-[#FFD700]/40" />
              <p className="text-[10px] font-display font-bold tracking-[0.4em] text-[#FFD700] uppercase opacity-90">HÀNH CHÍNH SỐ</p>
              <span className="h-[1px] w-6 bg-[#FFD700]/40" />
            </div>
          </div>
        </div>
      </header>

      <main className="px-5">
        {children}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[380px] bg-[#1A1A1A] text-white rounded-[2rem] px-8 py-4 flex justify-between items-center z-50 shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-white/5">
        <Link to="/" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/' ? 'text-blue-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
          <Smartphone size={20} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Home</span>
        </Link>
        <Link to="/track" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/track' ? 'text-blue-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
          <History size={20} strokeWidth={location.pathname === '/track' ? 2.5 : 2} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Track</span>
        </Link>
        <Link to="/admin" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-300 transition-all">
          <ShieldCheck size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">Staff</span>
        </Link>
      </nav>
    </div>
  );
}

function AdminLayout({ children, user, settings }: { children: React.ReactNode, user: any, settings: any }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    signOut(auth).then(() => navigate('/'));
  };

  const [stats, setStats] = useState({ appointments: 0, procedures: 0 });

  useEffect(() => {
    if (!user) return;
    
    // Reactive Appointments count
    const unsubApps = onSnapshot(collection(db, 'appointments'), (snap) => {
      setStats(prev => ({ ...prev, appointments: snap.size }));
    }, (err) => console.error("Sidebar apps count error:", err));

    // Reactive Procedures count
    const unsubProcs = onSnapshot(collection(db, 'procedures'), (snap) => {
      setStats(prev => ({ ...prev, procedures: snap.size }));
    }, (err) => console.error("Sidebar procs count error:", err));

    return () => {
      unsubApps();
      unsubProcs();
    };
  }, [user]);

  const menuItems = React.useMemo(() => [
    { label: 'Thống kê', icon: LayoutDashboard, path: '/admin', count: null },
    { label: 'Lịch hẹn', icon: Calendar, path: '/admin/appointments', count: stats.appointments },
    { label: 'Thủ tục', icon: FileText, path: '/admin/procedures', count: stats.procedures },
    { label: 'Cán bộ', icon: Users, path: '/admin/management', count: null },
    { label: 'Cấu hình', icon: Settings, path: '/admin/settings', count: null },
  ], [stats.appointments, stats.procedures]);

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#141414] text-white flex flex-col hidden md:flex border-right border-white/5">
        <div className="p-8 flex flex-col items-center gap-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="w-14 h-14 bg-white/10 p-2.5 rounded-2xl border border-white/10 shadow-xl">
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
            />
          </div>
          <div className="text-center px-2">
            <span className="block font-black tracking-widest text-[9px] text-blue-400 uppercase mb-1 whitespace-nowrap">HỆ THỐNG QUẢN TRỊ SMART GOV</span>
            <span className="block font-display font-bold tracking-tight text-[13px] uppercase text-white/90">CAP LONG NGUYÊN</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path 
                  ? 'bg-[#1A5FB4] text-white shadow-md' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium flex-1">{item.label}</span>
              {item.count !== null && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  location.pathname === item.path ? 'bg-white/20' : 'bg-[#1A5FB4]'
                }`}>
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
              {(user.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-gray-400">Cán bộ Tiếp dân</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">
            {menuItems.find(m => m.path === location.pathname)?.label || 'Quản trị'}
          </h2>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 text-gray-400 hover:text-[#1A5FB4] transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600">
              <Clock size={16} />
              {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>

        {/* Mobile Admin Bottom Nav */}
        <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] bg-[#141414] text-white rounded-[2rem] px-6 py-3 flex justify-between items-center z-50 shadow-2xl border border-white/5">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center gap-1 transition-all ${
                location.pathname === item.path ? 'text-blue-400 scale-110' : 'text-gray-500'
              }`}
            >
              <item.icon size={18} />
              <span className="text-[8px] font-black uppercase tracking-wider">{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 text-red-400"
          >
            <LogOut size={18} />
            <span className="text-[8px] font-black uppercase tracking-wider">Thoát</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

function AdminLogin({ settings }: { settings: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleLoginPopup = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameters to force account selection
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Popup login failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Cửa sổ đăng nhập bị chặn. Vui lòng sử dụng Đăng nhập Trực tiếp.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // User closed the popup, don't show error
      } else {
        setError("Lỗi đăng nhập: " + (err.message || "Không xác định"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("Redirect login failed:", err);
      setError("Lỗi đăng nhập: " + (err.message || "Không xác định"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5] p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-12 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-white relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600"></div>
        
        <div className="w-28 h-28 bg-white p-3 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center justify-center mx-auto mb-10 border border-gray-50 transform hover:rotate-3 transition-transform">
          <img 
            src={settings.logoUrl} 
            alt="Logo" 
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Khu vực Cán bộ</h1>
        <p className="text-gray-500 mb-8 leading-relaxed text-sm font-medium">
          Đăng nhập bằng tài khoản nội bộ để quản lý hệ thống.
        </p>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-3">
             <ShieldCheck size={20} />
             <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleLoginPopup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white font-black uppercase tracking-widest py-5 px-8 rounded-3xl transition-all shadow-xl hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                 <ShieldCheck size={22} className="text-blue-400" />
                 Đăng nhập (Cửa sổ)
              </>
            )}
          </button>

          <button 
            onClick={handleLoginRedirect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 hover:border-blue-500 text-gray-700 font-black uppercase tracking-widest py-5 px-8 rounded-3xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            Đăng nhập Trực tiếp
          </button>
        </div>

        <Link 
          to="/"
          className="mt-8 inline-block text-xs font-black uppercase tracking-widest text-[#1A5FB4] hover:opacity-70 transition-all"
        >
          Trở về Trang chủ
        </Link>
      </motion.div>
    </div>
  );
}

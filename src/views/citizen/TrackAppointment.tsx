import React, { useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { auth } from '../../firebase';
import { Appointment } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  History, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function TrackAppointment() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setSearched(true);
    
    const operationPath = 'appointments';
    try {
      const q = query(collection(db, operationPath), where('recordCode', '==', code.toUpperCase().trim()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAppointment({ id: snap.docs[0].id, ...snap.docs[0].data() } as Appointment);
      } else {
        setAppointment(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, operationPath);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Đang chờ xử lý', color: 'text-orange-500', bg: 'bg-orange-50', icon: Clock };
      case 'confirmed': return { label: 'Đã xác nhận', color: 'text-blue-500', bg: 'bg-blue-50', icon: CheckCircle };
      case 'completed': return { label: 'Hoàn thành', color: 'text-green-500', bg: 'bg-green-50', icon: CheckCircle };
      case 'cancelled': return { label: 'Đã hủy', color: 'text-red-500', bg: 'bg-red-50', icon: XCircle };
      default: return { label: 'Không xác định', color: 'text-gray-500', bg: 'bg-gray-50', icon: Info };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in transition-all duration-700">
      <section>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-3 tracking-tight">Tra cứu hồ sơ</h2>
        <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-[280px]">Nhập mã hồ sơ Gov-ID để xem trạng thái xử lý và lịch hẹn của bạn.</p>
      </section>

      <form onSubmit={handleTrack} className="relative group">
        <div className="bg-white p-3 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row gap-3 border border-gray-100 focus-within:ring-4 focus-within:ring-[#1A5FB4]/5 transition-all">
           <input 
             type="text" 
             placeholder="Mã GOV-XXXXXX" 
             className="flex-1 px-6 py-4 bg-gray-50/50 rounded-2xl font-display font-bold tracking-[0.2em] placeholder:tracking-normal placeholder:font-medium focus:outline-none uppercase text-gray-900 border border-transparent focus:border-gray-200 transition-all placeholder:text-gray-300"
             value={code}
             onChange={e => setCode(e.target.value)}
           />
           <button 
             type="submit"
             disabled={loading}
             className="bg-[#1A5FB4] hover:bg-[#144A8E] text-white py-4 px-8 rounded-2xl font-black tracking-widest shadow-lg shadow-[#1A5FB4]/20 active:scale-95 transition-all flex items-center justify-center gap-3"
           >
             {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <Search size={20} strokeWidth={3} />}
             <span>TRA CỨU</span>
           </button>
        </div>
      </form>

      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="w-12 h-12 border-4 border-[#1A5FB4]/20 border-t-[#1A5FB4] rounded-full animate-spin"></div>
              <p className="text-gray-400 font-medium">Đang truy xuất dữ liệu Bộ Công An...</p>
            </motion.div>
          ) : appointment ? (
             <motion.div 
               key="result"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
             >
                <div className={`p-6 ${getStatusConfig(appointment.status).bg} flex items-center justify-between`}>
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-white shadow-sm ${getStatusConfig(appointment.status).color}`}>
                         {React.createElement(getStatusConfig(appointment.status).icon, { size: 24 })}
                      </div>
                      <span className={`font-bold ${getStatusConfig(appointment.status).color}`}>
                        {getStatusConfig(appointment.status).label}
                      </span>
                   </div>
                   <span className="text-xs font-black text-gray-400 bg-white/50 px-3 py-1 rounded-full border border-white">
                     {appointment.recordCode}
                   </span>
                </div>
                <div className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                           <History size={20} />
                         </div>
                         <div>
                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Thủ tục</p>
                            <p className="font-bold text-gray-900 leading-tight">Mã thủ tục: {appointment.procedureId}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                           <Calendar size={20} />
                         </div>
                         <div>
                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Thời gian hẹn</p>
                            <p className="font-bold text-gray-900 leading-tight">
                              {appointment.appointmentDate} <span className="text-gray-300 mx-2">|</span> {appointment.timeSlot}
                            </p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="pt-6 border-t border-gray-100">
                      <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                         <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                         <p className="text-xs text-orange-800 leading-relaxed font-medium">
                            Vui lòng có mặt trước 10 phút. Nếu quá thời gian hẹn 15 phút, lịch hẹn sẽ tự động bị hủy để nhường chỗ cho người tiếp theo.
                         </p>
                      </div>
                   </div>
                </div>
             </motion.div>
          ) : searched ? (
             <motion.div 
               key="no-result"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-20 px-8 bg-white rounded-3xl border-2 border-dashed border-gray-200"
             >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle size={32} className="text-gray-300" />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Không tìm thấy mã hồ sơ</h4>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  Vui lòng kiểm tra lại mã trên phiếu ghi danh hoặc tin nhắn Zalo. Mã thường có định dạng GOV-XXXXXX.
                </p>
             </motion.div>
          ) : (
            <motion.div 
              key="idle"
              className="flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale saturate-0"
            >
               <History size={120} className="mb-4" />
               <p className="font-bold text-xl uppercase tracking-widest">Sẵn sàng tra cứu</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

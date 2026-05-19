import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { Appointment, AppointmentStatus } from '../../types';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCcw,
  User,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  ExternalLink,
  Check,
  X,
  Bell,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import ExportModal from '../../components/admin/ExportModal';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      handleFirestoreError(err, OperationType.LIST, 'appointments');
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus, phone: string, recordCode: string) => {
    setUpdatingId(id);
    try {
      const docRef = doc(db, 'appointments', id);
      const officerEmail = auth.currentUser?.email || 'Hệ thống';
      
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: serverTimestamp(),
        processedBy: officerEmail,
        processedAt: serverTimestamp()
      });

      // Send Zalo Notification
      let message = '';
      if (newStatus === 'confirmed') message = 'Lịch hẹn của bạn đã được XÁC NHẬN.';
      if (newStatus === 'cancelled') message = 'Lịch hẹn của bạn đã bị HỦY do hồ sơ không đủ điều kiện.';
      if (newStatus === 'completed') message = 'Hồ sơ của bạn đã HOÀN THÀNH. Vui lòng đến nhận kết quả.';

      if (message) {
        await axios.post('/api/notify-zalo', { phone, message, recordCode });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = appointments.filter(a => {
    const matchesSearch = a.citizenName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.recordCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'confirmed': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'completed': return 'bg-green-50 text-green-600 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm border border-gray-100">
        <div className="relative flex-1 w-full">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Tìm tên, mã, SĐT..." 
             className="w-full bg-gray-50 border-none rounded-2xl py-3.5 md:py-4 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all font-sans"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="flex gap-2 md:gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:flex-none">
             <select 
               className="w-full bg-gray-50 border-none rounded-xl py-3.5 md:py-4 pl-4 pr-10 text-[13px] md:text-sm font-bold text-gray-600 appearance-none focus:ring-2 focus:ring-blue-500"
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value)}
             >
               <option value="all">Tất cả</option>
               <option value="pending">Đang chờ</option>
               <option value="confirmed">Xác nhận</option>
               <option value="completed">Hoàn thành</option>
               <option value="cancelled">Đã hủy</option>
             </select>
             <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
           </div>
           <button 
              onClick={() => setIsExportModalOpen(true)}
              className="p-3.5 md:p-4 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-2"
              title="Xuất Excel"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden lg:inline text-xs font-bold uppercase tracking-widest">Xuất</span>
            </button>
            <button 
              className="p-3.5 md:p-4 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-default"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      <div className="bg-transparent md:bg-white md:rounded-[2.5rem] md:shadow-sm md:border md:border-gray-100 overflow-hidden">
        {/* Table View (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Hồ sơ / Citizen</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Lịch hẹn</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => (
                <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1A5FB4] font-black text-lg">
                          {item.citizenName[0]}
                       </div>
                       <div>
                          <p className="font-bold text-gray-900 mb-0.5">{item.citizenName}</p>
                          <p className="text-[10px] font-bold text-[#1A5FB4] uppercase mb-1">{item.procedureName}</p>
                          <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
                             <span className="flex items-center gap-1"><Phone size={12} /> {item.phone}</span>
                             <span className="text-[#1A5FB4] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{item.recordCode}</span>
                          </div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                           <Calendar size={14} className="text-gray-400" />
                           {item.appointmentDate}
                        </p>
                        <p className="text-xs font-black text-gray-400 flex items-center gap-2">
                           <Clock size={14} className="text-gray-400" />
                           {item.timeSlot}
                        </p>
                     </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center w-fit px-4 py-1.5 rounded-full text-xs font-black border-2 ${getStatusBadge(item.status)}`}>
                           {item.status.toUpperCase()}
                        </span>
                        {item.processedBy && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <UserCheck size={12} className="text-gray-400" />
                            <span className="truncate max-w-[120px]">{item.processedBy.split('@')[0]}</span>
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                       {item.status === 'pending' && (
                         <>
                           <button 
                             onClick={() => handleStatusChange(item.id, 'confirmed', item.phone, item.recordCode)}
                             disabled={updatingId === item.id}
                             title="Xác nhận"
                             className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                           >
                              <Check size={18} />
                           </button>
                           <button 
                             onClick={() => handleStatusChange(item.id, 'cancelled', item.phone, item.recordCode)}
                             disabled={updatingId === item.id}
                             title="Từ chối"
                             className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                           >
                              <X size={18} />
                           </button>
                         </>
                       )}
                       {item.status === 'confirmed' && (
                         <button 
                           onClick={() => handleStatusChange(item.id, 'completed', item.phone, item.recordCode)}
                           disabled={updatingId === item.id}
                           title="Hoàn thành"
                           className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all font-bold text-xs"
                         >
                            <CheckCircle size={16} /> HOÀN THÀNH
                         </button>
                       )}
                       <button className="p-3 text-gray-400 hover:text-gray-900 transition-colors">
                          <MoreVertical size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-4">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                  <Search size={32} />
               </div>
               <p className="font-bold text-gray-400">Không tìm thấy dữ liệu phù hợp</p>
            </div>
          )}
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1A5FB4] font-black">
                      {item.citizenName[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.citizenName}</p>
                      <span className="text-[10px] font-bold text-[#1A5FB4] uppercase">{item.recordCode}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black border-2 ${getStatusBadge(item.status)}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-50">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian</p>
                    <p className="text-xs font-bold text-gray-700">{item.appointmentDate}</p>
                    <p className="text-[10px] font-medium text-gray-500">{item.timeSlot}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Liên hệ</p>
                    <p className="text-xs font-bold text-gray-700">{item.phone}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {item.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleStatusChange(item.id, 'confirmed', item.phone, item.recordCode)}
                        disabled={updatingId === item.id}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
                      >
                         Xác nhận
                      </button>
                      <button 
                        onClick={() => handleStatusChange(item.id, 'cancelled', item.phone, item.recordCode)}
                        disabled={updatingId === item.id}
                        className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider"
                      >
                         Từ chối
                      </button>
                    </>
                  )}
                  {item.status === 'confirmed' && (
                    <button 
                      onClick={() => handleStatusChange(item.id, 'completed', item.phone, item.recordCode)}
                      disabled={updatingId === item.id}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                       <CheckCircle size={14} /> Hoàn thành
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && !loading && (
            <div className="py-12 bg-white rounded-3xl border border-gray-100 text-center">
              <p className="text-sm font-bold text-gray-400">Không có dữ liệu</p>
            </div>
          )}
        </div>
      </div>
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        data={appointments} 
      />
    </div>
  );
}

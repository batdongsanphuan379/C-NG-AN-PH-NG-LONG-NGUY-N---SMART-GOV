import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { Procedure, Appointment } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Video, 
  FileDown, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

const TIME_SLOTS = [
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00'
];

const MAX_CAPACITY = 5; // Limit per slot

export default function ProcedureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    citizenName: '',
    phone: '',
    citizenId: '',
    appointmentDate: format(new Date(), 'yyyy-MM-dd'),
    timeSlot: ''
  });
  
  const [slotAvailability, setSlotAvailability] = useState<Record<string, number>>({});
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProcedure() {
      if (!id) return;
      try {
        const docRef = doc(db, 'procedures', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProcedure({ id: docSnap.id, ...docSnap.data() } as Procedure);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `procedures/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchProcedure();
  }, [id]);

  useEffect(() => {
    async function checkAvailability() {
      if (!formData.appointmentDate) return;
      try {
        const slotsRef = collection(db, 'slots');
        // slotId format: YYYY-MM-DD_TIME_SLOT
        const availability: Record<string, number> = {};
        for (const slot of TIME_SLOTS) {
           const slotId = `${formData.appointmentDate}_${slot.replace(/\s/g, '')}`;
           const slotDoc = await getDoc(doc(db, 'slots', slotId));
           availability[slot] = slotDoc.exists() ? slotDoc.data().currentCount : 0;
        }
        setSlotAvailability(availability);
      } catch (error) {
        console.error("Availability check failed", error);
      }
    }
    checkAvailability();
  }, [formData.appointmentDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit triggered. Form data:", formData);
    if (!formData.timeSlot) return alert("Vui lòng chọn khung giờ");
    
    setBooking(true);
    try {
      const slotId = `${formData.appointmentDate}_${formData.timeSlot.replace(/\s/g, '')}`;
      const slotRef = doc(db, 'slots', slotId);
      
      // Atomic check and increment logic
      const slotSnap = await getDoc(slotRef);
      const currentCount = slotSnap.exists() ? (slotSnap.data() as any).currentCount : 0;
      
      if (currentCount >= MAX_CAPACITY) {
        alert("Khung giờ này đã hết chỗ, vui lòng chọn khung giờ khác.");
        setBooking(false);
        return;
      }

      // Generate a unique record code
      const recordCode = 'GOV-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const appointmentData = {
        citizenName: formData.citizenName,
        phone: formData.phone,
        citizenId: formData.citizenId,
        appointmentDate: formData.appointmentDate,
        timeSlot: formData.timeSlot,
        procedureId: id,
        procedureName: procedure?.name || 'Thủ tục mới',
        status: 'pending',
        recordCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log("Submitting appointment data:", appointmentData);

      // 1. Create Appointment
      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);

      // 2. Update Slot Counter
      if (slotSnap.exists()) {
        await updateDoc(slotRef, { currentCount: increment(1) });
      } else {
        await setDoc(slotRef, { currentCount: 1, maxCapacity: MAX_CAPACITY });
      }

      // 3. Trigger Zalo Notification
      try {
        await axios.post('/api/notify-zalo', {
          phone: formData.phone,
          message: `Lịch hẹn mới: ${procedure?.name}. Mã tra cứu: ${recordCode}`,
          recordCode
        });
      } catch (err) {
        console.warn("Zalo notification failed:", err);
      }

      setBookingSuccess(recordCode);
      setShowModal(false);
    } catch (error: any) {
      console.error("Booking error details:", error);
      if (error.message?.includes('permission-denied')) {
        alert("Lỗi: Từ chối truy cập (Permission Denied). Có thể do dữ liệu không hợp lệ hoặc lỗi phân quyền.");
      } else {
        alert("Lỗi khi đăng ký: " + (error.message || "Vui lòng thử lại sau."));
      }
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold opacity-20">Đang tải...</div>;
  if (!procedure) return <div className="text-center py-20 text-red-500 font-bold">Không tìm thấy thủ tục.</div>;

  return (
    <div className="pb-24 animate-in slide-in-from-bottom duration-500">
      <button 
        onClick={() => navigate('/')}
        className="mb-8 flex items-center gap-2 text-gray-400 font-black text-[10px] tracking-widest uppercase hover:text-[#1A5FB4] transition-colors bg-gray-50 px-4 py-2 rounded-full"
      >
        <ArrowLeft size={14} strokeWidth={3} /> Quay lại
      </button>

      <div className="space-y-8">
        <h2 className="text-3xl font-display font-bold text-gray-900 leading-tight tracking-tight">{procedure.name}</h2>
        
        {/* Video Player */}
        {procedure.videoUrl ? (
          <div className="aspect-video bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
            {procedure.videoUrl.includes('youtube.com') || procedure.videoUrl.includes('youtu.be') ? (
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${procedure.videoUrl.split('v=')[1] || procedure.videoUrl.split('/').pop()}`}
                title="Video hướng dẫn"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="relative z-0"
              ></iframe>
            ) : procedure.videoUrl.match(/\.(mp4|webm|ogg)$/) || procedure.videoUrl.includes('firebasestorage.googleapis.com') ? (
              <video 
                src={procedure.videoUrl} 
                controls 
                className="w-full h-full object-cover"
                poster={procedure.zaloGroupUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${procedure.zaloGroupUrl}` : undefined}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4">
                <Video size={64} strokeWidth={1.5} />
                <p className="text-sm font-black uppercase tracking-widest">Video Player</p>
                <a href={procedure.videoUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/10 rounded-2xl text-white text-xs font-bold hover:bg-white/20 transition-all">Mở xem hướng dẫn</a>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-blue-50 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-blue-200 border-2 border-dashed border-blue-100">
             <Video size={64} strokeWidth={1} />
             <p className="text-xs font-black uppercase tracking-[0.2em]">Video hướng dẫn đang được cập nhật</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          {procedure.pdfUrl ? (
            <a 
              href={procedure.pdfUrl} 
              download 
              className="flex flex-col items-center gap-4 bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center group"
            >
              <div className="p-4 bg-blue-50 text-[#1A5FB4] rounded-2xl group-hover:bg-[#1A5FB4] group-hover:text-white transition-all">
                <FileDown size={24} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-normal">Biểu mẫu<br/>PDF</span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-4 bg-gray-50 p-7 rounded-[2.5rem] border border-gray-100 text-center opacity-60">
              <div className="p-4 bg-gray-200 text-gray-400 rounded-2xl">
                <FileDown size={24} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-normal">Không có<br/>Mẫu PDF</span>
            </div>
          )}
          <button 
             onClick={() => setShowModal(true)}
             className="flex flex-col items-center gap-4 bg-[#1A1A1A] p-7 rounded-[2.5rem] shadow-xl hover:shadow-[#1A5FB4]/20 hover:-translate-y-1 transition-all text-center group"
          >
            <div className="p-4 bg-white/10 text-white rounded-2xl group-hover:bg-blue-500 transition-all">
              <Calendar size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-black text-white uppercase tracking-widest leading-normal">Đặt lịch<br/>Hẹn gắp</span>
          </button>
        </div>

        {procedure.additionalLinks && procedure.additionalLinks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {procedure.additionalLinks.map((link, idx) => (
              <a 
                key={idx}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <LinkIcon size={18} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{link.label}</span>
                </div>
                <div className="text-gray-300 group-hover:text-blue-500 transition-colors">
                  <ArrowLeft size={16} className="rotate-180" />
                </div>
              </a>
            ))}
          </div>
        )}

        {procedure.zaloGroupUrl && (
          <div className="bg-[#E7F3FF] rounded-[2.5rem] p-8 border border-blue-100 flex flex-col items-center text-center gap-6">
            <div className="space-y-2">
              <h4 className="text-lg font-black text-[#1A5FB4] uppercase tracking-tight">Tham gia Nhóm Zalo Hỗ trợ</h4>
              <p className="text-sm text-blue-800/70 font-medium">Quét mã để được cán bộ hướng dẫn chi tiết qua Zalo</p>
            </div>
            
            <div className="bg-white p-4 rounded-3xl shadow-xl shadow-blue-500/10 border-4 border-white">
              <QRCodeCanvas 
                value={procedure.zaloGroupUrl} 
                size={180}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>

            <a 
              href={procedure.zaloGroupUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-[#0068FF] text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-95"
            >
              <MessageCircle size={20} /> VÀO NHÓM ZALO
            </a>
          </div>
        )}

        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
           <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
             <AlertCircle size={18} className="text-[#1A5FB4]" />
             Thông tin Thủ tục
           </h4>
           <div className="prose prose-sm text-gray-600 leading-relaxed">
             {procedure.description || "Nội dung đang được cập nhật..."}
           </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 sm:hidden"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 leading-tight">Ghi danh Lịch hẹn</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="Họ và tên người đăng ký"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1A5FB4] transition-all font-medium"
                      value={formData.citizenName}
                      onChange={e => setFormData({...formData, citizenName: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      required
                      type="tel" 
                      placeholder="Số điện thoại Zalo"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1A5FB4] transition-all font-medium"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="Số CCCD 12 chữ số"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1A5FB4] transition-all font-medium"
                      value={formData.citizenId}
                      onChange={e => setFormData({...formData, citizenId: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      required
                      type="date" 
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1A5FB4] transition-all font-medium"
                      value={formData.appointmentDate}
                      onChange={e => setFormData({...formData, appointmentDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Chọn khung giờ</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const count = slotAvailability[slot] || 0;
                      const isFull = count >= MAX_CAPACITY;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isFull}
                          onClick={() => setFormData({...formData, timeSlot: slot})}
                          className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative shadow-sm ${
                            formData.timeSlot === slot 
                              ? 'bg-[#1A5FB4] border-[#1A5FB4] text-white shadow-[#1A5FB4]/30 overflow-hidden' 
                              : isFull 
                                ? 'bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed opacity-50' 
                                : 'bg-white border-gray-100 text-gray-600 hover:border-[#1A5FB4]/30'
                          }`}
                        >
                          <span className="text-[11px] font-black">{slot}</span>
                          <span className={`text-[9px] font-bold mt-0.5 ${formData.timeSlot === slot ? 'text-blue-100' : 'text-gray-400'}`}>
                            {isFull ? 'Hết chỗ' : `Còn ${MAX_CAPACITY - count} chỗ`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={booking}
                  className="w-full bg-[#1A5FB4] h-16 rounded-[1.25rem] text-white font-black text-lg shadow-xl shadow-[#1A5FB4]/30 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {booking ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐĂNG KÝ'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {bookingSuccess && (
           <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="absolute inset-0 bg-black/80 backdrop-blur-md"
             ></motion.div>
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl"
             >
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-green-200/50">
                   <CheckCircle2 size={56} className="text-green-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Thành Công!</h3>
                <p className="text-gray-500 mb-8 font-medium leading-relaxed">
                  Lịch hẹn của bạn đã được ghi nhận. Mã tra cứu tiến độ của bạn là:
                </p>
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-6 mb-8">
                   <span className="text-3xl font-black text-[#1A5FB4] tracking-[0.2em]">{bookingSuccess}</span>
                </div>
                <p className="text-xs text-orange-600 font-bold mb-8 flex items-center justify-center gap-2">
                  <AlertCircle size={14} />
                  Vui lòng lưu lại mã này hoặc kiểm tra Zalo.
                </p>
                <button 
                  onClick={() => navigate('/track')}
                  className="w-full bg-gray-900 py-4 rounded-2xl text-white font-bold hover:bg-black transition-all"
                >
                  TRA CỨU TIẾN ĐỘ
                </button>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}

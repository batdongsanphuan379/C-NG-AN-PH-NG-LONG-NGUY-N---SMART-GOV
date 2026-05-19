import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { ShieldCheck, UserPlus, Trash2, Mail, Fingerprint, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminMember {
  id: string; // This is the UID
  email?: string;
  role?: string;
  addedAt?: any;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUid, setNewUid] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminMember));
      setAdmins(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      handleFirestoreError(err, OperationType.LIST, 'admins');
    });

    return unsub;
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) return;

    setIsAdding(true);
    try {
      await setDoc(doc(db, 'admins', newUid.trim()), {
        email: newEmail.trim() || 'N/A',
        role: 'Cán bộ',
        addedAt: new Date()
      });
      setNewUid('');
      setNewEmail('');
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, `admins/${newUid}`);
    } finally {
      setIsAdding(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleRemoveAdmin = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'admins', uid));
      setDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.DELETE, `admins/${uid}`);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-3">
            <ShieldCheck className="text-[#1A5FB4]" size={28} className="md:w-8 md:h-8" />
            Bảo mật Cán bộ
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Quản lý quyền truy cập hệ thống.</p>
        </div>
      </header>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 p-5 md:p-6 rounded-3xl flex gap-3 md:gap-4">
        <Info className="text-blue-500 shrink-0" size={20} className="md:w-6 md:h-6" />
        <div className="text-[11px] md:text-sm text-blue-800 space-y-1.5 md:space-y-2">
          <p className="font-bold">Cách lấy UID để cấp quyền:</p>
          <div className="space-y-1">
            <p>1. Cán bộ đăng nhập vào "Khu vực cán bộ".</p>
            <p>2. Copy mã UID hiển thị trên màn hình lỗi (Nếu chưa có quyền).</p>
            <p>3. Dán UID vào ô dưới đây để xác thực.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Form Section */}
        <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100 h-fit">
          <h3 className="text-base md:text-lg font-bold text-gray-800 mb-5 md:mb-6 flex items-center gap-2">
            <UserPlus size={18} className="text-[#1A5FB4] md:w-5 md:h-5" />
            Cấp quyền mới
          </h3>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 pl-1">
                UID Cán bộ
              </label>
              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  required
                  placeholder="UID..."
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3.5 md:py-4 pl-11 md:pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-[#1A5FB4] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 pl-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="email"
                  placeholder="name@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3.5 md:py-4 pl-11 md:pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-[#1A5FB4] transition-all"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={isAdding || !newUid}
              className="w-full bg-[#1A5FB4] text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 hover:bg-[#144A8E] transition-all disabled:opacity-50"
            >
              {isAdding ? 'Đang cấp quyền...' : 'Cấp quyền'}
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 pl-4">Danh sách Cán bộ được cấp quyền ({admins.length})</h3>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {admins.map((admin) => (
                <motion.div 
                  key={admin.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-100 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1A5FB4]/5 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="text-[#1A5FB4]" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{admin.email}</h4>
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">UID: {admin.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {deleteConfirm === admin.id ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                        <button 
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-gray-600"
                        >
                          Hủy
                        </button>
                        <button 
                          onClick={() => handleRemoveAdmin(admin.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Xác nhận xóa
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirm(admin.id)}
                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Thu hồi quyền"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!loading && admins.length === 0 && (
              <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                <ShieldCheck className="mx-auto text-gray-200 mb-4" size={48} />
                <p className="text-gray-400 font-medium">Chưa có cán bộ nào được cấp quyền thủ công.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

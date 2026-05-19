import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, OperationType, handleFirestoreError } from '../../firebase';
import { Procedure } from '../../types';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Video, 
  FileText, 
  Save, 
  X,
  ExternalLink,
  ChevronRight,
  Upload,
  Minus,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminProcedures() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProc, setEditingProc] = useState<Procedure | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    videoUrl: '',
    pdfUrl: '',
    description: '',
    zaloGroupUrl: '',
    additionalLinks: [] as { label: string, url: string }[]
  });

  const fetchProcedures = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'procedures'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setProcedures(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Procedure)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

  const openModal = (proc: Procedure | null = null) => {
    if (proc) {
      setEditingProc(proc);
      setFormData({
        name: proc.name,
        category: proc.category || '',
        videoUrl: proc.videoUrl || '',
        pdfUrl: proc.pdfUrl || '',
        description: proc.description,
        zaloGroupUrl: proc.zaloGroupUrl || '',
        additionalLinks: proc.additionalLinks || []
      });
    } else {
      setEditingProc(null);
      setFormData({ 
        name: '', 
        category: '', 
        videoUrl: '', 
        pdfUrl: '', 
        description: '', 
        zaloGroupUrl: '', 
        additionalLinks: [] 
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const operationPath = 'procedures';
    try {
      if (editingProc) {
        const docRef = doc(db, operationPath, editingProc.id);
        await updateDoc(docRef, formData);
      } else {
        await addDoc(collection(db, operationPath), formData);
      }
      await fetchProcedures();
      setShowModal(false);
      alert("Lưu Thủ tục thành công! Bạn có thể xem danh sách tại tab 'Thủ tục'.");
    } catch (err: any) {
      console.error("Save error:", err);
      handleFirestoreError(err, editingProc ? OperationType.UPDATE : OperationType.CREATE, operationPath);
    }
  };

  const addLink = () => {
    setFormData(prev => ({
      ...prev,
      additionalLinks: [...prev.additionalLinks, { label: '', url: '' }]
    }));
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...formData.additionalLinks];
    newLinks[index][field] = value;
    setFormData(prev => ({ ...prev, additionalLinks: newLinks }));
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalLinks: prev.additionalLinks.filter((_, i) => i !== index)
    }));
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'procedures', id));
      setProcedures(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `procedures/${id}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name, "Size:", file.size);

    // Validate size (e.g., max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("Dung lượng video quá lớn. Vui lòng chọn file dưới 50MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storagePath = `procedure-videos/${Date.now()}_${file.name}`;
      console.log("Starting upload to path:", storagePath);
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
          console.log("Upload progress:", progress, "%");
        },
        (error) => {
          console.error("Upload error details:", error);
          alert(`Lỗi khi tải video lên: ${error.message || 'Lỗi không xác định'}. Vui lòng kiểm tra quyền truy cập Storage và dung lượng file.`);
          setIsUploading(false);
          setUploadProgress(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("Upload complete! Download URL:", downloadURL);
          setFormData(prev => ({ ...prev, videoUrl: downloadURL }));
          setIsUploading(false);
          setUploadProgress(null);
          alert("Tải video lên thành công!");
        }
      );
    } catch (err) {
      console.error("Caught error during upload initiation:", err);
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const [isSeeding, setIsSeeding] = useState(false);

  const seedResidenceProcedures = async () => {
    const category = 'Đăng ký, quản lý cư trú';
    const items = [
      'Đăng ký thường trú',
      'Đăng ký tạm trú',
      'Xoá đăng ký tạm trú',
      'Xoá đăng ký thường trú',
      'Xác nhận thông tin nơi cư trú',
      'Điều chỉnh thông tin về cư trú trong cơ sở Dữ liệu về cư trú'
    ];
    
    // Check for duplicates
    const existingNames = new Set(procedures.map(p => p.name));
    const newItems = items.filter(name => !existingNames.has(name));
    
    if (newItems.length === 0) {
      alert("Các mục này đã tồn tại trong hệ thống.");
      return;
    }

    setIsSeeding(true);
    try {
      for (const name of newItems) {
        await addDoc(collection(db, 'procedures'), {
          name,
          category,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          description: `Hướng dẫn thực hiện thủ tục ${name}`
        });
      }
      await fetchProcedures();
      alert(`Đã khởi tạo thêm ${newItems.length} mục con cho danh mục Đăng ký, quản lý cư trú!`);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'procedures');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-sm border border-gray-100">
         <div className="w-full md:w-auto">
            <h2 className="text-xl font-bold text-gray-800">Danh mục Thủ tục</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
               <p className="text-sm text-gray-500">Quản lý hướng dẫn và biểu mẫu</p>
               <button 
                 onClick={seedResidenceProcedures}
                 disabled={isSeeding}
                 className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold hover:bg-amber-100 transition-colors border border-amber-100 disabled:opacity-50"
               >
                 {isSeeding ? '...' : '+ Khởi tạo cư trú'}
               </button>
            </div>
         </div>
         <button 
           onClick={() => openModal()}
           className="w-full md:w-auto flex items-center justify-center gap-3 bg-[#1A5FB4] text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-95"
         >
            <Plus size={20} /> Thêm thủ tục
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        <AnimatePresence>
          {procedures.map((proc) => (
            <motion.div 
              key={proc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-5 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col group hover:shadow-md transition-shadow"
            >
               <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center text-[#1A5FB4]">
                     <FileText size={20} className="md:w-6 md:h-6" />
                  </div>
                  <div className="flex gap-1">
                     <button 
                       onClick={() => openModal(proc)}
                       className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                     >
                        <Edit3 size={18} />
                     </button>
                     <button 
                       onClick={() => handleDelete(proc.id)}
                       disabled={isDeleting === proc.id}
                       className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                     >
                        {isDeleting === proc.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                     </button>
                  </div>
               </div>
               
               <h3 className="text-lg font-bold text-gray-900 mb-0.5 leading-tight pr-4">{proc.name}</h3>
               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">{proc.category || 'Chưa phân loại'}</p>
               <p className="text-sm text-gray-400 line-clamp-2 mb-6 flex-1">{proc.description || "Chưa có mô tả chi tiết cho thủ tục này."}</p>
               
               <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold p-3 bg-gray-50 rounded-xl">
                     <span className="flex items-center gap-2 text-red-500 uppercase tracking-wider">
                        <Video size={14} /> Video
                     </span>
                     <span className="text-gray-400 truncate max-w-[150px] font-medium">{proc.videoUrl}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold p-3 bg-gray-50 rounded-xl">
                     <span className="flex items-center gap-2 text-blue-500 uppercase tracking-wider">
                        <FileText size={14} /> Form PDF
                     </span>
                     <span className="text-gray-400 truncate max-w-[150px] font-medium">{proc.pdfUrl}</span>
                  </div>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => (
             <div key={i} className="h-64 bg-white rounded-[2.5rem] animate-pulse border border-gray-100"></div>
           ))}
        </div>
      )}

      {/* Entry Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowModal(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
             ></motion.div>
             
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
             >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingProc ? 'Cập nhật Thủ tục' : 'Tạo Thủ tục mới'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Tên thủ tục</label>
                         <input 
                           required
                           type="text" 
                           placeholder="VD: Cấp lại đăng ký xe máy"
                           className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                           value={formData.name}
                           onChange={e => setFormData({...formData, name: e.target.value})}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Danh mục</label>
                         <input 
                           type="text" 
                           placeholder="VD: Đăng ký, quản lý cư trú"
                           className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                           value={formData.category}
                           onChange={e => setFormData({...formData, category: e.target.value})}
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Video hướng dẫn (Không bắt buộc)</label>
                        <div className="flex flex-col gap-3">
                          <input 
                            type="url" 
                            placeholder="URL Video (YouTube hoặc Link trực tiếp)"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            value={formData.videoUrl}
                            onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                          />
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="video/*" 
                              onChange={handleVideoUpload}
                              className="hidden" 
                              id="video-upload"
                              disabled={isUploading}
                            />
                            <label 
                              htmlFor="video-upload"
                              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                                isUploading 
                                ? 'bg-gray-50 border-gray-200 text-gray-400' 
                                : 'bg-blue-50 border-blue-200 text-[#1A5FB4] hover:bg-blue-100'
                              }`}
                            >
                              {isUploading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                  <span className="text-xs font-bold uppercase tracking-wider">Đang tải lên {uploadProgress}%</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={16} />
                                  <span className="text-xs font-bold uppercase tracking-wider">Tải lên video trực tiếp</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">URL File PDF (Không bắt buộc)</label>
                        <input 
                          type="url" 
                          placeholder="https://..."
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                          value={formData.pdfUrl}
                          onChange={e => setFormData({...formData, pdfUrl: e.target.value})}
                        />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Các liên kết bổ sung</label>
                        <button 
                          type="button" 
                          onClick={addLink}
                          className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-all"
                        >
                          + Thêm liên kết
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {formData.additionalLinks.map((link, idx) => (
                          <div key={idx} className="flex gap-3 items-start">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <input 
                                type="text"
                                placeholder="Tên (VD: Biểu mẫu 01)"
                                className="bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={link.label}
                                onChange={e => updateLink(idx, 'label', e.target.value)}
                              />
                              <input 
                                type="url"
                                placeholder="Link liên kết"
                                className="bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={link.url}
                                onChange={e => updateLink(idx, 'url', e.target.value)}
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeLink(idx)}
                              className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                            >
                              <Minus size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Link Nhóm Zalo Hỗ trợ</label>
                      <input 
                        type="url" 
                        placeholder="https://zalo.me/g/..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                        value={formData.zaloGroupUrl}
                        onChange={e => setFormData({...formData, zaloGroupUrl: e.target.value})}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Mô tả chi tiết</label>
                      <textarea 
                        rows={4}
                        placeholder="Hướng dẫn quy trình, hồ sơ cần chuẩn bị..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                   </div>

                   <button 
                     type="submit"
                     className="w-full bg-[#1A5FB4] h-16 rounded-2xl text-white font-black text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3"
                   >
                     <Save size={22} /> {editingProc ? 'CẬP NHẬT THAY ĐỔI' : 'LƯU THỦ TỤC'}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

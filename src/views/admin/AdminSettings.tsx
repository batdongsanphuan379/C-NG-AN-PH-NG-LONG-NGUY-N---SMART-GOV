import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Image as ImageIcon, Link as LinkIcon, AlertCircle, Upload, X, Check } from 'lucide-react';

export default function AdminSettings() {
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          setLogoUrl(settingsDoc.data().logoUrl || '');
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file hình ảnh (PNG, JPG, SVG).' });
      return;
    }

    if (file.size > 2100000) { // 2MB limit
      setMessage({ type: 'error', text: 'Kích thước file quá lớn. Vui lòng chọn file dưới 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Simple resizing if image is too large for Firestore (1MB limit)
        // Base64 overhead is ~33%, so we aiming for < 700KB original-equivalent
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Target max dimension for logo (usually doesn't need to be huge)
        const MAX_DIM = 800;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Export as webp or png with compression
        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
        setLogoUrl(compressedBase64);
        setMessage({ type: 'success', text: 'Đã tải và tối ưu ảnh thành công. Nhấn Lưu để áp dụng.' });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        logoUrl: logoUrl.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setMessage({ type: 'success', text: 'Cập nhật cấu hình thành công!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'Có lỗi ra khi lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
            <ImageIcon className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 leading-tight">Cấu hình Hệ thống</h3>
            <p className="text-gray-500 text-sm font-medium">Tùy chỉnh logo và giao diện ứng dụng</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-10">
          {/* Upload Area */}
          <div className="space-y-4">
            <label className="block text-sm font-black text-gray-400 uppercase tracking-widest pl-1">
              Logo Application
            </label>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative cursor-pointer border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center text-center transition-all group ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                    : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-gray-100/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                  isDragging ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-400 shadow-sm group-hover:scale-110 group-hover:text-blue-500'
                }`}>
                  <Upload size={24} />
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-700">Kéo thả hoặc Click để tải lên</h4>
                  <p className="text-xs text-gray-400 font-medium">PNG, SVG, JPG (Tối đa 2MB)</p>
                </div>

                {logoUrl && logoUrl.startsWith('data:') && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* URL Input Box */}
              <div className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-8 flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
                    <LinkIcon size={16} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hoặc sử dụng Link ảnh</span>
                </div>
                
                <input 
                  type="url"
                  value={logoUrl.startsWith('data:') ? '' : logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-white border border-gray-200 focus:border-blue-500 p-4 rounded-xl outline-none transition-all text-sm font-medium text-gray-700"
                />
                
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                  * Hệ thống sẽ ưu tiên sử dụng ảnh bạn vừa tải lên nếu có.
                </p>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <AnimatePresence>
            {logoUrl && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-50 p-8 md:p-12 rounded-[2.5rem] border border-gray-200 relative overflow-hidden"
              >
                <button 
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="absolute top-6 right-6 w-8 h-8 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm flex items-center justify-center transition-colors border border-gray-100 z-10"
                >
                  <X size={16} />
                </button>

                <div className="relative z-0">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-10 text-center">Xem trước Hiển thị</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div className="space-y-4 flex flex-col items-center">
                      <div className="w-full h-32 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center p-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gray-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img src={logoUrl} alt="Preview Light" className="max-w-full max-h-full object-contain relative z-10 drop-shadow-sm" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nền Sáng (Login)</span>
                    </div>

                    <div className="space-y-4 flex flex-col items-center">
                      <div className="w-full h-32 bg-[#1A5FB4] rounded-3xl shadow-lg flex items-center justify-center p-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img src={logoUrl} alt="Preview Dark" className="max-w-full max-h-full object-contain relative z-10" />
                      </div>
                      <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Nền Đậm (Header)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            {message && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${message.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`} />
                {message.text}
              </motion.div>
            )}
            <button 
              type="submit"
              disabled={saving || !logoUrl}
              className="ml-auto bg-[#1A5FB4] text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_10px_20px_-10px_rgba(26,95,180,0.5)] hover:bg-blue-600 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} strokeWidth={2.5} />
                  Lưu cấu hình
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

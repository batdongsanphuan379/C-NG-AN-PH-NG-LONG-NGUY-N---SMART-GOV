import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { Procedure } from '../../types';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Search, 
  Video, 
  FileText, 
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';

export default function CitizenHome() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  useEffect(() => {
    async function fetchProcedures() {
      try {
        const q = query(collection(db, 'procedures'), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Procedure));
        setProcedures(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'procedures');
      } finally {
        setLoading(false);
      }
    }
    fetchProcedures();
  }, []);

  const { grouped, standalone } = React.useMemo<{ grouped: Record<string, Procedure[]>; standalone: Procedure[] }>(() => {
    const filtered = procedures.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const g: Record<string, Procedure[]> = {};
    const s: Procedure[] = [];

    filtered.forEach(p => {
      const isOther = p.category === 'Các thủ tục khác' || !p.category;
      if (!isOther) {
        if (!g[p.category!]) g[p.category!] = [];
        g[p.category!].push(p);
      } else {
        s.push(p);
      }
    });

    return { grouped: g, standalone: s };
  }, [procedures, searchTerm]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <section className="bg-white p-8 rounded-[3rem] text-gray-900 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden border border-gray-100">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1A5FB4]/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-[#1A5FB4]" size={22} />
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight">Xin chào công dân!</h2>
          </div>
          <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8 max-w-[280px]">
            Hệ thống hỗ trợ thực hiện thủ tục hành chính trực tuyến và đặt lịch hẹn thông minh.
          </p>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1A5FB4] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Bạn muốn tìm thủ tục gì?" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-[1.5rem] py-5 pl-14 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#1A5FB4]/10 focus:bg-white focus:border-[#1A5FB4]/20 transition-all font-medium text-sm shadow-inner"
            />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 rounded-full -mr-24 -mt-24 blur-3xl"></div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText size={20} className="text-[#1A5FB4]" />
            Danh mục Thủ tục
          </h3>
          <span className="text-xs font-semibold px-2 py-1 bg-[#1A5FB4]/10 text-[#1A5FB4] rounded-lg">
            {procedures.length} thủ tục
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : procedures.length > 0 ? (
          <div className="space-y-6">
            {standalone.length === 0 && Object.keys(grouped).length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Search size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium tracking-tight">Không tìm thấy thủ tục nào phù hợp</p>
                <button onClick={() => setSearchTerm('')} className="mt-4 text-[#1A5FB4] text-sm font-bold uppercase tracking-widest">
                  Xoá tìm kiếm
                </button>
              </div>
            ) : (
              <>
                {/* Standalone Procedures */}
                {standalone.length > 0 && (
                  <div className="grid gap-4">
                    {standalone.map((proc) => (
                      <motion.div
                        key={proc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/procedure/${proc.id}`)}
                        className="group relative bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#1A5FB4]/30 transition-all cursor-pointer overflow-hidden"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-bold text-gray-900 group-hover:text-[#1A5FB4] transition-colors pr-8 leading-tight">
                              {proc.name}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Video size={14} className="text-red-500" /> Hướng dẫn
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText size={14} className="text-blue-500" /> Biểu mẫu
                              </span>
                            </div>
                          </div>
                          <div className="p-2 transition-transform group-hover:translate-x-1">
                            <ChevronRight size={20} className="text-gray-300 group-hover:text-[#1A5FB4]" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Grouped Procedures (Accordions) */}
                {(Object.entries(grouped) as [string, Procedure[]][]).map(([category, items], catIndex) => {
                  const isExpanded = expandedCategories[category] || searchTerm.length > 0;
                  return (
                    <motion.div 
                      key={category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: catIndex * 0.1 }}
                      className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <button 
                        onClick={() => toggleCategory(category)}
                        className="w-full bg-gray-50/50 px-6 py-5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100/50 transition-colors"
                      >
                        <h4 className="text-[13px] font-black text-[#1A5FB4] uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-[#1A5FB4] rounded-full"></span>
                          {category}
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                            {items.length} mục
                          </span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3, ease: "circOut" }}
                          >
                            <ChevronDown size={18} className="text-gray-400" />
                          </motion.div>
                        </div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "circOut" }}
                          >
                            <div className="p-3 space-y-2 border-t border-gray-50/50 bg-white">
                              {items.map((proc) => (
                                <motion.div
                                  key={proc.id}
                                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(26, 95, 180, 0.05)' }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => navigate(`/procedure/${proc.id}`)}
                                  className="group flex items-center justify-between p-4 bg-gray-50/10 rounded-2xl border border-transparent hover:border-[#1A5FB4]/10 transition-all cursor-pointer"
                                >
                                  <div className="flex-1 space-y-1">
                                    <h4 className="font-bold text-gray-800 group-hover:text-[#1A5FB4] transition-colors leading-tight">
                                      {proc.name}
                                    </h4>
                                    <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                      <span className="flex items-center gap-1">
                                        <Video size={12} className="text-red-400" /> Hướng dẫn
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FileText size={12} className="text-blue-400" /> Biểu mẫu
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#1A5FB4] group-hover:text-white transition-all">
                                    <ChevronRight size={16} />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
               <Info size={24} className="text-gray-300" />
             </div>
             <p className="text-gray-500 font-medium tracking-tight">Hệ thống đang chuẩn bị dữ liệu thủ tục...</p>
          </div>
        )}
      </section>

    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { Appointment } from '../../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, subDays, startOfDay } from 'date-fns';

import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';

const StatCard = ({ label, value, icon: Icon, color, trend, isExporting }: any) => (
  <motion.div 
    initial={isExporting ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{label}</p>
      <h4 className="text-3xl font-black text-gray-900">{value}</h4>
    </div>
  </motion.div>
);

export default function AdminDashboard() {
  const dashboardRef = React.useRef<HTMLDivElement>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    procedures: 0
  });

  useEffect(() => {
    setLoading(true);
    
    // Real-time listener for appointments
    const unsubApps = onSnapshot(collection(db, 'appointments'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(data);
      
      const counts = data.reduce((acc, curr) => {
        acc.total++;
        if (acc[curr.status] !== undefined) acc[curr.status]++;
        return acc;
      }, { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 } as any);
      
      setStats(prev => ({
        ...prev,
        ...counts
      }));
      setLoading(false);
    }, (err) => {
      console.error(err);
      handleFirestoreError(err, OperationType.LIST, 'appointments');
    });

    // Real-time listener for procedures
    const unsubProcs = onSnapshot(collection(db, 'procedures'), (snap) => {
      setStats(prev => ({ ...prev, procedures: snap.size }));
    }, (err) => {
      console.error(err);
    });

    return () => {
      unsubApps();
      unsubProcs();
    };
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    
    // Give React a moment to remove animation classes and for the DOM to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const element = dashboardRef.current;
      
      // Filter out elements that shouldn't be in the PDF
      const filter = (node: HTMLElement) => {
        if (node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) return false;
        if (node.classList && node.classList.contains('export-ignore')) return false;
        return true;
      };

      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#F8FAFC',
        pixelRatio: 3, // Even higher quality
        filter: filter,
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`bao_cao_quan_tri_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Có lỗi xảy ra khi tạo file PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  const chartData = React.useMemo(() => [
    { name: '08:00', count: appointments.filter(a => a.timeSlot?.includes('08:00')).length },
    { name: '09:00', count: appointments.filter(a => a.timeSlot?.includes('09:00')).length },
    { name: '10:00', count: appointments.filter(a => a.timeSlot?.includes('10:00')).length },
    { name: '14:00', count: appointments.filter(a => a.timeSlot?.includes('14:00')).length },
    { name: '15:00', count: appointments.filter(a => a.timeSlot?.includes('15:00')).length },
    { name: '16:00', count: appointments.filter(a => a.timeSlot?.includes('16:00')).length },
  ], [appointments]);

  const pieData = React.useMemo(() => [
    { name: 'Đang chờ', value: stats.pending, color: '#F59E0B' },
    { name: 'Xác nhận', value: stats.confirmed, color: '#3B82F6' },
    { name: 'Hoàn thành', value: stats.completed, color: '#10B981' },
    { name: 'Đã hủy', value: stats.cancelled, color: '#EF4444' },
  ].filter(d => d.value > 0), [stats]);

  return (
    <div ref={dashboardRef} className={`space-y-8 pb-12 ${isExporting ? '' : 'animate-in fade-in duration-500'} bg-[#F8FAFC] p-4 rounded-[2.5rem]`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard label="Lượt đăng ký" value={stats.total} icon={Users} color="bg-blue-500" trend={12} isExporting={isExporting} />
        <StatCard label="Chờ xử lý" value={stats.pending} icon={Clock} color="bg-orange-500" trend={-5} isExporting={isExporting} />
        <StatCard label="Đã xác nhận" value={stats.confirmed} icon={Calendar} color="bg-indigo-500" trend={8} isExporting={isExporting} />
        <StatCard label="Hoàn thành" value={stats.completed} icon={CheckCircle} color="bg-green-500" trend={15} isExporting={isExporting} />
        <StatCard label="Tổng Thủ tục" value={stats.procedures} icon={FileText} color="bg-purple-500" isExporting={isExporting} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Biểu đồ Lượng khách</h3>
              <p className="text-sm text-gray-500">Phân bổ theo khung giờ tiếp dân</p>
            </div>
            <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-600 focus:ring-2 focus:ring-blue-500">
              <option>Hôm nay</option>
              <option>7 ngày qua</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1A5FB4' : '#60A5FA'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="text-xl font-bold text-gray-800 self-start mb-2">Trạng thái Hồ sơ</h3>
            <p className="text-sm text-gray-500 self-start mb-8">Tỷ lệ xử lý hồ sơ thực tế</p>
            
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-3xl font-black text-gray-900">{stats.total}</span>
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng cộng</span>
              </div>
            </div>

            <div className="w-full space-y-3 mt-4">
               {pieData.map((item: any) => (
                 <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                    <div className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                       <span className="text-sm font-bold text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900">{stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0}%</span>
                 </div>
               ))}
            </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-[#1A5FB4] to-[#144A8E] p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-500/20">
         <div className="space-y-2">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp />
              Hiệu suất hoạt động cao
            </h3>
            <p className="text-blue-100 text-sm max-w-lg leading-relaxed">
              Tỷ lệ khách đến đúng hẹn tăng 40% so với phương pháp truyền thống. 
              Các hồ sơ đang được xử lý đúng tiến độ.
            </p>
         </div>
         <button 
           onClick={handleExportPDF}
           disabled={isExporting}
           data-html2canvas-ignore="true"
           className={`bg-white text-[#1A5FB4] export-ignore px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg hover:bg-blue-50 transition-all active:scale-95 whitespace-nowrap ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
         >
            {isExporting ? 'Đang tạo PDF...' : 'Xuất báo cáo PDF'}
         </button>
      </div>
    </div>
  );
}

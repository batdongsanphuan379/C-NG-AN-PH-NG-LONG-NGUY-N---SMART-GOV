import React, { useState } from 'react';
import { Appointment } from '../../types';
import { X, Download, Calendar, FileSpreadsheet, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { format, isSameDay, isSameMonth, isSameQuarter, isSameYear, parseISO, startOfDay, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Appointment[];
}

type ExportType = 'day' | 'month' | 'quarter' | 'year' | 'all';

export default function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('month');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleExport = () => {
    const targetDate = parseISO(selectedDate);
    
    let filteredData = data;
    if (exportType === 'day') {
      filteredData = data.filter(a => isSameDay(parseISO(a.appointmentDate), targetDate));
    } else if (exportType === 'month') {
      filteredData = data.filter(a => isSameMonth(parseISO(a.appointmentDate), targetDate));
    } else if (exportType === 'quarter') {
      filteredData = data.filter(a => isSameQuarter(parseISO(a.appointmentDate), targetDate));
    } else if (exportType === 'year') {
      filteredData = data.filter(a => isSameYear(parseISO(a.appointmentDate), targetDate));
    }

    if (filteredData.length === 0) {
       alert('Không có dữ liệu trong khoảng thời gian này để xuất.');
       return;
    }

    // Format data for Excel
    const excelData = filteredData.map(a => ({
      'Mã Hồ Sơ': a.recordCode,
      'Họ Tên Dân': a.citizenName,
      'Số Điện Thoại': a.phone,
      'Thủ Tục': a.procedureName,
      'Ngày Hẹn': a.appointmentDate,
      'Khung Giờ': a.timeSlot,
      'Trạng Thái': a.status.toUpperCase(),
      'Cán Bộ Duyệt': a.processedBy || 'Chưa duyệt',
      'Ngày Tạo': format(parseISO(a.createdAt?.toDate ? a.createdAt.toDate().toISOString() : a.createdAt), 'dd/MM/yyyy HH:mm')
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lịch Hẹn");
    
    const fileName = `lich_hen_${exportType}_${format(targetDate, 'yyyy_MM_dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
           <div>
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <FileSpreadsheet className="text-green-600" size={28} />
                Xuất Báo Cáo Excel
              </h3>
              <p className="text-gray-500 text-sm mt-1">Chọn định kỳ và thời gian cần xuất.</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
             <X size={24} />
           </button>
        </div>

        <div className="p-8 space-y-6">
           <div className="grid grid-cols-2 gap-4">
              {(['day', 'month', 'quarter', 'year', 'all'] as ExportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setExportType(type)}
                  className={`py-4 px-4 rounded-2xl font-bold text-sm transition-all border-2 ${
                    exportType === type 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {type === 'day' && 'Theo Ngày'}
                  {type === 'month' && 'Theo Tháng'}
                  {type === 'quarter' && 'Theo Quý'}
                  {type === 'year' && 'Theo Năm'}
                  {type === 'all' && 'Tất cả'}
                </button>
              ))}
           </div>

           {exportType !== 'all' && (
             <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                  Chọn mốc thời gian
                </label>
                <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                   <input 
                     type={exportType === 'day' ? 'date' : exportType === 'month' || exportType === 'quarter' ? 'month' : 'number'}
                     value={exportType === 'year' ? parseInt(selectedDate.split('-')[0]) : (exportType === 'day' ? selectedDate : selectedDate.substring(0, 7))}
                     onChange={(e) => {
                        if (exportType === 'year') {
                           setSelectedDate(`${e.target.value}-01-01`);
                        } else if (exportType === 'day') {
                           setSelectedDate(e.target.value);
                        } else {
                           setSelectedDate(`${e.target.value}-01`);
                        }
                     }}
                     className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 font-bold focus:ring-2 focus:ring-blue-500"
                   />
                </div>
                <p className="text-[10px] text-gray-400 italic px-1 flex items-center gap-1">
                  <Info size={12} />
                  Dữ liệu sẽ được lọc dựa trên ngày hẹn của dân.
                </p>
             </div>
           )}

           <div className="pt-4">
              <button 
                onClick={handleExport}
                className="w-full bg-[#1A5FB4] text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 hover:bg-[#144A8E] transition-all flex items-center justify-center gap-3"
              >
                <Download size={20} />
                Tải Xuống File Excel
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import {
  MapPin,
  Compass,
  Shield,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  Award,
  Sparkles,
  Layers,
  Navigation,
  Sun,
  Moon
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import {
  VIETNAM_MACRO_REGIONS,
  NEIGHBORING_COUNTRIES_GEO,
  MAJOR_RIVERS_GEO,
  NATIONAL_CORRIDOR_QL1A,
  VIETNAM_ISLANDS_GEO,
  VIETNAM_CITIES_GEO,
  projectLonLat,
  unprojectXY,
  coordsToSvgPath,
  formatDMS,
  CityMarkerGeo
} from '../data/vietnamGeoData';

interface VietnamMapProps {
  regions: any[];
  selectedCode: string;
  onSelectRegion: (code: string) => void;
}

const FALLBACK_HUBS = [
  {
    code: 'VN-SG',
    name: 'TP. Hồ Chí Minh',
    region: 'Miền Nam',
    economic_zone: 'Vùng Kinh tế Trọng điểm Phía Nam',
    job_count: 268,
    market_share_pct: 27.9,
    avg_salary_vnd: 26.8,
    p75_salary_vnd: 33.5,
    real_purchasing_power_index: 21.4,
    industrial_parks_count: 19,
    top_roles: [
      { title: 'Kỹ sư Phần mềm (Backend/Fullstack)', job_count: 64, avg_salary_vnd: 27.5 },
      { title: 'Kỹ sư AI, NLP & Khoa học Dữ liệu', job_count: 42, avg_salary_vnd: 32.4 },
      { title: 'Chuyên gia Tin học Môi trường, GIS & Viễn thám', job_count: 35, avg_salary_vnd: 25.8 }
    ],
    top_skills: ['Python (96)', 'PostgreSQL / SQL (84)', 'FastAPI / RESTful API (72)', 'ArcGIS / QGIS (48)'],
    top_companies: ['FPT Software (18 việc)', 'Viettel Group (15 việc)', 'VNG Corporation (12 việc)']
  },
  {
    code: 'VN-HN',
    name: 'Thủ đô Hà Nội',
    region: 'Miền Bắc',
    economic_zone: 'Đồng bằng Sông Hồng',
    job_count: 242,
    market_share_pct: 25.2,
    avg_salary_vnd: 25.6,
    p75_salary_vnd: 31.8,
    real_purchasing_power_index: 21.3,
    industrial_parks_count: 14,
    top_roles: [
      { title: 'Kỹ sư Phần mềm (Backend/Fullstack)', job_count: 58, avg_salary_vnd: 26.2 },
      { title: 'Kỹ sư Dữ liệu (Data Engineer & ETL)', job_count: 39, avg_salary_vnd: 29.5 }
    ],
    top_skills: ['Python (88)', 'PostgreSQL / SQL (79)', 'React / TypeScript (65)'],
    top_companies: ['Viettel AI & Data (19 việc)', 'VNPT IT (14 việc)', 'CMC Global (12 việc)']
  },
  {
    code: 'VN-DN',
    name: 'Đà Nẵng',
    region: 'Miền Trung',
    economic_zone: 'Vùng Kinh tế Trọng điểm Miền Trung',
    job_count: 112,
    market_share_pct: 11.7,
    avg_salary_vnd: 21.8,
    p75_salary_vnd: 26.9,
    real_purchasing_power_index: 22.9,
    industrial_parks_count: 8,
    top_roles: [
      { title: 'Kỹ sư Phần mềm (Backend/Fullstack)', job_count: 34, avg_salary_vnd: 22.5 },
      { title: 'Chuyên gia Tin học Môi trường, GIS & Viễn thám', job_count: 21, avg_salary_vnd: 21.4 }
    ],
    top_skills: ['Python (45)', 'React / TypeScript (38)', 'ArcGIS / QGIS (26)'],
    top_companies: ['FPT Software Đà Nẵng (14 việc)', 'KMS Technology (9 việc)']
  }
];

export const VietnamInteractiveMap: React.FC<VietnamMapProps> = ({
  regions,
  selectedCode,
  onSelectRegion
}) => {
  const { t, theme } = useSettings();
  const safeRegions = Array.isArray(regions) && regions.length > 0 ? regions : FALLBACK_HUBS;

  // Map style: 'atlas' (Bản đồ địa lý hành chính chuẩn màu sáng) | 'satellite' (Bản đồ GIS vệ tinh tối)
  const [mapStyle, setMapStyle] = useState<'atlas' | 'satellite'>(
    theme === 'dark' ? 'satellite' : 'atlas'
  );
  const [metricMode, setMetricMode] = useState<'jobs' | 'salary' | 'ppp'>('jobs');

  // Layer toggles
  const [showSatelliteCities, setShowSatelliteCities] = useState<boolean>(true);
  const [showHydroAndRoads, setShowHydroAndRoads] = useState<boolean>(true);

  // Interactive hover & selection state
  const [hoveredCity, setHoveredCity] = useState<CityMarkerGeo | null>(null);
  const [selectedSatelliteCity, setSelectedSatelliteCity] = useState<CityMarkerGeo | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [cursorGeo, setCursorGeo] = useState<{ lon: number; lat: number }>({
    lon: 106.66,
    lat: 16.05
  });

  // Camera Zoom & Drag-to-Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0
  });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeRegion = safeRegions.find((r) => r.code === selectedCode) || safeRegions[0];
  const hoveredHubData = hoveredCity
    ? safeRegions.find((r) => r.code === hoveredCity.hubCode) || safeRegions[0]
    : null;

  const isAtlas = mapStyle === 'atlas';

  // Chuyển nhanh góc nhìn Camera theo Miền
  const focusRegionArea = (area: 'ALL' | 'NORTH' | 'CENTRAL' | 'SOUTH' | 'ISLANDS') => {
    setSelectedSatelliteCity(null);
    if (area === 'ALL') {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else if (area === 'NORTH') {
      setZoom(1.95);
      setPan({ x: 115, y: 265 });
      onSelectRegion('VN-HN');
    } else if (area === 'CENTRAL') {
      setZoom(1.85);
      setPan({ x: 20, y: -15 });
      onSelectRegion('VN-DN');
    } else if (area === 'SOUTH') {
      setZoom(2.05);
      setPan({ x: 85, y: -310 });
      onSelectRegion('VN-SG');
    } else if (area === 'ISLANDS') {
      setZoom(1.55);
      setPan({ x: -135, y: -95 });
    }
  };

  // Xử lý kéo thả bản đồ (Drag-to-Pan) và đọc tọa độ Kinh/Vĩ độ thực
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * 800;
      const relY = ((e.clientY - rect.top) / rect.height) * 1050;
      // Quy đổi ngược từ tọa độ màn hình (có tính zoom & panAround center 400, 525)
      const mapX = (relX - 400 - pan.x) / zoom + 400;
      const mapY = (relY - 525 - pan.y) / zoom + 525;
      const geo = unprojectXY(mapX, mapY);
      if (geo.lon >= 100 && geo.lon <= 118 && geo.lat >= 6 && geo.lat <= 25) {
        setCursorGeo(geo);
      }
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: Math.max(-360, Math.min(360, dragStartRef.current.panX + dx * 1.15)),
      y: Math.max(-440, Math.min(440, dragStartRef.current.panY + dy * 1.15))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Tính màu nhiệt Choropleth cho từng Vùng địa lý dựa trên chỉ số đang chọn
  const getRegionChoroplethColor = (zone: typeof VIETNAM_MACRO_REGIONS[0], isHovered: boolean, isSelected: boolean) => {
    const hub = safeRegions.find((r) => r.code === zone.hubCode);
    if (!hub) return isAtlas ? zone.atlasFill : zone.baseColor;

    if (isHovered) {
      return isAtlas ? '#F59E0B' : '#38BDF8';
    }
    if (isSelected) {
      return isAtlas ? '#6366F1' : '#4F46E5';
    }

    if (metricMode === 'salary') {
      const sal = hub.avg_salary_vnd || 20;
      if (sal >= 25) return isAtlas ? '#F59E0B' : '#D97706';
      if (sal >= 21.5) return isAtlas ? '#FBBF24' : '#B45309';
      return isAtlas ? '#FDE68A' : '#78350F';
    }

    if (metricMode === 'ppp') {
      const ppp = hub.real_purchasing_power_index || 18;
      if (ppp >= 21.5) return isAtlas ? '#34D399' : '#059669';
      if (ppp >= 19.5) return isAtlas ? '#6EE7B7' : '#047857';
      return isAtlas ? '#A7F3D0' : '#065F46';
    }

    // Theo số lượng việc làm (Mặc định giữ sắc thái bản đồ hành chính chuẩn kết hợp mật độ)
    return isAtlas ? zone.atlasFill : zone.baseColor;
  };

  const handleCityClick = (city: CityMarkerGeo) => {
    onSelectRegion(city.hubCode);
    if (city.isPrimaryHub) {
      setSelectedSatelliteCity(null);
    } else {
      setSelectedSatelliteCity(city);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* KHUNG TRÁI: BẢN ĐỒ ĐỊA LÝ & GIS VIỆT NAM ĐỘ CHÍNH XÁC CAO */}
      <div
        className={`lg:col-span-7 rounded-3xl p-4 sm:p-5 border relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[680px] transition-colors duration-300 ${
          isAtlas
            ? 'bg-[#CBE7F8] border-slate-300 text-slate-900'
            : 'bg-gradient-to-b from-[#061021] via-[#091933] to-[#061124] border-slate-800 text-white'
        }`}
      >
        {/* Thanh Công Cụ Bản Đồ Phía Trên */}
        <div
          className={`relative z-20 flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${
            isAtlas ? 'border-sky-300/80' : 'border-slate-800/80'
          }`}
        >
          {/* Bộ chọn Chỉ số Màu nhiệt */}
          <div
            className={`flex items-center gap-1 p-1 rounded-xl border backdrop-blur-md ${
              isAtlas
                ? 'bg-white/90 border-slate-300 shadow-2xs'
                : 'bg-slate-900/90 border-slate-700/80'
            }`}
          >
            <button
              onClick={() => setMetricMode('jobs')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                metricMode === 'jobs'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : isAtlas
                  ? 'text-slate-600 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('Mật Độ Việc Làm', 'Job Volume')}
            </button>
            <button
              onClick={() => setMetricMode('salary')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                metricMode === 'salary'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : isAtlas
                  ? 'text-slate-600 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('Mức Lương', 'Salary')}
            </button>
            <button
              onClick={() => setMetricMode('ppp')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                metricMode === 'ppp'
                  ? 'bg-emerald-500 text-slate-950 shadow-2xs'
                  : isAtlas
                  ? 'text-slate-600 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('Sức Mua PPP', 'PPP Index')}
            </button>
          </div>

          {/* Chuyển đổi Kiểu Bản Đồ (Atlas Hành chính vs Vệ tinh Đêm) + Chọn Vùng Nhanh */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className={`flex items-center gap-1 p-1 rounded-xl border backdrop-blur-md text-[11px] font-bold ${
                isAtlas
                  ? 'bg-white/90 border-slate-300 text-slate-700 shadow-2xs'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
              }`}
            >
              <button
                onClick={() => setMapStyle('atlas')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                  isAtlas
                    ? 'bg-sky-600 text-white'
                    : 'hover:text-white'
                }`}
                title="Bản đồ Địa lý Hành chính Chuẩn"
              >
                <Sun className="w-3.5 h-3.5" />
                {t('Bản đồ Hành chính', 'Atlas Map')}
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                  !isAtlas
                    ? 'bg-indigo-500 text-white'
                    : 'hover:text-slate-950'
                }`}
                title="Bản đồ Vệ tinh Đêm GIS"
              >
                <Moon className="w-3.5 h-3.5" />
                {t('Vệ tinh GIS', 'Dark GIS')}
              </button>
            </div>

            <div
              className={`flex items-center gap-0.5 p-1 rounded-xl border backdrop-blur-md text-[11px] font-semibold ${
                isAtlas
                  ? 'bg-white/90 border-slate-300 text-slate-700 shadow-2xs'
                  : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
              }`}
            >
              <button
                onClick={() => focusRegionArea('ALL')}
                className="px-2 py-1 rounded-lg hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-amber-400 transition"
              >
                {t('Toàn quốc', 'All')}
              </button>
              <button
                onClick={() => focusRegionArea('NORTH')}
                className="px-2 py-1 rounded-lg hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-amber-400 transition"
              >
                {t('Bắc', 'North')}
              </button>
              <button
                onClick={() => focusRegionArea('CENTRAL')}
                className="px-2 py-1 rounded-lg hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-amber-400 transition"
              >
                {t('Trung', 'Central')}
              </button>
              <button
                onClick={() => focusRegionArea('SOUTH')}
                className="px-2 py-1 rounded-lg hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-amber-400 transition"
              >
                {t('Nam', 'South')}
              </button>
              <button
                onClick={() => focusRegionArea('ISLANDS')}
                className="px-2 py-1 rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold transition"
              >
                {t('Biển Đảo', 'Islands')}
              </button>
            </div>
          </div>
        </div>

        {/* Cụm Nút Phóng To / Thu Nhỏ & Bật/Tắt Lớp Bản Đồ (Góc Trái Trên) */}
        <div className="absolute left-5 top-20 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.min(3.2, Number((z + 0.35).toFixed(2))))}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md transition ${
              isAtlas
                ? 'bg-white/95 border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            title="Phóng to bản đồ"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.35).toFixed(2))))}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md transition ${
              isAtlas
                ? 'bg-white/95 border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            title="Thu nhỏ bản đồ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => focusRegionArea('ALL')}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md transition ${
              isAtlas
                ? 'bg-white/95 border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            title="Đặt lại góc nhìn toàn quốc"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Nút bật/tắt 18 tỉnh vệ tinh */}
          <button
            onClick={() => setShowSatelliteCities((v) => !v)}
            className={`mt-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 shadow-md transition ${
              showSatelliteCities
                ? isAtlas
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-amber-400 text-slate-950 border-amber-400'
                : isAtlas
                ? 'bg-white/90 text-slate-600 border-slate-300'
                : 'bg-slate-900/90 text-slate-400 border-slate-700'
            }`}
            title="Ẩn/Hiện các tỉnh thành vệ tinh"
          >
            <MapPin className="w-3 h-3" />
            {t('26 Tỉnh/TP', '26 Cities')}
          </button>

          {/* Nút bật/tắt Sông ngòi & Quốc lộ 1A */}
          <button
            onClick={() => setShowHydroAndRoads((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 shadow-md transition ${
              showHydroAndRoads
                ? isAtlas
                  ? 'bg-sky-700 text-white border-sky-700'
                  : 'bg-sky-500 text-slate-950 border-sky-500'
                : isAtlas
                ? 'bg-white/90 text-slate-600 border-slate-300'
                : 'bg-slate-900/90 text-slate-400 border-slate-700'
            }`}
            title="Ẩn/Hiện Sông lớn & Quốc lộ 1A"
          >
            <Navigation className="w-3 h-3" />
            {t('Sông & QL1A', 'Rivers & Hwy')}
          </button>
        </div>

        {/* La Bàn Địa Lý & Chú Giải Tương Tác (Góc Phải Trên) */}
        <div className="absolute right-5 top-20 z-20 flex flex-col items-end gap-2 pointer-events-none">
          <div
            className={`w-10 h-10 rounded-full border flex flex-col items-center justify-center shadow-md backdrop-blur-md ${
              isAtlas
                ? 'bg-white/90 border-slate-300 text-slate-800'
                : 'bg-slate-900/85 border-slate-700 text-amber-400'
            }`}
          >
            <span className="text-[8px] font-black leading-none text-rose-600 dark:text-rose-400">B</span>
            <Compass className="w-4 h-4 my-0.5" />
            <span className="text-[7px] font-bold leading-none opacity-60">N</span>
          </div>
        </div>

        {/* Tooltip Nổi Thông Minh Khi Di Chuột Qua Tỉnh/Thành Phố */}
        {hoveredCity && hoveredHubData && (
          <div
            className={`absolute right-5 top-40 z-30 w-68 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md pointer-events-none transition-all ${
              isAtlas
                ? 'bg-white/95 border-slate-300 text-slate-900'
                : 'bg-slate-950/95 border-indigo-500/50 text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-sky-400">
                {hoveredCity.regionNameVi}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {formatDMS(hoveredCity.lat, true)}, {formatDMS(hoveredCity.lon, false)}
              </span>
            </div>
            <div className="text-sm font-extrabold mt-0.5 flex items-center gap-1.5">
              {hoveredCity.isCapital && <span className="text-rose-600">★</span>}
              <span>{hoveredCity.nameVi}</span>
            </div>
            {hoveredCity.keyHighlightVi && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                {hoveredCity.keyHighlightVi}
              </p>
            )}
            <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="text-[9px] text-slate-500">{t('Tin tuyển', 'Jobs')}</div>
                <div className="text-xs font-mono font-bold text-indigo-600 dark:text-sky-400">
                  {hoveredHubData.job_count}
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="text-[9px] text-slate-500">{t('Lương TB', 'Avg Sal')}</div>
                <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {hoveredHubData.avg_salary_vnd}tr
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="text-[9px] text-slate-500">{t('Sức mua', 'PPP')}</div>
                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {hoveredHubData.real_purchasing_power_index}đ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CANVAS BẢN ĐỒ VECTOR ĐỊA LÝ THỰC TẾ (WEB MERCATOR PROJECTION) */}
        <div className="relative flex-1 flex items-center justify-center my-1 select-none overflow-hidden rounded-2xl">
          <svg
            ref={svgRef}
            viewBox="0 0 800 1050"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-[550px] sm:h-[580px] transition-transform duration-150 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <defs>
              {/* Màu nền Biển Đông & Thềm lục địa */}
              <linearGradient id="atlasSeaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAE6FD" />
                <stop offset="55%" stopColor="#7DD3FC" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="darkSeaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#071224" />
                <stop offset="60%" stopColor="#0A1931" />
                <stop offset="100%" stopColor="#040B16" />
              </linearGradient>
              {/* Đổ bóng nổi cho lãnh thổ Việt Nam */}
              <filter id="landDropShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow
                  dx="0"
                  dy="3"
                  stdDeviation="5"
                  floodColor={isAtlas ? '#0369A1' : '#0284C7'}
                  floodOpacity={isAtlas ? '0.28' : '0.45'}
                />
              </filter>
            </defs>

            <g
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '400px 525px',
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              {/* 1. LỚP NỀN ĐẠI DƯƠNG & THỀM LỤC ĐỊA BIỂN ĐÔNG */}
              <rect
                x="-400"
                y="-400"
                width="1600"
                height="1850"
                fill={isAtlas ? 'url(#atlasSeaGrad)' : 'url(#darkSeaGrad)'}
              />

              {/* Vùng thềm lục địa nông (Bathymetry 200m contour) */}
              <path
                d={coordsToSvgPath([
                  [106.0, 21.6], [109.5, 21.5], [110.2, 18.0], [110.5, 14.0],
                  [109.8, 10.0], [106.8, 7.5], [102.5, 8.2], [103.5, 10.8]
                ])}
                fill={isAtlas ? '#E0F2FE' : '#0F2547'}
                fillOpacity={isAtlas ? 0.55 : 0.45}
              />

              {/* 2. LƯỚI KINH TUYẾN & VĨ TUYẾN ĐỊA LÝ CHUẨN (102°Đ -> 116°Đ, 8°B -> 23°B) */}
              {[102, 104, 106, 108, 110, 112, 114, 116].map((lon) => {
                const [x] = projectLonLat(lon, 16);
                return (
                  <g key={`lon-${lon}`}>
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={1050}
                      stroke={isAtlas ? '#0284C7' : '#38BDF8'}
                      strokeOpacity={isAtlas ? 0.16 : 0.1}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={x + 4}
                      y={18}
                      fill={isAtlas ? '#0369A1' : '#64748B'}
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      fontWeight="700"
                    >
                      {lon}°Đ
                    </text>
                  </g>
                );
              })}
              {[8, 10, 12, 14, 16, 18, 20, 22].map((lat) => {
                const [, y] = projectLonLat(106, lat);
                return (
                  <g key={`lat-${lat}`}>
                    <line
                      x1={0}
                      y1={y}
                      x2={800}
                      y2={y}
                      stroke={isAtlas ? '#0284C7' : '#38BDF8'}
                      strokeOpacity={isAtlas ? 0.16 : 0.1}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={10}
                      y={y - 4}
                      fill={isAtlas ? '#0369A1' : '#64748B'}
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      fontWeight="700"
                    >
                      {lat}°B
                    </text>
                  </g>
                );
              })}

              {/* 3. LỚP LỤC ĐỊA CÁC QUỐC GIA LÁNG GIỀNG (TRUNG QUỐC, LÀO, CAMPUCHIA, ĐẢO HẢI NAM) */}
              {NEIGHBORING_COUNTRIES_GEO.map((country) => {
                const [lx, ly] = projectLonLat(country.labelLon, country.labelLat);
                return (
                  <g key={country.id}>
                    <path
                      d={coordsToSvgPath(country.coordinates)}
                      fill={isAtlas ? '#EDEAE2' : '#0F172A'}
                      stroke={isAtlas ? '#94A3B8' : '#334155'}
                      strokeWidth="1.2"
                      strokeDasharray="5 3"
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      fill={isAtlas ? '#64748B' : '#475569'}
                      fontSize="11"
                      fontWeight="800"
                      letterSpacing="2"
                      opacity="0.85"
                    >
                      {t(country.nameVi, country.nameEn)}
                    </text>
                  </g>
                );
              })}

              {/* Nhãn Địa danh Biển: Vịnh Bắc Bộ, Vịnh Thái Lan, Biển Đông */}
              {(() => {
                const [vbbX, vbbY] = projectLonLat(107.6, 19.6);
                const [vtlX, vtlY] = projectLonLat(103.3, 9.3);
                const [bdX, bdY] = projectLonLat(111.5, 13.5);
                return (
                  <g className="pointer-events-none">
                    <text
                      x={vbbX}
                      y={vbbY}
                      textAnchor="middle"
                      fill={isAtlas ? '#0369A1' : '#38BDF8'}
                      fontSize="11"
                      fontStyle="italic"
                      fontWeight="700"
                      opacity="0.75"
                    >
                      {t('VỊNH BẮC BỘ', 'GULF OF TONKIN')}
                    </text>
                    <text
                      x={vtlX}
                      y={vtlY}
                      textAnchor="middle"
                      fill={isAtlas ? '#0369A1' : '#38BDF8'}
                      fontSize="10.5"
                      fontStyle="italic"
                      fontWeight="700"
                      opacity="0.75"
                    >
                      {t('VỊNH THÁI LAN', 'GULF OF THAILAND')}
                    </text>
                    <text
                      x={bdX}
                      y={bdY}
                      textAnchor="middle"
                      fill={isAtlas ? '#075985' : '#38BDF8'}
                      fontSize="16"
                      fontStyle="italic"
                      fontWeight="800"
                      letterSpacing="5"
                      opacity={isAtlas ? '0.45' : '0.35'}
                    >
                      {t('BIỂN ĐÔNG VIỆT NAM', 'EAST SEA (VIETNAM)')}
                    </text>
                  </g>
                );
              })()}

              {/* 4. LÃNH THỔ ĐẤT LIỀN VIỆT NAM (7 VÙNG ĐỊA LÝ - KINH TẾ TỌA ĐỘ THỰC) */}
              <g filter="url(#landDropShadow)">
                {VIETNAM_MACRO_REGIONS.map((zone) => {
                  const isZoneHovered = hoveredZoneId === zone.id;
                  const isZoneSelected = zone.hubCode === selectedCode;
                  const fillColor = getRegionChoroplethColor(zone, isZoneHovered, isZoneSelected);

                  return (
                    <path
                      key={zone.id}
                      d={coordsToSvgPath(zone.coordinates)}
                      fill={fillColor}
                      fillOpacity={isAtlas ? 0.92 : isZoneSelected || isZoneHovered ? 0.78 : 0.48}
                      stroke={
                        isZoneSelected || isZoneHovered
                          ? isAtlas
                            ? '#1E1B4B'
                            : '#FBBF24'
                          : isAtlas
                          ? '#0F172A'
                          : '#7DD3FC'
                      }
                      strokeWidth={isZoneSelected || isZoneHovered ? 2.2 : 1.2}
                      strokeLinejoin="round"
                      onMouseEnter={() => setHoveredZoneId(zone.id)}
                      onMouseLeave={() => setHoveredZoneId(null)}
                      onClick={() => {
                        setSelectedSatelliteCity(null);
                        onSelectRegion(zone.hubCode);
                      }}
                      className="cursor-pointer transition-colors duration-200"
                    />
                  );
                })}
              </g>

              {/* 5. LỚP THỦY VĂN (SÔNG HỒNG, SÔNG ĐÀ, SÔNG MÊ KÔNG, SÔNG ĐỒNG NAI) & QUỐC LỘ 1A */}
              {showHydroAndRoads && (
                <g className="pointer-events-none">
                  {MAJOR_RIVERS_GEO.map((rv, idx) => (
                    <path
                      key={idx}
                      d={coordsToSvgPath(rv.coords, false)}
                      fill="none"
                      stroke={isAtlas ? '#0284C7' : '#38BDF8'}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeOpacity={isAtlas ? 0.65 : 0.55}
                    />
                  ))}

                  {/* Trục Quốc lộ 1A / Cao tốc Bắc - Nam */}
                  <path
                    d={coordsToSvgPath(NATIONAL_CORRIDOR_QL1A, false)}
                    fill="none"
                    stroke={isAtlas ? '#DC2626' : '#F59E0B'}
                    strokeWidth="1.8"
                    strokeDasharray="5 3"
                    strokeOpacity="0.8"
                  />
                </g>
              )}

              {/* 6. HỆ THỐNG ĐẢO VEN BỜ & 2 QUẦN ĐẢO CHỦ QUYỀN HOÀNG SA - TRƯỜNG SA */}
              {VIETNAM_ISLANDS_GEO.map((isl) => {
                const [ix, iy] = projectLonLat(isl.lon, isl.lat);

                if (isl.isSovereigntyArchipelago) {
                  // Vẽ Quần đảo Hoàng Sa & Quần đảo Trường Sa với chi tiết từng đảo đá thực tế
                  const [daNangX, daNangY] = projectLonLat(108.22, 16.05);
                  const [nhaTrangX, nhaTrangY] = projectLonLat(109.19, 12.24);
                  const anchorX = isl.id === 'ARCH-HOANG-SA' ? daNangX : nhaTrangX;
                  const anchorY = isl.id === 'ARCH-HOANG-SA' ? daNangY : nhaTrangY;

                  return (
                    <g
                      key={isl.id}
                      onClick={() => onSelectRegion('VN-DN')}
                      className="cursor-pointer group"
                    >
                      {/* Đường kết nối chủ quyền từ đất liền ra Quần đảo */}
                      <line
                        x1={anchorX}
                        y1={anchorY}
                        x2={ix}
                        y2={iy}
                        stroke={isAtlas ? '#DC2626' : '#F43F5E'}
                        strokeWidth="1.1"
                        strokeDasharray="4 4"
                        strokeOpacity="0.65"
                      />

                      {/* Vùng lãnh hải quần đảo */}
                      <ellipse
                        cx={ix}
                        cy={iy}
                        rx={68}
                        ry={50}
                        fill={isAtlas ? '#FEF2F2' : '#881337'}
                        fillOpacity={isAtlas ? 0.45 : 0.25}
                        stroke={isAtlas ? '#DC2626' : '#FB7185'}
                        strokeWidth="1.3"
                        strokeDasharray="5 3"
                      />

                      {/* Các đảo/đá thành phần theo đúng tọa độ thực (hiện chữ khi phóng to >= 1.35x) */}
                      {isl.subIslands?.map((sub, sIdx) => {
                        const [sx, sy] = projectLonLat(sub.lon, sub.lat);
                        return (
                          <g key={sIdx}>
                            <circle
                              cx={sx}
                              cy={sy}
                              r={2.5}
                              fill={isAtlas ? '#DC2626' : '#FB7185'}
                              stroke="#FFFFFF"
                              strokeWidth="0.8"
                            />
                            {zoom >= 1.35 && (
                              <text
                                x={sx + 5}
                                y={sy + 3}
                                fill={isAtlas ? '#7F1D1D' : '#FECDD3'}
                                fontSize="7.5"
                                fontWeight="700"
                              >
                                {sub.name}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Nhãn tên Quần đảo Chủ quyền */}
                      <rect
                        x={ix - 64}
                        y={iy - 42}
                        width={128}
                        height={18}
                        rx={5}
                        fill={isAtlas ? '#DC2626' : '#E11D48'}
                      />
                      <text
                        x={ix}
                        y={iy - 30}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="800"
                      >
                        {t(isl.nameVi, isl.nameEn)}
                      </text>
                      <text
                        x={ix}
                        y={iy + 44}
                        textAnchor="middle"
                        fill={isAtlas ? '#991B1B' : '#FDA4AF'}
                        fontSize="8.5"
                        fontWeight="700"
                      >
                        ({isl.adminVi})
                      </text>
                    </g>
                  );
                }

                // Các đảo ven bờ (Phú Quốc, Côn Đảo, Lý Sơn, Cồn Cỏ, Bạch Long Vĩ, Phú Quý)
                return (
                  <g key={isl.id} className="pointer-events-none">
                    {isl.polygon ? (
                      <path
                        d={coordsToSvgPath(isl.polygon)}
                        fill={isAtlas ? '#FDE68A' : '#0EA5E9'}
                        stroke={isAtlas ? '#0F172A' : '#7DD3FC'}
                        strokeWidth="1"
                      />
                    ) : (
                      <circle
                        cx={ix}
                        cy={iy}
                        r={3.2}
                        fill={isAtlas ? '#059669' : '#34D399'}
                        stroke="#FFFFFF"
                        strokeWidth="1"
                      />
                    )}
                    <text
                      x={ix + (isl.id === 'ISL-PHU-QUOC' ? -6 : 6)}
                      y={iy + 3}
                      textAnchor={isl.id === 'ISL-PHU-QUOC' ? 'end' : 'start'}
                      fill={isAtlas ? '#0C4A6E' : '#BAE6FD'}
                      fontSize="8.5"
                      fontWeight="700"
                    >
                      {t(isl.nameVi, isl.nameEn)}
                    </text>
                  </g>
                );
              })}

              {/* 7. LỚP 18 ĐÔ THỊ / TỈNH VỆ TINH TRÊN TOÀN QUỐC */}
              {showSatelliteCities &&
                VIETNAM_CITIES_GEO.filter((c) => !c.isPrimaryHub).map((city) => {
                  const [cx, cy] = projectLonLat(city.lon, city.lat);
                  const isHovered = hoveredCity?.code === city.code;
                  const isSatSelected = selectedSatelliteCity?.code === city.code;

                  return (
                    <g
                      key={city.code}
                      onMouseEnter={() => setHoveredCity(city)}
                      onMouseLeave={() => setHoveredCity(null)}
                      onClick={() => handleCityClick(city)}
                      className="cursor-pointer"
                    >
                      <circle cx={cx} cy={cy} r={14} fill="transparent" />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHovered || isSatSelected ? 5.5 : 3.5}
                        fill={
                          isHovered || isSatSelected
                            ? '#F59E0B'
                            : isAtlas
                            ? '#FFFFFF'
                            : '#94A3B8'
                        }
                        stroke={isAtlas ? '#1E293B' : '#0F172A'}
                        strokeWidth="1.5"
                      />
                      {(zoom >= 1.35 || isHovered || isSatSelected) && (
                        <text
                          x={cx + city.dx}
                          y={cy + city.dy}
                          textAnchor={city.labelAnchor}
                          fill={
                            isHovered || isSatSelected
                              ? isAtlas
                                ? '#B45309'
                                : '#FBBF24'
                              : isAtlas
                              ? '#334155'
                              : '#CBD5E1'
                          }
                          fontSize={isHovered || isSatSelected ? '10.5' : '9'}
                          fontWeight={isHovered || isSatSelected ? '800' : '600'}
                        >
                          {t(city.nameVi, city.nameEn)}
                        </text>
                      )}
                    </g>
                  );
                })}

              {/* 8. LỚP 8 CỰC TĂNG TRƯỞNG TRỌNG ĐIỂM (PRIMARY ECONOMIC HUBS VỚI DỮ LIỆU THỜI GIAN THỰC) */}
              {VIETNAM_CITIES_GEO.filter((c) => c.isPrimaryHub).map((city) => {
                const [cx, cy] = projectLonLat(city.lon, city.lat);
                const hubData = safeRegions.find((r) => r.code === city.hubCode);
                const isSelected = selectedCode === city.hubCode && !selectedSatelliteCity;
                const isHovered = hoveredCity?.code === city.code;
                const radius = Math.max(
                  6.5,
                  Math.min(13.5, Math.sqrt(hubData?.job_count || 60) * 0.72)
                );

                return (
                  <g
                    key={city.code}
                    onMouseEnter={() => setHoveredCity(city)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={() => handleCityClick(city)}
                    className="cursor-pointer"
                  >
                    {/* Vùng nhận diện chuột rộng 24px */}
                    <circle cx={cx} cy={cy} r={24} fill="transparent" />

                    {/* Vòng sóng lan tỏa khi được chọn hoặc di chuột */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius + 9}
                        fill="none"
                        stroke={city.isCapital ? '#EF4444' : '#F59E0B'}
                        strokeWidth="2.2"
                        className="animate-ping"
                        style={{ animationDuration: '2.2s' }}
                      />
                    )}

                    {/* Vòng Halo định vị */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius + 4}
                      fill={
                        city.isCapital
                          ? '#EF4444'
                          : isSelected || isHovered
                          ? '#F59E0B'
                          : '#4F46E5'
                      }
                      fillOpacity={isSelected || isHovered ? 0.35 : 0.2}
                    />

                    {/* Tâm thành phố (Thủ đô Hà Nội có ngôi sao vàng trên nền đỏ chuẩn bản đồ) */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={
                        city.isCapital
                          ? '#DC2626'
                          : isSelected || isHovered
                          ? '#F59E0B'
                          : isAtlas
                          ? '#4F46E5'
                          : '#38BDF8'
                      }
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    {city.isCapital && (
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        fill="#FDE047"
                        fontSize="10"
                        fontWeight="900"
                      >
                        ★
                      </text>
                    )}

                    {/* Nhãn tên Thành phố gọn gàng */}
                    <g>
                      <text
                        x={cx + city.dx}
                        y={cy + city.dy}
                        textAnchor={city.labelAnchor}
                        fill={
                          isSelected || isHovered
                            ? isAtlas
                              ? '#1E1B4B'
                              : '#FBBF24'
                            : isAtlas
                            ? '#0F172A'
                            : '#F8FAFC'
                        }
                        fontSize={isSelected || isHovered ? '11.5' : '10.5'}
                        fontWeight="800"
                      >
                        {t(city.nameVi, city.nameEn)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Thanh Trạng Thái Địa Lý & Thước Tỷ Lệ Bản Đồ Phía Dưới */}
        <div
          className={`relative z-20 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
            isAtlas
              ? 'border-sky-300/80 text-slate-700'
              : 'border-slate-800/80 text-slate-400'
          }`}
        >
          {/* Tọa độ GPS con trỏ chuột thời gian thực */}
          <div className="flex items-center gap-2 font-mono text-[10.5px]">
            <span
              className={`px-2 py-0.5 rounded-md font-bold ${
                isAtlas
                  ? 'bg-white/90 text-indigo-700 border border-slate-300'
                  : 'bg-slate-900 text-sky-400 border border-slate-700'
              }`}
            >
              GPS: {formatDMS(cursorGeo.lat, true)} — {formatDMS(cursorGeo.lon, false)}
            </span>
            <span className="hidden sm:inline opacity-80">
              Zoom: {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Thước Tỷ Lệ Bản Đồ (Dynamic Cartographic Scale Bar) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 border-x-2 border-b-2 transition-all ${
                  isAtlas ? 'border-slate-800 bg-white/50' : 'border-slate-300 bg-slate-800/50'
                }`}
                style={{ width: `${Math.round(52 * zoom)}px` }}
              />
              <span className="font-mono text-[10px] font-bold">200 km</span>
            </div>

            <div className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
              <Shield className="w-3.5 h-3.5" />
              <span>{t('Hoàng Sa & Trường Sa là của Việt Nam', 'Sovereignty Verified')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KHUNG PHẢI: HỒ SƠ ĐỊA PHƯƠNG CHI TIẾT (TỰ ĐỘNG CẬP NHẬT KHI CLICK TRÊN BẢN ĐỒ) */}
      <div className="lg:col-span-5 flex flex-col justify-between bg-white dark:bg-[#0D1322] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        {activeRegion && (
          <>
            <div className="space-y-4">
              {/* Banner Tỉnh vệ tinh (nếu người dùng vừa click vào 1 trong 18 tỉnh vệ tinh) */}
              {selectedSatelliteCity && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      {t('Đô thị Vệ tinh đang chọn trên Bản đồ', 'Selected Satellite City')} • {selectedSatelliteCity.regionNameVi}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {selectedSatelliteCity.nameVi} ({formatDMS(selectedSatelliteCity.lat, true)}, {formatDMS(selectedSatelliteCity.lon, false)})
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {selectedSatelliteCity.keyHighlightVi}
                    </p>
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-sky-400 mt-1">
                      → {t('Số liệu thống kê bên dưới được tổng hợp theo Cực tăng trưởng vùng:', 'Regional hub analytics linked to:')} {activeRegion.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSatelliteCity(null)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {t('Đóng', 'Close')}
                  </button>
                </div>
              )}

              {/* Header Tỉnh / Thành Phố Trọng Điểm */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-amber-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {activeRegion.region || activeRegion.region_macro} • {activeRegion.economic_zone}
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {activeRegion.name}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-amber-500/15 text-indigo-700 dark:text-amber-300 border border-indigo-200 dark:border-amber-500/30">
                  {activeRegion.market_share_pct ?? activeRegion.share_pct}% {t('thị phần', 'share')}
                </span>
              </div>

              {/* 4 Thẻ KPI Cốt Lõi Của Tỉnh Đang Chọn */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {t('Tổng tin tuyển dụng', 'Active Job Postings')}
                  </div>
                  <div className="text-xl font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {activeRegion.job_count}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {t('vị trí', 'jobs')}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {t('Lương Trung bình / P75', 'Mean / P75 Salary')}
                  </div>
                  <div className="text-xl font-mono font-extrabold text-indigo-600 dark:text-amber-400 mt-0.5">
                    {activeRegion.avg_salary_vnd} / {activeRegion.p75_salary_vnd || activeRegion.avg_salary_vnd}{' '}
                    <span className="text-xs font-normal">tr</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-500/30">
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                    {t('Chỉ số Sức mua (PPP)', 'Purchasing Power (PPP)')}
                  </div>
                  <div className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {activeRegion.real_purchasing_power_index}{' '}
                    <span className="text-xs font-normal">{t('điểm', 'pts')}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {t('Khu Công nghiệp & CNC', 'Industrial & Tech Parks')}
                  </div>
                  <div className="text-xl font-mono font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
                    {activeRegion.industrial_parks_count}{' '}
                    <span className="text-xs font-normal">{t('khu', 'parks')}</span>
                  </div>
                </div>
              </div>

              {/* Top Vị Trí Công Việc & Mức Lương Tại Tỉnh Này */}
              {activeRegion.top_roles && activeRegion.top_roles.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
                    {t(
                      `Các vị trí tuyển dụng hàng đầu tại ${activeRegion.name}`,
                      `Top In-Demand Roles in ${activeRegion.name}`
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {activeRegion.top_roles.map((r: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 dark:border-slate-800/60 last:border-none"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                          {idx + 1}. {typeof r === 'string' ? r : r?.title}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-amber-400 shrink-0">
                          {r?.avg_salary_vnd ? `${r.avg_salary_vnd}tr ` : ''}({r?.job_count ?? r?.count ?? 0} việc)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Kỹ Năng ESCO & Doanh Nghiệp Tuyển Dụng Tại Địa Phương */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeRegion.top_skills && activeRegion.top_skills.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400" />
                      {t('Kỹ năng săn đón nhất', 'Most Wanted Skills')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeRegion.top_skills.map((sk: any, i: number) => {
                        const skLabel =
                          typeof sk === 'string'
                            ? sk
                            : `${sk?.name || ''}${sk?.count ? ` (${sk.count})` : ''}`;
                        return (
                          <span
                            key={i}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700"
                          >
                            {skLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeRegion.top_companies && activeRegion.top_companies.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {t('Nhà tuyển dụng tiêu biểu', 'Top Employers')}
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {activeRegion.top_companies.slice(0, 3).map((comp: any, i: number) => {
                        const compLabel = typeof comp === 'string' ? comp : comp?.name || '';
                        return (
                          <div key={i} className="truncate">
                            • {compLabel}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Danh sách bấm chuyển nhanh 8 Cực tăng trưởng */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {t('Chọn nhanh 8 trung tâm kinh tế:', 'Quick Select 8 Economic Hubs:')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {safeRegions.map((reg) => (
                  <button
                    key={reg.code}
                    onClick={() => {
                      setSelectedSatelliteCity(null);
                      onSelectRegion(reg.code);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      selectedCode === reg.code && !selectedSatelliteCity
                        ? 'bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-950 border-indigo-600 dark:border-amber-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    {reg.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

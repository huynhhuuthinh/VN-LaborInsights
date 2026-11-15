/**
 * Dữ liệu Địa lý Chuẩn Hệ Tọa độ Kinh độ - Vĩ độ Thực tế của Việt Nam (WGS84 [Longitude, Latitude])
 * Phục vụ hiển thị Bản đồ Hành chính, Địa hình & GIS Độ Chính xác Cao.
 */

export interface GeoPoint {
  lon: number;
  lat: number;
}

export interface MacroRegionGeo {
  id: string;
  nameVi: string;
  nameEn: string;
  hubCode: string;
  baseColor: string;
  atlasFill: string;
  borderColor: string;
  labelLon: number;
  labelLat: number;
  provincesVi: string;
  /** Đa giác tọa độ thực [kinh độ, vĩ độ] ghép khít thành hình chữ S thực tế của Việt Nam */
  coordinates: [number, number][];
}

export interface CityMarkerGeo {
  code: string;
  hubCode: string; // Mã kết nối với dữ liệu thống kê CSDL (1 trong 8 cực tăng trưởng chính)
  nameVi: string;
  nameEn: string;
  lon: number;
  lat: number;
  isPrimaryHub: boolean;
  isCapital?: boolean;
  regionNameVi: string;
  labelAnchor: 'start' | 'end' | 'middle';
  dx: number;
  dy: number;
  populationLabel?: string;
  keyHighlightVi?: string;
}

export interface IslandGeo {
  id: string;
  nameVi: string;
  nameEn: string;
  adminVi: string;
  lon: number;
  lat: number;
  isSovereigntyArchipelago?: boolean;
  subIslands?: { name: string; lon: number; lat: number }[];
  polygon?: [number, number][];
}

/**
 * Phép chiếu Web Mercator chuẩn từ [Kinh độ (Lon), Vĩ độ (Lat)] sang tọa độ bản đồ SVG (ViewBox 0 0 800 1050)
 * Phạm vi bao phủ: Kinh độ 100.8°E -> 116.2°E | Vĩ độ 7.2°N -> 24.0°N
 */
const LON_MIN = 100.8;
const LON_MAX = 116.2;
const LAT_MIN = 7.2;
const LAT_MAX = 24.0;

const MAP_WIDTH = 800;
const MAP_HEIGHT = 1050;

function mercatorY(latDeg: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

const MERC_Y_MIN = mercatorY(LAT_MIN);
const MERC_Y_MAX = mercatorY(LAT_MAX);

export function projectLonLat(lon: number, lat: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_WIDTH;
  const yMerc = mercatorY(lat);
  const y = ((MERC_Y_MAX - yMerc) / (MERC_Y_MAX - MERC_Y_MIN)) * MAP_HEIGHT;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export function unprojectXY(x: number, y: number): { lon: number; lat: number } {
  const lon = LON_MIN + (x / MAP_WIDTH) * (LON_MAX - LON_MIN);
  const yMerc = MERC_Y_MAX - (y / MAP_HEIGHT) * (MERC_Y_MAX - MERC_Y_MIN);
  const latRad = 2 * (Math.atan(Math.exp(yMerc)) - Math.PI / 4);
  const lat = (latRad * 180) / Math.PI;
  return {
    lon: Math.round(lon * 100) / 100,
    lat: Math.round(lat * 100) / 100
  };
}

export function coordsToSvgPath(coords: [number, number][], closed = true): string {
  if (!coords.length) return '';
  const pts = coords.map(([lon, lat]) => projectLonLat(lon, lat));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  return closed ? `${d} Z` : d;
}

export function formatDMS(deg: number, isLat: boolean): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const dir = isLat ? (deg >= 0 ? 'B' : 'N') : deg >= 0 ? 'Đ' : 'T';
  return `${d}°${m.toString().padStart(2, '0')}'${dir}`;
}

/**
 * 7 Vùng Kinh tế - Địa lý Việt Nam với tọa độ đường biên giới & bờ biển thực tế độ chi tiết cao.
 * Các đỉnh ranh giới nội địa giữa hai vùng kề nhau được khớp nối chính xác 100%.
 */
export const VIETNAM_MACRO_REGIONS: MacroRegionGeo[] = [
  {
    id: 'REG-NORTH-MOUNTAIN',
    nameVi: 'Trung du & Miền núi Bắc Bộ',
    nameEn: 'Northern Midlands & Mountains',
    hubCode: 'VN-BN',
    baseColor: '#2563EB',
    atlasFill: '#93C5FD',
    borderColor: '#1D4ED8',
    labelLon: 104.8,
    labelLat: 22.0,
    provincesVi: 'Hà Giang, Lào Cai, Điện Biên, Sơn La, Yên Bái, Thái Nguyên, Bắc Giang, Lạng Sơn, Cao Bằng, Phú Thọ...',
    coordinates: [
      // Cực Tây A Pa Chải (Điện Biên) -> Lai Châu -> Lào Cai -> Hà Giang (Lũng Cú)
      [102.15, 22.40], [102.35, 22.52], [102.70, 22.68], [103.15, 22.76], [103.55, 22.58],
      [103.97, 22.49], [104.35, 22.72], [104.78, 23.08], [105.05, 23.22], [105.32, 23.38],
      // Hà Giang -> Cao Bằng -> Lạng Sơn -> Quảng Ninh (Bình Liêu)
      [105.62, 23.15], [105.92, 22.96], [106.32, 22.95], [106.72, 22.85], [106.82, 22.55],
      [106.62, 22.22], [106.75, 21.85], [107.08, 21.62], [107.45, 21.55],
      // Ranh giới với Đồng bằng Sông Hồng & Quảng Ninh
      [106.95, 21.35], [106.45, 21.25], [105.98, 21.30], [105.45, 21.26], [105.22, 21.02],
      [105.32, 20.62],
      // Biên giới phía Tây giáp Lào (Sơn La, Điện Biên)
      [104.88, 20.52], [104.45, 20.72], [103.92, 20.88], [103.42, 20.92], [103.05, 21.15],
      [102.82, 21.38], [102.68, 21.75], [102.38, 22.05], [102.15, 22.40]
    ]
  },
  {
    id: 'REG-RED-RIVER',
    nameVi: 'Đồng bằng Sông Hồng & Duyên hải Đông Bắc',
    nameEn: 'Red River Delta & Northeast Coast',
    hubCode: 'VN-HN',
    baseColor: '#0284C7',
    atlasFill: '#BAE6FD',
    borderColor: '#0369A1',
    labelLon: 106.15,
    labelLat: 20.75,
    provincesVi: 'Hà Nội, Hải Phòng, Bắc Ninh, Quảng Ninh, Vĩnh Phúc, Hải Dương, Hưng Yên, Nam Định, Thái Bình, Ninh Bình...',
    coordinates: [
      // Khớp biên phía Bắc với Trung du Miền núi Bắc Bộ
      [105.32, 20.62], [105.22, 21.02], [105.45, 21.26], [105.98, 21.30], [106.45, 21.25],
      [106.95, 21.35], [107.45, 21.55],
      // Móng Cái -> Vịnh Hạ Long -> Cát Bà -> Hải Phòng -> Thái Bình -> Nam Định -> Ninh Bình
      [107.97, 21.52], [107.82, 21.32], [107.45, 21.05], [107.08, 20.92], [106.82, 20.72],
      [106.65, 20.52], [106.58, 20.25], [106.35, 20.05], [106.10, 19.95],
      // Ranh giới phía Nam giáp Thanh Hóa (Bắc Trung Bộ)
      [105.82, 20.05], [105.52, 20.28], [105.32, 20.62]
    ]
  },
  {
    id: 'REG-NORTH-CENTRAL',
    nameVi: 'Bắc Trung Bộ',
    nameEn: 'North Central Coast',
    hubCode: 'VN-DN',
    baseColor: '#0D9488',
    atlasFill: '#99F6E4',
    borderColor: '#0F766E',
    labelLon: 105.85,
    labelLat: 18.35,
    provincesVi: 'Thanh Hóa, Nghệ An, Hà Tĩnh, Quảng Bình, Quảng Trị, Thừa Thiên Huế',
    coordinates: [
      // Giáp Đồng bằng Sông Hồng & Sơn La
      [104.88, 20.52], [105.32, 20.62], [105.52, 20.28], [105.82, 20.05], [106.10, 19.95],
      // Bờ biển Thanh Hóa -> Nghệ An -> Hà Tĩnh (Mũi Vũng Áng) -> Quảng Bình -> Quảng Trị -> Huế (Lăng Cô)
      [105.92, 19.72], [105.80, 19.32], [105.72, 18.82], [105.95, 18.42], [106.42, 18.08],
      [106.55, 17.72], [106.68, 17.42], [107.05, 17.05], [107.38, 16.75], [107.72, 16.52],
      [108.08, 16.22],
      // Ranh giới đèo Hải Vân giáp Đà Nẵng / Quảng Nam
      [107.65, 16.08], [107.22, 16.12],
      // Biên giới Trường Sơn giáp Lào (Quảng Trị -> Quảng Bình -> Hà Tĩnh -> Nghệ An -> Thanh Hóa)
      [106.62, 16.58], [106.28, 17.05], [105.78, 17.65], [105.25, 18.28], [104.85, 18.68],
      [104.35, 19.15], [103.95, 19.45], [104.38, 19.85], [104.65, 20.28], [104.88, 20.52]
    ]
  },
  {
    id: 'REG-SOUTH-CENTRAL',
    nameVi: 'Duyên hải Nam Trung Bộ',
    nameEn: 'South Central Coast',
    hubCode: 'VN-DN',
    baseColor: '#059669',
    atlasFill: '#A7F3D0',
    borderColor: '#047857',
    labelLon: 108.9,
    labelLat: 13.8,
    provincesVi: 'Đà Nẵng, Quảng Nam, Quảng Ngãi, Bình Định, Phú Yên, Khánh Hòa, Ninh Thuận, Bình Thuận',
    coordinates: [
      // Giáp Huế (Đèo Hải Vân)
      [107.22, 16.12], [107.65, 16.08], [108.08, 16.22],
      // Bán đảo Sơn Trà (Đà Nẵng) -> Hội An -> Dung Quất -> Quy Nhơn -> Tuy Hòa -> Mũi Đại Lãnh -> Nha Trang -> Cam Ranh -> Phan Rang -> Mũi Né -> Phan Thiết -> La Gi
      [108.28, 16.12], [108.42, 15.82], [108.78, 15.42], [108.92, 14.95], [109.08, 14.42],
      [109.25, 13.82], [109.32, 13.15], [109.46, 12.88], [109.24, 12.25], [109.22, 11.88],
      [109.02, 11.55], [108.62, 11.22], [108.28, 10.94], [107.98, 10.82], [107.55, 10.65],
      // Ranh giới giáp Đông Nam Bộ & Tây Nguyên (dọc sườn Đông Trường Sơn)
      [107.42, 11.15], [107.85, 11.45], [108.35, 11.85], [108.62, 12.45], [108.68, 13.25],
      [108.58, 14.05], [108.35, 14.75], [108.05, 15.22], [107.52, 15.42], [107.28, 15.72],
      [107.22, 16.12]
    ]
  },
  {
    id: 'REG-CENTRAL-HIGHLANDS',
    nameVi: 'Tây Nguyên',
    nameEn: 'Central Highlands',
    hubCode: 'VN-DNA',
    baseColor: '#16A34A',
    atlasFill: '#BBF7D0',
    borderColor: '#15803D',
    labelLon: 108.0,
    labelLat: 13.3,
    provincesVi: 'Kon Tum, Gia Lai, Đắk Lắk, Đắk Nông, Lâm Đồng (Đà Lạt)',
    coordinates: [
      // Ngã ba Đông Dương (Bờ Y - Kon Tum) -> Giáp Quảng Nam & Duyên hải Nam Trung Bộ
      [107.52, 15.42], [108.05, 15.22], [108.35, 14.75], [108.58, 14.05], [108.68, 13.25],
      [108.62, 12.45], [108.35, 11.85], [107.85, 11.45], [107.42, 11.15],
      // Ranh giới giáp Đông Nam Bộ (Đồng Nai, Bình Phước)
      [107.18, 11.55], [107.15, 12.02],
      // Biên giới phía Tây giáp Campuchia & Lào (Đắk Nông -> Đắk Lắk -> Gia Lai -> Kon Tum)
      [107.42, 12.35], [107.45, 13.05], [107.38, 13.78], [107.42, 14.38], [107.53, 14.72],
      [107.52, 15.42]
    ]
  },
  {
    id: 'REG-SOUTHEAST',
    nameVi: 'Đông Nam Bộ (Tứ giác Kinh tế Phía Nam)',
    nameEn: 'Southeast Economic Zone',
    hubCode: 'VN-SG',
    baseColor: '#4F46E5',
    atlasFill: '#C7D2FE',
    borderColor: '#4338CA',
    labelLon: 106.85,
    labelLat: 11.15,
    provincesVi: 'TP. Hồ Chí Minh, Bình Dương, Đồng Nai, Bà Rịa - Vũng Tàu, Tây Ninh, Bình Phước',
    coordinates: [
      // Biên giới Bình Phước & Tây Ninh giáp Campuchia
      [106.52, 12.02], [107.15, 12.02], [107.18, 11.55], [107.42, 11.15], [107.55, 10.65],
      // Bờ biển Hồ Tràm -> Vũng Tàu -> Cần Giờ (TP.HCM)
      [107.28, 10.45], [107.06, 10.33], [106.88, 10.42],
      // Ranh giới giáp Đồng bằng Sông Cửu Long (Long An)
      [106.62, 10.62], [106.38, 10.88], [106.15, 10.95],
      // Tây Ninh -> Bình Phước
      [105.92, 11.25], [105.98, 11.68], [106.25, 11.82], [106.52, 12.02]
    ]
  },
  {
    id: 'REG-MEKONG-DELTA',
    nameVi: 'Đồng bằng Sông Cửu Long (Miền Tây)',
    nameEn: 'Mekong River Delta',
    hubCode: 'VN-CT',
    baseColor: '#0EA5E9',
    atlasFill: '#FDE68A',
    borderColor: '#0284C7',
    labelLon: 105.55,
    labelLat: 9.85,
    provincesVi: 'Cần Thơ, Long An, Tiền Giang, Bến Tre, Vĩnh Long, Đồng Tháp, An Giang, Kiên Giang, Sóc Trăng, Bạc Liêu, Cà Mau...',
    coordinates: [
      // Giáp Đông Nam Bộ (Long An - TP.HCM)
      [106.15, 10.95], [106.38, 10.88], [106.62, 10.62], [106.88, 10.42],
      // Cửa biển Gò Công -> Bến Tre -> Trà Vinh -> Sóc Trăng -> Bạc Liêu -> Mũi Cà Mau
      [106.76, 10.22], [106.68, 9.95], [106.52, 9.62], [106.18, 9.38], [105.75, 9.18],
      [105.32, 8.85], [104.88, 8.58], [104.72, 8.62],
      // Vịnh Thái Lan: Mũi Cà Mau -> U Minh -> Rạch Giá -> Hà Tiên
      [104.82, 9.15], [104.88, 9.65], [105.08, 10.02], [104.78, 10.18], [104.48, 10.38],
      // Biên giới Tây Nam giáp Campuchia: An Giang -> Đồng Tháp -> Long An
      [104.92, 10.58], [105.12, 10.82], [105.45, 10.92], [105.78, 10.85], [106.15, 10.95]
    ]
  }
];

/**
 * Đường bao các Quốc gia Láng giềng (Trung Quốc, Lào, Campuchia) để tạo Bản đồ Địa lý Thực tế
 */
export const NEIGHBORING_COUNTRIES_GEO = [
  {
    id: 'CHINA-SOUTH',
    nameVi: 'TRUNG QUỐC',
    nameEn: 'CHINA',
    labelLon: 106.5,
    labelLat: 23.45,
    coordinates: [
      [100.8, 24.0], [116.2, 24.0], [116.2, 21.5], [110.2, 21.5], [109.8, 20.2],
      [108.5, 21.5], [107.97, 21.52], [107.45, 21.55], [107.08, 21.62], [106.75, 21.85],
      [106.62, 22.22], [106.82, 22.55], [106.72, 22.85], [106.32, 22.95], [105.92, 22.96],
      [105.62, 23.15], [105.32, 23.38], [105.05, 23.22], [104.78, 23.08], [104.35, 22.72],
      [103.97, 22.49], [103.55, 22.58], [103.15, 22.76], [102.70, 22.68], [102.35, 22.52],
      [102.15, 22.40], [100.8, 22.4]
    ] as [number, number][]
  },
  {
    id: 'LAOS',
    nameVi: 'CHDCND LÀO',
    nameEn: 'LAOS',
    labelLon: 103.4,
    labelLat: 18.2,
    coordinates: [
      [100.8, 22.4], [102.15, 22.40], [102.38, 22.05], [102.68, 21.75], [102.82, 21.38],
      [103.05, 21.15], [103.42, 20.92], [103.92, 20.88], [104.45, 20.72], [104.88, 20.52],
      [104.65, 20.28], [104.38, 19.85], [103.95, 19.45], [104.35, 19.15], [104.85, 18.68],
      [105.25, 18.28], [105.78, 17.65], [106.28, 17.05], [106.62, 16.58], [107.22, 16.12],
      [107.28, 15.72], [107.52, 15.42], [107.53, 14.72],
      [105.5, 14.2], [103.5, 15.0], [100.8, 17.5]
    ] as [number, number][]
  },
  {
    id: 'CAMBODIA',
    nameVi: 'VƯƠNG QUỐC CAMPUCHIA',
    nameEn: 'CAMBODIA',
    labelLon: 104.6,
    labelLat: 12.6,
    coordinates: [
      [103.5, 15.0], [105.5, 14.2], [107.53, 14.72], [107.42, 14.38], [107.38, 13.78],
      [107.45, 13.05], [107.42, 12.35], [107.15, 12.02], [106.52, 12.02], [106.25, 11.82],
      [105.98, 11.68], [105.92, 11.25], [106.15, 10.95], [105.78, 10.85], [105.45, 10.92],
      [105.12, 10.82], [104.92, 10.58], [104.48, 10.38], [103.2, 10.8], [102.3, 12.2],
      [102.5, 14.2]
    ] as [number, number][]
  },
  {
    id: 'HAINAN-ISLAND',
    nameVi: 'Đảo Hải Nam',
    nameEn: 'Hainan Island',
    labelLon: 109.7,
    labelLat: 19.1,
    coordinates: [
      [108.65, 19.15], [109.15, 19.75], [110.05, 20.05], [110.95, 19.65],
      [110.45, 18.65], [109.52, 18.22], [108.75, 18.48]
    ] as [number, number][]
  }
];

/**
 * Hệ thống Sông lớn và Trục Giao thông Quốc lộ 1A / Cao tốc Bắc - Nam trên bản đồ thực
 */
export const MAJOR_RIVERS_GEO = [
  {
    nameVi: 'Sông Hồng',
    coords: [[103.97, 22.49], [104.82, 21.72], [105.35, 21.28], [105.85, 21.02], [106.08, 20.65], [106.55, 20.25]] as [number, number][]
  },
  {
    nameVi: 'Sông Đà',
    coords: [[102.65, 22.25], [103.52, 21.55], [104.65, 20.85], [105.32, 20.82], [105.35, 21.28]] as [number, number][]
  },
  {
    nameVi: 'Sông Mê Kông (Sông Tiền)',
    coords: [[103.8, 15.2], [105.8, 13.8], [104.9, 11.5], [105.12, 10.82], [105.75, 10.32], [106.68, 9.95]] as [number, number][]
  },
  {
    nameVi: 'Sông Hậu',
    coords: [[105.05, 10.75], [105.45, 10.35], [105.78, 10.03], [106.18, 9.42]] as [number, number][]
  },
  {
    nameVi: 'Sông Đồng Nai',
    coords: [[108.25, 11.95], [107.45, 11.42], [106.85, 10.95], [106.75, 10.65], [106.88, 10.42]] as [number, number][]
  }
];

export const NATIONAL_CORRIDOR_QL1A: [number, number][] = [
  [106.75, 21.85], // Lạng Sơn
  [106.07, 21.18], // Bắc Ninh
  [105.85, 21.02], // Hà Nội
  [105.97, 20.25], // Ninh Bình
  [105.78, 19.80], // Thanh Hóa
  [105.68, 18.67], // Vinh (Nghệ An)
  [106.60, 17.47], // Đồng Hới
  [107.59, 16.46], // Huế
  [108.22, 16.05], // Đà Nẵng
  [108.80, 15.12], // Quảng Ngãi
  [109.22, 13.78], // Quy Nhơn
  [109.19, 12.24], // Nha Trang
  [108.10, 10.93], // Phan Thiết
  [106.82, 10.95], // Biên Hòa (Đồng Nai)
  [106.66, 10.77], // TP. Hồ Chí Minh
  [105.78, 10.03], // Cần Thơ
  [105.15, 9.18]   // Cà Mau
];

/**
 * Hệ thống Đảo và Quần đảo Chủ quyền Việt Nam (Tọa độ thực tế)
 */
export const VIETNAM_ISLANDS_GEO: IslandGeo[] = [
  {
    id: 'ISL-PHU-QUOC',
    nameVi: 'Đảo Phú Quốc',
    nameEn: 'Phu Quoc Island',
    adminVi: 'TP. Phú Quốc, Tỉnh Kiên Giang',
    lon: 103.96,
    lat: 10.22,
    polygon: [
      [103.85, 10.42], [104.06, 10.38], [104.04, 10.02], [103.92, 10.05], [103.85, 10.42]
    ]
  },
  {
    id: 'ISL-CON-DAO',
    nameVi: 'Côn Đảo',
    nameEn: 'Con Dao Archipelago',
    adminVi: 'Huyện Côn Đảo, Tỉnh Bà Rịa - Vũng Tàu',
    lon: 106.60,
    lat: 8.68
  },
  {
    id: 'ISL-PHU-QUY',
    nameVi: 'Đảo Phú Quý',
    nameEn: 'Phu Quy Island',
    adminVi: 'Huyện Phú Quý, Tỉnh Bình Thuận',
    lon: 108.94,
    lat: 10.52
  },
  {
    id: 'ISL-LY-SON',
    nameVi: 'Đảo Lý Sơn',
    nameEn: 'Ly Son Island',
    adminVi: 'Huyện Lý Sơn, Tỉnh Quảng Ngãi',
    lon: 109.12,
    lat: 15.38
  },
  {
    id: 'ISL-CON-CO',
    nameVi: 'Đảo Cồn Cỏ',
    nameEn: 'Con Co Island',
    adminVi: 'Huyện Cồn Cỏ, Tỉnh Quảng Trị',
    lon: 107.34,
    lat: 17.16
  },
  {
    id: 'ISL-BACH-LONG-VI',
    nameVi: 'Đảo Bạch Long Vĩ',
    nameEn: 'Bach Long Vi Island',
    adminVi: 'Huyện Bạch Long Vĩ, TP. Hải Phòng',
    lon: 107.72,
    lat: 20.13
  },
  {
    id: 'ISL-CAT-BA',
    nameVi: 'Quần đảo Cát Bà',
    nameEn: 'Cat Ba Island',
    adminVi: 'Huyện Cát Hải, TP. Hải Phòng',
    lon: 107.02,
    lat: 20.78
  },
  {
    id: 'ARCH-HOANG-SA',
    nameVi: 'QUẦN ĐẢO HOÀNG SA',
    nameEn: 'PARACEL ISLANDS (VIETNAM)',
    adminVi: 'Huyện Hoàng Sa, TP. Đà Nẵng, Việt Nam',
    lon: 112.0,
    lat: 16.5,
    isSovereigntyArchipelago: true,
    subIslands: [
      { name: 'Đảo Hoàng Sa', lon: 111.62, lat: 16.53 },
      { name: 'Đảo Phú Lâm', lon: 112.33, lat: 16.83 },
      { name: 'Đảo Linh Côn', lon: 112.73, lat: 16.67 },
      { name: 'Đảo Tri Tôn', lon: 111.20, lat: 15.78 },
      { name: 'Đảo Quang Hòa', lon: 111.78, lat: 16.45 },
      { name: 'Đá Bông Bay', lon: 112.52, lat: 16.05 }
    ]
  },
  {
    id: 'ARCH-TRUONG-SA',
    nameVi: 'QUẦN ĐẢO TRƯỜNG SA',
    nameEn: 'SPRATLY ISLANDS (VIETNAM)',
    adminVi: 'Huyện Trường Sa, Tỉnh Khánh Hòa, Việt Nam',
    lon: 113.8,
    lat: 10.0,
    isSovereigntyArchipelago: true,
    subIslands: [
      { name: 'Đảo Trường Sa Lớn', lon: 111.92, lat: 8.64 },
      { name: 'Đảo Song Tử Tây', lon: 114.33, lat: 11.43 },
      { name: 'Đảo Sinh Tồn', lon: 114.33, lat: 9.88 },
      { name: 'Đảo Nam Yết', lon: 114.36, lat: 10.18 },
      { name: 'Đảo Sơn Ca', lon: 114.48, lat: 10.38 },
      { name: 'Đảo An Bang', lon: 112.90, lat: 7.89 },
      { name: 'Đá Tây', lon: 112.22, lat: 8.85 },
      { name: 'Đảo Tiên Nữ', lon: 114.62, lat: 8.86 }
    ]
  }
];

/**
 * 26 Tỉnh / Thành phố Thực tế trên Bản đồ Việt Nam (Gồm 8 Cực Tăng trưởng Trọng điểm có CSDL trực tiếp
 * và 18 Thành phố/Tỉnh vệ tinh trên toàn quốc)
 */
export const VIETNAM_CITIES_GEO: CityMarkerGeo[] = [
  // === 8 CỰC TĂNG TRƯỞNG TRỌNG ĐIỂM (PRIMARY HUBS) ===
  {
    code: 'VN-HN',
    hubCode: 'VN-HN',
    nameVi: 'Thủ đô Hà Nội',
    nameEn: 'Hanoi Capital',
    lon: 105.84,
    lat: 21.03,
    isPrimaryHub: true,
    isCapital: true,
    regionNameVi: 'Đồng bằng Sông Hồng',
    labelAnchor: 'end',
    dx: -12,
    dy: 4,
    populationLabel: '8.5 triệu dân',
    keyHighlightVi: 'Trung tâm Chính trị, R&D Công nghệ, AI/Fintech & Dịch vụ Bậc cao'
  },
  {
    code: 'VN-BN',
    hubCode: 'VN-BN',
    nameVi: 'Bắc Ninh',
    nameEn: 'Bac Ninh',
    lon: 106.07,
    lat: 21.18,
    isPrimaryHub: true,
    regionNameVi: 'Đồng bằng Sông Hồng',
    labelAnchor: 'start',
    dx: 11,
    dy: -5,
    populationLabel: '1.5 triệu dân',
    keyHighlightVi: 'Thủ phủ Công nghiệp Điện tử, Bán dẫn & Tự động hóa Miền Bắc'
  },
  {
    code: 'VN-HP',
    hubCode: 'VN-HP',
    nameVi: 'Hải Phòng',
    nameEn: 'Hai Phong',
    lon: 106.68,
    lat: 20.84,
    isPrimaryHub: true,
    regionNameVi: 'Đồng bằng Sông Hồng',
    labelAnchor: 'start',
    dx: 12,
    dy: 5,
    populationLabel: '2.1 triệu dân',
    keyHighlightVi: 'Cảng biển Quốc tế, Chuỗi cung ứng Logistics & Tổ hợp Sản xuất'
  },
  {
    code: 'VN-DN',
    hubCode: 'VN-DN',
    nameVi: 'Đà Nẵng',
    nameEn: 'Da Nang',
    lon: 108.22,
    lat: 16.05,
    isPrimaryHub: true,
    regionNameVi: 'Duyên hải Nam Trung Bộ',
    labelAnchor: 'start',
    dx: 13,
    dy: 4,
    populationLabel: '1.25 triệu dân',
    keyHighlightVi: 'Trung tâm CNTT, Thiết kế Vi mạch & Đô thị Đáng sống Miền Trung'
  },
  {
    code: 'VN-BD',
    hubCode: 'VN-BD',
    nameVi: 'Bình Dương',
    nameEn: 'Binh Duong',
    lon: 106.65,
    lat: 11.05,
    isPrimaryHub: true,
    regionNameVi: 'Đông Nam Bộ',
    labelAnchor: 'end',
    dx: -12,
    dy: -4,
    populationLabel: '2.8 triệu dân',
    keyHighlightVi: 'Thủ phủ Công nghiệp Thông minh VSIP, IoT, ERP & Chuyển đổi Xanh'
  },
  {
    code: 'VN-DNA',
    hubCode: 'VN-DNA',
    nameVi: 'Đồng Nai',
    nameEn: 'Dong Nai',
    lon: 106.95,
    lat: 10.95,
    isPrimaryHub: true,
    regionNameVi: 'Đông Nam Bộ',
    labelAnchor: 'start',
    dx: 12,
    dy: -2,
    populationLabel: '3.3 triệu dân',
    keyHighlightVi: 'Siêu Cảng Hàng không Long Thành, Logistics & Công nghiệp Phụ trợ'
  },
  {
    code: 'VN-SG',
    hubCode: 'VN-SG',
    nameVi: 'TP. Hồ Chí Minh',
    nameEn: 'Ho Chi Minh City',
    lon: 106.66,
    lat: 10.77,
    isPrimaryHub: true,
    regionNameVi: 'Đông Nam Bộ',
    labelAnchor: 'start',
    dx: 13,
    dy: 10,
    populationLabel: '9.4 triệu dân',
    keyHighlightVi: 'Đầu tàu Kinh tế Số, Tài chính Ngân hàng, Phần mềm & AI lớn nhất cả nước'
  },
  {
    code: 'VN-CT',
    hubCode: 'VN-CT',
    nameVi: 'Cần Thơ',
    nameEn: 'Can Tho',
    lon: 105.78,
    lat: 10.03,
    isPrimaryHub: true,
    regionNameVi: 'Đồng bằng Sông Cửu Long',
    labelAnchor: 'end',
    dx: -12,
    dy: 4,
    populationLabel: '1.3 triệu dân',
    keyHighlightVi: 'Trung tâm Tin học Môi trường, Nông nghiệp Công nghệ cao & GIS ĐBSCL'
  },

  // === 18 ĐÔ THỊ & TỈNH VỆ TINH TRÊN TOÀN QUỐC ===
  {
    code: 'SAT-HG',
    hubCode: 'VN-BN',
    nameVi: 'Hà Giang (Lũng Cú)',
    nameEn: 'Ha Giang',
    lon: 104.98,
    lat: 22.82,
    isPrimaryHub: false,
    regionNameVi: 'Trung du & Miền núi Bắc Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: -4,
    keyHighlightVi: 'Cực Bắc Tổ quốc • Du lịch Sinh thái & Bảo tồn Địa chất'
  },
  {
    code: 'SAT-LC',
    hubCode: 'VN-BN',
    nameVi: 'Lào Cai',
    nameEn: 'Lao Cai',
    lon: 103.97,
    lat: 22.48,
    isPrimaryHub: false,
    regionNameVi: 'Trung du & Miền núi Bắc Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: 3,
    keyHighlightVi: 'Kinh tế Cửa khẩu Quốc tế, Khoáng sản & GIS Lâm nghiệp'
  },
  {
    code: 'SAT-DB',
    hubCode: 'VN-BN',
    nameVi: 'Điện Biên Phủ',
    nameEn: 'Dien Bien Phu',
    lon: 103.02,
    lat: 21.39,
    isPrimaryHub: false,
    regionNameVi: 'Trung du & Miền núi Bắc Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: 3,
    keyHighlightVi: 'Trung tâm Tây Bắc • Năng lượng Tái tạo & Tài nguyên Rừng'
  },
  {
    code: 'SAT-TN',
    hubCode: 'VN-BN',
    nameVi: 'Thái Nguyên',
    nameEn: 'Thai Nguyen',
    lon: 105.84,
    lat: 21.59,
    isPrimaryHub: false,
    regionNameVi: 'Trung du & Miền núi Bắc Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: -3,
    keyHighlightVi: 'Tổ hợp Sản xuất Samsung Điện tử & Đào tạo Kỹ thuật Vùng Việt Bắc'
  },
  {
    code: 'SAT-QN',
    hubCode: 'VN-HP',
    nameVi: 'Hạ Long (Quảng Ninh)',
    nameEn: 'Ha Long (Quang Ninh)',
    lon: 107.08,
    lat: 20.95,
    isPrimaryHub: false,
    regionNameVi: 'Đồng bằng Sông Hồng & Đông Bắc',
    labelAnchor: 'start',
    dx: 9,
    dy: -4,
    keyHighlightVi: 'Kinh tế Biển, Cảng nước sâu, Năng lượng & Công nghiệp Chế tạo'
  },
  {
    code: 'SAT-TH',
    hubCode: 'VN-HN',
    nameVi: 'Thanh Hóa',
    nameEn: 'Thanh Hoa',
    lon: 105.78,
    lat: 19.80,
    isPrimaryHub: false,
    regionNameVi: 'Bắc Trung Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: 4,
    keyHighlightVi: 'Khu Kinh tế Nghi Sơn, Lọc hóa dầu & Công nghiệp Nặng'
  },
  {
    code: 'SAT-NA',
    hubCode: 'VN-DN',
    nameVi: 'Vinh (Nghệ An)',
    nameEn: 'Vinh (Nghe An)',
    lon: 105.68,
    lat: 18.67,
    isPrimaryHub: false,
    regionNameVi: 'Bắc Trung Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: 4,
    keyHighlightVi: 'Trung tâm Kinh tế - Giáo dục Bắc Trung Bộ & KCN VSIP Nghệ An'
  },
  {
    code: 'SAT-QB',
    hubCode: 'VN-DN',
    nameVi: 'Đồng Hới (Quảng Bình)',
    nameEn: 'Dong Hoi',
    lon: 106.62,
    lat: 17.47,
    isPrimaryHub: false,
    regionNameVi: 'Bắc Trung Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: 3,
    keyHighlightVi: 'Năng lượng Gió, Du lịch Bền vững & Quản lý Di sản Thiên nhiên'
  },
  {
    code: 'SAT-HUE',
    hubCode: 'VN-DN',
    nameVi: 'TP. Huế',
    nameEn: 'Hue City',
    lon: 107.59,
    lat: 16.46,
    isPrimaryHub: false,
    regionNameVi: 'Bắc Trung Bộ',
    labelAnchor: 'end',
    dx: -8,
    dy: -2,
    keyHighlightVi: 'Thành phố Trực thuộc Trung ương • Trung tâm Y tế, Giáo dục & CNTT'
  },
  {
    code: 'SAT-QNG',
    hubCode: 'VN-DN',
    nameVi: 'Quảng Ngãi',
    nameEn: 'Quang Ngai',
    lon: 108.80,
    lat: 15.12,
    isPrimaryHub: false,
    regionNameVi: 'Duyên hải Nam Trung Bộ',
    labelAnchor: 'start',
    dx: 9,
    dy: 3,
    keyHighlightVi: 'Khu Kinh tế Dung Quất, Luyện kim Hòa Phát & Lọc hóa dầu'
  },
  {
    code: 'SAT-QNH',
    hubCode: 'VN-DN',
    nameVi: 'Quy Nhơn (Bình Định)',
    nameEn: 'Quy Nhon',
    lon: 109.22,
    lat: 13.78,
    isPrimaryHub: false,
    regionNameVi: 'Duyên hải Nam Trung Bộ',
    labelAnchor: 'start',
    dx: 9,
    dy: 3,
    keyHighlightVi: 'Đô thị Khoa học & Thung lũng Trí tuệ Nhân tạo (AI Valley Quy Nhơn)'
  },
  {
    code: 'SAT-BMT',
    hubCode: 'VN-DNA',
    nameVi: 'Buôn Ma Thuột (Đắk Lắk)',
    nameEn: 'Buon Ma Thuot',
    lon: 108.04,
    lat: 12.67,
    isPrimaryHub: false,
    regionNameVi: 'Tây Nguyên',
    labelAnchor: 'end',
    dx: -8,
    dy: 3,
    keyHighlightVi: 'Trung tâm Vùng Tây Nguyên • Nông lâm nghiệp Số, Viễn thám & Điện gió'
  },
  {
    code: 'SAT-NT',
    hubCode: 'VN-DN',
    nameVi: 'Nha Trang (Khánh Hòa)',
    nameEn: 'Nha Trang',
    lon: 109.19,
    lat: 12.24,
    isPrimaryHub: false,
    regionNameVi: 'Duyên hải Nam Trung Bộ',
    labelAnchor: 'start',
    dx: 9,
    dy: 4,
    keyHighlightVi: 'Kinh tế Hàng hải, Hải dương học, Công nghệ Phần mềm & Du lịch Quốc tế'
  },
  {
    code: 'SAT-DL',
    hubCode: 'VN-SG',
    nameVi: 'Đà Lạt (Lâm Đồng)',
    nameEn: 'Da Lat',
    lon: 108.44,
    lat: 11.94,
    isPrimaryHub: false,
    regionNameVi: 'Tây Nguyên',
    labelAnchor: 'end',
    dx: -8,
    dy: 4,
    keyHighlightVi: 'Nông nghiệp Công nghệ cao IoT, Công nghệ Sinh học & Dữ liệu Khí hậu'
  },
  {
    code: 'SAT-VT',
    hubCode: 'VN-DNA',
    nameVi: 'Bà Rịa - Vũng Tàu',
    nameEn: 'Ba Ria - Vung Tau',
    lon: 107.08,
    lat: 10.35,
    isPrimaryHub: false,
    regionNameVi: 'Đông Nam Bộ',
    labelAnchor: 'start',
    dx: 10,
    dy: 6,
    keyHighlightVi: 'Cụm Cảng Nước sâu Cái Mép - Thị Vải, Dầu khí & Điện gió Ngoài khơi'
  },
  {
    code: 'SAT-AG',
    hubCode: 'VN-CT',
    nameVi: 'Long Xuyên (An Giang)',
    nameEn: 'Long Xuyen (An Giang)',
    lon: 105.43,
    lat: 10.38,
    isPrimaryHub: false,
    regionNameVi: 'Đồng bằng Sông Cửu Long',
    labelAnchor: 'end',
    dx: -8,
    dy: -2,
    keyHighlightVi: 'Thủy sản, Nông nghiệp Bền vững & Quan trắc Tài nguyên Nước Mê Kông'
  },
  {
    code: 'SAT-CM',
    hubCode: 'VN-CT',
    nameVi: 'Cà Mau (Cực Nam)',
    nameEn: 'Ca Mau',
    lon: 105.15,
    lat: 9.18,
    isPrimaryHub: false,
    regionNameVi: 'Đồng bằng Sông Cửu Long',
    labelAnchor: 'end',
    dx: -8,
    dy: 5,
    keyHighlightVi: 'Cụm Khí - Điện - Đạm Cà Mau, Lâm nghiệp Ngập mặn & Carbon Tín chỉ'
  }
];


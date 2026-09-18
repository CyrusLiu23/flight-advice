/**
 * Flight Explorer · 全球直飞航线规则 / Global direct-route engine
 * -----------------------------------------------------------------
 * 这是一套“规则 + 精选航线”的演示数据，让网页在没有后端的条件下也能覆盖全球。
 * 规则说明（README 中有完整解释）：
 *   R1  中国国内：枢纽互通、枢纽直飞全国、同区域中小城市按距离阈值连通
 *   R2  全球枢纽之间互相直飞（含中国枢纽与港澳台）
 *   R3  国际城市之间：同大洲且距离 ≤ 3500km 视为直飞
 *   R4  国际城市之间：同一细分区（如东南亚）视为直飞
 *   R5  每个城市至少连接最近的 5 座城市（≤ 6000km），保证网络连通
 *   R6  国际城市 ↔ 中国城市：优先用 INTL_ROUTES 的精选清单，其余按远近程度套用枢纽清单
 *   R7  EXTRA_ROUTES 补充规则覆盖不到的著名长航线（如斐济、马尔代夫、非洲）
 */
(function (global) {
  const CITIES = global.FE_CITIES || [];
  const byId = {};
  CITIES.forEach((city) => {
    byId[city.id] = city;
  });

  const EARTH_RADIUS_KM = 6371;
  function toRadians(deg) {
    return (deg * Math.PI) / 180;
  }
  function distanceKm(a, b) {
    if (!a || !b) return 0;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** 全球枢纽：中国 tier1 + 国际 tier1 */
  const GLOBAL_HUBS = CITIES.filter((c) => c.tier === 1).map((c) => c.id);

  /** 中国长航线枢纽（洲际航线主要从这里出发） */
  const CN_LONGHAUL_HUBS = ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'hongkong'];

  /** 中国短程枢纽（亚洲区域航线覆盖更广） */
  const CN_SHORTHAUL_HUBS = [
    'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing',
    'wuhan', 'xian', 'xiamen', 'tianjin', 'qingdao', 'changsha', 'kunming', 'nanning', 'haikou',
    'sanya', 'hongkong', 'macau', 'taipei', 'jinan', 'hefei', 'fuzhou', 'ningbo', 'wenzhou',
    'zhengzhou', 'shenyang', 'dalian', 'harbin', 'changchun', 'shijiazhuang', 'taiyuan', 'guiyang',
    'lanzhou', 'yinchuan', 'urumqi'
  ];

  const MAX_TIER2_TIER2_KM = 1200;
  const MAX_TIER2_TIER3_KM = 900;
  const MAX_TIER3_TIER3_KM = 350;
  const SAME_CONTINENT_KM = 3500;
  const NEAREST_COUNT = 5;
  const NEAREST_MAX_KM = 6000;

  /** 精选国际 ↔ 中国直飞清单（覆盖主要城市，其余由 R5/R6 规则补充） */
  const INTL_ROUTES = {
    tokyo: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'tianjin', 'qingdao', 'xiamen', 'dalian', 'shenyang', 'harbin', 'wuhan', 'changsha', 'xian', 'fuzhou', 'jinan', 'kunming', 'hongkong', 'taipei'],
    osaka: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'hangzhou', 'nanjing', 'tianjin', 'qingdao', 'dalian', 'shenyang', 'xiamen', 'changsha', 'wuhan', 'fuzhou', 'harbin', 'jinan', 'hongkong', 'taipei'],
    seoul: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'tianjin', 'qingdao', 'xiamen', 'dalian', 'shenyang', 'harbin', 'changchun', 'yantai', 'weihai', 'jinan', 'wuhan', 'changsha', 'xian', 'zhengzhou', 'fuzhou', 'hongkong', 'taipei'],
    bangkok: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xian', 'kunming', 'xiamen', 'fuzhou', 'nanning', 'guiyang', 'haikou', 'sanya', 'zhengzhou', 'tianjin', 'qingdao', 'jinan', 'taiyuan', 'shijiazhuang', 'hefei', 'nanchang', 'shenyang', 'harbin', 'dalian', 'hongkong', 'macau', 'taipei'],
    chiangmai: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'kunming', 'changsha', 'wuhan', 'xian', 'nanjing', 'jinghong'],
    phuket: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'kunming', 'xiamen', 'fuzhou', 'guiyang', 'nanning', 'haikou', 'hongkong'],
    singapore: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'tianjin', 'xiamen', 'fuzhou', 'kunming', 'nanning', 'haikou', 'sanya', 'wuhan', 'changsha', 'xian', 'zhengzhou', 'jinan', 'qingdao', 'nanchang', 'hefei', 'hongkong', 'macau', 'taipei'],
    kualalumpur: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xiamen', 'fuzhou', 'kunming', 'nanning', 'haikou', 'guiyang', 'zhengzhou', 'qingdao', 'hongkong', 'macau', 'taipei'],
    bali: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xiamen', 'fuzhou', 'kunming', 'hongkong', 'taipei'],
    hanoi: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'kunming', 'nanning', 'haikou', 'wuhan', 'changsha', 'xiamen', 'guiyang', 'hongkong', 'macau', 'taipei'],
    hochiminh: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'kunming', 'nanning', 'haikou', 'xiamen', 'fuzhou', 'wuhan', 'changsha', 'hongkong', 'macau', 'taipei'],
    manila: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'xiamen', 'fuzhou', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'jinan', 'hongkong', 'macau', 'taipei'],
    jakarta: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xiamen', 'fuzhou', 'nanning', 'haikou', 'kunming', 'zhengzhou', 'hongkong', 'macau', 'taipei'],
    siemreap: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'kunming', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'nanning', 'xiamen', 'fuzhou', 'tianjin', 'hongkong', 'macau', 'taipei'],
    danang: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'kunming', 'nanning', 'haikou', 'sanya', 'xiamen', 'fuzhou', 'guiyang', 'hongkong', 'macau', 'taipei'],
    nhatrang: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'kunming', 'nanning', 'xian', 'zhengzhou', 'jinan', 'tianjin', 'hongkong', 'macau', 'taipei'],
    dubai: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xian', 'kunming', 'urumqi', 'zhengzhou', 'yinchuan', 'qingdao', 'xiamen', 'hongkong', 'taipei'],
    abudhabi: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'hangzhou', 'chongqing', 'wuhan', 'xian', 'xiamen', 'nanjing', 'qingdao', 'hongkong', 'taipei'],
    doha: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'hongkong', 'xiamen', 'wuhan', 'xian', 'nanjing', 'zhengzhou', 'qingdao', 'changsha', 'taipei'],
    istanbul: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'shenzhen', 'hangzhou', 'wuhan', 'xian', 'chongqing', 'nanjing', 'xiamen', 'qingdao', 'zhengzhou', 'changsha', 'hongkong', 'taipei'],
    delhi: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'kunming', 'hongkong', 'shenzhen', 'hangzhou', 'wuhan', 'xian', 'chongqing', 'jinan', 'taipei'],
    mumbai: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'kunming', 'shenzhen', 'hangzhou', 'wuhan', 'xian', 'chongqing', 'changsha'],
    colombo: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'kunming', 'hongkong', 'chongqing', 'xian', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xiamen', 'fuzhou', 'nanning'],
    male: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'chongqing', 'kunming', 'hongkong', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xian', 'shenzhen', 'xiamen', 'fuzhou', 'nanning'],
    kathmandu: ['chengdu', 'kunming', 'guangzhou', 'beijing', 'shanghai', 'chongqing', 'xian', 'lhasa', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'taipei'],
    moscow: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'urumqi', 'harbin', 'shenyang', 'tianjin', 'qingdao', 'xiamen', 'hongkong'],
    stpetersburg: ['beijing', 'shanghai', 'chengdu', 'guangzhou', 'xian', 'chongqing', 'hongkong', 'kunming', 'shenzhen', 'hangzhou'],
    vladivostok: ['harbin', 'beijing', 'shanghai', 'changchun', 'shenyang', 'dalian', 'tianjin', 'qingdao', 'hongkong'],
    irkutsk: ['beijing', 'harbin', 'shanghai', 'shenyang', 'guangzhou', 'chengdu', 'hongkong', 'tianjin', 'xian'],
    almaty: ['urumqi', 'beijing', 'shanghai', 'guangzhou', 'chengdu', 'xian', 'hongkong', 'hangzhou', 'chongqing', 'wuhan', 'lanzhou'],
    ulaanbaatar: ['beijing', 'hohhot', 'shanghai', 'guangzhou', 'hongkong', 'tianjin', 'qingdao', 'harbin'],
    london: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xian', 'qingdao', 'xiamen', 'zhengzhou', 'hongkong', 'taipei'],
    paris: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'kunming', 'xiamen', 'qingdao', 'hongkong', 'taipei'],
    frankfurt: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'shenyang', 'qingdao', 'xiamen', 'wuhan', 'hongkong', 'taipei'],
    amsterdam: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'xiamen', 'hongkong', 'taipei'],
    munich: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'nanjing', 'hangzhou', 'wuhan', 'qingdao', 'taipei', 'xian', 'xiamen'],
    berlin: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'taipei', 'xiamen'],
    rome: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei', 'tianjin'],
    milan: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    madrid: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    barcelona: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    cairo: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    nairobi: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'changsha', 'wuhan', 'hangzhou'],
    capetown: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    casablanca: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    newyork: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'xiamen', 'fuzhou', 'wuhan', 'hongkong', 'taipei'],
    losangeles: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'xiamen', 'qingdao', 'wuhan', 'changsha', 'xian', 'shenyang', 'hongkong', 'taipei'],
    sanfrancisco: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'xiamen', 'wuhan', 'qingdao', 'hongkong', 'taipei'],
    seattle: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'xiamen', 'hongkong', 'taipei'],
    chicago: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei', 'tianjin'],
    boston: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    lasvegas: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    washington: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    miami: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    vancouver: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'xiamen', 'qingdao', 'zhengzhou', 'shenyang', 'hongkong', 'taipei'],
    toronto: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei', 'tianjin'],
    montreal: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    mexicocity: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    cancun: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    saopaulo: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    rio: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    buenosaires: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    lima: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    sydney: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'xiamen', 'fuzhou', 'wuhan', 'changsha', 'kunming', 'qingdao', 'hongkong', 'taipei'],
    melbourne: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'xiamen', 'hongkong', 'taipei'],
    brisbane: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    perth: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    queenstown: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    nadi: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    guam: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'xiamen', 'taipei'],
    honolulu: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'hangzhou', 'nanjing', 'xiamen', 'hongkong', 'taipei'],
    edinburgh: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    brussels: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    zurich: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    geneva: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    vienna: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    prague: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    budapest: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    venice: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    lisbon: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    athens: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    stockholm: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    copenhagen: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    oslo: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    helsinki: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei', 'xiamen'],
    reykjavik: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    dublin: ['beijing', 'shanghai', 'guangzhou', 'chengdu', 'hongkong', 'shenzhen', 'hangzhou', 'nanjing', 'wuhan', 'xian', 'chongqing', 'taipei'],
    sapporo: ['beijing', 'shanghai', 'tianjin', 'nanjing', 'dalian', 'qingdao', 'hongkong', 'taipei', 'harbin'],
    fukuoka: ['beijing', 'shanghai', 'dalian', 'qingdao', 'tianjin', 'nanjing', 'hangzhou', 'hongkong', 'taipei', 'shenzhen', 'xiamen'],
    nagoya: ['beijing', 'shanghai', 'tianjin', 'nanjing', 'guangzhou', 'dalian', 'qingdao', 'shenyang', 'hongkong', 'taipei'],
    okinawa: ['beijing', 'shanghai', 'tianjin', 'hangzhou', 'nanjing', 'xiamen', 'chengdu', 'shenzhen', 'guangzhou', 'qingdao', 'hongkong', 'taipei'],
    busan: ['beijing', 'shanghai', 'qingdao', 'dalian', 'shenyang', 'guangzhou', 'shenzhen', 'nanjing', 'hangzhou', 'tianjin', 'hongkong', 'taipei'],
    jeju: ['beijing', 'shanghai', 'tianjin', 'nanjing', 'hangzhou', 'guangzhou', 'shenzhen', 'chengdu', 'qingdao', 'dalian', 'shenyang', 'harbin', 'xiamen', 'xian', 'wuhan', 'changsha', 'zhengzhou', 'jinan', 'hongkong', 'taipei'],
    hongkong: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xian', 'kunming', 'zhengzhou', 'tianjin', 'qingdao', 'xiamen', 'fuzhou', 'ningbo', 'wenzhou', 'yantai', 'weihai', 'jinan', 'hefei', 'nanchang', 'taiyuan', 'shijiazhuang', 'hohhot', 'lanzhou', 'xining', 'yinchuan', 'nanning', 'guilin', 'guiyang', 'haikou', 'sanya', 'lhasa', 'urumqi', 'harbin', 'changchun', 'shenyang', 'dalian', 'zhuhai', 'shantou', 'beihai', 'zhangjiajie', 'lijiang', 'jinghong', 'huangshan', 'yichang', 'luoyang', 'baotou', 'macau', 'taipei', 'tokyo', 'osaka', 'seoul', 'busan', 'jeju', 'sapporo', 'fukuoka', 'nagoya', 'okinawa', 'singapore', 'bangkok', 'chiangmai', 'phuket', 'kualalumpur', 'bali', 'jakarta', 'manila', 'hanoi', 'hochiminh', 'danang', 'nhatrang', 'siemreap', 'ulaanbaatar', 'dubai', 'doha', 'delhi', 'mumbai', 'colombo', 'male', 'kathmandu', 'sydney', 'melbourne', 'brisbane', 'perth', 'auckland', 'guam', 'honolulu', 'vancouver', 'toronto', 'newyork', 'losangeles', 'sanfrancisco', 'seattle', 'chicago', 'boston', 'lasvegas', 'washington', 'miami', 'london', 'paris', 'frankfurt', 'amsterdam', 'munich', 'berlin', 'rome', 'milan', 'madrid', 'barcelona', 'zurich', 'vienna', 'prague', 'moscow', 'istanbul', 'cairo', 'nairobi', 'capetown', 'casablanca', 'reykjavik', 'dublin', 'helsinki', 'stockholm', 'copenhagen', 'oslo', 'lisbon', 'athens', 'edinburgh', 'brussels', 'geneva', 'budapest', 'venice', 'stpetersburg'],
    taipei: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xian', 'kunming', 'xiamen', 'fuzhou', 'zhengzhou', 'tianjin', 'qingdao', 'jinan', 'hefei', 'nanchang', 'nanning', 'haikou', 'sanya', 'shenyang', 'harbin', 'dalian', 'changchun', 'yantai', 'weihai', 'ningbo', 'wenzhou', 'shijiazhuang', 'taiyuan', 'guiyang', 'lanzhou', 'yinchuan', 'urumqi', 'hongkong', 'macau', 'tokyo', 'osaka', 'sapporo', 'fukuoka', 'nagoya', 'okinawa', 'seoul', 'busan', 'jeju', 'bangkok', 'chiangmai', 'phuket', 'singapore', 'kualalumpur', 'bali', 'jakarta', 'manila', 'hanoi', 'hochiminh', 'danang', 'nhatrang', 'siemreap', 'dubai', 'doha', 'delhi', 'mumbai', 'colombo', 'male', 'sydney', 'melbourne', 'brisbane', 'auckland', 'guam', 'vancouver', 'toronto', 'newyork', 'losangeles', 'sanfrancisco', 'seattle', 'london', 'paris', 'frankfurt', 'amsterdam', 'munich', 'berlin', 'rome', 'milan', 'madrid', 'barcelona', 'vienna', 'prague', 'istanbul', 'moscow', 'helsinki', 'reykjavik', 'dublin', 'stockholm', 'copenhagen', 'oslo', 'lisbon', 'athens', 'edinburgh', 'brussels', 'geneva', 'budapest', 'venice', 'stpetersburg'],
    macau: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'chongqing', 'hangzhou', 'nanjing', 'wuhan', 'changsha', 'xiamen', 'fuzhou', 'kunming', 'nanning', 'haikou', 'sanya', 'zhengzhou', 'tianjin', 'qingdao', 'jinan', 'shenyang', 'harbin', 'hongkong', 'taipei', 'bangkok', 'chiangmai', 'phuket', 'singapore', 'kualalumpur', 'bali', 'hanoi', 'hochiminh', 'danang', 'nhatrang', 'seoul', 'busan', 'jeju', 'tokyo', 'osaka', 'manila', 'jakarta', 'siemreap', 'dubai', 'delhi', 'colombo', 'male', 'sydney', 'melbourne', 'auckland']
  };

  /** 补充规则覆盖不到的著名航线 */
  const EXTRA_ROUTES = [
    ['harbin', 'qingdao'], ['harbin', 'jinan'], ['harbin', 'wuhan'], ['harbin', 'xian'], ['harbin', 'sanya'],
    ['changchun', 'jinan'], ['changchun', 'shenzhen'], ['changchun', 'sanya'], ['shenyang', 'nanjing'],
    ['shenyang', 'sanya'], ['dalian', 'xiamen'], ['dalian', 'kunming'], ['dalian', 'sanya'], ['jinan', 'sanya'],
    ['taiyuan', 'sanya'], ['shijiazhuang', 'sanya'], ['yantai', 'shenzhen'], ['weihai', 'shenzhen'],
    ['lanzhou', 'sanya'], ['yinchuan', 'sanya'], ['jiuzhaigou', 'chongqing'], ['jiuzhaigou', 'xian'],
    ['dunhuang', 'lanzhou'], ['kashi', 'urumqi'], ['beihai', 'chengdu'],
    // 国际长航线与海岛接驳
    ['almaty', 'urumqi'], ['ulaanbaatar', 'hohhot'], ['vladivostok', 'harbin'], ['irkutsk', 'harbin'],
    ['kathmandu', 'lhasa'], ['guam', 'tokyo'], ['guam', 'seoul'], ['guam', 'manila'], ['guam', 'honolulu'],
    ['honolulu', 'losangeles'], ['honolulu', 'sanfrancisco'], ['nadi', 'auckland'], ['nadi', 'sydney'],
    ['nadi', 'losangeles'], ['nadi', 'melbourne'], ['nadi', 'brisbane'], ['queenstown', 'sydney'],
    ['queenstown', 'melbourne'], ['queenstown', 'brisbane'], ['perth', 'singapore'], ['brisbane', 'auckland'],
    ['male', 'colombo'], ['male', 'dubai'], ['male', 'doha'], ['male', 'singapore'], ['male', 'bangkok'],
    ['cairo', 'dubai'], ['cairo', 'istanbul'], ['cairo', 'doha'], ['cairo', 'athens'],
    ['nairobi', 'dubai'], ['nairobi', 'doha'], ['nairobi', 'istanbul'], ['nairobi', 'cairo'],
    ['capetown', 'dubai'], ['capetown', 'doha'], ['capetown', 'saopaulo'],
    ['casablanca', 'istanbul'], ['casablanca', 'paris'], ['casablanca', 'madrid'], ['casablanca', 'dubai'],
    ['lima', 'mexicocity'], ['lima', 'cancun'], ['lima', 'rio'], ['lima', 'saopaulo'],
    ['buenosaires', 'mexicocity'], ['buenosaires', 'lima'], ['buenosaires', 'rio'], ['buenosaires', 'saopaulo'],
    ['saopaulo', 'mexicocity'], ['saopaulo', 'rio'], ['rio', 'miami'], ['saopaulo', 'miami'],
    ['cancun', 'miami'], ['mexicocity', 'losangeles'], ['mexicocity', 'madrid'], ['mexicocity', 'lima'],
    ['reykjavik', 'newyork'], ['reykjavik', 'boston'], ['reykjavik', 'copenhagen'], ['reykjavik', 'london'],
    ['edinburgh', 'london'], ['edinburgh', 'dublin'], ['brussels', 'london'], ['geneva', 'london'],
    ['zurich', 'london'], ['vienna', 'london'], ['prague', 'london'], ['budapest', 'london'],
    ['venice', 'london'], ['lisbon', 'london'], ['athens', 'london'], ['stockholm', 'london'],
    ['copenhagen', 'london'], ['oslo', 'london'], ['helsinki', 'london'], ['stpetersburg', 'helsinki'],
    ['stpetersburg', 'istanbul'], ['moscow', 'stpetersburg'], ['moscow', 'istanbul'], ['moscow', 'dubai']
  ];

  function hasDirectDomesticRoute(a, b) {
    if (!a || !b || a.id === b.id) return false;
    if (a.isIntl || b.isIntl) return false;
    if (a.tier === 1 && b.tier === 1) return true;
    if (a.tier === 1 || b.tier === 1) return true;
    const dist = distanceKm(a, b);
    if (a.tier === 2 && b.tier === 2) return a.region === b.region || dist <= MAX_TIER2_TIER2_KM;
    if (a.tier === 3 && b.tier === 3) return dist <= MAX_TIER3_TIER3_KM;
    return a.region === b.region && dist <= MAX_TIER2_TIER3_KM;
  }

  let cachedGraph = null;

  function buildGraph() {
    if (cachedGraph) return cachedGraph;
    const graph = {};
    CITIES.forEach((city) => {
      graph[city.id] = [];
    });
    const addEdge = (fromId, toId) => {
      if (!fromId || !toId || fromId === toId) return;
      if (!byId[fromId] || !byId[toId]) return;
      if (graph[fromId].indexOf(toId) === -1) graph[fromId].push(toId);
      if (graph[toId].indexOf(fromId) === -1) graph[toId].push(fromId);
    };

    const domestic = CITIES.filter((c) => !c.isIntl);
    const intl = CITIES.filter((c) => c.isIntl);
    const hubSet = {};
    GLOBAL_HUBS.forEach((id) => {
      hubSet[id] = true;
    });

    // R1 中国国内
    for (let i = 0; i < domestic.length; i += 1) {
      for (let j = i + 1; j < domestic.length; j += 1) {
        if (hasDirectDomesticRoute(domestic[i], domestic[j])) addEdge(domestic[i].id, domestic[j].id);
      }
    }

    // R2 全球枢纽互通
    for (let i = 0; i < GLOBAL_HUBS.length; i += 1) {
      for (let j = i + 1; j < GLOBAL_HUBS.length; j += 1) {
        addEdge(GLOBAL_HUBS[i], GLOBAL_HUBS[j]);
      }
    }

    // R3 / R4 国际城市之间的区域网络
    for (let i = 0; i < intl.length; i += 1) {
      for (let j = i + 1; j < intl.length; j += 1) {
        const a = intl[i];
        const b = intl[j];
        if (hubSet[a.id] && hubSet[b.id]) continue; // 已由 R2 处理
        if (a.region === b.region) {
          addEdge(a.id, b.id);
          continue;
        }
        if (a.continent === b.continent && distanceKm(a, b) <= SAME_CONTINENT_KM) {
          addEdge(a.id, b.id);
        }
      }
    }

    // R5 每座城市连接最近的若干城市，保证网络连通
    CITIES.forEach((city) => {
      const nearest = CITIES.filter((other) => other.id !== city.id)
        .map((other) => ({ id: other.id, km: distanceKm(city, other) }))
        .filter((item) => item.km <= NEAREST_MAX_KM)
        .sort((a, b) => a.km - b.km)
        .slice(0, NEAREST_COUNT);
      nearest.forEach((item) => addEdge(city.id, item.id));
    });

    // R6 国际城市 ↔ 中国城市
    intl.forEach((city) => {
      const curated = INTL_ROUTES[city.id];
      if (curated) {
        curated.forEach((cnId) => addEdge(city.id, cnId));
        return;
      }
      const pool = city.continent === '亚洲' ? CN_SHORTHAUL_HUBS : CN_LONGHAUL_HUBS;
      pool.forEach((cnId) => addEdge(city.id, cnId));
    });

    // R7 补充航线
    EXTRA_ROUTES.forEach((pair) => addEdge(pair[0], pair[1]));

    cachedGraph = graph;
    return graph;
  }

  function getDirectDestinationIds(cityId) {
    const graph = buildGraph();
    return (graph[cityId] || []).slice();
  }

  function hasDirectFlight(aId, bId) {
    return getDirectDestinationIds(aId).indexOf(bId) > -1;
  }

  global.FE_ROUTES = {
    distanceKm: distanceKm,
    GLOBAL_HUBS: GLOBAL_HUBS,
    CN_LONGHAUL_HUBS: CN_LONGHAUL_HUBS,
    CN_SHORTHAUL_HUBS: CN_SHORTHAUL_HUBS,
    INTL_ROUTES: INTL_ROUTES,
    EXTRA_ROUTES: EXTRA_ROUTES,
    buildGraph: buildGraph,
    getDirectDestinationIds: getDirectDestinationIds,
    hasDirectFlight: hasDirectFlight
  };
})(window);

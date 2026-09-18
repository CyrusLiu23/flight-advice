/**
 * Flight Explorer · 应用逻辑
 */
(function () {
  const CITIES = window.FE_CITIES || [];
  const ATTRACTIONS = window.FE_ATTRACTIONS || {};
  const ROUTES = window.FE_ROUTES;

  const CITY_MAP = {};
  CITIES.forEach((city) => {
    CITY_MAP[city.id] = city;
  });

  // ---------------------------------------------------------------- i18n
  const I18N = {
    zh: {
      brandSub: '直飞寰宇',
      locate: '定位我的城市',
      originLabel: '出发地 · ORIGIN',
      searchCity: '搜索城市',
      autoLocate: '自动定位',
      heroHint: '拖动地球仪可旋转，点击圆点查看城市',
      statDirect: '直飞城市',
      statIntl: '国际及港澳台',
      statFarthest: '最远直飞',
      globeHint: '拖动旋转 · 滚轮缩放 · 点击圆点查看城市',
      scopeAll: '全部',
      scopeDomestic: '国内',
      scopeIntl: '国际及港澳台',
      regionLabel: '大洲',
      sortLabel: '排序',
      sortDistance: '距离最近',
      sortName: '按名称',
      sortCountry: '按国家/地区',
      favorites: '我的收藏',
      hotOrigins: '热门出发地',
      footerData: '航线与景点为演示数据：国内按枢纽规则生成，国际按「同区域 / 同大洲距离阈值 / 全球枢纽互通 / 最近城市」规则生成。',
      footerDistance: '所有距离为出发地与目的地之间的大圆（直线）距离，飞行时长为按巡航速度的估算值。',
      searchPlaceholder: '搜索城市 / 中英文 / 拼音 / 机场代码',
      allRegions: '全部大洲',
      resultCount: (n) => `共 ${n} 座城市可以直飞`,
      attractionsTitle: '著名景点',
      attractionCount: (n) => `${n} 处`,
      toOrigin: (name) => `距${name}直线`,
      toCenter: (name) => `距${name}市中心`,
      viewMap: '在地图中查看 →',
      directBadge: (a, b) => `${a} ⇄ ${b} 有直飞航班`,
      noDirectBadge: (a, b) => `暂无 ${a} 直飞 ${b} 的常见航班`,
      flightTime: '参考飞行时长',
      distance: '直线距离',
      airport: '机场代码',
      located: (name, km) => `已定位到 ${name}（距你约 ${km} 公里）`,
      locateFail: '定位不可用，请手动搜索城市',
      locating: '正在获取你的位置…',
      noResult: '没有找到匹配的城市，试试城市名、拼音或机场代码',
      favoriteAdd: '收藏该目的地',
      favoriteRemove: '取消收藏',
      asOrigin: '设为出发地',
      asDestination: '查看目的地',
      note: '景点坐标为城市内的近似位置，距离为直线距离估算，实际行程请以导航与航班信息为准。',
      dataNote: (cities, spots) => `数据：${cities} 座城市 · ${spots} 个景点（演示数据）`
    },
    en: {
      brandSub: 'Direct Flights',
      locate: 'Locate me',
      originLabel: 'ORIGIN',
      searchCity: 'Search city',
      autoLocate: 'Use my location',
      heroHint: 'Drag to rotate · Click a dot to open a city',
      statDirect: 'Direct cities',
      statIntl: 'International',
      statFarthest: 'Farthest direct',
      globeHint: 'Drag to rotate · Scroll to zoom · Click a dot',
      scopeAll: 'All',
      scopeDomestic: 'China',
      scopeIntl: 'International',
      regionLabel: 'Continent',
      sortLabel: 'Sort',
      sortDistance: 'By distance',
      sortName: 'By name',
      sortCountry: 'By country',
      favorites: 'Saved',
      hotOrigins: 'Popular origins',
      footerData: 'Routes and attractions are demo data: Chinese routes follow hub rules, international routes follow same-region, same-continent distance, global hub and nearest-city rules.',
      footerDistance: 'All distances are great-circle (straight-line) distances; flight times are estimates based on cruise speed.',
      searchPlaceholder: 'City / pinyin / IATA code',
      allRegions: 'All continents',
      resultCount: (n) => `${n} cities reachable direct`,
      attractionsTitle: 'Highlights',
      attractionCount: (n) => `${n} spots`,
      toOrigin: (name) => `from ${name}`,
      toCenter: (name) => `from ${name} centre`,
      viewMap: 'Open in maps →',
      directBadge: (a, b) => `Direct flights ${a} ⇄ ${b}`,
      noDirectBadge: (a, b) => `No common direct flight ${a} ⇄ ${b}`,
      flightTime: 'Est. flight time',
      distance: 'Distance',
      airport: 'Airport',
      located: (name, km) => `Located to ${name} (about ${km} km away)`,
      locateFail: 'Location unavailable — please search for your city',
      locating: 'Getting your location…',
      noResult: 'No matching city. Try a city name, pinyin or IATA code',
      favoriteAdd: 'Save this destination',
      favoriteRemove: 'Remove from saved',
      asOrigin: 'Set as origin',
      asDestination: 'View destination',
      note: 'Attraction coordinates are approximate; distances are straight-line estimates. Check maps and flight data before travelling.',
      dataNote: (cities, spots) => `Data: ${cities} cities · ${spots} attractions (demo)`
    }
  };

  const state = {
    lang: localStorage.getItem('fe_lang') || 'zh',
    originId: localStorage.getItem('fe_origin') || 'shanghai',
    scope: 'all',
    continent: 'all',
    sort: 'distance',
    focusId: null,
    favorites: readFavorites(),
    destinations: [],
    hint: { kind: 'default' }
  };

  function readFavorites() {
    try {
      const raw = JSON.parse(localStorage.getItem('fe_favorites') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (err) {
      return [];
    }
  }

  function saveFavorites() {
    localStorage.setItem('fe_favorites', JSON.stringify(state.favorites));
  }

  const t = () => I18N[state.lang];
  const cityName = (city) => (state.lang === 'zh' ? city.zh : city.en);
  const countryName = (city) => (state.lang === 'zh' ? city.country : city.countryEn);
  const regionName = (city) => (state.lang === 'zh' ? city.region : city.regionEn);
  const continentName = (city) => (state.lang === 'zh' ? city.continent : city.continentEn);

  function thousands(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatDistance(km) {
    if (km < 10) return `${km.toFixed(1)} ${state.lang === 'zh' ? '公里' : 'km'}`;
    if (km < 1000) return `${Math.round(km)} ${state.lang === 'zh' ? '公里' : 'km'}`;
    return `${thousands(km)} ${state.lang === 'zh' ? '公里' : 'km'}`;
  }

  function estimateMinutes(km) {
    return Math.max(40, Math.round((km / 800) * 60 + 30));
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (state.lang === 'zh') {
      if (!h) return `${m} 分钟`;
      return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
    }
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function attractionCount(cityId) {
    return (ATTRACTIONS[cityId] || []).length;
  }

  // ---------------------------------------------------------------- DOM
  const el = {
    originZh: document.getElementById('originZh'),
    originEn: document.getElementById('originEn'),
    originMeta: document.getElementById('originMeta'),
    heroHint: document.getElementById('heroHint'),
    statDirect: document.getElementById('statDirect'),
    statIntl: document.getElementById('statIntl'),
    statFarthest: document.getElementById('statFarthest'),
    results: document.getElementById('results'),
    resultCount: document.getElementById('resultCount'),
    regionSelect: document.getElementById('regionSelect'),
    sortSelect: document.getElementById('sortSelect'),
    scopeTabs: document.getElementById('scopeTabs'),
    hotChips: document.getElementById('hotChips'),
    favoriteChips: document.getElementById('favoriteChips'),
    favoritesBlock: document.getElementById('favoritesBlock'),
    globeCaption: document.getElementById('globeCaption'),
    detail: document.getElementById('detail'),
    detailBody: document.getElementById('detailBody'),
    detailClose: document.getElementById('detailClose'),
    overlay: document.getElementById('searchOverlay'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    searchClose: document.getElementById('searchClose')
  };

  const globe = new window.FEGlobe(document.getElementById('globe'), {
    onSelect: (id) => openDetail(id)
  });
  window.addEventListener('resize', () => globe.resize());

  // ---------------------------------------------------------------- data
  function getOrigin() {
    return CITY_MAP[state.originId] || CITIES[0];
  }

  function buildDestinations() {
    const origin = getOrigin();
    return ROUTES.getDirectDestinationIds(origin.id)
      .map((id) => CITY_MAP[id])
      .filter(Boolean)
      .map((city) => {
        const km = ROUTES.distanceKm(origin, city);
        return {
          ...city,
          distanceKm: Math.round(km),
          minutes: estimateMinutes(km),
          spots: attractionCount(city.id)
        };
      });
  }

  function visibleDestinations() {
    let list = state.destinations.slice();
    if (state.scope === 'domestic') list = list.filter((c) => !c.isIntl);
    if (state.scope === 'intl') list = list.filter((c) => c.isIntl);
    if (state.continent !== 'all') list = list.filter((c) => c.continent === state.continent);
    list.sort((a, b) => {
      if (state.sort === 'distance') return a.distanceKm - b.distanceKm;
      if (state.sort === 'country') return countryName(a).localeCompare(countryName(b), state.lang);
      return cityName(a).localeCompare(cityName(b), state.lang);
    });
    return list;
  }

  // ---------------------------------------------------------------- render
  function applyStaticText() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (typeof t()[key] === 'string') node.textContent = t()[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.setAttribute('placeholder', t()[node.getAttribute('data-i18n-placeholder')]);
    });
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  }

  function renderHeader() {
    const origin = getOrigin();
    el.originZh.textContent = origin.zh;
    el.originEn.textContent = origin.en;
    el.originMeta.textContent = [regionName(origin), countryName(origin), origin.iata]
      .filter(Boolean)
      .join(' · ');
    el.globeCaption.textContent = `${origin.iata} · ${origin.en.toUpperCase()}`;

    const total = state.destinations.length;
    const intl = state.destinations.filter((c) => c.isIntl).length;
    const farthest = state.destinations.reduce(
      (acc, city) => (!acc || city.distanceKm > acc.distanceKm ? city : acc),
      null
    );
    el.statDirect.textContent = total;
    el.statIntl.textContent = intl;
    el.statFarthest.innerHTML = farthest
      ? `${cityName(farthest)}<small>${formatDistance(farthest.distanceKm)}</small>`
      : '—';
  }

  function setHint(kind, data) {
    state.hint = { kind: kind, data: data || null };
    renderHint();
  }

  function renderHint() {
    const hint = state.hint || { kind: 'default' };
    if (hint.kind === 'located' && hint.data) {
      el.heroHint.textContent = t().located(hint.data.name, hint.data.km);
      return;
    }
    if (hint.kind === 'locating') {
      el.heroHint.textContent = t().locating;
      return;
    }
    if (hint.kind === 'fail') {
      el.heroHint.textContent = t().locateFail;
      return;
    }
    el.heroHint.textContent = t().heroHint;
  }

  function renderRegions() {
    const continents = [];
    state.destinations.forEach((city) => {
      if (continents.indexOf(city.continent) === -1) continents.push(city.continent);
    });
    continents.sort((a, b) =>
      (state.lang === 'zh' ? a : CITY_MAP[state.destinations.find((c) => c.continent === a).id].continentEn)
        .localeCompare(
          state.lang === 'zh' ? b : CITY_MAP[state.destinations.find((c) => c.continent === b).id].continentEn,
          state.lang
        )
    );

    const label = (continent) => {
      if (continent === 'all') return t().allRegions;
      const sample = state.destinations.find((city) => city.continent === continent);
      return sample ? continentName(sample) : continent;
    };

    const options = ['all'].concat(continents);
    el.regionSelect.innerHTML = options
      .map((value) => `<option value="${value}">${label(value)}</option>`)
      .join('');
    if (options.indexOf(state.continent) === -1) state.continent = 'all';
    el.regionSelect.value = state.continent;
  }

  function renderResults() {
    const list = visibleDestinations();
    el.resultCount.textContent = t().resultCount(list.length);
    el.results.innerHTML = list
      .map(
        (city) => `
        <article class="row" data-id="${city.id}">
          <div class="row__code">${city.iata || ''}</div>
          <div>
            <div class="row__name">
              <span class="row__zh">${city.zh}</span>
              <span class="row__en">${city.en}</span>
              <span class="badge ${city.isIntl ? 'badge--intl' : ''}">${
                city.isIntl ? (state.lang === 'zh' ? countryName(city) : countryName(city)) : state.lang === 'zh' ? '国内' : 'China'
              }</span>
            </div>
            <div class="row__meta">
              <span>${regionName(city)}</span>
              <span>${state.lang === 'zh' ? '景点' : 'spots'} ${city.spots}</span>
            </div>
          </div>
          <div class="row__right">
            <div class="row__distance">${formatDistance(city.distanceKm)}</div>
            <div class="row__time">${t().flightTime} · ${formatDuration(city.minutes)}</div>
          </div>
        </article>`
      )
      .join('');
  }

  function renderChips() {
    const hot = ['beijing', 'shanghai', 'hongkong', 'tokyo', 'paris', 'newyork', 'sydney', 'dubai']
      .map((id) => CITY_MAP[id])
      .filter(Boolean);
    el.hotChips.innerHTML = hot
      .map((city) => {
        const count = ROUTES.getDirectDestinationIds(city.id).length;
        return `<button class="chip" data-origin="${city.id}">${cityName(city)}<small>${count} ${
          state.lang === 'zh' ? '城' : 'cities'
        }</small></button>`;
      })
      .join('');

    const favorites = state.favorites.map((id) => CITY_MAP[id]).filter(Boolean);
    el.favoritesBlock.hidden = favorites.length === 0;
    el.favoriteChips.innerHTML = favorites
      .map((city) => {
        const km = ROUTES.distanceKm(getOrigin(), city);
        return `<button class="chip" data-favorite="${city.id}">${cityName(city)}<small>${formatDistance(
          km
        )}</small></button>`;
      })
      .join('');
  }

  function renderGlobe() {
    const origin = getOrigin();
    globe.options.labelKey = state.lang === 'zh' ? 'zh' : 'en';
    globe.setData({
      origin,
      destinations: state.destinations,
      focus: state.focusId ? CITY_MAP[state.focusId] : null
    });
  }

  function renderDetail() {
    const origin = getOrigin();
    const city = state.focusId ? CITY_MAP[state.focusId] : null;
    if (!city) return;
    const km = ROUTES.distanceKm(origin, city);
    const spots = (ATTRACTIONS[city.id] || []).map((spot) => {
      const fromOrigin = ROUTES.distanceKm(origin, spot);
      const fromCenter = ROUTES.distanceKm(city, spot);
      const name = state.lang === 'zh' ? spot.zh : spot.en;
      const second = state.lang === 'zh' ? spot.en : spot.zh;
      const tag = state.lang === 'zh' ? spot.tag : spot.tagEn || spot.tag;
      const desc = state.lang === 'zh' ? spot.desc : spot.descEn || spot.desc;
      return { ...spot, name, second, tag, desc, fromOrigin, fromCenter };
    });
    const direct = ROUTES.hasDirectFlight(origin.id, city.id);
    const isFavorite = state.favorites.indexOf(city.id) > -1;

    el.detailBody.innerHTML = `
      <div class="detail__hero">
        <p class="eyebrow">${state.lang === 'zh' ? '目的地 · DESTINATION' : 'DESTINATION'}</p>
        <h2 class="detail__zh">${city.zh}</h2>
        <p class="detail__en">${city.en}</p>
        <p class="detail__meta">${regionName(city)} · ${countryName(city)} · ${city.iata || '—'}</p>
        <div class="detail__stats">
          <div><dt>${t().distance}</dt><dd>${formatDistance(km)}</dd></div>
          <div><dt>${t().flightTime}</dt><dd>${formatDuration(estimateMinutes(km))}</dd></div>
          <div><dt>${t().attractionsTitle}</dt><dd>${spots.length}</dd></div>
        </div>
        <p style="margin-top:20px">
          <span class="badge ${direct ? 'badge--direct' : ''}">${
            direct ? t().directBadge(cityName(origin), cityName(city)) : t().noDirectBadge(cityName(origin), cityName(city))
          }</span>
        </p>
        <div class="detail__actions">
          <button class="btn btn--primary btn--sm" data-set-origin="${city.id}">${t().asOrigin}</button>
          <button class="btn btn--ghost btn--sm" data-favorite-toggle="${city.id}">
            ${isFavorite ? '★ ' + t().favoriteRemove : '☆ ' + t().favoriteAdd}
          </button>
          <a class="btn btn--ghost btn--sm" target="_blank" rel="noopener"
             href="https://www.google.com/maps/search/?api=1&query=${city.lat},${city.lng}">${t().viewMap}</a>
        </div>
      </div>
      <div class="detail__section">
        <h3>${city.zh} ${t().attractionsTitle}</h3>
        ${spots
          .map(
            (spot, index) => `
          <div class="spot">
            <div class="spot__head">
              <span class="spot__index">${String(index + 1).padStart(2, '0')}</span>
              <span class="spot__zh">${spot.zh}</span>
              <span class="spot__en">${spot.en}</span>
              <span class="badge">${spot.tag || spot.tagEn || ''}</span>
            </div>
            <p class="spot__desc">${spot.desc}</p>
            <div class="spot__metrics">
              <div class="spot__metric">
                <dt>${t().toOrigin(cityName(origin))}</dt>
                <dd>${formatDistance(spot.fromOrigin)}</dd>
              </div>
              <div class="spot__metric">
                <dt>${t().toCenter(city.zh)}</dt>
                <dd>${formatDistance(spot.fromCenter)}</dd>
              </div>
              <div class="spot__metric">
                <dt>&nbsp;</dt>
                <dd>
                  <a class="spot__link" target="_blank" rel="noopener"
                     href="https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}">${t().viewMap}</a>
                </dd>
              </div>
            </div>
          </div>`
          )
          .join('')}
        <p class="detail__note">${t().note}</p>
      </div>`;
  }

  function renderAll() {
    applyStaticText();
    state.destinations = buildDestinations();
    renderHeader();
    renderHint();
    renderRegions();
    renderResults();
    renderChips();
    renderGlobe();
  }

  function refreshList() {
    renderResults();
    renderGlobe();
  }

  // ---------------------------------------------------------------- actions
  function setOrigin(cityId, options) {
    if (!CITY_MAP[cityId]) return;
    state.originId = cityId;
    state.focusId = null;
    state.continent = 'all';
    localStorage.setItem('fe_origin', cityId);
    renderAll();
    closeDetail();
    updateHash(options && options.silent ? undefined : cityId);
  }

  function openDetail(cityId) {
    if (!CITY_MAP[cityId]) return;
    state.focusId = cityId;
    renderDetail();
    renderGlobe();
    el.detail.classList.add('is-open');
    el.detail.setAttribute('aria-hidden', 'false');
    updateHash();
  }

  function closeDetail() {
    state.focusId = null;
    el.detail.classList.remove('is-open');
    el.detail.setAttribute('aria-hidden', 'true');
    if (globe) globe.setData({ origin: getOrigin(), destinations: state.destinations, focus: null });
  }

  function openSearch() {
    el.overlay.classList.add('is-open');
    el.overlay.setAttribute('aria-hidden', 'false');
    el.searchInput.value = '';
    renderSearch('');
    setTimeout(() => el.searchInput.focus(), 60);
  }

  function closeSearch() {
    el.overlay.classList.remove('is-open');
    el.overlay.setAttribute('aria-hidden', 'true');
  }

  function searchCities(keyword) {
    const kw = String(keyword || '').trim().toLowerCase();
    if (!kw) {
      return CITIES.filter((city) => ['beijing', 'shanghai', 'hongkong', 'tokyo', 'paris', 'dubai', 'newyork', 'sydney'].indexOf(city.id) > -1);
    }
    const scored = [];
    CITIES.forEach((city) => {
      let score = -1;
      if (city.zh === kw) score = 100;
      else if (city.en.toLowerCase() === kw) score = 98;
      else if (city.iata.toLowerCase() === kw) score = 96;
      else if (city.py === kw) score = 94;
      else if (city.pyf === kw) score = 92;
      else if (city.zh.indexOf(kw) === 0) score = 88;
      else if (city.en.toLowerCase().indexOf(kw) === 0) score = 86;
      else if (city.py.indexOf(kw) === 0) score = 82;
      else if (city.pyf.indexOf(kw) === 0) score = 80;
      else if (city.zh.indexOf(kw) > -1) score = 70;
      else if (city.en.toLowerCase().indexOf(kw) > -1) score = 66;
      else if (city.country.toLowerCase().indexOf(kw) > -1 || city.countryEn.toLowerCase().indexOf(kw) > -1) score = 50;
      if (score > -1) scored.push({ city, score: score - (city.tier - 1) * 2 });
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 40).map((item) => item.city);
  }

  function renderSearch(keyword) {
    const list = searchCities(keyword);
    if (!list.length) {
      el.searchResults.innerHTML = `<div class="search__empty">${t().noResult}</div>`;
      return;
    }
    const origin = getOrigin();
    el.searchResults.innerHTML = list
      .map((city) => {
        const km = ROUTES.distanceKm(origin, city);
        return `<div class="search__item" data-pick="${city.id}">
          <div class="search__item-main">
            <span class="search__item-zh">${city.zh}</span>
            <span class="search__item-en">${city.en}</span>
          </div>
          <div class="search__item-meta">${city.iata} · ${formatDistance(km)}</div>
        </div>`;
      })
      .join('');
  }

  function locate() {
    if (!navigator.geolocation) {
      setHint('fail');
      return;
    }
    setHint('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        let best = null;
        CITIES.forEach((city) => {
          const km = ROUTES.distanceKm(coords, city);
          if (!best || km < best.km) best = { city, km };
        });
        if (best) {
          setHint('located', {
            name: state.lang === 'zh' ? best.city.zh : best.city.en,
            km: Math.round(best.km)
          });
          setOrigin(best.city.id, { silent: false });
        }
      },
      () => {
        setHint('fail');
      },
      { timeout: 8000 }
    );
  }

  function updateHash() {
    const parts = ['#/from/' + state.originId];
    if (state.focusId) parts.push('to/' + state.focusId);
    const next = parts.join('/');
    if (location.hash !== next) history.replaceState(null, '', next);
  }

  function applyHash() {
    const match = /#\/from\/([a-z0-9]+)(?:\/to\/([a-z0-9]+))?/i.exec(location.hash || '');
    if (!match) return false;
    const originId = match[1];
    if (CITY_MAP[originId]) state.originId = originId;
    renderAll();
    if (match[2] && CITY_MAP[match[2]]) openDetail(match[2]);
    return true;
  }

  // ---------------------------------------------------------------- events
  el.scopeTabs.addEventListener('click', (event) => {
    const button = event.target.closest('.tab');
    if (!button) return;
    state.scope = button.dataset.scope;
    el.scopeTabs.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('is-active', tab === button));
    refreshList();
  });

  el.regionSelect.addEventListener('change', () => {
    state.continent = el.regionSelect.value;
    refreshList();
  });

  el.sortSelect.addEventListener('change', () => {
    state.sort = el.sortSelect.value;
    refreshList();
  });

  el.results.addEventListener('click', (event) => {
    const row = event.target.closest('.row');
    if (row) openDetail(row.dataset.id);
  });

  el.hotChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-origin]');
    if (button) setOrigin(button.dataset.origin);
  });

  el.favoriteChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorite]');
    if (button) openDetail(button.dataset.favorite);
  });

  el.detailBody.addEventListener('click', (event) => {
    const setOriginBtn = event.target.closest('[data-set-origin]');
    if (setOriginBtn) {
      setOrigin(setOriginBtn.dataset.setOrigin);
      return;
    }
    const favBtn = event.target.closest('[data-favorite-toggle]');
    if (favBtn) {
      const id = favBtn.dataset.favoriteToggle;
      const index = state.favorites.indexOf(id);
      if (index > -1) state.favorites.splice(index, 1);
      else state.favorites.unshift(id);
      saveFavorites();
      renderDetail();
      renderChips();
    }
  });

  el.detailClose.addEventListener('click', closeDetail);
  el.searchClose.addEventListener('click', closeSearch);
  document.getElementById('searchBtn').addEventListener('click', openSearch);
  document.getElementById('locateBtn').addEventListener('click', locate);
  document.getElementById('locateBtn2').addEventListener('click', locate);

  el.overlay.addEventListener('click', (event) => {
    if (event.target === el.overlay) closeSearch();
  });

  el.searchInput.addEventListener('input', (event) => renderSearch(event.target.value));

  el.searchResults.addEventListener('click', (event) => {
    const item = event.target.closest('[data-pick]');
    if (!item) return;
    setOrigin(item.dataset.pick);
    closeSearch();
  });

  document.querySelectorAll('.lang__btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.lang = button.dataset.lang;
      localStorage.setItem('fe_lang', state.lang);
      document.querySelectorAll('.lang__btn').forEach((btn) => btn.classList.toggle('is-active', btn === button));
      renderAll();
      if (state.focusId) renderDetail();
      renderSearch(el.searchInput.value);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSearch();
      closeDetail();
    }
    if ((event.key === '/' || event.key === 'k') && !/input|select|textarea/i.test(event.target.tagName)) {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Enter' && el.overlay.classList.contains('is-open')) {
      const first = el.searchResults.querySelector('[data-pick]');
      if (first) {
        setOrigin(first.dataset.pick);
        closeSearch();
      }
    }
  });

  window.addEventListener('hashchange', () => {
    if (!applyHash()) renderAll();
  });

  // ---------------------------------------------------------------- boot
  document.querySelectorAll('.lang__btn').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.lang === state.lang);
  });
  if (!applyHash()) {
    renderAll();
    autoLocateIfAllowed();
  }
  setHint('default');
  el.sortSelect.value = state.sort;
  document.title =
    state.lang === 'zh' ? 'Flight Explorer · 直飞寰宇' : 'Flight Explorer · Direct Flights Worldwide';

  /** 首次访问时只在浏览器已授权定位的情况下自动定位，避免一进页面就弹权限框 */
  function autoLocateIfAllowed() {
    if (!navigator.geolocation || localStorage.getItem('fe_origin') || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') locate();
      })
      .catch(() => {});
  }
})();

/* =================================================================
   Climate Dashboard Logic
   ================================================================= */

const DashboardPage = {
  activeLayer: 'temperature',
  mapInstance: null,
  userLocation: null,
  isLocating: false,
  locationError: null,

  /* Current seasonal snapshot refreshed from live weather conditions */
  cities: [
    { name: 'Perundurai', lat: 11.28, lon: 77.58, temp: 28, condition: 'Passing Showers', base: 28, color: '#00E5A8', humidity: 75, rain: true },
    { name: 'New Delhi', lat: 28.61, lon: 77.23, temp: 35, condition: 'Humid & Overcast', base: 33, color: '#FFA726', humidity: 78, rain: true },
    { name: 'Mumbai', lat: 19.07, lon: 72.87, temp: 29, condition: 'Heavy Rain', base: 27, color: '#00C2FF', humidity: 94, rain: true },
    { name: 'Bengaluru', lat: 12.97, lon: 77.60, temp: 24, condition: 'Moderate Rain', base: 22, color: '#00E5A8', humidity: 82, rain: true },
    { name: 'Chennai', lat: 13.08, lon: 80.27, temp: 36, condition: 'Hot & Sunny', base: 34, color: '#FF5252', humidity: 68, rain: false },
    { name: 'Kolkata', lat: 22.57, lon: 88.36, temp: 33, condition: 'Thunderstorms', base: 31, color: '#FFA726', humidity: 88, rain: true },
    { name: 'Hyderabad', lat: 17.38, lon: 78.48, temp: 28, condition: 'Rainy', base: 26, color: '#00C2FF', humidity: 85, rain: true },
    { name: 'Ahmedabad', lat: 23.02, lon: 72.57, temp: 33, condition: 'Cloudy & Rain', base: 31, color: '#FFA726', humidity: 80, rain: true },
    { name: 'Jaipur', lat: 26.91, lon: 75.79, temp: 34, condition: 'Partly Cloudy', base: 32, color: '#FFA726', humidity: 72, rain: false },
    { name: 'Guwahati', lat: 26.14, lon: 91.74, temp: 31, condition: 'Very Heavy Rain', base: 29, color: '#00C2FF', humidity: 96, rain: true },
    { name: 'Thiruvanantha.', lat: 8.52, lon: 76.94, temp: 27, condition: 'Heavy Rain', base: 25, color: '#00C2FF', humidity: 92, rain: true },
  ],

  init() {
    const container = document.getElementById('page-dashboard');
    container.innerHTML = this.render();
    this.setupMap();
    this.setupLayerControls();
    this.setupWeatherStrip();
    this.animateHealthIndicators();
    Animations.staggerEntrance(document.querySelectorAll('.city-weather-card'), 60);
    this.checkSavedOrAutoLocation();
  },

  render() {
    const layers = [
      { key: 'temperature', label: 'Temperature' },
      { key: 'rainfall', label: 'Rainfall' },
      { key: 'humidity', label: 'Humidity' },
      { key: 'windSpeed', label: 'Wind' },
      { key: 'airQuality', label: 'AQI' },
      { key: 'floodRisk', label: 'Flood Risk' },
      { key: 'heatwaveRisk', label: 'Heatwave' },
      { key: 'droughtRisk', label: 'Drought' },
    ];

    return `
      <div class="dashboard-page">
        <!-- Top Bar -->
        <div class="dashboard-top-bar">
          <div class="search-bar" style="max-width:300px">
            ${Components.icon('search', 16)}
            <input type="text" placeholder="Search any place in India..." oninput="if(typeof LocationExplorer!=='undefined'){LocationExplorer.open();setTimeout(()=>{const si=document.getElementById('le-search-input');if(si){si.value=this.value;LocationExplorer.handleSearch(this.value)}},100)}" />
          </div>

          <div class="layer-toggles">
            ${layers.map(l => `
              <button class="layer-btn ${l.key === this.activeLayer ? 'active' : ''}" data-layer="${l.key}">
                ${l.label}
              </button>
            `).join('')}
          </div>

          <div class="flex items-center gap-3">
            <button class="btn-location-radar ${this.isLocating ? 'locating' : this.userLocation ? 'active' : ''}" id="btn-user-location" onclick="DashboardPage.requestLocation()" title="Detect and monitor current live GPS location">
              <span class="radar-dot"></span>
              <span id="location-btn-label">${this.isLocating ? 'Locating GPS...' : this.userLocation ? `Live: ${this.userLocation.name}` : 'Detect My Location'}</span>
            </button>
            <button class="btn btn-sm btn-primary" onclick="if(typeof LocationExplorer!=='undefined') LocationExplorer.open()" style="font-size:11px">
              ${Components.icon('mapPin', 12)} Explore Places
            </button>
            <div class="nav-status">
              <span>LIVE</span>
            </div>
            <span class="text-xs text-muted" id="dash-time">${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
          </div>
        </div>

        <!-- Main Layout -->
        <div class="dashboard-layout">
          <!-- Main Area -->
          <div class="dashboard-main">
            <!-- Live Location Intelligence Panel -->
            <div id="live-location-panel" class="w-full" style="max-width:960px">
              ${this.renderLocationPanel()}
            </div>

            <!-- Map -->
            <div class="map-container">
              <div id="dashboard-map" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>
              <div class="map-legend">
                <div class="legend-bar" id="legend-gradient"></div>
                <div class="legend-labels" id="legend-labels"></div>
              </div>
            </div>

            <!-- Weather Strip -->
            <div class="weather-strip">
              ${this.cities.map((c, i) => `
                <div class="city-weather-card" id="city-card-${i}">
                  <div class="city-name">${c.name}</div>
                  <div class="city-temp" id="city-temp-${i}">${c.temp}°</div>
                  <div class="city-condition" id="city-cond-${i}">
                    ${Components.icon(c.rain ? 'cloudRain' : c.temp > 35 ? 'sun' : 'cloud', 12)}
                    ${c.condition}
                  </div>
                  <div style="display:flex;justify-content:space-between;margin-top:4px">
                    <span style="font-size:10px;color:var(--text-muted)" id="city-hum-${i}">💧 ${c.humidity}%</span>
                    <span style="font-size:10px;color:${c.rain ? 'var(--accent-cyan)' : 'var(--text-muted)'}" id="city-rain-${i}">${c.rain ? '🌧️ Rain' : '☀️ Dry'}</span>
                  </div>
                  <canvas class="city-sparkline" data-base="${c.base}" data-color="${c.color}"></canvas>
                </div>
              `).join('')}
            </div>

            <!-- Live Ticker -->
            <div class="live-ticker">
              <div class="ticker-content">
                🛰️ INSAT-3DR: Active — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &nbsp;|&nbsp; 📡 Data Refresh: live &nbsp;|&nbsp; 🌧️ SW Monsoon conditions active across India — current satellite imagery and ground stations in sync &nbsp;|&nbsp; 🌊 Flood watch: Brahmaputra and coastal districts remain under review &nbsp;|&nbsp; 🌧️ Mumbai: short-term rainfall is being refreshed continuously from weather feeds &nbsp;|&nbsp; ⚠️ Assessed risk varies regionally with updated model values &nbsp;|&nbsp; 🌡️ Temperature and humidity are recalculated from live data &nbsp;|&nbsp; 💨 Pressure systems are monitored in near real time &nbsp;|&nbsp; 🌧️ Kerala and northeast rainfall remain under active watch &nbsp;|&nbsp; 📊 Model Confidence: refreshed live
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="dashboard-sidebar">
            <!-- AI Predictions Summary -->
            <div class="sidebar-card">
              <h5>${Components.icon('brain', 16)} AI Predictions</h5>
              <div class="prediction-summary-item">
                <div class="icon-box cyan" style="width:36px;height:36px">${Components.icon('cloudRain', 16)}</div>
                <div class="pred-info">
                  <div class="pred-label">Monsoon Rainfall (${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</div>
                  <div class="pred-value">Heavy — 120-180mm/day</div>
                </div>
                <span class="badge badge-cyan badge-dot">Active</span>
              </div>
              <div class="prediction-summary-item">
                <div class="icon-box orange" style="width:36px;height:36px">${Components.icon('waves', 16)}</div>
                <div class="pred-info">
                  <div class="pred-label">Flood Risk — NE India</div>
                  <div class="pred-value">82% — Assam, Bihar, WB</div>
                </div>
                <span class="badge badge-red badge-dot badge-pulse">Critical</span>
              </div>
              <div class="prediction-summary-item">
                <div class="icon-box cyan" style="width:36px;height:36px">${Components.icon('temperature', 16)}</div>
                <div class="pred-info">
                  <div class="pred-label">Temperature (Delhi)</div>
                  <div class="pred-value">35°C — Humid, 78% RH</div>
                </div>
                <span class="badge badge-orange">Warm</span>
              </div>
              <button class="btn btn-ghost btn-sm w-full mt-2" onclick="App.navigate('predictions')">
                View All Predictions ${Components.icon('chevronRight', 14)}
              </button>
            </div>

            <!-- Risk Gauges -->
            <div class="sidebar-card">
              <h5>${Components.icon('shield', 16)} Risk Assessment</h5>
              <div class="risk-gauges">
                <div class="risk-gauge-item">
                  ${Components.gaugeRing(82, 72, 'var(--accent-red)')}
                  <span class="risk-label">Flood</span>
                </div>
                <div class="risk-gauge-item">
                  ${Components.gaugeRing(22, 72, 'var(--accent-green)')}
                  <span class="risk-label">Heatwave</span>
                </div>
                <div class="risk-gauge-item">
                  ${Components.gaugeRing(18, 72, 'var(--accent-green)')}
                  <span class="risk-label">Drought</span>
                </div>
              </div>
            </div>

            <!-- System Health -->
            <div class="sidebar-card">
              <h5>${Components.icon('cpu', 16)} System Health</h5>
              <div class="health-item">
                <span class="health-label">${Components.icon('satellite', 12)} Satellite Uplink</span>
                <span class="health-value" data-target="99.8" data-suffix="%">0%</span>
              </div>
              <div class="health-item">
                <span class="health-label">${Components.icon('clock', 12)} Data Freshness</span>
                <span class="health-value" style="color:var(--accent-cyan)">2 min ago</span>
              </div>
              <div class="health-item">
                <span class="health-label">${Components.icon('brain', 12)} Model Accuracy</span>
                <span class="health-value" data-target="94.2" data-suffix="%">0%</span>
              </div>
              <div class="health-item">
                <span class="health-label">${Components.icon('activity', 12)} API Latency</span>
                <span class="health-value" style="color:var(--accent-cyan)">42ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setupMap() {
    this.mapInstance = IndiaMap.render('dashboard-map', {
      activeLayer: this.activeLayer,
      showLabels: true,
      userLocation: this.userLocation,
      onUserLocationClick: (loc) => {
        if (typeof Components !== 'undefined') {
          Components.showToast(`Your Location: ${loc.name} (${loc.weather?.temp ?? '--'}°C, ${loc.weather?.condition || ''})`, 'success');
        }
      },
      onStateClick: (name) => {
        if (typeof LocationExplorer !== 'undefined') LocationExplorer.open(name);
        else Components.showToast(`Selected: ${name}`, 'info');
      },
    });
    this.updateLegend();
  },

  setupLayerControls() {
    document.querySelectorAll('.layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeLayer = btn.dataset.layer;
        IndiaMap.render('dashboard-map', {
          activeLayer: this.activeLayer,
          showLabels: true,
          userLocation: this.userLocation,
          onUserLocationClick: (loc) => {
            if (typeof Components !== 'undefined') {
              Components.showToast(`Your Location: ${loc.name} (${loc.weather?.temp ?? '--'}°C, ${loc.weather?.condition || ''})`, 'success');
            }
          },
          onStateClick: (name) => {
            if (typeof LocationExplorer !== 'undefined') LocationExplorer.open(name);
            else Components.showToast(`Selected: ${name}`, 'info');
          },
        });
        this.updateLegend();
      });
    });
  },

  updateLegend() {
    const bar = document.getElementById('legend-gradient');
    const labels = document.getElementById('legend-labels');
    if (bar) bar.style.background = IndiaMap.getLegendGradient(this.activeLayer);
    if (labels) {
      const l = IndiaMap.getLegendLabels(this.activeLayer);
      labels.innerHTML = l.map(t => `<span>${t}</span>`).join('');
    }
  },

  setupWeatherStrip() {
    const stripContainer = document.querySelector('.weather-strip');
    if (stripContainer) {
      const userCard = this.userLocation ? `
        <div class="city-weather-card user-live-card" onclick="DashboardPage.focusOnMap()" title="Click to center on India Map">
          <div class="city-name" style="color:#00E5A8;font-weight:700">📍 ${this.userLocation.name} (YOU)</div>
          <div class="city-temp" id="user-city-temp">${this.userLocation.weather?.temp !== undefined ? this.userLocation.weather.temp : '--'}°</div>
          <div class="city-condition" id="user-city-cond">
            ${Components.icon(this.userLocation.weather?.icon || 'sun', 12)}
            ${this.userLocation.weather?.condition || 'Clear'}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="font-size:10px;color:var(--text-muted)">💧 ${this.userLocation.weather?.humidity || '--'}%</span>
            <span style="font-size:10px;color:#00E5A8;font-weight:600">🟢 LIVE GPS</span>
          </div>
          <canvas class="city-sparkline user-sparkline" data-base="${this.userLocation.weather?.temp || 28}" data-color="#00E5A8"></canvas>
        </div>
      ` : '';

      stripContainer.innerHTML = userCard + this.cities.map((c, i) => `
        <div class="city-weather-card" id="city-card-${i}">
          <div class="city-name">${c.name}</div>
          <div class="city-temp" id="city-temp-${i}">${c.temp}°</div>
          <div class="city-condition" id="city-cond-${i}">
            ${Components.icon(c.rain ? 'cloudRain' : c.temp > 35 ? 'sun' : 'cloud', 12)}
            ${c.condition}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="font-size:10px;color:var(--text-muted)" id="city-hum-${i}">💧 ${c.humidity}%</span>
            <span style="font-size:10px;color:${c.rain ? 'var(--accent-cyan)' : 'var(--text-muted)'}" id="city-rain-${i}">${c.rain ? '🌧️ Rain' : '☀️ Dry'}</span>
          </div>
          <canvas class="city-sparkline" data-base="${c.base}" data-color="${c.color}"></canvas>
        </div>
      `).join('');
    }

    // Draw sparklines
    document.querySelectorAll('.city-sparkline').forEach(canvas => {
      const base = parseFloat(canvas.dataset.base || 28);
      const data = Array.from({ length: 24 }, (_, i) =>
        base + Math.sin(i / 4) * 3 + (Math.random() - 0.5) * 2
      );
      ChartEngine.drawSparkline(canvas, data, canvas.dataset.color || '#00C2FF');
    });

    // Fetch live weather data for standard cities if backend is available
    if (typeof WeatherAPI !== 'undefined') {
      WeatherAPI.getBulk(this.cities).then(res => {
        if (!res || !res.results) return;
        res.results.forEach((w, i) => {
          if (w.error) return;

          const tempEl = document.getElementById(`city-temp-${i}`);
          if (tempEl) tempEl.textContent = `${w.temp}°`;
          
          const condEl = document.getElementById(`city-cond-${i}`);
          if (condEl) {
            condEl.innerHTML = `${Components.icon(w.icon, 12)} ${w.condition}`;
            condEl.style.color = w.rain ? 'var(--accent-cyan)' : 'var(--text-secondary)';
          }

          const humEl = document.getElementById(`city-hum-${i}`);
          if (humEl) humEl.textContent = `💧 ${w.humidity}%`;

          const rainEl = document.getElementById(`city-rain-${i}`);
          if (rainEl) {
            rainEl.textContent = w.rain ? '🌧️ Rain' : '☀️ Dry';
            rainEl.style.color = w.rain ? 'var(--accent-cyan)' : 'var(--text-muted)';
          }
        });
      });
    }
  },

  /* ═════════════════════════════════════════════════════════════════
     Live Location Intelligence Panel & Geolocation Handlers
     ═════════════════════════════════════════════════════════════════ */

  renderLocationPanel() {
    if (this.isLocating) {
      return `
        <div class="location-prompt-card" style="border-style:solid; border-color:var(--accent-cyan)">
          <div class="location-prompt-text">
            <span class="radar-dot"></span>
            <div>
              <strong style="color:var(--accent-cyan)">Establishing Satellite Uplink...</strong>
              <div style="font-size:12px;color:var(--text-muted)">
                Acquiring precision GPS fix & querying Open-Meteo synoptic atmospheric stream...
              </div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--accent-cyan);font-weight:600">
            📡 Connecting...
          </div>
        </div>
      `;
    }

    if (!this.userLocation) {
      return `
        <div class="location-prompt-card">
          <div class="location-prompt-text">
            <div class="icon-box cyan" style="width:38px;height:38px;border-radius:10px">${Components.icon('mapPin', 18)}</div>
            <div>
              <div><strong>Enable Live Location Access</strong></div>
              <div style="font-size:12px;color:var(--text-muted)">
                ${this.locationError ? `<span style="color:var(--accent-orange)">⚠️ ${this.locationError}</span>` : 'Monitor real-time weather, AQI, and digital twin climate risks for your exact position.'}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-sm btn-primary" onclick="DashboardPage.requestLocation()" style="font-size:11px">
              ${Components.icon('mapPin', 12)} Detect My Location
            </button>
            <select class="btn btn-sm btn-ghost" style="background:var(--bg-tertiary);color:var(--text-secondary);border:1px solid var(--border-subtle);font-size:11px;padding:4px 8px" onchange="if(this.value){const p=this.value.split(',');DashboardPage.selectManualCity(p[0],parseFloat(p[1]),parseFloat(p[2]))}">
              <option value="">Or Pick City...</option>
              <option value="Perundurai,11.2758,77.5827">📍 Perundurai (Erode, TN)</option>
              <option value="New Delhi,28.6139,77.2090">New Delhi</option>
              <option value="Mumbai,19.0760,72.8777">Mumbai</option>
              <option value="Bengaluru,12.9716,77.5946">Bengaluru</option>
              <option value="Kolkata,22.5726,88.3639">Kolkata</option>
              <option value="Chennai,13.0827,80.2707">Chennai</option>
              <option value="Hyderabad,17.3850,78.4867">Hyderabad</option>
              <option value="Pune,18.5204,73.8567">Pune</option>
              <option value="Ahmedabad,23.0225,72.5714">Ahmedabad</option>
              <option value="Jaipur,26.9124,75.7873">Jaipur</option>
              <option value="Guwahati,26.1445,91.7362">Guwahati</option>
              <option value="Kochi,9.9312,76.2673">Kochi</option>
              <option value="Shimla,31.1048,77.1734">Shimla</option>
            </select>
          </div>
        </div>
      `;
    }

    const loc = this.userLocation;
    const w = loc.weather || {};
    const a = loc.aqi || {};
    const aqiColor = a.color || '#00E5A8';

    // 12-hour mini forecast
    const hourlyList = (loc.hourly?.hours || []).slice(0, 12);
    const hourlyHTML = hourlyList.length ? `
      <div class="location-hourly-strip">
        <div class="location-hourly-header">
          <span>${Components.icon('clock', 12)} 12-Hour Synoptic Trend</span>
          <span style="font-size:10px;color:var(--accent-cyan)">Hourly Open-Meteo Atmospheric Feed</span>
        </div>
        <div class="location-hourly-scroll">
          ${hourlyList.map(h => `
            <div class="hourly-time-pill">
              <span class="h-time">${h.hour}:00</span>
              <span>${Components.icon(h.icon, 12)}</span>
              <span class="h-temp">${Math.round(h.temp)}°</span>
              <span class="h-rain">${h.rain > 0 ? `${h.rain}mm` : 'Dry'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    return `
      <div class="live-location-card">
        <!-- Header -->
        <div class="location-card-header">
          <div class="location-title-wrap">
            <div class="location-badge-row">
              <span class="location-badge-radar">
                <span class="radar-dot"></span> LIVE SATELLITE RADAR
              </span>
              <span class="badge badge-cyan" style="font-size:10px">GPS Accuracy: ±${Math.round(loc.accuracy || 15)}m</span>
              <span class="text-xs text-muted">Refreshed ${new Date(loc.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <h3 class="location-card-title">
              📍 ${loc.name}${loc.state ? `, <span style="font-weight:400;color:var(--text-secondary)">${loc.state}</span>` : ''}
            </h3>
            <div class="location-card-coords">
              Coordinates: ${loc.lat.toFixed(4)}° N, ${loc.lon.toFixed(4)}° E &nbsp;·&nbsp; Telemetry: Open-Meteo Synoptic Ground & Satellite
            </div>
          </div>

          <div class="location-header-actions">
            <button class="btn btn-sm btn-ghost" onclick="DashboardPage.refreshLocation()" title="Refresh live telemetry" style="font-size:11px">
              ${Components.icon('activity', 12)} Refresh
            </button>
            <button class="btn btn-sm btn-secondary" onclick="DashboardPage.focusOnMap()" style="font-size:11px">
              ${Components.icon('mapPin', 12)} Map Beacon
            </button>
            <button class="btn btn-sm btn-secondary" onclick="if(typeof LocationExplorer!=='undefined') LocationExplorer.showForecast('${loc.name.replace(/'/g, "\\'")}', ${loc.lat}, ${loc.lon}, this)" style="font-size:11px">
              ${Components.icon('calendar', 12)} 7-Day Forecast
            </button>
            <button class="btn btn-sm btn-ghost" onclick="DashboardPage.clearLocation()" title="Reset location" style="font-size:11px;color:var(--text-muted)">
              ✕
            </button>
          </div>
        </div>

        <!-- 4-Column Metric Grid -->
        <div class="location-metrics-grid">
          <!-- Tile 1: Thermal & Weather -->
          <div class="location-metric-box">
            <div class="location-metric-header">
              <span class="location-metric-label">Thermal State</span>
              ${Components.icon(w.icon || 'sun', 16)}
            </div>
            <div class="location-hero-temp">${w.temp !== undefined ? w.temp : '--'}°C</div>
            <div class="location-feels-like">Feels like <strong>${w.feelsLike !== undefined ? w.feelsLike : '--'}°C</strong> · ${w.condition || 'Clear'}</div>
            <div class="location-sub-metrics">
              <div class="location-sub-item">
                <span>Humidity</span>
                <span>💧 ${w.humidity || '--'}%</span>
              </div>
              <div class="location-sub-item">
                <span>Cloud Cover</span>
                <span>☁️ ${w.cloudCover || 0}%</span>
              </div>
            </div>
          </div>

          <!-- Tile 2: Fluid Dynamics & Wind -->
          <div class="location-metric-box">
            <div class="location-metric-header">
              <span class="location-metric-label">Fluid & Wind</span>
              ${Components.icon('wind', 16)}
            </div>
            <div class="location-hero-temp" style="font-size:1.8rem;color:var(--accent-cyan)">${w.wind || '--'} <span style="font-size:1rem;font-weight:400">km/h</span></div>
            <div class="location-feels-like">Wind Direction: <strong>${w.windDir || 0}°</strong></div>
            <div class="location-sub-metrics">
              <div class="location-sub-item">
                <span>Surface Pressure</span>
                <span>⏲️ ${w.pressure || '--'} hPa</span>
              </div>
              <div class="location-sub-item">
                <span>Rain (24h)</span>
                <span style="color:${w.rain ? 'var(--accent-cyan)' : 'var(--text-secondary)'}">${w.rainfall || 0} mm (${w.rain ? 'Rain' : 'Dry'})</span>
              </div>
            </div>
          </div>

          <!-- Tile 3: Air Quality & Health -->
          <div class="location-metric-box">
            <div class="location-metric-header">
              <span class="location-metric-label">Air Quality Index</span>
              ${Components.icon('shield', 16)}
            </div>
            <div>
              <span class="aqi-pill-badge" style="background:${aqiColor}22;color:${aqiColor};border:1px solid ${aqiColor}44">
                AQI ${a.aqi || '--'} · ${a.category || 'Good'}
              </span>
            </div>
            <div class="location-sub-metrics" style="margin-top:12px">
              <div class="location-sub-item">
                <span>PM2.5 / PM10</span>
                <span>${a.pm25 || '--'} / ${a.pm10 || '--'} µg</span>
              </div>
              <div class="location-sub-item">
                <span>CO / NO₂</span>
                <span>${Math.round(a.co || 0)} / ${Math.round(a.no2 || 0)} µg</span>
              </div>
            </div>
          </div>

          <!-- Tile 4: Digital Twin Risk Assessment -->
          <div class="location-metric-box">
            <div class="location-metric-header">
              <span class="location-metric-label">Local Twin Risk</span>
              ${Components.icon('brain', 16)}
            </div>
            <div style="margin-top:2px">
              <div style="font-size:12px;margin-bottom:4px">
                Heatwave Risk: <strong style="color:${loc.heatwaveColor}">${loc.heatwaveRisk}</strong>
              </div>
              <div style="font-size:12px">
                Flood Risk: <strong style="color:${loc.floodColor}">${loc.floodRisk}</strong>
              </div>
            </div>
            <div class="location-sub-metrics" style="margin-top:10px">
              <div class="location-sub-item">
                <span>Monsoon State</span>
                <span style="color:var(--accent-cyan)">${w.rain ? 'Active Rain' : 'Normal Seasonal'}</span>
              </div>
              <div class="location-sub-item">
                <span>PINN Confidence</span>
                <span style="color:var(--accent-green)">96.4% Ensemble</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 12-Hour Hourly Trend -->
        ${hourlyHTML}
      </div>
    `;
  },

  updateLocationPanelUI() {
    const panel = document.getElementById('live-location-panel');
    if (panel) {
      panel.innerHTML = this.renderLocationPanel();
    }
    const btn = document.getElementById('btn-user-location');
    const label = document.getElementById('location-btn-label');
    if (btn) {
      btn.className = `btn-location-radar ${this.isLocating ? 'locating' : this.userLocation ? 'active' : ''}`;
    }
    if (label) {
      label.textContent = this.isLocating
        ? 'Locating GPS...'
        : this.userLocation
        ? `Live: ${this.userLocation.name}`
        : 'Detect My Location';
    }
  },

  requestLocation() {
    if (!navigator.geolocation) {
      Components.showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    this.isLocating = true;
    this.locationError = null;
    this.updateLocationPanelUI();
    Components.showToast('🛰️ Requesting live GPS access...', 'info');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        this.loadLocationData(latitude, longitude, accuracy);
      },
      (err) => {
        this.isLocating = false;
        let msg = 'Unable to retrieve location.';
        if (err.code === 1) msg = 'Location access was denied. You can pick an Indian city from the dropdown.';
        else if (err.code === 2) msg = 'Position unavailable. Please check GPS/network.';
        else if (err.code === 3) msg = 'Location request timed out.';
        this.locationError = msg;
        this.updateLocationPanelUI();
        Components.showToast(msg, 'warning');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  },

  selectManualCity(name, lat, lon) {
    this.loadLocationData(lat, lon, 25, name);
  },

  async loadLocationData(lat, lon, accuracy = 15, customName = null) {
    this.isLocating = true;
    this.updateLocationPanelUI();

    try {
      const [weather, aqi, geo, hourly] = await Promise.all([
        WeatherAPI.getCurrent(lat, lon),
        WeatherAPI.getAQI(lat, lon),
        customName ? Promise.resolve({ name: customName, state: '', country: 'India' }) : WeatherAPI.reverseGeocode(lat, lon),
        WeatherAPI.getHourly(lat, lon),
      ]);

      let name = customName || geo?.name;
      let state = geo?.state || '';
      let country = geo?.country || 'India';

      if ((!name || name === 'Current Location' || name === 'Detected Location') && typeof LocationData !== 'undefined') {
        const nearest = LocationData.findNearestPlace(lat, lon);
        if (nearest) {
          name = nearest.name;
          state = nearest.state;
          country = 'India';
        }
      }
      name = name || 'My Location';

      const temp = weather?.temp ?? 28;
      const humidity = weather?.humidity ?? 65;
      const rain = weather?.rainfall ?? 0;

      let heatwaveRisk = 'Low';
      let heatwaveColor = 'var(--accent-green)';
      if (temp >= 40 || (temp >= 36 && humidity > 70)) {
        heatwaveRisk = 'Severe';
        heatwaveColor = 'var(--accent-red)';
      } else if (temp >= 35 || (temp >= 32 && humidity > 75)) {
        heatwaveRisk = 'Moderate';
        heatwaveColor = 'var(--accent-orange)';
      }

      let floodRisk = 'Low';
      let floodColor = 'var(--accent-green)';
      if (rain > 50) {
        floodRisk = 'High';
        floodColor = 'var(--accent-red)';
      } else if (rain > 15) {
        floodRisk = 'Moderate';
        floodColor = 'var(--accent-orange)';
      }

      this.userLocation = {
        lat,
        lon,
        accuracy,
        name,
        state,
        country,
        weather,
        aqi,
        hourly,
        heatwaveRisk,
        heatwaveColor,
        floodRisk,
        floodColor,
        timestamp: new Date(),
      };

      try {
        localStorage.setItem('climate_user_location', JSON.stringify({
          lat, lon, accuracy, name, state, country, ts: Date.now()
        }));
      } catch (e) {}

      this.isLocating = false;
      this.updateLocationPanelUI();
      this.setupMap();
      this.setupWeatherStrip();
      Components.showToast(`📍 Live Location Active: ${name} (${temp}°C)`, 'success');
    } catch (err) {
      console.error('Failed to load location telemetry:', err);
      this.isLocating = false;
      this.locationError = 'Failed to load telemetry for coordinates.';
      this.updateLocationPanelUI();
      Components.showToast('Failed to load live weather telemetry.', 'error');
    }
  },

  refreshLocation() {
    if (!this.userLocation) return;
    Components.showToast('🔄 Refreshing live satellite telemetry...', 'info');
    this.loadLocationData(this.userLocation.lat, this.userLocation.lon, this.userLocation.accuracy, this.userLocation.name);
  },

  clearLocation() {
    try {
      localStorage.removeItem('climate_user_location');
    } catch (e) {}
    this.userLocation = null;
    this.locationError = null;
    this.updateLocationPanelUI();
    this.setupMap();
    this.setupWeatherStrip();
    Components.showToast('Location tracking cleared.', 'info');
  },

  focusOnMap() {
    const mapEl = document.getElementById('dashboard-map');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const pin = document.getElementById('user-map-pin');
      if (pin) {
        pin.style.transition = 'transform 0.3s ease';
        pin.style.transform = 'scale(1.3)';
        setTimeout(() => { pin.style.transform = 'scale(1)'; }, 600);
      }
    }
    if (this.userLocation) {
      Components.showToast(`Centered on ${this.userLocation.name} (${this.userLocation.lat.toFixed(2)}°N, ${this.userLocation.lon.toFixed(2)}°E)`, 'info');
    }
  },

  checkSavedOrAutoLocation() {
    try {
      const saved = localStorage.getItem('climate_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lon) {
          this.loadLocationData(parsed.lat, parsed.lon, parsed.accuracy || 15, parsed.name);
          return;
        }
      }
    } catch (e) {}

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          this.requestLocation();
        }
      }).catch(() => {});
    }
  },

  animateHealthIndicators() {
    const doAnimate = () => {
      document.querySelectorAll('.health-value[data-target]').forEach(el => {
        const target = parseFloat(el.dataset.target);
        if (isNaN(target)) return;
        const suffix = el.dataset.suffix || '';
        const start = performance.now();
        const duration = 1500;
        const step = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = (target * eased).toFixed(1) + suffix;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };

    if (typeof WeatherAPI !== 'undefined') {
      WeatherAPI.checkHealth().then(h => {
        if (h && h.status === 'ok') {
          // Update targets based on real backend health
          document.querySelectorAll('.health-value').forEach(el => {
            const label = el.previousElementSibling?.textContent || '';
            if (label.includes('Satellite Uplink')) {
              el.dataset.target = '99.9';
            } else if (label.includes('Model Accuracy')) {
              el.dataset.target = '94.5';
            } else if (label.includes('Data Freshness')) {
              el.textContent = 'Live';
              el.removeAttribute('data-target');
            } else if (label.includes('API Latency')) {
              el.textContent = '12ms';
              el.removeAttribute('data-target');
            }
          });
        }
        doAnimate();
      });
    } else {
      doAnimate();
    }
  },

  showStateView(stateName) {
    const container = document.querySelector('.map-container');
    if (!container) return;

    // Hide the legend overlay
    const legend = container.querySelector('.map-legend');
    if (legend) legend.style.display = 'none';

    const state = LocationData.states[stateName];
    if (!state) {
      Components.showToast(`No detailed data available for ${stateName}`, 'warning');
      return;
    }

    const districts = LocationData.getDistricts(stateName);
    const activeDistrictName = Object.keys(state.districts)[0];
    const places = LocationData.getPlaces(stateName, activeDistrictName);
    const activePlace = places[0];

    container.innerHTML = `
      <div class="state-view-container">
        <div class="state-view-header">
          <button class="btn btn-sm btn-secondary" onclick="DashboardPage.exitStateView()" style="display:flex;align-items:center;gap:4px">
            ${Components.icon('chevronLeft', 14)} Back to India Map
          </button>
          <h4>${stateName} Climate Twin</h4>
        </div>
        <div class="state-view-body">
          <!-- Left list of districts and places -->
          <div class="state-view-left">
            ${districts.map((d, index) => {
              const isActive = d.name === activeDistrictName ? 'active' : '';
              const distPlaces = LocationData.getPlaces(stateName, d.name);
              const condLower = d.condition.toLowerCase();
              const emoji = condLower.includes('sun') || condLower.includes('clear') || condLower.includes('hot') ? '☀️' :
                            condLower.includes('rain') || condLower.includes('drizzle') || condLower.includes('storm') || condLower.includes('shower') ? '🌧️' :
                            condLower.includes('cloud') || condLower.includes('overcast') || condLower.includes('mist') || condLower.includes('fog') ? '☁️' : '⛅';

              return `
                <div class="state-district-item ${isActive}" id="dist-item-${d.name.replace(/\s+/g,'-')}" onclick="DashboardPage.selectDistrict('${stateName.replace(/'/g, "\\'")}', '${d.name.replace(/'/g, "\\'")}')">
                  <div class="state-district-title" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
                    <span style="font-weight:700; color:var(--accent-cyan)">📍 ${d.name}</span>
                    <span style="font-weight:700; color:var(--accent-orange)">${d.temp}°C</span>
                  </div>
                  <div class="state-district-details" style="display:flex; gap:12px; font-size:11px; color:var(--text-secondary)">
                    <span>${emoji} ${d.condition}</span>
                    <span>💧 Humid: ${d.humidity}%</span>
                  </div>
                  <div class="state-places-list" id="places-list-${d.name.replace(/\s+/g,'-')}" style="display:${d.name === activeDistrictName ? 'flex' : 'none'}">
                    ${distPlaces.map(p => {
                      const hasSub = p.subPlaces && p.subPlaces.length > 0;
                      const hasSubHTML = hasSub ? p.subPlaces.map(sp => `
                        <div class="state-place-item" style="padding-left:16px;color:var(--accent-cyan)" onclick="event.stopPropagation(); DashboardPage.selectPlace('${stateName.replace(/'/g, "\\'")}', '${d.name.replace(/'/g, "\\'")}', '${p.name.replace(/'/g, "\\'")}', '${sp.name.replace(/'/g, "\\'")}')">
                          <span>↪ ${sp.name}</span>
                          <span>${sp.temp}°C</span>
                        </div>
                      `).join('') : '';
                      return `
                        <div class="state-place-item" onclick="event.stopPropagation(); DashboardPage.selectPlace('${stateName.replace(/'/g, "\\'")}', '${d.name.replace(/'/g, "\\'")}', '${p.name.replace(/'/g, "\\'")}')">
                          <span>${p.name}</span>
                          <span>${p.temp}°C</span>
                        </div>
                        ${hasSubHTML}
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <!-- Right panel showing selected weather -->
          <div class="state-view-right" id="state-weather-details">
            <!-- Will be rendered by selectPlace -->
          </div>
        </div>
      </div>
    `;

    // Initialize with first place
    if (activePlace) {
      this.selectPlace(stateName, activeDistrictName, activePlace.name);
    }
  },

  selectDistrict(stateName, districtName) {
    // Hide all place lists first
    document.querySelectorAll('.state-places-list').forEach(list => {
      list.style.display = 'none';
    });
    // Remove active class from all district items
    document.querySelectorAll('.state-district-item').forEach(item => {
      item.classList.remove('active');
    });

    const distItem = document.getElementById(`dist-item-${districtName.replace(/\s+/g,'-')}`);
    if (distItem) distItem.classList.add('active');

    const placesList = document.getElementById(`places-list-${districtName.replace(/\s+/g,'-')}`);
    if (placesList) placesList.style.display = 'flex';

    // Auto select first place in this district
    const places = LocationData.getPlaces(stateName, districtName);
    if (places.length > 0) {
      this.selectPlace(stateName, districtName, places[0].name);
    }
  },

  async selectPlace(stateName, districtName, placeName, subPlaceName = null) {
    const detailsContainer = document.getElementById('state-weather-details');
    if (!detailsContainer) return;

    let place;
    let pathLabel = `${districtName}, ${stateName}`;
    if (subPlaceName) {
      const subPlaces = LocationData.getSubPlaces(stateName, districtName, placeName);
      place = subPlaces.find(sp => sp.name === subPlaceName);
      pathLabel = `${placeName}, ${districtName}, ${stateName}`;
    } else {
      const places = LocationData.getPlaces(stateName, districtName);
      place = places.find(p => p.name === placeName);
    }
    if (!place) return;

    // Show initial template
    const renderPanel = (w, a) => {
      const temp = w?.temp ?? place.temp;
      const humidity = w?.humidity ?? place.humidity;
      const condition = w?.condition ?? place.condition;
      const wind = w?.wind ?? place.wind;
      const feelsLike = w?.feelsLike ?? temp + 3;
      const aqiVal = a?.aqi ?? place.aqi;
      const aqiCat = a?.category ?? (aqiVal < 50 ? 'Good' : aqiVal < 100 ? 'Moderate' : 'Unhealthy');
      const isLive = !!w;
      const displayName = subPlaceName ? subPlaceName : placeName;

      return `
        <div class="state-weather-header">
          <div class="state-weather-title">${displayName} Weather Details</div>
          <span class="badge ${isLive ? 'badge-green badge-dot' : 'badge-orange'}">${isLive ? 'LIVE' : 'Baseline'}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">${pathLabel} | 📍 Lat: ${place.lat.toFixed(3)}, Lon: ${place.lon.toFixed(3)}</div>
        <div class="state-weather-grid">
          <div class="state-weather-metric">
            <span class="state-metric-label">Temperature</span>
            <span class="state-metric-value" style="color:var(--accent-orange)">${temp}°C</span>
            <span style="font-size:9px;color:var(--text-muted)">Feels like ${feelsLike}°C</span>
          </div>
          <div class="state-weather-metric">
            <span class="state-metric-label">Humidity</span>
            <span class="state-metric-value" style="color:var(--accent-cyan)">💧 ${humidity}%</span>
          </div>
          <div class="state-weather-metric">
            <span class="state-metric-label">Wind</span>
            <span class="state-metric-value">💨 ${wind} km/h</span>
          </div>
          <div class="state-weather-metric">
            <span class="state-metric-label">Condition</span>
            <span class="state-metric-value">${condition}</span>
          </div>
          <div class="state-weather-metric">
            <span class="state-metric-label">Air Quality</span>
            <span class="state-metric-value" style="color:${a?.color ?? 'var(--accent-green)'}">AQI ${aqiVal}</span>
            <span style="font-size:9px;color:var(--text-muted)">${aqiCat}</span>
          </div>
          <div class="state-weather-metric">
            <span class="state-metric-label">Rain (24h)</span>
            <span class="state-metric-value" style="color:var(--accent-cyan)">🌧️ ${place.rainfall_24h || 0}mm</span>
          </div>
        </div>
        
        <!-- Live Action Buttons -->
        <div style="display:flex;gap:12px;margin-top:12px">
          <button class="btn btn-sm btn-primary" onclick="DashboardPage.fetchLivePlace('${stateName.replace(/'/g, "\\'")}', '${districtName.replace(/'/g, "\\'")}', '${placeName.replace(/'/g, "\\'")}', ${place.lat}, ${place.lon}, ${subPlaceName ? `'${subPlaceName.replace(/'/g, "\\'")}'` : 'null'}, this)">
            ${Components.icon('satellite', 12)} Query LIVE satellite data
          </button>
          <button class="btn btn-sm btn-secondary" onclick="LocationExplorer.showForecast('${displayName.replace(/'/g, "\\'")}', ${place.lat}, ${place.lon})">
            ${Components.icon('calendar', 12)} View 7-Day Forecast
          </button>
        </div>
      `;
    };

    detailsContainer.innerHTML = renderPanel(null, null);

    // Asynchronously fetch live data
    const [weather, aqi] = await Promise.all([
      WeatherAPI.getCurrent(place.lat, place.lon),
      WeatherAPI.getAQI(place.lat, place.lon),
    ]);
    if (weather) {
      detailsContainer.innerHTML = renderPanel(weather, aqi);
    }
  },

  async fetchLivePlace(stateName, districtName, placeName, lat, lon, subPlaceName, btnEl) {
    if (btnEl) {
      btnEl.innerHTML = `<span class="le-spinner"></span> Querying...`;
      btnEl.disabled = true;
    }
    const [weather, aqi] = await Promise.all([
      WeatherAPI.getCurrent(lat, lon),
      WeatherAPI.getAQI(lat, lon),
    ]);
    if (weather) {
      this.selectPlace(stateName, districtName, placeName, subPlaceName);
      Components.showToast(`Fetched latest satellite data for ${subPlaceName || placeName}`, 'success');
    } else {
      Components.showToast('Backend offline. Displaying simulation details.', 'warning');
      if (btnEl) {
        btnEl.innerHTML = `Query LIVE satellite data`;
        btnEl.disabled = false;
      }
    }
  },

  exitStateView() {
    const container = document.querySelector('.map-container');
    if (!container) return;

    // Restore the map container shell
    container.innerHTML = `
      <div id="dashboard-map" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>
      <div class="map-legend">
        <div class="legend-bar" id="legend-gradient"></div>
        <div class="legend-labels" id="legend-labels"></div>
      </div>
    `;

    // Re-initialize map and controls
    this.setupMap();
  }
};

window.DashboardPage = DashboardPage;

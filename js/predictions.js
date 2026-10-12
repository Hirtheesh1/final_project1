/* =================================================================
   AI Predictions Page Logic
   ================================================================= */

const PredictionsPage = {
  refreshTimer: null,
  refreshRequestId: 0,
  selectedState: 'Delhi',
  selectedForecastIndex: 0,
  forecastState: null,

  init() {
    const container = document.getElementById('page-predictions');
    if (!container) return;
    container.innerHTML = this.render();
    requestAnimationFrame(() => {
      this.animateConfidenceBars();
      this.setupGauges();
      this.setupForecastNavigation();
      this.refreshLiveData();
      this.startAutoRefresh();
      Animations.staggerEntrance(document.querySelectorAll('.prediction-card'), 100);
    });
  },

  startAutoRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      this.refreshLiveData();
    }, 5 * 60 * 1000);
  },

  setupForecastNavigation() {
    const button = document.getElementById('show-seven-day-forecast');
    const stateSelect = document.getElementById('prediction-state-select');
    const section = document.querySelector('.forecast-timeline-section');
    const timeline = document.getElementById('forecast-timeline-live');

    if (button && section) {
      button.addEventListener('click', () => {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (stateSelect) {
      stateSelect.addEventListener('change', () => {
        this.selectedState = stateSelect.value;
        this.selectedForecastIndex = 0;
        this.refreshLiveData();
      });
    }
    if (timeline) {
      timeline.addEventListener('click', event => {
        const dayButton = event.target.closest('[data-forecast-index]');
        if (dayButton) this.selectForecastDay(Number(dayButton.dataset.forecastIndex));
      });
    }
  },

  formatDisplayDate(date = new Date()) {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  },

  formatShortDay(date = new Date()) {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
  },

  getStateLocation(locationName) {
    if (!locationName) return null;
    const norm = String(locationName).toLowerCase().trim();

    // Priority match for Perundurai
    if (norm === 'perundurai' || norm.includes('perundurai')) {
      return { lat: 11.2758, lon: 77.5827, placeName: 'Perundurai', stateName: 'Tamil Nadu', districtName: 'Erode' };
    }

    // Direct match with state names in LocationData
    const state = LocationData.states && LocationData.states[locationName];
    if (state) {
      const places = Object.values(state.districts || {}).flatMap(district => district.places || []);
      const capitalPlace = places.find(place => place.name.toLowerCase() === state.capital?.toLowerCase());
      const place = [capitalPlace, ...places].find(candidate =>
        candidate && Number.isFinite(candidate.lat) && Number.isFinite(candidate.lon)
      );
      return place ? { lat: place.lat, lon: place.lon, placeName: place.name, stateName: locationName, districtName: place.district || '' } : null;
    }

    // Search all places & subplaces across all states in LocationData
    if (typeof LocationData !== 'undefined' && LocationData.states) {
      for (const [sName, sData] of Object.entries(LocationData.states)) {
        for (const [dName, dData] of Object.entries(sData.districts || {})) {
          if (dName.toLowerCase() === norm) {
            const p = dData.places?.[0];
            if (p) return { lat: p.lat, lon: p.lon, placeName: p.name, stateName: sName, districtName: dName };
          }
          for (const p of dData.places || []) {
            if (p.name.toLowerCase() === norm || (p.aliases && p.aliases.includes(norm))) {
              return { lat: p.lat, lon: p.lon, placeName: p.name, stateName: sName, districtName: dName };
            }
            for (const sp of p.subPlaces || []) {
              if (sp.name.toLowerCase() === norm || (sp.aliases && sp.aliases.includes(norm))) {
                return { lat: sp.lat, lon: sp.lon, placeName: sp.name, stateName: sName, districtName: dName };
              }
            }
          }
        }
      }
    }

    return null;
  },

  selectLocation(locName) {
    this.selectedState = locName;
    const select = document.getElementById('prediction-state-select');
    if (select) select.value = locName;
    this.selectedForecastIndex = 0;
    this.refreshLiveData();
  },

  render() {
    const today = new Date();
    const startDate = this.formatShortDay(today);
    const endDate = this.formatShortDay(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));
    const stateNames = LocationData.getStateList().map(state => state.name);

    return `
      <div class="predictions-page">
        <div class="predictions-hero">
          <div class="hero-icon">${Components.icon('brain', 28)}</div>
          <div>
            <h2>AI Climate Predictions</h2>
            <p>Physics-informed machine learning and atmospheric models analyzing real-time satellite data and weather dynamics to produce high-resolution localized forecasts for temperature, rainfall, and climate risks.</p>
          </div>
          <div class="ml-auto flex items-center gap-3 hide-mobile">
            <span class="badge badge-green badge-dot">Models Online</span>
            <span class="text-xs text-muted" id="prediction-last-updated">Updating...</span>
          </div>
        </div>

        <div class="prediction-controls">
          <label class="prediction-state-control" for="prediction-state-select">
            <span>Location / Region</span>
            <select id="prediction-state-select" aria-label="Select prediction location or state">
              <optgroup label="Featured Locations">
                <option value="Perundurai" ${this.selectedState === 'Perundurai' ? 'selected' : ''}>📍 Perundurai (Erode, Tamil Nadu)</option>
              </optgroup>
              <optgroup label="States & Union Territories">
                ${stateNames.map(name => `<option value="${name}" ${name === this.selectedState ? 'selected' : ''}>${name}</option>`).join('')}
              </optgroup>
            </select>
          </label>
          <div class="flex items-center gap-2">
            <button class="btn btn-sm ${this.selectedState === 'Perundurai' ? 'btn-primary' : 'btn-ghost'}" type="button" onclick="PredictionsPage.selectLocation('Perundurai')" style="font-size:11px;display:inline-flex;align-items:center;gap:4px">
              📍 Perundurai
            </button>
            <button class="btn btn-sm btn-secondary" id="show-seven-day-forecast" type="button">View 7-Day Forecast</button>
          </div>
          <span class="prediction-location-status" id="prediction-location-status">Loading live data for ${this.selectedState}…</span>
        </div>

        <div class="predictions-grid">
          <div class="prediction-card border-orange">
            <div class="card-header">
              <div class="icon-box orange" style="width:40px;height:40px">${Components.icon('temperature', 20)}</div>
              <span class="badge badge-orange">Live Model</span>
            </div>
            <div id="temp-value" class="predicted-value" style="color:var(--accent-orange)">--°C</div>
            <div id="temp-label" class="predicted-label">Predicted Max Temperature (${this.selectedState}, ${startDate})</div>
            <div class="confidence-section">
              <div class="conf-header"><span>Confidence</span><span id="temp-confidence">--%</span></div>
              <div class="conf-bar"><div id="temp-bar" class="confidence-fill" data-value="0"></div></div>
            </div>
            <div class="card-gauge"><canvas id="gauge-temp" width="90" height="90"></canvas></div>
            <div id="temp-trend" class="trend-text">Loading live weather prediction…</div>
          </div>

          <div class="prediction-card border-cyan">
            <div class="card-header">
              <div class="icon-box cyan" style="width:40px;height:40px">${Components.icon('cloudRain', 20)}</div>
              <span class="badge badge-cyan badge-dot badge-pulse">Live Rain</span>
            </div>
            <div id="rain-value" class="predicted-value" style="color:var(--accent-cyan)">--mm</div>
            <div id="rain-label" class="predicted-label">Expected Rainfall (${this.selectedState})</div>
            <div class="confidence-section">
              <div class="conf-header"><span>Confidence</span><span id="rain-confidence">--%</span></div>
              <div class="conf-bar"><div id="rain-bar" class="confidence-fill" data-value="0"></div></div>
            </div>
            <div class="card-gauge"><canvas id="gauge-rain" width="90" height="90"></canvas></div>
            <div id="rain-trend" class="trend-text">Loading rainfall forecast…</div>
          </div>

          <div class="prediction-card border-red">
            <div class="card-header">
              <div class="icon-box red" style="width:40px;height:40px">${Components.icon('waves', 20)}</div>
              <span class="badge badge-red badge-dot badge-pulse">Live Risk</span>
            </div>
            <div id="flood-value" class="predicted-value" style="color:var(--accent-red)">--%</div>
            <div id="flood-label" class="predicted-label">Flood Probability — ${this.selectedState}</div>
            <div class="confidence-section">
              <div class="conf-header"><span>Confidence</span><span id="flood-confidence">--%</span></div>
              <div class="conf-bar"><div id="flood-bar" class="confidence-fill" data-value="0"></div></div>
            </div>
            <div class="card-gauge"><canvas id="gauge-flood" width="90" height="90"></canvas></div>
            <div id="flood-trend" class="trend-text">Loading flood-risk model…</div>
          </div>

          <div class="prediction-card border-green">
            <div class="card-header">
              <div class="icon-box green" style="width:40px;height:40px">${Components.icon('droplet', 20)}</div>
              <span class="badge badge-green">Humidity</span>
            </div>
            <div id="humidity-value" class="predicted-value" style="color:var(--accent-green)">--%</div>
            <div id="humidity-label" class="predicted-label">Relative Humidity (${this.selectedState})</div>
            <div class="confidence-section">
              <div class="conf-header"><span>Confidence</span><span id="humidity-confidence">--%</span></div>
              <div class="conf-bar"><div id="humidity-bar" class="confidence-fill" data-value="0"></div></div>
            </div>
            <div class="card-gauge"><canvas id="gauge-drought" width="90" height="90"></canvas></div>
            <div id="humidity-trend" class="trend-text">Loading humidity conditions…</div>
          </div>

          <div class="prediction-card border-purple">
            <div class="card-header">
              <div class="icon-box purple" style="width:40px;height:40px">${Components.icon('cloudLightning', 20)}</div>
              <span class="badge badge-orange badge-dot">Monitoring</span>
            </div>
            <div id="pressure-value" class="predicted-value" style="color:var(--accent-purple)">--%</div>
            <div id="pressure-label" class="predicted-label">Low Pressure Intensification Probability</div>
            <div class="confidence-section">
              <div class="conf-header"><span>Confidence</span><span id="pressure-confidence">--%</span></div>
              <div class="conf-bar"><div id="pressure-bar" class="confidence-fill" data-value="0"></div></div>
            </div>
            <div class="card-gauge"><canvas id="gauge-cyclone" width="90" height="90"></canvas></div>
            <div id="pressure-trend" class="trend-text">Loading pressure-system outlook…</div>
          </div>

          <div class="prediction-card border-orange">
            <div class="card-header">
              <div class="icon-box orange" style="width:40px;height:40px">${Components.icon('alert', 20)}</div>
              <span class="badge badge-orange badge-dot">Watch</span>
            </div>
            <div id="landslide-value" class="predicted-value" style="color:var(--accent-orange)">--%</div>
            <div id="landslide-label" class="predicted-label">Landslide Probability — Hills</div>
            <div class="confidence-section">
              <div class="conf-header"><span>Confidence</span><span id="landslide-confidence">--%</span></div>
              <div class="conf-bar"><div id="landslide-bar" class="confidence-fill" data-value="0"></div></div>
            </div>
            <div class="card-gauge"><canvas id="gauge-heatwave" width="90" height="90"></canvas></div>
            <div id="landslide-trend" class="trend-text">Loading slope-risk update…</div>
          </div>
        </div>

        <div class="forecast-timeline-section">
          <div class="section-header">
            <div>
              <h3>7-Day Forecast (${startDate} to ${endDate})</h3>
              <p class="section-subtitle" id="forecast-location-label">Live forecast near ${this.selectedState}</p>
            </div>
          </div>
          <div class="forecast-timeline" id="forecast-timeline-live">
            <div class="forecast-day today">
              <div class="day-name">Loading…</div>
            </div>
          </div>
        </div>

        ${Components.sectionHeader('AI Recommendations', `Automated action items — ${this.formatDisplayDate()}`)}
        <div class="recommendations-grid">
          <div class="recommendation-card sev-warning">
            <div class="rec-icon icon-box orange" style="width:40px;height:40px">${Components.icon('alert', 18)}</div>
            <div>
              <h5>Review active rainfall and flash-flood zones</h5>
              <p>Monitor the highest-risk districts in the next 24 hours using current rain intensity and forecasted accumulation.</p>
              <button class="btn btn-sm btn-secondary mt-2">Check Risk</button>
            </div>
          </div>
          <div class="recommendation-card sev-info">
            <div class="rec-icon icon-box green" style="width:40px;height:40px">${Components.icon('trendUp', 18)}</div>
            <div>
              <h5>Update irrigation and drainage plans</h5>
              <p>Use live rainfall totals and humidity levels to adjust water management and crop advisories.</p>
              <button class="btn btn-sm btn-secondary mt-2">Open Advisory</button>
            </div>
          </div>
        </div>

        <div class="insight-panel">
          <h4>${Components.icon('brain', 20)} AI Analysis Summary — ${this.formatDisplayDate()}</h4>
          <p id="ai-summary-text">Loading live climate assessment…</p>
        </div>
      </div>
    `;
  },

  animateConfidenceBars() {
    document.querySelectorAll('.confidence-fill').forEach(bar => {
      const target = bar.dataset.value + '%';
      setTimeout(() => { bar.style.width = target; }, 300);
    });
  },

  setupGauges() {
    const gauges = [
      { id: 'gauge-temp', value: 0, color: '#FFA726', label: 'Confidence' },
      { id: 'gauge-rain', value: 0, color: '#00C2FF', label: 'Confidence' },
      { id: 'gauge-flood', value: 0, color: '#FF5252', label: 'Probability' },
      { id: 'gauge-drought', value: 0, color: '#00E5A8', label: 'Humidity' },
      { id: 'gauge-cyclone', value: 0, color: '#A855F7', label: 'Low Press.' },
      { id: 'gauge-heatwave', value: 0, color: '#FFA726', label: 'Landslide' },
    ];
    gauges.forEach(g => {
      const canvas = document.getElementById(g.id);
      if (canvas) ChartEngine.drawGauge(canvas, g.value, 100, g.color, g.label);
    });
  },

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  formatForecastDate(date) {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short'
    }).format(new Date(`${date}T12:00:00`));
  },

  renderForecastTimeline(days) {
    const timeline = document.getElementById('forecast-timeline-live');
    if (!timeline) return;
    if (!Array.isArray(days) || days.length === 0) {
      timeline.innerHTML = '<div class="forecast-unavailable">Forecast data is currently unavailable.</div>';
      return;
    }

    timeline.innerHTML = days.map((day, index) => `
      <button class="forecast-day ${index === 0 ? 'today' : ''} ${index === this.selectedForecastIndex ? 'selected' : ''}"
        type="button" data-forecast-index="${index}" aria-pressed="${index === this.selectedForecastIndex}"
        aria-label="Show predictions for ${this.formatForecastDate(day.date)}">
        <span class="day-name">${index === 0 ? 'Today' : day.dayName}</span>
        <span class="forecast-icon">${Components.icon(day.icon || 'cloudRain', 22)}</span>
        <span class="day-temp">${Math.round(day.maxTemp)}°</span>
        <span class="day-range">${Math.round(day.minTemp)}° / ${Math.round(day.maxTemp)}°</span>
        <span class="day-condition">${day.condition || 'Forecast'}</span>
      </button>
    `).join('');
  },

  selectForecastDay(index) {
    const state = this.forecastState;
    const forecastDay = state?.forecast?.days?.[index];
    if (!forecastDay) return;

    this.selectedForecastIndex = index;
    const selectedState = state.location?.stateName || state.stateName;
    const placeName = state.location?.placeName || state.stateName;
    const locTitle = placeName.toLowerCase() === selectedState.toLowerCase() ? placeName : `${placeName} (${selectedState})`;
    const temperature = Math.round(forecastDay.maxTemp ?? state.current?.temp ?? 0);
    const rainfall = Math.max(0, Math.round(forecastDay.rain ?? state.current?.rainfall ?? 0));
    const humidity = Math.round(forecastDay.humidityMax ?? state.current?.humidity ?? 0);
    const pressure = Math.round(this.clamp(18 + rainfall * 0.25, 15, 92));
    const flood = Math.round(this.clamp(12 + rainfall * 0.45 + Math.max(0, humidity - 65) * 0.2, 8, 96));
    const landslide = Math.round(this.clamp(8 + rainfall * 0.32 + Math.max(0, humidity - 70) * 0.35, 5, 94));
    const tempConfidence = Math.min(96, Math.max(78, 92 - index));
    const rainConfidence = Math.min(98, Math.max(80, 84 + Math.round(rainfall / 10)));
    const floodConfidence = Math.min(97, Math.max(75, 80 + Math.round(flood / 10)));
    const humidityConfidence = Math.min(99, Math.max(80, 88 + (humidity > 80 ? 8 : 0)));
    const pressureConfidence = Math.min(95, Math.max(70, 80 + (pressure > 40 ? 9 : 0)));
    const landslideConfidence = Math.min(96, Math.max(72, 78 + Math.round(landslide / 8)));
    const dateLabel = this.formatForecastDate(forecastDay.date);
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setText('temp-value', `${temperature}°C`);
    setText('rain-value', `${rainfall}mm`);
    setText('flood-value', `${flood}%`);
    setText('humidity-value', `${humidity}%`);
    setText('pressure-value', `${pressure}%`);
    setText('landslide-value', `${landslide}%`);
    setText('temp-label', `Predicted Max Temperature (${locTitle}, ${dateLabel})`);
    setText('rain-label', `Expected Rainfall (${locTitle}, ${dateLabel})`);
    setText('flood-label', `Rainfall-Linked Flood Risk — ${locTitle} (${dateLabel})`);
    setText('humidity-label', `Relative Humidity (${locTitle}, ${dateLabel})`);
    setText('pressure-label', `Estimated Low-Pressure Signal — ${locTitle} (${dateLabel})`);
    setText('landslide-label', `Rainfall-Linked Slope Risk — ${locTitle} (${dateLabel})`);
    setText('temp-confidence', `${tempConfidence}%`);
    setText('rain-confidence', `${rainConfidence}%`);
    setText('flood-confidence', `${floodConfidence}%`);
    setText('humidity-confidence', `${humidityConfidence}%`);
    setText('pressure-confidence', `${pressureConfidence}%`);
    setText('landslide-confidence', `${landslideConfidence}%`);

    setText('temp-trend', `${dateLabel} forecast near ${placeName}: ${forecastDay.condition || 'conditions unavailable'}, with a high of ${temperature}°C.`);
    setText('rain-trend', `${dateLabel} forecast near ${placeName}: ${forecastDay.condition || 'conditions unavailable'}, with ${rainfall}mm expected rainfall.`);
    setText('flood-trend', `Estimated for ${selectedState} from ${dateLabel} rainfall (${rainfall}mm) and humidity (${humidity}%).`);
    setText('humidity-trend', `Forecast relative humidity near ${placeName} on ${dateLabel}: ${humidity}%.`);
    setText('pressure-trend', `Weather-based low-pressure indicator for ${selectedState} on ${dateLabel}: ${pressure}%.`);
    setText('landslide-trend', `Rainfall and humidity-based slope-risk estimate for ${selectedState} on ${dateLabel}: ${landslide}%.`);
    setText('ai-summary-text', `Forecast for ${selectedState} near ${placeName} on ${dateLabel}: high ${temperature}°C (${forecastDay.condition || 'conditions unavailable'}), expected rainfall ${rainfall}mm, and relative humidity ${humidity}%. Weather-based estimates indicate ${flood}% flood risk and ${landslide}% slope risk.`);

    setText('prediction-location-status', `Live weather near ${placeName}, ${selectedState}`);
    setText('forecast-location-label', `Live forecast near ${placeName}, ${selectedState}`);

    const confidenceValues = {
      'temp-bar': tempConfidence, 'rain-bar': rainConfidence, 'flood-bar': floodConfidence,
      'humidity-bar': humidityConfidence, 'pressure-bar': pressureConfidence, 'landslide-bar': landslideConfidence
    };
    Object.entries(confidenceValues).forEach(([id, value]) => {
      const bar = document.getElementById(id);
      if (bar) {
        bar.dataset.value = value;
        bar.style.width = `${value}%`;
      }
    });

    const gaugeValues = {
      'gauge-temp': tempConfidence, 'gauge-rain': rainConfidence, 'gauge-flood': floodConfidence,
      'gauge-drought': humidityConfidence, 'gauge-cyclone': pressureConfidence, 'gauge-heatwave': landslideConfidence
    };
    Object.entries(gaugeValues).forEach(([id, value]) => {
      const canvas = document.getElementById(id);
      if (canvas) ChartEngine.drawGauge(canvas, value, 100, id === 'gauge-flood' ? '#FF5252' : id === 'gauge-rain' ? '#00C2FF' : id === 'gauge-cyclone' ? '#A855F7' : '#FFA726', 'Forecast');
    });

    document.querySelectorAll('#forecast-timeline-live [data-forecast-index]').forEach(button => {
      const selected = Number(button.dataset.forecastIndex) === index;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  },

  async refreshLiveData() {
    if (typeof WeatherAPI === 'undefined') return;
    const requestId = ++this.refreshRequestId;
    const stateName = this.selectedState;
    const location = this.getStateLocation(stateName);
    const locationStatus = document.getElementById('prediction-location-status');
    if (!location) {
      if (locationStatus) locationStatus.textContent = `No forecast location available for ${stateName}`;
      return;
    }
    if (locationStatus) locationStatus.textContent = `Loading live data for ${stateName}…`;

    try {
      const [current, forecast] = await Promise.all([
        WeatherAPI.getCurrent(location.lat, location.lon),
        WeatherAPI.getForecast(location.lat, location.lon),
      ]);
      if (requestId !== this.refreshRequestId) return;
      if (!forecast?.days?.length) throw new Error(`Forecast unavailable for ${stateName}`);

      this.forecastState = {
        stateName, location, current, forecast
      };
      this.renderForecastTimeline(forecast.days);
      const lastIndex = Math.max(0, forecast.days.length - 1);
      this.selectForecastDay(Math.min(this.selectedForecastIndex, lastIndex));
      window.dispatchEvent(new CustomEvent('ai-predictions:forecast-updated', {
        detail: { stateName, location, current, forecast },
      }));

      const updatedAt = document.getElementById('prediction-last-updated');
      if (updatedAt) {
        updatedAt.textContent = `Last updated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST`;
      }
      console.log('Live AI predictions refreshed from current weather APIs');
    } catch (err) {
      if (requestId !== this.refreshRequestId) return;
      console.warn('AI prediction live refresh failed:', err.message);
      if (locationStatus) locationStatus.textContent = `Live forecast unavailable for ${stateName}`;
      this.renderForecastTimeline([]);
      const updatedAt = document.getElementById('prediction-last-updated');
      const summary = document.getElementById('ai-summary-text');
      if (updatedAt) updatedAt.textContent = 'Last updated: unavailable';
      if (summary) summary.textContent = `Live weather feed unavailable for ${stateName}.`;
    }
  }
};

window.PredictionsPage = PredictionsPage;

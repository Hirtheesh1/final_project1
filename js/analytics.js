/* =================================================================
   Analytics Page Logic
   ================================================================= */

const AnalyticsPage = {
  charts: {},
  selectedState: 'Delhi',
  forecastData: null,
  aqiData: null,
  requestId: 0,
  refreshTimer: null,
  listenersBound: false,

  init() {
    const container = document.getElementById('page-analytics');
    if (!container) return;
    clearInterval(this.refreshTimer);
    this.selectedState = PredictionsPage.selectedState || this.selectedState;
    this.charts = {};
    container.innerHTML = this.render();
    this.setupControls(container);
    this.bindPredictionUpdates();
    this.refreshFromPredictions();
    this.refreshTimer = setInterval(() => {
      if (App.currentPage === 'analytics') this.refreshFromPredictions();
    }, 5 * 60 * 1000);
  },

  render() {
    const states = LocationData.getStateList().map(state => state.name);
    return `
      <div class="analytics-page">
        ${Components.sectionHeader(
          'Climate Analytics',
          'Live seven-day outlook from the selected AI Predictions location',
          `<label class="analytics-state-control" for="analytics-state-select"><span>State / UT</span><select id="analytics-state-select">${states.map(name => `<option value="${name}" ${name === this.selectedState ? 'selected' : ''}>${name}</option>`).join('')}</select></label><button class="btn btn-sm btn-secondary" id="analytics-export" type="button">${Components.icon('download', 14)} Export Data</button>`
        )}
        <div class="analytics-data-status" id="analytics-data-status" role="status" aria-live="polite">Loading live forecast…</div>

        <div class="analytics-summary">
          ${Components.statCard({ label:'7-Day Mean High', value:'<span id="analytics-stat-temperature">—</span>', icon:'temperature', accent:'accent-green' })}
          ${Components.statCard({ label:'7-Day Rainfall', value:'<span id="analytics-stat-rainfall">—</span>', icon:'cloudRain', accent:'accent-cyan' })}
          ${Components.statCard({ label:'7-Day Mean Humidity', value:'<span id="analytics-stat-humidity">—</span>', icon:'droplet', accent:'accent-cyan' })}
          ${Components.statCard({ label:'Current AQI', value:'<span id="analytics-stat-aqi">—</span>', icon:'wind', accent:'accent-green' })}
        </div>

        <!-- Charts Grid -->
        <div class="analytics-grid">
          <!-- Temperature Trends -->
          <div class="chart-card">
            <div class="chart-header">
              <h5>${Components.icon('temperature', 16)} Temperature Trends</h5>
              <span class="analytics-chart-period">7-day forecast</span>
            </div>
            <div class="chart-canvas-wrapper"><canvas id="chart-temp"></canvas></div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot" style="background:#FF5252"></span> Max Temp</span>
              <span class="legend-item"><span class="legend-dot" style="background:#00C2FF"></span> Min Temp</span>
              <span class="legend-item"><span class="legend-dot" style="background:#00E5A8"></span> Average</span>
            </div>
          </div>

          <!-- Rainfall Patterns -->
          <div class="chart-card">
            <div class="chart-header">
              <h5>${Components.icon('cloudRain', 16)} Rainfall Patterns</h5>
              <span class="analytics-chart-period">7-day forecast</span>
            </div>
            <div class="chart-canvas-wrapper"><canvas id="chart-rain"></canvas></div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot" style="background:#00C2FF"></span> Rainfall (mm)</span>
            </div>
          </div>

          <!-- Humidity Levels -->
          <div class="chart-card">
            <div class="chart-header">
              <h5>${Components.icon('droplet', 16)} Humidity Levels</h5>
              <span class="analytics-chart-period">7-day forecast</span>
            </div>
            <div class="chart-canvas-wrapper"><canvas id="chart-humidity"></canvas></div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot" style="background:#A855F7"></span> Relative Humidity (%)</span>
            </div>
          </div>

          <!-- Wind Speed -->
          <div class="chart-card">
            <div class="chart-header">
              <h5>${Components.icon('wind', 16)} Wind Speed</h5>
              <span class="analytics-chart-period">7-day forecast</span>
            </div>
            <div class="chart-canvas-wrapper"><canvas id="chart-wind"></canvas></div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot" style="background:#FFA726"></span> Avg Wind Speed (km/h)</span>
            </div>
          </div>

          <!-- Air Quality Index -->
          <div class="chart-card">
            <div class="chart-header">
              <h5>${Components.icon('cloud', 16)} Current Air Quality</h5>
              <span class="analytics-chart-period">Selected state</span>
            </div>
            <div class="analytics-aqi-reading" id="analytics-aqi-reading">
              <strong id="analytics-aqi-value">—</strong>
              <span id="analytics-aqi-category">Waiting for AQI feed</span>
              <div class="analytics-aqi-track"><div id="analytics-aqi-fill"></div></div>
              <span id="analytics-aqi-location"></span>
            </div>
          </div>

          <!-- Temperature Departure -->
          <div class="chart-card">
            <div class="chart-header">
              <h5>${Components.icon('trendUp', 16)} Forecast Departure from Current</h5>
              <span class="analytics-chart-period">Daily high minus current</span>
            </div>
            <div class="chart-canvas-wrapper"><canvas id="chart-anomaly"></canvas></div>
            <div class="chart-legend">
                <span class="legend-item"><span class="legend-dot" style="background:#FF5252"></span> Daily high minus current (°C)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setupControls(container) {
    container.querySelector('#analytics-state-select')?.addEventListener('change', event => {
      this.selectedState = event.target.value;
      PredictionsPage.selectedState = this.selectedState;
      this.setStatus(`Loading AI forecast for ${this.selectedState}…`);
      PredictionsPage.refreshLiveData();
    });
    container.querySelector('#analytics-export')?.addEventListener('click', () => this.exportData());
  },

  bindPredictionUpdates() {
    if (this.listenersBound) return;
    window.addEventListener('ai-predictions:forecast-updated', event => {
      if (App.currentPage === 'analytics' && event.detail?.stateName === this.selectedState) {
        this.applyPredictionData(event.detail);
      }
    });
    this.listenersBound = true;
  },

  setStatus(message) {
    const status = document.getElementById('analytics-data-status');
    if (status) status.textContent = message;
  },

  refreshFromPredictions() {
    this.selectedState = PredictionsPage.selectedState || this.selectedState;
    const selector = document.getElementById('analytics-state-select');
    if (selector) selector.value = this.selectedState;
    this.setStatus(`Loading AI forecast for ${this.selectedState}…`);

    if (PredictionsPage.forecastState?.stateName === this.selectedState) {
      this.applyPredictionData(PredictionsPage.forecastState);
    }
    PredictionsPage.selectedState = this.selectedState;
    PredictionsPage.refreshLiveData();
  },

  chart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    if (!this.charts[canvasId] || this.charts[canvasId].canvas !== canvas) {
      this.charts[canvasId] = new ChartEngine(canvas);
    }
    return this.charts[canvasId];
  },

  async applyPredictionData(data) {
    if (!data?.forecast?.days?.length || !data.location) return;
    const requestId = ++this.requestId;
    this.selectedState = data.stateName;
    const selector = document.getElementById('analytics-state-select');
    if (selector) selector.value = data.stateName;
    this.forecastData = data;
    this.setStatus(`Updating current AQI for ${data.location.placeName}, ${data.stateName}…`);

    const aqiData = await WeatherAPI.getAQI(data.location.lat, data.location.lon);
    if (requestId !== this.requestId || App.currentPage !== 'analytics') return;
    this.aqiData = aqiData;
    this.renderLiveAnalytics();
  },

  renderLiveAnalytics() {
    const data = this.forecastData;
    if (!data?.forecast?.days?.length) return;
    const days = data.forecast.days;
    const labels = days.map(day => PredictionsPage.formatForecastDate(day.date));
    const maxTemps = days.map(day => Number(day.maxTemp));
    const minTemps = days.map(day => Number(day.minTemp));
    const averageTemps = days.map((day, index) => (maxTemps[index] + minTemps[index]) / 2);
    const rainfall = days.map(day => Number(day.rain));
    const humidityMax = days.map(day => Number(day.humidityMax));
    const humidityMin = days.map(day => Number(day.humidityMin));
    const wind = days.map(day => Number(day.wind));
    const currentTemp = Number(data.current?.temp);
    const departure = maxTemps.map(value => value - currentTemp);
    const finiteForecast = [
      ...maxTemps, ...minTemps, ...rainfall, ...humidityMax, ...humidityMin, ...wind
    ].every(Number.isFinite);

    if (!finiteForecast || !Number.isFinite(currentTemp)) {
      this.setStatus(`AI forecast is incomplete for ${data.location.placeName}, ${data.stateName}.`);
      return;
    }

    const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
    const totalRain = rainfall.reduce((total, value) => total + value, 0);
    const meanHumidity = mean(humidityMax);
    const averageMax = mean(maxTemps);
    const aqi = this.aqiData?.aqi;
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setText('analytics-stat-temperature', `${averageMax.toFixed(1)} °C`);
    setText('analytics-stat-rainfall', `${totalRain.toFixed(1)} mm`);
    setText('analytics-stat-humidity', `${meanHumidity.toFixed(0)} %`);
    setText('analytics-stat-aqi', Number.isFinite(aqi) ? `${aqi} · ${this.aqiData.category}` : 'Unavailable');
    setText('analytics-aqi-value', Number.isFinite(aqi) ? String(aqi) : '—');
    setText('analytics-aqi-category', this.aqiData?.category || 'AQI feed unavailable');
    setText('analytics-aqi-location', `${data.location.placeName}, ${data.stateName}`);

    const aqiFill = document.getElementById('analytics-aqi-fill');
    if (aqiFill) {
      aqiFill.style.width = `${Number.isFinite(aqi) ? Math.min(100, Math.max(0, aqi / 5)) : 0}%`;
      aqiFill.style.backgroundColor = this.aqiData?.color || 'var(--text-muted)';
    }

    this.chart('chart-temp')?.drawLineChart(labels, [
      { label: 'Daily max (°C)', data: maxTemps, color: '#FF5252', lineWidth: 2 },
      { label: 'Daily min (°C)', data: minTemps, color: '#00C2FF', lineWidth: 2 },
      { label: 'Daily mean (°C)', data: averageTemps, color: '#00E5A8', fill: true, lineWidth: 2 },
    ]);
    this.chart('chart-rain')?.drawBarChart(labels, [
      { label: 'Forecast rainfall (mm)', data: rainfall, color: '#00C2FF' },
    ]);
    this.chart('chart-humidity')?.drawLineChart(labels, [
      { label: 'Maximum RH (%)', data: humidityMax, color: '#A855F7', fill: true },
      { label: 'Minimum RH (%)', data: humidityMin, color: '#00C2FF', lineWidth: 2 },
    ]);
    this.chart('chart-wind')?.drawLineChart(labels, [
      { label: 'Maximum wind (km/h)', data: wind, color: '#FFA726', fill: true },
    ]);
    this.chart('chart-anomaly')?.drawBarChart(labels, [
      { label: 'Daily max minus current (°C)', data: departure, color: '#FF5252' },
    ]);

    this.setStatus(`AI Predictions feed · ${data.location.placeName}, ${data.stateName} · updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST`);
  },

  exportData() {
    if (!this.forecastData) {
      Components.showToast('No live forecast data to export yet.', 'info');
      return;
    }
    const report = {
      source: 'AI Predictions / Open-Meteo',
      generatedAt: new Date().toISOString(),
      state: this.forecastData.stateName,
      location: this.forecastData.location,
      current: this.forecastData.current,
      forecast: this.forecastData.forecast,
      airQuality: this.aqiData,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `climate-analytics-${this.forecastData.stateName.toLowerCase().replaceAll(' ', '-')}-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
};

window.AnalyticsPage = AnalyticsPage;

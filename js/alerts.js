/* =================================================================
   Alerts & Disaster Monitoring Page Logic
   ================================================================= */

const AlertsPage = {
  activeFilter: 'all',
  activeView: 'twin',
  alerts: [],
  selectedState: 'Delhi',
  refreshRequestId: 0,
  refreshTimer: null,
  listenersBound: false,
  viewStatus: '',
  predictionThresholds: {
    rainfall: { critical: 100, warning: 50, watch: 20 },
    temperature: { critical: 40, warning: 35 },
    wind: { critical: 60, warning: 40 },
    humidity: { watch: 90 },
  },
  twinThresholds: {
    rainfall: { critical: 300, warning: 150, watch: 75, unit: 'mm' },
    temperature: { critical: 40, warning: 35, watch: 30, unit: '°C' },
    humidity: { critical: 20, warning: 18, watch: 16, unit: 'g/kg' },
  },

  init() {
    const container = document.getElementById('page-alerts');
    if (!container) return;
    clearInterval(this.refreshTimer);
    container.innerHTML = this.render();
    this.setupControls(container);
    this.bindDataEvents();
    this.showView(this.activeView);
    this.refreshTimer = setInterval(() => {
      if (App.currentPage === 'alerts' && this.activeView === 'predictions') this.refreshPredictionAlerts();
    }, 5 * 60 * 1000);
  },

  render() {
    return `
      <div class="alerts-page">
        ${Components.sectionHeader(
          'Alerts & Disaster Monitoring',
          'Model-derived climate signals and live forecast screening',
          `<button class="btn btn-sm btn-secondary" id="alerts-export" type="button">${Components.icon('download', 14)} Export</button>`
        )}

        <div class="alerts-view-tabs" role="tablist" aria-label="Alert source">
          <button class="alerts-view-tab ${this.activeView === 'twin' ? 'active' : ''}" id="alerts-tab-twin" type="button" role="tab" aria-selected="${this.activeView === 'twin'}" aria-controls="alerts-view" data-view="twin">
            ${Components.icon('globe', 14)} Climate Twin
          </button>
          <button class="alerts-view-tab ${this.activeView === 'predictions' ? 'active' : ''}" id="alerts-tab-predictions" type="button" role="tab" aria-selected="${this.activeView === 'predictions'}" aria-controls="alerts-view" data-view="predictions">
            ${Components.icon('brain', 14)} AI Predictions
          </button>
        </div>

        <div class="alerts-summary" id="alerts-summary" aria-live="polite"></div>
        <div class="alert-filters" id="alert-filters"></div>
        <div id="alerts-view" role="tabpanel" aria-labelledby="alerts-tab-${this.activeView}">
          <div class="alerts-loading">Loading alert data…</div>
        </div>
      </div>
    `;
  },

  setupControls(container) {
    container.querySelector('.alerts-view-tabs')?.addEventListener('click', event => {
      const tab = event.target.closest('[data-view]');
      if (tab) this.showView(tab.dataset.view);
    });
    container.querySelector('#alert-filters')?.addEventListener('click', event => {
      const filter = event.target.closest('[data-filter]');
      if (!filter) return;
      this.activeFilter = filter.dataset.filter;
      this.renderFilterControls();
      this.renderAlertList();
    });
    container.querySelector('#alerts-export')?.addEventListener('click', () => this.exportReport());
    container.addEventListener('change', event => {
      if (event.target.id === 'alerts-state-select') {
        this.selectedState = event.target.value;
        this.refreshPredictionAlerts();
      }
    });
  },

  bindDataEvents() {
    if (this.listenersBound) return;
    window.addEventListener('climate-twin:simulation-updated', event => {
      if (App.currentPage === 'alerts' && this.activeView === 'twin') this.loadTwinAlerts(event.detail?.data);
    });
    window.addEventListener('ai-predictions:forecast-updated', event => {
      const forecast = event.detail;
      if (App.currentPage === 'alerts' && this.activeView === 'predictions' && forecast?.stateName === this.selectedState) {
        this.buildPredictionAlerts(forecast);
      }
    });
    this.listenersBound = true;
  },

  showView(view) {
    this.activeView = view === 'predictions' ? 'predictions' : 'twin';
    this.activeFilter = 'all';
    document.querySelectorAll('.alerts-view-tab').forEach(tab => {
      const selected = tab.dataset.view === this.activeView;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    const panel = document.getElementById('alerts-view');
    if (panel) panel.setAttribute('aria-labelledby', `alerts-tab-${this.activeView}`);
    this.alerts = [];
    this.viewStatus = this.activeView === 'twin' ? 'Waiting for Climate Twin data.' : 'Loading live forecast data…';
    this.renderFilterControls();
    this.renderSummary();
    if (this.activeView === 'twin') this.loadTwinAlerts();
    else this.refreshPredictionAlerts();
  },

  getSeverity(value, thresholds) {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    if (value >= thresholds.watch) return 'watch';
    return null;
  },

  loadTwinAlerts(data = TwinPage?.lastSimulationData) {
    const panel = document.getElementById('alerts-view');
    if (!panel) return;
    if (!data?.grid || !data?.metadata?.simulation_period) {
      this.alerts = [];
      this.viewStatus = 'Run a Climate Twin simulation to generate model-based state alerts.';
      panel.innerHTML = `
        <div class="alerts-empty-state">
          <h4>No Climate Twin run available</h4>
          <p>Run a simulation to evaluate state-level rainfall, temperature, and humidity signals.</p>
          <button class="btn btn-sm btn-primary" type="button" data-open-page="twin">${Components.icon('globe', 14)} Open Climate Twin</button>
        </div>`;
      panel.querySelector('[data-open-page="twin"]')?.addEventListener('click', () => App.navigate('twin'));
      this.renderFilterControls();
      this.renderSummary();
      return;
    }

    try {
      const layerValues = Object.fromEntries(['rainfall', 'temperature', 'specificHumidity'].map(layer => [
        layer,
        IndiaMap._deriveStateValuesFromGrid(data.grid, layer),
      ]));
      const states = Object.keys(IndiaMap.states).map(name => ({
        name,
        rainfall: layerValues.rainfall[name],
        temperature: layerValues.temperature[name],
        humidity: layerValues.specificHumidity[name],
      }));
      this.alerts = states.flatMap(state => {
        const signals = [];
        const addSignal = (metric, value, thresholds, icon, description, precision) => {
          const severity = this.getSeverity(value, thresholds);
          if (!severity) return;
          const threshold = thresholds[severity];
          signals.push({
            id: `${state.name}-${metric}-${severity}`,
            severity,
            icon,
            type: description,
            metric: `${value.toFixed(precision)} ${thresholds.unit}`,
            desc: `${description} is ${value.toFixed(precision)} ${thresholds.unit}; the ${severity} screening threshold is ${threshold} ${thresholds.unit}.`,
          });
        };

        addSignal('rainfall', state.rainfall, this.twinThresholds.rainfall, 'cloudRain', 'Modeled rainfall', 1);
        addSignal('temperature', state.temperature, this.twinThresholds.temperature, 'temperature', 'Modeled temperature', 1);
        addSignal('humidity', state.humidity, this.twinThresholds.humidity, 'droplet', 'Modeled specific humidity', 2);
        return signals.map(signal => ({ ...signal, location: state.name, date: data.metadata.simulation_period }));
      });
      this.viewStatus = `Climate Twin scenario · ${data.metadata.simulation_period} · ${data.metadata.baseline_source} · fixed screening thresholds`;
      this.renderTwinPanel(data);
    } catch (error) {
      this.alerts = [];
      this.viewStatus = `Cannot build alerts from this simulation: ${error.message}`;
      panel.innerHTML = `<div class="alerts-empty-state"><h4>Simulation data unavailable</h4><p>${this.viewStatus}</p></div>`;
    }

    this.renderFilterControls();
    this.renderSummary();
    this.renderAlertList();
  },

  renderTwinPanel(data) {
    const panel = document.getElementById('alerts-view');
    panel.innerHTML = `
      <div class="alerts-source-note">Synthetic scenario values are checked against fixed screening thresholds. Signals are not official emergency warnings.</div>
      <div class="alerts-layout">
        <div class="alerts-map-container">
          <div id="alerts-map" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>
          <div class="alert-map-legend">
            <div class="legend-title">Modelled rainfall</div>
            <div class="legend-gradient" style="background:${IndiaMap.getLegendGradient('rainfall')}"></div>
            <div class="legend-scale"><span>0 mm</span><span>250 mm</span><span>500 mm</span></div>
          </div>
        </div>
        <div class="alerts-results-panel">
          <div class="alerts-source-heading">
            <span class="alerts-source-meta">${data.metadata.simulation_period} · Run ${TwinPage.successfulSimulationCount}</span>
            <button class="btn btn-sm btn-secondary" type="button" data-open-page="twin">Open Climate Twin</button>
          </div>
          <div class="alerts-list" id="alerts-list"></div>
        </div>
      </div>`;
    panel.querySelector('[data-open-page="twin"]')?.addEventListener('click', () => App.navigate('twin'));
    IndiaMap.render('alerts-map', {
      activeLayer: 'rainfall', showLabels: true, modelGrid: data.grid,
      simulationPeriod: data.metadata.simulation_period,
      simulationRunId: TwinPage.successfulSimulationCount,
      onStateClick: (name, value) => Components.showToast(`${name}: ${value.toFixed(1)} mm modeled rainfall`, 'info'),
    });
  },

  async refreshPredictionAlerts() {
    const panel = document.getElementById('alerts-view');
    if (!panel || App.currentPage !== 'alerts' || this.activeView !== 'predictions') return;
    const requestId = ++this.refreshRequestId;
    const stateName = this.selectedState;
    const location = PredictionsPage.getStateLocation(stateName);
    if (!location) {
      this.alerts = [];
      this.viewStatus = `No forecast location available for ${stateName}.`;
      this.renderPredictionPanel(null);
      return;
    }

    this.alerts = [];
    this.viewStatus = `Loading forecast for ${stateName}…`;
    this.renderPredictionPanel(null);
    this.renderFilterControls();
    this.renderSummary();

    try {
      const [current, forecast] = await Promise.all([
        WeatherAPI.getCurrent(location.lat, location.lon),
        WeatherAPI.getForecast(location.lat, location.lon),
      ]);
      if (requestId !== this.refreshRequestId || this.activeView !== 'predictions') return;
      if (!forecast?.days?.length) throw new Error(`Forecast feed unavailable for ${stateName}`);
      this.buildPredictionAlerts({ stateName, location, current, forecast });
    } catch (error) {
      if (requestId !== this.refreshRequestId || this.activeView !== 'predictions') return;
      this.alerts = [];
      this.viewStatus = `Live forecast unavailable: ${error.message}`;
      this.renderPredictionPanel(null);
      this.renderFilterControls();
      this.renderSummary();
      this.renderAlertList();
    }
  },

  buildPredictionAlerts(data) {
    if (!data?.forecast?.days) return;
    this.selectedState = data.stateName;
    const thresholds = this.predictionThresholds;
    this.alerts = data.forecast.days.flatMap(day => {
      const date = PredictionsPage.formatForecastDate(day.date);
      const signals = [];
      const addSignal = (metric, value, rules, icon, unit, description) => {
        const severity = value >= rules.critical ? 'critical'
          : value >= rules.warning ? 'warning'
          : value >= rules.watch ? 'watch' : null;
        if (severity) signals.push({
          id: `${day.date}-${metric}`, date, severity, icon,
          type: description, location: `${data.location.placeName}, ${data.stateName}`,
          metric: `${value.toFixed(1)} ${unit}`,
          desc: `Forecast ${metric} is ${value.toFixed(1)} ${unit}; screening threshold for this level is ${rules[severity]} ${unit}.`,
        });
      };

      addSignal('rainfall', Number(day.rain), thresholds.rainfall, 'cloudRain', 'mm', 'Rainfall forecast');
      addSignal('maximum temperature', Number(day.maxTemp), thresholds.temperature, 'temperature', '°C', 'High-temperature forecast');
      addSignal('maximum wind speed', Number(day.wind), thresholds.wind, 'wind', 'km/h', 'High-wind forecast');
      addSignal('maximum relative humidity', Number(day.humidityMax), thresholds.humidity, 'droplet', '%', 'High-humidity forecast');
      return signals;
    });
    this.viewStatus = `Open-Meteo 7-day forecast · ${data.location.placeName}, ${data.stateName}`;
    this.renderPredictionPanel(data);
    this.renderFilterControls();
    this.renderSummary();
    this.renderAlertList();
  },

  renderPredictionPanel(data) {
    const panel = document.getElementById('alerts-view');
    if (!panel) return;
    const states = LocationData.getStateList().map(state => state.name);
    const selectedState = data?.stateName || this.selectedState;
    const metrics = data ? `
      <div class="prediction-alert-metrics">
        <div><span>Current</span><strong>${Number.isFinite(data.current?.temp) ? `${data.current.temp.toFixed(1)} °C` : '—'}</strong></div>
        <div><span>7-day maximum rain</span><strong>${Math.max(...data.forecast.days.map(day => Number(day.rain) || 0)).toFixed(1)} mm</strong></div>
        <div><span>7-day maximum temperature</span><strong>${Math.max(...data.forecast.days.map(day => Number(day.maxTemp) || 0)).toFixed(1)} °C</strong></div>
      </div>` : `<div class="alerts-empty-state">${this.viewStatus}</div>`;

    panel.innerHTML = `
      <div class="prediction-alert-toolbar">
        <label for="alerts-state-select">State / UT</label>
        <select id="alerts-state-select" aria-label="Select state for forecast alerts">
          ${states.map(name => `<option value="${name}" ${name === selectedState ? 'selected' : ''}>${name}</option>`).join('')}
        </select>
        <span class="alerts-source-meta">${this.viewStatus}</span>
        <button class="btn btn-sm btn-secondary" type="button" data-open-page="predictions">Open AI Predictions</button>
      </div>
      ${metrics}
      <div class="alerts-source-note">Rule-based screening of live forecasts. These are model signals, not official alerts or confirmed incidents.</div>
      <div class="alerts-list" id="alerts-list"></div>`;
    panel.querySelector('[data-open-page="predictions"]')?.addEventListener('click', () => App.navigate('predictions'));
  },

  renderFilterControls() {
    const container = document.getElementById('alert-filters');
    if (!container) return;
    const counts = ['all', 'critical', 'warning', 'watch', 'info'].map(filter => ({
      filter,
      count: filter === 'all' ? this.alerts.length : this.alerts.filter(alert => alert.severity === filter).length,
    }));
    container.innerHTML = counts.map(({ filter, count }) => `
      <button class="alert-filter-chip ${this.activeFilter === filter ? 'active' : ''}" type="button" data-filter="${filter}" aria-pressed="${this.activeFilter === filter}">
        ${filter === 'all' ? 'All signals' : filter[0].toUpperCase() + filter.slice(1)} (${count})
      </button>`).join('');
  },

  renderSummary() {
    const summary = document.getElementById('alerts-summary');
    if (!summary) return;
    const criticalCount = this.alerts.filter(alert => alert.severity === 'critical').length;
    summary.innerHTML = `
      <div class="alerts-summary-item"><span>Signals</span><strong>${this.alerts.length}</strong></div>
      <div class="alerts-summary-item"><span>Critical</span><strong>${criticalCount}</strong></div>
      <div class="alerts-summary-item"><span>Source</span><strong>${this.activeView === 'twin' ? 'Climate Twin' : 'AI forecast'}</strong></div>
      <div class="alerts-summary-meta">${this.viewStatus}</div>`;
  },

  renderAlertList() {
    const list = document.getElementById('alerts-list');
    if (!list) return;
    const visibleAlerts = this.alerts.filter(alert => this.activeFilter === 'all' || alert.severity === this.activeFilter);
    if (!visibleAlerts.length) {
      list.innerHTML = `<div class="alerts-empty-state">${this.alerts.length ? 'No signals match this severity filter.' : this.activeView === 'predictions' && this.viewStatus.includes('Open-Meteo') ? 'No forecast values crossed the screening thresholds.' : this.viewStatus}</div>`;
      return;
    }
    list.innerHTML = visibleAlerts.map(alert => `
      <article class="alert-item ${alert.severity}" data-severity="${alert.severity}">
        <div class="alert-icon-box">${Components.icon(alert.icon, 20)}</div>
        <div class="alert-content">
          <div class="alert-title">${alert.type} ${Components.badge(alert.severity.toUpperCase(), alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'orange' : 'cyan', true)}</div>
          <div class="alert-location">${Components.icon('map', 10)} ${alert.location} · ${alert.date}</div>
          <div class="alert-desc">${alert.desc}</div>
          <div class="alert-footer"><span class="alert-metric">${alert.metric}</span><span class="alert-source-tag">${this.activeView === 'twin' ? 'Scenario model' : 'Forecast screening'}</span></div>
        </div>
      </article>`).join('');
    requestAnimationFrame(() => Animations.staggerEntrance(document.querySelectorAll('.alert-item'), 50));
  },

  exportReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      source: this.activeView,
      status: this.viewStatus,
      alerts: this.alerts,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `climate-alerts-${this.activeView}-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

window.AlertsPage = AlertsPage;

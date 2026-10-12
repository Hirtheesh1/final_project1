/* =================================================================
   Digital Twin Simulation Page Logic
   Expanded with Multi-Dimensional Climate Variables & Scenarios
   ================================================================= */

const SimulationPage = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  isPlaying: false,
  playTimer: null,
  updateTimer: null,
  requestId: 0,
  playbackToken: 0,
  activeScenario: 'baseline',
  activeLayer: 'rainfall',
  speed: 1,
  scenarioParameters: {
    baseline: { physicsWeight: 0.75, oceanHeat: 1.2, greenspace: 90, aerosol: 30, iodIndex: 0.0, urbanization: 35, carbonForcing: 2.6 },
    warming1: { physicsWeight: 0.75, oceanHeat: 1.5, greenspace: 85, aerosol: 25, iodIndex: 0.3, urbanization: 40, carbonForcing: 1.5 },
    warming2: { physicsWeight: 0.80, oceanHeat: 2.0, greenspace: 75, aerosol: 38, iodIndex: 0.8, urbanization: 55, carbonForcing: 3.5 },
    warming3: { physicsWeight: 0.85, oceanHeat: 3.0, greenspace: 60, aerosol: 55, iodIndex: 1.5, urbanization: 75, carbonForcing: 5.5 },
    monsoon:  { physicsWeight: 0.78, oceanHeat: 2.4, greenspace: 80, aerosol: 35, iodIndex: -1.4, urbanization: 45, carbonForcing: 2.8 },
    megadrought: { physicsWeight: 0.82, oceanHeat: 2.8, greenspace: 45, aerosol: 50, iodIndex: 2.1, urbanization: 65, carbonForcing: 4.5 },
    netzero:  { physicsWeight: 0.90, oceanHeat: 0.6, greenspace: 100, aerosol: 15, iodIndex: -0.2, urbanization: 20, carbonForcing: 1.2 },
    cyclone:  { physicsWeight: 0.85, oceanHeat: 3.5, greenspace: 70, aerosol: 40, iodIndex: 1.2, urbanization: 60, carbonForcing: 4.8 },
  },

  init() {
    clearTimeout(this.playTimer);
    clearTimeout(this.updateTimer);
    this.isPlaying = false;
    this.playbackToken++;
    const container = document.getElementById('page-simulation');
    if (!container) return;
    container.innerHTML = this.render();
    this.setupTimeline();
    this.setupScenarios();
    this.setupPlayback();
    this.setupSpeed();
    this.setupLayerControl();
    this.updateSimulation();
  },

  render() {
    const scenarios = [
      { key: 'baseline', name: 'Current Trajectory', desc: 'SSP2-4.5 business-as-usual', color: '#00C2FF' },
      { key: 'warming1', name: '+1.5°C Paris Stabilization', desc: 'Sustainable low-emissions goal', color: '#00E5A8' },
      { key: 'warming2', name: '+2.0°C Moderate Warming', desc: 'Intermediate global forcing', color: '#FFA726' },
      { key: 'warming3', name: '+3.0°C Extreme Fossil (SSP5)', desc: 'High emissions radiative forcing', color: '#FF5252' },
      { key: 'monsoon', name: 'Intense La Niña Surge', desc: 'Severe cloudburst & flood runoff', color: '#A855F7' },
      { key: 'megadrought', name: 'Deccan & Kongu Megadrought', desc: 'Positive IOD & severe soil aridity', color: '#E11D48' },
      { key: 'netzero', name: 'National Green Transition', desc: 'COP30 afforestation & low aerosol', color: '#10B981' },
      { key: 'cyclone', name: 'Bay of Bengal Super-Cyclone', desc: 'Extreme ocean heat content flux', color: '#3B82F6' },
    ];

    const decades = Array.from({ length: 11 }, (_, index) => String(1950 + index * 10));
    const months = Array.from({ length: 12 }, (_, index) => ({
      value: index + 1,
      label: new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2025, index, 1)),
    }));

    const mapLayerOptions = Object.entries(IndiaMap.modelLayers).map(([key, layer]) =>
      `<option value="${key}" ${key === this.activeLayer ? 'selected' : ''}>${layer.label} (${layer.unit})</option>`
    ).join('');

    return `
      <div class="simulation-page">
        ${Components.sectionHeader(
          'Digital Twin Simulation',
          'Explore year-by-year and month-by-month surrogate scenarios with physics-informed FNO models across multi-dimensional climate variables.',
          `<span class="badge badge-purple badge-dot">PINN Climate Surrogate</span>`
        )}

        <div class="simulation-layout">
          <!-- Main Area -->
          <div class="simulation-main">
            <!-- Year Display -->
            <div class="year-display">
              <div class="year-number" id="sim-year">${this.currentYear}</div>
              <div class="year-label" id="sim-month-label">${months[this.currentMonth - 1]?.label} · Simulation Period</div>
            </div>

            <!-- Map Container with Layer Picker -->
            <div class="sim-map-container" style="position: relative;">
              <div style="position: absolute; top: 12px; right: 12px; z-index: 10; background: rgba(8,12,28,0.85); border: 1px solid rgba(0,194,255,0.25); border-radius: 8px; padding: 6px 10px; backdrop-filter: blur(8px); display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Field Layer:</span>
                <select id="sim-layer-select" style="background: rgba(5,8,20,0.9); border: 1px solid rgba(0,194,255,0.3); color: #fff; font-size: 11px; padding: 3px 6px; border-radius: 4px;">
                  ${mapLayerOptions}
                </select>
              </div>
              <div id="simulation-map" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>
            </div>

            <!-- Timeline -->
            <div class="timeline-container">
              <div class="timeline-header">
                <div class="playback-controls">
                  <button class="play-btn" id="play-btn" title="Play/Pause">
                    ${Components.icon('play', 20)}
                  </button>
                  <div class="speed-selector">
                    <button class="speed-btn active" data-speed="1">1×</button>
                    <button class="speed-btn" data-speed="2">2×</button>
                    <button class="speed-btn" data-speed="5">5×</button>
                  </div>
                </div>
                <label class="timeline-month-control" for="timeline-month">Month
                  <select id="timeline-month">
                    ${months.map(month => `<option value="${month.value}" ${month.value === this.currentMonth ? 'selected' : ''}>${month.label}</option>`).join('')}
                  </select>
                </label>
              </div>

              <div class="simulation-status" id="simulation-status" role="status" aria-live="polite">Loading model output…</div>

              <div class="timeline-slider">
                <input type="range" id="timeline-slider" min="1950" max="2050" value="${this.currentYear}" step="1" />
              </div>
              <div class="timeline-markers">
                ${decades.map(d => `<span>${d}</span>`).join('')}
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            <!-- Scenario Selection -->
            <div class="scenario-panel" style="max-height: 420px; overflow-y: auto;">
              <h5 class="flex items-center gap-2 mb-3" style="font-size:var(--text-sm)">
                ${Components.icon('layers', 16)} Climate Forcing Scenarios
              </h5>
              ${scenarios.map(s => `
                <button class="scenario-option ${s.key === this.activeScenario ? 'active' : ''}" data-scenario="${s.key}" style="margin-bottom: 6px;">
                  <span class="sc-dot" style="background:${s.color}"></span>
                  <div>
                    <div class="sc-name">${s.name}</div>
                    <div class="sc-desc">${s.desc}</div>
                  </div>
                </button>
              `).join('')}
            </div>

            <!-- Expanded Simulation Results -->
            <div class="sim-results" style="display: flex; flex-direction: column; gap: 8px;">
              <h5 class="flex items-center gap-2 mb-2" style="font-size:var(--text-sm)">
                ${Components.icon('activity', 16)} Multi-Variable Results
              </h5>

              <div class="result-metric">
                <div>
                  <div class="rm-label">Surface Temperature</div>
                  <div class="result-value" data-metric="temperature">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Mean Rainfall</div>
                  <div class="result-value" data-metric="meanRainfall">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Peak Rainfall</div>
                  <div class="result-value" data-metric="peakRainfall">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Soil Moisture Content</div>
                  <div class="result-value" data-metric="soilMoisture" style="color: #00E5A8;">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Solar Irradiance Flux</div>
                  <div class="result-value" data-metric="solarRadiation" style="color: #FFB300;">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Cloud Cover Fraction</div>
                  <div class="result-value" data-metric="cloudCover" style="color: #60A5FA;">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Vapor Pressure Deficit (VPD)</div>
                  <div class="result-value" data-metric="vpd" style="color: #F87171;">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Ensemble Uncertainty Spread</div>
                  <div class="result-value" data-metric="ensembleSpread">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Drought Risk (Surrogate)</div>
                  <div class="result-value" data-metric="droughtRisk">—</div>
                </div>
              </div>
              <div class="result-metric">
                <div>
                  <div class="rm-label">Flood Risk (Surrogate)</div>
                  <div class="result-value" data-metric="floodRisk">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setupTimeline() {
    const slider = document.getElementById('timeline-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.currentYear = Number(e.target.value);
        this.updatePeriodDisplay();
        this.scheduleUpdateSimulation();
      });
    }

    const monthSelect = document.getElementById('timeline-month');
    if (monthSelect) {
      monthSelect.addEventListener('change', event => {
        this.currentMonth = Number(event.target.value);
        this.updatePeriodDisplay();
        this.scheduleUpdateSimulation();
      });
    }
  },

  setupLayerControl() {
    const select = document.getElementById('sim-layer-select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.activeLayer = e.target.value;
        if (this.lastSimulationData) {
          IndiaMap.render('simulation-map', {
            activeLayer: this.activeLayer,
            showLabels: true,
            modelGrid: this.lastSimulationData.grid
          });
        }
      });
    }
  },

  updatePeriodDisplay() {
    const yearElement = document.getElementById('sim-year');
    const monthElement = document.getElementById('sim-month-label');
    if (yearElement) yearElement.textContent = this.currentYear;
    if (monthElement) {
      const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2025, this.currentMonth - 1, 1));
      monthElement.textContent = `${monthName} · Simulation Period`;
    }
  },

  setupScenarios() {
    document.querySelectorAll('.scenario-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.scenario-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.activeScenario = opt.dataset.scenario;
        this.scheduleUpdateSimulation();
      });
    });
  },

  setupPlayback() {
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }
  },

  setupSpeed() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speed = parseInt(btn.dataset.speed);
        if (this.isPlaying) {
          clearTimeout(this.playTimer);
          const playbackToken = ++this.playbackToken;
          this.startPlayback(playbackToken);
        }
      });
    });
  },

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const playbackToken = ++this.playbackToken;
    const btn = document.getElementById('play-btn');
    if (btn) btn.innerHTML = this.isPlaying ? Components.icon('pause', 20) : Components.icon('play', 20);

    if (this.isPlaying) {
      this.startPlayback(playbackToken);
    } else {
      clearTimeout(this.playTimer);
    }
  },

  stopPlayback() {
    this.isPlaying = false;
    this.playbackToken++;
    clearTimeout(this.playTimer);
    this.playTimer = null;
    const button = document.getElementById('play-btn');
    if (button) button.innerHTML = Components.icon('play', 20);
  },

  startPlayback(playbackToken = this.playbackToken) {
    clearTimeout(this.playTimer);
    const advanceYear = async () => {
      if (!this.isPlaying || playbackToken !== this.playbackToken) return;
      this.currentYear = this.currentYear >= 2050 ? 1950 : this.currentYear + 1;
      const slider = document.getElementById('timeline-slider');
      if (slider) slider.value = this.currentYear;
      this.updatePeriodDisplay();
      await this.updateSimulation();
      if (this.isPlaying && playbackToken === this.playbackToken) {
        this.playTimer = setTimeout(advanceYear, Math.max(250, 1500 / this.speed));
      }
    };
    advanceYear();
  },

  scheduleUpdateSimulation() {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => this.updateSimulation(), 300);
  },

  async updateSimulation() {
    const requestId = ++this.requestId;
    const status = document.getElementById('simulation-status');
    const params = this.scenarioParameters[this.activeScenario] || this.scenarioParameters.baseline;
    const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2025, this.currentMonth - 1, 1));
    if (status) status.textContent = `Running ${monthName} ${this.currentYear} (${this.activeScenario}) scenario…`;
    document.querySelectorAll('.result-value').forEach(element => { element.textContent = '…'; });

    const query = new URLSearchParams({
      physics_weight: String(params.physicsWeight),
      ocean_heat: String(params.oceanHeat),
      greenspace: String(params.greenspace),
      aerosol: String(params.aerosol),
      iod_index: String(params.iodIndex ?? 0.0),
      urbanization: String(params.urbanization ?? 35),
      carbon_forcing: String(params.carbonForcing ?? 2.6),
      year: String(this.currentYear),
      month: String(this.currentMonth),
    });
    const baseUrl = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

    try {
      const response = await fetch(`${baseUrl}/api/simulation/run?${query}`);
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.detail || data.error || `HTTP ${response.status}`);
      }
      if (requestId !== this.requestId) return;

      this.lastSimulationData = data;
      const summary = data.summary || {};
      const insights = data.insights || {};
      const confidence = data.confidence || {};
      const format = (value, suffix, digits = 2) => Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—';
      const results = {
        temperature: format(summary.mean_temperature_c, '°C', 1),
        meanRainfall: format(summary.mean_rainfall_mm, ' mm'),
        peakRainfall: format(summary.peak_rainfall_mm, ' mm'),
        soilMoisture: format(summary.mean_soil_moisture_pct, '%', 1),
        solarRadiation: format(summary.mean_solar_radiation_wm2, ' W/m²', 0),
        cloudCover: format(summary.mean_cloud_cover_pct, '%', 1),
        vpd: format(summary.mean_vapor_pressure_deficit_kpa, ' kPa', 2),
        ensembleSpread: format(confidence.spread, ''),
        droughtRisk: Number.isFinite(insights.drought_score) ? `${insights.drought_risk} · ${(insights.drought_score * 100).toFixed(0)}%` : '—',
        floodRisk: Number.isFinite(insights.flood_score) ? `${insights.flood_risk} · ${(insights.flood_score * 100).toFixed(0)}%` : '—',
      };
      document.querySelectorAll('.result-value').forEach(element => {
        element.textContent = results[element.dataset.metric] ?? '—';
      });
      IndiaMap.render('simulation-map', {
        activeLayer: this.activeLayer,
        showLabels: true,
        modelGrid: data.grid
      });
      if (status) status.textContent = `${data.metadata?.simulation_period || `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`} · ${data.metadata?.baseline_source || 'Synthetic climate scenario'}.`;
    } catch (error) {
      if (requestId !== this.requestId) return;
      document.querySelectorAll('.result-value').forEach(element => { element.textContent = 'Unavailable'; });
      if (status) status.textContent = `Simulation failed: ${error.message}`;
    }
  }
};

window.SimulationPage = SimulationPage;

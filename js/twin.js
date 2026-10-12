/* =================================================================
   Climate Twin Operator Console Page Logic
   Dual Tab System with Multi-Variable Earth Observation & Advanced Scenarios
   Tab 1: National Scenario Twin (60×60 PINN-FFNO Subcontinent Grid)
   Tab 2: Location Twin Predictor (Dedicated Microclimate & Local Risk)
   ================================================================= */

const TwinPage = {
  activeTab: 'national', // 'national' | 'location'
  activeLayer: 'rainfall',
  locationActiveLayer: 'temperature',
  simulationYear: new Date().getFullYear(),
  simulationMonth: new Date().getMonth() + 1,
  physicsWeight: 0.75,
  oceanHeat: 1.2,
  greenspace: 90,
  aerosol: 30,
  iodIndex: 0.0,
  urbanization: 35,
  carbonForcing: 2.6,
  activeScenarioPreset: 'baseline',
  showTerrain: true,
  simulationRequestId: 0,
  successfulSimulationCount: 0,
  lastSimulationData: null,

  // Default featured location: Perundurai, Erode District, Tamil Nadu
  selectedLocation: {
    name: 'Perundurai',
    district: 'Erode',
    state: 'Tamil Nadu',
    lat: 11.2758,
    lon: 77.5827,
    zone: 'Semi-Arid Kongu Basin · Agro-Industrial Corridor',
    note: 'SIPCOT Industrial Park & Agricultural Farmlands',
    featured: true,
  },

  presetLocations: [
    {
      name: 'Perundurai',
      district: 'Erode',
      state: 'Tamil Nadu',
      lat: 11.2758,
      lon: 77.5827,
      zone: 'Semi-Arid Kongu Basin · Agro-Industrial Belt',
      note: 'SIPCOT Industrial Park & Kongu Agrarian Farmlands',
      featured: true,
    },
    {
      name: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      lat: 13.0827,
      lon: 80.2707,
      zone: 'Coromandel Coastal Plain',
      note: 'Major Port & Megacity Urban Monsoon Sensitivity',
      featured: false,
    },
    {
      name: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      lat: 11.0168,
      lon: 76.9558,
      zone: 'Kongu Foothills / Palakkad Gap',
      note: 'Industrial Textile Hub & Western Ghats Rainshadow',
      featured: false,
    },
    {
      name: 'Mumbai',
      district: 'Mumbai',
      state: 'Maharashtra',
      lat: 19.0760,
      lon: 72.8777,
      zone: 'Konkan Coast / Urban Sea-Breeze',
      note: 'Heavy Arabian Sea Inundation & Coastal Humidity',
      featured: false,
    },
    {
      name: 'Delhi',
      district: 'Central Delhi',
      state: 'Delhi',
      lat: 28.6139,
      lon: 77.2090,
      zone: 'Indo-Gangetic Plain',
      note: 'Extreme Summer Heatwave & Atmospheric Stagnation',
      featured: false,
    },
    {
      name: 'Kolkata',
      district: 'Kolkata',
      state: 'West Bengal',
      lat: 22.5726,
      lon: 88.3639,
      zone: 'Lower Gangetic Delta',
      note: 'Bay of Bengal Cyclonic & High Humidity Corridor',
      featured: false,
    },
    {
      name: 'Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      lat: 12.9716,
      lon: 77.5946,
      zone: 'Mysore Plateau / Deccan Highland',
      note: 'Semi-Arid Urban Heat & Micro-Catchment Vulnerability',
      featured: false,
    },
  ],

  scenarioPresets: [
    { key: 'baseline', name: 'SSP2-4.5 Baseline', color: '#00C2FF', desc: 'Current Trajectory', oceanHeat: 1.2, greenspace: 90, aerosol: 30, iodIndex: 0.0, urbanization: 35, carbonForcing: 2.6, physicsWeight: 0.75 },
    { key: 'paris', name: '+1.5°C Paris Goal', color: '#00E5A8', desc: 'COP Stabilization', oceanHeat: 0.6, greenspace: 95, aerosol: 20, iodIndex: 0.2, urbanization: 30, carbonForcing: 1.5, physicsWeight: 0.85 },
    { key: 'el_nino', name: 'Super El Niño', color: '#FF5252', desc: 'Positive IOD & Heatwave', oceanHeat: 3.2, greenspace: 60, aerosol: 45, iodIndex: 2.2, urbanization: 65, carbonForcing: 4.2, physicsWeight: 0.80 },
    { key: 'la_nina', name: 'Intense La Niña Surge', color: '#A855F7', desc: 'Monsoon Cloudburst Flood', oceanHeat: 2.0, greenspace: 85, aerosol: 30, iodIndex: -1.8, urbanization: 40, carbonForcing: 2.8, physicsWeight: 0.78 },
    { key: 'industrial', name: 'High Fossil SSP5', color: '#FFA726', desc: 'Urban Sprawl & Inversion', oceanHeat: 2.8, greenspace: 45, aerosol: 85, iodIndex: 0.8, urbanization: 90, carbonForcing: 5.8, physicsWeight: 0.70 },
    { key: 'net_zero', name: 'Green Net-Zero (COP30)', color: '#10B981', desc: 'Afforestation & Clean Sky', oceanHeat: 0.5, greenspace: 100, aerosol: 15, iodIndex: -0.2, urbanization: 20, carbonForcing: 1.2, physicsWeight: 0.90 },
    { key: 'drought', name: 'Deccan Megadrought', color: '#E11D48', desc: 'High VPD & Soil Aridity', oceanHeat: 2.6, greenspace: 40, aerosol: 50, iodIndex: 1.9, urbanization: 60, carbonForcing: 3.9, physicsWeight: 0.82 },
    { key: 'cyclone', name: 'Super-Cyclone Season', color: '#3B82F6', desc: 'Coastal Ocean Heat Surge', oceanHeat: 3.4, greenspace: 75, aerosol: 35, iodIndex: 1.1, urbanization: 50, carbonForcing: 4.5, physicsWeight: 0.85 },
  ],

  init() {
    const container = document.getElementById('page-twin');
    if (!container) return;
    this.simulationRequestId++;
    container.innerHTML = this.render();
    this.setupControls();
    if (this.activeTab === 'national') {
      this.renderMap();
    } else {
      this.renderLocationTab();
    }
  },

  render() {
    const monthOptions = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const label = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2025, index, 1));
      return `<option value="${month}" ${month === this.simulationMonth ? 'selected' : ''}>${label}</option>`;
    }).join('');
    const selectedMonthLabel = new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2025, this.simulationMonth - 1, 1));
    const mapLayerOptions = Object.entries(IndiaMap.modelLayers).map(([key, layer]) =>
      `<option value="${key}" ${key === this.activeLayer ? 'selected' : ''}>${layer.label} (${layer.unit})</option>`
    ).join('');
    const locLayerOptions = Object.entries(IndiaMap.modelLayers).map(([key, layer]) =>
      `<option value="${key}" ${key === this.locationActiveLayer ? 'selected' : ''}>${layer.label} (${layer.unit})</option>`
    ).join('');

    const renderPresetChips = () => this.scenarioPresets.map(preset => `
      <button type="button" class="scenario-preset-chip ${this.activeScenarioPreset === preset.key ? 'active' : ''}" data-preset="${preset.key}">
        <span class="chip-dot" style="background:${preset.color}"></span>
        <span>${preset.name}</span>
      </button>
    `).join('');

    return `
      <div class="twin-page">
        <!-- Curved Console Header with Dual Tab Switcher -->
        <div class="twin-header-console">
          <div class="twin-header-subtext">BHARATIYA ANTARIKSH HACKATHON · ISRO EARTH OBSERVATION</div>
          <div class="twin-header-title">PS5: AI-POWERED CLIMATE TWIN</div>

          <!-- Dual Tab Switcher Bar -->
          <div class="twin-tabs-container">
            <div class="twin-tab-bar" role="tablist">
              <button class="twin-tab-btn ${this.activeTab === 'national' ? 'active' : ''}" id="btn-tab-national" data-tab="national" role="tab" aria-selected="${this.activeTab === 'national'}">
                <span class="twin-tab-icon">🌐</span>
                <span class="twin-tab-title">National Scenario Twin</span>
                <span class="twin-tab-tag">60×60 PINN Grid</span>
              </button>
              <button class="twin-tab-btn ${this.activeTab === 'location' ? 'active' : ''}" id="btn-tab-location" data-tab="location" role="tab" aria-selected="${this.activeTab === 'location'}">
                <span class="twin-tab-icon">📍</span>
                <span class="twin-tab-title">Location Twin Predictor</span>
                <span class="twin-tab-tag pulse-tag">Perundurai & Local Risk</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════
             TAB 1: NATIONAL SCENARIO TWIN (EXPANDED CONSOLE)
             ════════════════════════════════════════════════════════════ -->
        <div id="twin-tab-national" class="twin-tab-pane ${this.activeTab === 'national' ? 'active' : ''}">
          <div class="twin-layout">
            <!-- Left Panel: India Digital Twin Map -->
            <div class="twin-map-card">
              <div class="twin-map-title-badge">India Digital Twin Console</div>
              
              <!-- Map Container -->
              <div id="twin-map" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>

              <!-- Map Display Controls -->
              <div class="twin-map-overlays-panel">
                <div class="twin-overlay-label">Climate Data Layer</div>
                <label class="twin-overlay-item" for="twin-map-layer-select">
                  <span>Show</span>
                  <select id="twin-map-layer-select">${mapLayerOptions}</select>
                </label>
                <label class="twin-overlay-item">
                  <span>Terrain</span>
                  <input type="checkbox" id="chk-terrain" ${this.showTerrain ? 'checked' : ''} />
                </label>
              </div>

              <!-- Legend (Bottom Left) -->
              <div class="twin-map-legend-box">
                <div class="twin-legend-title" id="twin-map-period-label">No simulation data · Run a simulation to populate the map</div>
                <div class="twin-legend-gradient-bar" id="twin-map-legend-gradient"></div>
                <div class="twin-legend-labels">
                  <span id="twin-map-legend-min"></span>
                  <span id="twin-map-legend-mid"></span>
                  <span id="twin-map-legend-max"></span>
                </div>
              </div>

              <!-- Simulation Loading Overlay -->
              <div class="twin-sim-overlay" id="twin-sim-overlay">
                <div class="twin-spinner"></div>
                <div style="font-weight: 700; color: var(--accent-cyan); font-size: var(--text-base); letter-spacing: 1px;">
                  SOLVING PINN-FFNO FLUID & CLIMATE EQUATIONS...
                </div>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">
                  Navier-Stokes, Soil Hydrology & Atmospheric Radiation Coupled
                </div>
              </div>
            </div>

            <!-- Right Panel: Command Center -->
            <div class="twin-console-card">
              <div class="twin-console-title">Climate Simulation Command Center</div>

              <!-- System Status -->
              <div class="twin-section-box">
                <div class="twin-section-hdr">System Status & Data Integrity</div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Model Architecture:</span>
                  <div class="twin-status-badge">
                    <span class="twin-status-dot"></span>
                    PINN-FFNO SURROGATE
                  </div>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Simulation Period:</span>
                  <span class="twin-metric-val" id="twin-period-status">${this.simulationYear} / ${selectedMonthLabel}</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Active Scenario:</span>
                  <span class="twin-metric-val" id="twin-scenario-status" style="color:var(--accent-cyan)">${this.scenarioPresets.find(p => p.key === this.activeScenarioPreset)?.name || 'Custom'}</span>
                </div>
              </div>

              <!-- Scenario Presets Bar -->
              <div class="twin-section-box">
                <div class="twin-section-hdr">Scenario Presets & Pathways</div>
                <div class="twin-scenario-presets-bar">
                  ${renderPresetChips()}
                </div>
              </div>

              <div class="twin-section-box">
                <div class="twin-section-hdr">Simulation Period</div>
                <div class="twin-period-controls">
                  <label for="twin-year-slider">Year <output id="twin-year-output">${this.simulationYear}</output></label>
                  <input type="range" id="twin-year-slider" min="1950" max="2050" step="1" value="${this.simulationYear}" />
                  <label for="twin-month-select">Month</label>
                  <select id="twin-month-select">${monthOptions}</select>
                </div>
              </div>

              <!-- Scenario Simulator Sliders -->
              <div class="twin-section-box">
                <div class="twin-section-hdr">Scenario Forcing Parameters</div>

                <!-- Ocean Heat Content -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Indian Ocean Heat Content (IOHC)</span>
                    <span class="twin-slider-val" id="val-ocean-heat">+${this.oceanHeat.toFixed(1)}°C</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-ocean-heat" min="-1.0" max="4.0" step="0.1" value="${this.oceanHeat}" />
                </div>

                <!-- Greenspace Index -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Greenspace Index (NDVI)</span>
                    <span class="twin-slider-val" id="val-greenspace">${this.greenspace}%</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-greenspace" min="10" max="100" step="5" value="${this.greenspace}" />
                </div>

                <!-- Aerosol Load -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Aerosol Load (AOD)</span>
                    <span class="twin-slider-val" id="val-aerosol">Medium (${this.aerosol}%)</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-aerosol" min="10" max="100" step="5" value="${this.aerosol}" />
                </div>

                <!-- ENSO / IOD Index -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>ENSO / Indian Ocean Dipole (IOD)</span>
                    <span class="twin-slider-val" id="val-iod">${(this.iodIndex >= 0 ? '+' : '') + this.iodIndex.toFixed(1)}</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-iod" min="-2.0" max="2.5" step="0.1" value="${this.iodIndex}" />
                </div>

                <!-- Urbanization Rate -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Urban Heat Island & Sprawl</span>
                    <span class="twin-slider-val" id="val-urbanization">${this.urbanization}%</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-urbanization" min="10" max="100" step="5" value="${this.urbanization}" />
                </div>

                <!-- Carbon Forcing -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>GHG Radiative Forcing (ΔF)</span>
                    <span class="twin-slider-val" id="val-carbon">${this.carbonForcing.toFixed(1)} W/m²</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-carbon" min="1.0" max="6.5" step="0.1" value="${this.carbonForcing}" />
                </div>

                <!-- Physics Weight -->
                <div class="twin-slider-group" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(0,194,255,0.1);">
                  <div class="twin-slider-hdr">
                    <span>Physics Weight (PINN Navier-Stokes)</span>
                    <span class="twin-slider-val" id="val-physics-weight">${this.physicsWeight.toFixed(2)}</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-physics-weight" min="0.0" max="1.0" step="0.05" value="${this.physicsWeight}" />
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; gap: 10px;">
                <button class="twin-run-btn" id="btn-run-simulation" style="flex: 1;">
                  Run Simulation
                  <span class="twin-btn-subtext">${this.simulationYear} / ${new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2025, this.simulationMonth - 1, 1))}</span>
                </button>
                <button class="twin-run-btn" id="btn-export-report" style="flex: 1; background: rgba(0,194,255,0.1); border-color: rgba(0,194,255,0.4); color: #00C2FF; display: none;">
                  Export Report
                  <span class="twin-btn-subtext" style="color: rgba(0,194,255,0.6);">Download Results</span>
                </button>
              </div>
              <div class="twin-run-status" id="twin-run-status" role="status">Select scenario and parameters, then run the surrogate model.</div>

              <!-- Analysis & Multi-Variable Key Insights -->
              <div class="twin-section-box" style="gap: 4px;">
                <div class="twin-section-hdr">Multi-Variable Analysis & Key Insights</div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Ensemble Spread:</span>
                  <span class="twin-metric-val" id="insight-accuracy">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Delays Onset:</span>
                  <span class="twin-metric-val" id="insight-delay">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Drought Risk:</span>
                  <span class="twin-metric-val" id="insight-drought">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Flood Risk:</span>
                  <span class="twin-metric-val" id="insight-flood">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Temperature:</span>
                  <span class="twin-metric-val" id="insight-temperature">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Rainfall:</span>
                  <span class="twin-metric-val" id="insight-rainfall">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Soil Moisture:</span>
                  <span class="twin-metric-val" id="insight-soil-moisture" style="color:#00E5A8">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Solar Irradiance:</span>
                  <span class="twin-metric-val" id="insight-solar-radiation" style="color:#FFB300">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Cloud Cover:</span>
                  <span class="twin-metric-val" id="insight-cloud-cover" style="color:#60A5FA">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Vapor Pressure Deficit:</span>
                  <span class="twin-metric-val" id="insight-vpd" style="color:#F87171">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Specific Humidity:</span>
                  <span class="twin-metric-val" id="insight-humidity">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Wind Speed:</span>
                  <span class="twin-metric-val" id="insight-wind-speed">—</span>
                </div>
                <div class="twin-metric-row">
                  <span class="twin-metric-lbl">Mean Surface Pressure:</span>
                  <span class="twin-metric-val" id="insight-surface-pressure">—</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════
             TAB 2: LOCATION TWIN PREDICTOR (LOCALIZED AI TWIN)
             ════════════════════════════════════════════════════════════ -->
        <div id="twin-tab-location" class="twin-tab-pane ${this.activeTab === 'location' ? 'active' : ''}">
          <!-- Location Selection Toolbar -->
          <div class="twin-loc-toolbar">
            <div class="twin-loc-presets">
              <span class="twin-loc-presets-label">Target Location:</span>
              ${this.presetLocations.map(loc => `
                <button type="button" class="loc-preset-pill ${loc.name === this.selectedLocation.name ? 'active' : ''} ${loc.featured ? 'featured' : ''}" data-loc-name="${loc.name}">
                  ${loc.featured ? '⭐ 📍' : '📍'} ${loc.name}
                  ${loc.featured ? '<span style="font-size:9px;opacity:0.85;margin-left:2px">(Featured)</span>' : ''}
                </button>
              `).join('')}
              <button type="button" class="loc-preset-pill gps-pill" id="btn-loc-gps">
                🎯 Detect Live GPS
              </button>
            </div>

            <!-- Active Location Dossier Bar -->
            <div class="twin-loc-dossier" id="twin-loc-dossier">
              <div class="loc-dossier-pill">
                <span>📍 Place:</span>
                <strong id="loc-dossier-name">${this.selectedLocation.name}, ${this.selectedLocation.district || 'Erode'}, ${this.selectedLocation.state || 'Tamil Nadu'}</strong>
              </div>
              <div class="loc-dossier-pill">
                <span>🌐 Coordinates:</span>
                <strong id="loc-dossier-coords" class="loc-dossier-highlight">${this.selectedLocation.lat.toFixed(4)}°N, ${this.selectedLocation.lon.toFixed(4)}°E</strong>
              </div>
              <div class="loc-dossier-pill">
                <span>📐 FNO Cell:</span>
                <strong id="loc-dossier-grid">Row ${Math.round((this.selectedLocation.lat - 8.0) / 0.5)}, Col ${Math.round((this.selectedLocation.lon - 68.0) / 0.5)}</strong>
              </div>
              <div class="loc-dossier-pill">
                <span>🏞️ Agro-Climatic Zone:</span>
                <strong id="loc-dossier-zone">${this.selectedLocation.zone || 'Agro-Industrial Basin'}</strong>
              </div>
            </div>
          </div>

          <!-- Location Digital Twin Layout -->
          <div class="twin-loc-layout">
            <!-- Left Side: Local Spatial Focus & FNO Cell Telemetry -->
            <div class="twin-map-card" style="min-height: 680px; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; padding: 0;">
              <div class="twin-map-title-badge" style="z-index: 12;" id="loc-map-badge">
                📍 Location Spatial Twin · ${this.selectedLocation.name.toUpperCase()}
              </div>

              <!-- Map Display Controls -->
              <div class="twin-map-overlays-panel">
                <div class="twin-overlay-label">Climate Field Layer</div>
                <label class="twin-overlay-item" for="twin-loc-layer-select">
                  <span>Show</span>
                  <select id="twin-loc-layer-select">${locLayerOptions}</select>
                </label>
                <label class="twin-overlay-item">
                  <span>Terrain</span>
                  <input type="checkbox" id="chk-loc-terrain" ${this.showTerrain ? 'checked' : ''} />
                </label>
              </div>

              <!-- Interactive Location SVG Map Container -->
              <div id="twin-loc-map" style="width: 100%; height: 360px; display: flex; align-items: center; justify-content: center; position: relative;"></div>

              <!-- Map Legend Bar -->
              <div class="twin-map-legend-box" style="position: relative; bottom: auto; left: auto; margin: 4px 14px 8px; width: auto;">
                <div class="twin-legend-title" id="twin-loc-legend-title">Surrogate Model Spatial Field Gradient</div>
                <div class="twin-legend-gradient-bar" id="twin-loc-legend-gradient"></div>
                <div class="twin-legend-labels">
                  <span id="twin-loc-legend-min"></span>
                  <span id="twin-loc-legend-mid"></span>
                  <span id="twin-loc-legend-max"></span>
                </div>
              </div>

              <!-- Physical Surrogate Grid Cell Telemetry (Extracted from 60x60 Tensor across all variables) -->
              <div style="padding: 10px 14px 16px; border-top: 1px solid rgba(0, 194, 255, 0.15); background: rgba(5, 8, 20, 0.4);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                  <span style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted)">
                    PINN Local Grid Telemetry (${this.selectedLocation.name} · ${this.selectedLocation.lat.toFixed(2)}°N, ${this.selectedLocation.lon.toFixed(2)}°E)
                  </span>
                  <span style="font-size:9px; color:var(--accent-green); background:rgba(0,229,168,0.15); border:1px solid rgba(0,229,168,0.3); padding:2px 6px; border-radius:4px;" id="loc-data-source-badge">
                    ${this.lastSimulationData ? 'PINN Surrogate Active' : 'Baseline Reference'}
                  </span>
                </div>

                <!-- 9-Variable High-Density Grid Telemetry Cards -->
                <div class="twin-loc-telemetry-grid">
                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Surface Temp</span><span>🌡️</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-temp">28.4°C</div>
                    <div class="loc-telemetry-sub" id="loc-tel-temp-sub">+0.6°C vs Normal</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Precipitation</span><span>🌧️</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-rain">14.2 mm</div>
                    <div class="loc-telemetry-sub" id="loc-tel-rain-sub">Rate: 0.6 mm/hr</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Soil Moisture</span><span>🌱</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-soil" style="color: #00E5A8;">42.5%</div>
                    <div class="loc-telemetry-sub" id="loc-tel-soil-sub">Volumetric Capacity</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Solar Radiation</span><span>☀️</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-solar" style="color: #FFB300;">540 W/m²</div>
                    <div class="loc-telemetry-sub" id="loc-tel-solar-sub">Shortwave Irradiance</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Cloud Cover</span><span>☁️</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-cloud" style="color: #60A5FA;">45.0%</div>
                    <div class="loc-telemetry-sub" id="loc-tel-cloud-sub">Satellite Albedo</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Vapor Deficit</span><span>🌫️</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-vpd" style="color: #F87171;">0.85 kPa</div>
                    <div class="loc-telemetry-sub" id="loc-tel-vpd-sub">Atmospheric Aridity</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Spec. Humidity</span><span>💧</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-humidity">14.8 g/kg</div>
                    <div class="loc-telemetry-sub" id="loc-tel-humidity-sub">RH: ~74%</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Wind Velocity</span><span>💨</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-wind">15.2 km/h</div>
                    <div class="loc-telemetry-sub" id="loc-tel-wind-sub">Palakkad Flow</div>
                  </div>

                  <div class="loc-telemetry-card">
                    <div class="loc-telemetry-hdr"><span>Surface Press.</span><span>⏲️</span></div>
                    <div class="loc-telemetry-val" id="loc-tel-press">982 hPa</div>
                    <div class="loc-telemetry-sub" id="loc-tel-press-sub">Elevation: ~290m</div>
                  </div>
                </div>
              </div>

              <!-- Simulation Loading Overlay for Location Tab -->
              <div class="twin-sim-overlay" id="twin-loc-sim-overlay">
                <div class="twin-spinner"></div>
                <div style="font-weight: 700; color: var(--accent-cyan); font-size: var(--text-base); letter-spacing: 1px;">
                  EXTRACTING LOCAL PINN-FFNO TENSOR STATE...
                </div>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">
                  Navier-Stokes Microclimate & Multi-Variable Boundary Flux Modeling
                </div>
              </div>
            </div>

            <!-- Right Side: Location Twin Command Console & Risk Analysis -->
            <div class="twin-console-card">
              <div class="twin-console-title" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Location Climate Digital Twin</span>
                <span style="font-size:10px; color:var(--accent-cyan); font-family:monospace;">📍 ${this.selectedLocation.name.toUpperCase()}</span>
              </div>

              <!-- Location Scenario Presets -->
              <div class="twin-section-box">
                <div class="twin-section-hdr">Scenario Presets & Pathways</div>
                <div class="twin-scenario-presets-bar">
                  ${renderPresetChips()}
                </div>
              </div>

              <!-- Location Scenario Forcing Sliders -->
              <div class="twin-section-box">
                <div class="twin-section-hdr">Local Scenario Forcing (PINN Parameters)</div>

                <!-- Ocean Heat -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Indian Ocean Heat Content (IOHC)</span>
                    <span class="twin-slider-val" id="val-loc-ocean-heat">+${this.oceanHeat.toFixed(1)}°C</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-loc-ocean-heat" min="-1.0" max="4.0" step="0.1" value="${this.oceanHeat}" />
                </div>

                <!-- Greenspace -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Local Vegetation Index (NDVI)</span>
                    <span class="twin-slider-val" id="val-loc-greenspace">${this.greenspace}%</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-loc-greenspace" min="10" max="100" step="5" value="${this.greenspace}" />
                </div>

                <!-- Aerosol / Industrial Emissions -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Aerosol & Industrial Load ${this.selectedLocation.name === 'Perundurai' ? '(SIPCOT)' : ''}</span>
                    <span class="twin-slider-val" id="val-loc-aerosol">${this.aerosol}%</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-loc-aerosol" min="10" max="100" step="5" value="${this.aerosol}" />
                </div>

                <!-- IOD -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>ENSO / Indian Ocean Dipole</span>
                    <span class="twin-slider-val" id="val-loc-iod">${(this.iodIndex >= 0 ? '+' : '') + this.iodIndex.toFixed(1)}</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-loc-iod" min="-2.0" max="2.5" step="0.1" value="${this.iodIndex}" />
                </div>

                <!-- Urbanization -->
                <div class="twin-slider-group">
                  <div class="twin-slider-hdr">
                    <span>Urban Heat Island Rate</span>
                    <span class="twin-slider-val" id="val-loc-urbanization">${this.urbanization}%</span>
                  </div>
                  <input type="range" class="twin-range-input" id="range-loc-urbanization" min="10" max="100" step="5" value="${this.urbanization}" />
                </div>

                <!-- Action Button -->
                <div style="margin-top: 6px; display: flex; gap: 8px;">
                  <button class="twin-run-btn" id="btn-run-loc-simulation" style="flex: 1; padding: 10px 14px;">
                    ⚡ Run Location Twin Simulation
                    <span class="twin-btn-subtext">Predict Multi-Variable State for ${this.selectedLocation.name}</span>
                  </button>
                  <button class="twin-run-btn" id="btn-export-loc-report" style="background: rgba(0,194,255,0.1); border-color: rgba(0,194,255,0.4); color: #00C2FF; padding: 10px 14px;">
                    Export
                    <span class="twin-btn-subtext" style="color: rgba(0,194,255,0.6);">JSON</span>
                  </button>
                </div>
              </div>

              <!-- Local Climate Risk & Vulnerability Matrix -->
              <div class="twin-section-box">
                <div class="twin-section-hdr">Microclimate Risk & Vulnerability Matrix</div>
                <div class="twin-loc-risk-grid">
                  <!-- Risk 1: Thermal Stress -->
                  <div class="loc-risk-card">
                    <div class="loc-risk-header">
                      <span>Thermal Stress</span>
                      <span class="loc-risk-level moderate" id="loc-risk-heat-lvl">Moderate</span>
                    </div>
                    <div class="loc-risk-bar-bg">
                      <div class="loc-risk-bar-fill" id="loc-risk-heat-bar" style="width: 52%; background: #ffab00;"></div>
                    </div>
                    <div class="loc-risk-desc" id="loc-risk-heat-desc">
                      Heat index ~33.8°C. Microclimate industrial warming buffer observed around commercial center.
                    </div>
                  </div>

                  <!-- Risk 2: Flood & Cloudburst -->
                  <div class="loc-risk-card">
                    <div class="loc-risk-header">
                      <span>Flash Flood Vulnerability</span>
                      <span class="loc-risk-level low" id="loc-risk-flood-lvl">Low</span>
                    </div>
                    <div class="loc-risk-bar-bg">
                      <div class="loc-risk-bar-fill" id="loc-risk-flood-bar" style="width: 24%; background: var(--accent-green);"></div>
                    </div>
                    <div class="loc-risk-desc" id="loc-risk-flood-desc">
                      Precipitation within Noyyal-Bhavani sub-basin drainage capacity. Low inundation probability.
                    </div>
                  </div>

                  <!-- Risk 3: Drought & Aridity -->
                  <div class="loc-risk-card">
                    <div class="loc-risk-header">
                      <span>Soil Moisture Deficit</span>
                      <span class="loc-risk-level moderate" id="loc-risk-drought-lvl">Moderate</span>
                    </div>
                    <div class="loc-risk-bar-bg">
                      <div class="loc-risk-bar-fill" id="loc-risk-drought-bar" style="width: 44%; background: #ffab00;"></div>
                    </div>
                    <div class="loc-risk-desc" id="loc-risk-drought-desc">
                      Evapotranspiration slightly exceeds rainfall rate. Supplemental drip irrigation advised for Kongu crops.
                    </div>
                  </div>

                  <!-- Risk 4: Atmospheric Stagnation -->
                  <div class="loc-risk-card">
                    <div class="loc-risk-header">
                      <span>Air Stagnation ${this.selectedLocation.name === 'Perundurai' ? '(SIPCOT)' : ''}</span>
                      <span class="loc-risk-level low" id="loc-risk-air-lvl">Optimal</span>
                    </div>
                    <div class="loc-risk-bar-bg">
                      <div class="loc-risk-bar-fill" id="loc-risk-air-bar" style="width: 22%; background: var(--accent-green);"></div>
                    </div>
                    <div class="loc-risk-desc" id="loc-risk-air-desc">
                      15.2 km/h ventilation velocity maintains strong plume dispersion away from residential corridors.
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actionable Local Adaptation & Policy Advisory -->
              <div class="twin-section-box">
                <div class="twin-section-hdr">Actionable Local Adaptation & Policy Advisory</div>
                <div class="twin-loc-advisory-box" id="twin-loc-advisories">
                  <div class="loc-advisory-item">
                    <span class="loc-advisory-bullet">💧</span>
                    <div>
                      <strong>Water Resource Management:</strong>
                      <span id="loc-adv-water">Bhavani & Lower Bhavani Project (LBP) recharge channels are stable. Rainwater harvesting in Perundurai industrial and residential sectors provides sufficient recharge buffer.</span>
                    </div>
                  </div>
                  <div class="loc-advisory-item">
                    <span class="loc-advisory-bullet">🏭</span>
                    <div>
                      <strong>SIPCOT Industrial Cluster Protocol:</strong>
                      <span id="loc-adv-industry">Atmospheric boundary layer is well-ventilated; textile processing and chemical unit emissions are projecting safe dispersion without ground-level trapping.</span>
                    </div>
                  </div>
                  <div class="loc-advisory-item">
                    <span class="loc-advisory-bullet">🌾</span>
                    <div>
                      <strong>Agricultural & Crop Extension:</strong>
                      <span id="loc-adv-agri">Recommended for turmeric, tapioca, and cotton farmers in Erode district: maintain regular soil mulch to mitigate surface evapotranspiration under positive ocean heat forcing.</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    `;
  },

  setupControls() {
    // ── Dual Tab Switching ──
    const btnTabNational = document.getElementById('btn-tab-national');
    const btnTabLocation = document.getElementById('btn-tab-location');
    if (btnTabNational) btnTabNational.addEventListener('click', () => this.switchTab('national'));
    if (btnTabLocation) btnTabLocation.addEventListener('click', () => this.switchTab('location'));

    // ── Scenario Presets Chips ──
    document.querySelectorAll('.scenario-preset-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-preset');
        this.applyScenarioPreset(key);
      });
    });

    // ── National Tab Controls ──
    const mapLayerSelect = document.getElementById('twin-map-layer-select');
    if (mapLayerSelect) {
      mapLayerSelect.addEventListener('change', event => {
        this.activeLayer = event.target.value;
        this.renderMap();
      });
    }

    const yearSlider = document.getElementById('twin-year-slider');
    if (yearSlider) {
      yearSlider.addEventListener('input', event => {
        this.simulationYear = Number(event.target.value);
        const out = document.getElementById('twin-year-output');
        if (out) out.textContent = this.simulationYear;
        this.updateSelectedPeriodLabels();
      });
    }

    const monthSelect = document.getElementById('twin-month-select');
    if (monthSelect) {
      monthSelect.addEventListener('change', event => {
        this.simulationMonth = Number(event.target.value);
        this.updateSelectedPeriodLabels();
      });
    }

    // Sliders
    this.bindRangeInput('range-physics-weight', 'val-physics-weight', (val) => {
      this.physicsWeight = parseFloat(val);
      return this.physicsWeight.toFixed(2);
    });

    this.bindRangeInput('range-ocean-heat', 'val-ocean-heat', (val) => {
      this.oceanHeat = parseFloat(val);
      this.syncLocationSliders();
      return (this.oceanHeat >= 0 ? '+' : '') + this.oceanHeat.toFixed(1) + '°C';
    });

    this.bindRangeInput('range-greenspace', 'val-greenspace', (val) => {
      this.greenspace = parseInt(val);
      this.syncLocationSliders();
      return `${this.greenspace}%`;
    });

    this.bindRangeInput('range-aerosol', 'val-aerosol', (val) => {
      this.aerosol = parseInt(val);
      this.syncLocationSliders();
      let category = 'Low';
      if (this.aerosol > 70) category = 'High';
      else if (this.aerosol > 40) category = 'Medium';
      return `${category} (${this.aerosol}%)`;
    });

    this.bindRangeInput('range-iod', 'val-iod', (val) => {
      this.iodIndex = parseFloat(val);
      this.syncLocationSliders();
      return (this.iodIndex >= 0 ? '+' : '') + this.iodIndex.toFixed(1);
    });

    this.bindRangeInput('range-urbanization', 'val-urbanization', (val) => {
      this.urbanization = parseInt(val);
      this.syncLocationSliders();
      return `${this.urbanization}%`;
    });

    this.bindRangeInput('range-carbon', 'val-carbon', (val) => {
      this.carbonForcing = parseFloat(val);
      return `${this.carbonForcing.toFixed(1)} W/m²`;
    });

    // Checkbox Terrain
    const chkTerrain = document.getElementById('chk-terrain');
    if (chkTerrain) {
      chkTerrain.addEventListener('change', (e) => {
        this.showTerrain = e.target.checked;
        const mapContainer = document.querySelector('.twin-map-card');
        if (mapContainer) {
          mapContainer.style.background = this.showTerrain
            ? 'radial-gradient(circle at 50% 30%, #0c142c 0%, #050814 100%)'
            : 'rgba(8, 12, 28, 0.9)';
        }
      });
    }

    // Run Buttons
    const btnRun = document.getElementById('btn-run-simulation');
    if (btnRun) btnRun.addEventListener('click', () => this.runSimulation(false));

    const btnExport = document.getElementById('btn-export-report');
    if (btnExport) btnExport.addEventListener('click', () => this.exportReport());

    // ── Location Tab Controls ──
    document.querySelectorAll('.loc-preset-pill[data-loc-name]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const locName = e.currentTarget.getAttribute('data-loc-name');
        const loc = this.presetLocations.find(l => l.name === locName);
        if (loc) this.selectLocation(loc);
      });
    });

    const btnGps = document.getElementById('btn-loc-gps');
    if (btnGps) btnGps.addEventListener('click', () => this.detectLocationGPS());

    const locLayerSelect = document.getElementById('twin-loc-layer-select');
    if (locLayerSelect) {
      locLayerSelect.addEventListener('change', (e) => {
        this.locationActiveLayer = e.target.value;
        this.renderLocationMap();
      });
    }

    const chkLocTerrain = document.getElementById('chk-loc-terrain');
    if (chkLocTerrain) {
      chkLocTerrain.addEventListener('change', (e) => {
        this.showTerrain = e.target.checked;
        this.renderLocationMap();
      });
    }

    // Location sliders
    this.bindRangeInput('range-loc-ocean-heat', 'val-loc-ocean-heat', (val) => {
      this.oceanHeat = parseFloat(val);
      this.syncNationalSliders();
      return (this.oceanHeat >= 0 ? '+' : '') + this.oceanHeat.toFixed(1) + '°C';
    });

    this.bindRangeInput('range-loc-greenspace', 'val-loc-greenspace', (val) => {
      this.greenspace = parseInt(val);
      this.syncNationalSliders();
      return `${this.greenspace}%`;
    });

    this.bindRangeInput('range-loc-aerosol', 'val-loc-aerosol', (val) => {
      this.aerosol = parseInt(val);
      this.syncNationalSliders();
      return `${this.aerosol}%`;
    });

    this.bindRangeInput('range-loc-iod', 'val-loc-iod', (val) => {
      this.iodIndex = parseFloat(val);
      this.syncNationalSliders();
      return (this.iodIndex >= 0 ? '+' : '') + this.iodIndex.toFixed(1);
    });

    this.bindRangeInput('range-loc-urbanization', 'val-loc-urbanization', (val) => {
      this.urbanization = parseInt(val);
      this.syncNationalSliders();
      return `${this.urbanization}%`;
    });

    const btnRunLoc = document.getElementById('btn-run-loc-simulation');
    if (btnRunLoc) btnRunLoc.addEventListener('click', () => this.runSimulation(true));

    const btnExportLoc = document.getElementById('btn-export-loc-report');
    if (btnExportLoc) btnExportLoc.addEventListener('click', () => this.exportLocationReport());
  },

  bindRangeInput(inputId, outputId, callback) {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    if (input && output) {
      input.addEventListener('input', (e) => {
        output.textContent = callback(e.target.value);
      });
    }
  },

  applyScenarioPreset(presetKey) {
    const preset = this.scenarioPresets.find(p => p.key === presetKey);
    if (!preset) return;
    this.activeScenarioPreset = presetKey;
    this.oceanHeat = preset.oceanHeat;
    this.greenspace = preset.greenspace;
    this.aerosol = preset.aerosol;
    this.iodIndex = preset.iodIndex;
    this.urbanization = preset.urbanization;
    this.carbonForcing = preset.carbonForcing;
    this.physicsWeight = preset.physicsWeight;

    // Update active preset buttons
    document.querySelectorAll('.scenario-preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-preset') === presetKey);
    });

    const scenarioStatus = document.getElementById('twin-scenario-status');
    if (scenarioStatus) scenarioStatus.textContent = preset.name;

    // Sync all slider displays
    this.syncNationalSliders();
    this.syncLocationSliders();

    if (typeof Components !== 'undefined') {
      Components.showToast(`Applied scenario preset: ${preset.name} (${preset.desc})`, 'info');
    }
  },

  syncLocationSliders() {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setVal('range-loc-ocean-heat', this.oceanHeat);
    setText('val-loc-ocean-heat', (this.oceanHeat >= 0 ? '+' : '') + this.oceanHeat.toFixed(1) + '°C');

    setVal('range-loc-greenspace', this.greenspace);
    setText('val-loc-greenspace', `${this.greenspace}%`);

    setVal('range-loc-aerosol', this.aerosol);
    setText('val-loc-aerosol', `${this.aerosol}%`);

    setVal('range-loc-iod', this.iodIndex);
    setText('val-loc-iod', (this.iodIndex >= 0 ? '+' : '') + this.iodIndex.toFixed(1));

    setVal('range-loc-urbanization', this.urbanization);
    setText('val-loc-urbanization', `${this.urbanization}%`);
  },

  syncNationalSliders() {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setVal('range-ocean-heat', this.oceanHeat);
    setText('val-ocean-heat', (this.oceanHeat >= 0 ? '+' : '') + this.oceanHeat.toFixed(1) + '°C');

    setVal('range-greenspace', this.greenspace);
    setText('val-greenspace', `${this.greenspace}%`);

    setVal('range-aerosol', this.aerosol);
    let category = 'Low';
    if (this.aerosol > 70) category = 'High';
    else if (this.aerosol > 40) category = 'Medium';
    setText('val-aerosol', `${category} (${this.aerosol}%)`);

    setVal('range-iod', this.iodIndex);
    setText('val-iod', (this.iodIndex >= 0 ? '+' : '') + this.iodIndex.toFixed(1));

    setVal('range-urbanization', this.urbanization);
    setText('val-urbanization', `${this.urbanization}%`);

    setVal('range-carbon', this.carbonForcing);
    setText('val-carbon', `${this.carbonForcing.toFixed(1)} W/m²`);

    setVal('range-physics-weight', this.physicsWeight);
    setText('val-physics-weight', this.physicsWeight.toFixed(2));
  },

  switchTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    const btnTabNational = document.getElementById('btn-tab-national');
    const btnTabLocation = document.getElementById('btn-tab-location');
    if (btnTabNational) {
      btnTabNational.classList.toggle('active', tab === 'national');
      btnTabNational.setAttribute('aria-selected', tab === 'national');
    }
    if (btnTabLocation) {
      btnTabLocation.classList.toggle('active', tab === 'location');
      btnTabLocation.setAttribute('aria-selected', tab === 'location');
    }

    const paneNational = document.getElementById('twin-tab-national');
    const paneLocation = document.getElementById('twin-tab-location');
    if (paneNational) paneNational.classList.toggle('active', tab === 'national');
    if (paneLocation) paneLocation.classList.toggle('active', tab === 'location');

    if (tab === 'national') {
      this.renderMap();
    } else {
      this.renderLocationTab();
    }
  },

  selectLocation(loc) {
    this.selectedLocation = loc;

    document.querySelectorAll('.loc-preset-pill[data-loc-name]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-loc-name') === loc.name);
    });

    const nameEl = document.getElementById('loc-dossier-name');
    const coordsEl = document.getElementById('loc-dossier-coords');
    const gridEl = document.getElementById('loc-dossier-grid');
    const zoneEl = document.getElementById('loc-dossier-zone');
    const badgeEl = document.getElementById('loc-map-badge');

    const row = Math.round((loc.lat - 8.0) / 0.5);
    const col = Math.round((loc.lon - 68.0) / 0.5);

    if (nameEl) nameEl.textContent = `${loc.name}, ${loc.district || ''}, ${loc.state || ''}`;
    if (coordsEl) coordsEl.textContent = `${loc.lat.toFixed(4)}°N, ${loc.lon.toFixed(4)}°E`;
    if (gridEl) gridEl.textContent = `Row ${row}, Col ${col}`;
    if (zoneEl) zoneEl.textContent = loc.zone || 'Regional Microclimate';
    if (badgeEl) badgeEl.textContent = `📍 Location Spatial Twin · ${loc.name.toUpperCase()}`;

    this.renderLocationMap();
    this.updateLocationTelemetryAndRisks();

    if (typeof Components !== 'undefined') {
      Components.showToast(`Climate Twin focused on ${loc.name} (${loc.lat.toFixed(2)}°N, ${loc.lon.toFixed(2)}°E)`, 'info');
    }
  },

  detectLocationGPS() {
    if (!navigator.geolocation) {
      if (typeof Components !== 'undefined') Components.showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    const gpsBtn = document.getElementById('btn-loc-gps');
    if (gpsBtn) {
      gpsBtn.textContent = '⏳ Detecting...';
      gpsBtn.style.opacity = '0.7';
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (gpsBtn) {
          gpsBtn.textContent = '🎯 Detect Live GPS';
          gpsBtn.style.opacity = '1';
        }

        let placeName = 'Live GPS Location';
        let district = 'Local District';
        let state = 'India';

        try {
          if (typeof WeatherAPI !== 'undefined' && WeatherAPI.reverseGeocode) {
            const geo = await WeatherAPI.reverseGeocode(lat, lon);
            if (geo) {
              placeName = geo.placeName || placeName;
              district = geo.districtName || district;
              state = geo.stateName || state;
            }
          }
        } catch (err) {
          console.warn('Reverse geocode error:', err);
        }

        const newLoc = {
          name: placeName,
          district: district,
          state: state,
          lat: lat,
          lon: lon,
          zone: 'Live Geolocation Satellite Cell',
          note: 'Detected from Browser Geolocation Sensor',
          featured: false
        };

        this.selectLocation(newLoc);
      },
      (err) => {
        if (gpsBtn) {
          gpsBtn.textContent = '🎯 Detect Live GPS';
          gpsBtn.style.opacity = '1';
        }
        console.warn('Geolocation error:', err);
        if (typeof Components !== 'undefined') {
          Components.showToast('GPS access denied or unavailable. Using default location (Perundurai).', 'warning');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  },

  renderLocationTab() {
    this.renderLocationMap();
    this.updateLocationTelemetryAndRisks();
  },

  renderLocationMap() {
    const container = document.getElementById('twin-loc-map');
    if (!container) return;

    IndiaMap.render('twin-loc-map', {
      activeLayer: this.locationActiveLayer || 'temperature',
      showLabels: false,
      modelGrid: this.lastSimulationData?.grid || null,
      useReferenceData: true,
      simulationPeriod: this.lastSimulationData?.metadata?.simulation_period,
      simulationRunId: this.successfulSimulationCount,
      userLocation: {
        lat: this.selectedLocation.lat,
        lon: this.selectedLocation.lon,
        name: this.selectedLocation.name,
        label: `📍 ${this.selectedLocation.name.toUpperCase()}`,
        color: this.selectedLocation.name === 'Perundurai' ? '#00E5A8' : '#00C2FF'
      }
    });

    this.updateLocationMapLegend();
  },

  updateLocationMapLegend() {
    const layer = this.locationActiveLayer || 'temperature';
    const labels = IndiaMap.getLegendLabels(layer);
    const gradient = document.getElementById('twin-loc-legend-gradient');
    if (gradient) gradient.style.background = IndiaMap.getLegendGradient(layer);
    ['min', 'mid', 'max'].forEach((key, index) => {
      const element = document.getElementById(`twin-loc-legend-${key}`);
      if (element) element.textContent = labels[index];
    });
    const label = document.getElementById('twin-loc-legend-title');
    if (label) {
      const layerName = IndiaMap.modelLayers[layer]?.label || layer;
      label.textContent = this.lastSimulationData
        ? `PINN Modelled ${layerName} · ${this.lastSimulationData.metadata.simulation_period} · Run ${this.successfulSimulationCount}`
        : `Spatial ${layerName} Field Gradient (Baseline Climatology)`;
    }
  },

  extractLocationMetrics(lat, lon) {
    const grid = this.lastSimulationData?.grid;
    let tempC = null;
    let rainMm = null;
    let humidity = null;
    let windKmh = null;
    let pressure = null;
    let soilMoisture = null;
    let solarRadiation = null;
    let cloudCover = null;
    let vpd = null;
    let isSurrogate = false;

    if (grid && Array.isArray(grid.lats) && Array.isArray(grid.lons)) {
      const nearestIndex = (coords, target) => coords.reduce((nearest, val, idx) =>
        Math.abs(val - target) < Math.abs(coords[nearest] - target) ? idx : nearest, 0);

      const row = nearestIndex(grid.lats, lat);
      const col = nearestIndex(grid.lons, lon);

      const rawTemp = grid.temperature?.[row]?.[col];
      tempC = Number.isFinite(rawTemp) ? (rawTemp > 100 ? rawTemp - 273.15 : rawTemp) : null;
      rainMm = grid.rainfall?.[row]?.[col] ?? null;
      humidity = grid.specific_humidity_gkg?.[row]?.[col] ?? null;
      windKmh = grid.wind_speed_kmh?.[row]?.[col] ?? null;
      pressure = grid.surface_pressure_hpa?.[row]?.[col] ?? null;
      soilMoisture = grid.soil_moisture_pct?.[row]?.[col] ?? null;
      solarRadiation = grid.solar_radiation_wm2?.[row]?.[col] ?? null;
      cloudCover = grid.cloud_cover_pct?.[row]?.[col] ?? null;
      vpd = grid.vapor_pressure_deficit_kpa?.[row]?.[col] ?? null;
      isSurrogate = true;
    }

    // Climatological reference baselines if surrogate data not yet generated
    if (tempC === null) {
      const baseTemp = this.selectedLocation.name === 'Perundurai' ? 28.2 : 27.8;
      tempC = baseTemp + (this.oceanHeat * 0.45) - ((this.greenspace - 50) * 0.02) + (this.carbonForcing - 2.6) * 0.4;
    }
    if (rainMm === null) {
      const baseRain = this.selectedLocation.name === 'Perundurai' ? 14.0 : 18.0;
      rainMm = Math.max(1, baseRain + (this.oceanHeat * 3.8) + ((this.greenspace - 50) * 0.08) - (this.iodIndex * 2.5));
    }
    if (humidity === null) humidity = 14.2 + (this.oceanHeat * 0.8);
    if (windKmh === null) windKmh = 15.2 - (this.aerosol * 0.04);
    if (pressure === null) pressure = 982.0 + ((100 - this.greenspace) * 0.05);
    if (soilMoisture === null) soilMoisture = Math.min(85, Math.max(10, 38.0 + (rainMm * 0.8) - ((tempC - 28) * 1.5)));
    if (solarRadiation === null) solarRadiation = Math.min(950, Math.max(150, 560.0 - (this.aerosol * 1.2) - (rainMm * 3.0)));
    if (cloudCover === null) cloudCover = Math.min(95, Math.max(5, 20.0 + (rainMm * 1.8)));
    if (vpd === null) vpd = Math.max(0.1, 0.65 + ((tempC - 28) * 0.08) - (humidity * 0.02));

    return { tempC, rainMm, humidity, windKmh, pressure, soilMoisture, solarRadiation, cloudCover, vpd, isSurrogate };
  },

  updateLocationTelemetryAndRisks() {
    const loc = this.selectedLocation;
    const { tempC, rainMm, humidity, windKmh, pressure, soilMoisture, solarRadiation, cloudCover, vpd, isSurrogate } = this.extractLocationMetrics(loc.lat, loc.lon);

    // Update telemetry elements
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

    setText('loc-tel-temp', `${tempC.toFixed(1)}°C`);
    setText('loc-tel-rain', `${rainMm.toFixed(1)} mm`);
    setText('loc-tel-soil', `${soilMoisture.toFixed(1)}%`);
    setText('loc-tel-solar', `${solarRadiation.toFixed(0)} W/m²`);
    setText('loc-tel-cloud', `${cloudCover.toFixed(1)}%`);
    setText('loc-tel-vpd', `${vpd.toFixed(2)} kPa`);
    setText('loc-tel-humidity', `${humidity.toFixed(1)} g/kg`);
    setText('loc-tel-wind', `${windKmh.toFixed(1)} km/h`);
    setText('loc-tel-press', `${pressure.toFixed(1)} hPa`);

    const telTempSub = document.getElementById('loc-tel-temp-sub');
    if (telTempSub) {
      const delta = tempC - 28.0;
      telTempSub.textContent = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}°C vs 30yr Normal`;
      telTempSub.style.color = delta > 1.5 ? 'var(--accent-red)' : delta > 0.5 ? '#ffab00' : 'var(--accent-green)';
    }

    const badgeSource = document.getElementById('loc-data-source-badge');
    if (badgeSource) {
      badgeSource.textContent = isSurrogate
        ? `PINN Surrogate Active (Run ${this.successfulSimulationCount})`
        : 'Baseline Reference (Run Sim to Update)';
      badgeSource.style.color = isSurrogate ? 'var(--accent-green)' : '#ffab00';
      badgeSource.style.borderColor = isSurrogate ? 'rgba(0,229,168,0.4)' : 'rgba(255,171,0,0.4)';
    }

    // Risk computations
    const heatIndex = tempC + (vpd > 1.2 ? -1.0 : +2.5) + (humidity * 0.2);
    const heatPercent = Math.min(100, Math.max(10, Math.round(((heatIndex - 20) / 30) * 100)));
    const heatLvl = document.getElementById('loc-risk-heat-lvl');
    const heatBar = document.getElementById('loc-risk-heat-bar');
    const heatDesc = document.getElementById('loc-risk-heat-desc');

    if (heatLvl && heatBar && heatDesc) {
      heatBar.style.width = `${heatPercent}%`;
      if (heatIndex >= 38) {
        heatLvl.className = 'loc-risk-level high'; heatLvl.textContent = 'High Caution';
        heatBar.style.background = 'var(--accent-red)';
        heatDesc.textContent = `Heat index ~${heatIndex.toFixed(1)}°C. High thermal stress; hydration advisory for outdoor agricultural workers.`;
      } else if (heatIndex >= 31) {
        heatLvl.className = 'loc-risk-level moderate'; heatLvl.textContent = 'Moderate';
        heatBar.style.background = '#ffab00';
        heatDesc.textContent = `Heat index ~${heatIndex.toFixed(1)}°C. Moderate microclimate warming observed across local urban footprint.`;
      } else {
        heatLvl.className = 'loc-risk-level low'; heatLvl.textContent = 'Comfortable';
        heatBar.style.background = 'var(--accent-green)';
        heatDesc.textContent = `Heat index ~${heatIndex.toFixed(1)}°C. Favorable thermal conditions within seasonal comfort range.`;
      }
    }

    const floodPercent = Math.min(100, Math.max(5, Math.round((rainMm / 80) * 100)));
    const floodLvl = document.getElementById('loc-risk-flood-lvl');
    const floodBar = document.getElementById('loc-risk-flood-bar');
    const floodDesc = document.getElementById('loc-risk-flood-desc');

    if (floodLvl && floodBar && floodDesc) {
      floodBar.style.width = `${floodPercent}%`;
      if (rainMm >= 50) {
        floodLvl.className = 'loc-risk-level high'; floodLvl.textContent = 'High Risk';
        floodBar.style.background = 'var(--accent-red)';
        floodDesc.textContent = `${rainMm.toFixed(1)} mm projected. Surface runoff alert for low-lying water bodies and drainage culverts.`;
      } else if (rainMm >= 25) {
        floodLvl.className = 'loc-risk-level moderate'; floodLvl.textContent = 'Moderate';
        floodBar.style.background = '#ffab00';
        floodDesc.textContent = `${rainMm.toFixed(1)} mm rainfall. Moderate flow into Bhavani & Noyyal catchment tributaries.`;
      } else {
        floodLvl.className = 'loc-risk-level low'; floodLvl.textContent = 'Low Risk';
        floodBar.style.background = 'var(--accent-green)';
        floodDesc.textContent = `Precipitation (${rainMm.toFixed(1)} mm) well within local drainage & percolation capacity.`;
      }
    }

    // Drought / Aridity from soilMoisture
    const droughtLvl = document.getElementById('loc-risk-drought-lvl');
    const droughtBar = document.getElementById('loc-risk-drought-bar');
    const droughtDesc = document.getElementById('loc-risk-drought-desc');
    const aridityScore = Math.min(100, Math.max(5, Math.round(100 - soilMoisture)));

    if (droughtLvl && droughtBar && droughtDesc) {
      droughtBar.style.width = `${aridityScore}%`;
      if (soilMoisture < 25) {
        droughtLvl.className = 'loc-risk-level high'; droughtLvl.textContent = 'High Aridity';
        droughtBar.style.background = 'var(--accent-red)';
        droughtDesc.textContent = `Soil moisture critical (${soilMoisture.toFixed(1)}%). Elevated crop water stress in Kongu basin.`;
      } else if (soilMoisture < 45) {
        droughtLvl.className = 'loc-risk-level moderate'; droughtLvl.textContent = 'Moderate';
        droughtBar.style.background = '#ffab00';
        droughtDesc.textContent = `Soil moisture moderate (${soilMoisture.toFixed(1)}%). Drip irrigation recommended for cash crops.`;
      } else {
        droughtLvl.className = 'loc-risk-level low'; droughtLvl.textContent = 'Optimal';
        droughtBar.style.background = 'var(--accent-green)';
        droughtDesc.textContent = `Soil moisture optimal (${soilMoisture.toFixed(1)}%). Favorable root hydration across agrarian zone.`;
      }
    }

    const airLvl = document.getElementById('loc-risk-air-lvl');
    const airBar = document.getElementById('loc-risk-air-bar');
    const airDesc = document.getElementById('loc-risk-air-desc');
    const stagnationScore = Math.min(100, Math.max(10, Math.round((35 - windKmh) * 2.8 + (this.aerosol * 0.4))));

    if (airLvl && airBar && airDesc) {
      airBar.style.width = `${stagnationScore}%`;
      if (windKmh < 9) {
        airLvl.className = 'loc-risk-level high'; airLvl.textContent = 'Stagnant';
        airBar.style.background = 'var(--accent-red)';
        airDesc.textContent = `Low wind velocity (${windKmh.toFixed(1)} km/h) creates boundary inversion trapping particulate matter.`;
      } else if (windKmh < 15) {
        airLvl.className = 'loc-risk-level moderate'; airLvl.textContent = 'Moderate';
        airBar.style.background = '#ffab00';
        airDesc.textContent = `Steady ${windKmh.toFixed(1)} km/h flow maintains moderate dispersion across the industrial cluster.`;
      } else {
        airLvl.className = 'loc-risk-level low'; airLvl.textContent = 'Optimal';
        airBar.style.background = 'var(--accent-green)';
        airDesc.textContent = `Strong ${windKmh.toFixed(1)} km/h ventilation ensures rapid atmospheric dispersion away from town center.`;
      }
    }

    // Local Advisories
    const advWater = document.getElementById('loc-adv-water');
    const advInd = document.getElementById('loc-adv-industry');
    const advAgri = document.getElementById('loc-adv-agri');

    if (loc.name === 'Perundurai') {
      if (advWater) advWater.textContent = 'Bhavani & Lower Bhavani Project (LBP) sub-basins: Channel flow is steady. Percolation ponds in Perundurai and Chennimalai blocks are replenishing regional aquifer storage.';
      if (advInd) advInd.textContent = `SIPCOT Industrial Park: Solar flux ${solarRadiation.toFixed(0)} W/m² with ventilation ${windKmh.toFixed(1)} km/h; continuous stack emission monitoring confirms safe lateral dispersion along Kongu highway corridor.`;
      if (advAgri) advAgri.textContent = `Erode Agricultural Extension Advisory: Soil moisture at ${soilMoisture.toFixed(1)}% supports turmeric curing and sugarcane growth. VPD (${vpd.toFixed(2)} kPa) indicates moderate transpiration loss.`;
    } else {
      if (advWater) advWater.textContent = `Municipal surface reservoirs and storm canals for ${loc.name} are maintaining capacity within projected inflow thresholds.`;
      if (advInd) advInd.textContent = `Urban boundary layer in ${loc.name} is stable with continuous atmospheric flushing under prevailing synoptic winds.`;
      if (advAgri) advAgri.textContent = `Regional agrarian belt surrounding ${loc.name}: Soil moisture (${soilMoisture.toFixed(1)}%) is consistent with seasonal expectations.`;
    }
  },

  updateSelectedPeriodLabels() {
    const monthName = new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2025, this.simulationMonth - 1, 1));
    const period = `${this.simulationYear} / ${monthName}`;
    const status = document.getElementById('twin-period-status');
    const mapLabel = document.getElementById('twin-map-period-label');
    const buttonLabel = document.querySelector('#btn-run-simulation .twin-btn-subtext');
    if (status) status.textContent = period;
    if (mapLabel) {
      mapLabel.textContent = this.lastSimulationData
        ? `Modelled ${IndiaMap.modelLayers[this.activeLayer]?.label.toLowerCase() || this.activeLayer} · ${this.lastSimulationData.metadata.simulation_period} · Run ${this.successfulSimulationCount}`
        : `No simulation data · Run a simulation to populate the map (${period})`;
    }
    if (buttonLabel) buttonLabel.textContent = period;
  },

  renderMap() {
    const container = document.getElementById('twin-map');
    if (!container) return;

    IndiaMap.render('twin-map', {
      activeLayer: this.activeLayer,
      showLabels: false,
      modelGrid: this.lastSimulationData?.grid || null,
      useReferenceData: false,
      simulationPeriod: this.lastSimulationData?.metadata?.simulation_period,
      simulationRunId: this.successfulSimulationCount,
    });
    this.updateMapLegend();
  },

  updateMapLegend() {
    const layer = this.activeLayer;
    const labels = IndiaMap.getLegendLabels(layer);
    const gradient = document.getElementById('twin-map-legend-gradient');
    if (gradient) gradient.style.background = IndiaMap.getLegendGradient(layer);
    ['min', 'mid', 'max'].forEach((key, index) => {
      const element = document.getElementById(`twin-map-legend-${key}`);
      if (element) element.textContent = labels[index];
    });
    const label = document.getElementById('twin-map-period-label');
    if (label) {
      const layerName = IndiaMap.modelLayers[layer]?.label.toLowerCase() || layer;
      label.textContent = this.lastSimulationData
        ? `Modelled ${layerName} · ${this.lastSimulationData.metadata.simulation_period} · Run ${this.successfulSimulationCount}`
        : `No simulation data · Run a simulation to populate the map`;
    }
  },

  runSimulation(isLocationTab = false) {
    const requestId = ++this.simulationRequestId;
    const overlay = isLocationTab
      ? document.getElementById('twin-loc-sim-overlay')
      : document.getElementById('twin-sim-overlay');
    if (overlay) overlay.classList.add('active');

    const button = isLocationTab
      ? document.getElementById('btn-run-loc-simulation')
      : document.getElementById('btn-run-simulation');
    const status = document.getElementById('twin-run-status');
    const exportButton = document.getElementById('btn-export-report');
    if (button) button.disabled = true;
    this.setSimulationControlsDisabled(true);

    const requestedPeriod = `${this.simulationYear}-${String(this.simulationMonth).padStart(2, '0')}`;
    const previousPeriod = this.lastSimulationData?.metadata?.simulation_period;
    const requestedParameters = {
      physics_weight: this.physicsWeight,
      ocean_heat_anomaly: this.oceanHeat,
      greenspace_index: this.greenspace,
      aerosol_load: this.aerosol,
      iod_index: this.iodIndex,
      urbanization_rate: this.urbanization,
      carbon_forcing: this.carbonForcing,
    };
    if (exportButton) exportButton.style.display = previousPeriod ? 'flex' : 'none';
    if (status) {
      status.textContent = previousPeriod
        ? `Updating to ${requestedPeriod}; showing last completed map (${previousPeriod}) until the new run succeeds.`
        : `Running synthetic climate scenario for ${requestedPeriod}…`;
    }

    const query = new URLSearchParams({
      physics_weight: String(this.physicsWeight),
      ocean_heat: String(this.oceanHeat),
      greenspace: String(this.greenspace),
      aerosol: String(this.aerosol),
      iod_index: String(this.iodIndex),
      urbanization: String(this.urbanization),
      carbon_forcing: String(this.carbonForcing),
      year: String(this.simulationYear),
      month: String(this.simulationMonth),
    });
    const baseUrl = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

    fetch(`${baseUrl}/api/simulation/run?${query}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || data.error || `HTTP ${response.status}`);
        return data;
      })
      .then(data => {
        if (requestId !== this.simulationRequestId) return;
        if (data.status !== 'success') throw new Error(data.error || 'Model returned an unsuccessful result');
        this.validateSimulationOutput(data, requestedPeriod, requestedParameters);
        this.processSimulationData(data);
        if (status) status.textContent = `Completed ${data.metadata.simulation_period} using ${data.metadata.baseline_source}.`;
      })
      .catch(error => {
        if (requestId !== this.simulationRequestId) return;
        console.error('Simulation API Error:', error);
        if (status) {
          status.textContent = previousPeriod
            ? `Update failed (${error.message}). Map and metrics still show last successful run ${previousPeriod}.`
            : `Simulation failed: ${error.message}`;
        }
        if (typeof Components !== 'undefined') Components.showToast('Simulation failed. Check the model server and try again.', 'error');
      })
      .finally(() => {
        if (requestId !== this.simulationRequestId) return;
        const ov1 = document.getElementById('twin-sim-overlay');
        const ov2 = document.getElementById('twin-loc-sim-overlay');
        if (ov1) ov1.classList.remove('active');
        if (ov2) ov2.classList.remove('active');
        const b1 = document.getElementById('btn-run-simulation');
        const b2 = document.getElementById('btn-run-loc-simulation');
        if (b1) b1.disabled = false;
        if (b2) b2.disabled = false;
        this.setSimulationControlsDisabled(false);
      });
  },

  setSimulationControlsDisabled(disabled) {
    document.querySelectorAll('#twin-year-slider, #twin-month-select, .twin-slider-group input, #btn-run-loc-simulation').forEach(control => {
      control.disabled = disabled;
    });
  },

  validateSimulationOutput(data, requestedPeriod, requestedParameters) {
    if (data.metadata?.simulation_period !== requestedPeriod) {
      throw new Error(`Model returned ${data.metadata?.simulation_period || 'an unknown period'} instead of ${requestedPeriod}`);
    }
    Object.entries(requestedParameters).forEach(([key, expected]) => {
      const actual = data.metadata?.[key];
      if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1e-9) {
        throw new Error(`Model result does not match submitted ${key.replaceAll('_', ' ')}`);
      }
    });
    if (!Array.isArray(data.grid?.lats) || !Array.isArray(data.grid?.lons) || !data.grid.lats.length || !data.grid.lons.length) {
      throw new Error('Model returned invalid map coordinates');
    }

    Object.values(IndiaMap.modelLayers).forEach(layer => {
      const field = data.grid[layer.field];
      if (!Array.isArray(field) || field.length !== data.grid.lats.length ||
          field.some(row => !Array.isArray(row) || row.length !== data.grid.lons.length || row.some(value => !Number.isFinite(value)))) {
        throw new Error(`Model returned an invalid ${layer.label.toLowerCase()} grid`);
      }
    });

    ['mean_temperature_c', 'mean_rainfall_mm', 'peak_rainfall_mm', 'mean_specific_humidity_gkg', 'mean_wind_speed_kmh', 'mean_surface_pressure_hpa', 'mean_soil_moisture_pct', 'mean_solar_radiation_wm2', 'mean_cloud_cover_pct', 'mean_vapor_pressure_deficit_kpa']
      .forEach(metric => {
        if (!Number.isFinite(data.summary?.[metric])) throw new Error(`Model returned an invalid ${metric.replaceAll('_', ' ')}`);
      });
  },

  processSimulationData(data) {
    const accuracyEl = document.getElementById('insight-accuracy');
    const delayEl = document.getElementById('insight-delay');
    const droughtEl = document.getElementById('insight-drought');
    const floodEl = document.getElementById('insight-flood');

    if (accuracyEl) accuracyEl.textContent = Number.isFinite(data.confidence?.spread) ? data.confidence.spread.toFixed(3) : '—';
    if (delayEl) {
      delayEl.textContent = data.insights?.onset_delay || '—';
      const days = parseInt((data.insights?.onset_delay || '').match(/\d+/)?.[0] || 0);
      delayEl.style.color = days > 8 ? 'var(--accent-red)' : days > 4 ? 'var(--accent-orange)' : 'var(--accent-green)';
    }
    if (droughtEl) {
      droughtEl.textContent = data.insights?.drought_risk || '—';
      const lvl = data.insights?.drought_risk || '';
      droughtEl.style.color = lvl.includes('Critical') || lvl.includes('High') ? 'var(--accent-red)' : lvl.includes('Medium') ? 'var(--accent-orange)' : 'var(--accent-green)';
    }
    if (floodEl) {
      floodEl.textContent = data.insights?.flood_risk || '—';
      const lvl = data.insights?.flood_risk || '';
      floodEl.style.color = lvl.includes('Critical') || lvl.includes('High') ? 'var(--accent-red)' : lvl.includes('Medium') ? 'var(--accent-orange)' : 'var(--accent-green)';
    }

    const setMetric = (id, value, unit) => {
      const element = document.getElementById(id);
      if (element) element.textContent = Number.isFinite(value) ? `${value.toFixed(2)} ${unit}` : '—';
    };
    setMetric('insight-temperature', data.summary?.mean_temperature_c, '°C');
    setMetric('insight-rainfall', data.summary?.mean_rainfall_mm, 'mm');
    setMetric('insight-soil-moisture', data.summary?.mean_soil_moisture_pct, '%');
    setMetric('insight-solar-radiation', data.summary?.mean_solar_radiation_wm2, 'W/m²');
    setMetric('insight-cloud-cover', data.summary?.mean_cloud_cover_pct, '%');
    setMetric('insight-vpd', data.summary?.mean_vapor_pressure_deficit_kpa, 'kPa');
    setMetric('insight-humidity', data.summary?.mean_specific_humidity_gkg, 'g/kg');
    setMetric('insight-wind-speed', data.summary?.mean_wind_speed_kmh, 'km/h');
    setMetric('insight-surface-pressure', data.summary?.mean_surface_pressure_hpa, 'hPa');

    this.successfulSimulationCount++;
    this.lastSimulationData = data;

    // Refresh national map
    this.renderMap();

    // Refresh location tab map and telemetry
    this.renderLocationMap();
    this.updateLocationTelemetryAndRisks();

    window.dispatchEvent(new CustomEvent('climate-twin:simulation-updated', {
      detail: { data, runId: this.successfulSimulationCount },
    }));

    const btnSubtext = document.querySelector('#btn-run-simulation .twin-btn-subtext');
    if (btnSubtext && data.metadata && data.metadata.inference_time_seconds) {
      btnSubtext.textContent = `Inference Time: ${data.metadata.inference_time_seconds.toFixed(2)} seconds`;
    }

    const btnExport = document.getElementById('btn-export-report');
    if (btnExport) btnExport.style.display = 'flex';

    if (typeof Components !== 'undefined') {
      const inferenceTime = data.metadata?.inference_time_seconds ? data.metadata.inference_time_seconds.toFixed(2) : '0.00';
      Components.showToast(`Surrogate model completed for ${data.metadata?.simulation_period || 'selected period'} in ${inferenceTime} seconds.`, 'success');
    }
  },

  exportReport() {
    if (!this.lastSimulationData) return;
    
    const reportData = {
      title: "ISRO Climate Digital Twin - AI Simulation Report",
      timestamp: new Date().toISOString(),
      parameters: {
        physics_weight_pinn: this.physicsWeight,
        ocean_heat_anomaly_C: this.oceanHeat,
        greenspace_ndvi_index: this.greenspace,
        aerosol_load: this.aerosol,
        iod_index: this.iodIndex,
        urbanization_rate: this.urbanization,
        carbon_forcing: this.carbonForcing,
        simulation_year: this.simulationYear,
        simulation_month: this.simulationMonth
      },
      insights: this.lastSimulationData.insights,
      model_performance: this.lastSimulationData.performance || {},
      confidence_intervals: this.lastSimulationData.confidence || {},
      summary: this.lastSimulationData.summary || {}
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate_twin_report_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof Components !== 'undefined') {
      Components.showToast('National simulation report downloaded successfully.', 'success');
    }
  },

  exportLocationReport() {
    const loc = this.selectedLocation;
    const metrics = this.extractLocationMetrics(loc.lat, loc.lon);

    const reportData = {
      title: `ISRO Climate Digital Twin - Location Prediction Dossier (${loc.name})`,
      timestamp: new Date().toISOString(),
      location: {
        name: loc.name,
        district: loc.district,
        state: loc.state,
        latitude: loc.lat,
        longitude: loc.lon,
        zone: loc.zone,
        fno_grid_cell: {
          row: Math.round((loc.lat - 8.0) / 0.5),
          column: Math.round((loc.lon - 68.0) / 0.5)
        }
      },
      simulation_period: `${this.simulationYear}-${String(this.simulationMonth).padStart(2, '0')}`,
      forcing_parameters: {
        physics_weight_pinn: this.physicsWeight,
        ocean_heat_anomaly_C: this.oceanHeat,
        greenspace_index: this.greenspace,
        aerosol_load: this.aerosol,
        iod_index: this.iodIndex,
        urbanization_rate: this.urbanization,
        carbon_forcing: this.carbonForcing,
      },
      local_microclimate_metrics: {
        surface_temperature_C: metrics.tempC,
        precipitation_mm: metrics.rainMm,
        soil_moisture_pct: metrics.soilMoisture,
        solar_radiation_wm2: metrics.solarRadiation,
        cloud_cover_pct: metrics.cloudCover,
        vapor_pressure_deficit_kpa: metrics.vpd,
        specific_humidity_gkg: metrics.humidity,
        wind_speed_kmh: metrics.windKmh,
        surface_pressure_hpa: metrics.pressure,
        data_source: metrics.isSurrogate ? 'PINN-FFNO Neural Surrogate' : 'Climatological Baseline'
      },
      local_action_advisories: {
        perundurai_sipcot_status: loc.name === 'Perundurai' ? 'Optimal boundary layer ventilation' : 'N/A',
        hydrological_catchment: loc.name === 'Perundurai' ? 'Bhavani & Noyyal sub-basin stable' : 'Regional drainage within normal limits'
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate_twin_${loc.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof Components !== 'undefined') {
      Components.showToast(`Location prediction report for ${loc.name} downloaded successfully.`, 'success');
    }
  }
};

window.TwinPage = TwinPage;

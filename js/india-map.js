/* =================================================================
   SVG India Map — Interactive State Map
   ================================================================= */

const IndiaMap = {

  modelLayers: {
    temperature: { label: 'Temperature', field: 'temperature', unit: '°C', range: [-5, 45], precision: 1 },
    rainfall: { label: 'Rainfall', field: 'rainfall', unit: 'mm', range: [0, 500], precision: 1 },
    specificHumidity: { label: 'Specific Humidity', field: 'specific_humidity_gkg', unit: 'g/kg', range: [0, 30], precision: 2 },
    windSpeed: { label: 'Wind Speed', field: 'wind_speed_kmh', unit: 'km/h', range: [0, 60], precision: 1 },
    surfacePressure: { label: 'Surface Pressure', field: 'surface_pressure_hpa', unit: 'hPa', range: [960, 1040], precision: 1 },
    soilMoisture: { label: 'Soil Moisture', field: 'soil_moisture_pct', unit: '%', range: [5, 90], precision: 1 },
    solarRadiation: { label: 'Solar Radiation', field: 'solar_radiation_wm2', unit: 'W/m²', range: [100, 1000], precision: 0 },
    cloudCover: { label: 'Cloud Cover', field: 'cloud_cover_pct', unit: '%', range: [0, 100], precision: 1 },
    vaporPressureDeficit: { label: 'Vapor Pressure Deficit', field: 'vapor_pressure_deficit_kpa', unit: 'kPa', range: [0.1, 4.5], precision: 2 },
  },

  // Simplified India state paths (stylized for dashboard use)
  states: {
    'Jammu & Kashmir': { path: 'M 185,25 L 210,20 230,35 240,55 225,70 205,75 190,60 175,45 Z', center: [210, 45], color: '#2196F3' },
    'Himachal Pradesh': { path: 'M 200,70 L 220,68 230,80 220,90 205,88 195,80 Z', center: [212, 80], color: '#4CAF50' },
    'Punjab': { path: 'M 185,82 L 205,78 210,92 200,100 185,98 180,90 Z', center: [195, 90], color: '#FF9800' },
    'Uttarakhand': { path: 'M 225,80 L 250,78 258,92 248,102 230,98 222,88 Z', center: [240, 90], color: '#9C27B0' },
    'Haryana': { path: 'M 190,98 L 208,95 215,108 205,118 190,115 185,105 Z', center: [200, 108], color: '#F44336' },
    'Delhi': { path: 'M 208,107 L 215,105 218,112 212,115 Z', center: [213, 110], color: '#E91E63' },
    'Rajasthan': { path: 'M 140,110 L 185,105 195,120 195,160 175,185 145,180 120,155 125,130 Z', center: [160, 148], color: '#FF5722' },
    'Uttar Pradesh': { path: 'M 210,108 L 260,95 290,110 295,135 275,155 245,160 220,150 200,135 195,118 Z', center: [248, 130], color: '#2196F3' },
    'Bihar': { path: 'M 290,125 L 320,120 335,130 330,148 310,152 290,145 Z', center: [312, 138], color: '#4CAF50' },
    'Sikkim': { path: 'M 325,108 L 335,105 340,115 332,118 Z', center: [332, 112], color: '#FFEB3B' },
    'Arunachal Pradesh': { path: 'M 355,92 L 395,85 405,100 390,112 365,110 350,102 Z', center: [378, 100], color: '#00BCD4' },
    'Nagaland': { path: 'M 390,112 L 405,108 410,120 400,128 388,122 Z', center: [398, 118], color: '#8BC34A' },
    'Manipur': { path: 'M 388,128 L 402,125 408,138 398,145 385,138 Z', center: [396, 135], color: '#FF9800' },
    'Mizoram': { path: 'M 385,145 L 398,142 405,158 395,168 382,158 Z', center: [392, 155], color: '#9C27B0' },
    'Tripura': { path: 'M 370,148 L 382,145 388,158 378,165 368,158 Z', center: [378, 155], color: '#F44336' },
    'Meghalaya': { path: 'M 340,120 L 370,115 378,125 365,135 340,132 Z', center: [355, 125], color: '#3F51B5' },
    'Assam': { path: 'M 335,105 L 358,100 390,108 385,128 370,135 340,130 330,118 Z', center: [360, 118], color: '#009688' },
    'West Bengal': { path: 'M 310,148 L 335,135 345,150 340,180 325,200 310,195 305,170 Z', center: [325, 170], color: '#E91E63' },
    'Jharkhand': { path: 'M 290,148 L 315,145 325,160 315,175 295,178 285,165 Z', center: [305, 162], color: '#795548' },
    'Odisha': { path: 'M 285,178 L 315,172 330,195 320,215 295,220 275,205 278,190 Z', center: [300, 198], color: '#607D8B' },
    'Chhattisgarh': { path: 'M 255,165 L 285,160 295,180 288,205 268,210 248,195 250,175 Z', center: [270, 185], color: '#FF5722' },
    'Madhya Pradesh': { path: 'M 195,140 L 255,135 260,165 250,180 220,185 195,175 185,155 Z', center: [225, 160], color: '#4CAF50' },
    'Gujarat': { path: 'M 110,160 L 145,150 160,165 165,195 145,215 125,220 105,200 95,180 Z', center: [130, 188], color: '#FFC107' },
    'Maharashtra': { path: 'M 145,195 L 195,180 225,190 245,200 240,230 215,250 175,255 148,240 135,220 Z', center: [192, 222], color: '#2196F3' },
    'Telangana': { path: 'M 225,225 L 260,215 275,230 268,252 245,258 228,245 Z', center: [250, 238], color: '#E91E63' },
    'Andhra Pradesh': { path: 'M 228,250 L 270,248 290,220 300,240 295,275 270,295 245,290 225,270 Z', center: [262, 268], color: '#FF9800' },
    'Karnataka': { path: 'M 165,250 L 210,245 235,260 230,295 205,315 175,310 155,285 158,265 Z', center: [195, 280], color: '#9C27B0' },
    'Goa': { path: 'M 152,270 L 162,268 165,280 155,282 Z', center: [158, 275], color: '#00BCD4' },
    'Kerala': { path: 'M 170,310 L 185,305 195,330 185,360 175,365 165,345 160,325 Z', center: [178, 338], color: '#4CAF50' },
    'Tamil Nadu': { path: 'M 205,300 L 240,290 265,300 260,330 240,355 220,360 200,340 195,320 Z', center: [230, 328], color: '#F44336' },
  },

  // Render the map into a container
  render(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
      width = 450,
      height = 420,
      activeLayer = 'temperature',
      onStateClick = null,
      onStateHover = null,
      showLabels = false,
      modelGrid = null,
      useReferenceData = true,
      simulationPeriod = null,
      simulationRunId = null,
    } = options;

    const climateData = modelGrid
      ? this._deriveStateValuesFromGrid(modelGrid, activeLayer)
      : useReferenceData ? this._generateClimateData(activeLayer) : {};

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '70 10 360 380');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.dataset.mapLayer = activeLayer;
    if (modelGrid) {
      svg.dataset.mapSource = 'simulation';
      svg.dataset.simulationPeriod = simulationPeriod || '';
      svg.dataset.simulationRunId = String(simulationRunId ?? '');
    } else {
      svg.dataset.mapSource = useReferenceData ? 'reference' : 'unavailable';
    }
    svg.style.maxWidth = width + 'px';
    svg.style.maxHeight = height + 'px';

    // Background glow
    const defs = document.createElementNS(svgNS, 'defs');

    // Radial glow filter
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', 'glow');
    filter.innerHTML = `<feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    defs.appendChild(filter);

    svg.appendChild(defs);

    // Draw states
    Object.entries(this.states).forEach(([name, state], stateIndex) => {
      const group = document.createElementNS(svgNS, 'g');
      group.setAttribute('class', 'map-state');
      group.setAttribute('data-state', name);

      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', state.path);

      const value = Number.isFinite(climateData[name]) ? climateData[name] : null;
      const color = value === null ? 'rgba(70, 82, 104, 0.28)' : this._getLayerColor(activeLayer, value);

      path.setAttribute('fill', color);
      if (value !== null) path.dataset.mapValue = String(value);
      path.setAttribute('stroke', 'rgba(0, 194, 255, 0.2)');
      path.setAttribute('stroke-width', '1');
      path.style.cursor = value === null ? 'default' : 'pointer';
      path.style.transition = 'all 0.2s ease';
      if (modelGrid) {
        path.classList.add('map-grid-refresh');
        path.style.animationDelay = `${Math.min(stateIndex * 12, 300)}ms`;
      }

      if (value !== null) path.addEventListener('mouseenter', (e) => {
        path.setAttribute('stroke', '#00C2FF');
        path.setAttribute('stroke-width', '2');
        path.style.filter = 'brightness(1.3) drop-shadow(0 0 8px rgba(0,194,255,0.3))';
        if (onStateHover) onStateHover(name, value, e);
        this._showTooltip(svg, name, value, activeLayer, state.center, container);
      });

      if (value !== null) path.addEventListener('mouseleave', () => {
        path.setAttribute('stroke', 'rgba(0, 194, 255, 0.2)');
        path.setAttribute('stroke-width', '1');
        path.style.filter = 'none';
        this._hideTooltip(container);
      });

      if (value !== null) path.addEventListener('click', () => {
        if (onStateClick) onStateClick(name, climateData[name]);
      });

      group.appendChild(path);

      // Optional state labels
      if (showLabels) {
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', state.center[0]);
        text.setAttribute('y', state.center[1]);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '6');
        text.setAttribute('fill', 'rgba(255,255,255,0.6)');
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.setAttribute('pointer-events', 'none');
        text.textContent = name.length > 10 ? name.substring(0, 8) + '..' : name;
        group.appendChild(text);
      }

      svg.appendChild(group);
    });

    // Render user location marker if provided and within India bounds
    if (options.userLocation && Number.isFinite(options.userLocation.lat) && Number.isFinite(options.userLocation.lon)) {
      const uLat = options.userLocation.lat;
      const uLon = options.userLocation.lon;
      if (uLat >= 6.0 && uLat <= 38.0 && uLon >= 67.0 && uLon <= 98.0) {
        const uY = 45 + (36.0 - uLat) * ((350.0 - 45.0) / (36.0 - 8.5));
        const uX = 110 + (uLon - 69.0) * ((380.0 - 110.0) / (94.0 - 69.0));

        const pinLabel = options.userLocation.label || (options.userLocation.name ? `📍 ${options.userLocation.name.toUpperCase()}` : '📍 YOU ARE HERE');
        const pinColor = options.userLocation.color || '#00E5A8';
        const boxWidth = Math.max(72, pinLabel.length * 5.6 + 16);

        const userPinGroup = document.createElementNS(svgNS, 'g');
        userPinGroup.setAttribute('class', 'user-map-pin');
        userPinGroup.setAttribute('id', 'user-map-pin');
        userPinGroup.style.cursor = 'pointer';

        userPinGroup.innerHTML = `
          <circle cx="${uX}" cy="${uY}" r="15" fill="${pinColor}" opacity="0.25" class="user-pulse-ring"></circle>
          <circle cx="${uX}" cy="${uY}" r="6" fill="${pinColor}" opacity="0.65"></circle>
          <circle cx="${uX}" cy="${uY}" r="3.2" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5"></circle>
          <rect x="${uX - boxWidth / 2}" y="${uY - 23}" width="${boxWidth}" height="16" rx="4" fill="rgba(11, 16, 32, 0.9)" stroke="${pinColor}" stroke-width="0.8"></rect>
          <text x="${uX}" y="${uY - 12}" text-anchor="middle" font-size="6.5" font-weight="700" fill="${pinColor}" font-family="Inter, sans-serif">${pinLabel}</text>
        `;

        userPinGroup.addEventListener('click', () => {
          if (options.onUserLocationClick) {
            options.onUserLocationClick(options.userLocation);
          } else if (typeof Components !== 'undefined') {
            Components.showToast(`Location: ${options.userLocation.name || 'Selected Location'} (${uLat.toFixed(2)}°N, ${uLon.toFixed(2)}°E)`, 'success');
          }
        });

        svg.appendChild(userPinGroup);
      }
    }

    // Clear and append
    container.innerHTML = '';
    container.appendChild(svg);

    // Add tooltip container
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'map-tooltip';
    tooltipEl.style.cssText = `
      position:absolute;pointer-events:none;opacity:0;transition:opacity 0.15s;
      background:rgba(17,24,39,0.95);backdrop-filter:blur(12px);
      border:1px solid rgba(255,255,255,0.1);border-radius:10px;
      padding:10px 14px;font-size:12px;color:#F1F5F9;z-index:100;
      box-shadow:0 8px 30px rgba(0,0,0,0.5);min-width:150px;
    `;
    container.style.position = 'relative';
    container.appendChild(tooltipEl);

    return { svg, updateLayer: (layer) => this.render(containerId, { ...options, activeLayer: layer }) };
  },

  _deriveStateValuesFromGrid(grid, layer) {
    const layerConfig = this.modelLayers[layer];
    if (!layerConfig) throw new Error(`Unsupported simulation map layer: ${layer}`);
    const field = grid?.[layerConfig.field];
    if (!Array.isArray(field) || !Array.isArray(grid?.lats) || !Array.isArray(grid?.lons) ||
        grid.lats.length === 0 || grid.lons.length === 0 || field.length !== grid.lats.length ||
        grid.lats.some(value => !Number.isFinite(value)) || grid.lons.some(value => !Number.isFinite(value)) ||
        field.some(row => !Array.isArray(row) || row.length !== grid.lons.length || row.some(value => !Number.isFinite(value)))) {
      throw new Error(`Simulation map is missing a valid ${layerConfig.label.toLowerCase()} grid`);
    }

    const nearestIndex = (coordinates, target) => coordinates.reduce((nearest, value, index) =>
      Math.abs(value - target) < Math.abs(coordinates[nearest] - target) ? index : nearest, 0);
    const values = {};

    Object.keys(this.states).forEach(name => {
      const state = LocationData.states[name];
      const place = Object.values(state?.districts || {})
        .flatMap(district => district.places || [])
        .find(candidate => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lon));
      if (!place) {
        throw new Error(`No representative map coordinate is configured for ${name}`);
      }

      const row = nearestIndex(grid.lats, place.lat);
      const column = nearestIndex(grid.lons, place.lon);
      const gridValue = field[row]?.[column];
      if (!Number.isFinite(gridValue)) throw new Error(`No valid ${layerConfig.label.toLowerCase()} value for ${name}`);
      values[name] = layer === 'temperature' ? gridValue - 273.15 : gridValue;
    });

    return values;
  },

  _showTooltip(svg, name, value, layer, center, container) {
    const tooltip = container.querySelector('.map-tooltip');
    if (!tooltip) return;

    const unitMap = {
      temperature: '°C', rainfall: 'mm', humidity: '%', specificHumidity: 'g/kg',
      windSpeed: 'km/h', surfacePressure: 'hPa', soilMoisture: '%', solarRadiation: 'W/m²',
      cloudCover: '%', vaporPressureDeficit: 'kPa', airQuality: 'AQI', floodRisk: '%',
      heatwaveRisk: '%', droughtRisk: '%'
    };
    const labelMap = {
      temperature: 'Temperature', rainfall: 'Rainfall', humidity: 'Humidity', specificHumidity: 'Specific Humidity',
      windSpeed: 'Wind Speed', surfacePressure: 'Surface Pressure', soilMoisture: 'Soil Moisture', solarRadiation: 'Solar Radiation',
      cloudCover: 'Cloud Cover', vaporPressureDeficit: 'Vapor Pressure Deficit', airQuality: 'Air Quality', floodRisk: 'Flood Risk',
      heatwaveRisk: 'Heatwave Risk', droughtRisk: 'Drought Risk'
    };
    const layerConfig = this.modelLayers[layer];
    const displayedValue = layerConfig && Number.isFinite(value) ? value.toFixed(layerConfig.precision) : value;

    tooltip.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;color:#00C2FF">${name}</div>
      <div style="color:#94A3B8;font-size:11px">${labelMap[layer] || layer}</div>
      <div style="font-size:18px;font-weight:700;font-family:'Space Grotesk',sans-serif;margin-top:2px">${displayedValue}${unitMap[layer] || ''}</div>
    `;

    const rect = svg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const svgBox = svg.viewBox.baseVal;
    const scaleX = rect.width / svgBox.width;
    const scaleY = rect.height / svgBox.height;
    const x = (center[0] - svgBox.x) * scaleX + (rect.left - containerRect.left);
    const y = (center[1] - svgBox.y) * scaleY + (rect.top - containerRect.top);

    tooltip.style.left = (x + 15) + 'px';
    tooltip.style.top = (y - 30) + 'px';
    tooltip.style.opacity = '1';
  },

  _hideTooltip(container) {
    const tooltip = container.querySelector('.map-tooltip');
    if (tooltip) tooltip.style.opacity = '0';
  },

  _generateClimateData(layer) {
    const ranges = {
      temperature: [-5, 45], rainfall: [0, 500], humidity: [30, 95], specificHumidity: [0, 30],
      windSpeed: [0, 60], airQuality: [30, 400], floodRisk: [0, 90],
      heatwaveRisk: [0, 85], droughtRisk: [0, 80], surfacePressure: [960, 1040],
      soilMoisture: [5, 90], solarRadiation: [100, 1000], cloudCover: [0, 100], vaporPressureDeficit: [0.1, 4.5]
    };
    const [min, max] = ranges[layer] || [0, 100];
    const data = {};

    Object.keys(this.states).forEach(name => {
      // Try to get real data first
      if (typeof LocationData !== 'undefined' && LocationData.states[name]) {
        const state = LocationData.states[name];
        if (layer === 'temperature') {
          data[name] = state.temp || 30;
          return;
        }
        if (layer === 'humidity') {
          data[name] = state.humidity || 50;
          return;
        }
        if (layer === 'windSpeed') {
          data[name] = state.wind || 10;
          return;
        }
        if (layer === 'airQuality') {
          data[name] = state.aqi || 80;
          return;
        }
        if (layer === 'rainfall') {
          data[name] = state.rainfall_24h || 0;
          return;
        }
      }

      // Fallback: deterministic seed for missing layers (like floodRisk)
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
      const normalized = (Math.abs(hash) % 1000) / 1000;
      data[name] = Math.round(min + normalized * (max - min));
    });

    return data;
  },

  _getLayerColor(layer, value) {
    const colorScales = {
      temperature: { low: [30, 80, 180], high: [255, 60, 60] },
      rainfall: { low: [20, 60, 120], high: [0, 150, 255] },
      humidity: { low: [40, 60, 100], high: [0, 200, 180] },
      specificHumidity: { low: [40, 60, 100], high: [0, 200, 180] },
      windSpeed: { low: [30, 50, 100], high: [160, 100, 255] },
      surfacePressure: { low: [30, 80, 180], high: [0, 200, 150] },
      airQuality: { low: [0, 180, 100], high: [255, 60, 60] },
      floodRisk: { low: [20, 60, 120], high: [255, 80, 80] },
      heatwaveRisk: { low: [40, 60, 100], high: [255, 140, 0] },
      droughtRisk: { low: [30, 80, 60], high: [200, 120, 40] },
      soilMoisture: { low: [180, 110, 40], high: [0, 190, 120] },
      solarRadiation: { low: [80, 40, 140], high: [255, 210, 30] },
      cloudCover: { low: [20, 50, 90], high: [220, 235, 255] },
      vaporPressureDeficit: { low: [0, 170, 200], high: [255, 70, 30] },
    };

    const scale = colorScales[layer] || colorScales.temperature;
    const ranges = {
      temperature: [-5, 45], rainfall: [0, 500], humidity: [30, 95], specificHumidity: [0, 30],
      windSpeed: [0, 60], airQuality: [30, 400], floodRisk: [0, 90],
      heatwaveRisk: [0, 85], droughtRisk: [0, 80], surfacePressure: [960, 1040],
      soilMoisture: [5, 90], solarRadiation: [100, 1000], cloudCover: [0, 100], vaporPressureDeficit: [0.1, 4.5]
    };
    const [min, max] = ranges[layer] || [0, 100];
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

    const r = Math.round(scale.low[0] + (scale.high[0] - scale.low[0]) * t);
    const g = Math.round(scale.low[1] + (scale.high[1] - scale.low[1]) * t);
    const b = Math.round(scale.low[2] + (scale.high[2] - scale.low[2]) * t);

    return `rgba(${r},${g},${b},0.7)`;
  },

  // Get legend gradient CSS
  getLegendGradient(layer) {
    const colorScales = {
      temperature: { low: [30, 80, 180], high: [255, 60, 60] },
      rainfall: { low: [20, 60, 120], high: [0, 150, 255] },
      humidity: { low: [40, 60, 100], high: [0, 200, 180] },
      specificHumidity: { low: [40, 60, 100], high: [0, 200, 180] },
      windSpeed: { low: [30, 50, 100], high: [160, 100, 255] },
      surfacePressure: { low: [30, 80, 180], high: [0, 200, 150] },
      airQuality: { low: [0, 180, 100], high: [255, 60, 60] },
      floodRisk: { low: [20, 60, 120], high: [255, 80, 80] },
      heatwaveRisk: { low: [40, 60, 100], high: [255, 140, 0] },
      droughtRisk: { low: [30, 80, 60], high: [200, 120, 40] },
      soilMoisture: { low: [180, 110, 40], high: [0, 190, 120] },
      solarRadiation: { low: [80, 40, 140], high: [255, 210, 30] },
      cloudCover: { low: [20, 50, 90], high: [220, 235, 255] },
      vaporPressureDeficit: { low: [0, 170, 200], high: [255, 70, 30] },
    };
    const scale = colorScales[layer] || colorScales.temperature;
    return `linear-gradient(90deg, rgb(${scale.low.join(',')}), rgb(${scale.high.join(',')}))`;
  },

  getLegendLabels(layer) {
    const labels = {
      temperature: ['-5°C', '20°C', '45°C'],
      rainfall: ['0mm', '250mm', '500mm'],
      humidity: ['30%', '62%', '95%'],
      specificHumidity: ['0g/kg', '15g/kg', '30g/kg'],
      windSpeed: ['0', '30', '60 km/h'],
      surfacePressure: ['960hPa', '1000hPa', '1040hPa'],
      airQuality: ['Good', 'Moderate', 'Severe'],
      floodRisk: ['Low', 'Medium', 'High'],
      heatwaveRisk: ['Low', 'Medium', 'High'],
      droughtRisk: ['Low', 'Medium', 'High'],
      soilMoisture: ['5%', '45%', '90%'],
      solarRadiation: ['100 W/m²', '550 W/m²', '1000 W/m²'],
      cloudCover: ['0%', '50%', '100%'],
      vaporPressureDeficit: ['0.1 kPa', '2.3 kPa', '4.5 kPa'],
    };
    return labels[layer] || ['Low', 'Medium', 'High'];
  }
};

window.IndiaMap = IndiaMap;

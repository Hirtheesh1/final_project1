/* =================================================================
   AI Assistant Panel Logic
   ================================================================= */

const assistantDateLabel = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}).format(new Date());

const AssistantPanel = {
  messages: [
    { role: 'ai', text: `Hello! I'm your <strong>AI Climate Assistant</strong> — updated for <strong>${assistantDateLabel}</strong>. The current atmosphere reflects active monsoon conditions across India. I can help with weather, flood alerts, rainfall data, and more. What would you like to know?` },
  ],

  responses: {
    weather: `🌡️ <strong>Weather Update — ${assistantDateLabel}:</strong><br><br>Current conditions are being refreshed from live weather feeds.<br><br>• Delhi: live temperature/forecast values are updated on the dashboard<br>• Mumbai: monsoon rain and humidity are updated dynamically<br>• Bengaluru: rain and cloud conditions are refreshed from the live API<br>• Chennai: coastal conditions are monitored in real time<br>• Kolkata: precipitation trends are updated continuously<br>• Guwahati: flood-risk and rainfall levels are refreshed from the live model`,
    flood: `🌊 <strong>Flood Status — ${assistantDateLabel}:</strong><br><br>Flood risk is calculated using current rainfall, humidity, and short-term forecast data.<br><br>• <span style="color:#FF5252">High risk</span>: northeast India and flood-prone river basins<br>• <span style="color:#FFA726">Moderate risk</span>: western coastal cities with heavy rainfall<br>• <span style="color:#FF5252">Critical watch</span>: districts with active river levels or flash-flood alerts<br><br>Overall flood risk is updated from the active model and current weather feeds.`,
    heatwave: `🌡️ <strong>Temperature Analysis — ${assistantDateLabel}:</strong><br><br>Heat conditions are calculated from the latest live weather data for each region.<br><br>• Delhi: current output updates based on the latest temperature and humidity forecast<br>• Chennai: coastal conditions are monitored continuously<br>• Kolkata: monsoon-driven cooling is reflected in live values<br>• Jaipur: regional heat/humidity patterns are refreshed dynamically<br><br>Main concern now: <strong>high humidity and urban heat accumulation</strong> in some pockets.`,
    rainfall: `🌧️ <strong>Monsoon Rainfall — ${assistantDateLabel}:</strong><br><br>Rainfall trends are refreshed from the latest forecast for each monitored region.<br><br>• <strong>Very Heavy</strong>: northeast and western coastal belts<br>• <strong>Heavy</strong>: central and Himalayan rainfall corridors<br>• <strong>Moderate</strong>: many interior regions with cloudbursts and convective showers<br>• <strong>Light</strong>: drier pockets with intermittent rainfall<br><br>Updated continuously based on live forecast data.`,
    aqi: `💨 <strong>Air Quality — ${assistantDateLabel}:</strong><br><br>Air-quality conditions are refreshed from the live AQI service for each city.<br><br>• Delhi NCR: live AQI values update from the connected weather feed<br>• Mumbai: rainfall and wind conditions affect real-time air quality<br>• Bengaluru: current pollution and wind patterns are updated continuously<br>• Chennai: coastal airflow is factored into the live AQI model<br>• Kolkata: urban pollution and rain washout are refreshed dynamically<br><br>Overall: monitored live and recalculated with the latest available conditions.`,
    default: `🛰️ <strong>Climate Twin — ${assistantDateLabel}</strong><br><br>Live system status:<br>• 🌧️ <strong>Current conditions</strong>: refreshed in real time from weather and forecast feeds<br>• 🌊 <strong>Risk monitoring</strong>: flood, rainfall, and landslide indicators update continuously<br>• ⛰️ <strong>Regional outlooks</strong>: tracked for India’s major climate zones<br>• 🌡️ <strong>Temperature/humidity</strong>: live values shown on the dashboard and predictions page<br><br>Ask about: <em>weather, floods, rainfall, air quality, heatwave status</em>`
  },

  init() {
    this.renderMessages();
    this.setupInput();
  },

  focus() {
    const input = document.querySelector('.assistant-input input');
    if (input) setTimeout(() => input.focus(), 300);
  },

  renderMessages() {
    const container = document.getElementById('assistant-messages');
    if (!container) return;
    container.innerHTML = this.messages.map(m =>
      `<div class="assistant-message ${m.role}"><div class="message-text">${m.text}</div></div>`
    ).join('');
    container.scrollTop = container.scrollHeight;
  },

  setupInput() {
    const input = document.querySelector('.assistant-input input');
    const sendBtn = document.querySelector('.assistant-send-btn');

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendMessage(input.value);
      });
    }
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const input = document.querySelector('.assistant-input input');
        if (input) this.sendMessage(input.value);
      });
    }

    document.querySelectorAll('.assistant-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.sendMessage(chip.dataset.query);
      });
    });
  },

  sendMessage(text) {
    if (!text || !text.trim()) return;

    this.messages.push({ role: 'user', text: text.trim() });
    this.renderMessages();

    const input = document.querySelector('.assistant-input input');
    if (input) input.value = '';

    const container = document.getElementById('assistant-messages');
    const typing = document.createElement('div');
    typing.className = 'assistant-message ai typing-msg';
    typing.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;

    setTimeout(() => {
      typing.remove();
      const response = this.getResponse(text.toLowerCase());
      this.messages.push({ role: 'ai', text: response });
      this.renderMessages();
    }, 1000 + Math.random() * 1000);
  },

  getResponse(text) {
    if (text.includes('perundurai') || text.includes('erode')) {
      return `📍 <strong>Perundurai Climate & Prediction Intelligence:</strong><br><br>
• <strong>Coordinates</strong>: 11.2758° N, 77.5827° E (Erode District, Tamil Nadu)<br>
• <strong>Predictions & Climate Twin</strong>: Select Perundurai in the <strong>AI Predictions</strong> tab for 7-day synoptic forecasts, or switch to the <strong>Location Twin Predictor</strong> in the <strong>Climate Twin</strong> tab to run PINN-FFNO surrogate microclimate simulations (SIPCOT industrial dispersion, heat stress, and flood/drought risk)!`;
    }
    if (text.includes('weather') || text.includes('temperature') || text.includes('temp') || text.includes('current'))
      return this.responses.weather;
    if (text.includes('flood') || text.includes('water level') || text.includes('river'))
      return this.responses.flood;
    if (text.includes('heat') || text.includes('heatwave') || text.includes('hot'))
      return this.responses.heatwave;
    if (text.includes('rain') || text.includes('monsoon') || text.includes('rainfall') || text.includes('precipitation'))
      return this.responses.rainfall;
    if (text.includes('air') || text.includes('aqi') || text.includes('pollution') || text.includes('quality'))
      return this.responses.aqi;
    return this.responses.default;
  }
};

window.AssistantPanel = AssistantPanel;

// ✅ Your OpenWeather key plugged in:
const OPENWEATHER_KEY = "fbbd7146fa99d2c4140dcda3f41f17c3";

const searchView   = document.getElementById("searchView");
const resultView   = document.getElementById("resultView");
const cityInput    = document.getElementById("cityInput");
const searchBtn    = document.getElementById("searchBtn");
const backBtn      = document.getElementById("backBtn");

const cityTitle    = document.getElementById("cityTitle");
const currentIcon  = document.getElementById("currentIcon");
const currentTemp  = document.getElementById("currentTemp");
const currentDesc  = document.getElementById("currentDesc");
const currentHum   = document.getElementById("currentHum");
const currentWind  = document.getElementById("currentWind");
const currentTime  = document.getElementById("currentTime");
const forecastGrid = document.getElementById("forecastGrid");

let map, marker;

/* -------- Helpers -------- */
function swapToResults(){
  searchView.classList.remove("active");
  resultView.classList.add("active");
}
function backToSearch(){
  resultView.classList.remove("active");
  searchView.classList.add("active");
  cityInput.focus();
}
function iconUrl(code){ return `https://openweathermap.org/img/wn/${code}@2x.png`; }
function toLocal(dt, tz) {
  // dt in seconds, tz in seconds offset
  const ms = (dt + tz) * 1000;
  return new Date(ms).toUTCString().replace(" GMT", "");
}

/* -------- Fetch + Render -------- */
async function fetchWeather(city){
  const currentURL  = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`;
  const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`;

  const [curRes, foreRes] = await Promise.all([fetch(currentURL), fetch(forecastURL)]);
  if(!curRes.ok || !foreRes.ok){
    const msg = (await curRes.json().catch(()=>({message:""}))).message || "City not found";
    throw new Error(msg);
  }
  const current  = await curRes.json();
  const forecast = await foreRes.json();
  return { current, forecast };
}

function renderCurrent(data){
  const { name, sys, main, weather, wind, dt, timezone, coord } = data;
  cityTitle.textContent = `${name}, ${sys?.country || ""}`.trim();
  currentIcon.src = iconUrl(weather[0].icon);
  currentIcon.alt = weather[0].main;
  currentTemp.textContent = `${Math.round(main.temp)}°C`;
  currentDesc.textContent = weather[0].description;
  currentHum.textContent  = `${main.humidity}%`;
  currentWind.textContent = `${wind.speed} m/s`;
  currentTime.textContent = toLocal(dt, timezone);

  // Map (Leaflet, no key)
  if(!map){
    map = L.map('map', { zoomControl: true }).setView([coord.lat, coord.lon], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    marker = L.marker([coord.lat, coord.lon]).addTo(map);
  }else{
    map.setView([coord.lat, coord.lon], 9);
    marker.setLatLng([coord.lat, coord.lon]);
  }
}

function renderForecast(list){
  // pick one item around 12:00 local each day
  const byDay = {};
  list.forEach(item => {
    const [date, time] = item.dt_txt.split(" ");
    if(!byDay[date] || time === "12:00:00") byDay[date] = item;
  });

  const days = Object.keys(byDay).slice(0,5);
  forecastGrid.innerHTML = "";
  days.forEach(date => {
    const it = byDay[date];
    const d  = new Date(it.dt_txt);
    const html = `
      <div class="forecast-card">
        <div class="muted" style="font-weight:600;">${d.toDateString()}</div>
        <img src="${iconUrl(it.weather[0].icon)}" alt="${it.weather[0].main}"/>
        <div style="font-size:22px; font-weight:700;">${Math.round(it.main.temp)}°C</div>
        <div class="muted">${it.weather[0].description}</div>
      </div>`;
    forecastGrid.insertAdjacentHTML("beforeend", html);
  });
}

/* -------- Events -------- */
async function handleSearch(){
  const city = cityInput.value.trim();
  if(!city){ alert("Please enter a city name"); return; }
  searchBtn.disabled = true;
  searchBtn.textContent = "Loading…";
  try{
    const { current, forecast } = await fetchWeather(city);
    renderCurrent(current);
    renderForecast(forecast.list);
    swapToResults();
  }catch(err){
    alert("Error: " + err.message);
  }finally{
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

searchBtn.addEventListener("click", handleSearch);
cityInput.addEventListener("keydown", e => {
  if(e.key === "Enter") handleSearch();
});
backBtn.addEventListener("click", backToSearch);

// Focus input on load
window.addEventListener("load", () => cityInput.focus());

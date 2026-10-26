import { getCloudSession } from "./cloud-sync.js";

const LOCATION_KEY = "linka.utility.weather-location.v1";
const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const COPY = {
  en: { localTime:"LOCAL TIME",localWeather:"LOCAL WEATHER",status:"LINKA STATUS",localState:"Local-first library",localDetail:"Your library stays on this device.",cloudState:"Cloud sync ready",cloudDetail:"Signed in · sync stays optional",useLocation:"Use my location",refreshWeather:"Refresh weather",removeLocation:"Remove location",weatherPrompt:"Choose a location to see current conditions.",requesting:"Requesting location permission…",loadingWeather:"Getting current weather…",weatherUnavailable:"Weather is temporarily unavailable.",permissionDenied:"Location permission wasn't granted.",noGeolocation:"This environment can't share location.",locationSaved:"Location is saved on this device only.",currentConditions:"Current conditions",clearSky:"Clear sky",mainlyClear:"Mostly clear",partlyCloudy:"Partly cloudy",overcast:"Overcast",fog:"Fog",drizzle:"Drizzle",rain:"Rain",snow:"Snow",showers:"Showers",thunderstorm:"Thunderstorm",conditionsUnavailable:"Current conditions unavailable",humidity:"Humidity",wind:"Wind",openSettings:"Settings",closePanel:"Close panel",panelLabel:"Local time and weather",weatherUnit:"°C" },
  ru: { localTime:"МЕСТНОЕ ВРЕМЯ",localWeather:"ПОГОДА РЯДОМ",status:"СОСТОЯНИЕ LINKA",localState:"Библиотека на устройстве",localDetail:"Твои данные остаются на этом устройстве.",cloudState:"Облако подключено",cloudDetail:"Вход выполнен · синхронизация по желанию",useLocation:"Определить погоду",refreshWeather:"Обновить погоду",removeLocation:"Удалить локацию",weatherPrompt:"Выбери местоположение, чтобы увидеть текущую погоду.",requesting:"Запрашиваем разрешение на геолокацию…",loadingWeather:"Получаем текущую погоду…",weatherUnavailable:"Погода временно недоступна.",permissionDenied:"Разрешение на геолокацию не предоставлено.",noGeolocation:"В этой среде геолокация недоступна.",locationSaved:"Местоположение хранится только на этом устройстве.",currentConditions:"Сейчас",clearSky:"Ясно",mainlyClear:"Преимущественно ясно",partlyCloudy:"Переменная облачность",overcast:"Пасмурно",fog:"Туман",drizzle:"Морось",rain:"Дождь",snow:"Снег",showers:"Ливни",thunderstorm:"Гроза",conditionsUnavailable:"Текущая погода недоступна",humidity:"Влажность",wind:"Ветер",openSettings:"Настройки",closePanel:"Закрыть панель",panelLabel:"Местное время и погода",weatherUnit:"°C" },
  az: { localTime:"YERLİ SAAT",localWeather:"YERLİ HAVA",status:"LINKA STATUSU",localState:"Kitabxana cihazdadır",localDetail:"Məlumatların bu cihazda qalır.",cloudState:"Bulud sinxronizasiyası hazırdır",cloudDetail:"Daxil olmusan · sinxronizasiya seçimlidir",useLocation:"Məkanımı müəyyən et",refreshWeather:"Havanı yenilə",removeLocation:"Məkanı sil",weatherPrompt:"Cari havanı görmək üçün məkan seç.",requesting:"Məkan icazəsi istənilir…",loadingWeather:"Cari hava alınır…",weatherUnavailable:"Hava məlumatı müvəqqəti əlçatan deyil.",permissionDenied:"Məkan icazəsi verilmədi.",noGeolocation:"Bu mühitdə məkan məlumatı əlçatan deyil.",locationSaved:"Məkan yalnız bu cihazda saxlanılır.",currentConditions:"Hazırda",clearSky:"Açıq hava",mainlyClear:"Əsasən açıq",partlyCloudy:"Dəyişkən buludlu",overcast:"Buludlu",fog:"Duman",drizzle:"Çiskin",rain:"Yağış",snow:"Qar",showers:"Güclü yağış",thunderstorm:"Şimşək",conditionsUnavailable:"Cari hava əlçatan deyil",humidity:"Rütubət",wind:"Külək",openSettings:"Parametrlər",closePanel:"Paneli bağla",panelLabel:"Yerli saat və hava",weatherUnit:"°C" },
  tr: { localTime:"YEREL SAAT",localWeather:"YEREL HAVA",status:"LINKA DURUMU",localState:"Kitaplık cihazında",localDetail:"Kitaplığın bu cihazda kalır.",cloudState:"Bulut eşitleme hazır",cloudDetail:"Oturum açık · eşitleme isteğe bağlı",useLocation:"Konumumu kullan",refreshWeather:"Havayı yenile",removeLocation:"Konumu kaldır",weatherPrompt:"Güncel hava durumunu görmek için konum seç.",requesting:"Konum izni isteniyor…",loadingWeather:"Güncel hava alınıyor…",weatherUnavailable:"Hava durumu geçici olarak kullanılamıyor.",permissionDenied:"Konum izni verilmedi.",noGeolocation:"Bu ortam konum paylaşamıyor.",locationSaved:"Konum yalnızca bu cihazda saklanır.",currentConditions:"Şu an",clearSky:"Açık",mainlyClear:"Çoğunlukla açık",partlyCloudy:"Parçalı bulutlu",overcast:"Kapalı",fog:"Sis",drizzle:"Çiseleme",rain:"Yağmur",snow:"Kar",showers:"Sağanak",thunderstorm:"Gök gürültülü fırtına",conditionsUnavailable:"Güncel hava kullanılamıyor",humidity:"Nem",wind:"Rüzgâr",openSettings:"Ayarlar",closePanel:"Paneli kapat",panelLabel:"Yerel saat ve hava durumu",weatherUnit:"°C" }
};
function language() {
  const value = String(document.documentElement.lang || "en").toLowerCase().slice(0,2);
  return Object.prototype.hasOwnProperty.call(COPY,value) ? value : "en";
}
function copy(key) { return COPY[language()][key] || COPY.en[key] || key; }
function el(tag,className,value) {
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!=null)node.textContent=value;
  return node;
}
function getSavedLocation() {
  try {
    const value=JSON.parse(localStorage.getItem(LOCATION_KEY)||"null");
    if(value&&Number.isFinite(value.latitude)&&Number.isFinite(value.longitude)&&Math.abs(value.latitude)<=90&&Math.abs(value.longitude)<=180)return value;
  } catch {}
  return null;
}
function describeWeather(code) {
  if(code===0)return copy("clearSky"); if(code===1)return copy("mainlyClear"); if(code===2)return copy("partlyCloudy"); if(code===3)return copy("overcast");
  if(code===45||code===48)return copy("fog"); if([51,53,55,56,57].includes(code))return copy("drizzle");
  if([61,63,65,66,67].includes(code))return copy("rain"); if([71,73,75,77].includes(code))return copy("snow");
  if([80,81,82,85,86].includes(code))return copy("showers"); if([95,96,99].includes(code))return copy("thunderstorm");
  return copy("conditionsUnavailable");
}
function weatherGlyph(code) {
  const cloud='<path d="M7.2 18h9.9a4.2 4.2 0 0 0 .2-8.4 5.7 5.7 0 0 0-10.9 1.5A3.5 3.5 0 0 0 7.2 18Z"/>';
  if(code===0||code===1)return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77m10.6 10.6 1.77 1.77M2 12h2.5m15 0H22M4.93 19.07l1.77-1.77m10.6-10.6 1.77-1.77"/></svg>';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+cloud+'<path d="m9 20-1 2m6-2-1 2m6-2-1 2"/></svg>';
  if([71,73,75,77,85,86].includes(code))return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+cloud+'<path d="M9 20v.01M14 21v.01M19 20v.01"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+cloud+'</svg>';
}

export function initLinkaUtilityPanel() {
  if(document.querySelector("#linka-utility-root"))return;
  const root=el("div","linka-utility-root"); root.id="linka-utility-root";
  const edge=el("button","linka-utility-edge"); edge.type="button";
  edge.setAttribute("aria-controls","linka-utility-panel"); edge.setAttribute("aria-expanded","false"); edge.setAttribute("aria-label",copy("panelLabel"));
  edge.innerHTML='<span class="linka-utility-handle" aria-hidden="true"></span>';
  const panel=el("section","linka-utility-panel"); panel.id="linka-utility-panel";
  panel.setAttribute("role","region"); panel.setAttribute("aria-label",copy("panelLabel")); panel.setAttribute("aria-hidden","true"); panel.inert=true;
  panel.innerHTML=[
    '<div class="linka-utility-panel-top"><div class="linka-utility-brand"><span class="linka-utility-brand-mark" aria-hidden="true">L</span><span>LINKA · HERE &amp; NOW</span></div><button type="button" class="linka-utility-close" data-utility-close aria-label="'+copy("closePanel")+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>',
    '<div class="linka-utility-grid">',
    '<section class="linka-utility-card linka-utility-card-time" aria-label="'+copy("localTime")+'"><span class="linka-utility-label" data-utility-copy="localTime"></span><time class="linka-utility-time" data-utility-time></time><span class="linka-utility-date" data-utility-date></span></section>',
    '<section class="linka-utility-card linka-utility-card-weather" aria-label="'+copy("localWeather")+'"><span class="linka-utility-label" data-utility-copy="localWeather"></span><div class="linka-utility-weather-main"><span class="linka-utility-weather-icon" data-utility-weather-icon aria-hidden="true"></span><span class="linka-utility-weather-copy"><strong class="linka-utility-temperature" data-utility-temperature>—°</strong><span class="linka-utility-weather-description" data-utility-weather-description></span></span></div><div class="linka-utility-weather-meta" data-utility-weather-meta aria-live="polite"></div><div class="linka-utility-actions"><button class="linka-utility-action" type="button" data-utility-location></button><button class="linka-utility-action is-subtle" type="button" data-utility-clear hidden></button></div></section>',
    '<section class="linka-utility-card linka-utility-card-status"><span class="linka-utility-label" data-utility-copy="status"></span><div class="linka-utility-status" style="margin-top:14px"><span class="linka-utility-status-dot" aria-hidden="true"></span><span class="linka-utility-status-copy"><strong data-utility-status></strong><small data-utility-status-detail></small></span></div></section>',
    '</div>',
    '<div class="linka-utility-footer"><div class="linka-utility-status"><span class="linka-utility-status-dot" aria-hidden="true"></span><div class="linka-utility-status-copy"><strong>Private by design</strong><small data-utility-privacy></small></div></div><button class="linka-utility-settings" type="button" data-utility-settings></button></div>'
  ].join("");
  root.append(edge,panel); document.body.append(root);

  const timeValue=panel.querySelector("[data-utility-time]"),dateValue=panel.querySelector("[data-utility-date]");
  const temperature=panel.querySelector("[data-utility-temperature]"),weatherDescription=panel.querySelector("[data-utility-weather-description]");
  const weatherMeta=panel.querySelector("[data-utility-weather-meta]"),weatherIcon=panel.querySelector("[data-utility-weather-icon]");
  const locationButton=panel.querySelector("[data-utility-location]"),clearButton=panel.querySelector("[data-utility-clear]");
  const statusValue=panel.querySelector("[data-utility-status]"),statusDetail=panel.querySelector("[data-utility-status-detail]");
  const privacyLine=panel.querySelector("[data-utility-privacy]"),settingsButton=panel.querySelector("[data-utility-settings]");
  let open=false,pinned=false,closeTimer=0,clockTimer=0,weatherPending=false,lastWeatherAt=0;
  const updateClock=()=>{
    const now=new Date(),lang=language(); timeValue.dateTime=now.toISOString();
    timeValue.textContent=new Intl.DateTimeFormat(lang,{hour:"2-digit",minute:"2-digit"}).format(now);
    dateValue.textContent=new Intl.DateTimeFormat(lang,{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(now);
  };
  const renderStatus=()=>{
    let session=null; try{session=getCloudSession();}catch{}
    const connected=Boolean(session&&(session.accessToken||session.refreshToken||session.email));
    statusValue.textContent=connected?copy("cloudState"):copy("localState");
    statusDetail.textContent=connected?copy("cloudDetail"):copy("localDetail");
  };
  const updateWeatherControls=(busy=false)=>{
    const saved=getSavedLocation();
    locationButton.disabled=busy; locationButton.textContent=busy?copy("loadingWeather"):(saved?copy("refreshWeather"):copy("useLocation"));
    clearButton.hidden=!saved; clearButton.disabled=busy; clearButton.textContent=copy("removeLocation");
  };
  const updateCopy=()=>{
    panel.setAttribute("aria-label",copy("panelLabel")); edge.setAttribute("aria-label",copy("panelLabel"));
    panel.querySelectorAll("[data-utility-copy]").forEach(node=>{node.textContent=copy(node.dataset.utilityCopy);});
    panel.querySelector("[data-utility-close]").setAttribute("aria-label",copy("closePanel"));
    privacyLine.textContent=copy("locationSaved"); settingsButton.textContent=copy("openSettings");
    if(!weatherDescription.textContent)weatherDescription.textContent=copy("weatherPrompt");
    updateWeatherControls(false); renderStatus();
  };
  const loadWeather=async(force=false)=>{
    const saved=getSavedLocation();
    if(!saved||weatherPending||(!force&&Date.now()-lastWeatherAt<15*60*1000))return;
    weatherPending=true; updateWeatherControls(true); weatherDescription.textContent=copy("loadingWeather"); weatherMeta.textContent="";
    const request=new URL(WEATHER_ENDPOINT);
    request.searchParams.set("latitude",String(saved.latitude)); request.searchParams.set("longitude",String(saved.longitude));
    request.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m");
    request.searchParams.set("timezone","auto"); request.searchParams.set("forecast_days","1");
    try{
      const response=await fetch(request.toString(),{headers:{Accept:"application/json"},cache:"no-store"});
      if(!response.ok)throw new Error("weather request failed");
      const body=await response.json(),current=body&&body.current;
      if(!current||!Number.isFinite(Number(current.temperature_2m)))throw new Error("weather response incomplete");
      temperature.textContent=Math.round(Number(current.temperature_2m))+copy("weatherUnit");
      weatherDescription.textContent=describeWeather(Number(current.weather_code)); weatherIcon.innerHTML=weatherGlyph(Number(current.weather_code));
      const feels=Number(current.apparent_temperature),humidity=Number(current.relative_humidity_2m),wind=Number(current.wind_speed_10m),metadata=[];
      const feelsLabel=language()==="ru"?"Ощущается ":language()==="az"?"Hiss edilir ":language()==="tr"?"Hissedilen ":"Feels like ";
      if(Number.isFinite(feels))metadata.push(feelsLabel+Math.round(feels)+copy("weatherUnit"));
      if(Number.isFinite(humidity))metadata.push(copy("humidity")+" "+Math.round(humidity)+"%");
      if(Number.isFinite(wind))metadata.push(copy("wind")+" "+Math.round(wind)+" km/h");
      weatherMeta.textContent=metadata.join(" · ")||copy("currentConditions"); lastWeatherAt=Date.now(); privacyLine.textContent=copy("locationSaved");
    }catch{
      weatherDescription.textContent=copy("weatherUnavailable"); weatherMeta.textContent=""; lastWeatherAt=Date.now()-14*60*1000;
    }finally{weatherPending=false;updateWeatherControls(false);}
  };
  const openPanel=()=>{
    const modalRoot=document.querySelector("#modal-root");
    if(modalRoot&&Array.from(modalRoot.children).some(node=>!node.classList.contains("closing")))return;
    window.clearTimeout(closeTimer); if(open)return; open=true; root.classList.add("is-open");
    panel.inert=false;panel.setAttribute("aria-hidden","false");edge.setAttribute("aria-expanded","true");
    updateCopy();updateClock();if(clockTimer)window.clearInterval(clockTimer);clockTimer=window.setInterval(updateClock,15000);void loadWeather(false);
  };
  const closePanel=()=>{
    window.clearTimeout(closeTimer);if(!open)return;open=false;pinned=false;root.classList.remove("is-open");
    panel.inert=true;panel.setAttribute("aria-hidden","true");edge.setAttribute("aria-expanded","false");
    if(clockTimer)window.clearInterval(clockTimer);clockTimer=0;
    if(panel.contains(document.activeElement))edge.focus({preventScroll:true});
  };
  const scheduleClose=()=>{window.clearTimeout(closeTimer);if(!pinned)closeTimer=window.setTimeout(closePanel,340);};

  edge.addEventListener("pointerenter",event=>{if(event.pointerType!=="touch")openPanel();});
  edge.addEventListener("pointerleave",scheduleClose);
  edge.addEventListener("focus",openPanel);
  edge.addEventListener("click",()=>{if(pinned)closePanel();else{pinned=true;openPanel();}});
  panel.addEventListener("pointerenter",()=>window.clearTimeout(closeTimer));
  panel.addEventListener("pointerleave",scheduleClose);
  panel.addEventListener("focusout",event=>{if(!panel.contains(event.relatedTarget)&&event.relatedTarget!==edge)scheduleClose();});
  panel.querySelector("[data-utility-close]").addEventListener("click",closePanel);
  locationButton.addEventListener("click",()=>{
    const saved=getSavedLocation();if(saved){void loadWeather(true);return;}
    if(!navigator.geolocation||!navigator.geolocation.getCurrentPosition){weatherDescription.textContent=copy("noGeolocation");return;}
    locationButton.disabled=true;locationButton.textContent=copy("requesting");
    navigator.geolocation.getCurrentPosition(position=>{
      const next={latitude:Number(position.coords.latitude),longitude:Number(position.coords.longitude)};
      if(!Number.isFinite(next.latitude)||!Number.isFinite(next.longitude)||Math.abs(next.latitude)>90||Math.abs(next.longitude)>180){weatherDescription.textContent=copy("weatherUnavailable");updateWeatherControls(false);return;}
      try{localStorage.setItem(LOCATION_KEY,JSON.stringify(next));}catch{}
      updateWeatherControls(false);lastWeatherAt=0;void loadWeather(true);
    },error=>{
      weatherDescription.textContent=error&&error.code===1?copy("permissionDenied"):copy("weatherUnavailable");updateWeatherControls(false);
    },{enableHighAccuracy:false,timeout:12000,maximumAge:15*60*1000});
  });
  clearButton.addEventListener("click",()=>{
    try{localStorage.removeItem(LOCATION_KEY);}catch{}lastWeatherAt=0;temperature.textContent="—°";
    weatherDescription.textContent=copy("weatherPrompt");weatherMeta.textContent="";weatherIcon.innerHTML=weatherGlyph(2);updateWeatherControls(false);
  });
  settingsButton.addEventListener("click",()=>{closePanel();document.querySelector("#settings-button")?.click();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&open){event.preventDefault();pinned=false;closePanel();}},true);
  document.addEventListener("pointerdown",event=>{if(open&&!root.contains(event.target))closePanel();},true);
  window.addEventListener("linka:authenticated",renderStatus);
  window.addEventListener("linka:profile-saved",renderStatus);
  window.addEventListener("linka:oauth-complete",renderStatus);
  window.addEventListener("linka:language-changed",updateCopy);
  const modalRoot=document.querySelector("#modal-root");
  if(modalRoot&&typeof MutationObserver==="function"){
    const observer=new MutationObserver(()=>{if(open&&Array.from(modalRoot.children).some(node=>!node.classList.contains("closing")))closePanel();});
    observer.observe(modalRoot,{childList:true,subtree:false});
  }
  updateCopy();updateClock();weatherDescription.textContent=copy("weatherPrompt");weatherIcon.innerHTML=weatherGlyph(2);
}

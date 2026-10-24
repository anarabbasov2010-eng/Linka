const DEFAULT_TRACK={id:"linka-empty-track",name:"Выбери свой трек",artist:"Музыка с устройства",src:""};
const DEFAULT_VIDEO="https://videos.pexels.com/video-files/36928855/36928855-hd_1920_1080_30fps.mp4";
const FOREST_VIDEO_CANDIDATES=[
  DEFAULT_VIDEO,
  "https://videos.pexels.com/video-files/30312149/30312149-hd_1920_1080_30fps.mp4",
  "https://videos.pexels.com/video-files/34381048/34381048-hd_1920_1080_30fps.mp4",
  "https://videos.pexels.com/video-files/30312148/30312148-hd_1920_1080_30fps.mp4",
  "https://videos.pexels.com/video-files/36928736/36928736-hd_1920_1080_30fps.mp4",
  "https://videos.pexels.com/video-files/37426477/37426477-hd_1920_1080_30fps.mp4"
];
const DEFAULT_FOREST_POSTER="https://images.pexels.com/videos/36928855/free-video-36928855.jpg?fit=crop&w=1920&h=1080&auto=compress&cs=tinysrgb";
const DB_NAME="linka-atmosphere-v1", STORE="media", PREFIX="linka.atmosphere.";
const $=(s,r=document)=>r.querySelector(s);
const read=(k,d)=>{try{const v=localStorage.getItem(PREFIX+k);return v==null?d:JSON.parse(v)}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(PREFIX+k,JSON.stringify(v))}catch{}};
const uid=()=>crypto?.randomUUID?.()||("m"+Date.now().toString(36)+Math.random().toString(36).slice(2));
const state={db:null,video:true,grain:true,music:true,volume:.14,playlist:[],index:0,audio:null,urls:new Map(),playing:false,background:null,reduced:false};
function openDb(){return new Promise(resolve=>{if(!("indexedDB"in window))return resolve(null);const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE,{keyPath:"id"})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null)})}
function db(id,mode,fn){return new Promise((resolve,reject)=>{if(!state.db)return reject(new Error("Локальное хранилище недоступно"));const t=state.db.transaction(STORE,mode),q=fn(t.objectStore(STORE));q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function putMedia(id,file,kind){if(file.size>350*1024*1024)throw new Error("Файл должен быть меньше 350 МБ");await db(id,"readwrite",s=>s.put({id,name:file.name,type:file.type,blob:file,kind}))}
async function getMedia(id){try{return await db(id,"readonly",s=>s.get(id))}catch{return null}}
function icon(n){const p={play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5h3v14H8zM15 5h3v14h-3z"/>',next:'<path d="m5 5 10 7-10 7zM19 5v14"/>',prev:'<path d="m19 5-10 7 10 7zM5 5v14"/>',open:'<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',volume:'<path d="M4 10v4h4l5 4V6l-5 4zM17 9a5 5 0 0 1 0 6"/>',plus:'<path d="M12 5v14M5 12h14"/>'};return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(p[n]||p.music)+"</svg>"}
function btn(label,glyph,extra=""){const b=document.createElement("button");b.type="button";b.className="linka-player-button "+extra;b.setAttribute("aria-label",label);b.title=label;b.innerHTML=icon(glyph);return b}
function addStyles(){if($("#linka-atmosphere-styles"))return;const s=document.createElement("style");s.id="linka-atmosphere-styles";s.textContent=[
'#linka-atmosphere{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:#09090d;isolation:isolate}',
'#linka-atmosphere video,#linka-atmosphere img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.04);filter:saturate(.72) contrast(1.04);transition:opacity 1.8s ease;animation:linka-forest 78s ease-in-out infinite alternate}',
'#linka-atmosphere img{display:none}',
'#linka-atmosphere .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,6,13,.20),rgba(6,6,10,.36) 48%,rgba(4,4,7,.62)),radial-gradient(ellipse at 52% 14%,rgba(188,151,128,.075),transparent 55%)}',
'#linka-atmosphere .grain{position:absolute;inset:-40%;opacity:.026;background-image:url("data:image/svg+xml,%3Csvg viewBox=%270 0 180 180%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.8%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%27.8%27/%3E%3C/svg%3E");animation:linka-grain .24s steps(2) infinite}',
'#linka-atmosphere .wind{position:absolute;inset:-15%;opacity:.23;background:radial-gradient(ellipse at 20% 45%,rgba(153,157,186,.09),transparent 50%),radial-gradient(ellipse at 85% 60%,rgba(135,112,169,.08),transparent 45%);animation:linka-wind 52s ease-in-out infinite alternate}',
'#linka-atmosphere .ready{opacity:.78!important}#linka-atmosphere.disabled video,#linka-atmosphere.disabled img{opacity:0!important}#linka-atmosphere.no-grain .grain{display:none}',
'.shell{position:relative;z-index:1;background:transparent}html,body{background:#09090b!important;color-scheme:dark!important}body{isolation:isolate!important}body::before,body::after,.ambient,.orb{display:none!important;content:none!important}',
'.linka-player-dock{position:fixed;z-index:42;right:20px;bottom:20px;display:flex;align-items:center;gap:9px;width:min(294px,calc(100vw - 26px));padding:9px 10px;border:1px solid rgba(240,235,255,.15);border-radius:18px;background:rgba(17,16,23,.8);box-shadow:0 16px 48px #0004,inset 0 1px #fff0a;backdrop-filter:blur(24px);color:#f5f3fa;transition:transform .45s cubic-bezier(.2,.8,.2,1),background .35s;cursor:pointer}',
'.linka-player-dock:hover{transform:translateY(-3px);background:rgba(23,21,31,.92)}.linka-player-art{width:38px;height:38px;flex:0 0 38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#bca8ff3b,#40364d70);color:#d9d0ff}.linka-player-art svg{width:20px;height:20px}',
'.linka-player-track{min-width:0;flex:1;display:grid;gap:3px;text-align:left}.linka-player-track strong{font-size:11px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.linka-player-track span{font-size:9px;color:#a8a3b2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.linka-player-button{width:34px;height:34px;flex:0 0 34px;border:1px solid transparent;border-radius:50%;display:grid;place-items:center;background:#ffffff0e;color:#eae6f4;transition:transform .22s,background .22s,border-color .22s;cursor:pointer}.linka-player-button svg{width:15px;height:15px}.linka-player-button:hover{transform:scale(1.06);background:#c4b4ff24;border-color:#d2c7ff22}.linka-player-play{background:#d8cfff23;border-color:#d8cfff22}',
'.linka-player-panel{position:fixed;z-index:50;inset:0;display:grid;place-items:center;padding:16px;background:#05050900;backdrop-filter:blur(0);opacity:0;pointer-events:none;transition:opacity .72s,background .72s,backdrop-filter .72s}.linka-player-panel.open{opacity:1;pointer-events:auto;background:#05050999;backdrop-filter:blur(19px)}',
'.linka-player-window,.linka-atmosphere-settings{position:relative;width:min(470px,100%);max-height:min(88vh,850px);overflow:auto;border:1px solid #f4f0ff22;border-radius:27px;background:linear-gradient(145deg,#292434e8,#0d0d12f5 62%);color:#f3f1f8;box-shadow:0 32px 120px #0007,inset 0 1px #ffffff0d;padding:19px;transform:translateY(20px) scale(.965);filter:blur(6px);opacity:.55;transition:transform .78s cubic-bezier(.16,1,.3,1),filter .78s,opacity .68s}.linka-player-panel.open .linka-player-window,.linka-player-panel.open .linka-atmosphere-settings{transform:none;filter:blur(0);opacity:1}',
'.linka-player-head{display:flex;align-items:center;gap:10px;margin-bottom:16px}.linka-player-head-copy{flex:1;min-width:0}.linka-player-head-copy strong{display:block;font-size:14px;letter-spacing:-.04em}.linka-player-head-copy span{display:block;margin-top:4px;color:#aaa5b5;font-size:10px}.linka-player-hero{display:grid;place-items:center;min-height:150px;margin-bottom:15px;border:1px solid #e7deff16;border-radius:21px;background:radial-gradient(ellipse at 50% 35%,#b4a2e72d,transparent 62%),linear-gradient(145deg,#ffffff09,#0f0e1470)}.linka-player-disc{width:100px;height:100px;border:1px solid #efe7ff30;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 38% 32%,#d2c8ff47,#43395b33 47%,#0a0a0fd1 75%);box-shadow:0 0 52px #ad9aeb1a;animation:linka-disc 28s linear infinite;animation-play-state:paused}.linka-player-panel.playing .linka-player-disc{animation-play-state:running}.linka-player-disc svg{width:30px;height:30px}',
'.linka-player-current{text-align:center;margin-bottom:14px}.linka-player-current strong{display:block;font-size:17px;letter-spacing:-.04em;overflow-wrap:anywhere}.linka-player-current span{display:block;margin-top:5px;color:#aaa5b5;font-size:11px}.linka-player-time{display:flex;justify-content:space-between;color:#9f9aaa;font-size:9px;font-variant-numeric:tabular-nums;margin-bottom:6px}.linka-player-seek{width:100%;height:4px;accent-color:#d8ceff;cursor:pointer}.linka-player-controls{display:flex;align-items:center;justify-content:center;gap:12px;margin:17px 0}.linka-player-controls .linka-player-button{width:44px;height:44px;flex-basis:44px}.linka-player-controls .linka-player-play{width:53px;height:53px;flex-basis:53px;background:#d5c9ff;color:#171220}.linka-player-volume{display:flex;align-items:center;gap:10px;color:#aaa5b5;font-size:10px;margin:12px 0 19px}.linka-player-volume svg{width:16px}.linka-player-volume input{flex:1;accent-color:#d8ceff}',
'.linka-player-playlist{display:grid;gap:5px;margin-top:10px;max-height:160px;overflow:auto}.linka-player-playlist-item{display:flex;align-items:center;gap:10px;width:100%;border:1px solid transparent;border-radius:13px;padding:10px;background:#ffffff08;color:#e9e5f0;text-align:left;cursor:pointer}.linka-player-playlist-item.active{border-color:#cec1ff3d;background:#b6a5f518}.linka-player-list-label{min-width:0;flex:1}.linka-player-list-label strong{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.linka-player-list-label small{display:block;margin-top:4px;color:#a5a0ae;font-size:9px}.linka-player-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px}.linka-player-muted{font-size:9px;color:#9b95a8;line-height:1.6}',
'.linka-atmosphere-settings{width:min(490px,100%);background:var(--panel-solid,#111216);color:var(--text,#f5f5f7);border-color:var(--line-strong, #ffffff26);filter:none;opacity:1}.linka-atmosphere-title-row{display:flex;align-items:center;gap:11px;margin-bottom:7px}.linka-atmosphere-title-row>div{flex:1}.linka-atmosphere-title-row h2{margin:0;font-size:19px;letter-spacing:-.05em}.linka-atmosphere-title-row small{display:block;margin-top:4px;color:var(--muted,#96969f);font-size:10px}.linka-atmosphere-settings>p{font-size:11px;line-height:1.7;color:var(--muted,#96969f)}',
'.linka-atmosphere-setting{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-top:1px solid var(--line,#ffffff14)}.linka-atmosphere-setting-copy{min-width:0;flex:1}.linka-atmosphere-setting-copy strong{display:block;font-size:12px}.linka-atmosphere-setting-copy span{display:block;margin-top:5px;font-size:10px;line-height:1.6;color:var(--muted,#96969f)}.linka-atmosphere-toggle{width:40px;height:23px;padding:2px;border:1px solid var(--line-strong,#ffffff26);border-radius:30px;background:var(--panel-raised,#17191d);display:flex;align-items:center}.linka-atmosphere-toggle i{display:block;width:17px;height:17px;border-radius:50%;background:var(--muted,#96969f);transition:transform .25s,background .25s}.linka-atmosphere-toggle[aria-pressed=true] i{transform:translateX(16px);background:var(--accent,#c9c0ff)}',
'.linka-atmosphere-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.linka-atmosphere-actions button{font:inherit;font-size:10px;border:1px solid var(--line,#ffffff17);border-radius:11px;background:var(--panel,#17171b);color:var(--soft,#d0d0d8);padding:9px 11px}.linka-atmosphere-state{margin-top:11px;min-height:16px;color:var(--muted,#96969f);font-size:10px;line-height:1.6}',
'.linka-type-stage{position:relative;width:100%}.linka-type-mirror{position:absolute;inset:0;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;pointer-events:none;z-index:2;color:var(--text);font:inherit;line-height:inherit;letter-spacing:inherit;padding:inherit;border:1px solid transparent;word-break:break-word;opacity:0}.linka-type-stage.is-typing .linka-type-mirror{opacity:1}.linka-type-stage.is-typing textarea{color:transparent!important;-webkit-text-fill-color:transparent!important;caret-color:var(--text)!important;position:relative;z-index:3;background:transparent!important}.linka-type-stage.is-typing textarea::placeholder{color:transparent!important}.linka-type-letter{display:inline;animation:linka-ink .23s cubic-bezier(.16,1,.3,1) both}.linka-type-erasing{display:inline;animation:linka-ink-out .19s ease both}',
'@keyframes linka-forest{from{transform:scale(1.04) translate3d(-.5%,0,0)}to{transform:scale(1.1) translate3d(.7%,-.45%,0)}}@keyframes linka-wind{from{transform:translate3d(-1.2%,.3%,0)}to{transform:translate3d(1.2%,-.4%,0)}}@keyframes linka-grain{0%{transform:translate(0,0)}25%{transform:translate(1%,-.5%)}50%{transform:translate(-.6%,.6%)}75%{transform:translate(.5%,1%)}}@keyframes linka-ink{from{opacity:0;filter:blur(3px);transform:translateY(2px)}to{opacity:1;filter:blur(0);transform:translateY(0)}}@keyframes linka-ink-out{from{opacity:.9;filter:blur(0)}to{opacity:0;filter:blur(2px)}}@keyframes linka-disc{to{transform:rotate(360deg)}}',
':root.reduced-motion #linka-atmosphere *, :root.reduced-motion .linka-player-dock, :root.reduced-motion .linka-player-panel, :root.reduced-motion .linka-player-window, :root.reduced-motion .linka-player-disc, :root.reduced-motion .linka-type-letter,.linka-type-erasing{animation:none!important;transition:none!important;filter:none!important}:root[data-effects="quiet"] #linka-atmosphere .wind{opacity:.05}',
'@media(max-width:700px){.linka-player-dock{right:12px;bottom:82px;width:min(270px,calc(100vw - 24px));padding:8px}.linka-player-art{width:34px;height:34px;flex-basis:34px}.linka-player-window,.linka-atmosphere-settings{padding:15px}.linka-player-panel{padding:8px}}@media(prefers-reduced-motion:reduce){#linka-atmosphere *, .linka-player-dock,.linka-player-panel,.linka-player-window,.linka-player-disc,.linka-type-letter{animation:none!important;transition:none!important;filter:none!important}.linka-player-dock,.linka-player-panel,.linka-player-window{transform:none!important}}'
].join("\n");document.head.append(s)}
function buildBackground(){const layer=document.createElement("div");layer.id="linka-atmosphere";layer.setAttribute("aria-hidden","true");layer.innerHTML='<video class="linka-atmosphere-video" playsinline muted loop preload="metadata"></video><img class="linka-atmosphere-image" alt=""><div class="veil"></div><div class="grain"></div><div class="wind"></div>';document.body.prepend(layer);return layer}
async function loadBackground(){
  const layer=$("#linka-atmosphere"),video=$("video",layer),image=$("img",layer),saved=read("background",null);
  function defaultForest(){
    layer.classList.remove("custom");
    image.removeAttribute("src");image.style.display="none";image.classList.remove("ready");
    video.style.display="block";video.muted=true;video.loop=true;video.playsInline=true;video.preload="auto";
    let attempt=0;
    const useNextVideo=()=>{
      video.classList.remove("ready");
      video.onerror=()=>{
        attempt++;
        if(attempt<FOREST_VIDEO_CANDIDATES.length){useNextVideo();return}
        video.pause();video.removeAttribute("src");video.style.display="none";
        image.style.display="block";image.src=DEFAULT_FOREST_POSTER;
        image.onload=()=>image.classList.add("ready");
        image.onerror=()=>{image.classList.remove("ready");layer.classList.add("poster-unavailable")};
      };
      video.onloadeddata=()=>{video.classList.add("ready");image.style.display="none"};
      video.oncanplay=()=>{video.classList.add("ready");image.style.display="none"};
      video.src=FOREST_VIDEO_CANDIDATES[attempt];video.load();
      video.play().catch(()=>{});
    };
    useNextVideo();
  }
  if(saved?.id){
    const rec=await getMedia(saved.id);
    if(rec?.blob){
      const url=URL.createObjectURL(rec.blob);state.background={...saved,url};layer.classList.add("custom");
      if((rec.type||"").startsWith("image/")){
        video.pause();video.removeAttribute("src");video.style.display="none";
        image.style.display="block";image.src=url;image.onload=()=>image.classList.add("ready");
      }else{
        image.style.display="none";video.style.display="block";video.muted=true;video.loop=true;video.preload="auto";video.src=url;
        video.oncanplay=()=>video.classList.add("ready");video.onloadeddata=()=>video.classList.add("ready");video.onerror=()=>video.classList.remove("ready");video.load();video.play().catch(()=>{});
      }
      return;
    }
  }
  defaultForest();
}
function track(){return state.playlist[state.index]||DEFAULT_TRACK}
function source(t){return t?.localId?(state.urls.get(t.localId)||""):t?.src||""}
function time(n){if(!Number.isFinite(n)||n<0)return"0:00";return Math.floor(n/60)+":"+String(Math.floor(n%60)).padStart(2,"0")}
function renderPlayer(){const t=track();document.querySelectorAll("[data-player-title]").forEach(e=>e.textContent=t.name);document.querySelectorAll("[data-player-artist]").forEach(e=>e.textContent=t.artist||(t.localId?"Локальный файл":"Фоновая музыка"));document.querySelectorAll("[data-player-play]").forEach(e=>{e.innerHTML=icon(state.playing?"pause":"play");e.setAttribute("aria-label",state.playing?"Пауза":"Воспроизвести")});$(".linka-player-panel")?.classList.toggle("playing",state.playing);$("#linka-atmosphere")?.classList.toggle("music-playing",state.playing);const a=state.audio;if(!a)return;const cur=$(".linka-player-time-current"),dur=$(".linka-player-time-duration"),seek=$(".linka-player-seek");if(cur)cur.textContent=time(a.currentTime);if(dur)dur.textContent=time(a.duration);if(seek&&Number.isFinite(a.duration)&&a.duration>0&&!seek.matches(":active"))seek.value=String(a.currentTime/a.duration*1000);const list=$(".linka-player-playlist");const signature=state.index+"|"+state.playlist.map(it=>it.id+":"+it.name).join("|");if(list&&list.dataset.signature!==signature){list.dataset.signature=signature;list.replaceChildren();state.playlist.forEach((it,i)=>{const row=document.createElement("button");row.type="button";row.className="linka-player-playlist-item"+(i===state.index?" active":"");const no=document.createElement("span");no.className="linka-player-track-no";no.textContent=String(i+1).padStart(2,"0");const label=document.createElement("span");label.className="linka-player-list-label";const strong=document.createElement("strong");strong.textContent=it.name;const sub=document.createElement("small");sub.textContent=it.localId?"На этом устройстве":it.artist||"Linka soundtrack";label.append(strong,sub);row.append(no,label);if(it.id!==DEFAULT_TRACK.id){const del=btn("Удалить трек","close");del.addEventListener("click",e=>{e.stopPropagation();void removeTrack(it.id)});row.append(del)}row.addEventListener("click",()=>void loadTrack(i,true));list.append(row)})}}
function toast(msg){const status=$(".linka-atmosphere-state");if(status)status.textContent=msg;const app=$("#status");if(app){app.textContent=msg;app.style.opacity="1"}}
function playing(v){state.playing=Boolean(v&&state.audio&&!state.audio.paused);renderPlayer()}
async function loadTrack(i,autoplay=false){if(!state.playlist.length)state.playlist=[DEFAULT_TRACK];state.index=(i+state.playlist.length)%state.playlist.length;write("index",state.index);write("playlist",state.playlist);const t=track();if(t.localId&&!state.urls.has(t.localId)){const rec=await getMedia(t.localId);if(rec?.blob)state.urls.set(t.localId,URL.createObjectURL(rec.blob))}const a=state.audio;if(!a)return;a.pause();a.removeAttribute("src");a.load();const src=source(t);if(src){a.src=src;a.load()}a.volume=state.volume;renderPlayer();if(autoplay&&src){try{await a.play();playing(true)}catch{playing(false);toast("Нажми Play, чтобы начать воспроизведение.")}}else playing(false)}
async function removeTrack(id){const i=state.playlist.findIndex(t=>t.id===id);if(i<0)return;const it=state.playlist[i];if(it.localId){const url=state.urls.get(it.localId);if(url)URL.revokeObjectURL(url);state.urls.delete(it.localId);try{await db(it.localId,"readwrite",s=>s.delete(it.localId))}catch{}}state.playlist.splice(i,1);if(!state.playlist.length)state.playlist=[DEFAULT_TRACK];if(i===state.index)await loadTrack(Math.min(i,state.playlist.length-1),false);else{if(i<state.index)state.index--;write("playlist",state.playlist)}renderPlayer()}
function openPlayer(){const p=$(".linka-player-panel");if(!p)return;p.classList.add("open");p.setAttribute("aria-hidden","false");renderPlayer()}
function closePlayer(){const p=$(".linka-player-panel");p?.classList.remove("open");p?.setAttribute("aria-hidden","true")}
async function togglePlay(){const a=state.audio;if(!a)return;if(!a.src)await loadTrack(state.index,false);if(a.paused){try{await a.play();playing(true)}catch{toast("Не удалось открыть трек. Проверь подключение или выбери локальный файл.")}}else{a.pause();playing(false)}}
function createPlayer(){const dock=document.createElement("div");dock.className="linka-player-dock";dock.setAttribute("role","group");dock.setAttribute("aria-label","Музыкальный плеер");dock.innerHTML='<div class="linka-player-art">'+icon("music")+'</div><div class="linka-player-track"><strong data-player-title></strong><span data-player-artist>Фоновая музыка</span></div>';const play=btn("Воспроизвести","play","linka-player-play");play.dataset.playerPlay="true";play.addEventListener("click",e=>{e.stopPropagation();void togglePlay()});const open=btn("Открыть плеер","open");open.addEventListener("click",e=>{e.stopPropagation();openPlayer()});dock.append(play,open);dock.addEventListener("click",e=>{if(!e.target.closest("button"))openPlayer()});document.body.append(dock);
const panel=document.createElement("div");panel.className="linka-player-panel";panel.setAttribute("aria-hidden","true");panel.innerHTML='<section class="linka-player-window" role="dialog" aria-modal="true" aria-label="Музыкальный плеер"><header class="linka-player-head"><div class="linka-player-art">'+icon("music")+'</div><div class="linka-player-head-copy"><strong>Linka · Atmosphere</strong><span>Немного тишины между мыслями</span></div><button data-close-player class="linka-player-button" type="button" aria-label="Закрыть">'+icon("close")+'</button></header><div class="linka-player-hero"><div class="linka-player-disc">'+icon("music")+'</div></div><div class="linka-player-current"><strong data-player-title></strong><span data-player-artist></span></div><div class="linka-player-time"><span class="linka-player-time-current">0:00</span><span class="linka-player-time-duration">0:00</span></div><input class="linka-player-seek" type="range" min="0" max="1000" value="0" aria-label="Позиция в треке"><div class="linka-player-controls"><button data-prev class="linka-player-button" aria-label="Предыдущий" type="button">'+icon("prev")+'</button><button data-player-play class="linka-player-button linka-player-play" aria-label="Воспроизвести" type="button">'+icon("play")+'</button><button data-next class="linka-player-button" aria-label="Следующий" type="button">'+icon("next")+'</button></div><label class="linka-player-volume">'+icon("volume")+'<span>Громкость</span><input data-volume type="range" min="0" max="100" value="14" aria-label="Громкость"><span data-volume-label>14%</span></label><header class="linka-player-head"><div class="linka-player-head-copy"><strong>Твой плейлист</strong><span>Локальные треки не загружаются в облако</span></div><button data-add-track class="linka-player-button" type="button" aria-label="Добавить треки">'+icon("plus")+'</button></header><div class="linka-player-playlist"></div><footer class="linka-player-footer"><span class="linka-player-muted">Мягкий звук · спокойный фон</span></footer></section>';document.body.append(panel);panel.addEventListener("click",e=>{if(e.target===panel||e.target.closest("[data-close-player]"))closePlayer()});$("[data-player-play]",panel).addEventListener("click",()=>void togglePlay());$("[data-prev]",panel).addEventListener("click",()=>void loadTrack(state.index-1,true));$("[data-next]",panel).addEventListener("click",()=>void loadTrack(state.index+1,true));$("[data-add-track]",panel).addEventListener("click",()=>$("#linka-atmosphere-audio-picker").click());$(".linka-player-seek",panel).addEventListener("input",e=>{if(Number.isFinite(state.audio?.duration)&&state.audio.duration>0)state.audio.currentTime=Number(e.target.value)/1000*state.audio.duration});$("[data-volume]",panel).addEventListener("input",e=>{state.volume=Number(e.target.value)/100;write("volume",state.volume);state.audio.volume=state.volume;$("[data-volume-label]",panel).textContent=Math.round(state.volume*100)+"%"});document.addEventListener("keydown",e=>{if(e.key==="Escape")closePlayer()})}
function openSettings(){const layer=document.createElement("div");layer.className="linka-player-panel open";layer.style.zIndex="60";const panel=document.createElement("section");panel.className="linka-atmosphere-settings";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.innerHTML='<div class="linka-atmosphere-title-row"><div><h2>Атмосфера Linka</h2><small>Сумеречный лес, ветер и плёночное зерно.</small></div><button class="linka-player-button" data-close type="button" aria-label="Закрыть">'+icon("close")+'</button></div><p>Фон и музыка настраиваются отдельно на каждом устройстве. Сохранённые записи остаются нетронутыми.</p><div class="linka-atmosphere-setting"><div class="linka-atmosphere-setting-copy"><strong>Лесное видео</strong><span>Медленное движение и затемнение для читаемости.</span></div><button class="linka-atmosphere-toggle" data-toggle="video" type="button"><i></i></button></div><div class="linka-atmosphere-setting"><div class="linka-atmosphere-setting-copy"><strong>Едва заметное зерно</strong><span>Мягкая плёночная текстура без резких помех.</span></div><button class="linka-atmosphere-toggle" data-toggle="grain" type="button"><i></i></button></div><div class="linka-atmosphere-setting"><div class="linka-atmosphere-setting-copy"><strong>Музыка</strong><span>Твой трек по умолчанию. Громкость можно менять в плеере.</span></div><button class="linka-atmosphere-toggle" data-toggle="music" type="button"><i></i></button></div><div class="linka-atmosphere-actions"><button data-pick>Выбрать фото или видео</button><button data-reset>Вернуть лес</button><button data-player>Плеер и плейлист</button></div><div class="linka-atmosphere-state" role="status"></div><input data-bg-picker type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden></section>';layer.append(panel);document.body.append(layer);const close=()=>layer.remove();layer.addEventListener("click",e=>{if(e.target===layer||e.target.closest("[data-close]"))close()});panel.querySelectorAll("[data-toggle]").forEach(b=>{const key=b.dataset.toggle;const val=key==="video"?state.video:key==="grain"?state.grain:state.music;b.setAttribute("aria-pressed",String(val));b.addEventListener("click",()=>{const next=!(key==="video"?state.video:key==="grain"?state.grain:state.music);if(key==="video"){state.video=next;write("video",next);$("#linka-atmosphere")?.classList.toggle("disabled",!next);if(next)$("#linka-atmosphere video")?.play().catch(()=>{});else $("#linka-atmosphere video")?.pause()}else if(key==="grain"){state.grain=next;write("grain",next);$("#linka-atmosphere")?.classList.toggle("no-grain",!next)}else{state.music=next;write("music",next);if(!next){state.audio.pause();playing(false)}else{void togglePlay()}}b.setAttribute("aria-pressed",String(next))})});$("[data-pick]",panel).addEventListener("click",()=>$("[data-bg-picker]",panel).click());$("[data-player]",panel).addEventListener("click",openPlayer);$("[data-reset]",panel).addEventListener("click",async()=>{if(state.background?.url)URL.revokeObjectURL(state.background.url);state.background=null;write("background",null);try{await db("background","readwrite",s=>s.delete("background"))}catch{}await loadBackground();$(".linka-atmosphere-state",panel).textContent="Вернул лес на закате."});$("[data-bg-picker]",panel).addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;const status=$(".linka-atmosphere-state",panel);try{if(!file.type.startsWith("image/")&&!file.type.startsWith("video/"))throw new Error("Выбери фото или видео.");await putMedia("background",file,"background");write("background",{id:"background",name:file.name,type:file.type});if(state.background?.url)URL.revokeObjectURL(state.background.url);state.background={id:"background",name:file.name,type:file.type};await loadBackground();status.textContent="Фон сохранён локально на этом устройстве."}catch(err){status.textContent=err.message||"Не удалось сохранить фон."}finally{e.target.value=""}})}
function settingsTrigger(){const s=$("#settings-button");if(!s||$("#linka-atmosphere-settings-trigger"))return;const b=btn("Настройки атмосферы","music");b.id="linka-atmosphere-settings-trigger";b.style.width="38px";b.style.height="38px";b.addEventListener("click",openSettings);s.insertAdjacentElement("beforebegin",b)}
function typingAnimation(){
   const ta=$("#capture-text");if(!ta||ta.dataset.linkaTyping)return;ta.dataset.linkaTyping="true";
   const wrap=document.createElement("div");wrap.className="linka-type-stage";ta.parentNode.insertBefore(wrap,ta);wrap.append(ta);
   const mirror=document.createElement("div");mirror.className="linka-type-mirror";mirror.setAttribute("aria-hidden","true");
   const computed=getComputedStyle(ta);["fontFamily","fontSize","fontWeight","fontStyle","lineHeight","letterSpacing","textAlign","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","boxSizing"].forEach(key=>mirror.style[key]=computed[key]);wrap.prepend(mirror);
   let previous=ta.value, eraseTimer=0;
   const draw=(next,old=next,animate=false)=>{
     mirror.replaceChildren();mirror.style.opacity=next||old?"":"0";
     if(!next&&!old)return;
     let prefix=0;while(prefix<Math.min(next.length,old.length)&&next[prefix]===old[prefix])prefix++;
     let suffix=0;while(suffix<next.length-prefix&&suffix<old.length-prefix&&next[next.length-1-suffix]===old[old.length-1-suffix])suffix++;
     const removed=old.slice(prefix,old.length-suffix),added=next.slice(prefix,next.length-suffix);
     const makeSpan=(ch,cls,index)=>{const span=document.createElement("span");span.textContent=ch;if(cls){span.className=cls;span.style.animationDelay=Math.min(index*7,70)+"ms"}return span};
     const fragment=document.createDocumentFragment();
     for(let i=0;i<prefix;i++)fragment.append(makeSpan(next[i],"",i));
     if(removed&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches&&!document.documentElement.classList.contains("reduced-motion")){
       for(const ch of removed)fragment.append(makeSpan(ch,"linka-type-erasing",0));
       clearTimeout(eraseTimer);eraseTimer=setTimeout(()=>draw(ta.value),230);
     }
     [...added].forEach((ch,i)=>fragment.append(makeSpan(ch,animate?"linka-type-letter":"",i)));
     for(let i=next.length-suffix;i<next.length;i++)if(i>=prefix)fragment.append(makeSpan(next[i],"",i));
     mirror.append(fragment);mirror.scrollTop=ta.scrollTop;mirror.scrollLeft=ta.scrollLeft;
   };
   draw(ta.value);
   ta.addEventListener("input",()=>{const next=ta.value;wrap.classList.toggle("is-typing",Boolean(next));draw(next,previous,true);previous=next});
   ta.addEventListener("focus",()=>{if(ta.value){wrap.classList.add("is-typing");draw(ta.value)}});
   ta.addEventListener("blur",()=>wrap.classList.remove("is-typing"));
   ta.addEventListener("scroll",()=>{mirror.scrollTop=ta.scrollTop;mirror.scrollLeft=ta.scrollLeft});
 }
 async function initAudio(){
  state.audio=document.createElement("audio");
  state.audio.preload="metadata";
  
  state.audio.addEventListener("play",()=>playing(true));
  state.audio.addEventListener("pause",()=>playing(false));
  state.audio.addEventListener("ended",()=>void loadTrack(state.index+1,true));
  state.audio.addEventListener("timeupdate",renderPlayer);
  state.audio.addEventListener("loadedmetadata",renderPlayer);
  state.audio.addEventListener("error",()=>{playing(false);toast("Не удалось загрузить музыку. Добавь MP3 с устройства или проверь соединение.")});
  state.volume=Number(read("volume",.14));if(!Number.isFinite(state.volume))state.volume=.14;state.volume=Math.min(1,Math.max(0,state.volume));
  const savedPlaylist=read("playlist",[]);
  const userTracks=Array.isArray(savedPlaylist)?savedPlaylist.filter(t=>t&&t.id!==DEFAULT_TRACK.id&&t.id!=="linka-provided-track"):[];
  state.playlist=[DEFAULT_TRACK,...userTracks];
  state.index=0;
  write("playlist",state.playlist);write("index",0);
  for(const t of state.playlist){
    if(t.localId&&!state.urls.has(t.localId)){const rec=await getMedia(t.localId);if(rec?.blob)state.urls.set(t.localId,URL.createObjectURL(rec.blob))}
  }
  const input=document.createElement("input");input.type="file";input.accept="audio/*";input.multiple=true;input.hidden=true;input.id="linka-atmosphere-audio-picker";
  input.addEventListener("change",async e=>{
    const files=Array.from(e.target.files||[]);
    try{
      let added=0,firstAddedId="";
      for(const file of files){
        if(!file.type.startsWith("audio/"))continue;
        const id=uid(),localId="track:"+id;
        await putMedia(localId,file,"audio");state.urls.set(localId,URL.createObjectURL(file));
        state.playlist.push({id,localId,name:file.name.replace(/\.[a-z0-9]{1,5}$/i,""),artist:"Локальный файл"});
        if(!firstAddedId)firstAddedId=id;
        added++;
      }
      if(added){
        state.index=Math.max(0,state.playlist.findIndex(item=>item.id===firstAddedId));
        write("playlist",state.playlist);write("index",state.index);renderPlayer();
        await loadTrack(state.index,true);
      }
      toast("Добавлено треков: "+added);
    }catch(err){toast(err.message||"Не удалось добавить треки")}
    finally{e.target.value=""}
  });
  document.body.append(input);
  await loadTrack(state.index,false);
}
function armMusicStart(){
  const tryStart=()=>{
    if(!state.music||state.playing||!state.audio||!state.audio.src)return;
    state.audio.play().then(()=>playing(true)).catch(()=>{});
  };
  const onGesture=event=>{
    document.removeEventListener("pointerdown",onGesture,true);
    document.removeEventListener("keydown",onGesture,true);
    if(event.target?.closest?.(".linka-player-dock,.linka-player-panel,.linka-atmosphere-settings"))return;
    tryStart();
  };
  document.addEventListener("pointerdown",onGesture,true);
  document.addEventListener("keydown",onGesture,true);
}
export function openAtmosphereSettings(){openSettings()}
export async function initLinkaAtmosphere(){if(state.initialized)return;state.initialized=true;addStyles();state.reduced=matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;const storedThemeVersion=read("themeVersion","");
  if(storedThemeVersion!=="twilight-v2"){write("video",true);write("music",true);write("themeVersion","twilight-v2")}
  state.video=read("video",true)!==false;state.grain=read("grain",true)!==false;state.music=read("music",true)!==false;state.db=await openDb();buildBackground();$("#linka-atmosphere").classList.toggle("disabled",!state.video);$("#linka-atmosphere").classList.toggle("no-grain",!state.grain);await loadBackground();createPlayer();await initAudio();armMusicStart();settingsTrigger();typingAnimation();document.addEventListener("visibilitychange",()=>{const v=$("#linka-atmosphere video");if(document.hidden){v?.pause();state.audio?.pause()}else if(state.video&&!state.reduced)v?.play().catch(()=>{})});window.addEventListener("linka:atmosphere-open",openSettings);document.addEventListener("keydown",e=>{if(e.key==="Escape")closePlayer()});window.addEventListener("beforeunload",()=>{state.audio?.pause();state.urls.forEach(u=>URL.revokeObjectURL(u));if(state.background?.url)URL.revokeObjectURL(state.background.url)});renderPlayer()}

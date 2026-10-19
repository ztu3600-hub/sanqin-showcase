// Entry-based history, following WICG/navigation-api and React Router's keys.
// Framer owns routing, native links, browser traversal and page transitions.
;(function(){
 const nav=window.navigation;
 const prefix='sanqin-entry-v1:';
 const read=key=>{try{return JSON.parse(sessionStorage.getItem(prefix+key)||'null')}catch{return null}};
 const write=(key,value)=>{try{sessionStorage.setItem(prefix+key,JSON.stringify(value))}catch{}};
 const detail=path=>path==='/sanqin-showcase/contact'||/^\/sanqin-showcase\/(projects|blogs|services)\/[^/]+\/?$/.test(path);
 const clean=url=>{const u=new URL(url);u.searchParams.delete('__brand_from');u.searchParams.delete('__brand_restore');return u.href};
 const key=()=>nav?.currentEntry?.key||history.state?.entryId;
 const snapshot=()=>({key:key(),url:clean(location.href),scroll:{x:scrollX,y:scrollY}});
 const trace=(event,data={})=>{
  const records=read('audit')||[];
  records.push({event,time:Date.now(),key:key(),path:window.__showcasePath,y:scrollY,nativePosition:history.state?.scrollPosition,...data});
  const recent=records.slice(-40);
  write('audit',recent);
  document.documentElement.dataset.brandHistoryAudit=JSON.stringify(recent);
 };
 let pressed=null,returnTarget=read('return'),scroller=null;
 if(returnTarget?.key!==key())returnTarget=null;
 const save=entry=>{if(!entry?.key)return;write(entry.key,{...read(entry.key),...entry})};
 const watched=new WeakSet();
 // Expiration follows browser history, not a timer. A completed return
 // may still have a usable forward entry; only unreachable entries expire.
 const cleanup=()=>{
  if(!nav?.entries)return;
  const entries=nav.entries(),live=new Set(entries.map(entry=>entry.key));
  for(const pending of [key(),pressed?.key,returnTarget?.key])if(pending)live.add(pending);
  for(const entry of entries){
   if(watched.has(entry))continue;
   watched.add(entry);
   entry.addEventListener('dispose',cleanup,{once:true});
  }
  let removed=0;
  try{
   const expired=[];
   for(let i=0;i<sessionStorage.length;i++){
    const name=sessionStorage.key(i);
    if(name?.startsWith(prefix)&&!['audit','handoff','return'].some(suffix=>name===prefix+suffix)&&!live.has(name.slice(prefix.length)))expired.push(name);
   }
   for(const name of expired){sessionStorage.removeItem(name);removed++}
  }catch{}
  if(removed)trace('history-cleanup',{removed});
 };
 // Observe the original input before Framer's onTap. Never stop propagation,
 // prevent defaults, rewrite hrefs, or perform navigation from these listeners.
 const observe=event=>{
  const link=event.target.closest?.('a[href]');
  if(!link||link.hasAttribute('data-brand-return-button'))return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||link.target==='_blank')return;
  pressed={...snapshot(),destination:clean(url.href)};save(pressed);
  trace('entry-input',{destination:pressed.destination,captured:pressed.scroll});
  // Feed the original router's existing restoration record at the exact
  // entry click. Its scrollend observer can still be pending while Lenis
  // moves; the detail source keeps an independent immutable snapshot.
  if(history.state?.routeId){
   History.prototype.replaceState.call(history,{...history.state,scrollPosition:pressed.scroll},'',location.href);
  }
 };
 document.addEventListener('pointerdown',observe,{capture:true,passive:true});
 document.addEventListener('keydown',event=>{if(event.key==='Enter')observe(event)},{capture:true,passive:true});
 // Runtime-localized links can be document navigations. Transfer the same
 // immutable entry snapshot across that load without intercepting the link.
 nav?.addEventListener('navigate',event=>{
  if(!event.destination.sameDocument&&pressed&&clean(event.destination.url)===pressed.destination){
   write('handoff',{destination:pressed.destination,source:{key:pressed.key,url:pressed.url,scroll:{...pressed.scroll}}});
  }else{try{sessionStorage.removeItem(prefix+'handoff')}catch{}}
 });
 nav?.addEventListener('currententrychange',event=>{
  const entry=nav.currentEntry;
  if(event.navigationType==='replace')return;
  const url=clean(entry.url),path=new URL(url).pathname;
  if(event.navigationType==='push'){
   returnTarget=null;
   try{sessionStorage.removeItem(prefix+'return')}catch{}
   const previous=pressed?.key===event.from.key&&pressed.destination===url?pressed:read(event.from.key);
   write(entry.key,{key:entry.key,url,scroll:{x:0,y:0},source:detail(path)&&previous?{key:previous.key,url:previous.url,scroll:previous.scroll}:null});
  }
  if(event.navigationType==='traverse'&&returnTarget){
   if(returnTarget.key!==entry.key)returnTarget=null;
  }
  trace('history-commit',{type:event.navigationType,from:event.from.key,source:read(entry.key)?.source});
  pressed=null;
  cleanup();
 });
 // History commitment is not a React page commitment. Only the original
 // router publishes route UI; this observer never schedules React renders.
 nav?.addEventListener('navigateerror',event=>{trace('navigation-error',{error:String(event.error)});pressed=null;cleanup();console.error('Brand history navigation failed',event.error)});
 nav?.addEventListener('navigatesuccess',cleanup);
 for(const name of ['pointercancel','wheel','touchstart'])addEventListener(name,()=>{pressed=null},{capture:true,passive:true});
 addEventListener('pagehide',()=>save(snapshot()));
 if(!read(key()))save(snapshot());
 const handoff=read('handoff');
 if(handoff?.destination===clean(location.href)&&detail(window.__showcasePath)&&nav?.entries().some(entry=>entry.key===handoff.source.key))save({...snapshot(),source:handoff.source});
 try{sessionStorage.removeItem(prefix+'handoff');if(!returnTarget)sessionStorage.removeItem(prefix+'return')}catch{}
 window.__sanqinHistory={
  attachScroller(value){scroller=value},
  detachScroller(value){if(scroller===value)scroller=null},
  syncScroller(position){if(scroller){scroller.reset();scroller.resize();scroller.scrollTo(position.y,{immediate:true,force:true})}},
  prepareEntryScroll(hash){
   const source=history.state?.sanqinSource??read(key())?.source;
   if(!source||new URL(source.url).pathname===window.__showcasePath)return;
   const anchor=hash&&document.getElementById(hash);
   const position={x:0,y:anchor?Math.max(0,anchor.getBoundingClientRect().top+scrollY-(parseFloat(getComputedStyle(anchor).scrollMarginTop)||0)):0};
   this.syncScroller(position);
   trace('framer-detail-entry-scroll',{position});
  },
  entryKey:()=>history.state?.entryId||key(),
  source:()=>history.state?.sanqinSource??read(key())?.source??null,
  captureSource(destination){
   const url=clean(new URL(destination,location.href).href);
   if(!detail(new URL(url).pathname))return null;
   const entry=pressed?.key===key()&&pressed.destination===url?pressed:snapshot();
   const source={key:entry.key,url:entry.url,scroll:{...entry.scroll}};
   trace('source-bound',{destination:url,source});
   return source;
  },
  departurePosition:()=>pressed?.key===key()?pressed.scroll:null,
  returnPosition:()=>returnTarget?.key===key()?returnTarget.scroll:null,
  consumeReturn(){if(returnTarget?.key===key()){returnTarget=null;try{sessionStorage.removeItem(prefix+'return')}catch{}}cleanup()},
  trace,
  async back(source){
   trace('return-request',{source});
   console.info('Brand return requested',{current:key(),source:source?.key,transition:!!nav?.transition});
   // Serialize traversal behind the router's active transition. Starting
   // another navigation while its intercept handler is running aborts it.
   await nav?.transition?.finished.catch(()=>{});
   if(source&&nav?.entries().some(entry=>entry.key===source.key)){
    returnTarget={key:source.key,scroll:{...source.scroll}};
    write('return',returnTarget);
    await nav.traverseTo(source.key).finished.catch(error=>{
     // Framer may replace its route state after commitment, aborting the
     // native promise. Keep the snapshot if its destination is now current.
     if(key()!==source.key)returnTarget=null;
     console.error('Return navigation failed',error);
    });
    trace('return-finished',{source});
    cleanup();
    console.info('Brand return settled',{current:key(),path:window.__showcasePath});
   }else if(source)location.assign(source.url);
  }
 };
 cleanup();
 document.documentElement.dataset.brandNavigationVersion='framer-debounced-history-cleanup';
 trace('document-ready');
})();

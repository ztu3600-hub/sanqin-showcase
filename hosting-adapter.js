(()=>{
const base="/sanqin-showcase", native=window.fetch.bind(window);
Object.defineProperty(window,'__showcasePath',{get:()=>location.pathname===base+'/'?location.pathname:location.pathname.replace(/\/$/,'')});
const rooted=x=>typeof x==='string'&&x.startsWith('/')&&!x.startsWith('//')&&!x.startsWith(base+'/')?base+x:x;
window.fetch=async(input,init)=>{
 let raw=typeof input==='string'?rooted(input):input instanceof URL?input.href:input;
 const u=new URL(typeof raw==='string'?raw:raw.url,location.href);
 const path=u.pathname.startsWith(base+'/')?u.pathname.slice(base.length):u.pathname;
 if((init?.method||input?.method||'GET').toUpperCase()!=='GET'&&(init?.method||input?.method||'GET').toUpperCase()!=='HEAD')return new Response(JSON.stringify({success:true,demo:true}),{headers:{'Content-Type':'application/json'}});
 if(u.origin===location.origin){
  if(path==='/api/forms')return new Response(JSON.stringify({success:true,demo:true,message:'Demo only; no information is sent or saved.'}),{headers:{'Content-Type':'application/json'}});
  if(path.endsWith('.framercms')&&u.searchParams.has('range')){
   const ranges=u.searchParams.get('range').split(',').map(x=>x.split('-').map(Number));u.searchParams.delete('range');
   const r=await native(u.href,init);if(!r.ok)return r;
   const bytes=new Uint8Array(await r.arrayBuffer()),chunks=ranges.map(([a,b])=>bytes.slice(a,b+1));
   const all=new Uint8Array(chunks.reduce((n,x)=>n+x.length,0));let i=0;for(const x of chunks){all.set(x,i);i+=x.length;}
   return new Response(all,{headers:{'Content-Type':'application/octet-stream'}});
  }
  if(path==='/search/suggest'){
   const c=await native(base+'/catalog.json').then(r=>r.json());const q=(u.searchParams.get('q')||'').toLowerCase();
   const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const items=c.filter(p=>p.title.toLowerCase().includes(q)).slice(0,8);
   return new Response(`<div id="PredictiveSearchResults-${esc(u.searchParams.get('section_id'))}"><div style="padding:24px">${items.map(p=>`<a href="${esc(p.url)}" style="display:flex;gap:16px;margin:12px"><img src="${esc(p.image)}" width="60" height="60"><span>${esc(p.title)}</span></a>`).join('')||'No results found.'}</div></div>`,{headers:{'Content-Type':'text/html'}});
  }
  if(u.search&&(u.searchParams.has('section_id')||u.searchParams.has('sections')||u.searchParams.has('variant')||u.searchParams.has('page'))){
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(path+u.search));
   const key=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
   const cached=await native(base+'/_queries/'+key+'.html');
   if(cached.ok)return cached;
   return native(u.origin+u.pathname,init);
  }
 }
 return native(raw,init);
};
 document.addEventListener('submit',e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement))return;
 const path=new URL(form.action,location.href).pathname;
 if(path.includes('/search')||path.endsWith('/cart/add')||form.matches('[data-node-type="commerce-add-to-cart-form"]'))return;
 e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;
 let status=form.parentElement.querySelector('[data-demo-form-status]');
 if(!status){status=document.createElement('p');status.dataset.demoFormStatus='true';status.setAttribute('role','status');form.after(status);}
 status.textContent='演示表单：信息不会发送或保存。 Demo only: no information was sent or saved.';
 },true);
function notice(){
 const el=document.createElement('div');el.id='showcase-disclaimer';el.setAttribute('role','note');
 el.style.cssText='position:fixed;bottom:8px;left:8px;right:8px;z-index:2147483647;background:#171717;color:#fff;border:1px solid #777;border-radius:6px;padding:10px 14px;font:12px/1.5 Arial,sans-serif;display:flex;gap:12px;align-items:center;justify-content:space-between';
 el.innerHTML='<span>模板学习与效果演示 · 非品牌官方网站，与原站及所示品牌无关联。不接受订单、付款或联系信息。<br>Educational template demo only. Not affiliated with the original website or displayed brands. No orders, payments or personal information are collected.</span><button type="button" aria-label="关闭演示说明" style="color:white;background:transparent;border:1px solid #777;padding:4px 9px;cursor:pointer">×</button>';
 el.querySelector('button').onclick=()=>el.remove();document.body.append(el);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',notice);else notice();
})();
/* Private GitHub storage; the public repository receives availability only. */
window.RentalCalendar = async function ({container, token, owner, repo, branch}) {
  const M = window.Reservations;
  let products, document, privateRepo, privateBranch, privateSha, publicSha;
  let selected = new Date().toLocaleDateString('en-CA'), view = 'month', filter = '', editing = null, working = false, dirty = false;
  // Build dates without locale-dependent serialization.
  const now = new Date(); selected = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const node = (tag, text, parent, attrs = {}) => {
    const n = window.document.createElement(tag); if (text !== null) n.textContent = text;
    for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);
    if (parent) parent.append(n); return n;
  };
  const button = (text, parent, fn, cls) => {const b=node('button',text,parent,{type:'button',...(cls?{class:cls}:{})}); b.onclick=fn; return b;};
  const input = (label, parent, value='', type='text') => {const l=node('label',label,parent); const i=node('input',null,l,{type,'aria-label':label});i.value=value;return i;};
  const select = (label,parent, options, value) => {const l=node('label',label,parent), s=node('select',null,l,{'aria-label':label});for(const [v,t] of options)node('option',t,s,{value:v});s.value=value;return s;};
  async function request(repository, path, method='GET', body) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repository}${path ? '/' + path : ''}`, {method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const j = await r.json().catch(()=>({}));
    if (!r.ok) { const e = Error(r.status === 409 || r.status === 422 ? 'Dati ir mainīti citā sesijā. Pārlādē nomas sadaļu un atkārto izmaiņas.' : `GitHub ${r.status}: ${j.message || 'Pieprasījums neizdevās'}`);e.status=r.status;throw e; }
    return j;
  }
  const decode = c => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c.replace(/\s/g,'')),x=>x.charCodeAt(0))));
  const encode = value => {let binary='';for(const b of new TextEncoder().encode(JSON.stringify(value,null,2)+'\n'))binary+=String.fromCharCode(b);return btoa(binary);};
  const read = (repository,path,ref) => request(repository,`contents/${path}?ref=${encodeURIComponent(ref)}`);
  const write = (repository,path,ref,value,sha,message) => request(repository,`contents/${path}`,'PUT',{branch:ref,message,content:encode(value),...(sha?{sha}:{})});
  container.replaceChildren();
  const setup=node('div',null,container,{class:'card'});
  node('h2','Rezervāciju privātā glabātuve',setup);
  node('p','Izvēlies šī paša GitHub īpašnieka privātu repozitoriju ar vismaz vienu commit. Atslēgai vajadzīgas Contents: Read and write tiesības abiem repozitorijiem. Klientu vārdi un kontaktinformācija netiek glabāti.',setup);
  // Remember only the non-secret repository name, scoped to this website.
  const storageKey=`gs:rental-repository:${owner}/${repo}`;
  let rememberedRepo='garazas-studija-reservations';
  try {
    const saved=localStorage.getItem(storageKey);
    if(saved && /^[\w.-]+$/.test(saved))rememberedRepo=saved;
  } catch (_) { /* Storage can be unavailable in private/restricted browsing. */ }
  const storage=input('Privātā repozitorija nosaukums',setup,rememberedRepo);
  node('p','Repozitorija nosaukumu atcerēsimies šajā pārlūkā. GitHub piekļuves atslēga netiek saglabāta.',setup,{class:'small'});
  const connect=button('Atvērt kalendāru',setup,async()=>{
    connect.disabled=true; error.textContent='';
    try {
      if(!/^[\w.-]+$/.test(storage.value.trim()))throw Error('Norādi repozitorija nosaukumu bez īpašnieka un slīpsvītrām.');
      privateRepo=storage.value.trim();
      const info=await request(privateRepo,'');
      if(info.private!==true)throw Error('Rezervāciju glabāšanai nepieciešams privāts repozitorijs.');
      privateBranch=info.default_branch;
      const pub=await read(repo,'data/noma.json',branch);publicSha=pub.sha;
      products=decode(pub.content);
      if(!Array.isArray(products))throw Error('Nederīgi publiskie nomas dati.');
      products=products.map((p,i)=>({...p,id:p.id || `rental-${i+1}`}));
      try {
        const file=await read(privateRepo,'reservations.json',privateBranch);privateSha=file.sha;document=decode(file.content);
      } catch(e) {
        if(e.status!==404)throw e;
        // Verify the branch exists: an empty/inaccessible repo is not a new data file.
        await request(privateRepo,`branches/${encodeURIComponent(privateBranch)}`);
        privateSha=null;document={version:1,bookings:[],legacyBusy:Object.fromEntries(products.map(p=>[p.id,p.busy || []]))};
      }
      if(document.version!==1 || !Array.isArray(document.bookings) || !document.legacyBusy || typeof document.legacyBusy!=='object')throw Error('Neatbalstīts rezervāciju faila formāts.');
      for(const p of products) if(!Object.hasOwn(document.legacyBusy,p.id))document.legacyBusy[p.id]=p.busy || [];
      for(const b of document.bookings) M.validate(b,document.bookings,document.products || products,document.legacyBusy);
      if (Array.isArray(document.products)) {
        const projection=M.publicProducts(document.products,document.bookings,document.legacyBusy);
        dirty=JSON.stringify(projection)!==JSON.stringify(decode(pub.content));
        if(dirty && document.publicSha!==publicSha)throw Error('Publiskie dati mainīti pēc privātās saglabāšanas. Nepieciešama manuāla datu salāgošana; nekas nav pārrakstīts.');
        products=document.products;
      }
      try { localStorage.setItem(storageKey,privateRepo); } catch (_) { /* Calendar works without storage. */ }
      render();
    } catch(e){error.textContent=e.message;}finally{connect.disabled=false;}
  });
  const error=node('p','',setup,{class:'error',role:'alert'});
  function render() {
    container.replaceChildren();
    const card=node('div',null,container,{class:'card'});
    node('h2','Nomas rezervāciju kalendārs',card);
    node('p',`Privāti: ${owner}/${privateRepo}. Datumi ietver sākuma un beigu dienu. Atcelta rezervācija neaizņem produktu.`,card,{class:'small'});
    const notice=node('p',dirty?'Rezervācijas saglabātas privāti, bet pieejamība vēl nav publicēta. Atkārto sinhronizāciju.':'',card,{role:'status','aria-live':'polite'});
    if(dirty)button('Atkārtot pieejamības sinhronizāciju',card,()=>persist(document.bookings,notice,true));
    const bar=node('div',null,card,{class:'toolbar'});
    const mode=select('Skats',bar,[['month','Mēnesis'],['week','Nedēļa']],view);mode.onchange=()=>{view=mode.value;render();};
    const date=input('Datums',bar,selected,'date');date.onchange=()=>{if(M.date(date.value)){selected=date.value;render();}};
    button('← Iepriekšējais',bar,()=>move(-1));button('Šodien',bar,()=>{selected=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;render();});button('Nākamais →',bar,()=>move(1));
    const pf=select('Produkts',bar,[['','Visi produkti'],...products.map(p=>[p.id,p.name])],filter);pf.onchange=()=>{filter=pf.value;render();};
    const dates=M.range(selected,view);
    node('p',`${dates[0]} — ${dates.at(-1)}`,card);
    const scroll=node('div',null,card,{class:'calendar-scroll',tabindex:'0','aria-label':'Rezervāciju kalendārs'});
    const table=node('table',null,scroll,{class:'booking-calendar'}), head=node('tr',null,node('thead',null,table));node('th','Produkts',head,{scope:'col'});
    for(const d of dates)node('th',new Intl.DateTimeFormat('lv-LV',{weekday:'short',day:'numeric',month:'numeric',timeZone:'UTC'}).format(new Date(d)),head,{scope:'col'});
    const body=node('tbody',null,table);
    for(const p of products.filter(p=>!filter||p.id===filter)){
      const row=node('tr',null,body);node('th',p.name,row,{scope:'row'});
      for(const d of dates){
        const cell=node('td',null,row);
        const matches=document.bookings.filter(b=>b.productId===p.id && b.start<=d && b.end>=d && b.status!=='cancelled');
        if((document.legacyBusy[p.id]||[]).includes(d))node('span','Iepriekš aizņemts',cell,{class:'legacy-busy'});
        for(const b of matches)button(`${b.clientCode} · ${M.statuses[b.status]}`,cell,()=>{editing=b.id;render();},`booking ${b.status}`);
        const add=button('+',cell,()=>{editing={productId:p.id,start:d,end:d};render();},'secondary');add.setAttribute('aria-label',`Jauna rezervācija: ${p.name}, ${d}`);
      }
    }
    editor(card,notice);
    const list=node('div',null,card);node('h3','Rezervācijas izvēlētajā periodā',list);
    const visible=document.bookings.filter(b=>(!filter||b.productId===filter)&&b.start<=dates.at(-1)&&b.end>=dates[0]);
    if(!visible.length)node('p','Šajā periodā rezervāciju nav.',list);
    for(const b of visible){const row=node('div',null,list,{class:'row'});node('p',`${products.find(p=>p.id===b.productId)?.name || b.productId} · ${b.clientCode} · ${b.start} — ${b.end} · ${M.statuses[b.status]}`,row);button('Mainīt',row,()=>{editing=b.id;render();});button('Dzēst',row,async()=>{if(confirm('Dzēst šo rezervāciju?'))await persist(document.bookings.filter(x=>x.id!==b.id),notice);},'danger');}
    productEditor(card,notice);
    if(working||dirty)container.querySelectorAll('input,select,button').forEach(n=>{n.disabled=true;});
    if(dirty)container.querySelector('button').disabled=false;
  }
  function move(delta){const d=new Date(selected+'T00:00:00Z');if(view==='month'){d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+delta);}else d.setUTCDate(d.getUTCDate()+delta*7);selected=d.toISOString().slice(0,10);render();}
  function editor(parent,notice){
    const b=typeof editing==='string'?document.bookings.find(b=>b.id===editing):editing;
    const form=node('form',null,parent,{class:'row'});node('h3',b?.id?'Mainīt rezervāciju':'Jauna rezervācija',form);
    const product=select('Nomas produkts',form,products.map(p=>[p.id,p.name]),b?.productId||filter||products[0]?.id);
    const code=input('Klienta kods (piemēram, GS-0001)',form,b?.clientCode||'');code.required=true;code.pattern='GS-[0-9]{4,8}';code.maxLength=11;
    const start=input('Sākuma datums',form,b?.start||selected,'date'),end=input('Beigu datums',form,b?.end||selected,'date');start.required=end.required=true;
    const status=select('Rezervācijas statuss',form,Object.entries(M.statuses),b?.status||'pending');
    const submit=node('button',b?.id?'Saglabāt izmaiņas':'Pievienot rezervāciju',form,{type:'submit'});submit.disabled=!products.length;
    button('Notīrīt formu',form,()=>{editing=null;render();},'secondary');
    form.onsubmit=async e=>{e.preventDefault();const booking={id:b?.id||crypto.randomUUID(),productId:product.value,clientCode:code.value.trim(),start:start.value,end:end.value,status:status.value};try{M.validate(booking,document.bookings,products,document.legacyBusy);await persist([...document.bookings.filter(x=>x.id!==booking.id),booking],notice);}catch(err){notice.textContent=err.message;}};
  }
  function productEditor(parent,notice){
    const details=node('details',null,parent);node('summary','Produkti un iepriekšējie bloķējumi',details);
    node('p','Iepriekšējos aizņemtos datumus saglabājam atsevišķi. Tos vari noņemt tikai pēc vajadzības; rezervāciju datumi tiek aprēķināti automātiski.',details,{class:'small'});
    for(const p of products){
      const form=node('form',null,details,{class:'row'});const name=input('Produkta nosaukums',form,p.name),description=input('Apraksts',form,p.description||''),price=input('Cena dienā (€)',form,p.price||''),image=input('Attēla ceļš',form,p.image||''),busy=input('Iepriekš aizņemtie datumi (atdalīti ar komatu)',form,(document.legacyBusy[p.id]||[]).join(', '));name.required=true;
      node('button','Saglabāt produktu',form,{type:'submit'});
      button('Dzēst produktu',form,async()=>{
        if(document.bookings.some(b=>b.productId===p.id)||(document.legacyBusy[p.id]||[]).length){notice.textContent='Produktu ar rezervācijām vai aizņemtiem datumiem nevar dzēst.';return;}
        if(!confirm('Dzēst šo nomas produktu?'))return;
        const index=products.indexOf(p);products.splice(index,1);
        if(!await persist(document.bookings,notice)&&!dirty)products.splice(index,0,p);
      },'danger');
      form.onsubmit=async e=>{e.preventDefault();const dates=busy.value.split(',').map(x=>x.trim()).filter(Boolean);if(dates.some(d=>!M.date(d))){notice.textContent='Bloķējumiem lieto YYYY-MM-DD datumus.';return;}if(document.bookings.some(b=>b.productId===p.id&&b.status!=='cancelled'&&dates.some(d=>d>=b.start&&d<=b.end))){notice.textContent='Bloķējums pārklājas ar rezervāciju.';return;}
        const old={...p},oldBusy=document.legacyBusy[p.id];Object.assign(p,{name:name.value.trim(),description:description.value,price:price.value,image:image.value});document.legacyBusy[p.id]=dates;
        if(!await persist(document.bookings,notice)){if(!dirty){Object.assign(p,old);document.legacyBusy[p.id]=oldBusy;}}
      };
    }
    button('+ Pievienot produktu',details,async()=>{const p={id:crypto.randomUUID(),name:'Jauns nomas produkts',description:'',price:'',image:'',busy:[]};products.push(p);document.legacyBusy[p.id]=[];if(!await persist(document.bookings,notice)&&!dirty){products.pop();delete document.legacyBusy[p.id];}});
  }
  async function persist(bookings,notice,retry=false){
    if(working)return false;working=true;container.querySelectorAll('button,input,select').forEach(n=>{n.disabled=true;});notice.textContent='Saglabā…';
    try{
      // Never overwrite a newer public availability snapshot with stale state.
      const latest=await read(repo,'data/noma.json',branch);if(latest.sha!==publicSha)throw Error('Publiskie nomas dati mainīti citā sesijā. Pārlādē nomas sadaļu.');
      if(!retry){
        const next={version:1,publicSha,products:products.map(p=>({id:p.id,name:p.name,description:p.description || '',price:p.price || '',image:p.image || ''})),legacyBusy:document.legacyBusy,bookings:bookings.map(b=>({id:b.id,productId:b.productId,clientCode:b.clientCode,start:b.start,end:b.end,status:b.status}))};
        const saved=await write(privateRepo,'reservations.json',privateBranch,next,privateSha,'Nomas rezervācijas');privateSha=saved.content.sha;document=next;dirty=true;
      }
      const privateLatest=await read(privateRepo,'reservations.json',privateBranch);
      if(privateLatest.sha!==privateSha)throw Error('Privātās rezervācijas mainītas citā sesijā. Pārlādē nomas sadaļu.');
      const saved=await write(repo,'data/noma.json',branch,M.publicProducts(products,document.bookings,document.legacyBusy),publicSha,'Panelis: produktu pieejamība');publicSha=saved.content.sha;dirty=false;editing=null;working=false;render();return true;
    }catch(e){working=false;if(dirty){render();container.querySelector('[role="status"]').textContent=`${e.message} Rezervācijas saglabātas privāti; publiskā pieejamība nav atjaunota. Atkārto sinhronizāciju pirms sadaļas aizvēršanas.`;}else{container.querySelectorAll('button,input,select').forEach(n=>{n.disabled=false;});notice.textContent=e.message;}return false;
    }finally{working=false;}
  }
};

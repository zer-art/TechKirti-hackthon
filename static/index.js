(function(){
  const STORAGE_KEY = 'foodItems_v1';
  const ALERTED_KEY = 'foodAlerts_v1';
  const form = document.getElementById('addForm');
  const nameInput = document.getElementById('name');
  const dateInput = document.getElementById('purchaseDate');
  const shelfInput = document.getElementById('shelfLife');
  const itemsContainer = document.getElementById('itemsContainer');
  const clearAllBtn = document.getElementById('clearAll');

  // set default date to today
  dateInput.value = new Date().toISOString().slice(0,10);

  function loadItems(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }catch(e){
      return [];
    }
  }
  function saveItems(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

  function loadAlerted(){
    try { return JSON.parse(localStorage.getItem(ALERTED_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveAlerted(list){ localStorage.setItem(ALERTED_KEY, JSON.stringify(list)); }

  function addDays(date, days){
    const d = new Date(date);
    d.setDate(d.getDate() + Number(days));
    return d;
  }
  function formatDate(d){
    const dt = new Date(d);
    return dt.toISOString().slice(0,10);
  }
  function daysBetween(a, b){
    const msPerDay = 1000*60*60*24;
    return Math.floor((new Date(a).setHours(0,0,0,0) - new Date(b).setHours(0,0,0,0)) / msPerDay);
  }
  function computeStatus(daysLeft){
    if(daysLeft < 0) return {key:'expired', label:'Expired'};
    if(daysLeft <= 3) return {key:'soon', label:'Use Soon'};
    return {key:'fresh', label:'Fresh'};
  }

  function render(){
    const items = loadItems();
    itemsContainer.innerHTML = '';
    if(items.length === 0){
      itemsContainer.innerHTML = '<div class="meta">No items tracked yet.</div>';
      return;
    }
    items.forEach(it => {
      const expiry = addDays(it.purchaseDate, it.shelfLife);
      const daysLeft = daysBetween(expiry, new Date());
      const status = computeStatus(daysLeft);

      const el = document.createElement('div');
      el.className = 'item';
      el.innerHTML = `
        <div class="col">
          <div><strong>${escapeHtml(it.name)}</strong></div>
          <div class="meta">Purchased: ${formatDate(it.purchaseDate)}</div>
        </div>
        <div class="col meta">Shelf life: ${it.shelfLife} days</div>
        <div class="col meta">Expiry: ${formatDate(expiry)}</div>
        <div class="col"><span class="status ${status.key}">${status.label}</span>
          <span class="meta"> &nbsp;(${daysLeft >= 0 ? daysLeft + ' day(s) left' : Math.abs(daysLeft)+' day(s) ago'})</span>
        </div>
        <div>
          <button class="small-btn" data-id="${it.id}" aria-label="delete">Delete</button>
        </div>
      `;
      itemsContainer.appendChild(el);
    });

    // attach delete handlers
    itemsContainer.querySelectorAll('.small-btn[data-id]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = btn.getAttribute('data-id');
        const remaining = loadItems().filter(i => i.id !== id);
        saveItems(remaining);
        render();
      });
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = nameInput.value.trim();
    const purchaseDate = dateInput.value;
    const shelfLife = Number(shelfInput.value);
    if(!name || !purchaseDate || isNaN(shelfLife)) return;

    const items = loadItems();
    const item = {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2,7),
      name, purchaseDate, shelfLife
    };
    items.push(item);
    saveItems(items);
    form.reset();
    dateInput.value = new Date().toISOString().slice(0,10);
    render();
    checkAlerts();
  });

  clearAllBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all tracked items?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ALERTED_KEY);
    render();
  });

  // Alerts: request permission and notify for "Use Soon" items once
  function requestNotificationPermission(){
    if(!('Notification' in window)) return;
    if(Notification.permission === 'default') Notification.requestPermission().catch(()=>{});
  }

  function notify(title, body){
    if(!('Notification' in window)) return;
    if(Notification.permission === 'granted'){
      new Notification(title, {body});
    }else{
      // fallback: small in-page alert banner (console fallback)
      console.log('NOTIFY:', title, body);
    }
  }

  function checkAlerts(){
    const items = loadItems();
    const alerted = loadAlerted();
    const now = new Date();
    items.forEach(it=>{
      const expiry = addDays(it.purchaseDate, it.shelfLife);
      const daysLeft = daysBetween(expiry, now);
      if(daysLeft <= 3 && daysLeft >= 0){
        // send one alert per item (if not already alerted)
        if(!alerted.includes(it.id)){
          notify('Expiring soon: ' + it.name, `Expires on ${formatDate(expiry)} (${daysLeft} day(s) left)`);
          alerted.push(it.id);
        }
      }
      if(daysLeft < 0){
        // expired items can also be notified once
        if(!alerted.includes(it.id + '_expired')){
          notify('Expired: ' + it.name, `Expired on ${formatDate(expiry)}`);
          alerted.push(it.id + '_expired');
        }
      }
    });
    saveAlerted(alerted);
  }

  // initial boot
  requestNotificationPermission();
  render();
  // check alerts now and then (hourly)
  checkAlerts();
  setInterval(checkAlerts, 1000 * 60 * 60);

})();
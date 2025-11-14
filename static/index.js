// Switch to using FastAPI backend for storage and status computation.
(function(){
  const API_BASE = '/api';
  const ALERTED_KEY = 'foodAlerts_v1';
  const form = document.getElementById('addForm');
  const nameInput = document.getElementById('name');
  const dateInput = document.getElementById('purchaseDate');
  const shelfInput = document.getElementById('shelfLife');
  const itemsContainer = document.getElementById('itemsContainer');
  const clearAllBtn = document.getElementById('clearAll');

  // set default date to today
  dateInput.value = new Date().toISOString().slice(0,10);

  async function getItems(){
    const res = await fetch(API_BASE + '/items');
    if(!res.ok) return [];
    return res.json();
  }

  async function addItem(item){
    const res = await fetch(API_BASE + '/items', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(item)
    });
    return res.ok ? res.json() : null;
  }

  async function deleteItem(id){
    const res = await fetch(API_BASE + '/items/' + encodeURIComponent(id), {method:'DELETE'});
    return res.ok;
  }

  async function clearAll(){
    const res = await fetch(API_BASE + '/items', {method:'DELETE'});
    return res.ok;
  }

  function loadAlerted(){
    try { return JSON.parse(localStorage.getItem(ALERTED_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveAlerted(list){ localStorage.setItem(ALERTED_KEY, JSON.stringify(list)); }

  function escapeHtml(s){
    return String(s).replace(/[&<>\"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  async function render(){
    const items = await getItems();
    itemsContainer.innerHTML = '';
    if(!items || items.length === 0){
      itemsContainer.innerHTML = '<div class="meta">No items tracked yet.</div>';
      return;
    }
    items.forEach(it => {
      const expiry = it.expiry; // server-provided YYYY-MM-DD
      const daysLeft = it.daysLeft;
      const statusKey = it.status;
      const statusLabel = it.statusLabel || (statusKey === 'soon' ? 'Use Soon' : (statusKey === 'expired' ? 'Expired' : 'Fresh'));

      const el = document.createElement('div');
      el.className = 'item';
      el.innerHTML = `
        <div class="col">
          <div><strong>${escapeHtml(it.name)}</strong></div>
          <div class="meta">Purchased: ${escapeHtml(it.purchaseDate)}</div>
        </div>
        <div class="col meta">Shelf life: ${escapeHtml(String(it.shelfLife))} days</div>
        <div class="col meta">Expiry: ${escapeHtml(expiry)}</div>
        <div class="col"><span class="status ${statusKey}">${escapeHtml(statusLabel)}</span>
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
      btn.addEventListener('click', async (e)=>{
        const id = btn.getAttribute('data-id');
        await deleteItem(id);
        await render();
      });
    });
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = nameInput.value.trim();
    const purchaseDate = dateInput.value;
    const shelfLife = Number(shelfInput.value);
    if(!name || !purchaseDate || isNaN(shelfLife)) return;

    await addItem({name, purchaseDate, shelfLife});
    form.reset();
    dateInput.value = new Date().toISOString().slice(0,10);
    await render();
    checkAlerts();
  });

  clearAllBtn.addEventListener('click', async ()=>{
    if(!confirm('Clear all tracked items?')) return;
    await clearAll();
    localStorage.removeItem(ALERTED_KEY);
    await render();
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

  async function checkAlerts(){
    const items = await getItems();
    const alerted = loadAlerted();
    const now = new Date();
    items.forEach(it=>{
      const daysLeft = it.daysLeft;
      if(it.status === 'soon'){
        if(!alerted.includes(it.id)){
          notify('Expiring soon: ' + it.name, `Expires on ${it.expiry} (${daysLeft} day(s) left)`);
          alerted.push(it.id);
        }
      }
      if(it.status === 'expired'){
        if(!alerted.includes(it.id + '_expired')){
          notify('Expired: ' + it.name, `Expired on ${it.expiry}`);
          alerted.push(it.id + '_expired');
        }
      }
    });
    saveAlerted(alerted);
  }

  // initial boot
  requestNotificationPermission();
  render();
  checkAlerts();
  setInterval(checkAlerts, 1000 * 60 * 60);

})();
/* ============================================================
   CALIBRE — Nutrition OS Engine
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- STATE MANAGEMENT ---
  const DEFAULT_PROFILE = {
    name: 'Alex',
    age: 28,
    gender: 'female',
    height: 168,
    weight: 64,
    activity: 1.55,
    goal: 'maintain',
    targetCalories: 2000,
    targetCarbs: 225,
    targetProtein: 125,
    targetFat: 67,
    onboarded: false
  };

  const DEFAULT_DATABASE = [
    { id: 'db-1', name: 'Oatmeal with Berries', type: 'food', serving: '1 bowl (250g)', calories: 320, carbs: 54, protein: 12, fat: 5 },
    { id: 'db-2', name: 'Grilled Chicken Breast', type: 'food', serving: '150g', calories: 247, carbs: 0, protein: 46, fat: 5 },
    { id: 'db-3', name: 'Brown Rice (Cooked)', type: 'food', serving: '1 cup (195g)', calories: 218, carbs: 45, protein: 5, fat: 2 },
    { id: 'db-4', name: 'Avocado Toast', type: 'food', serving: '1 slice', calories: 290, carbs: 28, protein: 6, fat: 18 },
    { id: 'db-5', name: 'Whey Protein Shake', type: 'drink', serving: '1 scoop + water', calories: 120, carbs: 3, protein: 24, fat: 2 },
    { id: 'db-6', name: 'Iced Oat Milk Latte', type: 'drink', serving: '350ml', calories: 140, carbs: 18, protein: 3, fat: 6 },
    { id: 'db-7', name: 'Green Smoothie', type: 'drink', serving: '400ml', calories: 180, carbs: 38, protein: 4, fat: 1 },
    { id: 'db-8', name: 'Black Coffee', type: 'drink', serving: '250ml', calories: 5, carbs: 0, protein: 0, fat: 0 },
    { id: 'db-9', name: 'Salmon Fillet', type: 'food', serving: '180g', calories: 367, carbs: 0, protein: 34, fat: 25 },
    { id: 'db-10', name: 'Greek Yogurt (0%)', type: 'food', serving: '200g', calories: 118, carbs: 8, protein: 20, fat: 0 }
  ];

  let state = {
    profile: JSON.parse(localStorage.getItem('calibre_profile')) || DEFAULT_PROFILE,
    database: JSON.parse(localStorage.getItem('calibre_db')) || DEFAULT_DATABASE,
    logs: JSON.parse(localStorage.getItem('calibre_logs')) || {}, // Keyed by YYYY-MM-DD
    selectedDate: getTodayString(),
    currentView: 'onboarding',
    obStep: 0,
    searchTargetMeal: 'snacks',
    activeFilter: 'all',
    searchQuery: ''
  };

  // --- HELPERS ---
  function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  function saveState() {
    localStorage.setItem('calibre_profile', JSON.stringify(state.profile));
    localStorage.setItem('calibre_db', JSON.stringify(state.database));
    localStorage.setItem('calibre_logs', JSON.stringify(state.logs));
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // --- BMR & CALORIE CALCULATOR (Mifflin-St Jeor) ---
  function calculateTargets(age, gender, height, weight, activity, goal) {
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr = (gender === 'male') ? bmr + 5 : bmr - 161;
    
    let tdee = bmr * parseFloat(activity);
    
    if (goal === 'lose') tdee -= 400;
    if (goal === 'gain') tdee += 300;

    const calories = Math.round(tdee);
    const carbs = Math.round((calories * 0.45) / 4);
    const protein = Math.round((calories * 0.25) / 4);
    const fat = Math.round((calories * 0.30) / 9);

    return { calories, carbs, protein, fat };
  }

  // --- NAVIGATION & VIEWS ---
  function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.remove('hidden');

    const bottomNav = document.getElementById('bottom-nav');
    if (viewName === 'onboarding') {
      bottomNav.classList.add('hidden');
    } else {
      bottomNav.classList.remove('hidden');
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === viewName);
      });
    }

    state.currentView = viewName;
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'search') renderSearch();
    if (viewName === 'profile') syncProfileInputs();
  }

  // --- ONBOARDING LOGIC ---
  function initOnboarding() {
    if (state.profile.onboarded) {
      switchView('dashboard');
      return;
    }
    renderObStep(0);
  }

  function renderObStep(step) {
    state.obStep = step;
    document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
    const stepEl = document.querySelector(`.ob-step[data-step="${step}"]`);
    if (stepEl) stepEl.classList.add('active');

    const progress = document.getElementById('onboarding-progress-fill');
    progress.style.width = `${((step + 1) / 5) * 100}%`;
  }

  // Step 0 -> Step 1
  document.getElementById('btn-step0-next').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    if (name) state.profile.name = name;
    renderObStep(1);
  });

  // Step 1 -> Step 2
  document.getElementById('btn-step1-next').addEventListener('click', () => {
    const age = parseInt(document.getElementById('input-age').value) || 28;
    const height = parseFloat(document.getElementById('input-height').value) || 168;
    const weight = parseFloat(document.getElementById('input-weight').value) || 64;

    state.profile.age = age;
    state.profile.height = height;
    state.profile.weight = weight;
    renderObStep(2);
  });

  // Step 2 -> Step 3
  document.getElementById('btn-step2-next').addEventListener('click', () => renderObStep(3));

  // Step 3 -> Step 4 (Calculate)
  document.getElementById('btn-step3-next').addEventListener('click', () => {
    const targets = calculateTargets(
      state.profile.age,
      state.profile.gender,
      state.profile.height,
      state.profile.weight,
      state.profile.activity,
      state.profile.goal
    );

    state.profile.targetCalories = targets.calories;
    state.profile.targetCarbs = targets.carbs;
    state.profile.targetProtein = targets.protein;
    state.profile.targetFat = targets.fat;

    document.getElementById('target-calories').value = targets.calories;
    document.getElementById('target-carbs').value = targets.carbs;
    document.getElementById('target-protein').value = targets.protein;
    document.getElementById('target-fat').value = targets.fat;

    renderObStep(4);
  });

  // Finish Onboarding
  document.getElementById('btn-finish-onboarding').addEventListener('click', () => {
    state.profile.targetCalories = parseInt(document.getElementById('target-calories').value) || 2000;
    state.profile.targetCarbs = parseInt(document.getElementById('target-carbs').value) || 225;
    state.profile.targetProtein = parseInt(document.getElementById('target-protein').value) || 125;
    state.profile.targetFat = parseInt(document.getElementById('target-fat').value) || 67;
    state.profile.onboarded = true;

    saveState();
    switchView('dashboard');
    showToast('Calibre calibrated successfully!');
  });

  // Segmented Buttons (Gender)
  document.querySelectorAll('#segmented-gender .segmented-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#segmented-gender .segmented-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.profile.gender = btn.dataset.value;
    });
  });

  // Cards (Activity & Goal)
  function setupChoiceList(containerId, stateKey) {
    document.querySelectorAll(`#${containerId} .choice-card`).forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll(`#${containerId} .choice-card`).forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.profile[stateKey] = card.dataset.value;
      });
    });
  }
  setupChoiceList('choice-activity', 'activity');
  setupChoiceList('choice-goal', 'goal');

  // Back Buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => renderObStep(parseInt(btn.dataset.back)));
  });

  // --- DASHBOARD RENDER & LOGIC ---
  function renderDashboard() {
    document.getElementById('greeting-text').textContent = `Hello, ${state.profile.name || 'User'}`;
    renderDateStrip();
    renderRingAndTotals();
    renderMealSections();
  }

  function renderDateStrip() {
    const strip = document.getElementById('date-strip');
    strip.innerHTML = '';

    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dow = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();

      const chip = document.createElement('button');
      chip.className = `date-chip ${dateStr === state.selectedDate ? 'active' : ''} ${state.logs[dateStr]?.length ? 'has-log' : ''}`;
      chip.innerHTML = `<span class="dc-dow">${dow}</span><span class="dc-num">${dayNum}</span>`;
      chip.addEventListener('click', () => {
        state.selectedDate = dateStr;
        renderDashboard();
      });
      strip.appendChild(chip);
    }
  }

  function renderRingAndTotals() {
    const dayLogs = state.logs[state.selectedDate] || [];
    const eaten = dayLogs.reduce((acc, item) => {
      acc.calories += item.calories;
      acc.carbs += item.carbs;
      acc.protein += item.protein;
      acc.fat += item.fat;
      return acc;
    }, { calories: 0, carbs: 0, protein: 0, fat: 0 });

    const targetCal = state.profile.targetCalories;
    const remaining = targetCal - eaten.calories;
    const isOver = remaining < 0;

    // Elements
    const ringCard = document.getElementById('ring-card');
    const ringProgress = document.getElementById('ring-progress');
    const alertCard = document.getElementById('alert-over-budget');

    ringCard.classList.toggle('over-budget', isOver);
    alertCard.classList.toggle('hidden', !isOver);

    if (isOver) {
      document.getElementById('alert-sub-text').textContent = `You are ${Math.abs(remaining)} kcal over today's target.`;
      document.getElementById('ring-status').textContent = 'Over Target';
    } else {
      document.getElementById('ring-status').textContent = 'On Track';
    }

    document.getElementById('ring-remaining').textContent = Math.abs(remaining);
    document.getElementById('stat-goal').textContent = targetCal;
    document.getElementById('stat-eaten').textContent = eaten.calories;
    document.getElementById('stat-left').textContent = Math.max(0, remaining);

    // SVG Ring Calculation
    const circumference = 2 * Math.PI * 88; // r=88 -> 552.9
    const pct = Math.min(1, eaten.calories / targetCal);
    const offset = circumference - (pct * circumference);
    ringProgress.style.strokeDashoffset = offset;

    // Macro Bars
    function updateMacroBar(type, current, target) {
      document.getElementById(`macro-${type}-figures`).textContent = `${current} / ${target}g`;
      const fill = document.getElementById(`macro-${type}-fill`);
      const macroPct = Math.min(100, (current / target) * 100);
      fill.style.width = `${macroPct}%`;
      fill.classList.toggle('over', current > target);
    }

    updateMacroBar('carbs', eaten.carbs, state.profile.targetCarbs);
    updateMacroBar('protein', eaten.protein, state.profile.targetProtein);
    updateMacroBar('fat', eaten.fat, state.profile.targetFat);
  }

  function renderMealSections() {
    const mealsList = document.getElementById('meals-list');
    mealsList.innerHTML = '';

    const categories = [
      { id: 'breakfast', label: 'Breakfast', icon: `<path d="M12 2v8m0 0l-3-3m3 3l3-3M4 14h16M4 18h16"></path>` },
      { id: 'lunch', label: 'Lunch', icon: `<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path>` },
      { id: 'dinner', label: 'Dinner', icon: `<path d="M12 3a9 9 0 0 0 0 18 9 9 0 0 0 0-18z"></path>` },
      { id: 'snacks', label: 'Snacks', icon: `<rect x="3" y="3" width="18" height="18" rx="4"></rect>` },
      { id: 'beverages', label: 'Beverages', icon: `<path d="M6 2h12v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V2z"></path><path d="M6 13v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"></path>` }
    ];

    const dayLogs = state.logs[state.selectedDate] || [];

    categories.forEach(cat => {
      const items = dayLogs.filter(i => i.meal === cat.id);
      const catCal = items.reduce((sum, i) => sum + i.calories, 0);

      const sec = document.createElement('div');
      sec.className = 'meal-section';
      sec.innerHTML = `
        <div class="meal-header" data-meal-toggle="${cat.id}">
          <div class="meal-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${cat.icon}</svg></div>
          <div class="meal-header-text">
            <div class="meal-name">${cat.label}</div>
            <div class="meal-kcal">${catCal} kcal</div>
          </div>
          <button class="meal-add-btn" data-add-meal="${cat.id}" aria-label="Add item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <svg class="meal-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="meal-entries" id="entries-${cat.id}">
          ${items.length === 0 ? `<div class="meal-empty">No items logged yet</div>` : ''}
        </div>
      `;

      const entriesWrap = sec.querySelector(`#entries-${cat.id}`);
      items.forEach(item => {
        const entry = document.createElement('div');
        entry.className = 'meal-entry';
        entry.innerHTML = `
          <div class="entry-info">
            <div class="entry-name">${item.name}</div>
            <div class="entry-macros">C: ${item.carbs}g • P: ${item.protein}g • F: ${item.fat}g</div>
          </div>
          <div class="entry-kcal">${item.calories} kcal</div>
          <button class="entry-delete" data-log-id="${item.logId}" aria-label="Remove entry">✕</button>
        `;

        entry.querySelector('.entry-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteLogItem(item.logId);
        });

        entriesWrap.appendChild(entry);
      });

      // Accordion toggle
      sec.querySelector('.meal-header').addEventListener('click', (e) => {
        if (!e.target.closest('.meal-add-btn')) {
          sec.classList.toggle('collapsed');
        }
      });

      // Quick add button
      sec.querySelector('[data-add-meal]').addEventListener('click', (e) => {
        e.stopPropagation();
        state.searchTargetMeal = cat.id;
        switchView('search');
      });

      mealsList.appendChild(sec);
    });
  }

  function deleteLogItem(logId) {
    if (!state.logs[state.selectedDate]) return;
    state.logs[state.selectedDate] = state.logs[state.selectedDate].filter(i => i.logId !== logId);
    saveState();
    renderDashboard();
    showToast('Item removed');
  }

  function addFoodToLog(item) {
    if (!state.logs[state.selectedDate]) state.logs[state.selectedDate] = [];
    const logEntry = {
      ...item,
      logId: 'log-' + Date.now(),
      meal: state.searchTargetMeal
    };
    state.logs[state.selectedDate].push(logEntry);
    saveState();
    showToast(`Added to ${state.searchTargetMeal}`);
  }

  // --- SEARCH & DATABASE LOGIC ---
  function renderSearch() {
    document.getElementById('search-context-label').textContent = state.searchTargetMeal.toUpperCase();
    
    // Update active meal pill
    document.querySelectorAll('#mtp-options .mtp-opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.meal === state.searchTargetMeal);
    });

    const dbList = document.getElementById('db-list');
    dbList.innerHTML = '';

    const query = state.searchQuery.toLowerCase();
    const filtered = state.database.filter(item => {
      const matchesQuery = item.name.toLowerCase().includes(query);
      if (!matchesQuery) return false;

      if (state.activeFilter === 'food') return item.type === 'food';
      if (state.activeFilter === 'drink') return item.type === 'drink';
      if (state.activeFilter === 'custom') return item.isCustom === true;
      return true;
    });

    if (filtered.length === 0) {
      dbList.innerHTML = `<div class="db-empty">No items found. Create a custom item!</div>`;
      return;
    }

    filtered.forEach(item => {
      const el = document.createElement('div');
      el.className = 'db-item';
      el.innerHTML = `
        <div class="db-item-icon ${item.type}">
          ${item.type === 'drink' ? 
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V2z"></path><path d="M6 13v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"></path></svg>` : 
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v8m0 0l-3-3m3 3l3-3M4 14h16M4 18h16"></path></svg>`
          }
        </div>
        <div class="db-item-info">
          <div class="db-item-name">${item.name}</div>
          <div class="db-item-meta">${item.serving} • ${item.calories} kcal (C:${item.carbs} P:${item.protein} F:${item.fat})</div>
        </div>
        <div class="db-item-actions">
          <button class="db-item-del" aria-label="Delete from DB">✕</button>
          <button class="db-item-add" aria-label="Add item">+</button>
        </div>
      `;

      el.querySelector('.db-item-add').addEventListener('click', () => addFoodToLog(item));
      el.querySelector('.db-item-del').addEventListener('click', () => deleteDbItem(item.id));

      dbList.appendChild(el);
    });
  }

  function deleteDbItem(id) {
    state.database = state.database.filter(i => i.id !== id);
    saveState();
    renderSearch();
    showToast('Item deleted from database');
  }

  // Search Listeners
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderSearch();
  });

  document.querySelectorAll('#filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#filter-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      renderSearch();
    });
  });

  document.querySelectorAll('#mtp-options .mtp-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      state.searchTargetMeal = opt.dataset.meal;
      renderSearch();
    });
  });

  document.getElementById('btn-search-back').addEventListener('click', () => switchView('dashboard'));

  // --- CUSTOM ITEM MODAL ---
  const modal = document.getElementById('modal-custom-item');
  document.getElementById('btn-open-custom-modal').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.add('hidden'));

  let customType = 'food';
  document.querySelectorAll('#custom-type-segmented .segmented-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#custom-type-segmented .segmented-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customType = btn.dataset.value;
    });
  });

  document.getElementById('btn-save-custom-item').addEventListener('click', () => {
    const name = document.getElementById('custom-name').value.trim();
    const serving = document.getElementById('custom-serving').value.trim() || '1 serving';
    const calories = parseInt(document.getElementById('custom-calories').value) || 0;
    const carbs = parseInt(document.getElementById('custom-carbs').value) || 0;
    const protein = parseInt(document.getElementById('custom-protein').value) || 0;
    const fat = parseInt(document.getElementById('custom-fat').value) || 0;

    if (!name) {
      showToast('Please enter a name');
      return;
    }

    const newItem = {
      id: 'custom-' + Date.now(),
      name,
      type: customType,
      serving,
      calories,
      carbs,
      protein,
      fat,
      isCustom: true
    };

    state.database.unshift(newItem);
    saveState();
    modal.classList.add('hidden');
    renderSearch();
    showToast('Custom item saved');

    // Reset Form
    document.getElementById('custom-name').value = '';
    document.getElementById('custom-serving').value = '';
    document.getElementById('custom-calories').value = '';
    document.getElementById('custom-carbs').value = '';
    document.getElementById('custom-protein').value = '';
    document.getElementById('custom-fat').value = '';
  });

  // --- PROFILE VIEW LOGIC ---
  function syncProfileInputs() {
    const p = state.profile;
    document.getElementById('profile-name').value = p.name || '';
    document.getElementById('profile-age').value = p.age || 28;
    document.getElementById('profile-height').value = p.height || 168;
    document.getElementById('profile-weight').value = p.weight || 64;
    document.getElementById('profile-activity').value = p.activity || 1.55;
    document.getElementById('profile-goal').value = p.goal || 'maintain';

    document.querySelectorAll('#profile-segmented-gender .segmented-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === p.gender);
    });

    document.getElementById('profile-target-calories').value = p.targetCalories;
    document.getElementById('profile-target-carbs').value = p.targetCarbs;
    document.getElementById('profile-target-protein').value = p.targetProtein;
    document.getElementById('profile-target-fat').value = p.targetFat;
  }

  document.querySelectorAll('#profile-segmented-gender .segmented-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#profile-segmented-gender .segmented-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.profile.gender = btn.dataset.value;
    });
  });

  document.getElementById('btn-recalculate').addEventListener('click', () => {
    const age = parseInt(document.getElementById('profile-age').value) || 28;
    const height = parseFloat(document.getElementById('profile-height').value) || 168;
    const weight = parseFloat(document.getElementById('profile-weight').value) || 64;
    const activity = document.getElementById('profile-activity').value;
    const goal = document.getElementById('profile-goal').value;

    const targets = calculateTargets(age, state.profile.gender, height, weight, activity, goal);
    document.getElementById('profile-target-calories').value = targets.calories;
    document.getElementById('profile-target-carbs').value = targets.carbs;
    document.getElementById('profile-target-protein').value = targets.protein;
    document.getElementById('profile-target-fat').value = targets.fat;
    showToast('Targets recalculated');
  });

  document.getElementById('btn-save-profile').addEventListener('click', () => {
    state.profile.name = document.getElementById('profile-name').value.trim() || 'Alex';
    state.profile.age = parseInt(document.getElementById('profile-age').value) || 28;
    state.profile.height = parseFloat(document.getElementById('profile-height').value) || 168;
    state.profile.weight = parseFloat(document.getElementById('profile-weight').value) || 64;
    state.profile.activity = document.getElementById('profile-activity').value;
    state.profile.goal = document.getElementById('profile-goal').value;

    state.profile.targetCalories = parseInt(document.getElementById('profile-target-calories').value) || 2000;
    state.profile.targetCarbs = parseInt(document.getElementById('profile-target-carbs').value) || 225;
    state.profile.targetProtein = parseInt(document.getElementById('profile-target-protein').value) || 125;
    state.profile.targetFat = parseInt(document.getElementById('profile-target-fat').value) || 67;

    saveState();
    showToast('Profile updated');
    switchView('dashboard');
  });

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all app data?')) {
      localStorage.clear();
      location.reload();
    }
  });

  document.getElementById('btn-profile-back').addEventListener('click', () => switchView('dashboard'));
  document.getElementById('btn-open-profile').addEventListener('click', () => switchView('profile'));

  // Bottom Nav Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.nav));
  });

  // --- INITIALIZATION ---
  initOnboarding();
});
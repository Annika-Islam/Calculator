/* Modern Calculator - Logic */
(function () {
  'use strict';

  const state = {
    current: '0',
    previous: '',
    operation: null,
    shouldResetCurrent: false,
    error: false,
    history: [],
    lastOperation: null,
    lastOperand: null,
  };

  const resultEl = document.getElementById('result');
  const expressionEl = document.getElementById('expression');
  const historyEl = document.getElementById('history');
  const statusEl = document.getElementById('status');
  const keysEl = document.querySelector('.keys');
  const extraEl = document.querySelector('.extra');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  const MAX_LEN = 16;

  function isOperator(op) { return ['+', '-', '*', '/'].includes(op); }

  function formatNumber(value) {
    if (value === '' || value === null || value === undefined) return '';
    if (value === 'Error') return 'Error';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (!isFinite(num)) return 'Error';
    let str = String(num);
    if (Math.abs(num) >= 1e15 || (Math.abs(num) > 0 && Math.abs(num) < 1e-9)) {
      str = num.toExponential(6);
    } else {
      str = parseFloat(num.toPrecision(12)).toString();
    }
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function popAnimation() {
    resultEl.classList.remove('pop');
    void resultEl.offsetWidth;
    resultEl.classList.add('pop');
  }

  function rippleEffect(btn, e) {
    const rect = btn.getBoundingClientRect();
    const circle = document.createElement('span');
    circle.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    const x = (e && e.clientX ? e.clientX : rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (e && e.clientY ? e.clientY : rect.top + rect.height / 2) - rect.top - size / 2;
    circle.style.width = circle.style.height = size + 'px';
    circle.style.left = x + 'px';
    circle.style.top = y + 'px';
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 520);
  }

  function clearAll() {
    state.current = '0';
    state.previous = '';
    state.operation = null;
    state.shouldResetCurrent = false;
    state.error = false;
    state.history = [];
    state.lastOperation = null;
    state.lastOperand = null;
    updateDisplay();
    clearStatus();
    setActiveOperator(null);
  }

  function clearEntry() {
    state.current = '0';
    state.shouldResetCurrent = false;
    state.error = false;
    updateDisplay();
    clearStatus();
  }

  function backspace() {
    if (state.error) { clearEntry(); return; }
    if (state.shouldResetCurrent) return;
    if (state.current.length <= 1) {
      state.current = '0';
    } else {
      state.current = state.current.slice(0, -1);
      if (state.current === '-' || state.current === '') state.current = '0';
    }
    updateDisplay();
  }

  function appendNumber(digit) {
    if (state.error) clearEntry();
    if (state.shouldResetCurrent) {
      state.current = digit;
      state.shouldResetCurrent = false;
    } else {
      if (state.current === '0' && digit !== '.') {
        state.current = digit;
      } else {
        if (state.current.replace(/[-.]/g, '').length >= MAX_LEN) return;
        state.current += digit;
      }
    }
    updateDisplay();
  }

  function appendDecimal() {
    if (state.error) clearEntry();
    if (state.shouldResetCurrent) {
      state.current = '0.';
      state.shouldResetCurrent = false;
      updateDisplay();
      return;
    }
    if (!state.current.includes('.')) {
      state.current += '.';
      updateDisplay();
    }
  }
  function chooseOperation(op) {
    if (state.error) clearEntry();
    if (state.operation && state.shouldResetCurrent) {
      state.operation = op;
      setActiveOperator(op);
      updateExpression();
      return;
    }
    if (state.previous !== '' && state.operation) {
      compute(true);
    }
    state.operation = op;
    state.previous = state.current;
    state.shouldResetCurrent = true;
    setActiveOperator(op);
    updateDisplay();
  }

  function compute(isChained) {
    if (state.operation === null || state.previous === '') return;
    const prev = parseFloat(state.previous);
    const curr = parseFloat(state.current);
    let result;
    switch (state.operation) {
      case '+': result = prev + curr; break;
      case '-': result = prev - curr; break;
      case '*': result = prev * curr; break;
      case '/':
        if (curr === 0) { setError('Division by zero'); return; }
        result = prev / curr; break;
      default: return;
    }
    const opSymbol = { '+': '+', '-': '\u2212', '*': '\u00D7', '/': '\u00F7' }[state.operation];
    const expr = formatNumber(state.previous) + ' ' + opSymbol + ' ' + formatNumber(state.current);
    state.history.unshift(expr + ' = ' + formatNumber(String(result)));
    if (state.history.length > 8) state.history.pop();

    state.current = String(result);
    if (!isChained) {
      state.lastOperation = state.operation;
      state.lastOperand = String(curr);
      state.previous = '';
      state.operation = null;
      state.shouldResetCurrent = true;
      setActiveOperator(null);
    } else {
      state.previous = String(result);
      state.shouldResetCurrent = true;
    }
    popAnimation();
    updateDisplay();
  }

  function equals() {
    if (state.error) return;
    if (state.operation !== null) {
      compute(false);
      return;
    }
    // Repeat last operation
    if (state.lastOperation && state.lastOperand !== null) {
      state.previous = state.current;
      state.operation = state.lastOperation;
      state.current = state.lastOperand;
      state.shouldResetCurrent = false;
      compute(false);
    }
  }

  function applyUnary(fn) {
    if (state.error) clearEntry();
    const num = parseFloat(state.current);
    let result;
    let label = '';
    switch (fn) {
      case 'sqrt':
        if (num < 0) { setError('Invalid input'); return; }
        result = Math.sqrt(num); label = '\u221A(' + formatNumber(state.current) + ')';
        break;
      case 'square':
        result = num * num; label = '(' + formatNumber(state.current) + ')\u00B2';
        break;
      case 'reciprocal':
        if (num === 0) { setError('Division by zero'); return; }
        result = 1 / num; label = '1/(' + formatNumber(state.current) + ')';
        break;
      case 'negate':
        if (state.current === '0') return;
        state.current = String(-num);
        updateDisplay();
        return;
      case 'pi':
        state.current = String(Math.PI);
        state.shouldResetCurrent = false;
        updateDisplay();
        return;
      case 'euler':
        state.current = String(Math.E);
        state.shouldResetCurrent = false;
        updateDisplay();
        return;
      default: return;
    }
    state.history.unshift(label + ' = ' + formatNumber(String(result)));
    if (state.history.length > 8) state.history.pop();
    state.current = String(result);
    state.shouldResetCurrent = true;
    popAnimation();
    updateDisplay();
  }

  function percent() {
    if (state.error) clearEntry();
    const num = parseFloat(state.current);
    let result;
    if (state.previous !== '' && state.operation) {
      result = (parseFloat(state.previous) * num) / 100;
    } else {
      result = num / 100;
    }
    state.current = String(result);
    state.shouldResetCurrent = true;
    updateDisplay();
  }

  function setError(msg) {
    state.error = true;
    state.current = 'Error';
    statusEl.textContent = msg;
    updateDisplay();
  }
  function clearStatus() { statusEl.textContent = ''; }

  function updateExpression() {
    if (state.operation && state.previous !== '') {
      const opSymbol = { '+': '+', '-': '\u2212', '*': '\u00D7', '/': '\u00F7' }[state.operation];
      expressionEl.textContent = formatNumber(state.previous) + ' ' + opSymbol;
    } else {
      expressionEl.textContent = '';
    }
  }

  function updateDisplay() {
    resultEl.textContent = formatNumber(state.current);
    updateExpression();
    historyEl.textContent = state.history.length ? state.history[0] : '';
  }

  function setActiveOperator(op) {
    document.querySelectorAll('.key--op').forEach((b) => {
      const v = b.getAttribute('data-value');
      b.classList.toggle('is-active', op !== null && v === op);
    });
  }

  function handleAction(action, value, btn, e) {
    if (btn && e) rippleEffect(btn, e);
    switch (action) {
      case 'number': appendNumber(value); break;
      case 'decimal': appendDecimal(); break;
      case 'operator': chooseOperation(value); break;
      case 'equals': equals(); break;
      case 'clear': clearAll(); break;
      case 'backspace': backspace(); break;
      case 'percent': percent(); break;
      case 'sqrt': applyUnary('sqrt'); break;
      case 'square': applyUnary('square'); break;
      case 'reciprocal': applyUnary('reciprocal'); break;
      case 'negate': applyUnary('negate'); break;
      case 'pi': applyUnary('pi'); break;
      case 'euler': applyUnary('euler'); break;
    }
  }

  keysEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    handleAction(btn.dataset.action, btn.dataset.value, btn, e);
  });

  if (extraEl) {
    extraEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      handleAction(btn.dataset.action, btn.dataset.value, btn, e);
    });
  }

  const keyMap = {
    '0':'number:0','1':'number:1','2':'number:2','3':'number:3','4':'number:4',
    '5':'number:5','6':'number:6','7':'number:7','8':'number:8','9':'number:9',
    '.':'decimal',
    '+':'operator:+','-':'operator:-','*':'operator:*','/':'operator:/',
    'Enter':'equals','=':'equals',
    'Backspace':'backspace','Delete':'backspace',
    'Escape':'clear','c':'clear','C':'clear',
    '%':'percent',
    'r':'sqrt','R':'sqrt',
    's':'square','S':'square',
    'i':'reciprocal','I':'reciprocal',
    'n':'negate','N':'negate',
    'p':'pi','P':'pi',
    'e':'euler','E':'euler',
  };

  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const action = keyMap[e.key];
    if (!action) return;
    e.preventDefault();
    const [type, val] = action.split(':');
    let btn = null;
    if (type === 'number') btn = document.querySelector('.key[data-value="' + val + '"]');
    else if (type === 'operator') btn = document.querySelector('.key[data-value="' + val + '"]');
    else if (type === 'equals') btn = document.querySelector('.key--equals');
    else if (type === 'clear') btn = document.querySelector('[data-action="clear"]');
    else if (type === 'backspace') btn = document.querySelector('[data-action="backspace"]');
    else if (type === 'decimal') btn = document.querySelector('[data-action="decimal"]');
    else if (type === 'percent') btn = document.querySelector('[data-action="percent"]');
    else btn = document.querySelector('[data-action="' + type + '"]');
    const mappedAction = (type === 'number') ? 'number' : (type === 'operator' ? 'operator' : (type === 'decimal' ? 'decimal' : type));
    handleAction(mappedAction, val, btn, null);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) themeIcon.textContent = theme === 'light' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    try { localStorage.setItem('calc-theme', theme); } catch (err) {}
  }
  if (themeToggle) themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
  let initialTheme = 'dark';
  try {
    const saved = localStorage.getItem('calc-theme');
    if (saved === 'light' || saved === 'dark') initialTheme = saved;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) initialTheme = 'light';
  } catch (err) {}
  applyTheme(initialTheme);

  clearAll();
})();

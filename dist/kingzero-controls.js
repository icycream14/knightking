/* 왕의기사 Zero 모바일 입력 패치
 * 사용: const controls = installKingZeroControls({ gameElement, onMove, actions });
 * 화면 어디에서든 첫 터치가 가변 이동 패드를 시작합니다.
 * 버튼, 대화창, 인벤토리, 지도의 인터랙티브 요소는 입력을 가로채지 않습니다.
 */
function installKingZeroControls({
  gameElement = document.querySelector('canvas') || document.body,
  onMove = () => {},
  actions = {},
  deadZone = 0.13,
  radius = 60,
  smoothing = 17,
  keyboard = false,
  enabled = () => true,
  interactiveSelector = 'button, a, input, select, textarea, [role="button"], [role="dialog"], [data-kk-ui], [data-kk-action]'
} = {}) {
  if (!gameElement) throw new Error('게임 화면 요소를 지정해 주세요.');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const aborter = new AbortController();
  const signal = aborter.signal;
  const css = document.createElement('style');
  css.textContent = `
    #kk-joystick {position:fixed;left:0;top:0;width:132px;height:132px;pointer-events:none;
      transform:translate(-50%,-50%);z-index:2147483000;opacity:0;transition:opacity .08s;
      contain:layout style paint;}
    #kk-joystick[data-active="true"]{opacity:1}
    #kk-joystick .outer{position:absolute;inset:0;border-radius:50%;
      border:2px solid rgba(255,255,255,.64);background:rgba(13,19,30,.25);
      box-shadow:0 3px 18px rgba(0,0,0,.22),inset 0 0 15px rgba(255,255,255,.08)}
    #kk-joystick .nub{position:absolute;left:50%;top:50%;width:52px;height:52px;
      margin:-26px 0 0 -26px;border-radius:50%;border:2px solid rgba(255,255,255,.75);
      background:radial-gradient(circle at 40% 32%,rgba(247,250,255,.69),rgba(91,139,180,.62));
      box-shadow:0 2px 9px rgba(0,0,0,.28)}
    [data-kk-action]{touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
    .kk-pressed{filter:brightness(1.17);transform:scale(.96)}
  `;
  document.head.appendChild(css);
  const overlay = document.createElement('div');
  overlay.id = 'kk-joystick'; overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="outer"></div><div class="nub"></div>';
  document.body.appendChild(overlay);
  const nub = overlay.querySelector('.nub');
  const state = { pointerId: null, originX: 0, originY: 0, rawX: 0, rawY: 0, x: 0, y: 0, lastTime: performance.now(), raf: 0, keys: new Set(), startedAt: 0 };
  const direction = () => ({ x: state.x, y: state.y });
  const activeUi = target => target instanceof Element && !!target.closest(interactiveSelector);
  const inGame = target => target instanceof Node && (gameElement === document.body || gameElement === document.documentElement || gameElement.contains(target) || target === gameElement);
  const setAxis = (clientX, clientY) => {
    const deltaX = clientX - state.originX, deltaY = clientY - state.originY;
    const length = Math.hypot(deltaX, deltaY);
    const strength = clamp(length / radius, 0, 1);
    const effective = strength <= deadZone ? 0 : (strength - deadZone) / (1 - deadZone);
    state.rawX = length > 0 ? (deltaX / length) * effective : 0;
    state.rawY = length > 0 ? (deltaY / length) * effective : 0;
    const visualScale = Math.min(radius, length);
    nub.style.transform = `translate(${length ? deltaX / length * visualScale : 0}px,${length ? deltaY / length * visualScale : 0}px)`;
  };
  const resetPointer = () => {
    state.pointerId = null;state.x=0;state.y=0;state.keys.clear();onMove(0,0,0);
    state.rawX = 0; state.rawY = 0;
    overlay.dataset.active = 'false';
    nub.style.transform = 'translate(0px,0px)';
  };
  const pointerDown = event => {
    if (!enabled() || event.pointerType === 'mouse' || !event.isPrimary || state.pointerId !== null || activeUi(event.target) || !inGame(event.target)) return;
    // 다중 터치에서는 첫 번째 손가락만 이동 조작으로 사용합니다.
    state.pointerId = event.pointerId;
    state.originX = event.clientX;
    state.originY = event.clientY;
    state.startedAt = performance.now();
    overlay.style.left = `${event.clientX}px`;
    overlay.style.top = `${event.clientY}px`;
    overlay.dataset.active = 'true';
    setAxis(event.clientX, event.clientY);
    if (event.cancelable) event.preventDefault();
  };
  const pointerMove = event => {
    if (event.pointerId !== state.pointerId) return;
    setAxis(event.clientX, event.clientY);
    if (event.cancelable) event.preventDefault();
  };
  const pointerEnd = event => { if (event.pointerId === state.pointerId) resetPointer(); };
  window.addEventListener('pointerdown', pointerDown, {capture:true,passive:false,signal});
  window.addEventListener('pointermove', pointerMove, {capture:true,passive:false,signal});
  window.addEventListener('pointerup', pointerEnd, {capture:true,signal});
  window.addEventListener('pointercancel', pointerEnd, {capture:true,signal});
  window.addEventListener('blur', () => { state.keys.clear(); resetPointer(); }, {signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) { state.keys.clear(); resetPointer(); } }, {signal});
  window.addEventListener('keydown', event => {
    if (keyboard && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(event.code) && !activeUi(event.target)) {
      state.keys.add(event.code);
      if (event.cancelable) event.preventDefault();
    }
  }, {signal});
  window.addEventListener('keyup', event => state.keys.delete(event.code), {signal});
  function tick(now) {
    if(!enabled()){resetPointer();}
    const dt = Math.min(Math.max((now - state.lastTime) / 1000, 0), 0.05);
    state.lastTime = now;
    const left = state.keys.has('KeyA') || state.keys.has('ArrowLeft') ? 1 : 0;
    const right = state.keys.has('KeyD') || state.keys.has('ArrowRight') ? 1 : 0;
    const up = state.keys.has('KeyW') || state.keys.has('ArrowUp') ? 1 : 0;
    const down = state.keys.has('KeyS') || state.keys.has('ArrowDown') ? 1 : 0;
    let tx = state.rawX + right - left;
    let ty = state.rawY + down - up;
    const length = Math.hypot(tx,ty);
    if(length > 1){tx /= length;ty /= length;}
    const blend = 1 - Math.exp(-smoothing * dt);
    state.x += (tx-state.x) * blend;
    state.y += (ty-state.y) * blend;
    if(Math.abs(state.x)<0.001) state.x=0;
    if(Math.abs(state.y)<0.001) state.y=0;
    onMove(state.x, state.y, dt);
    state.raf = requestAnimationFrame(tick);
  }
  state.raf = requestAnimationFrame(tick);
  const presses = new Map();
  const lastPointerAction = new Map();
  const getActionNode = target => target instanceof Element ? target.closest('[data-kk-action]') : null;
  const fire = (node,event) => {
    if (!node || node.matches(':disabled,[aria-disabled="true"]')) return;
    const name = node.dataset.kkAction;
    if (typeof actions[name] === 'function') {
      actions[name](event);
      node.dispatchEvent(new CustomEvent('kk:action', {bubbles:true, detail:{name}}));
    }
  };
  document.addEventListener('pointerdown', event => {
    const node = getActionNode(event.target);
    if (!node || !actions[node.dataset.kkAction]) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    presses.set(event.pointerId, {node, x:event.clientX,y:event.clientY});
    node.classList.add('kk-pressed');
  }, {signal});
  document.addEventListener('pointerup', event => {
    const press = presses.get(event.pointerId);
    if(!press) return;
    press.node.classList.remove('kk-pressed'); presses.delete(event.pointerId);
    const rect = press.node.getBoundingClientRect();
    const inside = event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom;
    if(inside && Math.hypot(event.clientX-press.x,event.clientY-press.y) < 25){
      fire(press.node,event);
      lastPointerAction.set(press.node, performance.now());
      if(event.cancelable) event.preventDefault();
    }
  }, {signal,passive:false});
  document.addEventListener('pointercancel', event => {
    const press=presses.get(event.pointerId);
    if(press) press.node.classList.remove('kk-pressed');
    presses.delete(event.pointerId);
  }, {signal});
  document.addEventListener('click', event => {
    const node=getActionNode(event.target);
    if(!node || !actions[node.dataset.kkAction]) return;
    if(performance.now()-(lastPointerAction.get(node)||-Infinity) < 500){event.preventDefault(); return;}
    fire(node,event);
  }, {signal});
  return { direction, stop:resetPointer, destroy(){aborter.abort();cancelAnimationFrame(state.raf);overlay.remove();css.remove();}, setAction(name,fn){actions[name]=fn;} };
}

class EventBus {
  constructor() { this._listeners = {}; }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return fn;
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    if (fn === undefined) { this._listeners[event] = []; return; }
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }

  emit(event, ...args) {
    const list = this._listeners[event];
    if (!list || list.length === 0) return;
    // iterate over a copy so handlers may safely add/remove listeners
    for (const fn of [...list]) fn(...args);
  }

  once(event, fn) {
    const wrapper = (...args) => { this.off(event, wrapper); fn(...args); };
    this.on(event, wrapper);
    return wrapper;
  }
}

export const Bus = new EventBus();

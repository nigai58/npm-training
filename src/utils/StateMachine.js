export class StateMachine {
  constructor(initialState, states, context) {
    this.current = initialState;
    this.states = states;
    this.context = context;
    this.timer = 0;
  }

  transition(newState) {
    if (this.current === newState) return;
    const prev = this.current;
    this.current = newState;
    this.timer = 0;
    if (this.states[prev]?.onExit) this.states[prev].onExit.call(this.context);
    if (this.states[newState]?.onEnter) this.states[newState].onEnter.call(this.context);
  }

  update(delta) {
    this.timer += delta;
    if (this.states[this.current]?.onUpdate) {
      this.states[this.current].onUpdate.call(this.context, delta, this.timer);
    }
  }

  is(state) { return this.current === state; }
}

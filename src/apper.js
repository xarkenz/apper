

class Apper {

  MESSAGE_DURATION = 10;

  #element;
  #canvas;
  #ctx;
  #title;
  #defaultTitle;
  #toolbar;
  #view;
  #cursorPos;
  #menus;
  #message;
  #messageTimeout;
  #altKey;
  #ctrlKey;
  #shiftKey;

  get element() { return this.#element; }
  get canvas() { return this.#canvas; }
  get ctx() { return this.#ctx; }
  get width() { return this.#element.clientWidth; }
  get height() { return this.#element.clientHeight; }
  get title() { return this.#title.value; }
  set title(text) { this.#title.value = text; this.#updateTitleWidth(); return this.#title.value; }
  get defaultTitle() { return this.#defaultTitle; }
  set defaultTitle(text) { if (!this.title) this.title = text; this.#updateTitleWidth(); return this.#defaultTitle = text; }
  get toolbar() { return this.#toolbar; }
  get tool() { return this.#toolbar.tool; }
  set tool(tool) { return this.#toolbar.tool = tool; }
  get view() { return this.#view; }
  get zoom() { return this.#view.zoom; }
  set zoom(z) { return this.#view.zoom = z; }
  get izoom() { return this.#view.izoom; }
  set izoom(z) { return this.#view.izoom = z; }
  get cursorPos() { return this.#cursorPos.copy(); }
  get scale() { return window.devicePixelRatio; }
  get altKey() { return this.#altKey; }
  get ctrlKey() { return this.#ctrlKey; }
  get shiftKey() { return this.#shiftKey; }

  constructor() {
    this.#element = document.createElement("div");
    this.#element.className = "apper";

    this.#canvas = document.createElement("canvas");
    this.#canvas.tabIndex = -1;  // Allows the canvas to have focus
    this.#canvas.width = 0;
    this.#canvas.height = 0;
    this.#element.appendChild(this.#canvas);

    this.#title = document.createElement("input");
    this.#title.className = "apper-title";
    this.#title.type = "text";
    this.#defaultTitle = "";
    this.#title.value = "";
    this.#title.spellcheck = false;
    this.#title.autocomplete = "off";
    this.#title.addEventListener("input", event => {
      this.#updateTitleWidth();
    }, {passive: true});
    this.#title.addEventListener("blur", event => {
      if (!this.title) this.title = this.defaultTitle;
      this.#updateTitleWidth();
    }, {passive: true});
    this.#title.addEventListener("keypress", event => {
      if (event.code.toLowerCase() === "enter") this.focusCanvas();
    }, {passive: true});
    this.#element.appendChild(this.#title);
    this.#updateTitleWidth();

    this.#message = null;
    this.#messageTimeout = null;
    this.#toolbar = null;
    this.#menus = [];
    this.#altKey = false;
    this.#ctrlKey = false;
    this.#shiftKey = false;
    this.#view = new Apper.Viewport();
    this.#cursorPos = new Apper.Vector2();

    this.#ctx = this.#canvas.getContext("2d");

    window.addEventListener("resize", this.#rawWindowResize.bind(this), {passive: true});
    this.#canvas.addEventListener("mousedown", this.#rawMouseDown.bind(this), {capture: true, passive: false});
    document.addEventListener("mousemove", this.#rawMouseMove.bind(this), {passive: true});
    document.addEventListener("mouseup", this.#rawMouseUp.bind(this), {capture: true, passive: true});
    this.#canvas.addEventListener("touchstart", this.#rawMouseDown.bind(this), {passive: false});
    document.addEventListener("touchmove", this.#rawMouseMove.bind(this), {passive: true});
    document.addEventListener("touchend", this.#rawMouseUp.bind(this), {passive: true});
    this.#canvas.addEventListener("contextmenu", this.#rawContextMenu.bind(this), {capture: true, passive: false});
    this.#canvas.addEventListener("wheel", this.#rawScrollWheel.bind(this), {capture: true, passive: false});
    document.addEventListener("keydown", this.#rawKeyDown.bind(this), {capture: true, passive: false});
    document.addEventListener("keyup", this.#rawKeyUp.bind(this), {passive: true});

    document.fonts.ready.then(() => this.#updateTitleWidth());
  }

  start() {
    this.#rawWindowResize();
  }

  #updateTitleWidth() {
    this.#title.style.width = `${Apper.textMetrics(this.title, this.#title).width + 12}px`;
  }

  enableToolbar() {
    if (this.#toolbar == null) this.#toolbar = new Apper.Toolbar(this);
    return this.#toolbar;
  }

  addMenu(title) {
    const menu = new Apper.Menu(this, title);
    return this.#menus[menu.ID] = menu;
  }

  addModal(title) {
    const modal = new Apper.Modal(this, title);
    return this.#menus[modal.ID] = modal;
  }

  focusCanvas() {
    this.#canvas.focus();
  }

  showMessage(text, error = false) {
    this.#message = document.createElement("div");
    this.#message.className = "apper-message";
    if (error) this.#message.classList.add("apper-error");
    this.#message.textContent = text;
    this.#element.appendChild(this.#message);
    window.setTimeout(() => this.#message.classList.add("apper-shown"));
    this.#messageTimeout = window.setTimeout(() => this.hideMessage(), this.MESSAGE_DURATION * 1000);
  }

  showError(text) {
    this.showMessage(text, true);
  }

  hideMessage() {
    if (this.#messageTimeout == null || this.#message == null) return;
    window.clearTimeout(this.#messageTimeout);
    this.#messageTimeout = null;
    this.#message.classList.remove("apper-shown");
    const failsafeTimeout = window.setTimeout(() => this.#message.remove(), this.MESSAGE_DURATION * 1000);
    this.#message.addEventListener("animationend", () => {
      window.clearTimeout(failsafeTimeout);
      this.#message.remove();
    }, {passive: true});
  }

  transform(worldPos) {
    return this.#view.transform(worldPos);
  }

  transformX(worldX) {
    return this.#view.transformX(worldX);
  }

  transformY(worldY) {
    return this.#view.transformY(worldY);
  }

  locate(screenPos) {
    return this.#view.locate(screenPos);
  }

  locateX(screenX) {
    return this.#view.locateX(screenX);
  }

  locateY(screenY) {
    return this.#view.locateY(screenY);
  }

  update() {
    this.#ctx.clearRect(0, 0, this.#element.clientWidth, this.#element.clientHeight);

    if (this.render !== undefined) this.render();
  }

  #rawWindowResize() {
    this.#canvas.width = this.#element.clientWidth * this.scale;
    this.#canvas.height = this.#element.clientHeight * this.scale;
    this.#ctx.resetTransform();
    this.#ctx.scale(this.scale, this.scale);
    this.#view.size.set(this.#element.clientWidth, this.#element.clientHeight);
    this.#view.scale = this.scale;

    const info = {
      width: this.#element.clientWidth,
      height: this.#element.clientHeight,
    };

    if (this.windowResize !== undefined) this.windowResize(info);

    this.update();
  }

  #rawMouseDown(event) {
    const isTouch = event.touches !== undefined;
    const screenPos = new Apper.Vector2(
      isTouch ? event.touches[0].pageX - this.element.offsetLeft : event.pageX - this.element.offsetLeft,
      isTouch ? event.touches[0].pageY - this.element.offsetTop : event.pageY - this.element.offsetTop);

    const info = {
      isTouch,
      screenPos,
      worldPos: this.locate(screenPos),
      altKey: this.#altKey = event.altKey ?? this.#altKey,
      ctrlKey: this.#ctrlKey = (event.ctrlKey || event.metaKey) ?? this.#ctrlKey,
      shiftKey: this.#shiftKey = event.shiftKey ?? this.#shiftKey,
      leftBtn: isTouch ? true : !!(event.buttons & 1),
      rightBtn: isTouch ? false : !!(event.buttons & 2),
      middleBtn: isTouch ? false : !!(event.buttons & 4),
      button: isTouch ? 0 : event.button,
    };

    this.focusCanvas();
    this.#cursorPos.set(screenPos);

    if (this.mouseDown !== undefined && this.mouseDown(info)) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.update();
  }

  #rawMouseMove(event) {
    const isTouch = event.touches !== undefined;
    const screenPos = new Apper.Vector2(
      isTouch ? event.touches[0].pageX - this.element.offsetLeft : event.pageX - this.element.offsetLeft,
      isTouch ? event.touches[0].pageY - this.element.offsetTop : event.pageY - this.element.offsetTop);

    const info = {
      isTouch,
      onCanvas: event.target === this.#canvas,
      screenPos,
      worldPos: this.locate(screenPos),
      altKey: this.#altKey = event.altKey ?? this.#altKey,
      ctrlKey: this.#ctrlKey = (event.ctrlKey || event.metaKey) ?? this.#ctrlKey,
      shiftKey: this.#shiftKey = event.shiftKey ?? this.#shiftKey,
      leftBtn: isTouch ? true : !!(event.buttons & 1),
      rightBtn: isTouch ? false : !!(event.buttons & 2),
      middleBtn: isTouch ? false : !!(event.buttons & 4),
    };

    this.#cursorPos.set(screenPos);

    if (this.mouseMove === undefined || !this.mouseMove(info)) return;

    this.update();
  }

  #rawMouseUp(event) {
    const isTouch = event.touches !== undefined;

    const info = {
      isTouch,
      altKey: this.#altKey = event.altKey ?? this.#altKey,
      ctrlKey: this.#ctrlKey = (event.ctrlKey || event.metaKey) ?? this.#ctrlKey,
      shiftKey: this.#shiftKey = event.shiftKey ?? this.#shiftKey,
      leftBtn: isTouch ? true : !!(event.buttons & 1),
      rightBtn: isTouch ? false : !!(event.buttons & 2),
      middleBtn: isTouch ? false : !!(event.buttons & 4),
      button: isTouch ? 0 : event.button,
    };

    if (this.mouseUp === undefined || !this.mouseUp(info)) return;

    this.update();
  }

  #rawContextMenu(event) {
    const screenPos = new Apper.Vector2(event.pageX - this.element.offsetLeft, event.pageY - this.element.offsetTop);

    const info = {
      screenPos,
      worldPos: this.locate(screenPos),
      altKey: this.#altKey = event.altKey ?? this.#altKey,
      ctrlKey: this.#ctrlKey = (event.ctrlKey || event.metaKey) ?? this.#ctrlKey,
      shiftKey: this.#shiftKey = event.shiftKey ?? this.#shiftKey,
      leftBtn: !!(event.buttons & 1),
      rightBtn: !!(event.buttons & 2),
      middleBtn: !!(event.buttons & 4),
      button: event.button,
    };

    this.#cursorPos.set(screenPos);

    if (this.openContextMenu !== undefined && this.openContextMenu(info)) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.update();
  }

  #rawScrollWheel(event) {
    const info = {
      altKey: this.#altKey = event.altKey ?? this.#altKey,
      ctrlKey: this.#ctrlKey = (event.ctrlKey || event.metaKey) ?? this.#ctrlKey,
      shiftKey: this.#shiftKey = event.shiftKey ?? this.#shiftKey,
      dx: event.deltaX,
      dy: event.deltaY,
    };

    if (this.scrollWheel === undefined || !this.scrollWheel(info)) return;

    event.preventDefault();
    event.stopPropagation();

    this.update();
  }

  #rawKeyDown(event) {
    if (event.target !== this.#canvas) {
      this.update();
      return;
    }

    const info = {
      altKey: this.#altKey = event.altKey ?? this.#altKey,
      ctrlKey: this.#ctrlKey = (event.ctrlKey || event.metaKey) ?? this.#ctrlKey,
      shiftKey: this.#shiftKey = event.shiftKey ?? this.#shiftKey,
      key: event.code.toLowerCase(),
    };

    if (this.keyDown === undefined || !this.keyDown(info)) {
      this.update();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.update();
  }

  #rawKeyUp(event) {
    if (event.target !== this.#canvas) {
      this.update();
      return;
    }

    const info = {
      altKey: this.#altKey = event.altKey ?? this.#altKey,
      ctrlKey: this.#ctrlKey = (event.ctrlKey || event.metaKey) ?? this.#ctrlKey,
      shiftKey: this.#shiftKey = event.shiftKey ?? this.#shiftKey,
      key: event.code.toLowerCase(),
    };

    if (this.keyUp === undefined || !this.keyUp(info)) {
      this.update();
      return;
    }

    this.update();
  }

}


Apper.RESOURCE = "https://raw.githubusercontent.com/xarkenz/apper/main/src/";


Apper.toggleStyleClass = (element, className) => {
  if (element.classList.contains(className))
    element.classList.remove(className);
  else
    element.classList.add(className);
};

Apper.textMetrics = (text, source) => {
  const canvas = Apper.textMetrics.canvas ?? (Apper.textMetrics.canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  if (source instanceof Element) {
    const style = window.getComputedStyle(source, null);
    ctx.font = `\
      ${style.getPropertyValue("font-weight") || "normal"} \
      ${style.getPropertyValue("font-size") || "14px"} \
      ${style.getPropertyValue("font-family") || "Nunito"}`;
  } else ctx.font = source;
  return ctx.measureText(text);
};


Apper.Vector2 = class {

  constructor(x = 0, y = null) {
    this.set(x, y);
  }

  copy() {
    return new Apper.Vector2(this);
  }

  set(x, y = null) {
    if (x.x !== undefined) {
      this.x = x.x;
      this.y = x.y;
      return this;
    }
    if (y == null) y = x;
    this.x = x;
    this.y = y;
    return this;
  }

  get mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  equals(x, y = null) {
    if (x.x !== undefined)
      return this.x === x.x && this.y === x.y;
    if (y == null) y = x;
    return this.x === x && this.y === y;
  }

  add(x, y = null) {
    if (x.x !== undefined)
      return new Apper.Vector2(this.x + x.x, this.y + x.y);
    if (y == null) y = x;
    return new Apper.Vector2(this.x + x, this.y + y);
  }

  sub(x, y = null) {
    if (x.x !== undefined)
      return new Apper.Vector2(this.x - x.x, this.y - x.y);
    if (y == null) y = x;
    return new Apper.Vector2(this.x - x, this.y - y);
  }

  mul(x, y = null) {
    if (x.x !== undefined)
      return new Apper.Vector2(this.x * x.x, this.y * x.y);
    if (y == null) y = x;
    return new Apper.Vector2(this.x * x, this.y * y);
  }

  div(x, y = null) {
    if (x.x !== undefined)
      return new Apper.Vector2(this.x / x.x, this.y / x.y);
    if (y == null) y = x;
    return new Apper.Vector2(this.x / x, this.y / y);
  }

  dot(x, y = null) {
    if (x.x !== undefined)
      return this.x * x.x + this.y * x.y;
    return this.x * x + this.y * y;
  }

  transformed(view) {
    return view.transform(this);
  }

  located(view) {
    return view.locate(this);
  }

};


Apper.Rect = class {

  #pos;
  #size;

  get pos() { return this.#pos; }
  get size() { return this.#size; }

  get x() { return this.#pos.x; }
  set x(x) { return this.#pos.x = x; }
  get y() { return this.#pos.y; }
  set y(y) { return this.#pos.y = y; }
  get w() { return this.#size.x; }
  set w(w) { return this.#size.x = w; }
  get h() { return this.#size.y; }
  set h(h) { return this.#size.y = h; }

  get cx() { return this.#pos.x + 0.5 * this.#size.x; }
  get cy() { return this.#pos.y + 0.5 * this.#size.y; }
  get xw() { return this.#pos.x + this.#size.x; }
  get yh() { return this.#pos.y + this.#size.y; }

  get xy() { return new Apper.Vector2(this.x, this.y); }
  get xwy() { return new Apper.Vector2(this.x + this.w, this.y); }
  get xyh() { return new Apper.Vector2(this.x, this.y + this.h); }
  get xwyh() { return new Apper.Vector2(this.x + this.w, this.y + this.h); }

  get area() { return this.w * this.h; }

  constructor(x, y, w, h) {
    this.#pos = new Apper.Vector2(x, y);
    this.#size = new Apper.Vector2(w, h);
  }

  copy() {
    return new Apper.Rect(this.#pos.x, this.#pos.y, this.#size.x, this.#size.y);
  }

  normalized() {
    return Apper.Rect.normalize(this);
  }

  scaled(scale) {
    return new Apper.Rect(this.#pos.x * scale, this.#pos.y * scale, this.#size.x * scale, this.#size.y * scale);
  }

  contains(point) {
    let r = this.normalized();
    return r.x <= point.x && point.x <= r.x + r.w && r.y <= point.y && point.y <= r.y + r.h;
  }

  intersects(rect) {
    let r = this.normalized();
    return !(r.x + r.w <= rect.x || r.x >= rect.x + rect.w || r.y + r.h <= rect.y || r.y >= rect.y + rect.h)
  }

  transformed(view) {
    const tl = view.transform(this.#pos), br = view.transform(this.#pos.add(this.#size));
    return new Apper.Rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }

  located(view) {
    const tl = view.locate(this.#pos), br = view.locate(this.#pos.add(this.#size));
    return new Apper.Rect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }

};

Apper.Rect.normalize = (rect) => new Apper.Rect(rect.w < 0 ? rect.x + rect.w : rect.x, rect.h < 0 ? rect.y + rect.h : rect.y, Math.abs(rect.w), Math.abs(rect.h));


Apper.Viewport = class {

  #center;
  #size;
  #zoom;
  #izoom;
  #scale;

  get center() { return this.#center; }
  get size() { return this.#size; }
  get zoom() { return this.#zoom; }
  set zoom(z) { this.#izoom = 1 / z; return this.#zoom = z; }
  get izoom() { return this.#izoom; }
  set izoom(z) { this.#zoom = 1 / z; return this.#izoom = z; }
  get scale() { return this.#scale; }
  set scale(s) { return this.#scale = s; }

  get cx() { return this.#center.x; }
  set cx(x) { return this.#center.x = x; }
  get cy() { return this.#center.y; }
  set cy(y) { return this.#center.y = y; }
  get w() { return this.#size.x; }
  set w(w) { return this.#size.x = w; }
  get h() { return this.#size.y; }
  set h(h) { return this.#size.y = h; }

  constructor(cx = 0, cy = 0, w = 0, h = 0, z = 1, s = 1) {
    this.#center = new Apper.Vector2(cx, cy);
    this.#size = new Apper.Vector2(w, h);
    this.#zoom = z;
    this.#izoom = 1 / z;
    this.#scale = s;
  }

  transform(worldPos) {
    return new Apper.Vector2(this.transformX(worldPos.x), this.transformY(worldPos.y));
  }

  transformX(worldX) {
    return (worldX - this.#center.x) * this.#zoom + this.#size.x * 0.5;
  }

  transformY(worldY) {
    return (worldY - this.#center.y) * this.#zoom + this.#size.y * 0.5;
  }

  locate(screenPos) {
    return new Apper.Vector2(this.locateX(screenPos.x), this.locateY(screenPos.y));
  }

  locateX(screenX) {
    return (screenX - this.#size.x * 0.5) * this.#izoom + this.#center.x;
  }

  locateY(screenY) {
    return (screenY - this.#size.y * 0.5) * this.#izoom + this.#center.y;
  }

  changeZoom(amount, target = null) {
    if (!amount) return;
    let oldPos = target ? this.locate(target) : null;
    if (amount > 0)
      this.zoom *= 1 + amount;
    else if (amount < 0)
      this.zoom /= 1 - amount;
    // Correct the center to zoom into target
    if (target)
      this.#center.set(this.#center.add(oldPos.sub(this.locate(target))));
  }

  copy() {
    return new Apper.Viewport(this.cx, this.cy, this.w, this.h, this.zoom);
  }

}


Apper.Tool = class {

  #ID;
  #name;
  #displayName;
  #icon;
  #key;
  #shortcut;

  get ID() { return this.#ID; }
  get name() { return this.#name; }
  get displayName() { return this.#displayName; }
  get icon() { return this.#icon; }
  get key() { return this.#key; }
  get shortcut() { return this.#shortcut; }

  constructor(name, displayName, icon, key = "", shortcut = "") {
    this.#ID = Apper.Tool.list.length;
    this.#name = name;
    this.#displayName = displayName;
    this.#icon = icon;
    this.#key = key;
    this.#shortcut = shortcut;

    Apper.Tool.list.push(this);
  }

}

Apper.Tool.list = [null];


Apper.Toolbar = class {

  #app;
  #element;
  #toggler;
  #buttons;
  #tools;
  #tool;
  #defaultTool;

  get app() { return this.#app; }
  get element() { return this.#element; }
  get tools() { return this.#tools; }
  get tool() { return Apper.Tool.list[this.#tool]; }
  set tool(tool) { this.#tool = tool.ID; this.#update(); return tool; }
  get defaultTool() { return Apper.Tool.list[this.#defaultTool]; }
  set defaultTool(tool) { this.#defaultTool = tool.ID; return tool; }

  constructor(app, shown = true) {
    this.#app = app;

    this.#element = document.createElement("div");
    this.#element.className = "apper-toolbar";
    this.#app.element.appendChild(this.#element);
    if (shown) this.#element.classList.add("apper-shown");

    this.#toggler = document.createElement("img");
    this.#toggler.className = "apper-toolbar-toggler";
    this.#toggler.src = Apper.RESOURCE + "icons/toolbar-toggler.svg";
    this.#toggler.addEventListener("mousedown", event => Apper.toggleStyleClass(this.#element, "apper-shown"));
    this.#toggler.addEventListener("touchstart", event => Apper.toggleStyleClass(this.#element, "apper-shown"));
    this.#app.element.appendChild(this.#toggler);

    this.#buttons = [];
    this.#tools = [];
    this.#tool = 0;
    this.#defaultTool = 0;
  }

  #update() {
    this.#buttons.forEach(button => button.classList.remove("apper-button-selected"));
    this.#buttons[this.#tool].classList.add("apper-button-selected");
    this.#app.update();
  }

  addTool(tool, isDefault = false) {
    this.#tools.push(tool.ID);
    if (isDefault) this.#tool = this.#defaultTool = tool.ID;

    let button = document.createElement("div");
    button.className = "apper-toolbutton";
    if (this.#tool === tool.ID) button.classList.add("apper-button-selected");
    button.addEventListener("click", event => {
      this.#tool = this.#tool === tool.ID ? this.#defaultTool : tool.ID;
      this.#app.focusCanvas();
      this.#update();
    }, {passive: true});
    this.#element.appendChild(button);
    this.#buttons[tool.ID] = button;

    let icon = document.createElement("img");
    icon.src = tool.icon;
    button.appendChild(icon);

    let tip = document.createElement("div");
    tip.className = "apper-toolbutton-tip";
    tip.textContent = tool.displayName;
    button.appendChild(tip);

    if (tool.shortcut) {
      let hint = document.createElement("span");
      hint.textContent = tool.shortcut;
      tip.appendChild(hint);
    }

    return this;
  }

  addSpacer() {
    let spacer = document.createElement("div");
    spacer.className = "apper-toolbar-spacer";
    this.#element.appendChild(spacer);
    return this;
  }

};


Apper.Menu = class {

  #ID;
  #app;
  #frame;
  #element;
  #title;

  get ID() { return this.#ID; }
  get app() { return this.#app; }
  get element() { return this.#element; }
  get title() { return this.#title.textContent; }
  set title(text) { return this.#title.textContent = text; }

  constructor(app, title = "") {
    this.#ID = Apper.Menu.nextID++;
    this.#app = app;

    this.#frame = document.createElement("div");
    this.#frame.className = "apper-menu";
    this.#frame.style.visibility = "hidden";
    this.#frame.addEventListener("transitionend", event => {
      if (!this.#frame.classList.contains("apper-shown"))
        this.#frame.style.visibility = "hidden";
    }, {passive: true});
    this.#app.element.appendChild(this.#frame);

    this.#title = document.createElement("span");
    this.#title.className = "apper-menu-title";
    this.#title.textContent = title;
    this.#frame.appendChild(this.#title);

    this.#element = document.createElement("div");
    this.#frame.appendChild(this.#element);
  }

  show() {
    this.#frame.style.visibility = "visible";
    this.#frame.classList.add("apper-shown");
    return this;
  }

  hide() {
    this.#frame.classList.remove("apper-shown");
    return this;
  }

  add(widget) {
    this.#element.appendChild(widget.element);
    return this;
  }

  addSeparator() {
    let separator = document.createElement("span");
    separator.className = "apper-separator";
    this.#element.appendChild(separator);
    return this;
  }

};

Apper.Modal = class {

  #ID;
  #app;
  #frame;
  #element;
  #title;

  get ID() { return this.#ID; }
  get app() { return this.#app; }
  get element() { return this.#element; }
  get title() { return this.#title.textContent; }
  set title(text) { return this.#title.textContent = text; }

  constructor(app, title = "") {
    this.#ID = Apper.Menu.nextID++;
    this.#app = app;

    this.#frame = document.createElement("div");
    this.#frame.className = "apper-modal";
    this.#frame.style.visibility = "hidden";
    this.#frame.addEventListener("transitionend", event => {
      if (!this.#frame.classList.contains("apper-shown"))
        this.#frame.style.visibility = "hidden";
    }, {passive: true});
    this.#app.element.appendChild(this.#frame);

    this.#title = document.createElement("span");
    this.#title.className = "apper-modal-title";
    this.#title.textContent = title;
    this.#frame.appendChild(this.#title);

    const closeButton = document.createElement("img");
    closeButton.className = "apper-close-button";
    closeButton.src = Apper.RESOURCE + "icons/close-button.svg";
    closeButton.addEventListener("click", event => {
      this.hide();
      this.app.tool = this.app.toolbar.defaultTool;
    });
    this.#frame.appendChild(closeButton);

    this.#element = document.createElement("div");
    this.#frame.appendChild(this.#element);
  }

  show() {
    this.#frame.style.visibility = "visible";
    this.#frame.classList.add("apper-shown");
    return this;
  }

  hide() {
    this.#frame.classList.remove("apper-shown");
    return this;
  }

  add(widget) {
    this.#element.appendChild(widget.element);
    return this;
  }

  addSeparator() {
    let separator = document.createElement("span");
    separator.className = "apper-separator";
    this.#element.appendChild(separator);

    return this;
  }

};

Apper.Menu.nextID = 1;


Apper.Menu.Paragraph = class {

  #element;

  get element() { return this.#element; }
  get text() { return this.#element.textContent; }
  set text(content) { return this.#element.textContent = content; }

  constructor(content = "") {
    this.#element = document.createElement("p");
    this.#element.className = "apper-paragraph";
    this.#element.innerHTML = content;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

};


Apper.Menu.Button = class {

  #element;
  #name;

  get element() { return this.#element; }
  get name() { return this.#name; }
  get label() { return this.#element.textContent; }
  set label(text) { return this.#element.textContent = text; }

  get url() { return this.#element.href; }
  set url(content) { return this.#element.href = content; }
  get filename() { return this.#element.download; }
  set filename(content) { return this.#element.download = content; }

  constructor(label, url = null, filename = null) {
    this.#element = document.createElement("a");
    this.#element.className = "apper-button";
    if (url != null) this.#element.href = url;
    if (filename != null) this.#element.download = filename;
    this.#element.innerHTML = label;
    this.#element.addEventListener("click", event => {
      if (this.click !== undefined) this.click();
    }, {passive: true});
  }

  onClick(callback) {
    this.click = callback;
    return this;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

}


Apper.Menu.Checkbox = class {

  #element;
  #name;
  #label;
  #input;

  get element() { return this.#element; }
  get name() { return this.#name; }
  get label() { return this.#label.textContent; }
  set label(text) { return this.#label.textContent = text; }
  get checked() { return this.#input.checked; }
  set checked(value) { return this.#input.checked = value; }

  constructor(name, label, init = false) {
    this.#element = document.createElement("label");
    this.#element.className = "apper-checkbox";
    this.#element.addEventListener("change", event => {
      if (this.change !== undefined) this.change(this.checked);
    }, {passive: true});

    this.#input = document.createElement("input");
    this.#input.type = "checkbox";
    this.#input.name = name;
    this.#input.checked = init;
    this.#element.appendChild(this.#input);

    this.#label = document.createElement("span");
    this.#label.textContent = label;
    this.#element.appendChild(this.#label);

    let box = document.createElement("div");
    let check = document.createElement("img");
    check.src = Apper.RESOURCE + "icons/checkbox-check.svg";
    box.appendChild(check);
    this.#element.appendChild(box);
  }

  onChange(callback) {
    this.change = callback;
    return this;
  }

  setChecked(value) {
    this.checked = value;
    return this;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

  enable() {
    this.#input.disabled = false;
    return this;
  }

  disable() {
    this.#input.disabled = true;
    return this;
  }

};


Apper.Menu.HSpread = class {

  #element;
  #name;
  #label;
  #value;

  get element() { return this.#element; }
  get name() { return this.#name; }
  get label() { return this.#label.textContent; }
  set label(text) { return this.#label.textContent = text; }
  get value() { return this.#value; }

  set value(value) {
    document.querySelectorAll(`.apper-hspread input[name="${this.#name}"]`).forEach(input => {
      input.checked = input.value == value;
    });
    return this.#value = value;
  }

  constructor(name, label, icons, labelIcon = null, init = null) {
    this.#name = name;
    this.#value = init;

    this.#element = document.createElement("div");
    this.#element.className = "apper-hspread";

    this.#label = document.createElement("span");
    this.#label.textContent = label;
    this.#element.appendChild(this.#label);

    if (labelIcon) {
      let icon = document.createElement("img");
      icon.src = labelIcon;
      this.#element.appendChild(icon);
    }

    let spread = document.createElement("div");
    this.#element.appendChild(spread);

    icons.forEach((iconSrc, value) => {
      let container = document.createElement("label");
      spread.appendChild(container);

      let input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = value;
      if (value === this.#value) input.checked = true;
      input.addEventListener("change", event => {
        this.#value = value;
        if (this.change !== undefined) this.change(value);
      }, {capture: false, passive: true});
      container.appendChild(input);

      let button = document.createElement("span");
      container.appendChild(button);

      iconSrc = iconSrc.trim();
      if (iconSrc.startsWith("<")) {
        button.innerHTML = iconSrc;
      } else {
        let icon = document.createElement("img");
        icon.src = iconSrc;
        button.appendChild(icon);
      }
    });
  }

  onChange(callback) {
    this.change = callback;
    return this;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

};


Apper.Menu.TextEditor = class {

  #element;
  #name;

  get element() { return this.#element; }
  get name() { return this.#name; }
  get text() { return this.#element.value; }
  set text(value) { this.#element.value = value; this.#update(); return value; }
  get valid() { return !this.#element.classList.contains("apper-invalid"); }
  set valid(value) { return value ? this.#element.classList.remove("apper-invalid") : this.#element.classList.add("apper-invalid"); }
  get editing() { return document.activeElement === this.#element; }

  constructor(name, placeholder = "", init = "") {
    this.#name = name;

    this.#element = document.createElement("textarea");
    this.#element.className = "apper-text-editor";
    this.#element.name = name;
    this.#element.placeholder = placeholder;
    this.#element.value = init;
    this.#element.spellcheck = false;
    this.#element.autocomplete = "off";
    this.#element.addEventListener("input", event => {
      if (this.change !== undefined) this.change(this.text);
      this.#update();
    }, {capture: false, passive: true});

    this.#update();
  }

  #update() {
    // Solution from DreamTeK on StackOverflow:
    // https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
    this.#element.style.height = "auto";
    this.#element.style.height = this.#element.scrollHeight + "px";
  }

  onChange(callback) {
    this.change = callback;
    return this;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

};


Apper.Menu.ButtonList = class {

  #element;
  #label;
  #buttons;

  get element() { return this.#element; }
  get label() { return this.#label.textContent; }
  set label(text) { return this.#label.textContent = text; }

  constructor(label, values, names) {
    this.#element = document.createElement("div");
    this.#element.className = "apper-button-list";

    this.#label = document.createElement("span");
    this.#label.textContent = label;
    this.#element.appendChild(this.#label);

    let list = document.createElement("div");
    this.#buttons = [];
    values.forEach((value, i) => {
      let button = document.createElement("button");
      button.value = value;
      button.textContent = names[i];
      button.addEventListener("click", event => {
        if (this.change !== undefined) this.change(value);
      }, {capture: false, passive: true});
      list.appendChild(button);
      this.#buttons.push(button);
    });
    this.#element.appendChild(list);
  }

  onChange(callback) {
    this.change = callback;
    return this;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

};


Apper.Menu.NumberInput = class {

  #element;
  #name;
  #label;
  #input;
  #min;
  #max;

  get element() { return this.#element; }
  get name() { return this.#name; }
  get label() { return this.#label.textContent; }
  set label(text) { return this.#label.textContent = text; }
  get value() { return +this.#input.value; }
  set value(value) { return this.#input.value = value; }

  constructor(name, label, icon = null, init = 0) {
    this.#min = -Infinity;
    this.#max = Infinity;

    this.#element = document.createElement("label");
    this.#element.className = "apper-number-input";
    this.#element.addEventListener("change", event => {
      if (this.value < this.#min) this.value = this.#min;
      else if (this.value > this.#max) this.value = this.#max;
      if (this.change !== undefined) this.change(this.value);
    }, {capture: false, passive: true});

    if (icon) {
      let iconElement = document.createElement("img");
      iconElement.src = icon;
      this.#element.appendChild(iconElement);
    }

    this.#label = document.createElement("span");
    this.#label.textContent = label;
    this.#element.appendChild(this.#label);

    this.#input = document.createElement("input");
    this.#input.type = "number";
    this.#input.name = name;
    this.#input.value = init;
    this.#element.appendChild(this.#input);
  }

  setMin(value) {
    this.#min = value;
    this.#input.min = value;
    return this;
  }

  setMax(value) {
    this.#max = value;
    this.#input.max = value;
    return this;
  }

  onChange(callback) {
    this.change = callback;
    return this;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

};


Apper.Menu.CanvasImage = class {

  #element;
  #label;
  #canvas;
  #ctx;

  get element() { return this.#element; }
  get label() { return this.#label.textContent; }
  set label(text) { return this.#label.textContent = text; }
  get canvas() { return this.#canvas; }
  get ctx() { return this.#ctx; }

  constructor(label) {
    this.#element = document.createElement("div");
    this.#element.className = "apper-canvas-image";

    this.#label = document.createElement("span");
    this.#label.textContent = label;
    this.#element.appendChild(this.#label);

    this.#canvas = document.createElement("canvas");
    this.#element.appendChild(this.#canvas);

    this.#ctx = this.#canvas.getContext("2d");
  }

  resize(w, h) {
    this.#canvas.width = w;
    this.#canvas.height = h;
  }

  show() {
    this.#element.style.display = "";
    return this;
  }

  hide() {
    this.#element.style.display = "none";
    return this;
  }

};


// Insert necessary <link> tags
Apper._loadResources = () => {
  if (!document.querySelector("link[href='https://fonts.googleapis.com']")) {
    let tag = document.createElement("link");
    tag.rel = "preconnect";
    tag.href = "https://fonts.googleapis.com";
    document.head.insertBefore(tag, Apper._scriptNode);
  }
  if (!document.querySelector("link[href='https://fonts.gstatic.com']")) {
    let tag = document.createElement("link");
    tag.rel = "preconnect";
    tag.href = "https://fonts.gstatic.com";
    tag.crossOrigin = "anonymous";
    document.head.insertBefore(tag, Apper._scriptNode);
  }
  if (!document.querySelector("link[href='https://fonts.googleapis.com/css2?family=Cousine&family=Nunito:wght@500&display=swap']")) {
    let tag = document.createElement("link");
    tag.rel = "stylesheet";
    tag.href = "https://fonts.googleapis.com/css2?family=Cousine&family=Nunito:wght@500&display=swap";
    document.head.insertBefore(tag, Apper._scriptNode);
  }
  if (!document.querySelector("link[href*='apper/src/apper.css']")) {
    let tag = document.createElement("link");
    tag.rel = "stylesheet";
    tag.href = Apper._scriptNode.src.substring(0, Apper._scriptNode.src.indexOf(".js")) + ".css";
    tag.type = "text/css";
    document.head.insertBefore(tag, Apper._scriptNode);
  }
}

Apper._scriptNode = document.currentScript;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", Apper._loadResources);
else Apper._loadResources();

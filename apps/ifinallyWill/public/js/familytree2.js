/* eslint-disable */
var FlowChart = class {
  _;
  options;
  element;
  svgElement;
  shapeBar;
  colorBar;
  menuBar;
  statusBar;
  editor;
  nodes;
  labels;
  links;
  ports;
  selectedShapes;
  active;
  get useChangeListener() {
    return this._.useChangeListener;
  }
  set useChangeListener(t) {
    this._.useChangeListener = t;
  }
  get defs() {
    return this.svgElement.querySelector('defs').innerHTML;
  }
  set defs(t) {
    this.svgElement.querySelector('defs').innerHTML = t;
  }
  get mode() {
    return this.options.mode;
  }
  set mode(t) {
    (this.options.mode = t),
      this.element.classList.remove('bfc-dark'),
      this.element.classList.remove('bfc-light'),
      this.element.classList.add('bfc-' + this.options.mode),
      this.svgElement.classList.remove('bfc-dark'),
      this.svgElement.classList.remove('bfc-light'),
      this.svgElement.classList.add('bfc-' + this.options.mode);
  }
  get viewBox() {
    return this._.getViewBox();
  }
  set viewBox(t) {
    this._.snap(), this._.setViewBox(t), this._.changed({ property: 'viewBox' });
  }
  get selectedPortShape() {
    return this._.selectedPortShape;
  }
  set selectedPortShape(t) {
    null == t
      ? ((this._.selectedPortShape = null),
        null != this.selectedPort && (this.selectedPort = null),
        this._.hidePortsUI())
      : t != this._.selectedPortShape && ((this._.selectedPortShape = t), this._.showPortsUI());
  }
  get selectedPort() {
    return this._.selectedPort;
  }
  set selectedPort(t) {
    if (this._.selectedPort != t) {
      var e = { oldPort: this._.selectedPort, newPort: t };
      !1 !== FlowChart.events.publish('selected-port-change', [this._.chart, e]) &&
        (null == t
          ? ((this._.selectedPort = null), this._.hidePortShapeBarUI())
          : this._.selectedPort != t &&
            (this.selectedPortShape != t.shape && (this.selectedPortShape = t.shape),
            (this._.selectedPort = t),
            this._.showPortShapeBar()));
    }
  }
  get scale() {
    return this._.getScale();
  }
  set scale(t) {
    if (this.scale != t) {
      var e = FlowChart.private.getViewBoxByScale(t, this.options, this.viewBox, this._.svgBCR);
      this.viewBox = e;
    }
  }
  static MAGNET_MOVE_PIXELS = 10;
  static MAGNET_RESIZE_PIXELS = 7;
  static MAGNET_WIN_PIXELS = 10;
  static MAGNET_PORT = 20;
  static LINK_DITSNANCE = 20;
  static LINK_ROUNDED_CORENERS = 7;
  static MOVE_NODE_STEP = 3;
  static SCALE_FACTOR = 1.44;
  static DEFAULT_LINK_SHAPE_ID = 'rounded';
  static DEFAULT_LABEL_SHAPE_ID = 'label';
  static CHANGED_TIMEOUT = 700;
  static PADDING = 30;
  static SEPARATOR = ':';
  static PORTSEPARATOR = '~';
  static shortcuts = {
    open_up_port: {
      keysPressed: ['control', '!shift', 'arrowup'],
      activeComponentType: 'node|port-shape-bar|field',
      desc: 'Open port above the shape',
    },
    open_down_port: {
      keysPressed: ['control', '!shift', 'arrowdown'],
      activeComponentType: 'node|port-shape-bar|field',
      desc: 'Open port below the shape',
    },
    open_left_port: {
      keysPressed: ['control', '!shift', 'arrowleft'],
      activeComponentType: 'node|port-shape-bar|field',
      desc: 'Open left port',
    },
    open_right_port: {
      keysPressed: ['control', '!shift', 'arrowright'],
      activeComponentType: 'node|port-shape-bar|field',
      desc: 'Open right port',
    },
    navigate_port_down: {
      keysPressed: ['!control', '!shift', 'arrowdown'],
      activeComponentType: 'port-shape-bar',
      desc: 'Select shape from the opened port shape bar',
    },
    navigate_port_left: {
      keysPressed: ['!control', '!shift', 'arrowleft'],
      activeComponentType: 'port-shape-bar',
      desc: 'Select shape from the opened port shape bar',
    },
    navigate_port_right: {
      keysPressed: ['!control', '!shift', 'arrowright'],
      activeComponentType: 'port-shape-bar',
      desc: 'Select shape from the opened port shape bar',
    },
    navigate_port_up: {
      keysPressed: ['!control', '!shift', 'arrowup'],
      activeComponentType: 'port-shape-bar',
      desc: 'Select shape from the opened port shape bar',
    },
    undo: { keysPressed: ['control', 'keyz'], desc: 'Undo' },
    redo: { keysPressed: ['control', 'keyy'], desc: 'Redo' },
    select_all_nodes: { keysPressed: ['control', 'keya'], desc: 'Selectd all nodes' },
    select_multiple_nodes: { keysPressed: ['shift'], desc: 'Selectd multiple nodes or shapes' },
    resize_node: { mouseActions: ['resize-shape'], desc: 'Resize shape' },
    centered_resize_shape: {
      keysPressed: ['control'],
      mouseActions: ['resize-shape'],
      desc: 'Centered resize',
    },
    maintain_aspect_ratio_resize_shape: {
      keysPressed: ['shift'],
      mouseActions: ['resize-shape'],
      activeComponentType: 'shape',
      desc: 'Resize and maintain proportions',
    },
    remove_selected_shapes: {
      keysPressed: ['delete|backspace'],
      activeComponentType: 'shape',
      desc: 'Remove selected shapes',
    },
    zoom: { keysPressed: ['control'], mouseActions: ['wheel'], desc: 'Zoom In/Out' },
    move_selected_nodes_left: {
      keysPressed: ['arrowleft', 'control', 'shift'],
      desc: 'Move selected nodes with arrow keys',
    },
    move_selected_nodes_right: {
      keysPressed: ['arrowright', 'control', 'shift'],
      desc: 'Move selected nodes with arrow keys',
    },
    move_selected_nodes_up: {
      keysPressed: ['arrowup', 'control', 'shift'],
      desc: 'Move selected nodes with arrow keys',
    },
    move_selected_nodes_down: {
      keysPressed: ['arrowdown', 'control', 'shift'],
      desc: 'Move selected nodes with arrow keys',
    },
    select_node_left: {
      keysPressed: ['arrowleft', '!control', '!shift'],
      activeComponentType: 'node',
      desc: 'Select the closest node on the left',
    },
    select_node_right: {
      keysPressed: ['arrowright', '!control', '!shift'],
      activeComponentType: 'node',
      desc: 'Select the closest node on the right',
    },
    select_node_above: {
      keysPressed: ['arrowup', '!control', '!shift'],
      activeComponentType: 'node',
      desc: 'Select the closest node on the top',
    },
    select_node_below: {
      keysPressed: ['arrowdown', '!control', '!shift'],
      activeComponentType: 'node',
      desc: 'Select the closest node on the bottom',
    },
    select_nodes_left: {
      keysPressed: ['arrowleft', '!control', 'shift'],
      activeComponentType: 'node',
      desc: 'Select multiple nodes',
    },
    select_nodes_right: {
      keysPressed: ['arrowright', '!control', 'shift'],
      activeComponentType: 'node',
      desc: 'Select multiple nodes',
    },
    select_nodes_above: {
      keysPressed: ['arrowup', '!control', 'shift'],
      activeComponentType: 'node',
      desc: 'Select multiple nodes',
    },
    select_nodes_below: {
      keysPressed: ['arrowdown', '!control', 'shift'],
      activeComponentType: 'node',
      desc: 'Select multiple nodes',
    },
    align_tofirst_selected_nodes_top: {
      keysPressed: ['keyt', '!shift'],
      activeComponentType: 'node',
      desc: 'Align top to the first selected node',
    },
    align_tofirst_selected_nodes_bottom: {
      keysPressed: ['keyb', '!shift'],
      activeComponentType: 'node',
      desc: 'Align bottom to the first selected node',
    },
    align_tofirst_selected_nodes_left: {
      keysPressed: ['keyl', '!shift'],
      activeComponentType: 'node',
      desc: 'Align left to the first selected node',
    },
    align_tofirst_selected_nodes_right: {
      keysPressed: ['keyr', '!shift'],
      activeComponentType: 'node',
      desc: 'Align right to the first selected node',
    },
    align_tofirst_selected_nodes_horizontally: {
      keysPressed: ['keye', '!shift'],
      activeComponentType: 'node',
      desc: 'Align center horizontally to the first selected node',
    },
    align_tofirst_selected_nodes_vertically: {
      keysPressed: ['keyc', '!shift'],
      activeComponentType: 'node',
      desc: 'Align center vertically to the first selected node',
    },
    align_tolast_selected_nodes_top: {
      keysPressed: ['keyt', 'shift'],
      activeComponentType: 'node',
      desc: 'Align top to the last selected node',
    },
    align_tolast_selected_nodes_bottom: {
      keysPressed: ['keyb', 'shift'],
      activeComponentType: 'node',
      desc: 'Align bottom to the last selected node',
    },
    align_tolast_selected_nodes_left: {
      keysPressed: ['keyl', 'shift'],
      activeComponentType: 'node',
      desc: 'Align left to the last selected node',
    },
    align_tolast_selected_nodes_right: {
      keysPressed: ['keyr', 'shift'],
      activeComponentType: 'node',
      desc: 'Align right to the last selected node',
    },
    align_tolast_selected_nodes_horizontally: {
      keysPressed: ['keye', 'shift'],
      activeComponentType: 'node',
      desc: 'Align center horizontally to the last selected node',
    },
    align_tolast_selected_nodes_vertically: {
      keysPressed: ['keyc', 'shift'],
      activeComponentType: 'node',
      desc: 'Align center vertically to the last selected node',
    },
    paint_node: {
      keysPressed: [
        'digit1|digit2|digit3|digit4|digit5|digit6|digit7|digit8|digit9|numpad1|numpad2|numpad3|numpad4|numpad5|numpad6|numpad7|numpad8|numpad9',
      ],
      activeComponentType: 'node',
      desc: 'Change color',
    },
    add_shape: { keysPressed: ['enter'], activeComponentType: 'port-shape-bar', desc: 'Add node' },
    edit_next_field: {
      keysPressed: ['tab'],
      activeComponentType: 'field',
      desc: 'Focus next field',
    },
    exit_edit_field: {
      keysPressed: ['escape'],
      activeComponentType: 'field',
      desc: 'Finish editing',
    },
    close_port_shape_bar: {
      keysPressed: ['escape'],
      activeComponentType: 'port-shape-bar',
      desc: 'Hide port shape bar',
    },
    deleselect_shapes: {
      keysPressed: ['escape'],
      activeComponentType: 'shape',
      desc: 'Unselect shapes',
    },
    edit_shape: {
      keysPressed: ['enter|numpadenter|space'],
      activeComponentType: 'shape',
      desc: 'Edit shape',
    },
    fit_to_page: { keysPressed: ['keyf'], activeComponentType: 'all-nodes', desc: 'Fit to page' },
    replace_div_with_br_on_enter: {
      keysPressed: ['enter|numpadenter'],
      activeComponentType: 'field',
      desc: '',
    },
  };
  static isNEU(t) {
    return null == t || '' === t;
  }
  static isMobile = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  static animate = (t, e, i, r, a, o, s) => FlowChart.private.animate(t, e, i, r, a, o, s);
  constructor(t, e) {
    ('string' == typeof t || t instanceof String) && (t = document.querySelector(t)),
      (this.options = FlowChart.private.mergeDeep(FlowChart.private.defaultOptions(), e)),
      (this.element = t),
      (this.svgElement = null),
      (this.shapeBar = new FlowChart.ShapeBar(this)),
      (this.colorBar = new FlowChart.ColorBar(this)),
      (this.menuBar = new FlowChart.MenuBar(this)),
      (this.statusBar = new FlowChart.StatusBar(this)),
      (this.selectedShapes = new FlowChart.SelectedShapeCollection(this)),
      (this.editor = new FlowChart.Editor(this)),
      (this.ports = new FlowChart.PortCollection(this)),
      (this.nodes = new FlowChart.ShapeCollection(this)),
      (this.links = new FlowChart.LinkCollection(this)),
      (this.labels = new FlowChart.ShapeCollection(this)),
      (this.active = null),
      (this._ = new FlowChart.private(this)),
      FlowChart.events.publish('init', [this]);
  }
  addNodeWithLink(t, e, i) {
    this._.addNodeWithLink(t, e, i);
  }
  load(t) {
    this._.load(t);
  }
  json(t) {
    return this._.json(t);
  }
  text(t) {
    return this._.text(t);
  }
  svg() {
    return this._.svg();
  }
  exportSVG() {
    var t = new Blob([this.svg()], { type: 'image/svg+xml' });
    FlowChart.private.downloadFile(t, 'flowchart.svg', !1, 'svg');
  }
  getShape(t) {
    return this._.getShape(t);
  }
  generateId() {
    return this._.generateId();
  }
  undo() {
    this._.undo();
  }
  redo() {
    this._.redo();
  }
  undoStepsCount() {
    return this._.undoStepsCount();
  }
  redoStepsCount() {
    return this._.redoStepsCount();
  }
  clearRedo() {
    this._.clearRedo();
  }
  clearUndo() {
    this._.clearUndo();
  }
  alignShapes(t, e, i) {
    this._.alignShapes(t, e, i);
  }
  reposition(t, e, i, r) {
    this._.reposition(t, e, i, r);
  }
  rippleShape(t, e, i) {
    FlowChart.private.rippleShape(t, e, i);
  }
  makeShapesVisible(t, e) {
    this._.makeShapesVisible(t, e);
  }
  destroy() {
    if (((FlowChart.events.topics = {}), this.element)) {
      this.element.innerHTML = '';
      var t = this.element.cloneNode(!0);
      this.element.parentNode.replaceChild(t, this.element), (this.element = t);
    }
  }
  onInit(t) {
    return this._.on('init', (e, i) => t.call(e, i));
  }
  onChanged(t) {
    return this._.on('changed', (e, i) => t.call(e, i));
  }
  onUndoRedoChanged(t) {
    return this._.on('undo-redo-changed', (e, i) => t.call(e, i));
  }
  onSelectedShapeChanging(t) {
    return this._.on('selected-shape-changing', (e, i) => t.call(e, i));
  }
  onSelectedShapesChanged(t) {
    return this._.on('selected-shapes-changed', (e, i) => t.call(e, i));
  }
  onSelectedPortChange(t) {
    return this._.on('selected-port-change', (e, i) => t.call(e, i));
  }
  onShortcut(t) {
    return this._.on('shortcut', (e, i) => t.call(e, i));
  }
  onMenuItemClick(t) {
    return this._.on('menu-item-click', (e, i) => t.call(e, i));
  }
  onLinkPoints(t) {
    return this._.on('link-points', (e, i) => t.call(e, i));
  }
  onLinkClick(t) {
    return this._.on('link-click', (e, i) => t.call(e, i));
  }
  onShapeDoubleClick(t) {
    return this._.on('shape-db-click', (e, i) => t.call(e, i));
  }
  onShapeClick(t) {
    return this._.on('shape-click', (e, i) => t.call(e, i));
  }
  onSvgClick(t) {
    return this._.on('svg-click', (e, i) => t.call(e, i));
  }
  onFieldChange(t) {
    return this._.on('field-change', (e, i) => t.call(e, i));
  }
};
void 0 === FlowChart && (FlowChart = {}),
  (FlowChart.VERSION = '1.01.77'),
  'undefined' != typeof module && (module.exports = FlowChart),
  (FlowChart.private = class {
    chart;
    mouseActions;
    keysPressed;
    mouseOverShape;
    mouseOverShapeType;
    touchendEnabledDevice;
    uid;
    useChangeListener;
    initialized;
    changedTimeout;
    changedArgs;
    selectedPortShape;
    selectedPort;
    lastAddedTemplateIdFormPortShapeBar;
    changeFillPressedIndexes;
    changeFillPressedTimeout;
    makeShapesVisibleInterval;
    svgBCR;
    shortcuts;
    static defaultOptions() {
      return {
        mode: 'light',
        startPosition: FlowChart.startPosition.center,
        startScale: 1,
        interactive: !0,
        loadFromSession: !1,
        useSession: !0,
        statusBar: !0,
        colors: ['#039BE5', '#F57C00', '#FFCA28'],
        scaleMax: 4,
        scaleMin: 0.5,
        selectable: !0,
        editable: !0,
        nodeSeparation: 100,
        zoom: { speed: 120, smooth: 12 },
      };
    }
    static countFlowCharts = 0;
    constructor(t) {
      (this.chart = t),
        (this.shortcuts = JSON.parse(FlowChart.private.safeStringify(FlowChart.shortcuts))),
        (this.mouseActions = []),
        (this.keysPressed = []),
        (this.matchedShortcuts = []),
        (this.mouseOverShape = null),
        (this.mouseOverShapeType = null),
        (this.touchendEnabledDevice = !1),
        (this.useChangeListener = !0),
        (this.initialized = !1),
        (this.changedTimeout = null),
        (this.changedArgs = { properties: [] }),
        (this.selectedPortShape = null),
        (this.selectedPort = null),
        (this.uid = window.location.pathname + '/flow-chart/' + FlowChart.private.countFlowCharts),
        FlowChart.private.countFlowCharts++,
        (this.changeFillPressedIndexes = []),
        (this.changeFillPressedTimeout = null),
        (this.makeShapesVisibleInterval = null),
        this.init();
    }
    snap() {
      this.useChangeListener && (this.changedTimeout || (this.putInUndoStack(), this.clearRedo()));
    }
    addNodeWithLink(t, e, i) {
      var a = { templateId: e };
      (a = this.chart.nodes.add(a)).element.style.opacity = 0;
      var o = this.chart.links.getByShape(t.shape),
        s = [];
      for (var l of o)
        this.chart.ports.getByLink(l).fromPort == t &&
          (n = this.chart.nodes.get(l.to)) &&
          s.push(n.id);
      var h = [];
      for (var n of this.chart.nodes) h.push({ x: n.x, y: n.y, w: n.width, h: n.height, id: n.id });
      FlowChart.private.devin(
        {
          nodeDiscriptors: h,
          neighborNodeIds: s,
          newNodeId: a.id,
          parentNodeId: t.shape.id,
          position: t.position,
          options: this.chart.options,
        },
        (e) => {
          var o = [],
            s = [],
            l = [],
            h = this.chart.scale;
          for (var n of e) {
            var d = this.chart.nodes.get(n.id),
              p = { x: n.x, y: n.y, opacity: 1 };
            if (a == d) {
              var c = { x: n.x, y: n.y, opacity: 0 };
              switch (t.position) {
                case FlowChart.position.left:
                  c.x += 8 / h;
                  break;
                case FlowChart.position.right:
                  c.x -= 8 / h;
                  break;
                case FlowChart.position.top:
                  c.y += 8 / h;
                  break;
                case FlowChart.position.bottom:
                  c.y -= 8 / h;
                  break;
                case FlowChart.position.topLeft:
                  (c.y += 8 / h), (c.x += 8 / h);
                  break;
                case FlowChart.position.bottomLeft:
                  (c.y -= 8 / h), (c.x += 8 / h);
                  break;
                case FlowChart.position.bottomRight:
                  (c.y -= 8 / h), (c.x -= 8 / h);
                  break;
                case FlowChart.position.topRight:
                  (c.y += 8 / h), (c.x -= 8 / h);
              }
              s.push(c);
            } else s.push({ x: d.x, y: d.y, opacity: 0 });
            l.push(p), (d.x = -1e4), (d.y = -1e4), o.push(d);
          }
          for (var f = 0; f < o.length; f++) (o[f].x = s[f].x), (o[f].y = s[f].y);
          this.animateShapes(o, s, l, () => {
            i && i.call(this.chart, a, m),
              this.makeShapesVisible([o], () => {
                var t = this.chart.editor.getFieldNames(a);
                t.length && this.chart.editor.edit(a, t[0]);
              });
          });
          var u = this.chart.ports.getByOpositeOfPosition(a.id, t.position)[0],
            m = {
              from: t.shape.id,
              to: u.shape.id,
              fromPort: t.id,
              toPort: u.id,
              templateId: 'rounded',
            };
          m = this.chart.links.add(m);
        }
      );
    }
    changed(t) {
      if (this.useChangeListener) {
        for (var i in t) {
          var r = t[i];
          (i = 'property') &&
            -1 == this.changedArgs.properties.indexOf(r) &&
            this.changedArgs.properties.push(r);
        }
        'selectedShapes' == t.property &&
          (FlowChart.events.publish('selected-shapes-changed', [this.chart]),
          this.chart.editor.clearFieldBorders()),
          this.changedTimeout && (clearTimeout(this.changedTimeout), (this.changedTimeout = null)),
          (this.changedTimeout = setTimeout(() => {
            this.changedTimeout = null;
            var t = this.chart.text(['shapes', 'links', 'viewBox', 'selectedShapes']);
            if (this.chart.options.useSession)
              try {
                sessionStorage.setItem(`${this.uid}_state`, t);
              } catch (t) {
                t.code == t.QUOTA_EXCEEDED_ERR && sessionStorage.clear(), console.error(t);
              }
            FlowChart.events.publish('changed', [this.chart, this.changedArgs]),
              (this.changedArgs = { properties: [] });
          }, FlowChart.CHANGED_TIMEOUT));
      }
    }
    load(t) {
      if (
        ((this.useChangeListener = !1),
        this.chart.nodes.clear(),
        this.chart.labels.clear(),
        this.chart.links.clear(),
        !this.initialized && this.chart.options.loadFromSession)
      ) {
        var e = sessionStorage.getItem(`${this.uid}_state`);
        e && (t = JSON.parse(e));
      }
      if (t) {
        if (
          (t.nodes && this.chart.nodes.addRange(t.nodes),
          t.links && this.chart.links.addRange(t.links),
          t.labels && this.chart.labels.addRange(t.labels),
          t.selectedShapes)
        )
          for (var i of t.selectedShapes) {
            var r = this.chart.getShape(i);
            r && (r.selected = !0);
          }
        t.viewBox && (this.setViewBox(t.viewBox), (this.initialized = !0));
      }
      this.initialized ||
        ((this.chart.scale = this.chart.options.startScale),
        this.chart.reposition(),
        (this.initialized = !0)),
        (this.useChangeListener = !0);
      var a = this.chart.text(['shapes', 'links', 'viewBox', 'selectedShapes']);
      if (this.chart.options.useSession)
        try {
          sessionStorage.setItem(`${this.uid}_state`, a);
        } catch (t) {
          t.code == t.QUOTA_EXCEEDED_ERR && sessionStorage.clear(), console.error(t);
        }
    }
    alignShapes(t, e, i) {
      if (t.length) {
        (this.chart.selectedPortShape = null), t.length;
        var r = t[t.length - 1];
        i && (t.length, (r = t[0]));
        for (var a = 0; a < t.length; a++) {
          var o = t[a];
          e == FlowChart.position.top
            ? (o.y = r.y - r.height / 2 + o.height / 2)
            : e == FlowChart.align.bottom
              ? (o.y = r.y + r.height / 2 - o.height / 2)
              : e == FlowChart.align.left
                ? (o.x = r.x - r.width / 2 + o.width / 2)
                : e == FlowChart.align.right
                  ? (o.x = r.x + r.width / 2 - o.width / 2)
                  : e == FlowChart.align.vertically
                    ? (o.x = r.x)
                    : e == FlowChart.align.horizontally && (o.y = r.y);
        }
      }
    }
    getShape(t) {
      var e = this.chart.nodes.get(t);
      return e || (e = this.chart.labels.get(t)), e;
    }
    generateId() {
      for (var t = this.chart.nodes.length + this.chart.labels.length; ; ) {
        if (!this.chart.nodes.contains(t) && !this.chart.labels.contains(t)) return t;
        t++;
      }
    }
    init() {
      this.chart.element.classList.add('bfc-' + this.chart.mode),
        this.chart.element.classList.add('frame'),
        (this.chart.element.innerHTML = ` ${FlowChart.css()}\n                                <svg class="bfc-svg bfc-${this.chart.options.mode}">                                \n                                    <defs></defs>                                \n                                    <g data-layer="-3"></g>\n                                    <g data-layer="-2"></g>\n                                    <g data-layer="-1"></g>\n                                    <foreignObject class="bfc-html" x="90000" y="90000" width="10000" height="10000"><div data-test-elastic-size style="height: initial; display: inline-block;" class="bfc-flex-center"></div></foreignObject>\n                                </svg>\n                                <div data-statusbar class="bfc-statusbar">\n                                    &nbsp;\n                                </div>\n                                <div data-shapebar class="bfc-shapebar" style="display: none;"></div>\n                                <div data-colorbar class="bfc-colorbar" style="display: none;"></div>\n                                <div data-menubar class="bfc-menubar bfc-horizontal-bar" style="display: none;"></div>${FlowChart.private.logo(this.chart.options.logoSvg)}`),
        (this.chart.svgElement = this.chart.element.querySelector('.bfc-svg')),
        (this.svgBCR = this.chart.svgElement.getBoundingClientRect());
      var t = [0, 0, this.svgBCR.width, this.svgBCR.height];
      this.chart.svgElement.setAttribute('viewBox', t.join(',')),
        this.chart.menuBar.init(),
        this.chart.shapeBar.init(),
        this.chart.colorBar.init(),
        this.chart.statusBar.init(),
        this.addListeners();
    }
    getViewBox = function () {
      var t = null;
      return this.chart.svgElement
        ? ((t = (t = '[' + (t = this.chart.svgElement.getAttribute('viewBox')) + ']').replace(
            /\ /g,
            ','
          )),
          (t = JSON.parse(t)))
        : null;
    };
    setViewBox(t) {
      isNaN(t[2]) && console.log('not ok'),
        this.chart.svgElement.setAttribute('viewBox', t.toString());
      var e = FlowChart.private.getScale(t, this.svgBCR.width, this.svgBCR.height);
      this.updatePortsElement(e);
    }
    getScale() {
      if (this.svgBCR.width > 0 && this.svgBCR.height > 0) {
        var t = FlowChart.private.getScale(
          this.chart.viewBox,
          this.svgBCR.width,
          this.svgBCR.height
        );
        return isNaN(t), t;
      }
      return (
        console.log(
          `setViewBox -> this.svgBCR.width: ${this.svgBCR.width}; this.svgBCR.height: ${this.svgBCR.height};`
        ),
        0
      );
    }
    on(t, e) {
      return FlowChart.events.on(t, e, this.uid), this.chart;
    }
    getSizeOfHTML(t) {
      t && (t = t.replaceAll('contenteditable', ' '));
      var e = this.chart.svgElement.querySelector('[data-test-elastic-size]');
      e.innerHTML = t;
      var i = e.getBoundingClientRect(),
        r = this.chart.scale;
      return { width: i.width / r + 6, height: i.height / r + 6 };
    }
    getActiveComponentTypes() {
      if (null != this.chart.selectedPort) return ['port-shape-bar'];
      if (this.chart.editor.hasActiveField()) return ['field'];
      var t = [];
      return (
        this.chart.selectedShapes.nodes.length && t.push('node'),
        this.chart.selectedShapes.labels.length && t.push('label'),
        t.length
          ? (t.push('shape'),
            this.chart.selectedShapes.nodes.length == this.chart.nodes.length &&
              t.push('all-nodes'),
            t)
          : 'canvas'
      );
    }
    zoom(t, e, i, r) {
      var o = this.chart.viewBox,
        s = o,
        l = o[2],
        h = o[3];
      !0 === t
        ? ((o[2] = o[2] / FlowChart.SCALE_FACTOR), (o[3] = o[3] / FlowChart.SCALE_FACTOR))
        : !1 === t
          ? ((o[2] = o[2] * FlowChart.SCALE_FACTOR), (o[3] = o[3] * FlowChart.SCALE_FACTOR))
          : ((o[2] = o[2] / t), (o[3] = o[3] / t)),
        e || (e = [50, 50]),
        (o[0] = s[0] - (o[2] - l) / (100 / e[0])),
        (o[1] = s[1] - (o[3] - h) / (100 / e[1]));
      var n = FlowChart.private.getScale(o, this.svgBCR.width, this.svgBCR.height);
      (o[2] = this.svgBCR.width / n), (o[3] = this.svgBCR.height / n);
      var d = this.chart.options;
      ((!0 === t && n < d.scaleMax) ||
        (!1 === t && n > d.scaleMin) ||
        (!1 !== t && !0 !== t && n < d.scaleMax && n > d.scaleMin)) &&
        (i
          ? (this._zoomTimeout && (clearTimeout(this._zoomTimeout), (this._zoomTimeout = null)),
            (this._zoomTimeout = FlowChart.animate(
              this.chart.svgElement,
              { viewBox: this.chart.viewBox },
              { viewBox: o },
              300,
              FlowChart.anim.outPow,
              () => {
                r && r.call(this.chart);
              }
            )))
          : ((this.chart.viewBox = o), r && r.call(this.chart)));
    }
    updateMatchedShortcuts(t, e, i) {
      this.matchedShortcuts = [];
      var r = this.getActiveComponentTypes();
      for (var a in this.shortcuts)
        if (!this.matchedShortcuts.includes(a)) {
          var o = !0,
            s = !0,
            l = !0,
            h = this.shortcuts[a];
          if (h.keysPressed)
            for (var n = 0; n < h.keysPressed.length; n++) {
              var d,
                p = h.keysPressed[n];
              d = -1 != p.indexOf('|') ? p.split('|') : [p];
              var c = !1;
              for (var f of d)
                0 == f.indexOf('!')
                  ? ((f = f.substring(1)), this.keysPressed.includes(f) || (c = !0))
                  : this.keysPressed.includes(f) && (c = !0);
              if (!c) {
                o = !1;
                break;
              }
              var u = !1;
              if (h.activeComponentType) {
                var m = h.activeComponentType.split('|');
                for (var g of m) r.includes(g) && (u = !0);
              } else u = !0;
              if (!u) {
                l = !1;
                break;
              }
            }
          else
            e && h.keyDown ? h.keyDown != e && (o = !1) : i && h.keyUp && h.keyUp != i && (o = !1);
          if (h.mouseActions)
            for (n = 0; n < h.mouseActions.length; n++)
              if (!this.mouseActions.includes(h.mouseActions[n])) {
                s = !1;
                break;
              }
          if (s && o && l) {
            this.matchedShortcuts.includes(a) || this.matchedShortcuts.push(a);
            var y = this.chart.selectedShapes,
              v = this.chart.selectedShapes.nodes;
            if ('move_selected_nodes_left' == a)
              (this.chart.selectedPortShape = null),
                this.chart.nodes._.move(v, FlowChart.move.left);
            else if ('move_selected_nodes_right' == a)
              (this.chart.selectedPortShape = null),
                this.chart.nodes._.move(v, FlowChart.move.right);
            else if ('move_selected_nodes_up' == a)
              (this.chart.selectedPortShape = null), this.chart.nodes._.move(v, FlowChart.move.up);
            else if ('move_selected_nodes_down' == a)
              (this.chart.selectedPortShape = null),
                this.chart.nodes._.move(v, FlowChart.move.down);
            else if ('align_tofirst_selected_nodes_bottom' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.bottom, !0);
            else if ('align_tofirst_selected_nodes_top' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.top, !0);
            else if ('align_tofirst_selected_nodes_left' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.left, !0);
            else if ('align_tofirst_selected_nodes_right' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.right, !0);
            else if ('align_tofirst_selected_nodes_horizontally' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.horizontally, !0);
            else if ('align_tofirst_selected_nodes_vertically' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.vertically, !0);
            else if ('align_tolast_selected_nodes_bottom' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.bottom, !1);
            else if ('align_tolast_selected_nodes_top' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.top, !1);
            else if ('align_tolast_selected_nodes_left' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.left, !1);
            else if ('align_tolast_selected_nodes_right' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.right, !1);
            else if ('align_tolast_selected_nodes_horizontally' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.horizontally, !1);
            else if ('align_tolast_selected_nodes_vertically' == a)
              t.preventDefault(), this.chart.alignShapes(y, FlowChart.align.vertically, !1);
            else if ('remove_selected_shapes' == a)
              this.chart.nodes.removeRange(this.chart.selectedShapes.nodes),
                this.chart.labels.removeRange(this.chart.selectedShapes.labels);
            else if ('select_all_nodes' == a)
              for (var w of (t.preventDefault(), this.chart.nodes))
                'label' != w.type && this.chart.selectedShapes.add(w);
            else if ('undo' == a)
              this.chart._.undo(), this.chart.menuBar._.simulateMouseClickOnKeydown('undo');
            else if ('redo' == a)
              this.chart._.redo(), this.chart.menuBar._.simulateMouseClickOnKeydown('redo');
            else if ('open_up_port' == a) this.showPortShapeBarUI(FlowChart.position.top);
            else if ('open_down_port' == a) this.showPortShapeBarUI(FlowChart.position.bottom);
            else if ('open_left_port' == a) this.showPortShapeBarUI(FlowChart.position.left);
            else if ('open_right_port' == a) this.showPortShapeBarUI(FlowChart.position.right);
            else if ('navigate_port_down' == a)
              t.preventDefault(), this.navigatePortShapeBarItems(FlowChart.position.bottom);
            else if ('navigate_port_left' == a)
              t.preventDefault(), this.navigatePortShapeBarItems(FlowChart.position.left);
            else if ('navigate_port_right' == a)
              t.preventDefault(), this.navigatePortShapeBarItems(FlowChart.position.right);
            else if ('navigate_port_up' == a)
              t.preventDefault(), this.navigatePortShapeBarItems(FlowChart.position.top);
            else if ('add_shape' == a)
              this.chart.editor.blur(),
                t.preventDefault(),
                this.chart._.createNodeFromPorsShapeBarItem();
            else if ('edit_next_field' == a)
              t.preventDefault(), this.chart.editor.selectNextField();
            else if ('exit_edit_field' == a) this.chart.editor.blur();
            else if ('close_port_shape_bar' == a) this.chart.selectedPort = null;
            else if ('deleselect_shapes' == a) this.chart.selectedShapes.clear();
            else if ('edit_shape' == a) {
              var C = this.chart.selectedShapes.last;
              t.preventDefault(), this.chart.editor.editFirstFieldIfAny(C);
            } else if ('select_node_above' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeAbove(!0);
            else if ('select_node_below' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeBelow(!0);
            else if ('select_node_left' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeLeft(!0);
            else if ('select_node_right' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeRight(!0);
            else if ('select_nodes_above' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeAbove(!1);
            else if ('select_nodes_below' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeBelow(!1);
            else if ('select_nodes_left' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeLeft(!1);
            else if ('select_nodes_right' == a)
              t.preventDefault(),
                this.chart.editor.blur(),
                this.chart.selectedShapes.selectNodeRight(!1);
            else if ('paint_node' == a) {
              if (null != e) {
                var b = Number.parseInt(e) - 1;
                this.changeFill(b), this.chart.colorBar._.simulateMouseClickOnKeydown(`color-${b}`);
              }
            } else if ('fit_to_page' == a) this.chart.reposition(FlowChart.startPosition.fit);
            else if ('replace_div_with_br_on_enter' == a) {
              for (var x = t.target; x && x.hasAttribute && !x.hasAttribute('data-shape-id'); )
                x = x.parentNode;
              if (x) {
                var F = x.getAttribute('data-shape-id');
                if (this.chart.selectedShapes.contains(F)) {
                  if (13 == t.keyCode) {
                    t.preventDefault();
                    const e = window.getSelection(),
                      i = e.getRangeAt(0);
                    var I = document.getSelection().anchorNode.parentNode.nodeName.toUpperCase();
                    switch (I) {
                      case 'P':
                      case 'DIV':
                      default:
                        I = 'BR';
                        break;
                      case 'SPAN':
                        I = 'span';
                        break;
                      case 'BR':
                        I = null;
                    }
                    const r = document.createElement(I);
                    i.deleteContents(),
                      i.insertNode(r),
                      'BR' === I
                        ? (i.setStartAfter(r), i.setEndAfter(r))
                        : (i.setStart(r, 0), i.setEnd(r, 0));
                    const a = document.createTextNode('​');
                    i.insertNode(a),
                      i.setStartBefore(a),
                      i.setEndBefore(a),
                      e.removeAllRanges(),
                      e.addRange(i),
                      t.stopPropagation();
                  }
                  t.target.value = t.target.innerHTML;
                }
              }
            }
            FlowChart.events.publish('shortcut', [this.chart, { name: a, event: t }]);
          }
        }
    }
    changeFill(t) {
      t = Number.parseInt(t) + 1;
      -1 == this.changeFillPressedIndexes.indexOf(t) && this.changeFillPressedIndexes.push(t),
        this.changeFillPressedTimeout &&
          (clearTimeout(this.changeFillPressedTimeout), (this.changeFillPressedTimeout = null)),
        (this.changeFillPressedTimeout = setTimeout(() => {
          this.changeFillPressedIndexes = [];
        }, 500));
      for (var i = '', r = 0; r < this.changeFillPressedIndexes.length; r++)
        i += this.changeFillPressedIndexes[r].toString();
      t = Number.parseInt(i) - 1;
      for (var a = this.chart.options.colors[t]; !a && i.length; )
        (i = i.substring(1)), (t = Number.parseInt(i) - 1), (a = this.chart.options.colors[t]);
      if (a) for (var o of this.chart.selectedShapes) o.fill != a && (o.fill = a);
    }
  }),
  void 0 === FlowChart && (FlowChart = {}),
  (FlowChart.position = Object.freeze({
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    topLeft: 'topLeft',
    topRight: 'topRight',
    bottomLeft: 'bottomLeft',
    bottomRight: 'bottomRight',
  })),
  (FlowChart.align = Object.freeze({
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    horizontally: 'horizontally',
    vertically: 'vertically',
  })),
  (FlowChart.move = Object.freeze({ up: 'up', down: 'down', left: 'left', right: 'right' })),
  (FlowChart.direction = Object.freeze({ vertical: 'vertical', horizontal: 'horizontal' })),
  (FlowChart.startPosition = Object.freeze({
    none: 'none',
    fitHeight: 'fitHeight',
    fitWidth: 'fitWidth',
    fit: 'fit',
    fit1: 'fit1',
    centerShapes: 'centerShapes',
    centerTop: 'centerTop',
    centerBottom: 'centerBottom',
    centerLeft: 'centerLeft',
    centerRight: 'centerRight',
    center: 'center',
  })),
  (FlowChart.private.animate = (t, e, i, r, a, o, s) => {
    var l,
      h = 10,
      n = 1,
      d = r / h + 1;
    return (
      document.getElementsByTagName('g'),
      Array.isArray(t) || (t = [t]),
      Array.isArray(e) || (e = [e]),
      Array.isArray(i) || (i = [i]),
      (l = setInterval(() => {
        for (var p = 0; p < t.length; p++)
          for (var c in i[p]) {
            var f = ['top', 'left', 'right', 'bottom', 'width', 'height'].includes(c.toLowerCase())
              ? 'px'
              : '';
            if ('node' == t[p].type || 'label' == t[p].type) {
              var u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c];
              switch (c) {
                case 'x':
                case 'y':
                case 'width':
                case 'height':
                case 'opacity':
                  t[p][c] = u;
                  break;
                default:
                  t[p].element.style[c] = u;
              }
            } else
              switch (c) {
                case 'd':
                  var m = a((n * h - h) / r) * (i[p][c][0] - e[p][c][0]) + e[p][c][0],
                    g = a((n * h - h) / r) * (i[p][c][1] - e[p][c][1]) + e[p][c][1];
                  t[p].setAttribute('d', t[p].getAttribute('d') + ' L' + m + ' ' + g);
                  break;
                case 'r':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p].setAttribute('r', u);
                  break;
                case 'x1':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p].setAttribute('x1', u);
                  break;
                case 'x2':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p].setAttribute('x2', u);
                  break;
                case 'y1':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p].setAttribute('y1', u);
                  break;
                case 'y2':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p].setAttribute('y2', u);
                  break;
                case 'rotate3d':
                  if (i[p][c]) {
                    var y = e[p][c],
                      v = i[p][c],
                      w = [0, 0, 0, 0];
                    for (var C in y) w[C] = a((n * h - h) / r) * (v[C] - y[C]) + y[C];
                    t[p].style.transform = 'rotate3d(' + w.toString() + 'deg)';
                  }
                  break;
                case 'transform':
                  if (i[p][c]) {
                    for (var C in ((y = e[p][c]), (v = i[p][c]), (w = [0, 0, 0, 0, 0, 0]), y))
                      w[C] = a((n * h - h) / r) * (v[C] - y[C]) + y[C];
                    t[p].hasAttribute('transform')
                      ? t[p].setAttribute('transform', 'matrix(' + w.toString() + ')')
                      : (t[p].style.transform = 'matrix(' + w.toString() + ')');
                  }
                  break;
                case 'translate':
                  if (i[p][c]) {
                    for (var C in ((y = e[p][c]), (v = i[p][c]), (w = [0, 0]), y))
                      w[C] = a((n * h - h) / r) * (v[C] - y[C]) + y[C];
                    t[p].setAttribute('transform', 'translate(' + w.toString() + ')');
                  }
                  break;
                case 'viewBox':
                  if (i[p][c]) {
                    for (var C in ((y = e[p][c]), (v = i[p][c]), (w = [0, 0, 0, 0]), y))
                      w[C] = a((n * h - h) / r) * (v[C] - y[C]) + y[C];
                    t[p].setAttribute('viewBox', w.toString());
                  }
                  break;
                case 'margin':
                  if (i[p][c]) {
                    for (var C in ((y = e[p][c]), (v = i[p][c]), (w = [0, 0, 0, 0]), y))
                      w[C] = a((n * h - h) / r) * (v[C] - y[C]) + y[C];
                    var b = '';
                    for (C = 0; C < w.length; C++) b += Number.parseInt(w[C]) + 'px ';
                    t[p] && t[p].style && (t[p].style[c] = b);
                  }
                  break;
                case 'scrollY':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]), t[p].scrollTo(0, u);
                  break;
                case 'stdDeviation':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p].setAttribute('stdDeviation', u);
                  break;
                case 'baseFrequency':
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p].setAttribute('baseFrequency', u);
                  break;
                default:
                  (u = a((n * h - h) / r) * (i[p][c] - e[p][c]) + e[p][c]),
                    t[p] && t[p].style && (t[p].style[c] = u + f);
              }
          }
        s && s(), (n += 1) > d + 1 && (clearInterval(l), o && o(t));
      }, h))
    );
  }),
  (FlowChart.private.linkFromTo = (t, e, i, r, a) => {
    var o = [];
    if (i.position == FlowChart.position.right && r.position == FlowChart.position.left)
      if (t.left + t.width + FlowChart.LINK_DITSNANCE < e.left - FlowChart.LINK_DITSNANCE) {
        var s = t.left + t.width + (e.left - (t.left + t.width)) / 2;
        o.push({ x: i.x, y: i.y }),
          o.push({ x: s, y: i.y }),
          o.push({ x: s, y: r.y }),
          o.push({ x: r.x, y: r.y });
      } else if (t.top - FlowChart.LINK_DITSNANCE > e.top + e.height + FlowChart.LINK_DITSNANCE) {
        var l = t.top + t.height + (e.top - (t.top + t.height)) / 2;
        o.push({ x: i.x, y: i.y }),
          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: i.y }),
          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: l }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: l }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: r.y }),
          o.push({ x: r.x, y: r.y });
      } else if (t.top + t.height + FlowChart.LINK_DITSNANCE < e.top - FlowChart.LINK_DITSNANCE)
        (l = e.top + e.height + (t.top - (e.top + e.height)) / 2),
          o.push({ x: i.x, y: i.y }),
          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: i.y }),
          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: l }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: l }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: r.y }),
          o.push({ x: r.x, y: r.y });
      else if (
        i.y <= r.y &&
        t.left - FlowChart.LINK_DITSNANCE > e.left + e.width + FlowChart.LINK_DITSNANCE
      ) {
        var h = Math.min(t.top, e.top);
        o.push({ x: i.x, y: i.y }),
          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: i.y }),
          o.push({
            x: t.left + t.width + FlowChart.LINK_DITSNANCE,
            y: h - FlowChart.LINK_DITSNANCE,
          }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: h - FlowChart.LINK_DITSNANCE }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: r.y }),
          o.push({ x: r.x, y: r.y });
      } else if (
        i.y > r.y &&
        t.left + FlowChart.LINK_DITSNANCE > e.left + e.width + FlowChart.LINK_DITSNANCE
      ) {
        var n = Math.max(t.top + t.height, e.top + e.height);
        o.push({ x: i.x, y: i.y }),
          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: i.y }),
          o.push({
            x: t.left + t.width + FlowChart.LINK_DITSNANCE,
            y: n + FlowChart.LINK_DITSNANCE,
          }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: n + FlowChart.LINK_DITSNANCE }),
          o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: r.y }),
          o.push({ x: r.x, y: r.y });
      } else o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y });
    else if (i.position == FlowChart.position.left && r.position == FlowChart.position.right)
      t.left - FlowChart.LINK_DITSNANCE > e.left + e.width + FlowChart.LINK_DITSNANCE
        ? ((s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
          o.push({ x: i.x, y: i.y }),
          o.push({ x: s, y: i.y }),
          o.push({ x: s, y: r.y }),
          o.push({ x: r.x, y: r.y }))
        : t.top - FlowChart.LINK_DITSNANCE > e.top + e.height + FlowChart.LINK_DITSNANCE
          ? ((l = e.top + e.height + (t.top - (e.top + e.height)) / 2),
            o.push({ x: i.x, y: i.y }),
            o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
            o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: l }),
            o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: l }),
            o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: r.y }),
            o.push({ x: r.x, y: r.y }))
          : t.top + t.height + FlowChart.LINK_DITSNANCE < e.top - FlowChart.LINK_DITSNANCE
            ? ((l = t.top + t.height + (e.top - (t.top + t.height)) / 2),
              o.push({ x: i.x, y: i.y }),
              o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
              o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: l }),
              o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: l }),
              o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: r.y }),
              o.push({ x: r.x, y: r.y }))
            : i.y <= r.y &&
                t.left + t.width + FlowChart.LINK_DITSNANCE < e.left - FlowChart.LINK_DITSNANCE
              ? ((h = Math.min(t.top, e.top)),
                o.push({ x: i.x, y: i.y }),
                o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
                o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: h - FlowChart.LINK_DITSNANCE }),
                o.push({
                  x: e.left + e.width + FlowChart.LINK_DITSNANCE,
                  y: h - FlowChart.LINK_DITSNANCE,
                }),
                o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: r.y }),
                o.push({ x: r.x, y: r.y }))
              : i.y > r.y &&
                  t.left + t.width + FlowChart.LINK_DITSNANCE < e.left - FlowChart.LINK_DITSNANCE
                ? ((n = Math.max(t.top + t.height, e.top + e.height)),
                  o.push({ x: i.x, y: i.y }),
                  o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
                  o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: n + FlowChart.LINK_DITSNANCE }),
                  o.push({
                    x: e.left + e.width + FlowChart.LINK_DITSNANCE,
                    y: n + FlowChart.LINK_DITSNANCE,
                  }),
                  o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: r.y }),
                  o.push({ x: r.x, y: r.y }))
                : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }));
    else if (i.position == FlowChart.position.bottom && r.position == FlowChart.position.top)
      if (t.top + t.height + FlowChart.LINK_DITSNANCE < e.top - FlowChart.LINK_DITSNANCE)
        (l = t.top + t.height + (e.top - (t.top + t.height)) / 2),
          o.push({ x: i.x, y: i.y }),
          o.push({ x: i.x, y: l }),
          o.push({ x: r.x, y: l }),
          o.push({ x: r.x, y: r.y });
      else if (t.left + t.width + FlowChart.LINK_DITSNANCE < e.left - FlowChart.LINK_DITSNANCE)
        (s = t.left + t.width + (e.left - (t.left + t.width)) / 2),
          o.push({ x: i.x, y: i.y }),
          o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
          o.push({ x: s, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
          o.push({ x: s, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: r.y });
      else if (t.left - FlowChart.LINK_DITSNANCE > e.left + e.width + FlowChart.LINK_DITSNANCE)
        (s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
          o.push({ x: i.x, y: i.y }),
          o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
          o.push({ x: s, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
          o.push({ x: s, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: r.y });
      else if (
        i.x <= r.x &&
        t.top - FlowChart.LINK_DITSNANCE > e.top + e.height + FlowChart.LINK_DITSNANCE
      ) {
        var d = Math.min(t.left, e.left);
        o.push({ x: i.x, y: i.y }),
          o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
          o.push({
            x: d - FlowChart.LINK_DITSNANCE,
            y: t.top + t.height + FlowChart.LINK_DITSNANCE,
          }),
          o.push({ x: d - FlowChart.LINK_DITSNANCE, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: r.y });
      } else if (
        i.x > r.x &&
        t.top - FlowChart.LINK_DITSNANCE > e.top + e.height + FlowChart.LINK_DITSNANCE
      ) {
        var p = Math.max(t.left + t.width, e.left + e.width);
        o.push({ x: i.x, y: i.y }),
          o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
          o.push({
            x: p + FlowChart.LINK_DITSNANCE,
            y: t.top + t.height + FlowChart.LINK_DITSNANCE,
          }),
          o.push({ x: p + FlowChart.LINK_DITSNANCE, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
          o.push({ x: r.x, y: r.y });
      } else o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y });
    else
      i.position == FlowChart.position.top && r.position == FlowChart.position.bottom
        ? t.top - FlowChart.LINK_DITSNANCE > e.top + e.height + FlowChart.LINK_DITSNANCE
          ? ((l = e.top + e.height + (t.top - (e.top + e.height)) / 2),
            o.push({ x: i.x, y: i.y }),
            o.push({ x: i.x, y: l }),
            o.push({ x: r.x, y: l }),
            o.push({ x: r.x, y: r.y }))
          : t.left + t.width + FlowChart.LINK_DITSNANCE < e.left - FlowChart.LINK_DITSNANCE
            ? ((s = t.left + t.width + (e.left - (t.left + t.width)) / 2),
              o.push({ x: i.x, y: i.y }),
              o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
              o.push({ x: s, y: t.top - FlowChart.LINK_DITSNANCE }),
              o.push({ x: s, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
              o.push({ x: r.x, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
              o.push({ x: r.x, y: r.y }))
            : t.left - FlowChart.LINK_DITSNANCE > e.left + e.width + FlowChart.LINK_DITSNANCE
              ? ((s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
                o.push({ x: i.x, y: i.y }),
                o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                o.push({ x: s, y: t.top - FlowChart.LINK_DITSNANCE }),
                o.push({ x: s, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
                o.push({ x: r.x, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
                o.push({ x: r.x, y: r.y }))
              : i.x <= r.x &&
                  t.top + t.height + FlowChart.LINK_DITSNANCE < e.top - FlowChart.LINK_DITSNANCE
                ? ((d = Math.min(t.left, e.left)),
                  o.push({ x: i.x, y: i.y }),
                  o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                  o.push({ x: d - FlowChart.LINK_DITSNANCE, y: t.top - FlowChart.LINK_DITSNANCE }),
                  o.push({
                    x: d - FlowChart.LINK_DITSNANCE,
                    y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                  }),
                  o.push({ x: r.x, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
                  o.push({ x: r.x, y: r.y }))
                : i.x > r.x &&
                    t.top + t.height + FlowChart.LINK_DITSNANCE < e.top - FlowChart.LINK_DITSNANCE
                  ? ((p = Math.max(t.left + t.width, e.left + e.width)),
                    o.push({ x: i.x, y: i.y }),
                    o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                    o.push({
                      x: p + FlowChart.LINK_DITSNANCE,
                      y: t.top - FlowChart.LINK_DITSNANCE,
                    }),
                    o.push({
                      x: p + FlowChart.LINK_DITSNANCE,
                      y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                    }),
                    o.push({ x: r.x, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
                    o.push({ x: r.x, y: r.y }))
                  : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
        : i.position == FlowChart.position.bottom && r.position == FlowChart.position.left
          ? t.left + t.width + FlowChart.LINK_DITSNANCE > e.left - FlowChart.LINK_DITSNANCE &&
            t.left - FlowChart.LINK_DITSNANCE < e.left + e.width + FlowChart.LINK_DITSNANCE &&
            t.top + t.height + FlowChart.LINK_DITSNANCE > e.top - FlowChart.LINK_DITSNANCE &&
            t.top - FlowChart.LINK_DITSNANCE < e.top + e.height + FlowChart.LINK_DITSNANCE
            ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
            : i.y + FlowChart.LINK_DITSNANCE < r.y && i.x < e.left - FlowChart.LINK_DITSNANCE
              ? (o.push({ x: i.x, y: i.y }), o.push({ x: i.x, y: r.y }), o.push({ x: r.x, y: r.y }))
              : t.top + t.height + FlowChart.LINK_DITSNANCE < e.top - FlowChart.LINK_DITSNANCE
                ? ((l = t.top + t.height + (e.top - (t.top + t.height)) / 2),
                  o.push({ x: i.x, y: i.y }),
                  o.push({ x: i.x, y: l }),
                  o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: l }),
                  o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: r.y }),
                  o.push({ x: r.x, y: r.y }))
                : t.top + t.height + FlowChart.LINK_DITSNANCE > e.top - FlowChart.LINK_DITSNANCE &&
                    t.left + t.width + FlowChart.LINK_DITSNANCE > e.left - FlowChart.LINK_DITSNANCE
                  ? ((n = Math.max(t.top + t.height, e.top + e.height)),
                    (d = Math.min(t.left, e.left)),
                    o.push({ x: i.x, y: i.y }),
                    o.push({ x: i.x, y: n + FlowChart.LINK_DITSNANCE }),
                    o.push({ x: d - FlowChart.LINK_DITSNANCE, y: n + FlowChart.LINK_DITSNANCE }),
                    o.push({ x: d - FlowChart.LINK_DITSNANCE, y: r.y }),
                    o.push({ x: r.x, y: r.y }))
                  : t.top + t.height + FlowChart.LINK_DITSNANCE > e.top
                    ? ((s = t.left + t.width + (e.left - (t.left + t.width)) / 2),
                      o.push({ x: i.x, y: i.y }),
                      o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                      o.push({ x: s, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                      o.push({ x: s, y: r.y }),
                      o.push({ x: r.x, y: r.y }))
                    : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
          : i.position == FlowChart.position.bottom && r.position == FlowChart.position.right
            ? t.left + t.width + FlowChart.LINK_DITSNANCE > e.left - FlowChart.LINK_DITSNANCE &&
              t.left - FlowChart.LINK_DITSNANCE < e.left + e.width + FlowChart.LINK_DITSNANCE &&
              t.top + t.height + FlowChart.LINK_DITSNANCE > e.top - FlowChart.LINK_DITSNANCE &&
              t.top - FlowChart.LINK_DITSNANCE < e.top + e.height + FlowChart.LINK_DITSNANCE
              ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
              : i.y < r.y && i.x > e.left + e.width + FlowChart.LINK_DITSNANCE
                ? (o.push({ x: i.x, y: i.y }),
                  o.push({ x: i.x, y: r.y }),
                  o.push({ x: r.x, y: r.y }))
                : t.top + t.height + FlowChart.LINK_DITSNANCE <= e.top - FlowChart.LINK_DITSNANCE
                  ? ((l = t.top + t.height + (e.top - (t.top + t.height)) / 2),
                    o.push({ x: i.x, y: i.y }),
                    o.push({ x: i.x, y: l }),
                    o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: l }),
                    o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: r.y }),
                    o.push({ x: r.x, y: r.y }))
                  : t.top + t.height + FlowChart.LINK_DITSNANCE >
                        e.top - FlowChart.LINK_DITSNANCE &&
                      t.left - FlowChart.LINK_DITSNANCE <
                        e.left + e.width + FlowChart.LINK_DITSNANCE
                    ? ((n = Math.max(t.top + t.height, e.top + e.height)),
                      (p = Math.max(t.left + t.width, e.left + e.width)),
                      o.push({ x: i.x, y: i.y }),
                      o.push({ x: i.x, y: n + FlowChart.LINK_DITSNANCE }),
                      o.push({ x: p + FlowChart.LINK_DITSNANCE, y: n + FlowChart.LINK_DITSNANCE }),
                      o.push({ x: p + FlowChart.LINK_DITSNANCE, y: r.y }),
                      o.push({ x: r.x, y: r.y }))
                    : t.top + t.height + FlowChart.LINK_DITSNANCE > e.top
                      ? ((s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
                        o.push({ x: i.x, y: i.y }),
                        o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                        o.push({ x: s, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                        o.push({ x: s, y: r.y }),
                        o.push({ x: r.x, y: r.y }))
                      : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
            : i.position == FlowChart.position.top && r.position == FlowChart.position.left
              ? t.left + t.width + FlowChart.LINK_DITSNANCE > e.left - FlowChart.LINK_DITSNANCE &&
                t.left - FlowChart.LINK_DITSNANCE < e.left + e.width + FlowChart.LINK_DITSNANCE &&
                t.top + t.height + FlowChart.LINK_DITSNANCE > e.top - FlowChart.LINK_DITSNANCE &&
                t.top - FlowChart.LINK_DITSNANCE < e.top + e.height + FlowChart.LINK_DITSNANCE
                ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                : i.y > r.y && i.x < e.left - FlowChart.LINK_DITSNANCE
                  ? (o.push({ x: i.x, y: i.y }),
                    o.push({ x: i.x, y: r.y }),
                    o.push({ x: r.x, y: r.y }))
                  : t.top - FlowChart.LINK_DITSNANCE >= e.top + e.height + FlowChart.LINK_DITSNANCE
                    ? ((l = t.top + t.height + (e.top - (t.top + t.height)) / 2),
                      o.push({ x: i.x, y: i.y }),
                      o.push({ x: i.x, y: l }),
                      o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: l }),
                      o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: r.y }),
                      o.push({ x: r.x, y: r.y }))
                    : t.top - FlowChart.LINK_DITSNANCE <
                          e.top + e.height + FlowChart.LINK_DITSNANCE &&
                        t.left + t.width + FlowChart.LINK_DITSNANCE >
                          e.left - FlowChart.LINK_DITSNANCE
                      ? ((h = Math.min(t.top, e.top)),
                        (d = Math.min(t.left, e.left)),
                        o.push({ x: i.x, y: i.y }),
                        o.push({ x: i.x, y: h - FlowChart.LINK_DITSNANCE }),
                        o.push({
                          x: d - FlowChart.LINK_DITSNANCE,
                          y: h - FlowChart.LINK_DITSNANCE,
                        }),
                        o.push({ x: d - FlowChart.LINK_DITSNANCE, y: r.y }),
                        o.push({ x: r.x, y: r.y }))
                      : t.top + FlowChart.LINK_DITSNANCE < e.top + e.height
                        ? ((s = t.left + t.width + (e.left - (t.left + t.width)) / 2),
                          o.push({ x: i.x, y: i.y }),
                          o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                          o.push({ x: s, y: t.top - FlowChart.LINK_DITSNANCE }),
                          o.push({ x: s, y: r.y }),
                          o.push({ x: r.x, y: r.y }))
                        : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
              : i.position == FlowChart.position.top && r.position == FlowChart.position.right
                ? t.left + t.width + FlowChart.LINK_DITSNANCE > e.left - FlowChart.LINK_DITSNANCE &&
                  t.left - FlowChart.LINK_DITSNANCE < e.left + e.width + FlowChart.LINK_DITSNANCE &&
                  t.top + t.height + FlowChart.LINK_DITSNANCE > e.top - FlowChart.LINK_DITSNANCE &&
                  t.top - FlowChart.LINK_DITSNANCE < e.top + e.height + FlowChart.LINK_DITSNANCE
                  ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                  : i.y - FlowChart.LINK_DITSNANCE > r.y &&
                      i.x > e.left + e.width + FlowChart.LINK_DITSNANCE
                    ? (o.push({ x: i.x, y: i.y }),
                      o.push({ x: i.x, y: r.y }),
                      o.push({ x: r.x, y: r.y }))
                    : t.top - FlowChart.LINK_DITSNANCE > e.top + e.height + FlowChart.LINK_DITSNANCE
                      ? ((l = t.top + t.height + (e.top - (t.top + t.height)) / 2),
                        o.push({ x: i.x, y: i.y }),
                        o.push({ x: i.x, y: l }),
                        o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: l }),
                        o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: r.y }),
                        o.push({ x: r.x, y: r.y }))
                      : t.top - FlowChart.LINK_DITSNANCE <
                            e.top + e.height + FlowChart.LINK_DITSNANCE &&
                          t.left - FlowChart.LINK_DITSNANCE <
                            e.left + e.width + FlowChart.LINK_DITSNANCE
                        ? ((h = Math.min(t.top, e.top)),
                          (p = Math.max(t.left + t.width, e.left + e.width)),
                          o.push({ x: i.x, y: i.y }),
                          o.push({ x: i.x, y: h - FlowChart.LINK_DITSNANCE }),
                          o.push({
                            x: p + FlowChart.LINK_DITSNANCE,
                            y: h - FlowChart.LINK_DITSNANCE,
                          }),
                          o.push({ x: p + FlowChart.LINK_DITSNANCE, y: r.y }),
                          o.push({ x: r.x, y: r.y }))
                        : t.top + FlowChart.LINK_DITSNANCE < e.top + e.height
                          ? ((s = t.left + t.width + (e.left - (t.left + t.width)) / 2),
                            o.push({ x: i.x, y: i.y }),
                            o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                            o.push({ x: s, y: t.top - FlowChart.LINK_DITSNANCE }),
                            o.push({ x: s, y: r.y }),
                            o.push({ x: r.x, y: r.y }))
                          : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                : i.position == FlowChart.position.right && r.position == FlowChart.position.right
                  ? r.x < i.x
                    ? t.top - FlowChart.LINK_DITSNANCE > r.y ||
                      t.top + t.height + FlowChart.LINK_DITSNANCE < r.y
                      ? (o.push({ x: i.x, y: i.y }),
                        o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: i.y }),
                        o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: r.y }),
                        o.push({ x: r.x, y: r.y }))
                      : e.left + e.width + FlowChart.LINK_DITSNANCE <
                          t.left - FlowChart.LINK_DITSNANCE
                        ? ((s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
                          o.push({ x: i.x, y: i.y }),
                          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: i.y }),
                          o.push({
                            x: t.left + t.width + FlowChart.LINK_DITSNANCE,
                            y: t.top + t.height + FlowChart.LINK_DITSNANCE,
                          }),
                          o.push({ x: s, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                          o.push({ x: s, y: r.y }),
                          o.push({ x: r.x, y: r.y }))
                        : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                    : e.top - FlowChart.LINK_DITSNANCE > i.y ||
                        e.top + e.height + FlowChart.LINK_DITSNANCE < i.y
                      ? ((p = Math.max(t.left + t.width, e.left + e.width)),
                        o.push({ x: i.x, y: i.y }),
                        o.push({ x: p + FlowChart.LINK_DITSNANCE, y: i.y }),
                        o.push({ x: p + FlowChart.LINK_DITSNANCE, y: r.y }),
                        o.push({ x: r.x, y: r.y }))
                      : e.left + e.width - (t.left + t.width) > FlowChart.LINK_DITSNANCE
                        ? (o.push({ x: i.x, y: i.y }),
                          o.push({ x: t.left + t.width + FlowChart.LINK_DITSNANCE, y: i.y }),
                          o.push({
                            x: t.left + t.width + FlowChart.LINK_DITSNANCE,
                            y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                          }),
                          o.push({
                            x: e.left + e.width + FlowChart.LINK_DITSNANCE,
                            y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                          }),
                          o.push({ x: e.left + e.width + FlowChart.LINK_DITSNANCE, y: r.y }),
                          o.push({ x: r.x, y: r.y }))
                        : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                  : i.position == FlowChart.position.left && r.position == FlowChart.position.left
                    ? r.x > i.x
                      ? t.top - FlowChart.LINK_DITSNANCE > r.y ||
                        t.top + t.height + FlowChart.LINK_DITSNANCE < r.y
                        ? (o.push({ x: i.x, y: i.y }),
                          o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
                          o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: r.y }),
                          o.push({ x: r.x, y: r.y }))
                        : e.left - FlowChart.LINK_DITSNANCE >
                            t.left + t.width + FlowChart.LINK_DITSNANCE
                          ? ((s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
                            o.push({ x: i.x, y: i.y }),
                            o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
                            o.push({
                              x: t.left - FlowChart.LINK_DITSNANCE,
                              y: t.top + t.height + FlowChart.LINK_DITSNANCE,
                            }),
                            o.push({ x: s, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                            o.push({ x: s, y: r.y }),
                            o.push({ x: r.x, y: r.y }))
                          : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                      : e.top - FlowChart.LINK_DITSNANCE > i.y ||
                          e.top + e.height + FlowChart.LINK_DITSNANCE < i.y
                        ? ((d = Math.min(t.left, e.left)),
                          o.push({ x: i.x, y: i.y }),
                          o.push({ x: d - FlowChart.LINK_DITSNANCE, y: i.y }),
                          o.push({ x: d - FlowChart.LINK_DITSNANCE, y: r.y }),
                          o.push({ x: r.x, y: r.y }))
                        : t.left - (e.left + e.width) > FlowChart.LINK_DITSNANCE
                          ? (o.push({ x: i.x, y: i.y }),
                            o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
                            o.push({
                              x: t.left - FlowChart.LINK_DITSNANCE,
                              y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                            }),
                            o.push({
                              x: e.left - FlowChart.LINK_DITSNANCE,
                              y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                            }),
                            o.push({ x: e.left - FlowChart.LINK_DITSNANCE, y: r.y }),
                            o.push({ x: r.x, y: r.y }))
                          : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                    : i.position == FlowChart.position.top && r.position == FlowChart.position.top
                      ? r.y < i.y
                        ? t.left - FlowChart.LINK_DITSNANCE > r.x ||
                          t.left + t.width + FlowChart.LINK_DITSNANCE < r.x
                          ? (o.push({ x: i.x, y: i.y }),
                            o.push({ x: i.x, y: e.top - FlowChart.LINK_DITSNANCE }),
                            o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
                            o.push({ x: r.x, y: r.y }))
                          : e.top + e.height + FlowChart.LINK_DITSNANCE <
                              t.top - FlowChart.LINK_DITSNANCE
                            ? (o.push({ x: i.x, y: i.y }),
                              o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                              o.push({
                                x: e.left - FlowChart.LINK_DITSNANCE,
                                y: t.top - FlowChart.LINK_DITSNANCE,
                              }),
                              o.push({
                                x: e.left - FlowChart.LINK_DITSNANCE,
                                y: e.top - FlowChart.LINK_DITSNANCE,
                              }),
                              o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
                              o.push({ x: r.x, y: r.y }))
                            : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                        : e.left - FlowChart.LINK_DITSNANCE > i.x ||
                            e.left + e.width + FlowChart.LINK_DITSNANCE < i.x
                          ? ((h = Math.min(t.top, e.top)),
                            o.push({ x: i.x, y: i.y }),
                            o.push({ x: i.x, y: h - FlowChart.LINK_DITSNANCE }),
                            o.push({ x: r.x, y: h - FlowChart.LINK_DITSNANCE }),
                            o.push({ x: r.x, y: r.y }))
                          : e.top + e.height - (t.top + t.height) > FlowChart.LINK_DITSNANCE
                            ? (o.push({ x: i.x, y: i.y }),
                              o.push({ x: i.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                              o.push({
                                x: t.left - FlowChart.LINK_DITSNANCE,
                                y: t.top - FlowChart.LINK_DITSNANCE,
                              }),
                              o.push({
                                x: t.left - FlowChart.LINK_DITSNANCE,
                                y: e.top - FlowChart.LINK_DITSNANCE,
                              }),
                              o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
                              o.push({ x: r.x, y: r.y }))
                            : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                      : i.position == FlowChart.position.bottom &&
                          r.position == FlowChart.position.bottom
                        ? r.y < i.y
                          ? t.left - FlowChart.LINK_DITSNANCE > r.x ||
                            t.left + t.width + FlowChart.LINK_DITSNANCE < r.x
                            ? (o.push({ x: i.x, y: i.y }),
                              o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                              o.push({ x: r.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                              o.push({ x: r.x, y: r.y }))
                            : e.top + e.height + FlowChart.LINK_DITSNANCE <
                                t.top - FlowChart.LINK_DITSNANCE
                              ? (o.push({ x: i.x, y: i.y }),
                                o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                                o.push({
                                  x: t.left - FlowChart.LINK_DITSNANCE,
                                  y: t.top + t.height + FlowChart.LINK_DITSNANCE,
                                }),
                                o.push({
                                  x: t.left - FlowChart.LINK_DITSNANCE,
                                  y: t.top - FlowChart.LINK_DITSNANCE,
                                }),
                                o.push({ x: r.x, y: t.top - FlowChart.LINK_DITSNANCE }),
                                o.push({ x: r.x, y: r.y }))
                              : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                          : e.left - FlowChart.LINK_DITSNANCE > i.x ||
                              e.left + e.width + FlowChart.LINK_DITSNANCE < i.x
                            ? (o.push({ x: i.x, y: i.y }),
                              o.push({ x: i.x, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
                              o.push({ x: r.x, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
                              o.push({ x: r.x, y: r.y }))
                            : e.top + e.height - (t.top + t.height) > FlowChart.LINK_DITSNANCE
                              ? (o.push({ x: i.x, y: i.y }),
                                o.push({ x: i.x, y: t.top + t.height + FlowChart.LINK_DITSNANCE }),
                                o.push({
                                  x: e.left - FlowChart.LINK_DITSNANCE,
                                  y: t.top + t.height + FlowChart.LINK_DITSNANCE,
                                }),
                                o.push({
                                  x: e.left - FlowChart.LINK_DITSNANCE,
                                  y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                                }),
                                o.push({ x: r.x, y: e.top + e.height + FlowChart.LINK_DITSNANCE }),
                                o.push({ x: r.x, y: r.y }))
                              : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                        : i.position == FlowChart.position.left &&
                            r.position == FlowChart.position.bottom
                          ? e.left + e.width + FlowChart.LINK_DITSNANCE >
                              t.left - FlowChart.LINK_DITSNANCE &&
                            e.left - FlowChart.LINK_DITSNANCE <
                              t.left + t.width + FlowChart.LINK_DITSNANCE &&
                            e.top + e.height + FlowChart.LINK_DITSNANCE >
                              t.top - FlowChart.LINK_DITSNANCE &&
                            e.top - FlowChart.LINK_DITSNANCE <
                              t.top + t.height + FlowChart.LINK_DITSNANCE
                            ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                            : r.y + FlowChart.LINK_DITSNANCE < i.y &&
                                r.x < t.left - FlowChart.LINK_DITSNANCE
                              ? (o.push({ x: i.x, y: i.y }),
                                o.push({ x: r.x, y: i.y }),
                                o.push({ x: r.x, y: r.y }))
                              : e.top + e.height + FlowChart.LINK_DITSNANCE <
                                  t.top - FlowChart.LINK_DITSNANCE
                                ? ((l = e.top + e.height + (t.top - (e.top + e.height)) / 2),
                                  o.push({ x: i.x, y: i.y }),
                                  o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
                                  o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: l }),
                                  o.push({ x: r.x, y: l }),
                                  o.push({ x: r.x, y: r.y }))
                                : e.top + e.height + FlowChart.LINK_DITSNANCE >
                                      t.top - FlowChart.LINK_DITSNANCE &&
                                    e.left + e.width + FlowChart.LINK_DITSNANCE >
                                      t.left - FlowChart.LINK_DITSNANCE
                                  ? ((n = Math.max(e.top + e.height, t.top + t.height)),
                                    (d = Math.min(e.left, t.left)),
                                    o.push({ x: i.x, y: i.y }),
                                    o.push({ x: d - FlowChart.LINK_DITSNANCE, y: i.y }),
                                    o.push({
                                      x: d - FlowChart.LINK_DITSNANCE,
                                      y: n + FlowChart.LINK_DITSNANCE,
                                    }),
                                    o.push({ x: r.x, y: n + FlowChart.LINK_DITSNANCE }),
                                    o.push({ x: r.x, y: r.y }))
                                  : e.top + e.height + FlowChart.LINK_DITSNANCE > t.top
                                    ? ((s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
                                      o.push({ x: i.x, y: i.y }),
                                      o.push({ x: s, y: i.y }),
                                      o.push({
                                        x: s,
                                        y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                                      }),
                                      o.push({
                                        x: r.x,
                                        y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                                      }),
                                      o.push({ x: r.x, y: r.y }))
                                    : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                          : i.position == FlowChart.position.left &&
                              r.position == FlowChart.position.top
                            ? e.left + e.width + FlowChart.LINK_DITSNANCE >
                                t.left - FlowChart.LINK_DITSNANCE &&
                              e.left - FlowChart.LINK_DITSNANCE <
                                t.left + t.width + FlowChart.LINK_DITSNANCE &&
                              e.top + e.height + FlowChart.LINK_DITSNANCE >
                                t.top - FlowChart.LINK_DITSNANCE &&
                              e.top - FlowChart.LINK_DITSNANCE <
                                t.top + t.height + FlowChart.LINK_DITSNANCE
                              ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                              : r.y > i.y && r.x < t.left - FlowChart.LINK_DITSNANCE
                                ? (o.push({ x: i.x, y: i.y }),
                                  o.push({ x: r.x, y: i.y }),
                                  o.push({ x: r.x, y: r.y }))
                                : e.top - FlowChart.LINK_DITSNANCE >=
                                    t.top + t.height + FlowChart.LINK_DITSNANCE
                                  ? ((l = e.top + e.height + (t.top - (e.top + e.height)) / 2),
                                    o.push({ x: i.x, y: i.y }),
                                    o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: i.y }),
                                    o.push({ x: t.left - FlowChart.LINK_DITSNANCE, y: l }),
                                    o.push({ x: r.x, y: l }),
                                    o.push({ x: r.x, y: r.y }))
                                  : e.top - FlowChart.LINK_DITSNANCE <
                                        t.top + t.height + FlowChart.LINK_DITSNANCE &&
                                      e.left + e.width + FlowChart.LINK_DITSNANCE >
                                        t.left - FlowChart.LINK_DITSNANCE
                                    ? ((h = Math.min(e.top, t.top)),
                                      (d = Math.min(e.left, t.left)),
                                      o.push({ x: i.x, y: i.y }),
                                      o.push({ x: d - FlowChart.LINK_DITSNANCE, y: i.y }),
                                      o.push({
                                        x: d - FlowChart.LINK_DITSNANCE,
                                        y: h - FlowChart.LINK_DITSNANCE,
                                      }),
                                      o.push({ x: r.x, y: h - FlowChart.LINK_DITSNANCE }),
                                      o.push({ x: r.x, y: r.y }))
                                    : e.top + FlowChart.LINK_DITSNANCE < t.top + t.height
                                      ? ((s = e.left + e.width + (t.left - (e.left + e.width)) / 2),
                                        o.push({ x: i.x, y: i.y }),
                                        o.push({ x: s, y: i.y }),
                                        o.push({ x: s, y: e.top - FlowChart.LINK_DITSNANCE }),
                                        o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
                                        o.push({ x: r.x, y: r.y }))
                                      : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                            : i.position == FlowChart.position.right &&
                                r.position == FlowChart.position.bottom
                              ? e.left + e.width + FlowChart.LINK_DITSNANCE >
                                  t.left - FlowChart.LINK_DITSNANCE &&
                                e.left - FlowChart.LINK_DITSNANCE <
                                  t.left + t.width + FlowChart.LINK_DITSNANCE &&
                                e.top + e.height + FlowChart.LINK_DITSNANCE >
                                  t.top - FlowChart.LINK_DITSNANCE &&
                                e.top - FlowChart.LINK_DITSNANCE <
                                  t.top + t.height + FlowChart.LINK_DITSNANCE
                                ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                                : r.y < i.y && r.x > t.left + t.width + FlowChart.LINK_DITSNANCE
                                  ? (o.push({ x: i.x, y: i.y }),
                                    o.push({ x: r.x, y: i.y }),
                                    o.push({ x: r.x, y: r.y }))
                                  : e.top + e.height + FlowChart.LINK_DITSNANCE <=
                                      t.top - FlowChart.LINK_DITSNANCE
                                    ? ((l = e.top + e.height + (t.top - (e.top + e.height)) / 2),
                                      o.push({ x: i.x, y: i.y }),
                                      o.push({
                                        x: t.left + t.width + FlowChart.LINK_DITSNANCE,
                                        y: i.y,
                                      }),
                                      o.push({
                                        x: t.left + t.width + FlowChart.LINK_DITSNANCE,
                                        y: l,
                                      }),
                                      o.push({ x: r.x, y: l }),
                                      o.push({ x: r.x, y: r.y }))
                                    : e.top + e.height + FlowChart.LINK_DITSNANCE >
                                          t.top - FlowChart.LINK_DITSNANCE &&
                                        e.left - FlowChart.LINK_DITSNANCE <
                                          t.left + t.width + FlowChart.LINK_DITSNANCE
                                      ? ((n = Math.max(e.top + e.height, t.top + t.height)),
                                        (p = Math.max(e.left + e.width, t.left + t.width)),
                                        o.push({ x: i.x, y: i.y }),
                                        o.push({ x: p + FlowChart.LINK_DITSNANCE, y: i.y }),
                                        o.push({
                                          x: p + FlowChart.LINK_DITSNANCE,
                                          y: n + FlowChart.LINK_DITSNANCE,
                                        }),
                                        o.push({ x: r.x, y: n + FlowChart.LINK_DITSNANCE }),
                                        o.push({ x: r.x, y: r.y }))
                                      : e.top + e.height + FlowChart.LINK_DITSNANCE > t.top
                                        ? ((s =
                                            t.left + t.width + (e.left - (t.left + t.width)) / 2),
                                          o.push({ x: i.x, y: i.y }),
                                          o.push({ x: s, y: i.y }),
                                          o.push({
                                            x: s,
                                            y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                                          }),
                                          o.push({
                                            x: r.x,
                                            y: e.top + e.height + FlowChart.LINK_DITSNANCE,
                                          }),
                                          o.push({ x: r.x, y: r.y }))
                                        : (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                              : i.position == FlowChart.position.right &&
                                r.position == FlowChart.position.top &&
                                (e.left + e.width + FlowChart.LINK_DITSNANCE >
                                  t.left - FlowChart.LINK_DITSNANCE &&
                                e.left - FlowChart.LINK_DITSNANCE <
                                  t.left + t.width + FlowChart.LINK_DITSNANCE &&
                                e.top + e.height + FlowChart.LINK_DITSNANCE >
                                  t.top - FlowChart.LINK_DITSNANCE &&
                                e.top - FlowChart.LINK_DITSNANCE <
                                  t.top + t.height + FlowChart.LINK_DITSNANCE
                                  ? (o.push({ x: i.x, y: i.y }), o.push({ x: r.x, y: r.y }))
                                  : r.y - FlowChart.LINK_DITSNANCE > i.y &&
                                      r.x > t.left + t.width + FlowChart.LINK_DITSNANCE
                                    ? (o.push({ x: i.x, y: i.y }),
                                      o.push({ x: r.x, y: i.y }),
                                      o.push({ x: r.x, y: r.y }))
                                    : e.top - FlowChart.LINK_DITSNANCE >
                                        t.top + t.height + FlowChart.LINK_DITSNANCE
                                      ? ((l = e.top + e.height + (t.top - (e.top + e.height)) / 2),
                                        o.push({ x: i.x, y: i.y }),
                                        o.push({
                                          x: t.left + t.width + FlowChart.LINK_DITSNANCE,
                                          y: i.y,
                                        }),
                                        o.push({
                                          x: t.left + t.width + FlowChart.LINK_DITSNANCE,
                                          y: l,
                                        }),
                                        o.push({ x: r.x, y: l }),
                                        o.push({ x: r.x, y: r.y }))
                                      : e.top - FlowChart.LINK_DITSNANCE <
                                            t.top + t.height + FlowChart.LINK_DITSNANCE &&
                                          e.left - FlowChart.LINK_DITSNANCE <
                                            t.left + t.width + FlowChart.LINK_DITSNANCE
                                        ? ((h = Math.min(e.top, t.top)),
                                          (p = Math.max(e.left + e.width, t.left + t.width)),
                                          o.push({ x: i.x, y: i.y }),
                                          o.push({ x: p + FlowChart.LINK_DITSNANCE, y: i.y }),
                                          o.push({
                                            x: p + FlowChart.LINK_DITSNANCE,
                                            y: h - FlowChart.LINK_DITSNANCE,
                                          }),
                                          o.push({ x: r.x, y: h - FlowChart.LINK_DITSNANCE }),
                                          o.push({ x: r.x, y: r.y }))
                                        : e.top + FlowChart.LINK_DITSNANCE < t.top + t.height
                                          ? ((s =
                                              e.left + e.width + (t.left - (e.left + e.width)) / 2),
                                            o.push({ x: i.x, y: i.y }),
                                            o.push({ x: s, y: i.y }),
                                            o.push({ x: s, y: e.top - FlowChart.LINK_DITSNANCE }),
                                            o.push({ x: r.x, y: e.top - FlowChart.LINK_DITSNANCE }),
                                            o.push({ x: r.x, y: r.y }))
                                          : (o.push({ x: i.x, y: i.y }),
                                            o.push({ x: r.x, y: r.y })));
    var c = { points: o, fromShape: t, toShape: e, fromPort: i, toPort: r };
    return FlowChart.events.publish('link-points', [a, c]), c.points;
  }),
  (FlowChart.private.prototype.handlerKeyup = function (t) {
    var e = FlowChart.private.replaceRightLeftKeyCodes(t.code),
      i = t.key.toLowerCase(),
      r = this.keysPressed.indexOf(e);
    -1 != r && (this.keysPressed.splice(r, 1), this.updateMatchedShortcuts(t, void 0, i)),
      (this.matchedShortcuts.includes('move_selected_nodes_left') &&
        this.matchedShortcuts.includes('move_selected_nodes_right')) ||
        this.chart.nodes._.stopMoving(FlowChart.direction.horizontal),
      (this.matchedShortcuts.includes('move_selected_nodes_up') &&
        this.matchedShortcuts.includes('move_selected_nodes_down')) ||
        this.chart.nodes._.stopMoving(FlowChart.direction.vertical);
  }),
  (FlowChart.private.prototype.handlerKeydown = function (t) {
    var e = t.key.toLowerCase();
    'shift' == e &&
      (this.chart.selectedShapes._.arrayBeforeShiftPressed = this.chart.selectedShapes.slice());
    var i = FlowChart.private.replaceRightLeftKeyCodes(t.code);
    this.keysPressed.includes(i) ||
      (this.keysPressed.push(i), this.updateMatchedShortcuts(t, e, void 0));
  }),
  (FlowChart.private.prototype.handlerInput = function (t) {
    if (this.chart.editor.hasActiveField()) {
      for (var e = t.target; !e.hasAttribute('data-shape-id'); ) e = e.parentNode;
      var i = e.getAttribute('data-shape-id'),
        r = this.chart.getShape(i);
      if ((this.chart.editor.edit(r), r.canWidthFitContent || r.canHeightFitContent)) {
        for (var a = t.target; !a.hasAttribute || !a.hasAttribute('data-html-container'); )
          a = a.parentNode;
        var o = this.chart._.getSizeOfHTML(a.innerHTML);
        r.canWidthFitContent &&
          ('label' == r.type
            ? this.chart.labels._.setWidth(r, o.width)
            : this.chart.nodes._.setWidth(r, o.width)),
          r.canHeightFitContent &&
            ('label' == r.type
              ? this.chart.labels._.setHeight(r, o.height)
              : this.chart.nodes._.setHeight(r, o.height));
      }
    }
  }),
  (FlowChart.private.prototype.handlerDblclick = function (t) {
    for (var e = t.target; e && e.hasAttribute && e != this.chart.svgElement; ) {
      if (e.hasAttribute('data-link-id')) {
        var i = e.getAttribute('data-link-id'),
          r = this.chart.links.getById(i),
          a = FlowChart.private.getFirstPointIndexByMousePosition(t, this.chart.svgElement, r);
        FlowChart.direction.horizontal,
          r.points[a].x == r.points[a + 1].x && FlowChart.direction.vertical;
        for (var o = 0, s = 0; s < a; s++) {
          var l = r.points[s],
            h = r.points[s + 1];
          o += Math.hypot(h.x - l.x, h.y - l.y);
        }
        var n = this.chart.svgElement.createSVGPoint();
        (n.x = t.clientX),
          (n.y = t.clientY),
          (n = n.matrixTransform(this.chart.svgElement.getScreenCTM().inverse()));
        var d = (o += Math.hypot(n.x - r.points[a].x, n.y - r.points[a].y)) / (r.length / 100),
          p = {
            from: r.from,
            to: r.to,
            fromPort: r.fromPort,
            toPort: r.toPort,
            position: d,
            content: d,
          };
        return (p = this.chart.labels.add(p)), this.chart.editor.edit(p.id), void (p.selected = !0);
      }
      e = e.parentNode;
    }
  }),
  (FlowChart.private.prototype.handlerMousemove = function (t) {
    for (var e = t.target, i = null, r = null; e && e != this.element; ) {
      if (e && e.hasAttribute) {
        if (e.hasAttribute('data-link-id')) {
          (i = this.chart.links.getById(e.getAttribute('data-link-id'))), (r = 'link');
          break;
        }
        if (e.hasAttribute('data-shape-id')) {
          (i = this.chart.getShape(e.getAttribute('data-shape-id'))), (r = 'node');
          break;
        }
        if (e.hasAttribute('data-selector-shape-id')) {
          (i = this.chart.getShape(e.getAttribute('data-selector-shape-id'))), (r = 'node');
          break;
        }
        if (e.hasAttribute('data-ports-s-id')) {
          (i = this.chart.nodes.get(e.getAttribute('data-ports-s-id'))), (r = 'node');
          break;
        }
        if (e.hasAttribute('data-port-out-port')) {
          var a = e.getAttribute('data-port-out-port'),
            o = e.getAttribute('data-port-out-shape');
          (i = this.chart.ports.get(o, a)), (r = 'port');
          break;
        }
        if (e.hasAttribute('data-portsb-shape')) {
          (i = e.getAttribute('data-portsb-shape')), (r = 'portshapebart');
          break;
        }
      }
      e = e.parentNode;
    }
    null != this.mouseOverShapeType && null == i
      ? ('node' == this.mouseOverShapeType
          ? this.handlerMouseleaveOnShape(this.mouseOverShape)
          : 'port' == this.mouseOverShapeType ||
            'link' == this.mouseOverShapeType ||
            ('portshapebart' == this.mouseOverShapeType && this.handlerMouseleaveOnMiniShapeBar()),
        (this.mouseOverShape = null),
        (this.mouseOverShapeType = null))
      : FlowChart.private.safeStringify(this.mouseOverShape) !==
          FlowChart.private.safeStringify(i) &&
        (null != i
          ? 'node' == r
            ? ('port' == this.mouseOverShapeType
                ? this.handlerMouseleaveOnMiniShapeBar()
                : 'link' == this.mouseOverShapeType ||
                  ('portshapebart' == this.mouseOverShapeType &&
                    this.handlerMouseleaveOnMiniShapeBar()),
              this.handlerMouseenterOnShape(t, i))
            : 'port' == r
              ? ('node' == this.mouseOverShapeType ||
                  'link' == this.mouseOverShapeType ||
                  this.mouseOverShapeType,
                this.handlerMouseenterOnPortOut(t, i))
              : 'link' == r
                ? ('port' == this.mouseOverShapeType ||
                    'node' == this.mouseOverShapeType ||
                    this.mouseOverShapeType,
                  this.handlerMouseenterOnLink(t, i))
                : 'portshapebart' == r &&
                  ('port' == this.mouseOverShapeType ||
                    'node' == this.mouseOverShapeType ||
                    this.mouseOverShapeType)
          : this.mouseOverShape,
        (this.mouseOverShape = i),
        (this.mouseOverShapeType = r));
  }),
  (FlowChart.private.prototype.handlerTouchstartMousedown = function (t, e, i) {
    for (var r = e.target; r && r != this.chart.element; ) {
      if (r && r.classList && r.classList.contains && r.classList.contains('bfc-bar-move'))
        return void this.handlerTouchstartMousedownOnBarMove(t, e, i, r);
      if (r && r.hasAttribute && r.hasAttribute('data-selector-dot-2'))
        return void this.handlerTouchstartMousedownOnResizeDot(t, e, i, r);
      if (r && r.hasAttribute && r.hasAttribute('data-shapebar-item-id'))
        return void this.handlerDownOnShapeBarItem(e, i, r);
      if (r && r.hasAttribute && r.hasAttribute('data-shape-id')) {
        var a = this.chart.getShape(r.getAttribute('data-shape-id'));
        return (
          (a && 0 != a.movable) || this.handlerTouchstartMousedownOnSvg(t, e, i, r),
          void (
            a &&
            a.selectable &&
            this.chart.options.selectable &&
            this.handlerTouchstartMousedownOnShape(e, i, a, !0)
          )
        );
      }
      if (r && r.hasAttribute && r.hasAttribute('data-link-id')) {
        var o = r.getAttribute('data-link-id');
        return (
          o || this.handlerTouchstartMousedownOnSvg(t, e, i, r),
          void (
            o &&
            this.chart.options.selectable &&
            this.handlerTouchstartMousedownOnLink(e, i, o)
          )
        );
      }
      if (r && r.hasAttribute && r.hasAttribute('data-port-out-port'))
        return void this.handlerTouchstartMousedownOnPortOut(e, r, i);
      r == this.chart.svgElement && this.handlerTouchstartMousedownOnSvg(t, e, i, r),
        (r = r.parentNode);
    }
  }),
  (FlowChart.private.prototype.handlerTouchendClick = function (t) {
    var e,
      i = t.target;
    if (
      (i.hasAttribute('data-field-selector') && (e = i.getAttribute('data-field-selector')),
      this.chart.svgElement != i)
    )
      while (i && i.hasAttribute) {
        if (i.hasAttribute('data-shape-id')) {
          var r = i.getAttribute('data-shape-id'),
            a = this.chart.getShape(r);
          if (e) this.chart.editor.edit(a, e);
          else if (
            ((d = { event: t, shapeId: r }),
            !1 !== FlowChart.events.publish('shape-click', [this.chart, d]))
          ) {
            var o = this.chart.editor.getFieldNames(a);
            o.length ? this.chart.editor.edit(a, o[0]) : this.chart.editor.edit(a),
              this.handlerShapeClick(r, t);
          }
          return;
        }
        if (i.hasAttribute('data-menu-item')) {
          var s = i.getAttribute('data-menu-item');
          return (
            this.chart.menuBar._.handlerClick(t, s, i),
            void this.chart.colorBar._.handlerClick(t, s, i)
          );
        }
        if (i.hasAttribute('data-portshapebar-item-id')) {
          for (
            var l = i.getAttribute('data-portshapebar-item-id');
            !i.hasAttribute('data-portsb-shape');
          )
            i = i.parentNode;
          r = i.getAttribute('data-portsb-shape');
          var h = i.getAttribute('data-portsb-port'),
            n = this.chart.ports.get(r, h);
          return void this.addNodeWithLink(n, l);
        }
        i = i.parentNode;
      }
    else {
      this.chart.selectedShapes.clear();
      var d = { event: t };
      FlowChart.events.publish('svg-click', [this.chart, d]);
    }
  }),
  (FlowChart.private.prototype.handlerMouseenterOnLink = function (t, e) {
    var i = e,
      r = FlowChart.private.getFirstPointIndexByMousePosition(t, this.chart.svgElement, i),
      a = FlowChart.direction.horizontal;
    i.points[r].x == i.points[r + 1].x && (a = FlowChart.direction.vertical),
      t.target.classList.remove('bfc-cursor-row-resize'),
      t.target.classList.remove('bfc-cursor-col-resize'),
      a == FlowChart.direction.vertical
        ? t.target.classList.add('bfc-cursor-col-resize')
        : a == FlowChart.direction.horizontal && t.target.classList.add('bfc-cursor-row-resize');
  }),
  (FlowChart.private.prototype.handlerMouseenterOnShape = function (t, e) {
    this.handlerMouseenterOnShapeTimeOut &&
      (clearTimeout(this.handlerMouseenterOnShapeTimeOut),
      (this.handlerMouseenterOnShapeTimeOut = null)),
      (this.handlerMouseenterOnShapeTimeOut = setTimeout(() => {
        this.chart.selectedPortShape = e;
      }, 700));
  }),
  (FlowChart.private.prototype.handlerMouseleaveOnLink = (t) => {}),
  (FlowChart.private.prototype.handlerMouseleaveOnShape = function (t) {
    (this.chart.selectedPortShape = null),
      this.handlerMouseenterOnShapeTimeOut &&
        (clearTimeout(this.handlerMouseenterOnShapeTimeOut),
        (this.handlerMouseenterOnShapeTimeOut = null));
  }),
  (FlowChart.private.prototype.handlerMouseenterOnPortOut = function (t, e) {
    this.chart.selectedPort = e;
  }),
  (FlowChart.private.prototype.handlerMouseleaveOnPortOut = (t, e, i) => {}),
  (FlowChart.private.prototype.handlerMouseleaveOnMiniShapeBar = function () {
    (this.chart.selectedPort = null), (this.chart.selectedPortShape = null);
  }),
  (FlowChart.Menu = class {
    _;
    element;
    constructor(t) {
      (this._ = new FlowChart.Menu.private(t)), (this.element = null);
    }
    init() {}
    hide() {
      null != this.element &&
        (this.element.parentNode.removeChild(this.element), (this.element = null));
    }
    show(t, e, i, r) {
      var a = this;
      this.hide(), r || (r = this.menu);
      var o = '';
      for (var s in r) {
        var l = r[s].icon,
          h = r[s].text;
        void 0 === l && (l = FlowChart.icon[s] ? FlowChart.icon[s](24, 24, '#7A7A7A', 0, 0) : ''),
          'function' == typeof h && (h = h()),
          'function' == typeof l && (l = l()),
          (o += `<div data-item="${s}">${l}<span>&nbsp;&nbsp;${h}</span></div>`);
      }
      if ('' != o) {
        if (
          ((this.element = document.createElement('div')),
          (this.element.className = 'bfc-chart-menu'),
          (this.element.style.left = '-99999px'),
          (this.element.style.top = '-99999px'),
          (this.element.innerHTML = o),
          this._.chart.element.appendChild(this.element),
          null == e)
        ) {
          var n = FlowChart.private.stickPosition(t, this.element, this._.chart.svgElement);
          (t = n.x), (e = n.y);
        }
        var d = t + 45;
        (this.element.style.left = d + 'px'),
          (this.element.style.top = e + 'px'),
          (this.element.style.left = d - this.element.offsetWidth + 'px');
        var p = t - this.element.offsetWidth;
        FlowChart.animate(
          this.element,
          { opacity: 0, left: d - this.element.offsetWidth },
          { opacity: 1, left: p },
          300,
          FlowChart.anim.inOutPow
        );
        for (var c = this.element.getElementsByTagName('div'), f = 0; f < c.length; f++)
          (s = c[f]).addEventListener('click', function (t) {
            var e,
              o = this.getAttribute('data-item');
            void 0 === r[o].onClick || (e = r[o].onClick.call(a._.chart, { item: o, nodeId: i })),
              0 != e && a.hide();
          });
      }
    }
  }),
  (FlowChart.Menu.private = class {
    chart;
    constructor(t) {
      this.chart = t;
    }
  }),
  (FlowChart.private.prototype.handlerDownOnShapeBarItem = function (t, e, i) {
    this.chart.selectedShapes.clear();
    var a = i.getAttribute('data-shapebar-item-id'),
      o = this.chart.element.querySelector(`[data-shapebar-item-id="${a}"]`).querySelector('svg'),
      s = o.getBoundingClientRect(),
      l = this.chart.shapeBar.element.getBoundingClientRect(),
      h = FlowChart.private.getClientTouchesXY(t, 0),
      n = s.width / (h.x - s.x),
      d = s.height / (h.y - s.y),
      p = (f) => {
        var u = FlowChart.private.getClientTouchesXY(f, 0);
        if (l.x < u.x && l.x + l.width > u.x && l.y < u.y && l.y + l.height > u.y)
          !((t) => {
            var e = this.chart.element.querySelector('.bfc-drag-inside-shapes-palette'),
              i = this.chart.svgElement.querySelector('[data-shape-id="drag-inside-canvas"]');
            e ||
              (((e = o.cloneNode(!0)).style.position = 'absolute'),
              (e.style.top = s.y + 'px'),
              (e.style.left = s.x + 'px'),
              (e.style.width = s.width + 'px'),
              (e.style.height = s.height + 'px'),
              e.classList.add('bfc-drag-inside-shapes-palette'),
              this.chart.element.appendChild(e)),
              (e.style.top = s.y + (t.y - h.y) + 'px'),
              (e.style.left = s.x + (t.x - h.x) + 'px'),
              i && i.parentNode.removeChild(i);
          })(u);
        else {
          var m = this.chart.svgElement.createSVGPoint();
          (m.x = u.x),
            (m.y = u.y),
            ((o) => {
              var s = this.chart.element.querySelector('.bfc-drag-inside-shapes-palette');
              if (!this.chart.svgElement.querySelector('[data-shape-id="drag-inside-canvas"]')) {
                var l = { templateId: a, x: o.x, y: o.y },
                  h = FlowChart.shapeTemplates[l.templateId],
                  f = 'fit' == h.width ? h.minWidth : h.width,
                  u = 'fit' == h.height ? h.minHeight : h.height,
                  m = f / n,
                  g = u / d;
                isNaN(m) && (m = i.offsetWidth / 2),
                  isNaN(g) && (g = i.offsetHeight / 2),
                  (l.x -= m - f / 2),
                  (l.y -= g - u / 2),
                  this.chart.nodes.add(l),
                  (l = this.chart.nodes.get(l.id)),
                  this.chart.element.removeEventListener(e.move, p),
                  this.chart.element.removeEventListener(e.up, c),
                  e.leave && this.chart.element.removeEventListener(e.leave, c),
                  this.handlerTouchstartMousedownOnShape(t, e, l);
              }
              s && s.parentNode.removeChild(s);
            })(m.matrixTransform(this.chart.svgElement.getScreenCTM().inverse()));
        }
      },
      c = (t) => {
        var i = this.chart.element.querySelector('.bfc-drag-inside-shapes-palette');
        i && i.parentNode.removeChild(i);
        var o = this.chart.svgElement.querySelector('[data-shape-id="drag-inside-canvas"]');
        if (o) {
          var s = FlowChart._getBox(o, this.nodes);
          o.parentNode.removeChild(o), this.addNode({ templateId: a, x: s.x1, y: s.y1 });
        }
        FlowChart.private.removeAlignmentLineElements(this.chart.svgElement),
          this.chart.element.removeEventListener(e.move, p),
          this.chart.element.removeEventListener(e.up, c),
          e.leave && this.chart.element.removeEventListener(e.leave, c);
      };
    this.chart.element.addEventListener(e.move, p, { passive: !0 }),
      this.chart.element.addEventListener(e.up, c);
  }),
  (FlowChart.private.prototype.handlerTouchstartMousedownOnLink = function (t, e, i) {
    if (!1 !== FlowChart.events.publish('link-click', [this.chart, { linkId: i }])) {
      (this.chart.selectedPortShape = null), this.chart.selectedShapes.clear();
      var a = this.chart.links.getById(i),
        o = this.chart.scale,
        s = JSON.parse(FlowChart.private.safeStringify(a.points)),
        l = FlowChart.private.getClientTouchesXY(t, 0),
        h = FlowChart.private.getFirstPointIndexByMousePosition(t, this.chart.svgElement, a),
        n = FlowChart.direction.horizontal;
      a.points[h].x == a.points[h + 1].x && (n = FlowChart.direction.vertical);
      var d = (t) => {
          var e = FlowChart.private.getClientTouchesXY(t, 0);
          n == FlowChart.direction.horizontal
            ? ((a.points[h].y = (e.y - l.y + s[h].y * o) / o),
              (a.points[h + 1].y = (e.y - l.y + s[h + 1].y * o) / o))
            : n == FlowChart.direction.vertical &&
              ((a.points[h].x = (e.x - l.x + s[h].x * o) / o),
              (a.points[h + 1].x = (e.x - l.x + s[h + 1].x * o) / o));
        },
        p = (t) => {
          this.chart.element.removeEventListener(e.move, d),
            this.chart.element.removeEventListener(e.up, p),
            e.leave && this.chart.element.removeEventListener(e.leave, p);
        };
      this.chart.element.addEventListener(e.move, d, { passive: !0 }),
        this.chart.element.addEventListener(e.up, p);
    }
  }),
  (FlowChart.private.prototype.handlerTouchstartMousedownOnPortOut = function (t, e, i) {
    var r = e.getAttribute('data-port-out-port'),
      a = e.getAttribute('data-port-out-shape'),
      o = FlowChart.private.getClientTouchesXY(t, 0),
      s = this.chart.svgElement.createSVGPoint();
    (s.x = o.x),
      (s.y = o.y),
      (s = s.matrixTransform(this.chart.svgElement.getScreenCTM().inverse()));
    var l = { id: `psuedo${this.chart.generateId()}`, templateId: 'psuedo', x: s.x, y: s.y };
    this.chart.nodes.add(l);
    var h = this.chart.nodes.get(l.id);
    this.chart.links.add({ from: a, fromPort: r, to: l.id, templateId: 'psuedo' }),
      this.handlerTouchstartMousedownOnShape(t, i, h, !0);
  }),
  (FlowChart.private.prototype.handlerTouchstartMousedownOnShape = function (t, e, i, r) {
    var o = this.chart.scale;
    if (i.selectable && this.chart.options.selectable) {
      var s = { mouseEvent: t, shape: i, oldValue: i.selected };
      if (this.matchedShortcuts.includes('select_multiple_nodes')) {
        if (
          ((s.newValue = !i.selected),
          !1 === FlowChart.events.publish('selected-shape-changing', [this.chart, s]))
        )
          return;
        i.selected = !i.selected;
      } else if (i.selected) {
        if (
          ((s.newValue = !0),
          !1 === FlowChart.events.publish('selected-shape-changing', [this.chart, s]))
        )
          return;
      } else {
        if (
          ((s.newValue = !0),
          !1 === FlowChart.events.publish('selected-shape-changing', [this.chart, s]))
        )
          return;
        this.chart.selectedShapes.clear(), (i.selected = !0);
      }
      var l = {};
      for (var h of this.chart.selectedShapes) {
        if (!h.movable) return;
        l[h.id] = { x: h.x * o, y: h.y * o };
      }
      var n = FlowChart.private.getClientTouchesXY(t, 0),
        d = 0,
        p = 0,
        c = null,
        f = (t) => {
          (this.chart.selectedPortShape = null), this.chart.selectedShapes._.hideUI();
          var e = FlowChart.private.getClientTouchesXY(t, 0);
          for (var r of this.chart.selectedShapes)
            (r.x = (e.x - n.x + l[r.id].x) / o), (r.y = (e.y - n.y + l[r.id].y) / o);
          if ('label' == i.type) (d = (e.x - n.x) / o), (p = (e.y - n.y) / o);
          else if ('psuedo-node' == i.type) {
            var s = this.chart.links.getByShape(i)[0],
              h = this.chart.ports.get(s.from, s.fromPort),
              f = Number.MAX_VALUE,
              u = null;
            for (var m of this.chart.ports)
              if (m.shape != i && m.shape != h.shape) {
                var g = Math.hypot(m.x - i.x, m.y - i.y);
                g < f && ((f = g), (u = m));
              }
            if (FlowChart.MAGNET_PORT > f) {
              if (((s.element.style.visibility = 'hidden'), !c)) {
                var y = u.shape.id,
                  v = u.id;
                c = this.chart.links.add({
                  from: s.from,
                  fromPort: h.id,
                  to: y,
                  toPort: v,
                  templateId: 'psuedo',
                });
              }
            } else (s.element.style.visibility = ''), c && (this.chart.links.remove(c), (c = null));
          }
          'node' == i.type &&
            FlowChart.private.magnet(
              this.chart.selectedShapes.nodes,
              this.chart.nodes,
              this.chart.svgElement,
              o
            );
        },
        u = (t) => {
          'label' == i.type
            ? (null == i.movex && (i.movex = 0),
              (i.movex += d),
              null == i.movey && (i.movey = 0),
              (i.movey += p))
            : 'psuedo-node' == i.type &&
              (this.chart.nodes.remove(i), c && (c.templateId = 'rounded')),
            this.chart.selectedShapes._.showUI(),
            (this.chart.selectedPortShape = i),
            FlowChart.private.removeAlignmentLineElements(this.chart.svgElement),
            this.chart.element.removeEventListener(e.move, f),
            this.chart.element.removeEventListener(e.up, u),
            e.leave && this.chart.element.removeEventListener(e.leave, u);
        };
      this.chart.element.addEventListener(e.move, f, { passive: !0 }),
        this.chart.element.addEventListener(e.up, u);
    }
  }),
  (FlowChart.private.prototype.handlerTouchstartMousedownOnResizeDot = function (t, e, i, r) {
    if (
      (this.mouseActions.includes('resize-shape') ||
        (this.mouseActions.push('resize-shape'), this.updateMatchedShortcuts(e)),
      this.matchedShortcuts.includes('resize_node'))
    ) {
      for (var o = r.parentNode; !o.hasAttribute('data-selector-shape-id'); ) o = o.parentNode;
      var s = o.getAttribute('data-selector-shape-id'),
        l = this.chart.getShape(s),
        h = l.left,
        n = l.top,
        d = l.width,
        p = l.height,
        c = this.chart.scale,
        f = FlowChart.private.getClientTouchesXY(e, 0),
        u = (t) => {
          (this.chart.selectedPortShape = null), this.chart.editor.clearFieldBorders();
          var e = FlowChart.private.getClientTouchesXY(t, 0),
            i = e.x - f.x,
            o = f.y - e.y;
          (i /= c), (o /= c);
          var s = (t) => {
              var e = l.height,
                r = l.width,
                s = l.top,
                c = l.left;
              'top' == t
                ? this.matchedShortcuts.includes('centered_resize_shape')
                  ? ((e = p + 2 * o), (s = n - o))
                  : ((e = p + o), (s = n - o))
                : 'bottom' == t
                  ? this.matchedShortcuts.includes('centered_resize_shape')
                    ? ((e = p - 2 * o), (s = n + o))
                    : (e = p - o)
                  : 'left' == t
                    ? this.matchedShortcuts.includes('centered_resize_shape')
                      ? ((r = d - 2 * i), (c = h + i))
                      : ((r = d - i), (c = h + i))
                    : 'right' == t &&
                      (this.matchedShortcuts.includes('centered_resize_shape')
                        ? ((r = d + 2 * i), (c = h - i))
                        : (r = d + i)),
                'top' == t || 'bottom' == t
                  ? this.matchedShortcuts.includes('maintain_aspect_ratio_resize_shape') &&
                    ((r = (r / l.height) * e),
                    this.matchedShortcuts.includes('centered_resize_shape') &&
                      (c -= (r - l.width) / 2))
                  : ('left' != t && 'right' != t) ||
                    (this.matchedShortcuts.includes('maintain_aspect_ratio_resize_shape') &&
                      ((e = (e / l.width) * r),
                      this.matchedShortcuts.includes('centered_resize_shape') &&
                        (s -= (e - l.height) / 2)));
              var f = FlowChart.shapeTemplates[l.templateId];
              r >= f.minWidth &&
                r >= f.minHeight &&
                ((l.width = r), (l.height = e), (l.x = c + l.width / 2), (l.y = s + l.height / 2));
            },
            u = r.getAttribute('data-selector-dot-2');
          u == FlowChart.position.left
            ? s('left')
            : u == FlowChart.position.right
              ? s('right')
              : u == FlowChart.position.top
                ? s('top')
                : u == FlowChart.position.bottom
                  ? s('bottom')
                  : u == FlowChart.position.topLeft
                    ? (s('top'), s('left'))
                    : u == FlowChart.position.topRight
                      ? (s('top'), s('right'))
                      : u == FlowChart.position.bottomLeft
                        ? (s('bottom'), s('left'))
                        : u == FlowChart.position.bottomRight && (s('bottom'), s('right')),
            FlowChart.private.magnetWhenResize(
              l,
              this.chart.nodes,
              this.chart.svgElement,
              r.getAttribute('data-selector-dot-2'),
              c
            );
        },
        m = (t) => {
          var e = this.mouseActions.indexOf('resize-shape');
          -1 != e && (this.mouseActions.splice(e, 1), this.updateMatchedShortcuts(t)),
            FlowChart.private.removeAlignmentLineElements(this.chart.svgElement),
            this.chart.element.removeEventListener(i.move, u),
            this.chart.element.removeEventListener(i.up, m),
            i.leave && this.chart.element.removeEventListener(i.leave, m);
        };
      this.chart.element.addEventListener(i.move, u, { passive: !0 }),
        this.chart.element.addEventListener(i.up, m);
    }
  }),
  (FlowChart.private._mousedownOnSvgTimeout = null),
  (FlowChart.private._mousedownOnSvgMovingStarted = !1),
  (FlowChart.private.prototype.handlerTouchstartMousedownOnSvg = function (t, e, i, r) {
    (FlowChart.private._mousedownOnSvgMovingStarted = !1), (this.chart.selectedPortShape = null);
    var o = this.chart.viewBox,
      s = this.chart.scale,
      l = FlowChart.private.getClientTouchesXY(e, 0),
      h = FlowChart.private.getClientTouchesXY(e, 1),
      n = {
        diffX: 0,
        diffY: 0,
        x0: l.x,
        y0: l.y,
        type: 'pan',
        viewBoxLeft: o[0],
        viewBoxTop: o[1],
        viewBox: JSON.parse(FlowChart.private.safeStringify(o)),
      };
    e.touches &&
      e.touches.length > 1 &&
      ((n.type = 'pinch'),
      (n.dist = Math.sqrt((l.x - h.x) * (l.x - h.x) + (l.y - h.y) * (l.y - h.y)))),
      'pan' == n.type && this.chart.svgElement.classList.add('bfc-pan-cursor');
    var d = () => {
      setTimeout(() => {
        FlowChart.private._mousedownOnSvgMovingStarted = !1;
      }, 50),
        n && 'pan' == n.type && this.chart.svgElement.classList.remove('bfc-pan-cursor'),
        (n = null);
    };
    this.chart.svgElement.addEventListener(
      i.move,
      (t) => {
        var e = FlowChart.private.getClientTouchesXY(t, 0);
        if (n && 'pan' == n.type) {
          t.preventDefault(), (n.diffX = e.x - n.x0), (n.diffY = e.y - n.y0);
          var i = -n.diffY / s + n.viewBoxTop,
            r = -n.diffX / s + n.viewBoxLeft;
          (Math.abs(n.diffX) > 3 || Math.abs(n.diffY) > 3) &&
            (FlowChart.private._mousedownOnSvgMovingStarted = !0),
            (o[0] = r),
            (o[1] = i),
            FlowChart.private._mousedownOnSvgTimeout &&
              (clearTimeout(FlowChart.private._mousedownOnSvgTimeout),
              (FlowChart.private._mousedownOnSvgTimeout = null)),
            (FlowChart.private._mousedownOnSvgTimeout = setTimeout(() => {
              this.chart.viewBox = o;
            }, 3));
        } else if (n && 'pinch' == n.type) {
          t.preventDefault(),
            (FlowChart.private._mousedownOnSvgMovingStarted = !0),
            FlowChart.private._mousedownOnSvgTimeout &&
              (clearTimeout(FlowChart.private._mousedownOnSvgTimeout),
              (FlowChart.private._mousedownOnSvgTimeout = null));
          var l = FlowChart.private.getClientTouchesXY(t, 1),
            h = Math.sqrt((e.x - l.x) * (e.x - l.x) + (e.y - l.y) * (e.y - l.y)),
            d = 1 + (h - n.dist) / (n.dist / 100) / 100;
          n.dist = h;
          var p = FlowChart.private.pinchMiddlePointInPercent(
            this.element,
            this.svgBCR.width,
            this.svgBCR.height,
            t
          );
          this.zoom(d, p);
        }
      },
      { passive: !1 }
    ),
      this.chart.svgElement.addEventListener(i.up, d),
      this.chart.svgElement.addEventListener(i.leave, d);
  }),
  (FlowChart.private.prototype.handlerTouchstartMousedownOnBarMove = function (t, e, i, r) {
    var a,
      o,
      l = FlowChart.private.getClientTouchesXY(e, 0);
    r.parentNode.hasAttribute('data-shapebar')
      ? ((a = this.chart.shapeBar), (o = 'shapebar-position'))
      : r.parentNode.hasAttribute('data-colorbar')
        ? ((a = this.chart.colorBar), (o = 'colorbar-position'))
        : r.parentNode.hasAttribute('data-menubar') &&
          ((a = this.chart.menuBar), (o = 'menubar-position'));
    var h = a.element.getBoundingClientRect(),
      n = (t) => {
        var e = FlowChart.private.getClientTouchesXY(t, 0),
          i = e.x - l.x + h.left,
          r = e.y - l.y + h.top,
          n = i - this.svgBCR.left;
        n < FlowChart.MAGNET_WIN_PIXELS &&
          n > -FlowChart.MAGNET_WIN_PIXELS &&
          (i = this.svgBCR.left);
        var d = this.svgBCR.right - (i + h.width);
        d < FlowChart.MAGNET_WIN_PIXELS &&
          d > -FlowChart.MAGNET_WIN_PIXELS &&
          (i = this.svgBCR.right - h.width);
        var p = r - this.svgBCR.top;
        p < FlowChart.MAGNET_WIN_PIXELS &&
          p > -FlowChart.MAGNET_WIN_PIXELS &&
          (r = this.svgBCR.top);
        var c = this.svgBCR.bottom - (r + h.height);
        c < FlowChart.MAGNET_WIN_PIXELS &&
          c > -FlowChart.MAGNET_WIN_PIXELS &&
          (r = this.svgBCR.bottom - h.height),
          (a.element.style.right = 'unset'),
          (a.element.style.bottom = 'unset'),
          (a.element.style.left = i + 'px'),
          (a.element.style.top = r + 'px');
        var f = { left: i, top: r };
        try {
          sessionStorage.setItem(o, FlowChart.private.safeStringify(f));
        } catch (t) {
          t.code == t.QUOTA_EXCEEDED_ERR && sessionStorage.clear(), console.error(t);
        }
      },
      d = (t) => {
        this.chart.element.removeEventListener(i.move, n),
          this.chart.element.removeEventListener(i.up, d),
          i.leave && this.chart.element.removeEventListener(i.leave, d);
      };
    this.chart.element.addEventListener(i.move, n, { passive: !0 }),
      this.chart.element.addEventListener(i.up, d);
  }),
  (FlowChart.private.prototype.handlerMousewheel = function (t) {
    if (
      (this.mouseActions.includes('wheel') ||
        (this.mouseActions.push('wheel'), this.updateMatchedShortcuts(t)),
      this.matchedShortcuts.includes('zoom'))
    ) {
      this.chart.selectedPort = null;
      var e = this,
        i = !1,
        r = this.chart.options.zoom.speed,
        a = this.chart.options.zoom.smooth,
        o = 0,
        s = this.chart.scale,
        l = FlowChart.private.centerPointInPercent(this.chart.svgElement, t.pageX, t.pageY),
        h =
          window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          ((t) => {
            setTimeout(t, 20);
          });
      t.preventDefault();
      var n = t.delta || t.wheelDelta;
      void 0 === n && (n = -t.detail),
        (n = Math.max(-1, Math.min(1, n))),
        (o += -n * r),
        i ||
          (function t() {
            i = !0;
            var r = (o - s) / a;
            r > 0 ? r++ : r--,
              (s += r),
              e.zoom(1 - r / 12 / 50, l),
              Number.parseInt(s) == Number.parseInt(o) ? (i = !1) : h(t);
          })();
    }
  }),
  (FlowChart.private.prototype.handlerShapeClick = (t, e) => {}),
  (FlowChart.private.prototype.handlerResizeOnSvgElement = function () {
    var t = this.chart.viewBox,
      e = this.chart.svgElement.getBoundingClientRect(),
      i = FlowChart.private.getScale(this.chart.viewBox, this.svgBCR.width, this.svgBCR.height);
    (t[2] = e.width / i), (t[3] = e.height / i), this.setViewBox(t), (this.svgBCR = e);
  }),
  (FlowChart.private.prototype.addListeners = function () {
    var t = this;
    new ResizeObserver((e) => {
      t.handlerResizeOnSvgElement(e);
    }).observe(t.chart.svgElement),
      this.chart.options.interactive &&
        (document.addEventListener('click', (e) => {
          if (e.target.hasAttribute && e.target.hasAttribute('data-field-selector'))
            return t.chart.active;
          for (var i = e.target; i && i != t.chart.element; ) i = i.parentNode;
          t.chart.active = i == t.chart.element;
        }),
        this.chart.element.addEventListener(
          'touchstart',
          function (e) {
            (t.touchendEnabledDevice = !0),
              t.handlerTouchstartMousedown(this, e, {
                move: 'touchmove',
                up: 'touchend',
                touchstart: 'touchstart',
              });
          },
          { passive: !0 }
        ),
        this.chart.element.addEventListener(
          'touchend',
          (e) => {
            (t.touchendEnabledDevice = !0),
              FlowChart.private._mousedownOnSvgMovingStarted || t.handlerTouchendClick(e);
          },
          { passive: !0 }
        ),
        this.chart.element.addEventListener('mousedown', function (e) {
          t.touchendEnabledDevice ||
            t.handlerTouchstartMousedown(this, e, {
              move: 'mousemove',
              up: 'mouseup',
              leave: 'mouseleave',
            }),
            t.touchendEnabledDevice &&
              setTimeout(() => {
                t.touchendEnabledDevice = !1;
              }, 2e3);
        }),
        this.chart.element.addEventListener('wheel', (e) => {
          t.handlerMousewheel(e);
        }),
        this.chart.element.addEventListener('mousemove', (e) => {
          t.handlerMousemove(e);
        }),
        this.chart.element.addEventListener('mouseup', (e) => {
          t.touchendEnabledDevice ||
            FlowChart.private._mousedownOnSvgMovingStarted ||
            t.handlerTouchendClick(e);
        }),
        this.chart.element.addEventListener('dragover', (t) => {
          FlowChart.private.getParentElementWithAttribute(t.target, 'data-drop-field') &&
            t.preventDefault();
        }),
        this.chart.element.addEventListener('drop', (e) => {
          var i = FlowChart.private.getParentElementWithAttribute(e.target, 'data-drop-field');
          if (i) {
            e.preventDefault();
            for (var r = e.dataTransfer.items, a = 0; a < r.length; a += 1)
              if ('file' === r[a].kind && r[a].type.match('^image/')) {
                var o = r[a].getAsFile(),
                  s = window.URL.createObjectURL(o);
                FlowChart.private.createImageElementForUpload(s, (r) => {
                  var a = i.getAttribute('data-drop-field'),
                    o = FlowChart.private.getParentElementWithAttribute(e.target, 'data-shape-id');
                  o &&
                    ((shapeId = o.getAttribute('data-shape-id')),
                    (t.chart.getShape(shapeId)[a] = r));
                });
              }
          }
        }),
        this.chart.element.addEventListener('dblclick', (e) => {
          t.handlerDblclick(e);
        }),
        document.addEventListener('keydown', (e) => {
          !1 !== t.chart.active && t.handlerKeydown(e);
        }),
        document.addEventListener('input', (e) => {
          t.handlerInput(e);
        }),
        document.addEventListener('keyup', (e) => {
          t.handlerKeyup(e);
        }),
        document.addEventListener('contextmenu', (t) => {}));
  }),
  (FlowChart.private.magnet = (t, e, i, r) => {
    var a = FlowChart.MAGNET_MOVE_PIXELS / r;
    if (0 != t.length) {
      var o = !1,
        s = !1;
      for (var l of (FlowChart.private.removeAlignmentLineElements(i), e)) {
        var h = !1;
        for (var n of t)
          if (l == n) {
            h = !0;
            break;
          }
        if (!h)
          for (var n of t) {
            if (Math.abs(n.left - l.left) < a && n.left >= l.left - a && n.left <= l.left + a) {
              if (!o) {
                var d = l.left + n.width / 2 - n.x;
                for (var p of t) p.x += d;
                o = !0;
              }
              Math.abs(n.left - l.left) < 0.5 &&
                ((c = n.top) > (f = l.top) ? (c += n.height) : (f += l.height),
                FlowChart.private.addAlignmentLineElement(i, 'side', l.left, c, l.left, f, r));
            }
            if (Math.abs(n.x - l.x) < a && n.x >= l.x - a && n.x <= l.x + a) {
              if (!o) {
                for (var p of ((d = l.x - n.x), t)) p.x += d;
                o = !0;
              }
              Math.abs(n.x - l.x) < 0.5 &&
                ((c = n.top) > (f = l.top) ? (c += n.height) : (f += l.height),
                FlowChart.private.addAlignmentLineElement(i, 'center', l.x, c, l.x, f, r));
            }
            if (
              Math.abs(n.right - l.right) < a &&
              n.right >= l.right - a &&
              n.right <= l.right + a
            ) {
              if (!o) {
                for (var p of ((d = l.right - n.width / 2 - n.x), t)) p.x += d;
                o = !0;
              }
              var c, f;
              Math.abs(n.right - l.right) < 0.5 &&
                ((c = n.top) > (f = l.top) ? (c += n.height) : (f += l.height),
                FlowChart.private.addAlignmentLineElement(i, 'side', l.right, c, l.right, f, r));
            }
            if (Math.abs(n.top - l.top) < a && n.top >= l.top - a && n.top <= l.top + a) {
              if (!s) {
                for (var p of ((d = l.top + n.height / 2 - n.y), t)) p.y += d;
                s = !0;
              }
              Math.abs(n.top - l.top) < 0.5 &&
                ((u = n.left) > (m = l.left) ? (u += n.width) : (m += l.width),
                FlowChart.private.addAlignmentLineElement(i, 'side', u, l.top, m, l.top, r));
            }
            if (Math.abs(n.y - l.y) < a && n.y >= l.y - a && n.y <= l.y + a) {
              if (!s) {
                for (var p of ((d = l.y - n.y), t)) p.y += d;
                s = !0;
              }
              Math.abs(n.y - l.y) < 0.5 &&
                ((u = n.left) > (m = l.left) ? (u += n.width) : (m += l.width),
                FlowChart.private.addAlignmentLineElement(i, 'center', u, l.y, m, l.y, r));
            }
            if (
              Math.abs(n.bottom - l.bottom) < a &&
              n.bottom >= l.bottom - a &&
              n.bottom <= l.bottom + a
            ) {
              if (!s) {
                for (var p of ((d = l.bottom - n.height / 2 - n.y), t)) p.y += d;
                s = !0;
              }
              var u, m;
              Math.abs(n.bottom - l.bottom) < 0.5 &&
                ((u = n.left) > (m = l.left) ? (u += n.width) : (m += l.width),
                FlowChart.private.addAlignmentLineElement(i, 'side', u, l.bottom, m, l.bottom, r));
            }
          }
      }
    }
  }),
  (FlowChart.private.magnetWhenResize = (t, e, i, r, a) => {
    var o = !1,
      s = !1,
      l = FlowChart.MAGNET_RESIZE_PIXELS / a;
    for (var h of (FlowChart.private.removeAlignmentLineElements(i), e))
      if (t != h) {
        if (
          (Math.abs(t.left - h.left) < l &&
            t.left >= h.left - l &&
            t.left <= h.left + l &&
            (o || ((t.width = t.right - h.left), (t.x = h.left + t.width / 2), (o = !0)),
            Math.abs(t.left - h.left) < 0.5 &&
              ((p = t.top) > (c = h.top) ? (p += t.height) : (c += h.height),
              FlowChart.private.addAlignmentLineElement(i, 'side', h.left, p, h.left, c, a))),
          Math.abs(t.x - h.x) < l && t.x >= h.x - l && t.x <= h.x + l)
        ) {
          if (
            r == FlowChart.position.left ||
            r == FlowChart.position.topLeft ||
            r == FlowChart.position.bottomLeft
          )
            o ||
              ((t.width = 2 * (t.right - h.x)), (t.x = h.x - t.width / 2 + t.width / 2), (o = !0));
          else if (!o) {
            var n = 2 * (h.x - t.left),
              d = t.width;
            (t.width = n), (t.x += (n - d) / 2), (o = !0);
          }
          Math.abs(t.x - h.x) < 0.5 &&
            ((p = t.top) > (c = h.top) ? (p += t.height) : (c += h.height),
            FlowChart.private.addAlignmentLineElement(i, 'center', h.x, p, h.x, c, a));
        }
        var p, c, f, u;
        if (Math.abs(t.right - h.right) < l && t.right >= h.right - l && t.right <= h.right + l)
          o ||
            ((n = h.right - t.left), (d = t.width), (t.width = n), (t.x += (n - d) / 2), (o = !0)),
            Math.abs(t.right - h.right) < 0.5 &&
              ((p = t.top) > (c = h.top) ? (p += t.height) : (c += h.height),
              FlowChart.private.addAlignmentLineElement(i, 'side', h.right, p, h.right, c, a));
        if (
          (Math.abs(t.top - h.top) < l &&
            t.top >= h.top - l &&
            t.top <= h.top + l &&
            (s || ((t.height = t.bottom - h.top), (t.y = h.top + t.height / 2), (s = !0)),
            Math.abs(t.top - h.top) < 0.5 &&
              ((f = t.left) > (u = h.left) ? (f += t.width) : (u += h.width),
              FlowChart.private.addAlignmentLineElement(i, 'side', f, h.top, u, h.top, a))),
          Math.abs(t.y - h.y) < l && t.y >= h.y - l && t.y <= h.y + l)
        ) {
          if (
            r == FlowChart.position.top ||
            r == FlowChart.position.topLeft ||
            r == FlowChart.position.topRight
          )
            s ||
              ((t.height = 2 * (t.bottom - h.y)),
              (t.y = h.y - t.height / 2 + t.height / 2),
              (s = !0));
          else if (!s) {
            var m = 2 * (h.y - t.top),
              g = t.height;
            (t.height = m), (t.y += (m - g) / 2), (s = !0);
          }
          Math.abs(t.y - h.y) < 0.5 &&
            ((f = t.left) > (u = h.left) ? (f += t.width) : (u += h.width),
            FlowChart.private.addAlignmentLineElement(i, 'center', f, h.y, u, h.y, a));
        }
        if (
          Math.abs(t.bottom - h.bottom) < l &&
          t.bottom >= h.bottom - l &&
          t.bottom <= h.bottom + l
        )
          s ||
            ((m = h.bottom - t.top),
            (g = t.height),
            (t.height = m),
            (t.y += (m - g) / 2),
            (s = !0)),
            Math.abs(t.bottom - h.bottom) < 0.5 &&
              ((f = t.left) > (u = h.left) ? (f += t.width) : (u += h.width),
              FlowChart.private.addAlignmentLineElement(i, 'side', f, h.bottom, u, h.bottom, a));
      }
  }),
  (FlowChart.private.addAlignmentLineElement = (t, e, i, r, a, o, s) => {
    var l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    return (
      l.setAttribute('x1', i),
      l.setAttribute('x2', a),
      l.setAttribute('y1', r),
      l.setAttribute('y2', o),
      l.setAttribute('stroke-width', 1 / s),
      l.classList.add('bfc-alignment-line'),
      'center' == e
        ? l.setAttribute('stroke-dasharray', `${15 / s} ${15 / s} ${2 / s} ${15 / s}`)
        : 'side' == e && l.setAttribute('stroke-dasharray', `${10 / s} ${20 / s}`),
      t.appendChild(l),
      l
    );
  }),
  (FlowChart.private.removeAlignmentLineElements = (t) => {
    for (var e = t.querySelectorAll('.bfc-alignment-line'), i = 0; i < e.length; i++)
      e[i].parentNode.removeChild(e[i]);
  }),
  (FlowChart.anim = class {
    static inPow(t) {
      return t < 0 ? 0 : t > 1 ? 1 : Math.pow(t, 2);
    }
    static outPow(t) {
      return t < 0 ? 0 : t > 1 ? 1 : -1 * (Math.pow(t - 1, 2) + -1);
    }
    static inOutPow(t) {
      return t < 0
        ? 0
        : t > 1
          ? 1
          : (t *= 2) < 1
            ? FlowChart.anim.inPow(t, 2) / 2
            : -0.5 * (Math.pow(t - 2, 2) + -2);
    }
    static inSin(t) {
      return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.cos(t * (Math.PI / 2));
    }
    static outSin(t) {
      return t < 0 ? 0 : t > 1 ? 1 : Math.sin(t * (Math.PI / 2));
    }
    static inOutSin(t) {
      return t < 0 ? 0 : t > 1 ? 1 : -0.5 * (Math.cos(Math.PI * t) - 1);
    }
    static inExp(t) {
      return t < 0 ? 0 : t > 1 ? 1 : Math.pow(2, 10 * (t - 1));
    }
    static outExp(t) {
      return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    static inOutExp(t) {
      return t < 0
        ? 0
        : t > 1
          ? 1
          : t < 0.5
            ? 0.5 * Math.pow(2, 10 * (2 * t - 1))
            : 0.5 * (2 - Math.pow(2, 10 * (-2 * t + 1)));
    }
    static inCirc(t) {
      return t < 0 ? 0 : t > 1 ? 1 : -(Math.sqrt(1 - t * t) - 1);
    }
    static outCirc(t) {
      return t < 0 ? 0 : t > 1 ? 1 : Math.sqrt(1 - (t - 1) * (t - 1));
    }
    static inOutCirc(t) {
      return t < 0
        ? 0
        : t > 1
          ? 1
          : t < 1
            ? -0.5 * (Math.sqrt(1 - t * t) - 1)
            : 0.5 * (Math.sqrt(1 - (2 * t - 2) * (2 * t - 2)) + 1);
    }
    static rebound(t) {
      return t < 0
        ? 0
        : t > 1
          ? 1
          : t < 1 / 2.75
            ? 1 - 7.5625 * t * t
            : t < 2 / 2.75
              ? 1 - (7.5625 * (t - 1.5 / 2.75) * (t - 1.5 / 2.75) + 0.75)
              : t < 2.5 / 2.75
                ? 1 - (7.5625 * (t - 2.25 / 2.75) * (t - 2.25 / 2.75) + 0.9375)
                : 1 - (7.5625 * (t - 2.625 / 2.75) * (t - 2.625 / 2.75) + 0.984375);
    }
    static inBack(t) {
      return t < 0 ? 0 : t > 1 ? 1 : t * t * (2.70158 * t - 1.70158);
    }
    static outBack(t) {
      return t < 0 ? 0 : t > 1 ? 1 : (t - 1) * (t - 1) * (2.70158 * (t - 1) + 1.70158) + 1;
    }
    static inOutBack(t) {
      return t < 0
        ? 0
        : t > 1
          ? 1
          : t < 0.5
            ? 4 * t * t * (7.1898 * t - 2.5949) * 0.5
            : 0.5 * ((2 * t - 2) * (2 * t - 2) * (3.5949 * (2 * t - 2) + 2.5949) + 2);
    }
    static impulse(t) {
      var e = 2 * t;
      return e * Math.exp(1 - e);
    }
    static expPulse(t) {
      return Math.exp(-2 * Math.pow(t, 2));
    }
  }),
  (FlowChart.LinkCollection = class extends Array {
    _;
    constructor(t) {
      super(), (this._ = new FlowChart.LinkCollection.private(t));
    }
    get last() {
      return this.length ? this[this.length - 1] : null;
    }
    get first() {
      return this.length ? this[0] : null;
    }
    addRange(t) {
      this._.chart._.snap();
      var e = this._.addRange(t);
      return this.push(...e), this._.chart._.changed({ property: 'links' }), e;
    }
    add(t) {
      return this.addRange([t])[0];
    }
    get(t, e, i, r) {
      for (var a of (null == i && (i = ''), null == r && (r = ''), this))
        if (a.from == t && a.to == e && a.fromPort == i && a.toPort == r) return a;
      return null;
    }
    getById(t) {
      for (var e of this) if (e.id == t) return e;
      return null;
    }
    getByShape(t) {
      var e = [];
      for (var i of this) (i.from != t.id && i.to != t.id) || e.push(i);
      return e;
    }
    clear() {
      this._.remove(this, this);
    }
    removeRange(t) {
      this._.remove(t, this);
    }
    remove(t) {
      this._.remove(t, this);
    }
    contains(t) {
      for (var e of this) if (e == t) return !0;
      return !1;
    }
  }),
  (FlowChart.LinkCollection.private = class {
    chart;
    metadata;
    constructor(t) {
      (this.chart = t), (this.metadata = {});
    }
    getProperty(t, e, i) {
      if (null == t[e]) {
        var r = FlowChart.linkTemplates[t.templateId];
        if (r[e] && 'function' != typeof r[e]) return r[e];
      }
      if ('points' == e) {
        if (t[e]) return t[e];
        if ((this.metadata[i.id] || (this.metadata[i.id] = {}), null == this.metadata[i.id][e])) {
          if ('length' == e) return 0;
          if ('points' == e) return [];
        }
        return this.metadata[i.id][e];
      }
      return Reflect.get(...arguments);
    }
    setProperty(t, e, i, r) {
      var a = FlowChart.linkTemplates[t.templateId];
      if (
        ('length' == e &&
          (this.metadata[r.id] || (this.metadata[r.id] = {}), (this.metadata[r.id].length = i)),
        'points' == e)
      ) {
        for (var o = this, s = i, l = 0; l < s.length; l++) {
          var h = s[l],
            n = new Proxy(h, {
              set(e, i, a) {
                for (var s of ((e[i] = a),
                null == t.points && (t.points = d),
                o.draw(r),
                o.chart.labels))
                  if (
                    s.from == r.from &&
                    s.to == r.to &&
                    s.fromPort == r.fromPort &&
                    s.toPort == r.toPort
                  ) {
                    var l = FlowChart.private.getLabelXY(s, r);
                    (s.x = l.x), (s.y = l.y);
                  }
                return !0;
              },
            });
          s[l] = n;
        }
        var d = new Proxy(s, { set: (t, e, i) => (console.log(e), (t[e] = i), o.draw(r), !0) });
        this.metadata[r.id] || (this.metadata[r.id] = {}),
          void 0 !== t.points && delete t.points,
          (this.metadata[r.id].points = d);
      } else
        a[e] && 'function' != typeof a[e]
          ? (null != t[e] && a[e] == i && delete t[e],
            a[e] != i ? (t[e] = i) : a[e] == i || FlowChart.isNEU(t[e]) || (t[e] = i))
          : (t[e] = i);
    }
    addRange(t) {
      var e = this,
        i = [];
      t || console.error('links are: ' + t);
      for (var r = 0; r < t.length; r++) {
        var a = t[r];
        a.from || console.error('link.from not defined!'),
          a.to || console.error('link.to not defined!'),
          a.templateId || (a.templateId = FlowChart.DEFAULT_LINK_SHAPE_ID);
        var o = {
            get(t, i, r) {
              return 'type' == i
                ? 'psuedo' == t.templateId
                  ? 'psuedo-link'
                  : 'link'
                : ('fromPort' == i && FlowChart.isNEU(t.fromPort)) ||
                    ('toPort' == i && FlowChart.isNEU(t.toPort))
                  ? ''
                  : 'element' == i
                    ? e.chart.svgElement.querySelector(`[data-link-id="${r.id}"]`)
                    : 'pathElement' == i
                      ? e.chart.svgElement.querySelector(`[data-link-id="${r.id}"] path`)
                      : 'layer' == i && FlowChart.isNEU(t.layer)
                        ? -3
                        : 'id' == i
                          ? `${r.from}${FlowChart.SEPARATOR}${r.fromPort}${FlowChart.SEPARATOR}${r.to}${FlowChart.SEPARATOR}${r.toPort}`
                          : e.getProperty(...arguments);
            },
            set(t, i, r, a) {
              if (t[i] == r) return !0;
              if (
                'to' == i ||
                'from' == i ||
                'fromPort' == i ||
                'toPort' == i ||
                '' == i ||
                'templateId' == i ||
                'points' != i
              ) {
                var o = a.element;
                o && o.parentNode.removeChild(o);
              }
              e.chart._.snap();
              var s = e.beforeIdChange(i, a);
              for (var l of (e.setProperty(t, i, r, a),
              e.afterIdChange(s, a),
              e.draw(a),
              e.chart.labels))
                if (
                  l.from == a.from &&
                  l.to == a.to &&
                  l.fromPort == a.fromPort &&
                  l.toPort == a.toPort
                ) {
                  var h = FlowChart.private.getLabelXY(l, a);
                  (l.x = h.x), (l.y = h.y);
                }
              return e.chart._.changed({ property: 'links' }), !0;
            },
          },
          s = new Proxy(a, o),
          l = a.points;
        if (!l) {
          var h = this.chart.ports.getByLink(a);
          l = FlowChart.private.linkFromTo(
            h.fromShape,
            h.toShape,
            h.fromPort,
            h.toPort,
            this.chart
          );
        }
        for (var n = 0; n < l.length; n++) {
          var d = l[n],
            p = new Proxy(d, {
              set(t, i, r) {
                for (var a of ((t[i] = r), e.draw(s), e.chart.labels))
                  if (
                    a.from == s.from &&
                    a.to == s.to &&
                    a.fromPort == s.fromPort &&
                    a.toPort == s.toPort
                  ) {
                    var o = FlowChart.private.getLabelXY(a, s);
                    (a.x = o.x), (a.y = o.y);
                  }
                return !0;
              },
            });
          l[n] = p;
        }
        var c = new Proxy(l, {});
        this.setProperty(a, 'points', c, s), this.draw(s), i.push(s);
      }
      return i;
    }
    beforeIdChange(t, e) {
      var i = null;
      return (
        ('to' != t && 'from' != t && 'fromPort' != t && 'toPort' != t) ||
          (((i = {
            from: e.from,
            to: e.to,
            fromPort: e.fromPort,
            toPort: e.toPort,
            metadata: null,
          }).metadata = this.metadata[e.id]),
          delete this.metadata[e.id]),
        i
      );
    }
    afterIdChange(t, e) {
      if (t) {
        this.metadata[e.id] = t.metadata;
        var i = this.chart.ports.getByLink(e),
          r = FlowChart.private.linkFromTo(
            i.fromShape,
            i.toShape,
            i.fromPort,
            i.toPort,
            this.chart
          );
        for (var a of ((e.points = r), this.chart.labels))
          a.from == t.from &&
            a.to == t.to &&
            a.fromPort == t.fromPort &&
            a.toPort == t.toPort &&
            ((a.from = e.from), (a.to = e.to), (a.fromPort = e.fromPort), (a.toPort = e.toPort));
      }
    }
    remove(t, e) {
      var i = !1,
        r = [];
      if (Array.isArray(t)) r = t;
      else if (t.type) r = [t];
      else for (var a of e) (a.from != t && a.to != t) || r.push(a);
      for (var a of r)
        for (var o = e.length - 1; o >= 0; o--)
          if (e[o].from == a.from && e[o].to == a.to) {
            var s = a.element;
            for (var l of (s && s.parentNode.removeChild(s), this.chart.labels))
              l.from == a.from && l.to == a.to && this.chart.labels.remove(l);
            i || (this.chart._.snap(), (i = !0)), e.splice(o, 1);
            break;
          }
      i && this.chart._.changed({ property: 'links' });
    }
    getPathElementByLinkElement(t) {
      var e = null;
      for (var i of t.children)
        if ('path' == i.nodeName) {
          e = i;
          break;
        }
      return e || console.error('Cannot find path Element!'), e;
    }
    draw(t) {
      var e = this.chart.svgElement.querySelector(`[data-link-id="${t.id}"]`),
        i = FlowChart.linkTemplates[t.templateId];
      if (!e) {
        var r = t.stroke.replace(/\W/g, '_'),
          a = `bfc_mstart_${t.templateId}_${r}`,
          o = `bfc_mend_${t.templateId}_${r}`;
        (e = document.createElementNS('http://www.w3.org/2000/svg', 'g')).setAttribute(
          'data-link-id',
          t.id
        ),
          e.classList.add('bfc-link'),
          e.classList.add(t.templateId),
          (e.innerHTML = i.svg(t, a, o) + '<path d="" class="bfc-link-invisible"></path>'),
          FlowChart.private.getLayer(this.chart.svgElement, t.layer).appendChild(e),
          this.chart.svgElement.querySelector(`[data-markers="${t.templateId}"]`) ||
            (this.chart.svgElement.querySelector('defs').innerHTML +=
              `<g data-markers="${t.templateId}">\n                        ${i.markerStart}\n                        ${i.markerMid}\n                        ${i.markerEnd}\n                    </g>`);
      }
      var s = this.getPathElementByLinkElement(e),
        l = i.path(t);
      s.setAttribute('d', l), e.querySelector('.bfc-link-invisible').setAttribute('d', l);
      for (var h = 0, n = 0; n < t.points.length - 1; n++) {
        var d = t.points[n],
          p = t.points[n + 1];
        h += Math.hypot(p.x - d.x, p.y - d.y);
      }
      this.setProperty(t, 'length', h, t);
    }
  }),
  (FlowChart.PortCollection = class {
    _;
    constructor(t) {
      this._ = new FlowChart.PortCollection.private(t);
    }
    [Symbol.iterator]() {
      var t = this._.chart.nodes,
        e = this._.chart.labels,
        i = this,
        r = 0,
        a = 0,
        o = !1,
        s = null;
      return {
        next() {
          for (var l; !l && !o; )
            if (r > e.length + t.length - 1) o = !0;
            else {
              var h;
              h = r < t.length ? t[r] : e[r - t.length];
              var n = FlowChart.shapeTemplates[h.templateId].ports(h);
              n ? (null == s && (s = Object.keys(n)), (l = i.get(h.id, s[a]))) : (s = []),
                ++a > s.length - 1 && ((s = null), (a = 0), r++);
            }
          return { value: l, done: o };
        },
      };
    }
    getElement(t) {
      return this._.getElement(t);
    }
    getByPosition(t, e) {
      return this._.getByPosition(t, e);
    }
    getByOpositeOfPosition(t, e) {
      return this._.getByOpositeOfPosition(t, e);
    }
    getByLink(t) {
      return this._.getByLink(t);
    }
    get(t, e) {
      return this._.get(t, e);
    }
  }),
  (FlowChart.PortCollection.private = class {
    chart;
    cachedPorts;
    constructor(t) {
      (this.chart = t), (this.cachedPorts = []);
    }
    getElement(t) {
      return this.chart.svgElement.querySelector(`[data-ports-s-id="${t}"]`);
    }
    getByPosition(t, e) {
      var i = FlowChart.shapeTemplates[t.templateId],
        r = [];
      for (var a in i.ports(t))
        FlowChart.private.getPortPosition(i.ports(t)[a], t) == e && r.push(this.get(t.id, a));
      return r;
    }
    getByOpositeOfPosition(t, e) {
      var i = null;
      switch (e) {
        case FlowChart.position.topRight:
          i = FlowChart.position.bottomLeft;
          break;
        case FlowChart.position.bottomRight:
          i = FlowChart.position.topLeft;
          break;
        case FlowChart.position.bottomLeft:
          i = FlowChart.position.topRight;
          break;
        case FlowChart.position.topLeft:
          i = FlowChart.position.bottomRight;
          break;
        case FlowChart.position.left:
          i = FlowChart.position.right;
          break;
        case FlowChart.position.right:
          i = FlowChart.position.left;
          break;
        case FlowChart.position.top:
          i = FlowChart.position.bottom;
          break;
        case FlowChart.position.bottom:
          i = FlowChart.position.top;
      }
      var r = this.chart.getShape(t);
      return this.getByPosition(r, i);
    }
    getByLink(t) {
      var e, i, r, a, o;
      return (
        (e = this.chart.getShape(t.from)),
        FlowChart.isNEU(t.fromPort) || (r = this.get(t.from, t.fromPort)),
        (i = this.chart.getShape(t.to)),
        FlowChart.isNEU(t.toPort) || (a = this.get(t.to, t.toPort)),
        (r && a) ||
          ((o = FlowChart.private.findClosestPorts(e, i)),
          r || (r = this.get(t.from, o.fromPortName)),
          a || (a = this.get(t.to, o.toPortName))),
        { fromShape: e, toShape: i, fromPort: r, toPort: a }
      );
    }
    get(t, e) {
      var i = this.chart.getShape(t),
        r = FlowChart.shapeTemplates[i.templateId],
        a = FlowChart.private.getPortPosition(r.ports(i)[e], i),
        o = JSON.parse(FlowChart.private.safeStringify(r.ports(i)[e]));
      if (!o) return null;
      for (var s of ((o.id = e),
      (o.x += i.left),
      (o.y += i.top),
      (o.position = a),
      (o.shape = i),
      this.cachedPorts))
        if (s.id == o.id && s.shape == o.shape)
          return (s.x = o.x), (s.y = o.y), (s.position = o.position), s;
      return this.cachedPorts.push(o), o;
    }
  }),
  (FlowChart.css = () =>
    '<style data-bfc-styles>.bfc-dark ::-webkit-scrollbar,.bfc-light ::-webkit-scrollbar{width:15px;height:15px}.bfc-dark ::-webkit-scrollbar-corner{background:#1e1e1e}.bfc-dark ::-webkit-scrollbar-track{background:#1e1e1e;border-left:1px solid #333;border-top:1px solid #333}.bfc-dark ::-webkit-scrollbar-thumb{background:#424242}.bfc-dark ::-webkit-scrollbar-thumb:hover{background:#4f4f4f}.bfc-dark ::-webkit-scrollbar-thumb:active{background:#5e5e5e}.bfc-light ::-webkit-scrollbar-corner{background:#fff}.bfc-light ::-webkit-scrollbar-track{background:#fff;border-left:1px solid #ddd;border-top:1px solid #ddd}.bfc-light ::-webkit-scrollbar-thumb{background:#c1c1c1}.bfc-light ::-webkit-scrollbar-thumb:hover{background:#929292}.bfc-light ::-webkit-scrollbar-thumb:active{background:#666}.frame{display:flex;flex-direction:column}.bfc-svg{overflow-y:scroll;flex-grow:1}.bfc-light{background-color:#fff}.bfc-dark{background-color:#1e1e1e}.bfc-light .bfc-statusbar{background-color:#ddd}.bfc-dark .bfc-statusbar{background-color:#3c3c3c}.bfc-statusbar{user-select:none;line-height:32px;padding:0 7px;white-space:nowrap}.bfc-content{overflow:hidden;position:relative;height:100%}.bfc-canvas{overflow:auto;height:100%}.bfc-dark,.bfc-light{font:18px "Segoe UI",Arial,sans-serif}.bfc-light{color:#333}.bfc-dark{color:#cfcfcf}.bfc-menu-item{display:inline-block}.bfc-shapebar{position:absolute;top:64px;left:10px;max-width:60px;user-select:none}.bfc-dark .bfc-shapebar{background-color:#3c3c3c}.bfc-light .bfc-shapebar{background-color:#ddd}.bfc-shapebar-shapes{justify-content:flex-start;flex-wrap:wrap;display:flex;flex-wrap:wrap}.bfc-shapebar-shapes>[data-shapebar-item-id]{padding:7px 0;font-size:13px;text-align:center;user-select:none;cursor:move;flex:1 1 50px;min-height:50px;display:flex;flex-wrap:nowrap;flex-direction:column;justify-content:center}.bfc-colorbar{position:absolute;top:10px;right:10px;width:44px;user-select:none}.bfc-dark .bfc-colorbar{background-color:#3c3c3c}.bfc-light .bfc-colorbar{background-color:#ddd}.bfc-colorbar-colors{justify-content:flex-start;flex-wrap:wrap;display:flex;flex-wrap:wrap}.bfc-colorbar-colors>[data-colorbar-item-id]{padding:7px 0;font-size:13px;text-align:center;user-select:none;cursor:move;flex:1 1 50px;min-height:50px;display:flex;flex-wrap:nowrap;flex-direction:column;justify-content:center}.bfc-menubar{position:absolute;top:10px;left:10px;user-select:none}.bfc-dark .bfc-menubar{background-color:#3c3c3c}.bfc-light .bfc-menubar{background-color:#ddd}.bfc-menubar-colors{justify-content:flex-start;flex-wrap:wrap;display:flex;flex-wrap:wrap}.bfc-menubar-colors>[data-menubar-item-id]{padding:7px 0;font-size:13px;text-align:center;user-select:none;cursor:move;flex:1 1 50px;min-height:50px;display:flex;flex-wrap:nowrap;flex-direction:column;justify-content:center}.bfc-bar-move{cursor:move;height:10px;width:100%}.bfc-dark .bfc-bar-move{background-color:#3c3c3c}.bfc-light .bfc-bar-move{background-color:#ddd}.bfc-bar-move-line{border-top:1px solid #8b8b8b;border-bottom:1px solid #8b8b8b;height:5px;margin-top:3px;margin-left:3px;margin-right:3px}.bfc-dark .bfc-shapebar-shapes>[data-shapebar-item-id]:hover{background-color:#252526}.bfc-light .bfc-shapebar-shapes>[data-shapebar-item-id]:hover{background-color:#f3f3f3}.bfc-alignment-line{stroke:#ffca28}.bfc-selector .bfc-selector-rect{fill:none;stroke:#ffca28}[data-selector-dot-1]{fill:#ffca28;stroke:#ffca28;stroke-width:1;transform-origin:center;transform-box:fill-box}.bfc-c-resizer-dot{stroke:#ffca28;stroke-width:2}.bfc-light .bfc-c-resizer-dot{fill:#fff}.bfc-dark .bfc-c-resizer-dot{fill:#1e1e1e}[data-selector-dot-2=left]{cursor:ew-resize}[data-selector-dot-2=topRight]{cursor:nwse-resize}[data-selector-dot-2=top]{cursor:ns-resize}[data-selector-dot-2=topRight]{cursor:nesw-resize}[data-selector-dot-2=right]{cursor:ew-resize}[data-selector-dot-2=bottomRight]{cursor:nwse-resize}[data-selector-dot-2=bottom]{cursor:ns-resize}[data-selector-dot-2=bottomLeft]{cursor:nesw-resize}[data-selector-dot-2=topLeft]{cursor:nwse-resize}[data-selector-dot-2]{pointer-events:all;visibility:hidden;transform-origin:center;transform-box:fill-box}.bfc-flex-center{display:flex;justify-content:center;align-items:center;height:100%;color:#fff;text-align:center}.bfc-port-dot{cursor:default}.bfc-port-dot circle{stroke:#f57c00;stroke-width:1}.bfc-light .bfc-port-dot{fill:#fff}.bfc-dark .bfc-port-dot{fill:#151515}.bfc-port-dot rect{opacity:0}.bfc-html{user-select:none;overflow:visible}.bfc-pan-cursor{cursor:move}.bfc-shapebar-svg{margin:0 5px;max-width:50px}.bfc-cursor-row-resize{cursor:row-resize}.bfc-cursor-col-resize{cursor:col-resize}.bfc-link-invisible{stroke-width:10;fill:none;stroke:#aeaeae;stroke-miterlimit:10;visibility:hidden;pointer-events:stroke}.bfc-link-resizer{cursor:row-resize}.bfc-s-ports>g{transform-box:fill-box;transform-origin:center}.bfc-port-out{opacity:.3}.bfc-port-out:hover{opacity:1}.bfc-portshapebar{position:absolute;top:500px;left:100px;justify-content:flex-start;flex-wrap:wrap;display:flex;gap:7px;padding:7px;border-radius:7px}.bfc-portshapebar>[data-portshapebar-item-id]{text-align:center;user-select:none;flex:1 1 25px;display:flex;flex-wrap:nowrap;flex-direction:column;justify-content:center;filter:grayscale(1)}.bfc-portshapebar>[data-portshapebar-item-id].bfc-portshapebar-selected,.bfc-portshapebar>[data-portshapebar-item-id]:hover{filter:grayscale(0)}.bfc-portshapebar-svg{width:25px}.bfc-light .bfc-portshapebar{background-color:#ddd}.bfc-dark .bfc-portshapebar{background-color:#3c3c3c}[contenteditable]{outline:0 solid transparent}.bfc-light .bfc-label{fill:#fff}.bfc-dark .bfc-label{fill:#1e1e1e}.bfc-ports-invisible .bfc-port-out{visibility:hidden}.bfc-ports-invisible .bfc-port-out.bfc-ports-visible{visibility:visible;opacity:1}.bfc-color-item{border-radius:3px;color:#fff;display:flex;justify-content:center;align-items:center;user-select:none}.bfc-menu-item{display:inline-block}.bfc-menu-item>*{margin:7px;width:30px;height:30px;vertical-align:middle}.bfc-dark .bfc-menu-item-selected,.bfc-dark :not(.bfc-disabled-grayscale):not(.bfc-disabled-opacity).bfc-menu-item:hover{background-color:#252526}.bfc-light .bfc-menu-item-selected,.bfc-light :not(.bfc-disabled-grayscale):not(.bfc-disabled-opacity).bfc-menu-item:hover{background-color:#fff}.bfc-disabled-opacity{opacity:.3}.bfc-disabled-grayscale{filter:grayscale(1)}[data-shape-id]{user-select:none}.bfc-field-border{fill:transparent;stroke:#ffca28;stroke-width:2px;stroke-dasharray:4;cursor:pointer}.bfc-horizontal-bar{display:flex}.bfc-horizontal-bar .bfc-bar-move{width:10px;height:44px;padding-bottom:0}.bfc-horizontal-bar .bfc-bar-content{flex-grow:1}.bfc-horizontal-bar .bfc-bar-move-line{border-top:none;border-bottom:none;border-left:1px solid #8b8b8b;border-right:1px solid #8b8b8b;height:calc(100% - 6px);margin-right:0;margin-left:3px;margin-top:3px;margin-bottom:3px}.bfc-dark,.bfc-light{position:relative;overflow:hidden}@-moz-keyframes bfc-ripple{to{opacity:0;transform:scale(2)}}@-webkit-keyframes bfc-ripple{to{opacity:0;transform:scale(2)}}@-o-keyframes bfc-ripple{to{opacity:0;transform:scale(2)}}@keyframes bfc-ripple{to{opacity:0;transform:scale(2)}}.bfc-chart-menu{opacity:0;display:inline-block;position:absolute;text-align:left;user-select:none;min-width:270px;box-shadow:rgba(0,0,0,.2) 0 4px 8px 0,rgba(0,0,0,.19) 0 6px 20px 0;font:13px/28px Helvetica,"Segoe UI",Arial,sans-serif;border-radius:10px}.bfc-chart-menu>div:hover img{filter:invert(100%)}.bfc-chart-menu [data-item]{text-align:start;padding:7px 10px}.bfc-dark .bfc-chart-menu [data-item]{background-color:#252526;color:#acacac;border-bottom:1px solid #333}.bfc-dark .bfc-chart-menu [data-item]:hover{background-color:#094771!important;color:#fff!important}.bfc-dark .bfc-chart-menu [data-item]:hover svg{filter:brightness(0) invert(1)}.bfc-light .bfc-chart-menu [data-item]{background-color:#fff;color:#333;border-bottom:1px solid #c7c7c7}.bfc-light .bfc-chart-menu [data-item]:hover{background-color:#0074e8!important;color:#fff!important}.bfc-light .bfc-chart-menu [data-item]:hover svg{filter:brightness(0) invert(1)}.bfc-chart-menu [data-item] svg{vertical-align:middle}.bfc-chart-menu [data-item]:first-child{border-top-left-radius:7px;border-top-right-radius:7px}.bfc-chart-menu [data-item]:last-child{border-bottom-width:0;border-bottom-style:none;border-bottom-left-radius:7px;border-bottom-right-radius:7px}</style>'),
  (FlowChart.private.prototype.json = function (t) {
    return JSON.parse(this.text(t));
  }),
  (FlowChart.private.prototype.text = function (t) {
    t || (t = ['shapes', 'links']);
    var e = {};
    for (var i of t)
      switch (i) {
        case 'shapes':
          (e.nodes = this.chart.nodes), (e.labels = this.chart.labels);
          break;
        case 'nodes':
          e.nodes = this.chart.nodes;
          break;
        case 'labels':
          e.labels = this.chart.labels;
          break;
        case 'links':
          e.links = this.chart.links;
          break;
        case 'selectedShapes':
          for (var r of ((e.selectedShapes = []), this.chart.selectedShapes))
            e.selectedShapes.push(r.id);
          break;
        case 'viewBox':
          e.viewBox = this.chart.viewBox;
      }
    return FlowChart.private.safeStringify(e);
  }),
  (FlowChart.private.prototype.svg = function () {
    var t = document.createElement('div');
    t.innerHTML = this.chart.svgElement.outerHTML;
    for (
      var e = t.querySelector('svg'),
        i = this.chart.nodes,
        r = {
          left: i.left - FlowChart.PADDING,
          top: i.top - FlowChart.PADDING,
          right: i.right + FlowChart.PADDING,
          bottom: i.bottom + FlowChart.PADDING,
        },
        a = e.querySelectorAll('foreignObject'),
        o = 0;
      o < a.length;
      o++
    )
      a[o].parentNode.removeChild(a[o]);
    return (
      e.setAttribute('viewBox', [r.left, r.top, r.right - r.left, r.bottom - r.top]),
      e.setAttribute('width', r.right - r.left),
      e.setAttribute('height', r.bottom - r.top),
      e.setAttribute('xmlns', 'http://www.w3.org/2000/svg'),
      e.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink'),
      (e.querySelector('defs').innerHTML += FlowChart.css()),
      t.innerHTML.replaceAll('\n', '').replaceAll('\t', '')
    );
  }),
  (FlowChart.events = class {
    static topics = {};
    static on(t, e, i) {
      Array.isArray(FlowChart.events.topics[t]) || (FlowChart.events.topics[t] = []),
        FlowChart.events.topics[t].push({ listener: e, uid: i });
    }
    static removeAll(t) {
      Array.isArray(FlowChart.events.topics[t]) || (FlowChart.events.topics[t] = []),
        (FlowChart.events.topics[t] = []);
    }
    static has(t, e) {
      if (Array.isArray(FlowChart.events.topics[t]) && FlowChart.events.topics[t].length > 0) {
        if (FlowChart.isNEU(e)) return !0;
        for (var i = 0; i < FlowChart.events.topics[t].length; i++)
          if (FlowChart.events.topics[t][i].uid == e) return !0;
      }
      return !1;
    }
    static removeForEventId(t) {
      for (var e in FlowChart.events.topics)
        if (Array.isArray(FlowChart.events.topics[e]))
          for (var i = FlowChart.events.topics[e].length - 1; i >= 0; i--)
            FlowChart.events.topics[e][i].uid == t && FlowChart.events.topics[e].splice(i, 1);
    }
    static publish(t, e) {
      if (FlowChart.events.topics[t]) {
        for (var i = [], r = 0; r < FlowChart.events.topics[t].length; r++) {
          var a = FlowChart.events.topics[t][r];
          (null != a && null != a.uid && a.uid != e[0]._.uid) || i.push(a.listener);
        }
        if (i.length > 0) {
          var o = !0;
          for (
            r = 0;
            r < i.length &&
            (1 == e.length
              ? (o = i[r](e[0]) && o)
              : 2 == e.length
                ? (o = i[r](e[0], e[1]) && o)
                : 3 == e.length
                  ? (o = i[r](e[0], e[1], e[2]) && o)
                  : 4 == e.length
                    ? (o = i[r](e[0], e[1], e[2], e[3]) && o)
                    : 5 == e.length && (o = i[r](e[0], e[1], e[2], e[3], e[4]) && o),
            !1 !== o);
            r++
          );
          return o;
        }
      }
    }
  }),
  (FlowChart.icon = class {
    static png(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 550.801 550.801">\n            <path fill="${i}" d="M146.747,276.708c0-13.998-9.711-22.352-26.887-22.352c-6.99,0-11.726,0.675-14.204,1.355v44.927 c2.932,0.676,6.539,0.896,11.52,0.896C135.449,301.546,146.747,292.28,146.747,276.708z"/>\n            <path fill="${i}" d="M488.426,197.019H475.2v-63.816c0-0.398-0.063-0.799-0.116-1.202c-0.021-2.534-0.827-5.023-2.562-6.995L366.325,3.694 c-0.032-0.031-0.063-0.042-0.085-0.076c-0.633-0.707-1.371-1.295-2.151-1.804c-0.231-0.155-0.464-0.285-0.706-0.419 c-0.676-0.369-1.393-0.675-2.131-0.896c-0.2-0.056-0.38-0.138-0.58-0.19C359.87,0.119,359.037,0,358.193,0H97.2 c-11.918,0-21.6,9.693-21.6,21.601v175.413H62.377c-17.049,0-30.873,13.818-30.873,30.873v160.545 c0,17.043,13.824,30.87,30.873,30.87h13.224V529.2c0,11.907,9.682,21.601,21.6,21.601h356.4c11.907,0,21.6-9.693,21.6-21.601 V419.302h13.226c17.044,0,30.871-13.827,30.871-30.87v-160.54C519.297,210.838,505.47,197.019,488.426,197.019z M97.2,21.605 h250.193v110.513c0,5.967,4.841,10.8,10.8,10.8h95.407v54.108H97.2V21.605z M234.344,335.86v45.831h-31.601V229.524h40.184 l31.611,55.759c9.025,16.031,18.064,34.983,24.825,52.154h0.675c-2.257-20.103-2.933-40.643-2.933-63.44v-44.473h31.614v152.167 h-36.117l-32.516-58.703c-9.049-16.253-18.971-35.892-26.438-53.727l-0.665,0.222C233.906,289.58,234.344,311.027,234.344,335.86z M71.556,381.691V231.56c10.613-1.804,25.516-3.159,46.506-3.159c21.215,0,36.353,4.061,46.509,12.192 c9.698,7.673,16.255,20.313,16.255,35.219c0,14.897-4.959,27.549-13.999,36.123c-11.738,11.063-29.123,16.031-49.441,16.031 c-4.522,0-8.593-0.231-11.736-0.675v54.411H71.556V381.691z M453.601,523.353H97.2V419.302h356.4V523.353z M485.652,374.688 c-10.61,3.607-30.713,8.585-50.805,8.585c-27.759,0-47.872-7.003-61.857-20.545c-13.995-13.1-21.684-32.97-21.452-55.318 c0.222-50.569,37.03-79.463,86.917-79.463c19.644,0,34.783,3.829,42.219,7.446l-7.214,27.543c-8.369-3.617-18.752-6.55-35.458-6.55 c-28.656,0-50.341,16.256-50.341,49.22c0,31.382,19.649,49.892,47.872,49.892c7.895,0,14.218-0.901,16.934-2.257v-31.835h-23.493 v-26.869h56.679V374.688z"/>\n            </svg>`;
    }
    static pdf(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}"  viewBox="0 0 550.801 550.801">\n            <path fill="${i}" d="M160.381,282.225c0-14.832-10.299-23.684-28.474-23.684c-7.414,0-12.437,0.715-15.071,1.432V307.6 c3.114,0.707,6.942,0.949,12.192,0.949C148.419,308.549,160.381,298.74,160.381,282.225z"/>\n            <path fill="${i}" d="M272.875,259.019c-8.145,0-13.397,0.717-16.519,1.435v105.523c3.116,0.729,8.142,0.729,12.69,0.729 c33.017,0.231,54.554-17.946,54.554-56.474C323.842,276.719,304.215,259.019,272.875,259.019z"/>\n            <path fill="${i}" d="M488.426,197.019H475.2v-63.816c0-0.398-0.063-0.799-0.116-1.202c-0.021-2.534-0.827-5.023-2.562-6.995L366.325,3.694 c-0.032-0.031-0.063-0.042-0.085-0.076c-0.633-0.707-1.371-1.295-2.151-1.804c-0.231-0.155-0.464-0.285-0.706-0.419 c-0.676-0.369-1.393-0.675-2.131-0.896c-0.2-0.056-0.38-0.138-0.58-0.19C359.87,0.119,359.037,0,358.193,0H97.2 c-11.918,0-21.6,9.693-21.6,21.601v175.413H62.377c-17.049,0-30.873,13.818-30.873,30.873v160.545 c0,17.043,13.824,30.87,30.873,30.87h13.224V529.2c0,11.907,9.682,21.601,21.6,21.601h356.4c11.907,0,21.6-9.693,21.6-21.601 V419.302h13.226c17.044,0,30.871-13.827,30.871-30.87v-160.54C519.297,210.838,505.47,197.019,488.426,197.019z M97.2,21.605 h250.193v110.513c0,5.967,4.841,10.8,10.8,10.8h95.407v54.108H97.2V21.605z M362.359,309.023c0,30.876-11.243,52.165-26.82,65.333 c-16.971,14.117-42.82,20.814-74.396,20.814c-18.9,0-32.297-1.197-41.401-2.389V234.365c13.399-2.149,30.878-3.346,49.304-3.346 c30.612,0,50.478,5.508,66.039,17.226C351.828,260.69,362.359,280.547,362.359,309.023z M80.7,393.499V234.365 c11.241-1.904,27.042-3.346,49.296-3.346c22.491,0,38.527,4.308,49.291,12.928c10.292,8.131,17.215,21.534,17.215,37.328 c0,15.799-5.25,29.198-14.829,38.285c-12.442,11.728-30.865,16.996-52.407,16.996c-4.778,0-9.1-0.243-12.435-0.723v57.67H80.7 V393.499z M453.601,523.353H97.2V419.302h356.4V523.353z M484.898,262.127h-61.989v36.851h57.913v29.674h-57.913v64.848h-36.593 V232.216h98.582V262.127z"/>\n        </svg>`;
    }
    static svg(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 550.801 550.801">\n            <path fill="${i}"  d="M488.426,197.019H475.2v-63.816c0-0.398-0.063-0.799-0.116-1.202c-0.021-2.534-0.827-5.023-2.562-6.995L366.325,3.694 c-0.032-0.031-0.063-0.042-0.085-0.076c-0.633-0.707-1.371-1.295-2.151-1.804c-0.231-0.155-0.464-0.285-0.706-0.419 c-0.676-0.369-1.393-0.675-2.131-0.896c-0.2-0.056-0.38-0.138-0.58-0.19C359.87,0.119,359.037,0,358.193,0H97.2 c-11.918,0-21.6,9.693-21.6,21.601v175.413H62.377c-17.049,0-30.873,13.818-30.873,30.873v160.545 c0,17.043,13.824,30.87,30.873,30.87h13.224V529.2c0,11.907,9.682,21.601,21.6,21.601h356.4c11.907,0,21.6-9.693,21.6-21.601 V419.302h13.226c17.044,0,30.871-13.827,30.871-30.87v-160.54C519.297,210.838,505.47,197.019,488.426,197.019z M97.2,21.605 h250.193v110.513c0,5.967,4.841,10.8,10.8,10.8h95.407v54.108H97.2V21.605z M338.871,225.672L284.545,386.96h-42.591 l-51.69-161.288h39.967l19.617,68.196c5.508,19.143,10.531,37.567,14.36,57.67h0.717c4.061-19.385,9.089-38.527,14.592-56.953 l20.585-68.918h38.77V225.672z M68.458,379.54l7.415-30.153c9.811,5.021,24.888,10.051,40.439,10.051 c16.751,0,25.607-6.935,25.607-17.465c0-10.052-7.662-15.795-27.05-22.734c-26.8-9.328-44.263-24.168-44.263-47.611 c0-27.524,22.971-48.579,61.014-48.579c18.188,0,31.591,3.823,41.159,8.131l-8.126,29.437c-6.465-3.116-17.945-7.657-33.745-7.657 c-15.791,0-23.454,7.183-23.454,15.552c0,10.296,9.089,14.842,29.917,22.731c28.468,10.536,41.871,25.365,41.871,48.094 c0,27.042-20.812,50.013-65.09,50.013C95.731,389.349,77.538,384.571,68.458,379.54z M453.601,523.353H97.2V419.302h356.4V523.353z M488.911,379.54c-11.243,3.823-32.537,9.103-53.831,9.103c-29.437,0-50.73-7.426-65.57-21.779 c-14.839-13.875-22.971-34.942-22.738-58.625c0.253-53.604,39.255-84.235,92.137-84.235c20.81,0,36.852,4.073,44.74,7.896 l-7.657,29.202c-8.859-3.829-19.849-6.95-37.567-6.95c-30.396,0-53.357,17.233-53.357,52.173c0,33.265,20.81,52.882,50.73,52.882 c8.375,0,15.072-0.96,17.94-2.395v-33.745h-24.875v-28.471h60.049V379.54L488.911,379.54z" />\n            </svg>`;
    }
    static csv(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 548.29 548.291" >\n                <path fill="${i}"  d="M486.2,196.121h-13.164V132.59c0-0.399-0.064-0.795-0.116-1.2c-0.021-2.52-0.824-5-2.551-6.96L364.656,3.677 c-0.031-0.034-0.064-0.044-0.085-0.075c-0.629-0.707-1.364-1.292-2.141-1.796c-0.231-0.157-0.462-0.286-0.704-0.419 c-0.672-0.365-1.386-0.672-2.121-0.893c-0.199-0.052-0.377-0.134-0.576-0.188C358.229,0.118,357.4,0,356.562,0H96.757 C84.893,0,75.256,9.649,75.256,21.502v174.613H62.093c-16.972,0-30.733,13.756-30.733,30.73v159.81 c0,16.966,13.761,30.736,30.733,30.736h13.163V526.79c0,11.854,9.637,21.501,21.501,21.501h354.777 c11.853,0,21.502-9.647,21.502-21.501V417.392H486.2c16.966,0,30.729-13.764,30.729-30.731v-159.81 C516.93,209.872,503.166,196.121,486.2,196.121z M96.757,21.502h249.053v110.006c0,5.94,4.818,10.751,10.751,10.751h94.973v53.861 H96.757V21.502z M258.618,313.18c-26.68-9.291-44.063-24.053-44.063-47.389c0-27.404,22.861-48.368,60.733-48.368 c18.107,0,31.447,3.811,40.968,8.107l-8.09,29.3c-6.43-3.107-17.862-7.632-33.59-7.632c-15.717,0-23.339,7.149-23.339,15.485 c0,10.247,9.047,14.769,29.78,22.632c28.341,10.479,41.681,25.239,41.681,47.874c0,26.909-20.721,49.786-64.792,49.786 c-18.338,0-36.449-4.776-45.497-9.77l7.38-30.016c9.772,5.014,24.775,10.006,40.264,10.006c16.671,0,25.488-6.908,25.488-17.396 C285.536,325.789,277.909,320.078,258.618,313.18z M69.474,302.692c0-54.781,39.074-85.269,87.654-85.269 c18.822,0,33.113,3.811,39.549,7.149l-7.392,28.816c-7.38-3.084-17.632-5.939-30.491-5.939c-28.822,0-51.206,17.375-51.206,53.099 c0,32.158,19.051,52.4,51.456,52.4c10.947,0,23.097-2.378,30.241-5.238l5.483,28.346c-6.672,3.34-21.674,6.919-41.208,6.919 C98.06,382.976,69.474,348.424,69.474,302.692z M451.534,520.962H96.757v-103.57h354.777V520.962z M427.518,380.583h-42.399 l-51.45-160.536h39.787l19.526,67.894c5.479,19.046,10.479,37.386,14.299,57.397h0.709c4.048-19.298,9.045-38.352,14.526-56.693 l20.487-68.598h38.599L427.518,380.583z" />\n            </svg>`;
    }
    static json(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" >\n            <polygon fill="${i}"  points="31 11 31 21 29 21 27 15 27 21 25 21 25 11 27 11 29 17 29 11 31 11"/><path fill="' + c + '"  d="M21.3335,21h-2.667A1.6684,1.6684,0,0,1,17,19.3335v-6.667A1.6684,1.6684,0,0,1,18.6665,11h2.667A1.6684,1.6684,0,0,1,23,12.6665v6.667A1.6684,1.6684,0,0,1,21.3335,21ZM19,19h2V13H19Z"/><path fill="' + c + '"  d="M13.3335,21H9V19h4V17H11a2.002,2.002,0,0,1-2-2V12.6665A1.6684,1.6684,0,0,1,10.6665,11H15v2H11v2h2a2.002,2.002,0,0,1,2,2v2.3335A1.6684,1.6684,0,0,1,13.3335,21Z"/><path fill="' + c + '"  d="M5.3335,21H2.6665A1.6684,1.6684,0,0,1,1,19.3335V17H3v2H5V11H7v8.3335A1.6684,1.6684,0,0,1,5.3335,21Z"/><rect fill="' + c + '"  id="_Transparent_Rectangle_" data-name="&lt;Transparent Rectangle&gt;" style="fill: none;" width="32" height="32"/>\n            </svg>`;
    }
    static excel(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 512 512">'\n            <path fill="#ECEFF1" d="M496,432.011H272c-8.832,0-16-7.168-16-16s0-311.168,0-320s7.168-16,16-16h224 c8.832,0,16,7.168,16,16v320C512,424.843,504.832,432.011,496,432.011z" />\n            <path fill="${i}" d="M336,176.011h-64c-8.832,0-16-7.168-16-16s7.168-16,16-16h64c8.832,0,16,7.168,16,16 S344.832,176.011,336,176.011z" />\n            <path fill="${i}" d="M336,240.011h-64c-8.832,0-16-7.168-16-16s7.168-16,16-16h64c8.832,0,16,7.168,16,16 S344.832,240.011,336,240.011z" />\n            <path fill="${i}" d="M336,304.011h-64c-8.832,0-16-7.168-16-16s7.168-16,16-16h64c8.832,0,16,7.168,16,16 S344.832,304.011,336,304.011z" />\n            <path fill="${i}" d="M336,368.011h-64c-8.832,0-16-7.168-16-16s7.168-16,16-16h64c8.832,0,16,7.168,16,16 S344.832,368.011,336,368.011z" />\n            <path fill="${i}" d="M432,176.011h-32c-8.832,0-16-7.168-16-16s7.168-16,16-16h32c8.832,0,16,7.168,16,16 S440.832,176.011,432,176.011z" />\n            <path fill="${i}" d="M432,240.011h-32c-8.832,0-16-7.168-16-16s7.168-16,16-16h32c8.832,0,16,7.168,16,16 S440.832,240.011,432,240.011z" />\n            <path fill="${i}" d="M432,304.011h-32c-8.832,0-16-7.168-16-16s7.168-16,16-16h32c8.832,0,16,7.168,16,16 S440.832,304.011,432,304.011z" />\n            <path fill="${i}" d="M432,368.011h-32c-8.832,0-16-7.168-16-16s7.168-16,16-16h32c8.832,0,16,7.168,16,16 S440.832,368.011,432,368.011z" />\n            <path fill="${i}"  d="M282.208,19.691c-3.648-3.04-8.544-4.352-13.152-3.392l-256,48C5.472,65.707,0,72.299,0,80.011v352 c0,7.68,5.472,14.304,13.056,15.712l256,48c0.96,0.192,1.952,0.288,2.944,0.288c3.712,0,7.328-1.28,10.208-3.68 c3.68-3.04,5.792-7.584,5.792-12.32v-448C288,27.243,285.888,22.731,282.208,19.691z" />\n            <path fill="#FAFAFA" d="M220.032,309.483l-50.592-57.824l51.168-65.792c5.44-6.976,4.16-17.024-2.784-22.464 c-6.944-5.44-16.992-4.16-22.464,2.784l-47.392,60.928l-39.936-45.632c-5.856-6.72-15.968-7.328-22.56-1.504 c-6.656,5.824-7.328,15.936-1.504,22.56l44,50.304L83.36,310.187c-5.44,6.976-4.16,17.024,2.784,22.464 c2.944,2.272,6.432,3.36,9.856,3.36c4.768,0,9.472-2.112,12.64-6.176l40.8-52.48l46.528,53.152 c3.168,3.648,7.584,5.504,12.032,5.504c3.744,0,7.488-1.312,10.528-3.968C225.184,326.219,225.856,316.107,220.032,309.483z" />\n            </svg>`;
    }
    static fit(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 16 16">\n                    <path fill="${i}" d="m 4 1 c -1.660156 0 -3 1.339844 -3 3 v 8 c 0 1.660156 1.339844 3 3 3 h 8 c 1.660156 0 3 -1.339844 3 -3 v -8 c 0 -1.660156 -1.339844 -3 -3 -3 z m 0 2 h 3.011719 v 2 h -2 v 2 h -2 l -0.011719 -3 c 0 -0.128906 0.027344 -0.253906 0.074219 -0.375 c 0.003906 -0.003906 0.003906 -0.007812 0.007812 -0.011719 c 0.046875 -0.117187 0.117188 -0.21875 0.203125 -0.308593 c 0.007813 -0.007813 0.011719 -0.011719 0.019532 -0.019532 c 0.089843 -0.085937 0.191406 -0.15625 0.308593 -0.203125 c 0.003907 -0.003906 0.007813 -0.007812 0.015625 -0.007812 c 0.117188 -0.046875 0.242188 -0.074219 0.371094 -0.074219 z m 5 0 h 3.011719 c 0.125 0 0.253906 0.027344 0.371093 0.074219 c 0.003907 0.003906 0.011719 0.003906 0.015626 0.007812 c 0.113281 0.046875 0.21875 0.117188 0.304687 0.203125 c 0.007813 0.007813 0.015625 0.011719 0.019531 0.019532 c 0.089844 0.089843 0.160156 0.191406 0.207032 0.308593 c 0 0.003907 0.003906 0.007813 0.007812 0.015625 c 0.046875 0.117188 0.070312 0.242188 0.074219 0.371094 l -0.011719 3 h -2 v -2 h -2 z m -5.988281 6 h 2 v 2 h 2 v 2 h -3.011719 c -0.128906 0 -0.253906 -0.027344 -0.375 -0.074219 c -0.003906 -0.003906 -0.007812 -0.003906 -0.011719 -0.007812 c -0.117187 -0.046875 -0.21875 -0.117188 -0.308593 -0.203125 c -0.007813 -0.007813 -0.011719 -0.011719 -0.019532 -0.019532 c -0.085937 -0.089843 -0.15625 -0.191406 -0.203125 -0.308593 c -0.003906 -0.003907 -0.007812 -0.007813 -0.007812 -0.015625 c -0.046875 -0.117188 -0.074219 -0.242188 -0.074219 -0.371094 z m 7.988281 0 h 2 l 0.011719 3 c -0.003907 0.128906 -0.027344 0.253906 -0.074219 0.375 c -0.003906 0.003906 -0.003906 0.007812 -0.007812 0.011719 c -0.046876 0.117187 -0.117188 0.21875 -0.203126 0.308593 c -0.007812 0.007813 -0.015624 0.011719 -0.019531 0.019532 c -0.089843 0.085937 -0.195312 0.15625 -0.308593 0.203125 c -0.003907 0.003906 -0.011719 0.007812 -0.015626 0.007812 c -0.117187 0.046875 -0.246093 0.074219 -0.371093 0.074219 h -3.011719 v -2 h 2 z m 0 0" fill="#2e3436"/>\n                </svg>`;
    }
    static undo(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">\n                    <path fill="${i}" d="M6.507,17.508l20.963,-0.008c0.828,-0 1.5,-0.673 1.5,-1.501c-0.001,-0.827 -0.673,-1.499 -1.501,-1.499l-20.975,0.008c0.088,-0.119 0.188,-0.231 0.298,-0.334c0,0 9.705,-9.079 9.705,-9.079c0.605,-0.565 0.636,-1.515 0.071,-2.12c-0.566,-0.604 -1.516,-0.636 -2.12,-0.07c-0,-0 -5.9,5.519 -9.705,9.078c-1.118,1.045 -1.749,2.509 -1.743,4.038c0.006,1.53 0.649,2.989 1.774,4.025c3.848,3.543 9.829,9.05 9.829,9.05c0.609,0.56 1.559,0.521 2.119,-0.088c0.561,-0.609 0.522,-1.558 -0.087,-2.119c-0,-0 -5.98,-5.507 -9.828,-9.05c-0.111,-0.102 -0.211,-0.213 -0.3,-0.331Z"/>\n                </svg>`;
    }
    static redo(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">\n                    <path fill="${i}" d="M25.468,14.508l-20.967,-0.008c-0.828,-0 -1.501,0.672 -1.501,1.499c-0,0.828 0.672,1.501 1.499,1.501l21.125,0.009c-0.107,0.159 -0.234,0.306 -0.377,0.439c-3.787,3.502 -9.68,8.951 -9.68,8.951c-0.608,0.562 -0.645,1.511 -0.083,2.119c0.562,0.608 1.512,0.645 2.12,0.083c-0,0 5.892,-5.448 9.68,-8.95c1.112,-1.029 1.751,-2.47 1.766,-3.985c0.014,-1.515 -0.596,-2.968 -1.688,-4.018l-9.591,-9.221c-0.596,-0.574 -1.547,-0.556 -2.121,0.041c-0.573,0.597 -0.555,1.547 0.042,2.121l9.591,9.221c0.065,0.063 0.127,0.129 0.185,0.198Z"/>\n                </svg>`;
    }
    static cut(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">\n                    <path fill="${i}" d="M16,13.879l-10.939,-10.94c-0.586,-0.585 -1.536,-0.585 -2.122,0c-0.585,0.586 -0.585,1.536 0,2.122l10.94,10.939l-3.567,3.566c-0.692,-0.361 -1.478,-0.566 -2.312,-0.566c-2.76,0 -5,2.24 -5,5c0,2.76 2.24,5 5,5c2.76,0 5,-2.24 5,-5c0,-0.834 -0.205,-1.62 -0.566,-2.312l3.566,-3.567l3.566,3.567c-0.361,0.692 -0.566,1.478 -0.566,2.312c0,2.76 2.24,5 5,5c2.76,0 5,-2.24 5,-5c0,-2.76 -2.24,-5 -5,-5c-0.834,0 -1.62,0.205 -2.312,0.566l-3.567,-3.566l10.94,-10.939c0.585,-0.586 0.585,-1.536 -0,-2.122c-0.586,-0.585 -1.536,-0.585 -2.122,0l-10.939,10.94Z"/>\n                </svg>`;
    }
    static copy(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32"  style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" >\n                    <path fill="${i}" d="M9.101,7l8.899,0c1.857,-0 3.637,0.737 4.95,2.05c1.313,1.313 2.05,3.093 2.05,4.95l0,8.899c0.953,-0.195 1.837,-0.665 2.536,-1.363c0.937,-0.938 1.464,-2.21 1.464,-3.536c0,-2.977 0,-7.023 0,-10c0,-1.326 -0.527,-2.598 -1.464,-3.536c-0.938,-0.937 -2.21,-1.464 -3.536,-1.464c-2.977,0 -7.023,0 -10,0c-1.326,-0 -2.598,0.527 -3.536,1.464c-0.698,0.699 -1.168,1.583 -1.363,2.536Z"/>\n                    <path fill="${i}" d="M23,14c0,-1.326 -0.527,-2.598 -1.464,-3.536c-0.938,-0.937 -2.21,-1.464 -3.536,-1.464c-2.977,0 -7.023,0 -10,0c-1.326,-0 -2.598,0.527 -3.536,1.464c-0.937,0.938 -1.464,2.21 -1.464,3.536c0,2.977 0,7.023 0,10c-0,1.326 0.527,2.598 1.464,3.536c0.938,0.937 2.21,1.464 3.536,1.464c2.977,-0 7.023,-0 10,-0c1.326,0 2.598,-0.527 3.536,-1.464c0.937,-0.938 1.464,-2.21 1.464,-3.536l0,-10Zm-15,10l10,0c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1l-10,0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Zm0,-4l10,0c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1l-10,0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Zm0,-4l10,0c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1l-10,0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Z"/>\n                </svg>`;
    }
    static paste(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">\n                    <path fill="${i}" d="M23,14c0,-1.326 -0.527,-2.598 -1.464,-3.536c-0.938,-0.937 -2.21,-1.464 -3.536,-1.464c-2.977,0 -7.023,0 -10,0c-1.326,-0 -2.598,0.527 -3.536,1.464c-0.937,0.938 -1.464,2.21 -1.464,3.536c-0,2.977 -0,7.023 -0,10c-0,1.326 0.527,2.598 1.464,3.536c0.938,0.937 2.21,1.464 3.536,1.464c2.977,-0 7.023,-0 10,-0c1.326,0 2.598,-0.527 3.536,-1.464c0.937,-0.938 1.464,-2.21 1.464,-3.536l-0,-10Z"/>\n                    <path fill="${i}" d="M9.101,7l8.899,0c1.857,-0 3.637,0.737 4.95,2.05c1.313,1.313 2.05,3.093 2.05,4.95l-0,8.899c0.953,-0.195 1.837,-0.665 2.536,-1.363c0.937,-0.938 1.464,-2.21 1.464,-3.536c0,-2.977 0,-7.023 0,-10c0,-1.326 -0.527,-2.598 -1.464,-3.536c-0.938,-0.937 -2.21,-1.464 -3.536,-1.464c-2.977,0 -7.023,0 -10,0c-1.326,-0 -2.598,0.527 -3.536,1.464c-0.698,0.699 -1.168,1.583 -1.363,2.536Z"/>\n                </svg>`;
    }
    static delete(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">\n                    <path fill="${i}" d="M11,4.5l10,0c0.828,-0 1.5,-0.672 1.5,-1.5c-0,-0.828 -0.672,-1.5 -1.5,-1.5l-10,0c-0.828,-0 -1.5,0.672 -1.5,1.5c-0,0.828 0.672,1.5 1.5,1.5Z"/>\n                    <path fill="${i}" d="M5,9.5l0,16.5c0,2.761 2.239,5 5,5l12,0c2.761,0 5,-2.239 5,-5l0,-16.5l1.645,0c0.748,-0 1.355,-0.672 1.355,-1.5c-0,-0.828 -0.607,-1.5 -1.355,-1.5l-25.29,0c-0.748,-0 -1.355,0.672 -1.355,1.5c-0,0.828 0.607,1.5 1.355,1.5l1.645,0Zm7,3.5l0,12c-0,0.552 0.448,1 1,1c0.552,0 1,-0.448 1,-1l0,-12c-0,-0.552 -0.448,-1 -1,-1c-0.552,0 -1,0.448 -1,1Zm6,-0l0,12c0,0.552 0.448,1 1,1c0.552,-0 1,-0.448 1,-1l0,-12c0,-0.552 -0.448,-1 -1,-1c-0.552,-0 -1,0.448 -1,1Z"/>\n                </svg>`;
    }
    static addPlusNew(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32">\n                    <path fill="${i}" d="M14.5,14.501l-10.502,0c-0.828,0 -1.5,0.673 -1.5,1.5c0,0.828 0.672,1.5 1.5,1.5l10.502,0l-0.001,10.502c0,0.828 0.672,1.5 1.5,1.501c0.828,-0 1.5,-0.673 1.5,-1.5l0.001,-10.503l10.502,0c0.828,0 1.5,-0.672 1.5,-1.5c0,-0.827 -0.672,-1.5 -1.5,-1.5l-10.502,0l0.001,-10.501c-0,-0.828 -0.672,-1.501 -1.5,-1.501c-0.828,0 -1.5,0.672 -1.5,1.5l-0.001,10.502Z"/>    \n                </svg>`;
    }
    static minus(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32">\n                    <line stroke="${i}" stroke-width="3" x1="3" y1="16" x2="29" y2="16"></line>\n                </svg>`;
    }
    static editToolPencil(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">\n                    <path fill="${i}" d="M12.965,5.462c0,-0 -2.584,0.004 -4.979,0.008c-3.034,0.006 -5.49,2.467 -5.49,5.5l0,13.03c0,1.459 0.579,2.858 1.611,3.889c1.031,1.032 2.43,1.611 3.889,1.611l13.003,0c3.038,-0 5.5,-2.462 5.5,-5.5c0,-2.405 0,-5.004 0,-5.004c0,-0.828 -0.672,-1.5 -1.5,-1.5c-0.827,-0 -1.5,0.672 -1.5,1.5l0,5.004c0,1.381 -1.119,2.5 -2.5,2.5l-13.003,0c-0.663,-0 -1.299,-0.263 -1.768,-0.732c-0.469,-0.469 -0.732,-1.105 -0.732,-1.768l0,-13.03c0,-1.379 1.117,-2.497 2.496,-2.5c2.394,-0.004 4.979,-0.008 4.979,-0.008c0.828,-0.002 1.498,-0.675 1.497,-1.503c-0.001,-0.828 -0.675,-1.499 -1.503,-1.497Z"/>\n                    <path fill="${i}" d="M20.046,6.411l-6.845,6.846c-0.137,0.137 -0.232,0.311 -0.271,0.501l-1.081,5.152c-0.069,0.329 0.032,0.671 0.268,0.909c0.237,0.239 0.577,0.343 0.907,0.277l5.194,-1.038c0.193,-0.039 0.371,-0.134 0.511,-0.274l6.845,-6.845l-5.528,-5.528Zm1.415,-1.414l5.527,5.528l1.112,-1.111c1.526,-1.527 1.526,-4.001 -0,-5.527c-0.001,-0 -0.001,-0.001 -0.001,-0.001c-1.527,-1.526 -4.001,-1.526 -5.527,-0l-1.111,1.111Z"/>\n                </svg>`;
    }
    static saveStorageFolder(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">\n                <path fill="${i}" d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"/>\n            </svg>`;
    }
    static share(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 16 16">\n                <path fill="${i}" d="M11 6C12.6569 6 14 4.65685 14 3C14 1.34315 12.6569 0 11 0C9.34315 0 8 1.34315 8 3C8 3.22371 8.02449 3.44169 8.07092 3.65143L4.86861 5.65287C4.35599 5.24423 3.70652 5 3 5C1.34315 5 0 6.34315 0 8C0 9.65685 1.34315 11 3 11C3.70652 11 4.35599 10.7558 4.86861 10.3471L8.07092 12.3486C8.02449 12.5583 8 12.7763 8 13C8 14.6569 9.34315 16 11 16C12.6569 16 14 14.6569 14 13C14 11.3431 12.6569 10 11 10C10.2935 10 9.644 10.2442 9.13139 10.6529L5.92908 8.65143C5.97551 8.44169 6 8.22371 6 8C6 7.77629 5.97551 7.55831 5.92908 7.34857L9.13139 5.34713C9.644 5.75577 10.2935 6 11 6Z" fill="#000000"/>\n                </svg>`;
    }
    static arrow(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}"  viewBox="0 0 24 24" >\n            <path d="M12 6V18M12 6L7 11M12 6L17 11" stroke="${i}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\n        </svg>`;
    }
    static user(t, e, i, r, a) {
      return `<svg width="${t}" height="${e}" x="${r}" y="${a}" viewBox="0 0 24 24">\n                    <path fill="${i}" d="M12 11.796C14.7189 11.796 16.9231 9.60308 16.9231 6.89801C16.9231 4.19294 14.7189 2.00005 12 2.00005C9.28106 2.00005 7.07692 4.19294 7.07692 6.89801C7.07692 9.60308 9.28106 11.796 12 11.796Z" fill="#030D45"/>\n                    <path fill="${i}" d="M14.5641 13.8369H9.4359C6.46154 13.8369 4 16.2859 4 19.245C4 19.9593 4.30769 20.5716 4.92308 20.8777C5.84615 21.3879 7.89744 22.0001 12 22.0001C16.1026 22.0001 18.1538 21.3879 19.0769 20.8777C19.5897 20.5716 20 19.9593 20 19.245C20 16.1838 17.5385 13.8369 14.5641 13.8369Z" fill="#030D45"/>\n                </svg>`;
    }
  }),
  (FlowChart.ShapeCollection = class extends Array {
    _;
    constructor(t) {
      super(), (this._ = new FlowChart.ShapeCollection.private(t));
    }
    get last() {
      return this.length ? this[this.length - 1] : null;
    }
    get first() {
      return this.length ? this[0] : null;
    }
    get top() {
      return this._.minY;
    }
    get bottom() {
      return this._.maxY;
    }
    get left() {
      return this._.minX;
    }
    get right() {
      return this._.maxX;
    }
    addRange(t) {
      this._.chart._.snap();
      var e = this._.addRange(t);
      return this.push(...e), this._.chart._.changed({ property: 'shapes' }), e;
    }
    add(t) {
      return this.addRange([t])[0];
    }
    get(t) {
      if (!(arguments.length >= 3)) {
        for (var e of this) if (e.id == t) return e;
        return null;
      }
      var i = arguments[0],
        r = arguments[1],
        a = arguments[2],
        o = arguments[3],
        s = arguments[4];
      for (var e of (null == o && (o = ''), null == s && (s = ''), this))
        if (e.from == i && e.to == r && e.position == a && e.fromPort == o && e.toPort == s)
          return e;
    }
    clear() {
      this._.remove(this, this);
    }
    removeRange(t) {
      this._.remove(t, this);
    }
    remove(t) {
      t && this._.remove([t], this);
    }
    contains(t) {
      return null != this.get(t);
    }
  }),
  (FlowChart.ShapeCollection.private = class {
    chart;
    moveHorizontallyInterval;
    moveVerticallyInterval;
    metadata;
    minX;
    minY;
    maxX;
    maxY;
    minShapeX;
    minShapeY;
    maxShapeX;
    maxShapeY;
    constructor(t) {
      (this.chart = t),
        (this.moveHorizontallyInterval = null),
        (this.moveVerticallyInterval = null),
        (this.metadata = {}),
        (this.minX = Number.MAX_SAFE_INTEGER),
        (this.minY = Number.MAX_SAFE_INTEGER),
        (this.maxX = Number.MIN_SAFE_INTEGER),
        (this.maxY = Number.MIN_SAFE_INTEGER),
        (this.minShapeX = null),
        (this.minShapeY = null),
        (this.maxShapeX = null),
        (this.maxShapeY = null);
    }
    getProperty(t, e, i) {
      if (null == t[e]) {
        var r = FlowChart.shapeTemplates[t.templateId];
        if (null != r[e] && 'function' != typeof r[e]) return r[e];
      }
      if ('x' == e || 'y' == e) {
        if ('label' == i.type) return this.metadata[i.id][e];
        if (null == t[e]) return 0;
      }
      return Reflect.get(...arguments);
    }
    setProperty(t, e, i, r) {
      var a = FlowChart.shapeTemplates[t.templateId];
      'label' != r.type || ('x' != e && 'y' != e)
        ? a[e] && 'function' != typeof a[e]
          ? ((t[e] == a[e]) == i && delete t[e],
            a[e] != i
              ? this.setPropertyAndCallFieldChange(t, e, i, r)
              : a[e] != i ||
                FlowChart.isNEU(t[e]) ||
                this.setPropertyAndCallFieldChange(t, e, i, r))
          : this.setPropertyAndCallFieldChange(t, e, i, r)
        : (this.metadata[r.id] || (this.metadata[r.id] = {}), (this.metadata[r.id][e] = i));
    }
    setPropertyAndCallFieldChange(t, e, i, r) {
      if ('width' != e && 'height' != e && 'opacity' != e && 'x' != e && 'y' != e) {
        var a = { shape: r, newValue: i, fieldName: e };
        return !1 !== FlowChart.events.publish('field-change', [this.chart, a]) && (t[e] = i), !0;
      }
      t[e] = i;
    }
    setSelected(t, e) {
      (0 != this.chart.options.selectable && 0 != t.selectable) || (e = !1);
      var i = t.selected,
        r = this.getMetadata(t.id);
      i != e &&
        ((r.selected = e),
        !i && e
          ? (this.chart.selectedShapes.add(t), this.chart.selectedShapes._.createSelectorElement(t))
          : i &&
            !e &&
            (this.chart.selectedShapes.remove(t),
            this.chart.selectedShapes._.removeSelectorElement(t)));
    }
    clearSelectedMetadata() {
      for (var t in this.metadata) {
        this.metadata[t].selected = !1;
        var e = this.chart.svgElement.querySelector(`[data-selector-shape-id="${t}"]`);
        e && e.parentNode.removeChild(e);
      }
    }
    setWidth(t, e) {
      if (t.canWidthFitContent) {
        var i = FlowChart.shapeTemplates[t.templateId],
          r = this.getMetadata(t.id);
        e < i.minWidth && (e = i.minWidth),
          r.width != e && ((r.width = e), (t.SYSTEM_CHANGE_SIZE = !0));
      } else t.width = e;
    }
    setHeight(t, e) {
      if (t.canHeightFitContent) {
        var i = FlowChart.shapeTemplates[t.templateId],
          r = this.getMetadata(t.id);
        e < i.minHeight && (e = i.minHeight),
          r.height != e && ((r.height = e), (t.SYSTEM_CHANGE_SIZE = !0));
      } else t.height = e;
    }
    addRange(t) {
      for (var e = [], i = 0; i < t.length; i++) {
        var r = t[i];
        if (FlowChart.private.isLabel(r)) {
          r.templateId || (r.templateId = FlowChart.DEFAULT_LABEL_SHAPE_ID);
          var a = '';
          FlowChart.isNEU(r.fromPort) || (a = r.fromPort);
          var o = '';
          FlowChart.isNEU(r.toPort) || (o = r.toPort);
          var s = this.chart.links.get(r.from, r.to, a, o),
            l = FlowChart.private.getLabelXY(r, s),
            h = `${r.from}${FlowChart.SEPARATOR}${a}${FlowChart.SEPARATOR}${r.to}${FlowChart.SEPARATOR}${o}${FlowChart.SEPARATOR}${r.position}`;
          (this.metadata[h] = {}), (this.metadata[h].x = l.x), (this.metadata[h].y = l.y);
        }
        var n = this.set(r);
        e.push(n);
      }
      return (this.chart.selectedPortShape = null), e;
    }
    set(t) {
      var e = this;
      FlowChart.shapeTemplates[t.templateId] ||
        console.error(`Shape template "${t.templateId}" does not exist!`),
        !FlowChart.private.isLabel(t) && FlowChart.isNEU(t.id) && (t.id = this.chart.generateId());
      var i = t.id;
      FlowChart.private.isLabel(t) || 'string' == typeof i || (i = i.toString());
      var r = (t, i) => {
          if (e.chart.skip) return !0;
          var r = FlowChart.shapeTemplates[t.templateId];
          if (!(h = t.element)) {
            var a = r.html(t),
              o = r.svg(t),
              s = r.svgFront(t),
              l = r.offset(t),
              h = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
              n = t.strokeWidth / 2,
              d = t.strokeWidth / 2,
              p = t.height - t.strokeWidth,
              c = t.width - t.strokeWidth;
            p < 0 && (p = 0),
              c < 0 && (c = 0),
              (h.innerHTML = `<g class="bfc-svg-back">${o}</g>\n                                             <foreignObject pointer-events="all" class="bfc-html" x="${n}" y="${d}" width="${c}" height="${p}"><div data-html-container class="bfc-flex-center">${a}</div></foreignObject>\n                                             <g class="bfc-svg-front">${s}</g>`),
              h.setAttribute('data-shape-id', t.id),
              h.setAttribute('transform', `translate(${t.left + l.x},${t.top + l.y})`),
              h.classList.add(t.templateId),
              null != t.opacity && (h.style.opacity = t.opacity),
              FlowChart.private.getLayer(e.chart.svgElement, t.layer).appendChild(h);
          }
          if (null != i) {
            var f = h.querySelector('[data-html-container]'),
              u = h.querySelector('.bfc-html'),
              m = h.querySelector('.bfc-svg-back'),
              g = h.querySelector('.bfc-svg-front');
            if ('x' == i || 'y' == i)
              (l = r.offset(t)),
                h.setAttribute('transform', `translate(${t.left + l.x},${t.top + l.y})`);
            else if ('width' == i || 'height' == i || 'SYSTEM_CHANGE_SIZE' == i) {
              (l = r.offset(t)), (m.innerHTML = r.svg(t)), (g.innerHTML = r.svgFront(t));
              var y = t.width - t.strokeWidth,
                v = t.height - t.strokeWidth;
              y < 0 && (y = 0),
                v < 0 && (v = 0),
                u.setAttribute('width', y),
                u.setAttribute('height', v),
                h.setAttribute('transform', `translate(${t.left + l.x},${t.top + l.y})`);
            }
            if (
              'x' == i ||
              'y' == i ||
              'width' == i ||
              'height' == i ||
              'SYSTEM_CHANGE_SIZE' == i
            ) {
              for (var w of (e.chart.selectedShapes._.update(t, e.chart.scale),
              e.chart._.updatePortsElement(e.chart.scale),
              e.chart.links))
                if (w.from == t.id || w.to == t.id) {
                  var C = e.chart.ports.getByLink(w),
                    b = FlowChart.private.linkFromTo(
                      C.fromShape,
                      C.toShape,
                      C.fromPort,
                      C.toPort,
                      e.chart
                    );
                  w.points = b;
                }
              e.minMax(t);
            }
            if (
              'selected' != i &&
              'x' != i &&
              'y' != i &&
              'width' != i &&
              'height' != i &&
              'SYSTEM_CHANGE_SIZE' != i &&
              ((a = (r = FlowChart.shapeTemplates[t.templateId]).html(t)),
              (f.innerHTML = a),
              (m.innerHTML = r.svg(t)),
              (g.innerHTML = r.svgFront(t)),
              t.canWidthFitContent || t.canHeightFitContent)
            ) {
              var x = e.chart._.getSizeOfHTML(a);
              if (t.canWidthFitContent) {
                var F = x.width;
                F < r.minWidth && (F = r.minWidth), e.setWidth(t, F);
              }
              if (t.canHeightFitContent) {
                var I = x.height;
                I < r.minHeight && (I = r.minHeight), e.setHeight(t, I);
              }
            }
            'opacity' == i && (h.style.opacity = t[i]);
          }
        },
        a = new Proxy(t, {
          deleteProperty: (t, i, a) => (delete t[i], (a = e.chart.getShape(t.id)), r(a, i), !0),
          get(t, i, r) {
            var a = FlowChart.shapeTemplates[t.templateId];
            return 'top' == i
              ? r.y - r.height / 2
              : 'bottom' == i
                ? r.y + r.height / 2
                : 'left' == i
                  ? r.x - r.width / 2
                  : 'right' == i
                    ? r.x + r.width / 2
                    : ('fromPort' == i && FlowChart.isNEU(t.fromPort)) ||
                        ('toPort' == i && FlowChart.isNEU(t.toPort))
                      ? ''
                      : 'layer' == i && FlowChart.isNEU(t.layer)
                        ? 'label' == r.type
                          ? -1
                          : -2
                        : 'id' == i && 'label' == r.type
                          ? `${r.from}${FlowChart.SEPARATOR}${r.fromPort}${FlowChart.SEPARATOR}${r.to}${FlowChart.SEPARATOR}${r.toPort}${FlowChart.SEPARATOR}${r.position}`
                          : 'width' == i && 'fit' == a.width && null == t.width
                            ? e.metadata[r.id] && null != e.metadata[r.id].width
                              ? e.metadata[r.id].width
                              : a.width
                            : 'height' == i && 'fit' == a.height && null == t.height
                              ? e.metadata[r.id] && null != e.metadata[r.id].height
                                ? e.metadata[r.id].height
                                : a.height
                              : 'selected' == i
                                ? !(!e.metadata[r.id] || 1 != e.metadata[r.id].selected)
                                : ('canWidthFitContent' == i &&
                                    'fit' == a.width &&
                                    null == t.width) ||
                                  ('canHeightFitContent' == i &&
                                    'fit' == a.height &&
                                    null == t.height) ||
                                  ('element' == i
                                    ? e.getElement(r.id)
                                    : 'link' == i && 'label' == r.type
                                      ? e.chart.links.get(r.from, r.to, r.fromPort, r.toPort)
                                      : e.getProperty(...arguments));
          },
          set(t, i, a, o) {
            if (o[i] == a) return !0;
            var s = FlowChart.shapeTemplates[t.templateId];
            if (
              ('width' == i && a < s.minWidth && (a = s.minWidth),
              'height' == i && a < s.minHeight && (a = s.minHeight),
              'selected' == i && e.setSelected(o, a),
              'to' == i ||
                'from' == i ||
                'fromPort' == i ||
                'toPort' == i ||
                'id' == i ||
                'templateId' == i)
            ) {
              var l = o.element;
              l && l.parentNode.removeChild(l);
            }
            if ('SYSTEM_CHANGE_SIZE' != i && 'selected' != i) {
              e.chart._.snap();
              var h = e.beforeIdChange(i, o, t);
              e.setProperty(t, i, a, o), e.afterIdChange(h, o);
            }
            return (
              r(o, i),
              'SYSTEM_CHANGE_SIZE' != i &&
                'selected' != i &&
                e.chart._.changed({ property: 'shapes' }),
              !0
            );
          },
        }),
        o = FlowChart.shapeTemplates[t.templateId];
      if ('fit' == o.width || 'fit' == o.height) {
        var s = o.html(a),
          l = this.chart._.getSizeOfHTML(s);
        if ('fit' == o.width) {
          var h = l.width;
          h < o.minWidth && (h = o.minWidth),
            this.metadata[a.id] || (this.metadata[a.id] = {}),
            (this.metadata[a.id].width = h);
        }
        if ('fit' == o.height) {
          var n = l.height;
          n < o.minHeight && (n = o.minHeight),
            this.metadata[a.id] || (this.metadata[a.id] = {}),
            (this.metadata[a.id].height = n);
        }
      }
      return r(a), this.minMax(a), a;
    }
    beforeIdChange(t, e) {
      var i = null;
      return (
        ('to' != t &&
          'from' != t &&
          'fromPort' != t &&
          'toPort' != t &&
          'id' != t &&
          'templateId' != t) ||
          (((i = {
            from: e.from,
            to: e.to,
            fromPort: e.fromPort,
            toPort: e.toPort,
            id: e.id,
            metadata: null,
          }).metadata = this.metadata[e.id]),
          delete this.metadata[e.id]),
        i
      );
    }
    afterIdChange(t, e) {
      if (t)
        if (((this.metadata[e.id] = t.metadata), 'label' == e.type))
          for (var i of this.chart.links)
            i.from == t.from &&
              i.to == t.to &&
              i.fromPort == t.fromPort &&
              i.toPort == t.toPort &&
              ((i.from = e.from), (i.to = e.to), (i.fromPort = e.fromPort), (i.toPort = e.toPort));
        else
          for (var i of this.chart.links)
            i.from == t.id && (i.from = e.id), i.to == t.id && (i.to = e.id);
    }
    getElement(t) {
      return this.chart.svgElement.querySelector(`[data-shape-id="${t}"]`);
    }
    remove(t, e) {
      var i = !1;
      t instanceof FlowChart.SelectedShapeCollection ||
        t instanceof FlowChart.ShapeCollection ||
        Array.isArray(t) ||
        (t = [t]);
      var r = [];
      for (var a of t) r.push(a.id);
      for (var o of r)
        for (var s = e.length - 1; s >= 0; s--)
          if (e[s].id == o) {
            ((a = e[s]).selected = !1), (this.chart.selectedPortShape = null);
            var l = this.getElement(o);
            l && l.parentNode.removeChild(l),
              this.chart.links.remove(o),
              i || (this.chart._.snap(), (i = !0)),
              this.metadata[a.id] && delete this.metadata[a.id],
              e.splice(s, 1);
            break;
          }
      i && (this.minMaxIterateAll(e), this.chart._.changed({ property: 'shapes' }));
    }
    move(t, e, i, r, a) {
      if (t.length)
        if (e) {
          if (
            ((e != FlowChart.move.left && e != FlowChart.move.right) ||
              !this.moveHorizontallyInterval) &&
            ((e != FlowChart.move.up && e != FlowChart.move.down) || !this.moveVerticallyInterval)
          ) {
            var o = 1;
            FlowChart.isNEU(r) && (r = FlowChart.anim.inSin),
              FlowChart.isNEU(a) && (a = 1100),
              (e != FlowChart.move.left && e != FlowChart.move.right) ||
                (this.moveHorizontallyInterval = setInterval(s, 10)),
              (e != FlowChart.move.up && e != FlowChart.move.down) ||
                (this.moveVerticallyInterval = setInterval(s, 10));
          }
        } else console.error('movePosition parameter not defined');
      function s() {
        var s = r((10 * o - 10) / a);
        for (var l of t)
          e == FlowChart.move.left
            ? (l.x -= FlowChart.MOVE_NODE_STEP * s)
            : e == FlowChart.move.right
              ? (l.x += FlowChart.MOVE_NODE_STEP * s)
              : e == FlowChart.move.up
                ? (l.y -= FlowChart.MOVE_NODE_STEP * s)
                : e == FlowChart.move.down && (l.y += FlowChart.MOVE_NODE_STEP * s);
        i && i(), (o += 1);
      }
    }
    stopMoving(t) {
      t == FlowChart.direction.vertical
        ? this.moveVerticallyInterval &&
          (clearInterval(this.moveVerticallyInterval), (this.moveVerticallyInterval = null))
        : (t == FlowChart.direction.horizontal ||
            (this.moveVerticallyInterval &&
              (clearInterval(this.moveVerticallyInterval), (this.moveVerticallyInterval = null))),
          this.moveHorizontallyInterval &&
            (clearInterval(this.moveHorizontallyInterval), (this.moveHorizontallyInterval = null)));
    }
    minMax(t) {
      'node' == t.type &&
        (t.left < this.minX && ((this.minX = t.left), (this.minShapeX = t)),
        t.top < this.minY && ((this.minY = t.top), (this.minShapeY = t)),
        t.right > this.maxX && ((this.maxX = t.right), (this.maxShapeX = t)),
        t.bottom > this.maxY && ((this.maxY = t.bottom), (this.maxShapeY = t)));
    }
    minMaxIterateAll(t) {
      for (var e of ((this.minX = Number.MAX_SAFE_INTEGER),
      (this.minY = Number.MAX_SAFE_INTEGER),
      (this.maxX = Number.MIN_SAFE_INTEGER),
      (this.maxY = Number.MIN_SAFE_INTEGER),
      (this.minShapeX = null),
      (this.minShapeY = null),
      (this.maxShapeX = null),
      (this.maxShapeY = null),
      t))
        this.minMax(e);
    }
    getMetadata(t) {
      return (
        this.metadata[t] || (this.metadata[t] = { width: void 0, height: void 0 }), this.metadata[t]
      );
    }
  }),
  (FlowChart.linkTemplates = {
    rounded: {
      path: (t) =>
        FlowChart.private.roundPathCorners(t.points, FlowChart.LINK_ROUNDED_CORENERS, !1),
      svg: (t) =>
        `<path d="" style="fill: none; stroke: ${t.stroke}; stroke-width: ${t.strokeWidth}px;" marker-start="url(#rounded_start)" marker-end="url(#rounded_end)" ></path>`,
      markerStart: '',
      markerEnd:
        '<marker id="rounded_end" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto">\n                                <path d="M 0 0 L 5 2.5 L 0 5 z" fill="context-stroke"  />\n                            </marker>',
      markerMid: '',
      stroke: '#aeaeae',
      strokeWidth: 4,
    },
  }),
  (FlowChart.linkTemplates.psuedo = Object.assign({}, FlowChart.linkTemplates.rounded)),
  (FlowChart.linkTemplates.psuedo.stroke = '#FFCA28'),
  (FlowChart.linkTemplates.psuedo.strokeWidth = 4),
  (FlowChart.shapeTemplates = {
    base: {
      offset: (t) => ({ x: 0, y: 0 }),
      svg: (t) =>
        `<rect rx="7" ry="7" x="0" y="0" width="${t.width}" height="${t.height}" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};" ></rect>`,
      svgFront: (t) => '',
      html: (t) =>
        `<div style="padding: 10px;">\n                        <div data-field="text"> ${null == t.text ? `[${t.displayName}]` : t.text}</div>                       \n                    </div>`,
      ports: (t) => ({
        top: { x: t.width / 2, y: 0 },
        right: { x: t.width, y: t.height / 2 },
        bottom: { x: t.width / 2, y: t.height },
        left: { x: 0, y: t.height / 2 },
      }),
      type: 'node',
      displayInShapeBar: !1,
      displayInPortShapeBar: !1,
      fill: '#039BE5',
      stroke: '#aeaeae',
      strokeWidth: 4,
      minWidth: 200,
      minHeight: 90,
      width: 'fit',
      height: 'fit',
      displayName: 'Base',
      resizable: !0,
      selectable: !0,
      movable: !0,
    },
  }),
  (FlowChart.shapeTemplates.startEnd = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.startEnd.svg = (t) => {
    var e = (t.height / 100) * 45;
    return `<rect rx="${e}" ry="${e}" x="0" y="0" width="${t.width}" height="${t.height}" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};" ></rect>`;
  }),
  (FlowChart.shapeTemplates.startEnd.displayName = 'Start/End'),
  (FlowChart.shapeTemplates.startEnd.displayInShapeBar = !0),
  (FlowChart.shapeTemplates.startEnd.displayInPortShapeBar = !0),
  (FlowChart.shapeTemplates.process = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.process.displayName = 'Process'),
  (FlowChart.shapeTemplates.process.displayInShapeBar = !0),
  (FlowChart.shapeTemplates.process.displayInPortShapeBar = !0),
  (FlowChart.shapeTemplates.document = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.document.svg = (t) => {
    var e = t.width / 10;
    return `<path d="M0,0 L0,${t.height} Q ${t.width / 4} ${t.height + e}, ${t.width / 2} ${t.height} T ${t.width} ${t.height} L${t.width},${t.height} L${t.width},0 Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"></path>`;
  }),
  (FlowChart.shapeTemplates.document.displayName = 'Document'),
  (FlowChart.shapeTemplates.decision = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.decision.displayName = 'Decision'),
  (FlowChart.shapeTemplates.decision.svg = (t) =>
    `<path  d="M${t.width / 2},0 L${t.width},${t.height / 2} L${t.width / 2},${t.height} L0,${t.height / 2} Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};" /></path>`),
  (FlowChart.shapeTemplates.decision.width = 200),
  (FlowChart.shapeTemplates.decision.height = 180),
  (FlowChart.shapeTemplates.decision.displayInShapeBar = !0),
  (FlowChart.shapeTemplates.decision.displayInPortShapeBar = !0),
  (FlowChart.shapeTemplates.inOut = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.inOut.svg = (t) => {
    var e = t.width / 10;
    return `<path d="M${e},0 L0,${t.height} L${t.width - e},${t.height} L${t.width},0 Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"></path>`;
  }),
  (FlowChart.shapeTemplates.inOut.ports = (t) => {
    var e = t.width / 10 / 2;
    return {
      top: { x: t.width / 2, y: 0 },
      right: { x: t.width - e, y: t.height / 2 },
      bottom: { x: t.width / 2, y: t.height },
      left: { x: e, y: t.height / 2 },
    };
  }),
  (FlowChart.shapeTemplates.inOut.displayName = 'In/Out'),
  (FlowChart.shapeTemplates.inOut.displayInShapeBar = !0),
  (FlowChart.shapeTemplates.inOut.displayInPortShapeBar = !0),
  (FlowChart.shapeTemplates.inOut.static = !1),
  (FlowChart.shapeTemplates.manualInput = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.manualInput.svg = (t) =>
    `<path d="M0,${t.width / 10} L0,${t.height} L${t.width},${t.height} L${t.width},0 Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"></path>`),
  (FlowChart.shapeTemplates.manualInput.ports = (t) => {
    var e = t.width / 20;
    return {
      top: { x: t.width / 2, y: e },
      right: { x: t.width, y: t.height / 2 },
      bottom: { x: t.width / 2, y: t.height },
      left: { x: 0, y: t.height / 2 },
    };
  }),
  (FlowChart.shapeTemplates.manualInput.displayName = 'Manual Input'),
  (FlowChart.shapeTemplates.preparation = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.preparation.svg = (t) => {
    var e = t.width / 10;
    return `<path d="M${e},0 L0,${t.height / 2} L${e},${t.height} L${t.width - e},${t.height} L${t.width},${t.height / 2} L${t.width - e},0 Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"></path>`;
  }),
  (FlowChart.shapeTemplates.preparation.displayName = 'Preparation'),
  (FlowChart.shapeTemplates.connector = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.connector.svg = (t) => {
    var e = Math.max(t.width, t.height) / 2;
    return `<circle cx="${e}" cy="${e}" r="${e}" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"></circle>`;
  }),
  (FlowChart.shapeTemplates.connector.minWidth = 110),
  (FlowChart.shapeTemplates.connector.minHeight = 110),
  (FlowChart.shapeTemplates.connector.width = 110),
  (FlowChart.shapeTemplates.connector.height = 110),
  (FlowChart.shapeTemplates.connector.displayName = 'Connector'),
  (FlowChart.shapeTemplates.or = Object.assign({}, FlowChart.shapeTemplates.connector)),
  (FlowChart.shapeTemplates.or.svg = (t) =>
    FlowChart.shapeTemplates.connector.svg(t) +
    `<line x1="${t.width / 2}" y1="0" x2="${t.width / 2}" y2="${t.height}" style="stroke:${t.stroke}; stroke-width:${t.strokeWidth};"></line>\n        <line x1="0" y1="${t.height / 2}" x2="${t.width}" y2="${t.height / 2}" style="stroke:${t.stroke}; stroke-width:${t.strokeWidth};"></line>`),
  (FlowChart.shapeTemplates.or.html = (t) => ''),
  (FlowChart.shapeTemplates.displayName = 'Or'),
  (FlowChart.shapeTemplates.data = Object.assign({}, FlowChart.shapeTemplates.connector)),
  (FlowChart.shapeTemplates.data.svg = (t) => {
    var e = t.width / 10;
    return `<path d="M0,${t.height} C${-e},${t.height} ${-e},0 0,0 L${t.width},0 C${t.width - e},0 ${t.width - e},${t.height} ${t.width},${t.height} Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"/>`;
  }),
  (FlowChart.shapeTemplates.data.displayName = 'Data'),
  (FlowChart.shapeTemplates.delay = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.delay.svg = (t) => {
    var e = t.width / 4,
      i = t.width / 5;
    return `<path d="M0,${t.height} L0,0 L${t.width - i},0 C${t.width + e - i},0 ${t.width + e - i},${t.height} ${t.width - i},${t.height} Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"/>`;
  }),
  (FlowChart.shapeTemplates.delay.displayName = 'Delay'),
  (FlowChart.shapeTemplates.display = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.display.svg = (t) => {
    var e = t.width / 4,
      i = t.width / 5,
      r = t.width / 10;
    return `<path d="M${r},${t.height} L0,${t.height / 2} L${r},0  L${t.width - i},0 C${t.width + e - i},0 ${t.width + e - i},${t.height} ${t.width - i},${t.height} Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"/>`;
  }),
  (FlowChart.shapeTemplates.display.displayName = 'Display'),
  (FlowChart.shapeTemplates.manualLoop = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.manualLoop.svg = (t) => {
    var e = t.width / 10;
    return `<path d="M0,0 L${t.width},0 L${t.width - e},${t.height} L${e},${t.height} Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"></path>`;
  }),
  (FlowChart.shapeTemplates.manualLoop.displayName = 'Manual Loop'),
  (FlowChart.shapeTemplates.loopLimit = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.loopLimit.svg = (t) => {
    var e = t.width / 6;
    return `<path d="M0,${e} L${e},0 L${t.width - e},0 L${t.width},${e} L${t.width},${t.height} L0,${t.height} Z" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};"></path>`;
  }),
  (FlowChart.shapeTemplates.loopLimit.displayName = 'Loop Limit'),
  (FlowChart.shapeTemplates.label = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.label.displayName = 'Label'),
  (FlowChart.shapeTemplates.label.svg = (t) =>
    `<rect class="bfc-label" x="0" y="0" width="${t.width}" height="${t.height}" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};" ></rect>`),
  (FlowChart.shapeTemplates.label.html = (t) => {
    var e = t.text;
    return (
      null == e && (e = '[text]'),
      `<div style="padding: 2x;">\n                <div data-field="text" style="color: #aeaeae;">${e}</div>\n            </div>`
    );
  }),
  (FlowChart.shapeTemplates.label.ports = (t) => null),
  (FlowChart.shapeTemplates.label.width = 'fit'),
  (FlowChart.shapeTemplates.label.height = 'fit'),
  (FlowChart.shapeTemplates.label.fill = ''),
  (FlowChart.shapeTemplates.label.stroke = ''),
  (FlowChart.shapeTemplates.label.strokeWidth = 0),
  (FlowChart.shapeTemplates.label.minWidth = 0),
  (FlowChart.shapeTemplates.label.minHeight = 0),
  (FlowChart.shapeTemplates.label.displayInShapeBar = !1),
  (FlowChart.shapeTemplates.label.displayInPortShapeBar = !1),
  (FlowChart.shapeTemplates.label.resizable = !1),
  (FlowChart.shapeTemplates.label.type = 'label'),
  (FlowChart.shapeTemplates.labelOverLink = Object.assign({}, FlowChart.shapeTemplates.label)),
  (FlowChart.shapeTemplates.labelOverLink.offset = (t) => {
    var e = 0,
      i = 0;
    return (
      FlowChart.private.getLabelXY(t, t.link).direction == FlowChart.direction.vertical
        ? (e = -t.width / 2 - 10)
        : (i = -t.height / 2 - 10),
      { x: e, y: i }
    );
  }),
  (FlowChart.shapeTemplates.psuedo = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.psuedo.displayName = 'Psuedo'),
  (FlowChart.shapeTemplates.psuedo.svg = (t) =>
    `<circle r="${t.width / 2}" cx="${t.width / 2}" cy="${t.height / 2}" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:1; opacity: 0;" ></circle>`),
  (FlowChart.shapeTemplates.psuedo.html = (t) => ''),
  (FlowChart.shapeTemplates.psuedo.width = 10),
  (FlowChart.shapeTemplates.psuedo.height = 10),
  (FlowChart.shapeTemplates.psuedo.fill = 'red'),
  (FlowChart.shapeTemplates.psuedo.stroke = 'blue'),
  (FlowChart.shapeTemplates.psuedo.minWidth = 0),
  (FlowChart.shapeTemplates.psuedo.minHeight = 0),
  (FlowChart.shapeTemplates.psuedo.displayInShapeBar = !1),
  (FlowChart.shapeTemplates.psuedo.displayInPortShapeBar = !1),
  (FlowChart.shapeTemplates.psuedo.resizable = !1),
  (FlowChart.shapeTemplates.psuedo.type = 'psuedo-node'),
  (FlowChart.MenuBar = class {
    _;
    get element() {
      return this._.getElement();
    }
    constructor(t) {
      this._ = new FlowChart.MenuBar.private(t);
    }
    init() {
      this._.init();
    }
    show() {
      this._.show();
    }
    hide() {
      this._.hide();
    }
    addItem(t) {
      return this._.addItem(t), this;
    }
    removeItem(t) {
      return this._.removeItem(t), this;
    }
  }),
  (FlowChart.MenuBar.private = class {
    chart;
    constructor(t) {
      this.chart = t;
    }
    refresh() {
      var t = this.chart.element.querySelector('[data-menu-item="undo"]');
      t &&
        (this.chart.options.interactive || 0 != this.chart._.undoStepsCount()
          ? t.classList.remove('bfc-disabled-opacity')
          : t.classList.add('bfc-disabled-opacity'));
      var e = this.chart.element.querySelector('[data-menu-item="redo"]');
      e &&
        (0 == this.chart._.redoStepsCount()
          ? e.classList.add('bfc-disabled-opacity')
          : e.classList.remove('bfc-disabled-opacity'));
    }
    simulateMouseClickOnKeydown(t) {
      var e = this.getElement().querySelector(`[data-menu-item="${t}"]`);
      if (e) {
        var i = (t) => {
          e.classList.remove('bfc-menu-item-selected'), document.removeEventListener('keyup', i);
        };
        e.classList.add('bfc-menu-item-selected'), document.addEventListener('keyup', i);
      }
    }
    getElement() {
      return this.chart.element.querySelector('[data-menubar]');
    }
    show() {
      this.getElement().style.display = '';
    }
    hide() {
      this.getElement().style.display = 'none';
    }
    handlerClick(t, e, i) {
      var r = { event: t, name: e };
      !1 !== FlowChart.events.publish('menu-item-click', [this.chart, r]) &&
        ('undo' == e && this.chart._.undo(), 'redo' == e && this.chart._.redo());
    }
    addItem(t) {
      this.getElement().querySelector('[data-menu-items]').innerHTML +=
        `<div class="bfc-menu-item" title="${t.title}" data-menu-item="${t.name}">${t.icon}</div>`;
    }
    removeItem(t) {
      var e = this.getElement().querySelector(`[data-menu-item="${t}"]`);
      e && e.parentElement.removeChild(e);
    }
    init() {
      var t = this.getElement(),
        e = sessionStorage.getItem('menubar-position');
      e && ((e = JSON.parse(e)), (t.style.left = e.left + 'px'), (t.style.top = e.top + 'px')),
        (t.innerHTML =
          '<div class="bfc-bar-move">\n                        <div class="bfc-bar-move-line"></div>\n                    </div>\n                    <div class="bfc-bar-content" data-menu-items>\n                          \n                    </div>  '),
        this.addItem({
          title: 'Undo',
          icon: FlowChart.icon.undo(26, 26, '#8B8B8B', 0, 0),
          name: 'undo',
        }),
        this.addItem({
          title: 'Redo',
          icon: FlowChart.icon.redo(26, 26, '#8B8B8B', 0, 0),
          name: 'redo',
        });
    }
  }),
  (FlowChart.private.prototype.showPortsUI = function () {
    this.hidePortsUI();
    var t = this.chart.ports.getElement(this.selectedPortShape.id),
      e = this.selectedPortShape.element;
    !t &&
      e &&
      ((t = document.createElementNS('http://www.w3.org/2000/svg', 'g')).classList.add(
        'bfc-s-ports'
      ),
      t.setAttribute('data-ports-s-id', this.selectedPortShape.id),
      t.setAttribute(
        'transform',
        `translate(${this.selectedPortShape.left},${this.selectedPortShape.top})`
      ),
      (t.innerHTML = this.portHTMLUI(this.selectedPortShape, this.chart.scale)),
      e.parentNode.insertBefore(t, e));
  }),
  (FlowChart.private.prototype.hidePortsUI = function () {
    this.hidePortShapeBarUI();
    for (
      var t = this.chart.svgElement.querySelectorAll('[data-ports-s-id]'), e = 0;
      e < t.length;
      e++
    )
      t[e].parentNode.removeChild(t[e]);
  }),
  (FlowChart.private.prototype.updatePortsElement = function (t) {
    var e = this.chart.svgElement.querySelector('[data-ports-s-id]');
    if (e) {
      e.setAttribute(
        'transform',
        `translate(${this.selectedPortShape.left},${this.selectedPortShape.top})`
      );
      var i = e.getAttribute('data-ports-s-id'),
        r = this.chart.getShape(i);
      e.innerHTML = this.portHTMLUI(r, t);
    }
  }),
  (FlowChart.private.prototype.portHTMLUI = (t, e) => {
    var i = '',
      r = FlowChart.shapeTemplates[t.templateId].ports(t);
    if (!FlowChart.isNEU(r)) {
      for (var a in r) {
        var o = r[a],
          s = 40,
          l = 40,
          h = o.x,
          n = o.y,
          d = 0;
        switch (FlowChart.private.getPortPosition(o, t)) {
          case FlowChart.position.topRight:
            (n -= l / e), (d = 45);
            break;
          case FlowChart.position.bottomRight:
            d = 135;
            break;
          case FlowChart.position.bottomLeft:
            (h -= s / e), (d = 225);
            break;
          case FlowChart.position.topLeft:
            (h -= s / e), (n -= l / e), (d = -45);
            break;
          case FlowChart.position.left:
            (h -= s / e), (n -= l / 2 / e), (d = -90);
            break;
          case FlowChart.position.right:
            (n -= l / 2 / e), (d = 90);
            break;
          case FlowChart.position.top:
            (h -= s / 2 / e), (n -= l / e);
            break;
          case FlowChart.position.bottom:
            (h -= s / 2 / e), (d = -180);
        }
        i += `<g class="bfc-port-out" data-port-out-port="${a}" data-port-out-shape="${t.id}" transform="rotate(${d})"><rect style="opacity: 0" x="${h}" y="${n}" width="${s / e}" height="${l / e}"></rect>${FlowChart.icon.arrow(s / e, l / e, '#ffca28', h, n)}</g>`;
      }
      i =
        `<rect style="opacity: 0" x="${-s / e}" y="${-l / e}"  width="${t.width + (s / e) * 2}" height="${t.height + (l / e) * 2}"></rect>` +
        i;
    }
    return i;
  }),
  (FlowChart.private.prototype.hidePortShapeBarUI = function () {
    for (
      var t = this.chart.element.querySelectorAll('[data-portsb-shape]'), e = 0;
      e < t.length;
      e++
    )
      t[e].parentNode.removeChild(t[e]);
  }),
  (FlowChart.private.prototype.portShapeBarHTMLUI = () => {
    var t = '';
    for (var e in FlowChart.shapeTemplates) {
      var i = FlowChart.shapeTemplates[e];
      if (i.displayInPortShapeBar) {
        var r = { templateId: e };
        (r.width = 'fit' == i.width ? i.minWidth : i.width),
          (r.height = 'fit' == i.height ? i.minHeight : i.height),
          (r.fill = i.fill),
          (r.stroke = i.stroke),
          (r.strokeWidth = i.strokeWidth),
          (t += `<div data-portshapebar-item-id="${e}">\n                    <svg class="bfc-portshapebar-svg ${r.templateId}" viewBox="0 0 ${r.width} ${r.height}" preserveAspectRatio="xMidYMid meet" >\n                        ${i.svg(r)}\n                    </svg>                   \n                </div>`);
      }
    }
    return t;
  }),
  (FlowChart.private.prototype.showPortShapeBarUI = function (t) {
    var e = this.chart.ports.getByPosition(this.chart.selectedShapes.last, t);
    e &&
      e.length &&
      ((this.chart.selectedPort = e[0]),
      this.selectPortShapeShapeBarItem(!1, this.lastAddedTemplateIdFormPortShapeBar));
  }),
  (FlowChart.private.prototype.navigatePortShapeBarItems = function (t) {
    var e = this.chart.element.querySelector('[data-portsb-shape]');
    if (e) {
      var i = e.getAttribute('data-portsb-shape'),
        r = e.getAttribute('data-portsb-port'),
        a = this.chart.ports.get(i, r),
        o = FlowChart.shapeTemplates[a.shape.templateId],
        s = FlowChart.private.getPortPosition(o.ports(a.shape)[a.id], a.shape);
      s == FlowChart.position.left &&
        (t == FlowChart.position.bottom && this.selectPortShapeShapeBarItem(!0),
        t == FlowChart.position.top && this.selectPortShapeShapeBarItem(!1),
        t == FlowChart.position.right && this.showPortShapeBarByPosition(t)),
        s == FlowChart.position.right &&
          (t == FlowChart.position.bottom && this.selectPortShapeShapeBarItem(!0),
          t == FlowChart.position.top && this.selectPortShapeShapeBarItem(!1),
          t == FlowChart.position.left && this.showPortShapeBarByPosition(t)),
        s == FlowChart.position.top &&
          (t == FlowChart.position.right && this.selectPortShapeShapeBarItem(!0),
          t == FlowChart.position.left && this.selectPortShapeShapeBarItem(!1),
          t == FlowChart.position.bottom && this.showPortShapeBarByPosition(t)),
        s == FlowChart.position.bottom &&
          (t == FlowChart.position.right && this.selectPortShapeShapeBarItem(!0),
          t == FlowChart.position.left && this.selectPortShapeShapeBarItem(!1),
          t == FlowChart.position.top && this.showPortShapeBarByPosition(t));
    } else this.showPortShapeBarByPosition(t);
  }),
  (FlowChart.private.prototype.showPortShapeBarByPosition = function (t) {
    var e = this.chart.ports.getByPosition(t);
    if (e && e.length) {
      var i = e[0];
      this.showPortShapeBar(i), this.selectPortShapeShapeBarItem(!1);
    }
  }),
  (FlowChart.private.prototype.createNodeFromPorsShapeBarItem = function () {
    this.selectedPort;
    var e = this.selectedPort,
      i = this.chart.element.querySelector(
        `[data-portsb-shape="${e.shape.id}"][data-portsb-port="${e.id}"]`
      ),
      r = i.querySelector('.bfc-portshapebar-selected');
    if (r) {
      this.chart.editor.hasActiveField() && this.chart.editor.blur();
      var a = i.getAttribute('data-portsb-shape'),
        o = i.getAttribute('data-portsb-port'),
        s = this.chart.ports.get(a, o),
        l = r.getAttribute('data-portshapebar-item-id');
      (this.lastAddedTemplateIdFormPortShapeBar = l),
        this.addNodeWithLink(s, l, (e, i) => {
          this.chart.selectedShapes.clear(), this.chart.selectedShapes.add(e);
        });
    }
  }),
  (FlowChart.private.prototype.selectPortShapeShapeBarItem = function (t, e) {
    var i = this.chart.element.querySelector('[data-portsb-shape]');
    if (i) {
      for (
        var r = i.querySelectorAll('[data-portshapebar-item-id]'), a = -1, o = 0;
        o < r.length;
        o++
      )
        (s = r[o]).classList.contains('bfc-portshapebar-selected') &&
          ((a = o), s.classList.remove('bfc-portshapebar-selected'));
      if (e) {
        for (var s of r)
          if (s.getAttribute('data-portshapebar-item-id') == e) {
            s.classList.add('bfc-portshapebar-selected');
            break;
          }
      } else
        for (
          t ? a++ : a--, a >= r.length ? (a = 0) : a < 0 && (a = r.length - 1), o = 0;
          o < r.length;
          o++
        )
          (s = r[o]), a == o && s.classList.add('bfc-portshapebar-selected');
    }
  }),
  (FlowChart.private.prototype.showPortShapeBar = function () {
    for (
      var t = this.chart.element.querySelectorAll('[data-portsb-shape]'), e = 0;
      e < t.length;
      e++
    )
      t[e].parentNode.removeChild(t[e]);
    var i = this.portShapeBarHTMLUI(this.selectedPort),
      r = document.createElement('div');
    r.classList.add('bfc-portshapebar'),
      r.setAttribute('data-portsb-shape', `${this.selectedPort.shape.id}`),
      r.setAttribute('data-portsb-port', `${this.selectedPort.id}`),
      (r.innerHTML = i),
      this.chart.element.appendChild(r);
    var a = this.chart.svgElement.querySelector(
        `[data-port-out-shape="${this.selectedPort.shape.id}"][data-port-out-port="${this.selectedPort.id}"]`
      ),
      o = this.chart.svgElement.querySelector(`[data-ports-s-id="${this.selectedPort.shape.id}"]`),
      s = this.chart.svgElement.querySelectorAll('.bfc-ports-visible');
    for (var l of s) l.classList.remove('bfc-ports-visible');
    o.classList.add('bfc-ports-invisible'), a.classList.add('bfc-ports-visible');
    var h = a.getBoundingClientRect(),
      n = this.chart.element.getBoundingClientRect(),
      d = r.getBoundingClientRect(),
      p = 0,
      c = 0,
      f = Number.parseFloat(window.getComputedStyle(r, null).getPropertyValue('padding-top')),
      u = Number.parseFloat(window.getComputedStyle(r, null).getPropertyValue('padding-bottom')),
      m = 0;
    switch (this.selectedPort.position) {
      case FlowChart.position.top:
        (p = h.left + h.width / 2 - n.left - d.width / 2), (c = h.top - n.top - d.height + 3);
        break;
      case FlowChart.position.bottom:
        (p = h.left + h.width / 2 - n.left - d.width / 2), (c = h.bottom - n.top - 3);
        break;
      case FlowChart.position.left:
        (r.style.width = d.height - (f + u) + 'px'),
          (d = r.getBoundingClientRect()),
          (p = h.left - n.left - d.width + 3),
          (c = h.bottom - n.top - h.height / 2 - d.height / 2);
        break;
      case FlowChart.position.right:
        (r.style.width = d.height - (f + u) + 'px'),
          (d = r.getBoundingClientRect()),
          (p = h.right - n.left - 3),
          (c = h.bottom - n.top - h.height / 2 - d.height / 2);
        break;
      case FlowChart.position.topLeft:
        (m = 135), (p = h.left - n.left - d.width / 2 + 3), (c = h.top - n.top - d.height / 2 + 3);
        break;
      case FlowChart.position.topRight:
        (m = 45), (p = h.right - n.left - d.width / 2 - 3), (c = h.top - n.top - d.height / 2 + 3);
        break;
      case FlowChart.position.bottomRight:
        (m = 135),
          (p = h.right - n.left - d.width / 2 - 3),
          (c = h.bottom - n.top - d.height / 2 - 3);
        break;
      case FlowChart.position.bottomLeft:
        (m = 45),
          (p = h.left - n.left - d.width / 2 + 3),
          (c = h.bottom - n.top - d.height / 2 - 3);
    }
    (r.style.left = p + 'px'),
      (r.style.top = c + 'px'),
      (r.style.transformOrigin = 'center'),
      (r.style.transform = `rotate(${m}deg)`);
  }),
  (FlowChart.SelectedShapeCollection = class extends Array {
    _;
    constructor(t) {
      super(), (this._ = new FlowChart.SelectedShapeCollection.private(t));
    }
    get first() {
      return this.length ? this[0] : null;
    }
    get last() {
      return this.length ? this[this.length - 1] : null;
    }
    get nodes() {
      var t = [];
      for (var e of this) 'label' != e.type && t.push(e);
      return t;
    }
    get labels() {
      var t = [];
      for (var e of this) 'label' == e.type && t.push(e);
      return t;
    }
    add(t) {
      t.selected
        ? -1 == this.indexOf(t) &&
          (this._.chart._.snap(),
          this.push(t),
          this._.chart._.changed({ property: 'selectedShapes' }))
        : (t.selected = !0);
    }
    remove(t) {
      if (t.selected) t.selected = !1;
      else
        for (var e = this.length - 1; e >= 0; e--)
          if (t == this[e])
            return (
              this._.chart._.snap(),
              this.splice(e, 1),
              void this._.chart._.changed({ property: 'selectedShapes' })
            );
    }
    clear() {
      this.length &&
        (this._.chart._.snap(),
        this._.chart.nodes._.clearSelectedMetadata(),
        this._.chart.labels._.clearSelectedMetadata(),
        this._.removeSelectorElement(),
        this.splice(0, this.length),
        this._.chart._.changed({ property: 'selectedShapes' }));
    }
    addRange(t) {
      for (var e of t) this.add(e);
    }
    get(t) {
      for (var e of this) if (e.id == t) return e;
      return null;
    }
    contains(t) {
      return null != this.get(t);
    }
    selectNodeRight(t) {
      this._.selectRight(this._.chart.nodes, t, this);
    }
    selectNodeLeft(t) {
      this._.selectLeft(this._.chart.nodes, t, this);
    }
    selectNodeAbove(t) {
      this._.selectAbove(this._.chart.nodes, t, this);
    }
    selectNodeBelow(t) {
      this._.selectBelow(this._.chart.nodes, t, this);
    }
  }),
  (FlowChart.SelectedShapeCollection.private = class {
    chart;
    arrayBeforeShiftPressed;
    constructor(t) {
      (this.chart = t), (this.arrayBeforeShiftPressed = []);
    }
    selectRight(t, e, i) {
      var r = i[i.length - 1],
        a = null;
      for (var o of t) {
        var s;
        o != r &&
          r.right - o.left <= 0 &&
          (null == a
            ? (a = { shape: o, hypot: (s = Math.hypot(o.y - r.y, o.left - r.right)) })
            : (s = Math.hypot(o.y - r.y, o.left - r.right)) < a.hypot &&
              (a = { shape: o, hypot: s }));
      }
      this.hideAndShowNext(a, e, i);
    }
    selectLeft(t, e, i) {
      var r = i[i.length - 1],
        a = null;
      for (var o of t) {
        var s;
        o != r &&
          r.left - o.right >= 0 &&
          (null == a
            ? (a = { shape: o, hypot: (s = Math.hypot(o.y - r.y, o.right - r.left)) })
            : (s = Math.hypot(o.y - r.y, o.right - r.left)) < a.hypot &&
              (a = { shape: o, hypot: s }));
      }
      this.hideAndShowNext(a, e, i);
    }
    selectAbove(t, e, i) {
      var r = i[i.length - 1],
        a = null;
      for (var o of t) {
        var s;
        o != r &&
          r.top - o.bottom >= 0 &&
          (null == a
            ? (a = { shape: o, hypot: (s = Math.hypot(o.x - r.x, o.bottom - r.top)) })
            : (s = Math.hypot(o.x - r.x, o.bottom - r.top)) < a.hypot &&
              (a = { shape: o, hypot: s }));
      }
      this.hideAndShowNext(a, e, i);
    }
    selectBelow(t, e, i) {
      var r = i[i.length - 1],
        a = null;
      for (var o of t) {
        var s;
        r.bottom - o.top <= 0 &&
          (null == a
            ? (a = { shape: o, hypot: (s = Math.hypot(o.x - r.x, o.top - r.bottom)) })
            : (s = Math.hypot(o.x - r.x, o.top - r.bottom)) < a.hypot &&
              (a = { shape: o, hypot: s }));
      }
      this.hideAndShowNext(a, e, i);
    }
    hideAndShowNext(t, e, i) {
      if (t) {
        for (var r of (e && i.clear(), i))
          -1 == this.arrayBeforeShiftPressed.indexOf(r) && (r.selected = !1);
        (t.shape.selected = !0), this.chart.makeShapesVisible(t.shape);
      }
    }
    update(t, e) {
      var i = this.chart.svgElement.querySelector(`[data-selector-shape-id="${t.id}"]`);
      if (i) {
        FlowChart.shapeTemplates[t.templateId];
        var r = i.querySelector('.bfc-selector-rect');
        r.setAttribute('x', 0),
          r.setAttribute('y', 0),
          r.setAttribute('width', t.width),
          r.setAttribute('height', t.height),
          r.setAttribute('stroke-width', t.strokeWidth);
        for (var a = 1; a <= 2; a++) {
          var o = i.querySelector(`[data-selector-dot-${a}="topLeft"]`);
          o && (o.setAttribute('cx', 0), o.setAttribute('cy', 0));
          var s = i.querySelector(`[data-selector-dot-${a}="top"]`);
          s && (s.setAttribute('cx', t.width / 2), s.setAttribute('cy', 0));
          var l = i.querySelector(`[data-selector-dot-${a}="topRight"]`);
          l && (l.setAttribute('cx', t.width), l.setAttribute('cy', 0));
          var h = i.querySelector(`[data-selector-dot-${a}="right"]`);
          h && (h.setAttribute('cx', t.width), h.setAttribute('cy', t.height / 2));
          var n = i.querySelector(`[data-selector-dot-${a}="bottomRight"]`);
          n && (n.setAttribute('cx', t.width), n.setAttribute('cy', t.height));
          var d = i.querySelector(`[data-selector-dot-${a}="bottom"]`);
          d && (d.setAttribute('cx', t.width / 2), d.setAttribute('cy', t.height));
          var p = i.querySelector(`[data-selector-dot-${a}="bottomLeft"]`);
          p && (p.setAttribute('cx', 0), p.setAttribute('cy', t.height));
          var c = i.querySelector(`[data-selector-dot-${a}="left"]`);
          c && (c.setAttribute('cx', 0), c.setAttribute('cy', t.height / 2));
        }
      }
    }
    hideUI() {
      var t = this.chart.svgElement.querySelectorAll('[data-selector-shape-id]');
      for (var e of t) e.style.display = 'none';
    }
    showUI() {
      var t = this.chart.svgElement.querySelectorAll('[data-selector-shape-id]');
      for (var e of t) e.style.display = '';
    }
    removeSelectorElement(t) {
      if (t)
        (i = this.chart.svgElement.querySelector(`[data-selector-shape-id="${t.id}"]`)) &&
          i.parentNode.removeChild(i);
      else {
        var e = this.chart.svgElement.querySelectorAll('[data-selector-shape-id]');
        for (var i of e) i.parentNode.removeChild(i);
      }
    }
    createSelectorElement(t) {
      this.removeSelectorElement(t);
      var e = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      e.classList.add('bfc-selector'),
        e.setAttribute('data-selector-shape-id', t.id),
        (e.innerHTML = this.html(t, this.chart.scale)),
        t.element.querySelector('.bfc-html').after(e);
    }
    getBox() {
      var t = {
        x: void 0,
        y: void 0,
        top: Number.MAX_SAFE_INTEGER,
        bottom: Number.MIN_SAFE_INTEGER,
        right: Number.MIN_SAFE_INTEGER,
        left: Number.MAX_SAFE_INTEGER,
        width: void 0,
        height: void 0,
      };
      for (var e of this.chart.selectedShapes)
        FlowChart.shapeTemplates[e.templateId],
          e.left < t.left && (t.left = e.left),
          e.top < t.top && (t.top = e.top),
          e.right > t.right && (t.right = e.right),
          e.bottom > t.bottom && (t.bottom = e.bottom);
      return (
        (t.width = t.right - t.left),
        (t.height = t.bottom - t.top),
        (t.x = t.left + t.width / 2),
        (t.y = t.top + t.height / 2),
        t
      );
    }
    html(t, e) {
      var i = 1 / e,
        r =
          (FlowChart.shapeTemplates[t.templateId],
          `<rect stroke-width="${t.strokeWidth}" class="bfc-selector-rect" x="0" y="0" width="${t.width}" height="${t.height}"></rect>`);
      return (
        t.resizable &&
          this.chart.selectedShapes.nodes.length > 0 &&
          (r += `<circle transform="scale(${i})" data-selector-dot-1="topLeft" cx="0" cy="0" r="5"></circle>\n            <circle transform="scale(${i})" data-selector-dot-1="top"  cx="${t.width / 2}" cy="0" r="5"></circle>\n            <circle transform="scale(${i})" data-selector-dot-1="topRight"  cx="${t.width}" cy="0" r="5"></circle>\n            <circle transform="scale(${i})" data-selector-dot-1="right"  cx="${t.width}" cy="${t.height / 2}" r="5"></circle>\n            <circle transform="scale(${i})" data-selector-dot-1="bottomRight"  cx="${t.width}" cy="${t.height}" r="5"></circle>\n            <circle transform="scale(${i})" data-selector-dot-1="bottom"  cx="${t.width / 2}" cy="${t.height}" r="5"></circle>\n            <circle transform="scale(${i})" data-selector-dot-1="bottomLeft"  cx="0" cy="${t.height}" r="5"></circle>\n            <circle transform="scale(${i})" data-selector-dot-1="left"  cx="0" cy="${t.height / 2}" r="5"></circle>                   \n            \n            <circle transform="scale(${i})" data-selector-dot-2="topLeft" cx="0" cy="0" r="10"></circle>\n            <circle transform="scale(${i})" data-selector-dot-2="top"  cx="${t.width / 2}" cy="0"  r="10"></circle>\n            <circle transform="scale(${i})" data-selector-dot-2="topRight"  cx="${t.width}" cy="0" r="10"></circle>\n            <circle transform="scale(${i})" data-selector-dot-2="right"  cx="${t.width}" cy="${t.height / 2}" r="10"></circle>\n            <circle transform="scale(${i})" data-selector-dot-2="bottomRight"  cx="${t.width}" cy="${t.height}" r="10"></circle>\n            <circle transform="scale(${i})" data-selector-dot-2="bottom"  cx="${t.width / 2}" cy="${t.height}" r="10"></circle>\n            <circle transform="scale(${i})" data-selector-dot-2="bottomLeft"  cx="0" cy="${t.height}"  r="10"></circle>\n            <circle transform="scale(${i})" data-selector-dot-2="left" cx="0" cy="${t.height / 2}"r="10"></circle>`),
        r
      );
    }
  }),
  (FlowChart.Editor = class {
    _;
    element;
    constructor(t) {
      this._ = new FlowChart.Editor.private(t);
    }
    blur() {
      this._.blur();
    }
    clearFieldBorders() {
      this._.clearFieldBorders();
    }
    editFirstFieldIfAny(t) {
      this._.editFirstFieldIfAny(t);
    }
    getFieldNames(t) {
      return this._.getFieldNames(t);
    }
    hasActiveField() {
      return this._.hasActiveField();
    }
    edit(t, e) {
      this._.edit(t, e);
    }
    selectNextField() {
      this._.selectNextField();
    }
  }),
  (FlowChart.Editor.private = class {
    chart;
    constructor(t) {
      this.chart = t;
    }
    getFieldNames(t) {
      for (var e = [], i = t.element.querySelectorAll('[data-field]'), r = 0; r < i.length; r++) {
        var a = i[r].getAttribute('data-field');
        e.push(a);
      }
      return e;
    }
    editFirstFieldIfAny(t) {
      var e = this.getFieldNames(t);
      e.length && this.edit(t, e[0]);
    }
    blur() {
      if (this.chart.options.editable)
        for (
          var t = this.chart.svgElement.querySelectorAll('[contenteditable]'), e = 0;
          e < t.length;
          e++
        )
          t[e].blur();
    }
    selectNextField() {
      for (
        var t = this.chart.svgElement.querySelector('[contenteditable]'), e = t.parentNode;
        e && e.hasAttribute && !e.hasAttribute('data-shape-id');
      )
        e = e.parentNode;
      if (e && e.hasAttribute && e.hasAttribute('data-shape-id')) {
        var i = t.getAttribute('data-field'),
          r = e.getAttribute('data-shape-id'),
          a = this.chart.getShape(r),
          o = this.getFieldNames(a),
          s = o.indexOf(i);
        ++s >= o.length && (s = 0), this.edit(a, o[s]);
      }
    }
    clearFieldBorders() {
      for (
        var t = this.chart.svgElement.querySelectorAll('.bfc-field-border'), e = t.length - 1;
        e >= 0;
        e--
      )
        t[e].parentNode.removeChild(t[e]);
    }
    hasActiveField() {
      return null != this.chart.svgElement.querySelector('[data-field][contenteditable]');
    }
    edit(t, e) {
      if (this.chart.options.editable) {
        t.element;
        for (var i = t.element.querySelectorAll('[data-field-selector]'), r = 0; r < i.length; r++)
          i[r].parentNode.removeChild(i[r]);
        var a = t.element.querySelectorAll('[data-field]');
        for (r = 0; r < a.length; r++) {
          var o = (g = a[r]).getAttribute('data-field'),
            s = o;
          g.hasAttribute('data-title') && (s = g.getAttribute('data-title'));
          var l = g.getBoundingClientRect(),
            h = l.left,
            n = l.top,
            d = l.width,
            p = l.height,
            c = h - t.left * this.chart.scale,
            f = n - t.top * this.chart.scale;
          const e = new DOMPoint(c, f);
          var u = this.chart.svgElement.getScreenCTM().inverse();
          const i = e.matrixTransform(u);
          var m = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          m.setAttribute('width', d / this.chart.scale),
            m.setAttribute('height', p / this.chart.scale),
            m.setAttribute('x', i.x),
            m.setAttribute('y', i.y),
            m.setAttribute('data-field-selector', o),
            m.classList.add('bfc-field-border'),
            (m.innerHTML = `<title>${s}</title>`),
            t.element.querySelector('.bfc-html').after(m);
        }
        if (e) {
          var g,
            v = this.chart.svgElement.querySelectorAll('[contenteditable]');
          for (r = 0; r < v.length; r++) v[r].blur();
          (g = this.chart.svgElement.querySelector(
            `[data-shape-id="${t.id}"] [data-field="${e}"]`
          )).setAttribute('contenteditable', ''),
            g.addedPasteEventHandler ||
              (g.addEventListener('paste', (t) => {
                t.preventDefault();
                var e = t.clipboardData.getData('text/plain');
                document.execCommand('insertText', !1, e);
              }),
              (g.addedPasteEventHandler = !0));
          var w = document.createRange();
          w.selectNodeContents(g);
          var C = window.getSelection();
          C.removeAllRanges(),
            C.addRange(w),
            setTimeout(() => {
              g.focus(),
                g.blurAdded ||
                  (g.addEventListener('blur', (t) => {
                    var e = this.chart.svgElement.querySelector('[contenteditable]'),
                      i = e.getAttribute('data-field'),
                      r = e.innerHTML.trim();
                    '<br>' == r && (r = '');
                    for (var a = e; !a.hasAttribute('data-shape-id'); ) a = a.parentNode;
                    var o = a.getAttribute('data-shape-id');
                    (this.chart.getShape(o)[i] = r), e.removeAttribute('contenteditable');
                  }),
                  (g.blurAdded = !0));
            }, 10);
        }
      }
    }
  }),
  (FlowChart.private.prototype.reposition = function (t, e, i, r) {
    if (this.chart.nodes.length) {
      t || (t = this.chart.options.startPosition);
      var o = this.svgBCR.width,
        s = this.svgBCR.height,
        l = o / 2,
        h = s / 2,
        n = this.chart.viewBox,
        d = this.chart.nodes.right - this.chart.nodes.left + 2 * FlowChart.PADDING,
        p = this.chart.nodes.bottom - this.chart.nodes.top + 2 * FlowChart.PADDING,
        c = !0;
      switch (t) {
        case FlowChart.startPosition.center:
          if (e) {
            var f = Number.MAX_SAFE_INTEGER,
              u = Number.MIN_SAFE_INTEGER,
              m = Number.MAX_SAFE_INTEGER,
              g = Number.MIN_SAFE_INTEGER;
            for (var y of e)
              y.top < f && (f = y.top),
                y.bottom > u && (u = y.bottom),
                y.left < m && (m = y.left),
                y.right > g && (g = y.right);
            var v = g - m,
              w = u - f,
              C = FlowChart.private.getFitScale(
                o,
                s,
                t,
                this.chart.options.scaleMax,
                this.chart.options.scaleMin,
                v + 2 * FlowChart.PADDING,
                w + 2 * FlowChart.PADDING
              );
            ((n = FlowChart.private.getViewBoxByScale(
              C,
              this.chart.options,
              n,
              this.chart._.svgBCR
            ))[0] = m - (o / C - v) / 2),
              (n[1] = f - (s / C - w) / 2);
          } else
            (n[0] =
              this.chart.nodes.left +
              (this.chart.nodes.right - this.chart.nodes.left) / 2 -
              l / this.chart.scale),
              (n[1] =
                this.chart.nodes.top +
                (this.chart.nodes.bottom - this.chart.nodes.top) / 2 -
                h / this.chart.scale);
          break;
        case FlowChart.startPosition.centerTop:
          (y = this.chart.nodes._.minShapeY),
            (n[0] = y.x - l / this.chart.scale),
            (n[1] = y.top - FlowChart.PADDING);
          break;
        case FlowChart.startPosition.centerBottom:
          (y = this.chart.nodes._.maxShapeY),
            (n[0] = y.x - l / this.chart.scale),
            (n[1] = y.bottom + FlowChart.PADDING - s / this.chart.scale);
          break;
        case FlowChart.startPosition.centerRight:
          (y = this.chart.nodes._.minShapeX),
            (n[0] = y.left - FlowChart.PADDING),
            (n[1] = y.y - h / this.chart.scale);
          break;
        case FlowChart.startPosition.centerLeft:
          (y = this.chart.nodes._.maxShapeX),
            (n[0] = y.right + FlowChart.PADDING - o / this.chart.scale),
            (n[1] = y.y - h / this.chart.scale);
          break;
        case FlowChart.startPosition.fitHeight:
        case FlowChart.startPosition.fitWidth:
        case FlowChart.startPosition.fit:
        case FlowChart.startPosition.fit1:
          (C = FlowChart.private.getFitScale(
            o,
            s,
            t,
            this.chart.options.scaleMax,
            this.chart.options.scaleMin,
            d,
            p
          )),
            (d = this.chart.nodes.right - this.chart.nodes.left + (2 * FlowChart.PADDING) / C),
            (p = this.chart.nodes.top - this.chart.nodes.left + (2 * FlowChart.PADDING) / C),
            ((n = FlowChart.private.getViewBoxByScale(
              C,
              this.chart.options,
              n,
              this.chart._.svgBCR
            ))[0] =
              this.chart.nodes._.minShapeX.left -
              (o / C - (this.chart.nodes._.maxShapeX.right - this.chart.nodes._.minShapeX.left)) /
                2),
            (n[1] =
              this.chart.nodes._.minShapeY.top -
              (s / C - (this.chart.nodes._.maxShapeY.bottom - this.chart.nodes._.minShapeY.top)) /
                2);
          break;
        case FlowChart.startPosition.centerShapes:
          for (var y of ((f = Number.MAX_SAFE_INTEGER),
          (u = Number.MIN_SAFE_INTEGER),
          (m = Number.MAX_SAFE_INTEGER),
          (g = Number.MIN_SAFE_INTEGER),
          e))
            y.top < f && (f = y.top),
              y.bottom > u && (u = y.bottom),
              y.left < m && (m = y.left),
              y.right > g && (g = y.right);
          (v = g - m),
            (w = u - f),
            (C = FlowChart.private.getFitScale(
              o,
              s,
              t,
              this.chart.options.scaleMax,
              this.chart.options.scaleMin,
              v + 2 * FlowChart.PADDING,
              w + 2 * FlowChart.PADDING
            )),
            ((n = FlowChart.private.getViewBoxByScale(
              C,
              this.chart.options,
              n,
              this.chart._.svgBCR
            ))[0] = m - (o / C - v) / 2),
            (n[1] = f - (s / C - w) / 2);
          break;
        default:
          c = !1;
      }
      c &&
        (i
          ? (this._repositionTimeout &&
              (clearTimeout(this._repositionTimeout), (this._repositionTimeout = null)),
            (this._repositionTimeout = FlowChart.animate(
              this.chart.svgElement,
              { viewBox: this.chart.viewBox },
              { viewBox: n },
              300,
              FlowChart.anim.outPow,
              () => {
                r && r.call(this.chart);
              }
            )))
          : ((this.chart.viewBox = n), r && r.call(this.chart)));
    }
  }),
  (FlowChart.private.prototype.makeShapesVisible = function (t, e) {
    this.makeShapesVisibleInterval &&
      (clearInterval(this.makeShapesVisibleInterval), (this.makeShapesVisibleInterval = null));
    var r = {
        top: Number.MAX_SAFE_INTEGER,
        left: Number.MAX_SAFE_INTEGER,
        right: Number.MIN_SAFE_INTEGER,
        bottom: Number.MIN_SAFE_INTEGER,
      },
      a = this.svgBCR.width,
      o = this.svgBCR.height;
    for (var s of t)
      s.top < r.top && (r.top = s.top),
        s.bottom > r.bottom && (r.bottom = s.bottom),
        s.left < r.left && (r.left = s.left),
        s.right > r.right && (r.right = s.right);
    var l = this.chart.viewBox,
      h = l.slice();
    (l[0] = Math.max(r.right + FlowChart.PADDING - a / this.chart.scale, l[0])),
      (l[1] = Math.max(r.bottom + FlowChart.PADDING - o / this.chart.scale, l[1])),
      (l[0] = Math.min(r.left - FlowChart.PADDING, l[0])),
      (l[1] = Math.min(r.top - FlowChart.PADDING, l[1])),
      h[0] != l[0] || h[1] != l[1]
        ? (this.makeShapesVisibleInterval = FlowChart.private.animate(
            this.chart.svgElement,
            { viewBox: h },
            { viewBox: l },
            300,
            FlowChart.anim.outPow,
            () => {
              e && e.call(this.chart);
            }
          ))
        : e && e.call(this.chart);
  }),
  (FlowChart.private.prototype.animateShapes = function (t, e, i, r) {
    FlowChart.private.animate(t, e, i, 300, FlowChart.anim.outPow, () => {
      r && r.call(this.chart);
    });
  }),
  FlowChart.events.on('init', (t) => {
    t.menuBar._.refresh(), t.colorBar._.refresh(), t.statusBar._.refreshHint();
  }),
  FlowChart.events.on('changed', (t, e) => {
    t.colorBar._.refresh(), t.menuBar._.refresh(), t.statusBar._.refreshHint();
  }),
  FlowChart.events.on('undo-redo-changed', (t) => {
    t.colorBar._.refresh(), t.menuBar._.refresh(), t.statusBar._.refreshHint();
  }),
  FlowChart.events.on('selected-shapes-changed', (t) => {
    t.colorBar._.refresh(), t.menuBar._.refresh(), t.statusBar._.refreshHint();
  }),
  FlowChart.events.on('selected-port-change', (t, e) => {
    setTimeout(() => {
      t.colorBar._.refresh(), t.menuBar._.refresh(), t.statusBar._.refreshHint();
    }, 10);
  }),
  (FlowChart.StatusBar = class {
    _;
    constructor(t) {
      this._ = new FlowChart.StatusBar.private(t);
    }
    get element() {
      return this._.getElement();
    }
    get content() {
      return this._.getContent();
    }
    set content(t) {
      this._.setContent(t);
    }
    init() {
      this._.init();
    }
    show() {
      this._.show();
    }
    hide() {
      this._.hide();
    }
    isVisible() {
      return 'none' != this._.getElement().style.display;
    }
  }),
  (FlowChart.StatusBar.private = class {
    chart;
    useRefreshHint;
    constructor(t) {
      (this.chart = t), (this.useRefreshHint = !0);
    }
    init() {
      this.getElement().innerHTML = '<div data-status-hint>&nbsp;</div>';
    }
    show() {
      this.getElement().style.display = '';
    }
    hide() {
      this.getElement().style.display = 'none';
    }
    getElement() {
      return this.chart.element.querySelector('.bfc-statusbar');
    }
    refreshHint() {
      if (this.useRefreshHint) {
        var t = this.chart._.getActiveComponentTypes();
        if (
          -1 != t.indexOf('shape') &&
          this.chart.selectedShapes.nodes.length == this.chart.nodes.length
        )
          this.setContent('Press F to fit to page and center.');
        else if (-1 != t.indexOf('node')) {
          for (
            var e = this.chart.selectedShapes.last, i = [], r = 0;
            r < this.chart.options.colors.length;
            r++
          ) {
            var a = this.chart.options.colors[r];
            e.fill != a && i.push(r + 1);
          }
          var o = '';
          for (r = 0; r < i.length; r++)
            0 == r ? (o += i[r]) : r == i.length - 1 ? (o += ` or ${i[r]}`) : (o += `, ${i[r]}`);
          this.setContent(
            `Press CTRL + Arrow to open port; Press Interval or Enter to edit; Press ${o} to change the color;`
          );
        } else
          -1 != t.indexOf('label')
            ? this.setContent('Press Interval or Edit to edit the label;')
            : -1 != t.indexOf('field')
              ? (this.chart.selectedShapes.last,
                this.setContent('Press Escape to finish editing; Press CTRL + Arrow to open port;'))
              : -1 != t.indexOf('port-shape-bar')
                ? this.setContent('Select Shape with Arrows and press eneter to add new node;')
                : -1 != t.indexOf('canvas') &&
                  this.setContent(
                    'Press CTRL + A to select all shapes and then press F to fit to page and center.'
                  );
      }
    }
    getContent() {
      var t = this.getElement().querySelector('[data-status-hint]');
      return t ? t.innerHTML : '';
    }
    setContent(t) {
      '' == t && (t = '&nbsp');
      var e = this.getElement().querySelector('[data-status-hint]');
      e && (e.innerHTML = t);
    }
  }),
  (FlowChart.ShapeBar = class {
    _;
    get element() {
      return this._.getElement();
    }
    constructor(t) {
      this._ = new FlowChart.ShapeBar.private(t);
    }
    init() {
      this._.init();
    }
    show() {
      this._.show();
    }
    hide() {
      this._.hide();
    }
  }),
  (FlowChart.ShapeBar.private = class {
    chart;
    constructor(t) {
      this.chart = t;
    }
    getElement() {
      return this.chart.element.querySelector('[data-shapebar]');
    }
    show() {
      this.getElement().style.display = '';
    }
    hide() {
      this.getElement().style.display = 'none';
    }
    init() {
      var t = '';
      for (var e in FlowChart.shapeTemplates) {
        var i = FlowChart.shapeTemplates[e];
        if (i.displayInShapeBar) {
          var r = { templateId: e };
          (r.width = 'fit' == i.width ? i.minWidth : i.width),
            (r.height = 'fit' == i.width ? i.minHeight : i.height),
            (r.strokeWidth = i.strokeWidth),
            (r.fill = i.fill);
          var a = i.displayName;
          t += `<div data-shapebar-item-id="${e}">\n                        <svg  class="bfc-shapebar-svg ${r.templateId}" viewBox="0 0 ${r.width} ${r.height}" preserveAspectRatio="xMidYMid meet" >\n                            ${i.svg(r)}\n                        </svg>\n                        <div>${a}</div>              \n                    </div>`;
        }
      }
      var o = this.getElement(),
        s = sessionStorage.getItem('shapebar-position');
      s && ((s = JSON.parse(s)), (o.style.left = s.left + 'px'), (o.style.top = s.top + 'px')),
        (o.innerHTML = `<div class="bfc-bar-move">\n                        <div class="bfc-bar-move-line"></div>\n                    </div>\n                    <div class="bfc-shapebar-shapes bfc-bar-content">\n                        ${t}  \n                    </div>  `);
    }
  }),
  (FlowChart.ColorBar = class {
    _;
    get element() {
      return this._.getElement();
    }
    constructor(t) {
      this._ = new FlowChart.ColorBar.private(t);
    }
    init() {
      this._.init();
    }
    show() {
      this._.show();
    }
    hide() {
      this._.hide();
    }
  }),
  (FlowChart.ColorBar.private = class {
    chart;
    constructor(t) {
      this.chart = t;
    }
    refresh() {
      var t = this.chart.element.querySelector('[data-color-palette]'),
        e = this.chart._.getActiveComponentTypes();
      for (var i of t.children)
        this.chart.options.interactive && -1 != e.indexOf('shape')
          ? i.classList.remove('bfc-disabled-grayscale')
          : i.classList.add('bfc-disabled-grayscale');
    }
    simulateMouseClickOnKeydown(t) {
      var e = this.getElement().querySelector(`[data-menu-item="${t}"]`);
      if (e) {
        var i = (t) => {
          e.classList.remove('bfc-menu-item-selected'), document.removeEventListener('keyup', i);
        };
        e.classList.add('bfc-menu-item-selected'), document.addEventListener('keyup', i);
      }
    }
    handlerClick(t, e, i) {
      var r = { event: t, name: e };
      if (
        !1 !== FlowChart.events.publish('menu-item-click', [this.chart, r]) &&
        0 == e.indexOf('color-')
      ) {
        var a = e.split('-')[1];
        this.chart._.changeFill(a);
      }
    }
    getElement() {
      return this.chart.element.querySelector('[data-colorbar]');
    }
    show() {
      this.getElement().style.display = '';
    }
    hide() {
      this.getElement().style.display = 'none';
    }
    init() {
      for (var t = '', e = 0; e < this.chart.options.colors.length; e++)
        t += `<div class="bfc-menu-item" data-color-item="${e}" data-menu-item="color-${e}"><div class="bfc-color-item"  style="background-color: ${this.chart.options.colors[e]}">${e + 1}</div></div>`;
      t && (t = `<div data-color-palette class="bfc-color-palette">${t}</div>`);
      var i = this.getElement(),
        r = sessionStorage.getItem('colorbar-position');
      r &&
        ((r = JSON.parse(r)),
        (i.style.right = 'unset'),
        (i.style.bottom = 'unset'),
        (i.style.left = r.left + 'px'),
        (i.style.top = r.top + 'px')),
        (i.innerHTML = `<div class="bfc-bar-move">\n                        <div class="bfc-bar-move-line"></div>\n                    </div>\n                    <div class="bfc-colorbar-colors bfc-bar-content">\n                        ${t}  \n                    </div>  `);
    }
  }),
  (FlowChart.private.prototype.undo = function () {
    if (this.chart.options.useSession) {
      var t = this.undoStepsCount();
      if (0 != t) {
        this.putInRedoStack();
        var e = `${this.uid}_undo_` + (t - 1),
          i = sessionStorage.getItem(e);
        sessionStorage.removeItem(e);
        var r = JSON.parse(i);
        this.chart.load(r), FlowChart.events.publish('undo-redo-changed', [this.chart]);
      }
    }
  }),
  (FlowChart.private.prototype.redo = function () {
    if (this.chart.options.useSession) {
      var t = this.redoStepsCount();
      if (0 != t) {
        this.putInUndoStack();
        var e = `${this.uid}_redo_` + (t - 1),
          i = sessionStorage.getItem(e);
        sessionStorage.removeItem(e);
        var r = JSON.parse(i);
        this.chart.load(r), FlowChart.events.publish('undo-redo-changed', [this.chart]);
      }
    }
  }),
  (FlowChart.private.prototype.undoStepsCount = function () {
    if (!this.chart.options.useSession) return 0;
    for (
      var t = `${this.uid}_undo_`, e = Object.keys(sessionStorage), i = 0;
      -1 != e.indexOf(t + i);
    )
      i++;
    return i;
  }),
  (FlowChart.private.prototype.redoStepsCount = function () {
    if (!this.chart.options.useSession) return 0;
    for (
      var t = `${this.uid}_redo_`, e = Object.keys(sessionStorage), i = 0;
      -1 != e.indexOf(t + i);
    )
      i++;
    return i;
  }),
  (FlowChart.private.prototype.putInRedoStack = function () {
    if (this.chart.options.useSession) {
      var t = `${this.uid}_redo_` + this.redoStepsCount(),
        e = sessionStorage.getItem(`${this.uid}_state`);
      try {
        sessionStorage.setItem(t, e);
      } catch (t) {
        t.code == t.QUOTA_EXCEEDED_ERR && sessionStorage.clear(), console.error(t);
      }
    }
  }),
  (FlowChart.private.prototype.putInUndoStack = function () {
    if (this.chart.options.useSession) {
      var t = `${this.uid}_undo_` + this.undoStepsCount(),
        e = sessionStorage.getItem(`${this.uid}_state`);
      try {
        sessionStorage.setItem(t, e);
      } catch (t) {
        t.code == t.QUOTA_EXCEEDED_ERR && sessionStorage.clear(), console.error(t);
      }
    }
  }),
  (FlowChart.private.prototype.clearRedo = function () {
    if (this.chart.options.useSession) {
      for (
        var t = `${this.uid}_redo_`, e = Object.keys(sessionStorage), i = 0;
        -1 != e.indexOf(t + i);
      )
        sessionStorage.removeItem(t + i), i++;
      FlowChart.events.publish('undo-redo-changed', [this.chart]);
    }
  }),
  (FlowChart.private.prototype.clearUndo = function () {
    if (this.chart.options.useSession) {
      for (
        var t = `${this.uid}_undo_`, e = Object.keys(sessionStorage), i = 0;
        -1 != e.indexOf(t + i);
      )
        sessionStorage.removeItem(t + i), i++;
      FlowChart.events.publish('undo-redo-changed', [this.chart]);
    }
  }),
  (FlowChart.private.isObject = (t) =>
    t && 'object' == typeof t && !Array.isArray(t) && null !== t),
  (FlowChart.private.shadeColor = (t, e) => {
    var i = Number.parseInt(t.substring(1, 3), 16),
      r = Number.parseInt(t.substring(3, 5), 16),
      a = Number.parseInt(t.substring(5, 7), 16);
    return (
      (i = (i = Number.parseInt((i * (100 + e)) / 100)) < 255 ? i : 255),
      (r = (r = Number.parseInt((r * (100 + e)) / 100)) < 255 ? r : 255),
      (a = (a = Number.parseInt((a * (100 + e)) / 100)) < 255 ? a : 255),
      (i = Math.round(i)),
      (r = Math.round(r)),
      (a = Math.round(a)),
      '#' +
        (1 == i.toString(16).length ? '0' + i.toString(16) : i.toString(16)) +
        (1 == r.toString(16).length ? '0' + r.toString(16) : r.toString(16)) +
        (1 == a.toString(16).length ? '0' + a.toString(16) : a.toString(16))
    );
  }),
  (FlowChart.private.mergeDeep = (t, e) => {
    if (FlowChart.private.isObject(t) && FlowChart.private.isObject(e))
      for (var i in e)
        FlowChart.private.isObject(e[i])
          ? (t[i] || Object.assign(t, { [i]: {} }), FlowChart.private.mergeDeep(t[i], e[i]))
          : Object.assign(t, { [i]: e[i] });
    return t;
  }),
  (FlowChart.private.guid = () => {
    function t() {
      return Math.floor(65536 * (1 + Math.random()))
        .toString(16)
        .substring(1);
    }
    return t() + t() + '-' + t() + '-' + t() + '-' + t() + '-' + t() + t() + t();
  }),
  (FlowChart.private.rotate = (t, e, i) => {
    var r = (Math.PI / 180) * i,
      a = Math.cos(r),
      o = Math.sin(r);
    return {
      x: a * (e.x - t.x) + o * (e.y - t.y) + t.x,
      y: a * (e.y - t.y) - o * (e.x - t.x) + t.y,
    };
  }),
  (FlowChart.private.getScale = (t, e, i) => {
    var r = e / t[2],
      a = i / t[3];
    return r > a ? a : r;
  }),
  (FlowChart.private.pinchMiddlePointInPercent = (t, e, i, r) => {
    var a = (t, e) => {
        t && ((e.x += t.offsetLeft), (e.y += t.offsetTop), a(t.offsetParent, e));
      },
      o = ((t) => {
        var e = { x: 0, y: 0 };
        return a(t, e), e;
      })(t),
      s = r.touches[0].pageX - o.x,
      l = r.touches[0].pageY - o.y,
      h = r.touches[1].pageX - o.x,
      n = r.touches[1].pageY - o.y;
    return [((s - h) / 2 + h) / (e / 100), ((l - n) / 2 + n) / (i / 100)];
  }),
  (FlowChart.private.trim = (t) => t.replace(/^\s+|\s+$/g, '')),
  (FlowChart.private.getClientTouchesXY = (t, e) =>
    -1 != t.type.indexOf('touch')
      ? t.touches.length < e + 1
        ? { x: null, y: null }
        : { x: t.touches[e].clientX, y: t.touches[e].clientY }
      : { x: t.clientX, y: t.clientY }),
  (FlowChart.private.roundPathCorners = (t, e, i) => {
    if (0 == e) {
      for (var r = '', a = 0; a < t.length; a++) {
        var o = t[a];
        r += 0 == a ? `M ${o.x} ${o.y} ` : `L ${o.x} ${o.y} `;
      }
      return r;
    }
    function s(t, e, i) {
      var r = e.x - t.x,
        a = e.y - t.y,
        o = Math.sqrt(r * r + a * a);
      return l(t, e, Math.min(1, i / o));
    }
    function l(t, e, i) {
      return { x: t.x + (e.x - t.x) * i, y: t.y + (e.y - t.y) * i };
    }
    function h(t, e) {
      t.length > 2 && ((t[t.length - 2] = e.x), (t[t.length - 1] = e.y));
    }
    function n(t) {
      return { x: Number.parseFloat(t[t.length - 2]), y: Number.parseFloat(t[t.length - 1]) };
    }
    if (Array.isArray(t) && t.length && !Array.isArray(t[0])) {
      var d = [];
      for (a = 0; a < t.length; a++) {
        var p = t[a];
        0 == a ? d.push(['M', p.x, p.y]) : d.push(['L', p.x, p.y]);
      }
      t = d;
    }
    if (Array.isArray(t)) {
      if (Array.isArray(t)) {
        var c = [];
        for (a = 0; a < t.length; a++) c[a] = t[a].slice(0);
        t = c;
      }
    } else
      t = (t = t.split(/[,\s]/).reduce((t, e) => {
        var i = e.match('([a-zA-Z])(.+)');
        return i ? (t.push(i[1]), t.push(i[2])) : t.push(e), t;
      }, [])).reduce(
        (t, e) => (
          Number.parseFloat(e) == e && t.length ? t[t.length - 1].push(e) : t.push([e]), t
        ),
        []
      );
    var f = [];
    if (t.length > 1) {
      var u = n(t[0]),
        m = null;
      'Z' == t[t.length - 1][0] &&
        t[0].length > 2 &&
        ((m = ['L', u.x, u.y]), (t[t.length - 1] = m)),
        f.push(t[0]);
      for (var g = 1; g < t.length; g++) {
        var y = f[f.length - 1],
          v = t[g],
          w = v == m ? t[1] : t[g + 1];
        if (w && y && y.length > 2 && 'L' == v[0] && w.length > 2 && 'L' == w[0]) {
          var C,
            b,
            x = n(y),
            F = n(v),
            I = n(w);
          i
            ? ((C = l(F, y.origPoint || x, e)), (b = l(F, w.origPoint || I, e)))
            : ((C = s(F, x, e)), (b = s(F, I, e))),
            h(v, C),
            (v.origPoint = F),
            f.push(v);
          var N = l(C, F, 0.5),
            S = l(F, b, 0.5),
            T = ['C', N.x, N.y, S.x, S.y, b.x, b.y];
          (T.origPoint = F), f.push(T);
        } else f.push(v);
      }
      if (m) {
        var _ = n(f[f.length - 1]);
        f.push(['Z']), h(f[0], _);
      }
    } else f = t;
    return f.reduce((t, e) => t + e.join(' ') + ' ', '');
  }),
  (FlowChart.private.centerPointInPercent = (t, e, i) => {
    var r = t.getBoundingClientRect(),
      a = e - r.left,
      o = i - r.top;
    return [a / (r.width / 100), o / (r.height / 100)];
  }),
  (FlowChart.private.getPortPosition = (t, e) =>
    t.x == e.width && 0 == t.y
      ? FlowChart.position.topRight
      : t.x == e.width && t.y == e.height
        ? FlowChart.position.bottomRight
        : 0 == t.x && t.y == e.height
          ? FlowChart.position.bottomLeft
          : 0 == t.x && 0 == t.y
            ? FlowChart.position.topLeft
            : t.x > 0 && t.x < e.width && t.y < e.height / 2
              ? FlowChart.position.top
              : t.x > e.width / 2 && t.y > 0 && t.y < e.height
                ? FlowChart.position.right
                : t.x > 0 && t.x < e.width && t.y > e.height / 2
                  ? FlowChart.position.bottom
                  : t.x < e.width / 2 && t.y > 0 && t.y < e.height
                    ? FlowChart.position.left
                    : null),
  (FlowChart.private.replaceRightLeftKeyCodes = (t) =>
    t
      .replace('AltLeft', 'alt')
      .replace('AltRight', 'alt')
      .replace('ControlLeft', 'control')
      .replace('ControlRight', 'control')
      .replace('ShiftLeft', 'shift')
      .replace('ShiftRight', 'shift')
      .toLowerCase()),
  (FlowChart.private.stickPosition = (t, e, i) => {
    var r = t.getBoundingClientRect(),
      a = i.getBoundingClientRect(),
      o = e.getBoundingClientRect(),
      s = r.left - a.left,
      l = r.top - a.top;
    return (
      r.top + o.height > a.top + a.height && (l -= o.height),
      r.left - o.width < a.left && (s += o.width),
      { x: s, y: l }
    );
  }),
  (FlowChart.private.printableKeyCode = (t) =>
    (t > 47 && t < 58) ||
    32 == t ||
    13 == t ||
    (t > 64 && t < 91) ||
    (t > 95 && t < 112) ||
    (t > 185 && t < 193) ||
    (t > 218 && t < 223)),
  (FlowChart.private.getFirstPointIndexByMousePosition = (t, e, i) => {
    var r = e.createSVGPoint();
    (r.x = t.clientX), (r.y = t.clientY), (r = r.matrixTransform(e.getScreenCTM().inverse()));
    for (var a = Number.MAX_VALUE, o = 0, s = 0; s < i.points.length - 1; s++) {
      var l = i.points[s],
        h = i.points[s + 1],
        n = Math.hypot(l.x - h.x, l.y - h.y),
        d = Math.hypot(r.x - l.x, r.y - l.y),
        p = Math.hypot(r.x - h.x, r.y - h.y);
      d + p - n < a && ((a = d + p - n), (o = s));
    }
    return o;
  }),
  (FlowChart.private.safeIndexOf = (t, e) => {
    if (!Array.isArray(t)) return -1;
    for (var i = 0; i < t.length; i++) if (t[i] == e) return i;
    return -1;
  }),
  (FlowChart.private.getLabelXY = (t, e) => {
    var i = (e.length / 100) * t.position,
      r = 0,
      a = 0,
      o = null == t.movex ? 0 : t.movex,
      s = null == t.movey ? 0 : t.movey;
    !e || !e.points || e.points.length;
    for (var l = 0; l < e.points.length - 1; l++) {
      var h = e.points[l],
        n = e.points[l + 1],
        d = Math.hypot(n.x - h.x, n.y - h.y);
      if (r + d >= i) {
        a = l;
        break;
      }
      r += d;
    }
    (h = e.points[a]), (n = e.points[a + 1]);
    var p,
      c,
      f = FlowChart.direction.horizontal;
    return (
      e.points[a].x == e.points[a + 1].x && (f = FlowChart.direction.vertical),
      f == FlowChart.direction.horizontal
        ? ((p = h.x < n.x ? h.x + (i - r) + o : h.x - (i - r) + o), (c = h.y + s))
        : ((c = h.y < n.y ? h.y + (i - r) + s : h.y - (i - r) + s), (p = h.x + o)),
      { x: p, y: c, direction: f }
    );
  }),
  (FlowChart.private.isLabel = (t) =>
    !(FlowChart.isNEU(t.from) || FlowChart.isNEU(t.to) || FlowChart.isNEU(t.position))),
  (FlowChart.private.getFitScale = (t, e, i, r, a, o, s) => {
    var l = 1;
    if (
      i == FlowChart.startPosition.fit ||
      i == FlowChart.startPosition.fit1 ||
      i == FlowChart.startPosition.centerShapes
    ) {
      var h = t / o,
        n = e / s;
      (l = h > n ? n : h),
        i == FlowChart.startPosition.fit1 && l > 1
          ? (l = 1)
          : i == FlowChart.startPosition.centerShapes && l > 1.5 && (l = 1.5);
    } else
      i == FlowChart.startPosition.fitWidth
        ? (l = t / o)
        : i == FlowChart.startPosition.fitHeight && (l = e / s);
    return l && l > r && (l = r), l && l < a && (l = a), l;
  }),
  (FlowChart.private.downloadFile = (t, e, i, r) => {
    if (1 == i) {
      var a = URL.createObjectURL(t);
      window.open(a, '_blank').focus();
    } else if (navigator.msSaveBlob) navigator.msSaveBlob(t, e);
    else {
      var o = document.createElement('a');
      if (void 0 !== o.download) {
        (a = URL.createObjectURL(t)), o.setAttribute('href', a);
        var s = e;
        s.toLowerCase().endsWith(r.toLowerCase()) || (s = s + '.' + r),
          o.setAttribute('download', s),
          (o.style.visibility = 'hidden'),
          document.body.appendChild(o),
          o.click(),
          document.body.removeChild(o);
      }
    }
  }),
  (FlowChart.private.findClosestPorts = (t, e) => {
    var i = Number.MAX_SAFE_INTEGER,
      r = null,
      a = FlowChart.shapeTemplates[t.templateId].ports(t),
      o = FlowChart.shapeTemplates[e.templateId].ports(e);
    for (var s in a) {
      var l = a[s];
      for (var h in o) {
        var n = o[h],
          d = Math.hypot(t.x + l.x - (e.x + n.x), t.y + l.y - (e.y + n.y));
        d < i && ((i = d), (r = { fromPortName: s, toPortName: h }));
      }
    }
    return r;
  }),
  (FlowChart.private.rippleShape = (t, e, i) => {
    var r = t.height > t.width ? t.height : t.width;
    r /= 2;
    var a = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
      o = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath'),
      s = document.createElementNS('http://www.w3.org/2000/svg', 'circle'),
      l = t.id + '_ripple';
    o.setAttribute('id', l);
    var h = FlowChart.shapeTemplates[t.templateId].svg(t);
    (o.innerHTML = h),
      s.setAttribute('clip-path', 'url(#' + l + ')'),
      s.setAttribute('cx', t.width / 2),
      s.setAttribute('cy', t.height / 2),
      s.setAttribute('r', 0),
      s.setAttribute('fill', e),
      s.setAttribute('class', 'bfc-ripple'),
      a.appendChild(o),
      a.appendChild(s),
      t.element.appendChild(a);
    var n = { r: r, opacity: 0 };
    FlowChart.private.animate(s, { r: 0, opacity: 1 }, n, 500, FlowChart.anim.outPow, () => {
      t.element.removeChild(a), i && i();
    });
  }),
  (FlowChart.private.getLayer = (t, e) => {
    if (!(i = t.querySelector(`[data-layer="${e}"]`))) {
      var i;
      (i = document.createElementNS('http://www.w3.org/2000/svg', 'g')).setAttribute(
        'data-layer',
        e
      );
      for (var r = t.querySelectorAll('[data-layer]'), a = [], o = 0; o < r.length; o++)
        a.push(Number.parseFloat(r[o].getAttribute('data-layer')));
      a.push(e), a.sort((t, e) => t - e);
      var s = a.indexOf(e),
        l = t.querySelector(`[data-layer="${a[s + 1]}"]`);
      null == l ? t.appendChild(i) : l.parentNode.insertBefore(i, l);
    }
    return t.querySelector(`[data-layer="${e}"]`);
  }),
  (FlowChart.private.getParentElementWithAttribute = (t, e) => {
    while (t && t.hasAttribute && !t.hasAttribute(e)) t = t.parentNode;
    return t && t.hasAttribute && t.hasAttribute(e) ? t : null;
  }),
  (FlowChart.private.createImageElementForUpload = (t, e) => {
    var i = document.createElement('canvas');
    document.body.appendChild(i);
    var r = document.createElement('img');
    document.body.appendChild(r),
      r.addEventListener('load', (t) => {
        var a = r.offsetWidth,
          o = r.offsetHeight,
          s = 200,
          l = 200;
        a < o ? (l *= o / a) : a > o && (s *= a / o);
        var h = (l - 200) / 2,
          n = (s - 200) / 2;
        i.setAttribute('width', '200px'),
          i.setAttribute('height', '200px'),
          i.getContext('2d').drawImage(r, n, h, a, a, 0, 0, 200, 200);
        var d = i.toDataURL('image/jpeg', 0.7);
        e(d);
      }),
      (r.src = t);
  }),
  (FlowChart.private.safeStringify = (t, e) => {
    null == e && (e = 2);
    let i = [];
    const r = JSON.stringify(
      t,
      (t, e) =>
        'object' == typeof e && null !== e ? (i.includes(e) ? void 0 : i.push(e) && e) : e,
      e
    );
    return (i = null), r;
  }),
  (FlowChart.private.getViewBoxByScale = (t, e, i, r) => {
    t > e.scaleMax && (t = e.scaleMax), t < e.scaleMin && (t = e.scaleMin);
    var a = [50, 50],
      o = r.width,
      s = r.height,
      l = o / i[2],
      h = s / i[3],
      n = l > h ? h : l,
      d = i,
      p = i[2],
      c = i[3];
    return (
      (i[2] = i[2] / (t / n)),
      (i[3] = i[3] / (t / n)),
      (i[0] = d[0] - (i[2] - p) / (100 / a[0])),
      (i[1] = d[1] - (i[3] - c) / (100 / a[1])),
      i
    );
  }),
  (FlowChart.private.gradientCircleForDefs = (t, e, i, r) => {
    function a(t, e, i, r) {
      var a = ((r - 90) * Math.PI) / 180;
      return { x: t + i * Math.cos(a), y: e + i * Math.sin(a) };
    }
    function o(t, e, i, r, o) {
      var s = a(t, e, i, o),
        l = a(t, e, i, r),
        h = o - r <= 180 ? '0' : '1';
      return ['M', s.x, s.y, 'A', i, i, 0, h, 0, l.x, l.y].join(' ');
    }
    return (
      Array.isArray(e) || (e = [e, e, e, e, e, e]),
      `<linearGradient id="${t}_linearColors1" x1="0" y1="0" x2="1" y2="1">\n            <stop offset="0%" stop-color="${e[0]}"></stop>\n            <stop offset="100%" stop-color="${e[1]}"></stop>\n        </linearGradient>\n        <linearGradient id="${t}_linearColors2" x1="0.5" y1="0" x2="0.5" y2="1">\n            <stop offset="0%" stop-color="${e[1]}"></stop>\n            <stop offset="100%" stop-color="${e[2]}"></stop>\n        </linearGradient>\n        <linearGradient id="${t}_linearColors3" x1="1" y1="0" x2="0" y2="1">\n            <stop offset="0%" stop-color="${e[2]}"></stop>\n            <stop offset="100%" stop-color="${e[3]}"></stop>\n        </linearGradient>\n        <linearGradient id="${t}_linearColors4" x1="1" y1="1" x2="0" y2="0">\n            <stop offset="0%" stop-color="${e[3]}"></stop>\n            <stop offset="100%" stop-color="${e[4]}"></stop>\n        </linearGradient>\n        <linearGradient id="${t}_linearColors5" x1="0.5" y1="1" x2="0.5" y2="0">\n            <stop offset="0%" stop-color="${e[4]}"></stop>\n            <stop offset="100%" stop-color="${e[5]}"></stop>\n        </linearGradient>\n        <linearGradient id="${t}_linearColors6" x1="0" y1="1" x2="1" y2="0">\n            <stop offset="0%" stop-color="${e[5]}"></stop>\n            <stop offset="100%" stop-color="${e[0]}"></stop>\n        </linearGradient>        \n        <g id="${t}">\n            <path stroke-width="${r}" fill="none" stroke="url(#${t}_linearColors1)" d="${o(i, i, i, 1, 60)}"  />\n            <path stroke-width="${r}" fill="none" stroke="url(#${t}_linearColors2)" d="${o(i, i, i, 60, 120)}"/>\n            <path stroke-width="${r}" fill="none" stroke="url(#${t}_linearColors3)" d="${o(i, i, i, 120, 180)}" />\n            <path stroke-width="${r}" fill="none" stroke="url(#${t}_linearColors4)" d="${o(i, i, i, 180, 240)}" />\n            <path stroke-width="${r}" fill="none" stroke="url(#${t}_linearColors5)" d="${o(i, i, i, 240, 300)}" />\n            <path stroke-width="${r}" fill="none" stroke="url(#${t}_linearColors6)" d="${o(i, i, i, 300, 1)}"/>\n        </g>`
    );
  }),
  (FlowChart.remote = {}),
  (FlowChart.private.devin = (t, e) => {
    (t.v = '1.00.71'),
      FlowChart.remote.findRegion((i) => {
        fetch(i, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: FlowChart.private.safeStringify(t),
        })
          .then((t) => t.json())
          .then((t) => {
            e(t);
          })
          .catch((t) => {
            console.error(t);
          });
      });
  }),
  (FlowChart.remote.findRegion = (t) => {
    var e = localStorage.getItem('func-url-flowchartjs');
    if (e) t(e);
    else {
      var i = [];
      for (var r of [
        'defunc2',
        'cusfunc2',
        'bsfunc2',
        'acfunc2',
        'kcfunc2',
        'safunc2',
        'wifunc2',
      ]) {
        var a = new AbortController();
        fetch(`https://${r}.azurewebsites.net/api/FlowChartJS`, { method: 'GET', signal: a.signal })
          .then((e) => {
            for (var r of i) r.abort('cancel_request');
            localStorage.setItem('func-url-flowchartjs', e.url), t(e.url);
          })
          .catch((t) => {
            'cancel_request' != t && console.error(t);
          }),
          i.push(a);
      }
    }
  }),
  (FlowChart.private.logo = (t) =>
    t ||
    '<svg style="position: absolute; bottom: 8px; right: 7px; font-family: Verdana;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="160" height="27">      \n            <text fill="#039be5" style="font-size: 14px;font-weight:bold;" x="0" y="24">BALKAN</text>\n            <text fill="#f57c00" style="font-size: 14px;" x="70" y="24">FlowChart JS</text>\n        </svg>');
var FamilyTree2 = (() => {
  function t(e) {
    (this.state = {
      name: '',
      readFromUrlParams: !1,
      writeToUrlParams: !1,
      readFromLocalStorage: !1,
      writeToLocalStorage: !1,
      readFromSessionStorage: !1,
      writeToSessionStorage: !1,
    }),
      (this.autoGenerateSiblingChildSpouseIds = !0),
      (this._ = new t.private(this, e));
  }
  return (
    Object.defineProperty(t.prototype, 'svgElement', {
      get: function () {
        return this._.chart.svgElement;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'shortcuts', {
      get: function () {
        return this._.chart._.shortcuts;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'readOnly', {
      get: function () {
        return !this._.chart.options.editable;
      },
      set: function (t) {
        this._.chart.options.editable = !t;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'navigationBar', {
      get: function () {
        var t = this.element.querySelector('[data-navigation-bar]');
        return !t || 'none' != t.style.display;
      },
      set: function (t) {
        var e = this.element.querySelector('[data-navigation-bar]');
        e && (e.style.display = t ? 'initial' : 'none');
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'mode', {
      get: function () {
        return this._.chart.mode;
      },
      set: function (t) {
        this._.chart.mode = t;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'collapsedIds', {
      get: function () {
        return this._.collapsedIds;
      },
      set: function (t) {
        this._.collapsedIds = t;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'editId', {
      get: function () {
        return this._.editId;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'element', {
      get: function () {
        return this._.chart.element;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'focusId', {
      get: function () {
        return this._.focusId;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'family', {
      get: function () {
        return this._.family;
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'templateName', {
      get: function () {
        return this._.templateName;
      },
      set: function (t) {
        (this._.templateName = t), this._.addDefsOnTemplateChange();
      },
      enumerable: !1,
      configurable: !0,
    }),
    Object.defineProperty(t.prototype, 'template', {
      get: function () {
        return this._.getTemplate();
      },
      enumerable: !1,
      configurable: !0,
    }),
    (t.prototype.clear = function () {
      this._.clear();
    }),
    (t.prototype.edit = function (t, e) {
      this._.edit(t, e);
    }),
    (t.prototype.svg = function () {
      return this._.chart.svg();
    }),
    (t.prototype.getFemilyMember = function (t) {
      return this._.getFemilyMember(t);
    }),
    (t.prototype.getNode = function (t) {
      return this._.chart.getShape(t);
    }),
    (t.prototype.centerNodes = function (t) {
      this._.centerNodes(t);
    }),
    (t.convertGedcomToFamilyMembers = (e, i) => t.private.convertGedcomToFamilyMembers(e, i)),
    (t.prototype.exportToGedcom = function () {
      return this._.exportToGedcom();
    }),
    (t.prototype.center = function (t) {
      this._.center(t);
    }),
    (t.prototype.fit = function () {
      this._.fit();
    }),
    (t.prototype.makeNodesVisible = function (t, e) {
      this._.makeNodesVisible(t, e);
    }),
    (t.prototype.draw = function (t, e, i) {
      this._.draw(t, e, i);
    }),
    (t.prototype.remove = function (t) {
      return this._.remove(t), this;
    }),
    (t.prototype.addFamilyMembers = function (t) {
      return this._.addFamilyMembers(t), this;
    }),
    (t.prototype.addFather = function (t, e) {
      return this._.addFather(t, e), this;
    }),
    (t.prototype.addMother = function (t, e) {
      return this._.addMother(t, e), this;
    }),
    (t.prototype.addSibling = function (t, e) {
      return this._.addSibling(t, e), this;
    }),
    (t.prototype.addSpouse = function (t, e) {
      return this._.addSpouse(t, e), this;
    }),
    (t.prototype.addUnmarriedPartner = function (t, e) {
      return this._.addUnmarriedPartner(t, e), this;
    }),
    (t.prototype.addChild = function (t, e, i) {
      return this._.addChild(t, e, i), this;
    }),
    (t.prototype.select = function (t) {
      return this._.select(t);
    }),
    (t.prototype.showEditor = function (t) {
      return this._.showEditor(t), this;
    }),
    (t.prototype.hideEditor = function () {
      return this._.hideEditor(), this;
    }),
    (t.prototype.destroy = function () {
      (t.events.topics = {}), this._.chart.destroy();
    }),
    (t.prototype.clearState = (e) => {
      t.private.state.clear(e);
    }),
    (t.prototype.stateToUrl = function () {
      return t.private.prototype.stateToUrl(this.state);
    }),
    (t.prototype.onDemand = function (t) {
      return this._.on('demand', (e, i) => t.call(e, i));
    }),
    (t.prototype.onFocusButtonClick = function (t) {
      return this._.on('on-focus-button-click', (e, i) => t.call(e, i));
    }),
    (t.prototype.onUpdated = function (t) {
      return this._.on('updated', (e, i) => t.call(e, i));
    }),
    (t.prototype.onNodeClick = function (t) {
      return this._.on('node-click', (e, i) => t.call(e, i));
    }),
    (t.prototype.onSvgClick = function (t) {
      return this._.on('svg-click', (e, i) => t.call(e, i));
    }),
    (t.prototype.onLoaded = function (t) {
      return this._.on('loaded', (e, i) => t.call(e, i));
    }),
    (t.createTemplate = (e, i) => t.private.createTemplate(e, i)),
    t
  );
})();
(FamilyTree2.private = class {
  updatedArgs;
  familyTree;
  public;
  focusId;
  graph;
  chart;
  element;
  initialized;
  family;
  uid;
  dottedFillColors;
  collapsedIds;
  expandedIds;
  editId;
  templateName;
  static systemIds = [
    'system_add_sibling',
    'system_add_child',
    'system_add_spouse',
    'system_add_mother',
    'system_add_father',
  ];
  static countFamilyTrees = 0;
  static createTemplate(t, e) {
    null == e && (e = 'base');
    var i = (FamilyTree2.templates[t] = {
        nodes: {
          focus: null,
          parent: null,
          spouse: null,
          sibling: null,
          child: null,
          parentInLaw: null,
          parentSibling: null,
          stepParent: null,
          childInLaw: null,
          pibling: null,
        },
      }),
      r = FamilyTree2.templates[e];
    for (var a in ((i.svgVacant = r.svgVacant.bind({})),
    (i.svgButton = r.svgButton.bind({})),
    i.nodes))
      FlowChart.shapeTemplates[t + '_nodes_' + a] = i.nodes[a] = Object.assign({}, r.nodes[a]);
    return (
      (FlowChart.shapeTemplates[t + '_button'] = i.button = Object.assign({}, r.button)),
      (FlowChart.linkTemplates[t] = i.link = Object.assign({}, r.link)),
      (i.separations = Object.assign({}, r.separations)),
      (i.editor = Object.assign({}, r.editor)),
      Object.defineProperty(i, 'insertSvg', {
        set: function (t) {
          var e;
          (this.nodes.parent.svg =
            ((e = this.nodes.parent.svg),
            function () {
              return e.apply(this, arguments) + t.apply(this, arguments);
            })),
            (this.nodes.spouse.svg = (() => {
              var e = this.nodes.spouse.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.sibling.svg = (() => {
              var e = this.nodes.sibling.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.parentInLaw.svg = (() => {
              var e = this.nodes.parentInLaw.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.stepParent.svg = (() => {
              var e = this.nodes.stepParent.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.childInLaw.svg = (() => {
              var e = this.nodes.childInLaw.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.focus.svg = (() => {
              var e = this.nodes.focus.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.pibling.svg = (() => {
              var e = this.nodes.pibling.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.child.svg = (() => {
              var e = this.nodes.child.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })()),
            (this.nodes.parentSibling.svg = (() => {
              var e = this.nodes.parentSibling.svg;
              return function () {
                return e.apply(this, arguments) + t.apply(this, arguments);
              };
            })());
        },
      }),
      Object.defineProperty(i, 'svg', {
        set: function (t) {
          (this.nodes.parent.svg = t.bind({})),
            (this.nodes.spouse.svg = t.bind({})),
            (this.nodes.sibling.svg = t.bind({})),
            (this.nodes.parentInLaw.svg = t.bind({})),
            (this.nodes.stepParent.svg = t.bind({})),
            (this.nodes.childInLaw.svg = t.bind({})),
            (this.nodes.focus.svg = t.bind({})),
            (this.nodes.pibling.svg = t.bind({})),
            (this.nodes.child.svg = t.bind({})),
            (this.nodes.parentSibling.svg = t.bind({}));
        },
      }),
      Object.defineProperty(i, 'html', {
        set: function (t) {
          (this.nodes.parent.html = t.bind({})),
            (this.nodes.spouse.html = t.bind({})),
            (this.nodes.sibling.html = t.bind({})),
            (this.nodes.parentInLaw.html = t.bind({})),
            (this.nodes.stepParent.html = t.bind({})),
            (this.nodes.childInLaw.html = t.bind({})),
            (this.nodes.focus.html = t.bind({})),
            (this.nodes.pibling.html = t.bind({})),
            (this.nodes.child.html = t.bind({})),
            (this.nodes.parentSibling.html = t.bind({}));
        },
      }),
      Object.defineProperty(i, 'fill', {
        set: function (t) {
          (this.nodes.parent.fill = t),
            (this.nodes.spouse.fill = t),
            (this.nodes.sibling.fill = t),
            (this.nodes.parentInLaw.fill = t),
            (this.nodes.stepParent.fill = t),
            (this.nodes.childInLaw.fill = t),
            (this.nodes.focus.fill = t),
            (this.nodes.pibling.fill = t),
            (this.nodes.child.fill = t),
            (this.nodes.parentSibling.fill = t);
        },
      }),
      Object.defineProperty(i, 'height', {
        set: function (t) {
          (this.nodes.parent.height = t),
            (this.nodes.spouse.height = t),
            (this.nodes.sibling.height = t),
            (this.nodes.parentInLaw.height = t),
            (this.nodes.stepParent.height = t),
            (this.nodes.childInLaw.height = t),
            (this.nodes.focus.height = t),
            (this.nodes.pibling.height = t),
            (this.nodes.child.height = t),
            (this.nodes.parentSibling.height = t);
        },
      }),
      Object.defineProperty(i, 'width', {
        set: function (t) {
          (this.nodes.parent.width = t),
            (this.nodes.spouse.width = t),
            (this.nodes.sibling.width = t),
            (this.nodes.parentInLaw.width = t),
            (this.nodes.stepParent.width = t),
            (this.nodes.childInLaw.width = t),
            (this.nodes.focus.width = t),
            (this.nodes.pibling.width = t),
            (this.nodes.child.width = t),
            (this.nodes.parentSibling.width = t);
        },
      }),
      Object.defineProperty(i, 'strokeWidth', {
        set: function (t) {
          (this.nodes.parent.strokeWidth = t),
            (this.nodes.spouse.strokeWidth = t),
            (this.nodes.sibling.strokeWidth = t),
            (this.nodes.parentInLaw.strokeWidth = t),
            (this.nodes.stepParent.strokeWidth = t),
            (this.nodes.childInLaw.strokeWidth = t),
            (this.nodes.focus.strokeWidth = t),
            (this.nodes.pibling.strokeWidth = t),
            (this.nodes.child.strokeWidth = t),
            (this.nodes.parentSibling.strokeWidth = t);
        },
      }),
      Object.defineProperty(i, 'stroke', {
        set: function (t) {
          (this.nodes.parent.stroke = t),
            (this.nodes.spouse.stroke = t),
            (this.nodes.sibling.stroke = t),
            (this.nodes.parentInLaw.stroke = t),
            (this.nodes.stepParent.stroke = t),
            (this.nodes.childInLaw.stroke = t),
            (this.nodes.focus.stroke = t),
            (this.nodes.pibling.stroke = t),
            (this.nodes.child.stroke = t),
            (this.nodes.parentSibling.stroke = t);
        },
      }),
      FamilyTree2.templates[t]
    );
  }
  constructor(t, e) {
    var i = this;
    (this.templateName = 'snickers'),
      (this.updatedArgs = { remove: [], update: [], insert: [] }),
      (this.collapsedIds = []),
      (this.editId = null),
      (this.focusId = null),
      (this.familyTree = t),
      (this.expandedIds = []),
      (this.family = []),
      (this.element = e),
      (this.dottedFillColors = {}),
      this.element.classList.add('bft2'),
      (this.initialized = !1),
      (this.uid = window.location.pathname + '/family-tree/' + FlowChart.private.countFamilyTrees),
      FlowChart.private.countFamilyTrees++,
      (this.chart = new FlowChart(this.element, {
        colors: ['#F04770', '#F78C6A', '#008A17', '#FFD167', '#06D7A0', '#108AB1', '#073A4B'],
        scaleMin: 0.25,
        useSession: !1,
        logoSvg: FamilyTree2.logo,
        selectable: !0,
        editable: !1,
        startPosition: FlowChart.startPosition.fit1,
      })),
      (this.chart.defs +=
        '<style type="text/css"><![CDATA[\n    .bft2-button:hover{\n      cursor: pointer;\n    }\n      .bft2 .bfc-selector{\n        display: none;\n      }\n\n      .bft2.bfc-light .bft2-editor{\n          color: #333333;\n          background-color: #fff;\n      }\n          \n      .bft2.bfc-dark .bft2-editor{\n          color: #acacac;\n          background-color: #252526;\n      }\n      .bft2-editor{\n        box-shadow: rgba(0, 0, 0, .2) 0 6px 6px 0, rgba(0, 0, 0, .19) 0 13px 20px 0;\n        width: 300px;\n        height: 100%;\n        position: absolute;\n        top: 0;\n        right: 0;\n        border-radius: 10px;\n        width: 400px;\n\n\n        display: grid;        \n        grid-template-rows: 200px auto 1fr;\n      }\n      .bft2 .bfc-s-ports{\n          display: none;\n      }\n      .bft2-editor-header{\n        background-color: #039BE5;\n        \n        text-align: center;\n        border-radius: 10px;\n      }\n        .bft2-editor-avatar{\n            border-radius: 50%;\n          width: 150px;\n          height: 150px;\n          position: absolute;\n          top: 75px;\n          border: 5px solid #fff;\n          left: 50%;\n          transform: translateX(-50%);\n          background-color: #cacaca;\n          box-shadow: rgba(0,0,0,.2) 0 6px 6px 0,rgba(0,0,0,.19) 0 13px 20px 0;\n        }\n        .bft2-editor-title{\n          color: #fff;\n          margin: 0;\n          padding: 14px 17px 7px 17px;\n          line-height: 1;\n          font-size: 30px;\n        }\n\n        .bft2-editor-instruments{\n            margin: 42px 10px 0 10px;\n          text-align: center;\n          min-height: 70px;\n        }\n\n        .bft2-editor-button{\n          width: 48px;\n          height: 48px;\n          cursor: pointer;\n          border-radius: 50%;\n          background-color: #039be5;\n          background-repeat: no-repeat;\n          background-size: 24px 24px;\n          background-position: center center;\n          margin: 3px;\n          display: inline-block;\n        }\n\n        .bft2-editor-button svg{\n          position: relative;\n          top: 12px;\n        }\n\n        .bft2-editor-content{\n          overflow-y: scroll;\n          padding: 0 7px;\n        }\n        .bft2-editor-field {\n            border: none;\n            border-bottom: 1px solid rgba(255, 255, 255, 0.7); \n            margin-bottom: 0.5rem;\n            padding-bottom: 0.25rem;\n            color: #aeaeae;\n            font-size: 1rem;\n            width: 100%; \n            background-color: transparent; \n            transition: border-bottom 0.5s ease; \n            padding: 7px 0;\n        }\n\n        .bft2-editor-field:focus {\n            outline: none; \n            border-bottom: 1px solid #039BE5; \n            box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.1); \n        }\n\n        .bft2-editor-label {\n            display: block;\n            font-size: 0.8rem;\n            color: rgba(255, 255, 255, 0.8); \n        }\n\n        .bft2-editor-content-item{\n          margin: 22px 0;\n          position: relative;\n        }\n\n        .bft2-editor-field-item{\n          display: inline-block;\n          border: 1px solid #aeaeae;\n          padding: 3px 7px;\n          border-radius: 10px;\n          font-size: 0.8rem;\n        }\n\n     \n    ]]></style>'),
      this.addNavigationBar(),
      (this.chart._.shortcuts = {}),
      (this.chart._.shortcuts.edit_next_field = {
        keysPressed: ['tab|enter|numpadenter'],
        activeComponentType: 'field',
        desc: 'Focus next field',
      }),
      (this.chart._.shortcuts.copy = {
        keysPressed: ['control', 'keyc'],
        activeComponentType: 'canvas',
        desc: 'Copy entire family tree',
      }),
      (this.chart._.shortcuts.zoom = {
        keysPressed: ['control'],
        mouseActions: ['wheel'],
        desc: 'Zoom In/Out',
      }),
      (this.chart._.shortcuts.edit_shape = {
        keysPressed: ['enter|numpadenter|space'],
        activeComponentType: 'shape',
        desc: 'Edit shape',
      }),
      (this.chart.statusBar._.useRefreshHint = !1),
      (this.chart.statusBar.content = ''),
      this.chart.statusBar.hide(),
      this.chart.onShortcut((t) => {
        if ('copy' == t.name) {
          t.event.preventDefault();
          var e = { family: i.family, focusId: i.focusId };
          navigator.clipboard.writeText(JSON.stringify(e));
        }
      }),
      new MutationObserver((t) => {
        t.forEach((t) => {
          FamilyTree2.private.state.put(
            i.familyTree.state,
            i.chart.viewBox,
            i.collapsedIds,
            i.focusId,
            i.editId
          );
        });
      }).observe(this.chart.svgElement, { attributes: !0, attributeFilter: ['viewBox'] }),
      this.chart.element.addEventListener('paste', (t) => {
        'canvas' == i.chart._.getActiveComponentTypes() &&
          (t.preventDefault(),
          navigator.clipboard.readText().then((t) => {
            var e = JSON.parse(t);
            i.addFamilyMembers(e.family).draw(e.focusId);
          }));
      }),
      this.chart.onFieldChange((t) => {
        var e = !1,
          r = [];
        for (var a of i.family)
          a.id == t.shape.id &&
            a[t.fieldName] != t.newValue &&
            ((a[t.fieldName] = t.newValue), r.push(a), (e = !0));
        return (
          e &&
            ((i.updatedArgs.update = r),
            FamilyTree2.events.publish('updated', [i.familyTree, i.updatedArgs]),
            i.clearUpdatedArgs()),
          !1
        );
      }),
      this.chart.onSelectedPortChange((t) => !1),
      this.chart.onShapeClick(function (t) {
        var e = i.onSelectedChangedHandler(t);
        if (!1 !== e && 1 == i.familyTree.readOnly)
          for (var r of this.nodes)
            r.element.querySelector('.bfc-svg-front').innerHTML =
              FlowChart.shapeTemplates[r.templateId].svgFront(r);
        return e;
      }),
      this.chart.onSelectedShapeChanging((t) => {}),
      this.chart.onSvgClick(function (t) {
        var e = FamilyTree2.events.publish('svg-click', [i.familyTree, { event: t.event }]);
        if (!1 === e) return e;
        if (
          (i.hideEditor(),
          null != i.editId && (i.removeActionNodes(), 0 == i.familyTree.readOnly && i.draw()),
          1 == i.familyTree.readOnly)
        )
          for (var r of this.nodes)
            (r.selected = !1),
              (r.element.querySelector('.bfc-svg-front').innerHTML =
                FlowChart.shapeTemplates[r.templateId].svgFront(r));
      }),
      this.chart.onLinkClick((t) => !1),
      this.chart.onChanged((t) => {}),
      this.chart.onLinkPoints((t) => {
        i.onLinkPoints(t);
      }),
      this.showTrialMessageIfNoInternet();
  }
  addDefsOnTemplateChange() {
    this.chart.defs += this.getTemplate().defs;
  }
  getTemplate() {
    return FamilyTree2.templates[this.templateName];
  }
  select(t) {
    var e = this.chart.getShape(t);
    return (
      (e.selected = !0),
      (e.element.querySelector('.bfc-svg-front').innerHTML =
        FlowChart.shapeTemplates[e.templateId].svgFront(e)),
      this
    );
  }
  generateId() {
    for (;;) {
      var t = '_' + ('0000' + ((Math.random() * Math.pow(36, 4)) | 0).toString(36)).slice(-4),
        e = !1;
      for (var i of this.family)
        if (i.id == t) {
          e = !0;
          break;
        }
      if (!e) return t;
    }
  }
  draw(t, e, i) {
    if (FlowChart.isNEU(t) && FlowChart.isNEU(this.focusId))
      console.error(
        'There is no focused family member, your first call of draw should be with parameter, tree.draw([your family member id]);'
      );
    else if (FlowChart.isNEU(t) || FlowChart.isNEU(this.focusId) || t == this.focusId)
      if (!FlowChart.isNEU(t) && FlowChart.isNEU(this.focusId) && t != this.focusId) {
        var a = null;
        this.initialized ||
          ((a = FamilyTree2.private.state.get(this.familyTree.state)) &&
            ((this.collapsedIds = a.collapsedIds), (this.editId = a.editId), (t = a.focusId))),
          this.loadInternal(t, this.family, [], !1, null, () => {
            if (a) {
              var t = a.viewBox.splice(0);
              (t[0] += a.offsetX),
                (t[1] += a.offsetY),
                (this.chart.viewBox = t),
                FamilyTree2.private.state.put(
                  this.familyTree.state,
                  t,
                  a.collapsedIds,
                  a.focusId,
                  a.editId,
                  0,
                  0
                ),
                null != a.editId && this.edit(a.editId);
            }
            (this.initialized = !0),
              FamilyTree2.events.publish('loaded', [this.familyTree]),
              i && i.call(this.familyTree);
          });
      } else this.loadInternal(this.focusId, null, [], !1, e, i);
    else this.loadInternal(t, null, [], !0, null, i);
  }
  remove(t) {
    for (
      var e = t,
        i = ['stepParentIds', 'childIds', 'siblingIds', 'spouseIds', 'unmarriedPartnerIds'],
        r = this.family.length - 1;
      r >= 0;
      r--
    ) {
      var a = !1,
        o = this.family[r];
      for (var s of (o.id == e && (this.removeUpdatedArgs(e), this.family.splice(r, 1)),
      o.fatherId == e && ((o.fatherId = null), this.updateUpdatedArgs(o), (a = !0)),
      o.motherId == e && ((o.motherId = null), this.updateUpdatedArgs(o), (a = !0)),
      i))
        FamilyTree2.private.removeFromList(s, o, e) && !a && (this.updateUpdatedArgs(o), (a = !0));
    }
    return this;
  }
  addFather(t, e) {
    return (
      e ? null == e.sexOrGender && (e.sexOrGender = 'male') : (e = { sexOrGender: 'male' }),
      this.addMotherOrFather(t, 'fatherId', e),
      this
    );
  }
  addMother(t, e) {
    return (
      e ? null == e.sexOrGender && (e.sexOrGender = 'female') : (e = { sexOrGender: 'female' }),
      this.addMotherOrFather(t, 'motherId', e),
      this
    );
  }
  addSibling(t, e) {
    return this.addSiblingOrSpouse(t, 'siblingIds', e), this;
  }
  addSpouse(t, e) {
    return this.addSiblingOrSpouse(t, 'spouseIds', e), this;
  }
  addUnmarriedPartner(t, e) {
    return this.addSiblingOrSpouse(t, 'unmarriedPartnerIds', e), this;
  }
  addChild(t, e, i) {
    return this._addChild(t, e, i), this;
  }
  _addChild(t, e, i) {
    for (var r of ((i = this.initData(i)), this.family))
      r.id == t &&
        ('male' == r.sexOrGender ? (i.fatherId = t) : 'female' == r.sexOrGender && (i.motherId = t),
        r.childIds || (r.childIds = []),
        r.childIds.push(i.id),
        this.updateUpdatedArgs(r)),
        r.id == e &&
          ('male' == r.sexOrGender
            ? (i.fatherId = e)
            : 'female' == r.sexOrGender && (i.motherId = e),
          r.childIds || (r.childIds = []),
          r.childIds.push(i.id),
          this.updateUpdatedArgs(r));
    this.insertUpdatedArgs(i), this.family.push(i);
  }
  addSiblingOrSpouse(t, e, i) {
    (i = this.initData(i))[e] = [t];
    var r = this.getFemilyMember(t);
    if (r) {
      if ((r[e] || (r[e] = []), r[e].push(i.id), 'siblingIds' == e)) {
        if (null != r.motherId) {
          i.motherId = r.motherId;
          var a = this.getFemilyMember(r.motherId);
          a && (a.childIds || (a.childIds = []), a.childIds.push(i.id));
        }
        if (null != r.fatherId) {
          i.fatherId = r.fatherId;
          var o = this.getFemilyMember(r.fatherId);
          o && (o.childIds || (o.childIds = []), o.childIds.push(i.id));
        }
      }
      this.updateUpdatedArgs(r);
    }
    this.insertUpdatedArgs(i), this.family.push(i);
  }
  addMotherOrFather(t, e, i) {
    for (var r of (((i = this.initData(i)).childIds = [t]), this.family))
      r.id == t &&
        (FlowChart.isNEU(r[e])
          ? (r[e] = i.id)
          : (r.stepParentIds || (r.stepParentIds = []), r.stepParentIds.push(i.id)));
    this.insertUpdatedArgs(i), this.family.push(i);
  }
  addFamilyMembers(t) {
    for (var e of t) {
      e = this.initData(e);
      for (var i = this.family.length - 1; i >= 0; i--) {
        this.family[i].id == e.id && this.family.splice(i, 1);
      }
      this.insertUpdatedArgs(e), this.family.push(e);
    }
  }
  insertUpdatedArgs(t) {
    if (this.initialized && !FamilyTree2.private.systemIds.includes(t.id)) {
      for (var e = this.updatedArgs.insert.length - 1; e >= 0; e--)
        this.updatedArgs.insert[e].id == t.id && this.updatedArgs.insert.splice(e, 1);
      this.updatedArgs.insert.push(t);
    }
  }
  updateUpdatedArgs(t) {
    if (this.initialized && !FamilyTree2.private.systemIds.includes(t.id)) {
      for (var e = this.updatedArgs.update.length - 1; e >= 0; e--)
        this.updatedArgs.update[e].id == t.id && this.updatedArgs.update.splice(e, 1);
      this.updatedArgs.update.push(t);
    }
  }
  removeUpdatedArgs(t) {
    if (this.initialized && !FamilyTree2.private.systemIds.includes(t)) {
      for (var e of this.updatedArgs.remove) if (t == e) return;
      this.updatedArgs.remove.push(t);
    }
  }
  clearUpdatedArgs() {
    this.updatedArgs = { insert: [], update: [], remove: [] };
  }
  initData(t) {
    return t ? null == t.id && (t.id = this.generateId()) : (t = { id: this.generateId() }), t;
  }
  getFemilyMember(t) {
    for (var e of this.familyTree.family) if (e.id == t) return e;
    return null;
  }
  clear() {
    this.chart.links.clear(), this.chart.labels.clear(), this.chart.nodes.clear();
  }
  zoomIn() {
    this.chart._.zoom(1.3, void 0, !0);
  }
  zoomOut() {
    this.chart._.zoom(0.7, void 0, !0);
  }
  center(t) {
    this.chart.reposition(FlowChart.startPosition.center, [t], !0);
  }
  centerNodes(t) {
    this.chart.reposition(FlowChart.startPosition.centerShapes, t, !0);
  }
  fit() {
    this.chart.reposition(FlowChart.startPosition.fit1, null, !0);
  }
  getRandomColor() {
    for (var t = '#', e = 0; e < 6; e++) t += Math.floor(10 * Math.random());
    return t;
  }
  on(t, e) {
    return FamilyTree2.events.on(t, e, this.uid), this.chart;
  }
}),
  (FamilyTree2.private.prototype.loadInternal = function (t, e, i, r, a, o) {
    e ||
      this.loadInternalCalledOnce ||
      (null == t && console.error('You need to set focusId first: tree.focusId = [your id];'),
      (e = this.family)),
      (this.loadInternalCalledOnce = !0),
      e && (this.family = e);
    var s = {},
      l = [];
    l.push(this.templateName);
    var h = [
      'focus',
      'parent',
      'spouse',
      'sibling',
      'child',
      'parentInLaw',
      'parentSibling',
      'stepParent',
      'childInLaw',
      'pibling',
    ];
    for (var n of l)
      for (var d of ((s[n] = {}), h))
        FamilyTree2.templates[n].nodes[d],
          (s[n][d] = {
            width: FamilyTree2.templates[n].nodes[d].width,
            height: FamilyTree2.templates[n].nodes[d].height,
          });
    var p = this.chart.nodes.get(null == a ? t : a),
      f = [];
    for (var u of this.family) {
      var m = { id: u.id };
      if (u.siblingIds && u.siblingIds.length)
        for (var g of ((m.siblingIds = []), u.siblingIds)) m.siblingIds.push(g);
      if (u.spouseIds && u.spouseIds.length)
        for (var y of ((m.spouseIds = []), u.spouseIds)) m.spouseIds.push(y);
      if (u.unmarriedPartnerIds && u.unmarriedPartnerIds.length)
        for (var v of ((m.unmarriedPartnerIds = []), u.unmarriedPartnerIds))
          m.unmarriedPartnerIds.push(v);
      if (u.stepParentIds && u.stepParentIds.length)
        for (var w of ((m.stepParentIds = []), u.stepParentIds)) m.stepParentIds.push(w);
      if (u.childIds && u.childIds.length)
        for (var C of ((m.childIds = []), u.childIds)) m.childIds.push(C);
      FlowChart.isNEU(u.motherId) || (m.motherId = u.motherId),
        FlowChart.isNEU(u.fatherId) || (m.fatherId = u.fatherId),
        f.push(m);
    }
    var b = {
      templateName: this.templateName,
      sizeByTemplateAndRelationship: s,
      data: f,
      focusId: t,
      separations: FamilyTree2.templates[this.templateName].separations,
      autoGenerateSiblingChildSpouseIds: this.familyTree.autoGenerateSiblingChildSpouseIds,
      collapsedIds: this.collapsedIds,
    };
    FamilyTree2.graphLayout(b, (s) => {
      if (!this.showTrialMessage(s)) {
        this.graph = s;
        var l = [],
          h = this.graph.verticesWithPosition;
        for (var n in h) {
          var d = h[n],
            f = {},
            u = n;
          for (var m of (null != d.nonDottedId && (u = d.nonDottedId), this.family))
            if (m.id == u) {
              f.familyMember = m;
              break;
            }
          if (((f.id = f.familyMember.id), null != d.nonDottedId)) {
            f.id = d.id;
            var g = this.dottedFillColors[d.nonDottedId];
            g || ((g = this.getRandomColor()), (this.dottedFillColors[d.nonDottedId] = g)),
              (f.fill = g);
          }
          var y = this.templateName,
            v = this.familyTree.template;
          if (
            ((f.x = d.x),
            (f.y = d.y),
            (f.templateId = y + '_nodes_' + d.relationshipType),
            (f.level = d.level),
            (f.relationshipType = d.relationshipType),
            (f.collapsedParents = d.collapsedParents),
            (f.primaryParentId = d.primaryParentId),
            (f.secondaryParentId = d.secondaryParentId),
            (f.parents = d.parents),
            (f.motherId = d.motherId),
            (f.fatherId = d.fatherId),
            (f.children = d.children),
            (f.collapsedChildren = d.collapsedChildren),
            (f.collapsedSiblings = d.collapsedSiblings),
            (f.siblings = d.siblings),
            (f.sibling = d.sibling),
            (f.collapsedSpouses = d.collapsedSpouses),
            (f.spouses = d.spouses),
            (f.spouse = d.spouse),
            (f.isUnmarriedPartner = d.isUnmarriedPartner),
            (f.isStepParent = d.isStepParent),
            (f.spouseWithChildrenIndex = d.spouseWithChildrenIndex),
            (f.isInEditMode = 0 == this.familyTree.readOnly && f.id == this.editId),
            f.familyMember.isActionNode)
          ) {
            var w = 'action_' + f.templateId;
            (FlowChart.shapeTemplates[w] = Object.assign(
              {},
              FlowChart.shapeTemplates[f.templateId]
            )),
              (FlowChart.shapeTemplates[w].html = () => ''),
              (f.templateId = w),
              (FlowChart.shapeTemplates[w].svg = v.svgVacant),
              (FlowChart.shapeTemplates[w].svgFront = () => '');
          }
          l.push(f);
        }
        for (var C of this.graph.links)
          for (var f of ((C.templateId = this.templateName), l))
            f.id == C.from ? (C.fromNode = f) : f.id == C.to && (C.toNode = f);
        r
          ? this.loadInternalFromFocus(t, l, i, p, a, o)
          : this.loadInternalFromAddinfOrDifData(e, t, l, i, p, a, o);
      }
    });
  }),
  (FamilyTree2.private.prototype.loadInternalFromFocus = function (t, e, i, r, a, o) {
    var l = [],
      h = [],
      n = [],
      d = this.graph.verticesWithPosition[null == a ? t : a],
      p = d.x - (r ? r.x : 0),
      c = d.y - (r ? r.y : 0);
    for (var f of e) {
      var u = this.chart.nodes.get(f.id);
      if (((f.x -= p), (f.y -= c), u && f.id != t)) {
        var m = u.x - u.width / 2,
          g = u.y - u.height / 2,
          y = this.templateName,
          v = FamilyTree2.templates[y].nodes[f.relationshipType],
          w = f.x - v.width / 2,
          C = f.y - v.height / 2;
        l.push({ translate: [m, g] }), h.push({ translate: [w, C] }), n.push(f.id);
      }
    }
    for (var b in this.graph.childrenLevels)
      (this.graph.childrenLevels[b].top -= c),
        (this.graph.childrenLevels[b].bottom -= c),
        (this.graph.childrenLevels[b].left -= p),
        (this.graph.childrenLevels[b].right -= p);
    for (var b in this.graph.parentsLevels)
      (this.graph.parentsLevels[b].top -= c),
        (this.graph.parentsLevels[b].bottom -= c),
        (this.graph.parentsLevels[b].left -= p),
        (this.graph.parentsLevels[b].right -= p);
    this.focusId = t;
    var x = { nodes: e, links: [] };
    (x.links = this.graph.links), this.chart.load(x), this.selectNodeAfterLoad();
    for (var F = [], I = [], N = [], S = 0; S < n.length; S++) {
      var T = n[S],
        _ = ((f = this.chart.nodes.get(T)), l[S]),
        A = h[S];
      if (_.translate[0] != A.translate[0] || _.translate[1] != A.translate[1]) {
        var E = f.element;
        E.setAttribute('transform', 'translate(' + _.translate.toString() + ')');
        f = this.chart.nodes.get(T);
        F.push(E), I.push(_), N.push(A);
      }
    }
    var L = [];
    for (var k of i) {
      var $ = this.chart.nodes.get(k);
      L.push($);
    }
    L.length && this.chart._.makeShapesVisible(L),
      FamilyTree2.private.state.put(
        this.familyTree.state,
        this.chart.viewBox,
        this.collapsedIds,
        this.focusId,
        this.editId,
        p,
        c
      ),
      FlowChart.private.animate(F, I, N, 300, FlowChart.anim.outPow, () => {
        o && o.call(this.familyTree);
      });
  }),
  (FamilyTree2.private.prototype.loadInternalFromAddinfOrDifData = function (t, e, i, r, a, o, s) {
    var l,
      h,
      d = [],
      p = [],
      c = [];
    if (!t) {
      var f = this.graph.verticesWithPosition[null == o ? e : o];
      for (var u of ((l = f.x - a.x), (h = f.y - a.y), i)) {
        var m = this.chart.nodes.get(u.id);
        if (((u.x -= l), (u.y -= h), m)) {
          var g = m.x - m.width / 2,
            y = m.y - m.height / 2,
            v = this.templateName,
            w = FamilyTree2.templates[v].nodes[u.relationshipType],
            C = u.x - w.width / 2,
            b = u.y - w.height / 2;
          d.push({ translate: [g, y] }), p.push({ translate: [C, b] }), c.push(u.id);
        }
      }
      for (var x in this.graph.childrenLevels)
        (this.graph.childrenLevels[x].top -= h),
          (this.graph.childrenLevels[x].bottom -= h),
          (this.graph.childrenLevels[x].left -= l),
          (this.graph.childrenLevels[x].right -= l);
      for (var x in this.graph.parentsLevels)
        (this.graph.parentsLevels[x].top -= h),
          (this.graph.parentsLevels[x].bottom -= h),
          (this.graph.parentsLevels[x].left -= l),
          (this.graph.parentsLevels[x].right -= l);
    }
    if (((this.focusId = e), !t))
      for (var u of i) {
        for (var F = !1, I = 0; I < c.length; I++) {
          var N = c[I];
          if (u.id == N) {
            F = !0;
            break;
          }
        }
        if (!F) {
          var S = null;
          for (var T of this.graph.links)
            if (T.to == u.id) {
              if (null != S) {
                S = null;
                break;
              }
              S = T;
            }
          if (S) {
            for (var _ of i)
              if (_.id == S.from) {
                0;
                break;
              }
            c.push(u.id);
            (v = this.templateName), (w = FamilyTree2.templates[v].nodes[u.relationshipType]);
            'parent' == u.relationshipType
              ? (d.push({ opacity: 0, translate: [u.x - w.width / 2, u.y + 10 - w.height / 2] }),
                p.push({ opacity: 1, translate: [u.x - w.width / 2, u.y - w.height / 2] }))
              : 'child' == u.relationshipType
                ? (d.push({ opacity: 0, translate: [u.x - w.width / 2, u.y - 10 - w.height / 2] }),
                  p.push({ opacity: 1, translate: [u.x - w.width / 2, u.y - w.height / 2] }))
                : 'parentInLaw' == u.relationshipType ||
                    'spouse' == u.relationshipType ||
                    'stepParent' == u.relationshipType ||
                    'childInLaw' == u.relationshipType
                  ? (d.push({
                      opacity: 0,
                      translate: [u.x - 10 - w.width / 2, u.y - w.height / 2],
                    }),
                    p.push({ opacity: 1, translate: [u.x - w.width / 2, u.y - w.height / 2] }))
                  : ('parentSibling' != u.relationshipType &&
                      'sibling' != u.relationshipType &&
                      'pibling' != u.relationshipType) ||
                    (d.push({
                      opacity: 0,
                      translate: [u.x + 10 - w.width / 2, u.y - w.height / 2],
                    }),
                    p.push({ opacity: 1, translate: [u.x - w.width / 2, u.y - w.height / 2] })),
              (u.opacity = 0);
          }
        }
      }
    var A = { nodes: i, links: [] };
    if (((A.links = this.graph.links), this.chart.load(A), this.selectNodeAfterLoad(), t))
      s && s.call(this.familyTree);
    else {
      var E = [],
        L = [],
        k = [];
      for (I = 0; I < c.length; I++) {
        var $ = c[I],
          P = ((u = this.chart.nodes.get($)), d[I]),
          D = p[I];
        if (P.translate[0] != D.translate[0] || P.translate[1] != D.translate[1]) {
          var M = u.element;
          M.setAttribute('transform', 'translate(' + P.translate.toString() + ')');
          u = this.chart.nodes.get($);
          E.push(M), L.push(P), k.push(D);
        }
      }
      var O = [];
      for (var B of r) {
        var K = this.chart.nodes.get(B);
        O.push(K);
      }
      O.length && this.chart._.makeShapesVisible(O),
        FlowChart.private.animate(E, L, k, 300, FlowChart.anim.outPow, () => {
          s && s.call(this.familyTree);
        });
    }
    FamilyTree2.private.state.put(
      this.familyTree.state,
      this.chart.viewBox,
      this.collapsedIds,
      this.focusId,
      this.editId,
      l,
      h
    );
  }),
  (FamilyTree2.private.prototype.selectNodeAfterLoad = function () {
    if (null != this.editId && null != this.editId) {
      var t = this.chart.nodes.get(this.editId);
      if (t) {
        (t.selected = !0),
          (t.element.querySelector('.bfc-svg-front').innerHTML =
            FlowChart.shapeTemplates[t.templateId].svgFront(t));
        var e = this.chart.editor.getFieldNames(t);
        e.length ? this.chart.editor.edit(t, e[0]) : this.chart.editor.edit(t);
      }
    }
  }),
  (FamilyTree2.private.prototype.showTrialMessage = function (t) {
    1 == t.limit &&
      (this.element.innerHTML =
        '<div style="font-family: Helvetica; position: absolute; top: 50%; right: 50%; transform: translate(50%,-50%); padding: 10px; color: #fff; max-width: 600px; border-radius: 7px; background-color: #FFCA28;">\n      <h1>Your trial period has expired</h1>\n      <p>To continue using <b>Family Tree JS 2</b>, please contact our support team to extend your trial or visit <a style="color: #039BE5;" href="https://balkan.app/FamilyTreeJS2/Pricing" target="_blank">our pricing page</a> to purchase a license.</p>\n      <p>We\'re here to help if you have any questions!</p>\n    </div>');
  }),
  (FamilyTree2.private.prototype.showTrialMessageIfNoInternet = function () {
    window.navigator.onLine ||
      (this.element.innerHTML =
        '<div style="font-family: Helvetica; position: absolute; top: 50%; right: 50%; transform: translate(50%,-50%); padding: 10px; color: #fff; max-width: 600px; border-radius: 7px; background-color: #FFCA28;">\n      <h1>Internet Connection Required</h1>\n      <p>Family Tree JS 2 requires an active internet connection to function properly, except when using the ENTERPRISE license.</p>\n      <p>For offline usage, please consider upgrading to the ENTERPRISE plan.</p>\n    </div>');
  }),
  (FamilyTree2.loading = {}),
  (FamilyTree2.loading.show = (t) => {
    var e = document.createElement('div');
    (e.id = 'boc-loading'),
      (e.innerHTML =
        '<style>@-webkit-keyframes dot-keyframes {0% { opacity: .4; -webkit-transform: scale(1, 1);transform: scale(1, 1);}50% {opacity: 1;-webkit-transform: scale(1.2, 1.2);transform: scale(1.2, 1.2);}100% {opacity: .4;-webkit-transform: scale(1, 1);transform: scale(1, 1);}}@keyframes dot-keyframes {0% {opacity: .4;-webkit-transform: scale(1, 1);transform: scale(1, 1);}50% {opacity: 1;-webkit-transform: scale(1.2, 1.2);transform: scale(1.2, 1.2);}100% {opacity: .4;-webkit-transform: scale(1, 1);transform: scale(1, 1);}}.boc-loading-dots div {margin: 10px;}      .boc-dot-1 {background-color: #039BE5;}.boc-dot-2 {background-color: #F57C00;}.boc-dot-3 {background-color: #FFCA28;}      .boc-loading-dots {text-align: center;width: 100%; position: absolute; top: 0;}.boc-loading-dots--dot {-webkit-animation: dot-keyframes 1.5s infinite ease-in-out;animation: dot-keyframes 1.5s infinite ease-in-out;        border-radius: 10px;display: inline-block;height: 10px;width: 10px;}.boc-loading-dots--dot:nth-child(2) {-webkit-animation-delay: .5s;animation-delay: .5s;}.boc-loading-dots--dot:nth-child(3) {-webkit-animation-delay: 1s;animation-delay: 1s;}</style><div class="boc-loading-dots"><div class="boc-loading-dots--dot boc-dot-1"></div><div class="boc-loading-dots--dot boc-dot-2"></div><div class="boc-loading-dots--dot boc-dot-3"></div></div>'),
      t.element.appendChild(e);
  }),
  (FamilyTree2.loading.hide = (t) => {
    var e = t.element.querySelector('#boc-loading');
    e && e.parentNode.removeChild(e);
  }),
  (FamilyTree2.events = class extends FlowChart.events {}),
  void 0 === FamilyTree2 && (FamilyTree2 = {}),
  void 0 === FamilyTree2.private && (FamilyTree2.private = {}),
  (FamilyTree2.private.safeStringify = (t, e) => {
    null == e && (e = 2);
    let i = [];
    const r = JSON.stringify(
      t,
      (t, e) =>
        'object' == typeof e && null !== e ? (i.includes(e) ? void 0 : i.push(e) && e) : e,
      e
    );
    return (i = null), r;
  }),
  (FamilyTree2.private.safeIndexOf = (t, e) => {
    if (!Array.isArray(t)) return -1;
    for (var i = 0; i < t.length; i++) if (t[i] == e) return i;
    return -1;
  }),
  (FamilyTree2.private.convertJsonToGedcom = (t) => {
    let e = '0 HEAD\n1 CHAR UTF-8\n1 GEDC\n2 VERS 5.5.1\n1 SOUR JSON Converter\n';
    const i = new Map();
    return (
      t.forEach((t) => {
        const r = String(t.id);
        if (((e += `0 @I${r}@ INDI\n`), t.name && (e += `1 NAME ${t.name}\n`), t.sexOrGender)) {
          const i =
            'male' === t.sexOrGender.toLowerCase()
              ? 'M'
              : 'female' === t.sexOrGender.toLowerCase()
                ? 'F'
                : 'U';
          e += `1 SEX ${i}\n`;
        }
        if (
          (t.dateOfBirth && ((e += '1 BIRT\n'), (e += `2 DATE ${t.dateOfBirth}\n`)),
          t.dateOfDeath && ((e += '1 DEAT\n'), (e += `2 DATE ${t.dateOfDeath}\n`)),
          t.fatherId || t.motherId)
        ) {
          const a = `F_${t.fatherId || 'X'}_${t.motherId || 'Y'}_parents`;
          if (((e += `1 FAMC @${a}@\n`), i.has(a))) {
            const t = i.get(a);
            t.childIds.includes(r) || t.childIds.push(r);
          } else i.set(a, { husbId: t.fatherId, wifeId: t.motherId, childIds: [r] });
        }
        if (
          (t.spouseIds &&
            t.spouseIds.length > 0 &&
            t.spouseIds.forEach((a) => {
              const o = `F_${r}_${a}_spouse`;
              if (((e += `1 FAMS @${o}@\n`), !i.has(o))) {
                const e = t.sexOrGender ? t.sexOrGender.toLowerCase() : null,
                  s = 'male' === e ? r : 'female' === e ? a : r,
                  l = 'female' === e ? r : a;
                i.set(o, { husbId: s, wifeId: l, childIds: [] });
              }
            }),
          t.childIds && t.childIds.length > 0)
        ) {
          const e = Array.from(i.entries())
            .filter(([t, e]) => e.husbId === r || e.wifeId === r)
            .map(([t, e]) => t);
          if (e.length > 0) {
            const r = e[0],
              a = i.get(r);
            t.childIds.forEach((t) => {
              a.childIds.includes(t) || a.childIds.push(t);
            });
          }
        }
      }),
      i.forEach((t, i) => {
        (e += `0 @${i}@ FAM\n`),
          t.husbId && (e += `1 HUSB @I${t.husbId}@\n`),
          t.wifeId && (e += `1 WIFE @I${t.wifeId}@\n`),
          t.childIds.forEach((t) => {
            e += `1 CHIL @I${t}@\n`;
          });
      }),
      (e += '0 TRLR'),
      e
    );
  }),
  (FamilyTree2.convertGedcomToJson = (t) => {
    const e = t.replace(/\r/g, '').split('\n'),
      i = new Map(),
      r = new Map();
    let a = null,
      o = null,
      s = 0;
    for (const t of e) {
      if (!t.trim()) continue;
      const e = t.match(/^(\d+)\s+(@\w+@\s+)?(\w+)(\s+(.*))?$/);
      if (!e) continue;
      const l = Number.parseInt(e[1]),
        h = e[3],
        n = e[5] || '',
        d = e[2] ? e[2].trim() : null;
      if (0 === l) {
        if ('INDI' === h && d) {
          const t = d.replace(/@I([^@]+)@/, '$1');
          (a = { id: t }), i.set(t, a);
        } else if ('FAM' === h && d) {
          const t = d.replace(/[@]/g, '');
          (a = { id: t, husbandId: null, wifeId: null, childrenIds: [] }), r.set(t, a);
        } else a = null;
        (o = null), (s = 0);
      } else if (a)
        if (1 === l) {
          if (((o = h), (s = 1), i.has(a.id)))
            switch (h) {
              case 'NAME':
                a.name = n;
                break;
              case 'SEX':
                a.sexOrGender = 'M' === n ? 'male' : 'F' === n ? 'female' : n;
                break;
              case 'FAMC':
                const t = n.replace(/@([^@]+)@/, '$1');
                a.parentFamilies || (a.parentFamilies = []), a.parentFamilies.push(t);
                break;
              case 'FAMS':
                const e = n.replace(/@([^@]+)@/, '$1');
                a.spouseFamilies || (a.spouseFamilies = []), a.spouseFamilies.push(e);
            }
          else if (r.has(a.id))
            switch (h) {
              case 'HUSB':
                a.husbandId = n.replace(/@I([^@]+)@/, '$1');
                break;
              case 'WIFE':
                a.wifeId = n.replace(/@I([^@]+)@/, '$1');
                break;
              case 'CHIL':
                const t = n.replace(/@I([^@]+)@/, '$1');
                a.childrenIds.push(t);
            }
        } else
          2 === l &&
            1 === s &&
            i.has(a.id) &&
            ('BIRT' === o && 'DATE' === h
              ? (a.dateOfBirth = n)
              : 'DEAT' === o && 'DATE' === h && (a.dateOfDeath = n));
    }
    const l = [];
    for (const [t, e] of i) {
      const i = {
        id: t,
        name: e.name || 'Unknown',
        dateOfBirth: e.dateOfBirth || 'Date of birth',
        dateOfDeath: e.dateOfDeath || 'Date of death',
      };
      if (
        (e.sexOrGender && (i.sexOrGender = e.sexOrGender),
        e.parentFamilies && e.parentFamilies.length > 0)
      ) {
        const t = e.parentFamilies[0],
          a = r.get(t);
        a && (a.husbandId && (i.fatherId = a.husbandId), a.wifeId && (i.motherId = a.wifeId));
      }
      if (e.spouseFamilies && e.spouseFamilies.length > 0) {
        i.spouseIds = [];
        for (const a of e.spouseFamilies) {
          const e = r.get(a);
          if (e) {
            let r = null;
            e.husbandId === t ? (r = e.wifeId) : e.wifeId === t && (r = e.husbandId),
              r && i.spouseIds.push(r);
          }
        }
      }
      let a = [];
      if (e.spouseFamilies) {
        for (const t of e.spouseFamilies) {
          const e = r.get(t);
          e && e.childrenIds.length > 0 && (a = [...a, ...e.childrenIds]);
        }
        a.length > 0 && (i.childIds = a);
      }
      if (e.parentFamilies && e.parentFamilies.length > 0) {
        const a = e.parentFamilies[0],
          o = r.get(a);
        if (o && o.childrenIds.length > 1) {
          const e = o.childrenIds.filter((e) => e !== t);
          e.length > 0 && (i.siblingIds = e);
        }
      }
      l.push(i);
    }
    return l;
  }),
  (FamilyTree2.private.buttons = function (t) {
    var e = t.templateId.split('_')[0],
      i = FamilyTree2.templates[e],
      r = '';
    if (
      ('parentInLaw' == t.relationshipType || 'spouse' == t.relationshipType) &&
      t.parents.length
    ) {
      var a = '';
      t.collapsedParents.length &&
        (a = `<text style="fill: #aeaeae; font-size: 16px;" text-anchor="middle" x="32" y="16">${t.collapsedParents.length}<text>`),
        (r += i.svgButton(
          t,
          this.width,
          this.height / 2,
          a,
          FamilyTree2.icon.parent(18, 18, '#fff', 3, 3),
          'expcoll-parents',
          '#aeaeae',
          'Expand/Collapse Parents'
        ));
    }
    if (
      ('parentSibling' == t.relationshipType || 'sibling' == t.relationshipType) &&
      t.parents.length
    ) {
      a = '';
      t.collapsedParents.length &&
        (a = `<text style="fill: #aeaeae; font-size: 16px;" text-anchor="middle" x="-9" y="16" >${t.collapsedParents.length}<text>`),
        (r += i.svgButton(
          t,
          0,
          this.height / 2,
          a,
          FamilyTree2.icon.parent(18, 18, '#fff', 3, 3),
          'expcoll-parents',
          '#aeaeae',
          'Expand/Collapse Siblings'
        ));
    }
    if (
      'parent' == t.relationshipType ||
      'focus' == t.relationshipType ||
      'child' == t.relationshipType
    ) {
      if (t.siblings.length) {
        a = '';
        t.collapsedSiblings.length &&
          (a = `<text style="fill: #aeaeae; font-size: 16px;" text-anchor="middle" x="-9" y="16" >${t.collapsedSiblings.length}<text>`),
          (r += i.svgButton(
            t,
            0,
            this.height / 2,
            a,
            FamilyTree2.icon.sibling(18, 18, '#fff', 3, 3),
            'expcoll-siblings',
            '#aeaeae',
            'Expand/Collapse Siblings'
          ));
      }
      if (t.spouses.length) {
        a = '';
        t.collapsedSpouses.length &&
          (a = `<text style="fill: #aeaeae; font-size: 16px;" text-anchor="middle" x="32" y="16">${t.collapsedSpouses.length}<text>`),
          (r += i.svgButton(
            t,
            this.width,
            this.height / 2,
            a,
            FamilyTree2.icon.spouse(18, 18, '#fff', 3, 3),
            'expcoll-spouses',
            '#aeaeae',
            'Expand/Collapse Spouses'
          ));
      }
    }
    if (('focus' == t.relationshipType || 'child' == t.relationshipType) && t.children.length) {
      a = '';
      t.collapsedChildren.length &&
        (a = `<text style="fill: #aeaeae; font-size: 16px;" text-anchor="middle" x="12" y="40">${t.collapsedChildren.length}<text>`),
        (r += i.svgButton(
          t,
          this.width / 2,
          this.height,
          a,
          FamilyTree2.icon.child(18, 18, '#fff', 3, 3),
          'expcoll-children',
          '#aeaeae',
          'Expand/Collapse Children'
        ));
    }
    if (('focus' == t.relationshipType || 'parent' == t.relationshipType) && t.parents.length) {
      a = '';
      t.collapsedParents.length &&
        (a = `<text style="fill: #aeaeae; font-size: 16px;" text-anchor="middle" x="12" y="-7" >${t.collapsedParents.length}<text>`),
        (r += i.svgButton(
          t,
          this.width / 2,
          0,
          a,
          FamilyTree2.icon.parent(18, 18, '#fff', 3, 3),
          'expcoll-parents',
          '#aeaeae',
          'Expand/Collapse Parents'
        ));
    }
    if (
      ('spouse' == t.relationshipType || 'childInLaw' == t.relationshipType) &&
      null != t.spouseWithChildrenIndex
    ) {
      a = '';
      t.collapsedChildren.length &&
        (a = `<text style="fill: #aeaeae; font-size: 16px;" text-anchor="middle" x="12" y="40">${t.collapsedChildren.length}<text>`),
        (r += i.svgButton(
          t,
          15 * -(t.spouseWithChildrenIndex + 1),
          this.height / 2,
          a,
          FamilyTree2.icon.child(18, 18, '#fff', 3, 3),
          'expcoll-children',
          '#aeaeae',
          'Expand/Collapse Children'
        ));
    }
    return (
      t.selected &&
        ('spouse' == t.relationshipType ||
        'parentInLaw' == t.relationshipType ||
        'childInLaw' == t.relationshipType ||
        'stepParent' == t.relationshipType
          ? ((r += i.svgButton(
              t,
              0,
              this.height / 2,
              '',
              FamilyTree2.icon.fit(18, 18, '#fff', 3, 3),
              'focus',
              '#FFCA28',
              'Focus'
            )),
            t.isInEditMode &&
              ((r += i.svgButton(
                t,
                0,
                0,
                '',
                FamilyTree2.icon.editToolPencil(18, 18, '#fff', 3, 3),
                'edit',
                '#48B25A',
                'Edit'
              )),
              (r += i.svgButton(
                t,
                0,
                this.height,
                '',
                FamilyTree2.icon.camera(18, 18, '#fff', 3, 3),
                'camera',
                '#F57C00',
                'Take Photo'
              ))))
          : 'sibling' == t.relationshipType ||
              'parentSibling' == t.relationshipType ||
              'pibling' == t.relationshipType
            ? ((r += i.svgButton(
                t,
                this.width,
                this.height / 2,
                '',
                FamilyTree2.icon.fit(18, 18, '#fff', 3, 3),
                'focus',
                '#FFCA28',
                'Focus'
              )),
              t.isInEditMode &&
                ((r += i.svgButton(
                  t,
                  this.width,
                  0,
                  '',
                  FamilyTree2.icon.editToolPencil(18, 18, '#fff', 3, 3),
                  'edit',
                  '#48B25A',
                  'Edit'
                )),
                (r += i.svgButton(
                  t,
                  this.width,
                  this.height,
                  '',
                  FamilyTree2.icon.camera(18, 18, '#fff', 3, 3),
                  'camera',
                  '#F57C00',
                  'Take Photo'
                ))))
            : 'child' == t.relationshipType
              ? ((r += i.svgButton(
                  t,
                  this.width / 2,
                  0,
                  '',
                  FamilyTree2.icon.fit(18, 18, '#fff', 3, 3),
                  'focus',
                  '#FFCA28',
                  'Focus'
                )),
                t.isInEditMode &&
                  ((r += i.svgButton(
                    t,
                    0,
                    0,
                    '',
                    FamilyTree2.icon.editToolPencil(18, 18, '#fff', 3, 3),
                    'edit',
                    '#48B25A',
                    'Edit'
                  )),
                  (r += i.svgButton(
                    t,
                    this.width,
                    0,
                    '',
                    FamilyTree2.icon.camera(18, 18, '#fff', 3, 3),
                    'camera',
                    '#F57C00',
                    'Take Photo'
                  ))))
              : 'parent' == t.relationshipType
                ? ((r += i.svgButton(
                    t,
                    this.width / 2,
                    this.height,
                    '',
                    FamilyTree2.icon.fit(18, 18, '#fff', 3, 3),
                    'focus',
                    '#FFCA28',
                    'Focus'
                  )),
                  t.isInEditMode &&
                    ((r += i.svgButton(
                      t,
                      this.width / 2 - 30,
                      this.height,
                      '',
                      FamilyTree2.icon.editToolPencil(18, 18, '#fff', 3, 3),
                      'edit',
                      '#48B25A',
                      'Edit'
                    )),
                    (r += i.svgButton(
                      t,
                      this.width / 2 + 30,
                      this.height,
                      '',
                      FamilyTree2.icon.camera(18, 18, '#fff', 3, 3),
                      'camera',
                      '#F57C00',
                      'Take Photo'
                    ))))
                : 'focus' == t.relationshipType &&
                  t.isInEditMode &&
                  ((r += i.svgButton(
                    t,
                    this.width / 2 - 30,
                    0,
                    '',
                    FamilyTree2.icon.editToolPencil(18, 18, '#fff', 3, 3),
                    'edit',
                    '#48B25A',
                    'Edit'
                  )),
                  (r += i.svgButton(
                    t,
                    this.width / 2 + 30,
                    0,
                    '',
                    FamilyTree2.icon.camera(18, 18, '#fff', 3, 3),
                    'camera',
                    '#F57C00',
                    'Take Photo'
                  )))),
      r
    );
  }),
  (FlowChart.shapeTemplates.baseFamily = Object.assign({}, FlowChart.shapeTemplates.base)),
  (FlowChart.shapeTemplates.baseFamily.svg = (t) => {
    var e = '';
    null != t.nonDottedId && (e = 'stroke-dasharray="10"');
    var i = '';
    return (
      t.familyMember &&
        t.familyMember.loading &&
        (i = `<g transform="translate(${t.width / 2 - 24} ${t.height / 2 - 24})"><circle fill="#fff" cx="36" cy="24" r="0" >\n                <animate attributeName="r" begin=".67" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;8;0;0"/>\n                </circle>\n                <circle fill="#fff" cx="24" cy="24" r="0" >\n                <animate attributeName="r" begin=".33" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;8;0;0"/>\n                </circle>\n                <circle fill="#fff" cx="12" cy="24" r="0" >\n                <animate attributeName="r" begin="0" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;8;0;0"/>\n                </circle></g>`),
      `<rect rx="7" ${e} ry="7" x="0" y="0" width="${t.width}" height="${t.height}" style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};" ></rect>${i}`
    );
  }),
  (FlowChart.shapeTemplates.baseFamily.minHeight = 1),
  (FlowChart.shapeTemplates.baseFamily.minWidth = 1),
  (FlowChart.shapeTemplates.baseFamily.displayInShapeBar = !1),
  (FlowChart.shapeTemplates.baseFamily.displayInPortShapeBar = !1),
  (FlowChart.shapeTemplates.baseFamily.displayName = 'Base Family'),
  (FlowChart.shapeTemplates.baseFamily.resizable = !1),
  (FlowChart.shapeTemplates.baseFamily.movable = !1),
  (FlowChart.shapeTemplates.baseFamily.selectable = !0),
  (FlowChart.shapeTemplates.baseFamily.html = (t) =>
    `<span style="max-width: 95%; max-height: 95%; padding: 7px;" data-field="name"> ${t.familyMember.name ? t.familyMember.name : '  '}</span>`),
  (FamilyTree2.templates = {}),
  (FamilyTree2.templates.base = {}),
  (FamilyTree2.templates.base.separations = {
    parentInLawLevel: 40,
    parentSiblingLevel: 40,
    childSubtree: 40,
    childLevel: 80,
    childNeighbor: 40,
    parentSubtree: 40,
    parentLevel: 40,
    parentNeighbor: 30,
    focusSide: 30,
    focusBottom: 80,
    childSide: 30,
    parentSide: 30,
    piblingNeighbor: 10,
    siblingNeighbor: 10,
    childInLowNeighbor: 10,
    spouseNeighbor: 10,
    stepParentNeighbor: 10,
    parentInLawNeighbor: 10,
    parentSiblingNeighbor: 10,
  }),
  (FamilyTree2.templates.base.nodes = {}),
  (FamilyTree2.templates.base.svgVacant = (t) => {
    var e,
      i = '',
      r = t.width > t.height ? t.height : t.width;
    r /= 1.2;
    var a = '',
      o = '';
    return (
      'child' == t.relationshipType
        ? (a = 'child')
        : 'spouse' == t.relationshipType ||
            'childInLaw' == t.relationshipType ||
            'stepParent' == t.relationshipType
          ? (a = 'spouse')
          : 'sibling' == t.relationshipType || 'pibling' == t.relationshipType
            ? (a = 'sibling')
            : ('parent' != t.relationshipType &&
                'parentSibling' != t.relationshipType &&
                'parentInLaw' != t.relationshipType) ||
              ('female' == t.familyMember.sexOrGender
                ? ((a = 'parent'), (o = 'female'))
                : 'male' == t.familyMember.sexOrGender
                  ? ((a = 'parent'), (o = 'male'))
                  : (a = 'parent')),
      (e = FamilyTree2.icon[a](r, r, t.stroke, t.width / 2 - r / 2, t.height / 2 - r / 2)),
      o && (i = FamilyTree2.icon[o](r / 2, r / 2, t.stroke, 10, 10)),
      `<rect stroke-dasharray="5" rx="7" ry="7" x="0" y="0" width="${t.width}" height="${t.height}" style="stroke:${t.stroke}; fill:none; stroke-width:${t.strokeWidth};" ></rect>${e}${i}`
    );
  }),
  (FamilyTree2.templates.base.nodes.pibling = Object.assign(
    {},
    FlowChart.shapeTemplates.baseFamily
  )),
  (FamilyTree2.templates.base.nodes.pibling.width = 250),
  (FamilyTree2.templates.base.nodes.pibling.height = 120),
  (FamilyTree2.templates.base.nodes.focus = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.focus.width = 250),
  (FamilyTree2.templates.base.nodes.childInLaw = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.childInLaw.width = 250),
  (FamilyTree2.templates.base.nodes.childInLaw.height = 120),
  (FamilyTree2.templates.base.nodes.stepParent = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.stepParent.width = 250),
  (FamilyTree2.templates.base.nodes.stepParent.height = 120),
  (FamilyTree2.templates.base.nodes.parentSibling = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.parentSibling.width = 250),
  (FamilyTree2.templates.base.nodes.parentSibling.height = 120),
  (FamilyTree2.templates.base.nodes.parentInLaw = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.parentInLaw.width = 250),
  (FamilyTree2.templates.base.nodes.parentInLaw.height = 120),
  (FamilyTree2.templates.base.nodes.child = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.child.width = 250),
  (FamilyTree2.templates.base.nodes.child.height = 120),
  (FamilyTree2.templates.base.nodes.sibling = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.sibling.width = 250),
  (FamilyTree2.templates.base.nodes.sibling.height = 120),
  (FamilyTree2.templates.base.nodes.spouse = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.spouse.width = 250),
  (FamilyTree2.templates.base.nodes.spouse.height = 120),
  (FamilyTree2.templates.base.nodes.parent = Object.assign(
    {},
    FamilyTree2.templates.base.nodes.pibling
  )),
  (FamilyTree2.templates.base.nodes.parent.width = 250),
  (FamilyTree2.templates.base.nodes.parent.height = 120),
  (FamilyTree2.templates.base.svgButton = (t, e, i, r, a, o, s, l) =>
    `<g transform="translate(${e - 12}, ${i - 12})" data-button="${o}" class="bft2-button">\n        <title>${l}</title>\n        <circle cx="12" cy="12" r="12" style="fill:${s}; stroke-width:0;" />\n        ${a}\n        ${r}\n        </g>`),
  (FamilyTree2.templates.base.nodes.parent.svgFront =
    FamilyTree2.templates.base.nodes.child.svgFront =
    FamilyTree2.templates.base.nodes.sibling.svgFront =
    FamilyTree2.templates.base.nodes.pibling.svgFront =
    FamilyTree2.templates.base.nodes.stepParent.svgFront =
    FamilyTree2.templates.base.nodes.parentInLaw.svgFront =
    FamilyTree2.templates.base.nodes.childInLaw.svgFront =
    FamilyTree2.templates.base.nodes.parentSibling.svgFront =
    FamilyTree2.templates.base.nodes.spouse.svgFront =
    FamilyTree2.templates.base.nodes.focus.svgFront =
      FamilyTree2.private.buttons),
  (FamilyTree2.templates.base.link = Object.assign({}, FlowChart.linkTemplates.rounded)),
  (FamilyTree2.templates.base.link.markerEnd = ''),
  (FamilyTree2.templates.base.editor = {}),
  (FamilyTree2.templates.base.editor.header = (t) =>
    '<h1 class="bft2-editor-title">Aaliyah Webb</h1>\n  <div class="bft2-editor-avatar"><img style="width: 100%;height:100%;border-radius: 50%;object-fit:cover;" src="https://cdn.balkan.app/shared/a/4.jpg"></div>'),
  (FamilyTree2.templates.base.editor.buttons = (t) =>
    `\n          <div data-boc-edit-from-btns="" class="bft2-editor-instruments">\n                        <div class="bft2-editor-button" title="Edit">${FamilyTree2.icon.share(24, 24, '#fff', 0, 0)}</div>\n                        <div class="bft2-editor-button" title="Edit">${FamilyTree2.icon.pdf(24, 24, '#fff', 0, 0)}</div>\n                        <div class="bft2-editor-button" title="Edit">${FamilyTree2.icon.camera(24, 24, '#fff', 0, 0)}</div>\n                        </div>`),
  (FamilyTree2.templates.base.editor.readOnlyContent = (t, e) => {
    var i = '';
    if (e.mother || e.father || e.stepParents.length) {
      var r = '';
      for (var a of (e.mother && (r += `<li>${e.mother.name} (Mother)</li>`),
      e.father && (r += `<li>${e.father.name} (Father)</li>`),
      e.stepParents))
        r += `<li>${a.name} (Father)</li>`;
      i += `Parents:\n      <ul>        \n        ${r}\n      </ul>\n    `;
    }
    if (e.siblings.length) {
      var o = '';
      for (var a of e.siblings) {
        var s = '';
        'male' == a.sexOrGender ? (s = 'Brother') : 'female' == a.sexOrGender && (s = 'Sister'),
          (o += `<li>${a.name} (${s})</li>`);
      }
      i = `Siblings:\n      <ul>        \n        ${o}\n      </ul>\n    `;
    }
    if (e.spouses.length || e.unmarriedPartners.length) {
      var l = '';
      for (var a of e.spouses) {
        s = '';
        'male' == a.sexOrGender ? (s = '(Husband)') : 'female' == a.sexOrGender && (s = '(Wife)'),
          (l += `<li>${a.name} ${s}</li>`);
      }
      for (var a of e.unmarriedPartners) {
        s = '';
        l += `<li>${a.name} ${s}</li>`;
      }
      i += `Spouses:\n      <ul>        \n        ${l}\n      </ul>\n    `;
    }
    if (e.children.length) {
      l = '';
      for (var a of e.spouses) {
        s = '';
        'male' == a.sexOrGender ? (s = '(Sun)') : 'female' == a.sexOrGender && (s = '(Daughter)'),
          (l += `<li>${a.name} ${s}</li>`);
      }
      i += `Children:\n      <ul>        \n        ${l}\n      </ul>\n    `;
    }
    return `<div>\n      ${i}\n  </div>`;
  }),
  (FamilyTree2.templates.base.editor.content = (t, e) =>
    '<div>           \n            <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Sex or gender</label>\n                <div style="margin-top: 10px;">\n                <label>\n                <input type="radio" name="editList" value="always"/>Male\n            </label>\n            <label>\n                <input type="radio" name="editList" value="never"/>Female\n            </label>\n                </div>          \n            </div>           \n\n\n             <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Full Name</label>\n                <input type="text" id="email" value="example@email.com" class="bft2-editor-field">\n            </div>           \n\n\n \n\n            <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Mother</label>\n                <select  type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n                  <option >Ivanka</option>\n                  <option>2</option>\n                  </select>                  \n            </div>  \n\n            <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Father</label>\n                <select  type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n                  <option >Ivan</option>\n                  <option>2</option>\n                  </select>                  \n            </div>         \n            \n            <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Step parents</label>\n                <select  type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n                  <option >Add new spouse</option>\n                  <option>2</option>\n                  </select>                  \n            </div>            \n\n          <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Siblings</label>\n                <div style="margin-top: 10px;">\n                  <div class="bft2-editor-field-item">Ivan</div>\n                  <div class="bft2-editor-field-item">Ivan DSAFGsdf</div>\n                </div>\n                <select  type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n                  <option >Add new sibling</option>\n                  <option>2</option>\n                  </select>                  \n            </div>     \n            \n          <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Children</label>\n                <div style="margin-top: 10px;">\n                  <div class="bft2-editor-field-item">Ivan</div>\n                  <div class="bft2-editor-field-item">Ivan DSAFGsdf</div>\n                </div>\n                <select  type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n                  <option >Add new sibling</option>\n                  <option>2</option>\n                  </select>                  \n            </div>            \n\n\n\n            <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Spouses</label>\n                <div style="margin-top: 10px;">\n                  <div class="bft2-editor-field-item">Ivan</div>\n                  <div class="bft2-editor-field-item">Ivan DSAFGsdf</div>\n                </div>\n                <select  type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n                  <option >Add new spouse</option>\n                  <option>2</option>\n                  </select>                  \n            </div>\n\n            <div class="bft2-editor-content-item">\n                <label for="email" class="bft2-editor-label">Unmarried partners</label>\n                <div style="margin-top: 10px;">\n                  <div class="bft2-editor-field-item">Ivan</div>\n                  <div class="bft2-editor-field-item">Ivan DSAFGsdf</div>\n                </div>\n                <select  type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n                  <option >Add new spouse</option>\n                  <option>2</option>\n                  </select>                  \n            </div>            \n            <div class="bft2-editor-content-item">\n                <label for="phone" class="bft2-editor-label">Date of birth</label>\n                <input type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n            </div>\n\n            <div class="bft2-editor-content-item">\n                <label for="phone" class="bft2-editor-label">Date of death</label>\n                <input type="text" id="phone" value="10-10-2020" class="bft2-editor-field">\n            </div>\n      </div>'),
  FamilyTree2.createTemplate('snickers');
var kitkat = FamilyTree2.createTemplate('kitkat');
(kitkat.width = 280),
  (kitkat.height = 80),
  (kitkat.nodes.child.width = 120),
  (kitkat.nodes.child.height = 220),
  (kitkat.nodes.parentInLaw.width = 250),
  (kitkat.nodes.parentInLaw.height = 60),
  (kitkat.nodes.childInLaw.width = 250),
  (kitkat.nodes.childInLaw.height = 60),
  (kitkat.nodes.pibling.width = 250),
  (kitkat.nodes.pibling.height = 60),
  (kitkat.nodes.stepParent.width = 250),
  (kitkat.nodes.stepParent.height = 60),
  (kitkat.nodes.parentSibling.width = 250),
  (kitkat.nodes.parentSibling.height = 60),
  (kitkat.separations.focusBottom = 120),
  (kitkat.nodes.focus.width = kitkat.nodes.focus.height = 280),
  (kitkat.nodes.focus.svg = (t) => {
    var e = '';
    const i = Math.random().toString(36).substr(2, 9);
    t.familyMember.photo
      ? (e = `<image preserveAspectRatio="xMidYMin slice" clip-path="url(#${i})" xlink:href="${encodeURI(t.familyMember.photo)}" x="12" y="12" width="${t.height - 24}" height="${t.height - 24}" ></image>`)
      : null != t.familyMember.sexOrGender &&
        FamilyTree2.icon[t.familyMember.sexOrGender] &&
        (e = FamilyTree2.icon[t.familyMember.sexOrGender](
          50,
          50,
          '#fff',
          t.width / 2 - 25,
          t.height / 4 - 25
        ));
    var r = FlowChart.private.gradientCircleForDefs(
      'circle',
      ['#F57C00', '#FFCA28', '#039BE5', '#039BE5', '#33b864', '#F57C00'],
      t.height / 2,
      10
    );
    return `${(r += `<circle cx="${t.height / 2}" cy="${t.height / 2}" r="30" style="fill:${t.fill};opacity: 0;" >\n      <animate attributeName="r" from="30" to="${t.height / 2 - 13.4}" dur="0.4s" begin="0.1s" fill="freeze"></animate> \n      <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.1s" fill="freeze"></animate> \n  </circle>`)}\n   <clipPath id="${i}"><circle cx="${t.height / 2}" cy="${t.height / 2}" r="${t.height / 2 - 12}"></circle></clipPath>\n   ${e}\n  `;
  }),
  (kitkat.html = (t) => {
    if (t.familyMember.loading) return '';
    var e = t.familyMember.dateOfBirth;
    null == e && (e = 'Birth date');
    var i = t.familyMember.dateOfDeath;
    null == i && (i = 'Death date');
    var r = t.familyMember.title;
    null == r && (r = ' ');
    var a = t.familyMember.name;
    a || (a = 'Name');
    var o = '';
    return (
      t.familyMember.photo
        ? (o = `<img draggable="false" border="0" width="100%" style="border-radius:5px;" src="${encodeURI(t.familyMember.photo)}" />`)
        : null != t.familyMember.sexOrGender &&
          FamilyTree2.icon[t.familyMember.sexOrGender] &&
          (o = FamilyTree2.icon[t.familyMember.sexOrGender](50, 50, '#fff', 0, 0)),
      'focus' == t.relationshipType
        ? `<div style="display: grid;grid-template-columns: 1fr minmax(0, 1fr); grid-template-rows: 1fr auto 1fr 25px;grid-gap: 3px;height:100%;width:100%;">\n    <div style="min-height: 130px; grid-column: 1/3;display: flex;align-items: center;justify-content: center;">\n      ${o}\n    </div>\n    <div data-field="name" data-title="Name" style="overflow: hidden; font-size: 16px;font-weight: bold;grid-column: 1/3;display: flex;align-items: center;justify-content: center;">${a}</div>\n    <div data-field="title" data-title="Title" style="overflow: hidden; font-size: 12px;grid-column: 1/3;display: flex;align-items: center;justify-content: center;">${r}</div>\n    <div data-field="dateOfBirth" data-title="Birth date" style="grid-column: 1/2; display: flex;align-items: center;justify-content: center;overflow: hidden; font-size: 12px;">${e}</div>\n    <div data-field="dateOfDeath" data-title="Death date" style="grid-column: 2/3; display: flex;align-items: center;justify-content: center;grid-column: 2/3;overflow: hidden; font-size: 12px;">${i}</div>\n</div>`
        : 'parentInLaw' == t.relationshipType ||
            'childInLaw' == t.relationshipType ||
            'pibling' == t.relationshipType ||
            'stepParent' == t.relationshipType ||
            'parentSibling' == t.relationshipType
          ? `<div style="display: grid;grid-template-columns: 56px 1fr; grid-gap: 3px;height:100%;width:100%;" title="${r}">\n      <div style="overflow: hidden;display: flex;align-items: center;justify-content: center;">${o}</div>\n      <div data-field="name" data-title="Name" style="overflow: hidden; font-size: 16px;font-weight: bold;display: flex;align-items: center;justify-content: center;">${a}</div>\n    </div>`
          : 'parent' == t.relationshipType ||
              'sibling' == t.relationshipType ||
              'spouse' == t.relationshipType
            ? `<div style="display: grid;grid-template-columns: 76px 1fr 1fr; grid-template-rows: 1fr 25px;grid-gap: 3px;height:100%;width:100%;" title="${r}">\n        <div style="grid-row: 1/3;grid-column: 1/2;display: flex;align-items: center;justify-content: center;overflow:hidden;">\n          ${o}\n        </div>\n        <div data-field="name" data-title="Name" style="overflow: hidden; font-size: 16px;font-weight: bold;grid-row: 1/2;grid-column: 2/4;display: flex;align-items: center;justify-content: center;">${a}</div>\n        <div data-field="dateOfBirth" data-title="Birth date" style="display: flex;align-items: center;justify-content: center;grid-row: 2/3;grid-column: 2/3;overflow: hidden; font-size: 12px;">${e}</div>\n        <div data-field="dateOfDeath" data-title="Death date" style="display: flex;align-items: center;justify-content: center;grid-row: 2/3;grid-column: 3/4;overflow: hidden; font-size: 12px;">${i}</div>\n    </div>`
            : 'child' == t.relationshipType
              ? `<div style="display: grid;grid-template-columns: 1fr; grid-template-rows: 115px  1fr 20px 20px;grid-gap: 3px;height:100%;width:100%;" title="${r}">\n                <div style="overflow: hidden;display: flex;align-items: center;justify-content: center;">${o}</div>\n                <div data-field="name" data-title="Name" style="overflow: hidden; font-size: 16px;font-weight: bold;display: flex;justify-content: center;height: 2.6em;line-height: 20px;">${a}</div>\n                <div data-field="dateOfBirth" data-title="Birth date" style="display: flex;justify-content: center;overflow: hidden; font-size: 12px;">${e}</div>\n                <div data-field="dateOfDeath" data-title="Death date" style="display: flex;justify-content: center;overflow: hidden; font-size: 12px;">${i}</div>\n              </div>`
              : void 0
    );
  }),
  (kitkat.nodes.focus.html = (t) => {
    var e = t.familyMember.title;
    null == e && (e = '');
    var i = t.familyMember.name;
    i || (i = 'name');
    var r = `top: ${t.height}px;`,
      a = t.height,
      o = '#F57C00';
    return (
      t.familyMember.photo || ((o = '#fff'), (r = ''), (a = t.height - t.height / 7)),
      `<div style="width: ${a}px;position: absolute; ${r} color: ${o};"><h1 style="margin: 0; font-size: 20px;" data-field="name">${i}</h1><div data-field="title" style="font-size: 16px;">${e}</div></div>`
    );
  });
var mars = FamilyTree2.createTemplate('mars');
(mars.strokeWidth = 8),
  (mars.fill = '#fff'),
  (mars.stroke = '#039BE5'),
  (mars.height = mars.width = 100),
  (mars.nodes.sibling.width =
    mars.nodes.parent.width =
    mars.nodes.child.width =
    mars.nodes.spouse.width =
    mars.nodes.sibling.height =
    mars.nodes.parent.height =
    mars.nodes.child.height =
    mars.nodes.spouse.height =
      180),
  (mars.nodes.focus.width = mars.nodes.focus.height = 300),
  (mars.nodes.childInLaw.width = 200),
  (mars.nodes.stepParent.width = 200),
  (mars.nodes.pibling.width = 200),
  (mars.separations.parentInLawNeighbor = 20),
  (mars.separations.childInLowNeighbor = 10),
  (mars.separations.parentLevel = 100),
  (mars.separations.parentNeighbor = 50),
  (mars.separations.childNeighbor = 30),
  (mars.separations.parentInLawLevel = 100),
  (mars.separations.parentSiblingLevel = 100),
  (mars.separations.parentSide = 50),
  (mars.separations.childLevel = 130),
  (mars.separations.spouseNeighbor = 58),
  (mars.separations.siblingNeighbor = 58),
  (mars.separations.focusBottom = 140),
  (mars.separations.focusSide = 100),
  (mars.link.path = (t) => FlowChart.private.roundPathCorners(t.points, 20, !1)),
  (mars.html = (t) => {
    var e = t.width,
      i = t.stroke;
    return (
      t.isStepParent ? (i = '#FFCA28') : t.isUnmarriedPartner && (i = '#F57C00'),
      'childInLaw' == t.relationshipType
        ? `<div data-field="name" style="background-color: #fff;  width: ${(e = t.height)}px; text-align: start; position: absolute; left: ${e + 7}px; color: ${i};">${t.familyMember.name}</div>`
        : 'stepParent' == t.relationshipType
          ? `<div data-field="name" style="background-color: #fff;width: ${(e = t.height)}px;text-align: start; position: absolute; left: ${e + 7}px; color: ${i};">${t.familyMember.name}</div>`
          : 'parentSibling' == t.relationshipType
            ? `<div data-field="name" style="background-color: #fff;width: ${e}px;text-align: end; position: absolute; right: ${e + 27}px; color: ${i};">${t.familyMember.name}</div>`
            : 'pibling' == t.relationshipType
              ? `<div data-field="name" style="background-color: #fff;width: ${t.height}px;text-align: end; position: absolute; right: ${t.height + 7}px; color: ${i};">${t.familyMember.name}</div>`
              : 'focus' == t.relationshipType
                ? `<div style="background-color: #fff;width: ${e}px;position: absolute; top: ${t.height}px; color: ${i};"><h1 style="margin: 0;" data-field="name">${t.familyMember.name}</h1><div data-field="title">${t.familyMember.title}</div></div>`
                : 'parentInLaw' == t.relationshipType
                  ? `<div data-field="name" style="background-color: #fff;width: ${e}px;text-align: start; position: absolute; left: ${e + 27}px; color: ${i};">${t.familyMember.name}</div>`
                  : 'parent' == t.relationshipType
                    ? `<div data-field="name" style="background-color: #fff;width: ${e}px;position: absolute; bottom: ${t.height + 27}px; color: ${i};">${t.familyMember.name}</div>`
                    : (t.relationshipType,
                      `<div data-field="name" style="background-color: #fff;width: ${e}px;position: absolute; top: ${t.height}px; color: ${i};">${t.familyMember.name}</div>`)
    );
  }),
  (mars.svg = (t) => {
    var e,
      i = t.height,
      r = '',
      a = t.stroke;
    t.isStepParent ? (a = '#FFCA28') : t.isUnmarriedPartner && (a = '#F57C00');
    const o = Math.random().toString(36).substr(2, 9);
    if (t.familyMember.photo)
      e = `<image preserveAspectRatio="xMidYMin slice" clip-path="url(#${o})" xlink:href="${encodeURI(t.familyMember.photo)}" x="10" y="10" width="${i - 20}" height="${i - 20}" ></image>`;
    else if (null != t.familyMember.sexOrGender && FamilyTree2.icon[t.familyMember.sexOrGender]) {
      var s = (h = (i - i / 1.5) / 2);
      e = FamilyTree2.icon[t.familyMember.sexOrGender](i / 1.5, i / 1.5, a, s, h);
    }
    if ('pibling' == t.relationshipType) {
      var l = `<circle  cx="${t.width - t.height / 2}" cy="${t.height / 2}" r="${t.height / 2}" width style="stroke:${t.stroke}; fill:${t.fill}; stroke-width:${t.strokeWidth};" ></circle>`;
      if (t.familyMember.photo)
        e = `<image preserveAspectRatio="xMidYMin slice" clip-path="url(#${o})" xlink:href="${encodeURI(t.familyMember.photo)}" x="${t.height + 10}" y="10" width="${t.height - 20}" height="${t.height - 20}" ></image>`;
      else if (null != t.familyMember.sexOrGender && FamilyTree2.icon[t.familyMember.sexOrGender]) {
        var h = (i - i / 1.5) / 2;
        s = i + (i - i / 1.5) / 2;
        e = FamilyTree2.icon[t.familyMember.sexOrGender](i / 1.5, i / 1.5, a, s, h);
      }
      return `${l}\n        <clipPath id="${o}"><circle cx="${t.width - t.height / 2}" cy="${t.height / 2}" r="${t.height / 2 - 10}"></circle></clipPath>\n        ${e}\n        `;
    }
    'focus' == t.relationshipType && (r = 'filter="url(#bft2-mars-shadow)"'),
      ('childInLaw' != t.relationshipType && 'stepParent' != t.relationshipType) || (i = t.height);
    l = `<circle ${r} cx="${i / 2}" cy="${i / 2}" r="${i / 2}" style="stroke:${a}; fill:${t.fill}; stroke-width:${t.strokeWidth};" ></circle>`;
    return (
      'focus' == t.relationshipType &&
        (l = FlowChart.private.gradientCircleForDefs(
          'circle',
          ['#F57C00', '#FFCA28', '#039BE5', '#039BE5', '#33b864', '#F57C00'],
          mars.nodes.focus.width / 2,
          10
        )),
      `${l}\n        <clipPath id="${o}"><circle cx="${i / 2}" cy="${i / 2}" r="${i / 2 - 10}"></circle></clipPath>\n        ${e}\n        `
    );
  }),
  (FamilyTree2.private.prototype.onSelectedChangedHandler = function (t) {
    for (var e, i, r = t.event.target; r && r.hasAttribute; ) {
      if (r.hasAttribute('data-shape-id')) {
        e = r.getAttribute('data-shape-id');
        break;
      }
      r.hasAttribute('data-button') && (i = r.getAttribute('data-button')), (r = r.parentNode);
    }
    if (null != i) {
      if (
        'expcoll-children' == i ||
        'expcoll-spouses' == i ||
        'expcoll-siblings' == i ||
        'expcoll-parents' == i
      )
        return this.onExpCollHandler(i, e), !1;
      if ('edit' == i) return this.showEditor(e), !1;
      if ('focus' == i) {
        this.removeActionNodes();
        t = { newFocusId: e, oldFocusId: this.focusId };
        return (
          !1 !== (o = FamilyTree2.events.publish('on-focus-button-click', [this.familyTree, t])) &&
            this.loadInternal(t.newFocusId, null, [], !0, null),
          !1
        );
      }
      if ('camera' == i) {
        return (
          FamilyTree2.private.photoDialog((t) => {
            this.chart.nodes.get(e).photo = t;
          }),
          !1
        );
      }
    } else if (null != e) {
      var o,
        s = this.chart.nodes.get(e);
      if (
        !1 ===
        (o = FamilyTree2.events.publish('node-click', [
          this.familyTree,
          { event: t.event, node: s },
        ]))
      )
        return o;
      if (s.familyMember && s.familyMember.isActionNode)
        return (
          this.removeActionNodes(),
          FamilyTree2.prototype[s.familyMember.functionName].apply(
            this.familyTree,
            s.familyMember.functionArgs
          ),
          this.draw(),
          FamilyTree2.events.publish('updated', [this.familyTree, this.updatedArgs]),
          this.clearUpdatedArgs(),
          !1
        );
      0 == this.familyTree.readOnly && this.edit(s.id);
    }
  }),
  (FamilyTree2.private.removeFromList = (t, e, i) => {
    if (e[t]) {
      var r = FlowChart.private.safeIndexOf(e[t], i);
      if (-1 != r) return e[t].splice(r, 1), !0;
    }
    return !1;
  }),
  (FamilyTree2.private.prototype.onExpCollHandler = function (t, e) {
    var r = this.chart.nodes.get(e),
      a = [],
      o = 'collapsedParents',
      s = 'parents';
    switch (t) {
      case 'expcoll-parents':
        (o = 'collapsedParents'), (s = 'parents');
        break;
      case 'expcoll-children':
        (o = 'collapsedChildren'), (s = 'children');
        break;
      case 'expcoll-siblings':
        (o = 'collapsedSiblings'), (s = 'siblings');
        break;
      case 'expcoll-spouses':
        (o = 'collapsedSpouses'), (s = 'spouses');
    }
    var l = [];
    if (r[o].length)
      for (var h of ((l = r[o]), r[o])) {
        if (!this.expandedIds.includes(h)) {
          var n = !1;
          for (var d of this.family)
            if (d.id == h) {
              n = !0;
              break;
            }
          n || a.push(h), this.expandedIds.push(h);
        }
        -1 != (c = FlowChart.private.safeIndexOf(this.collapsedIds, h)) &&
          this.collapsedIds.splice(c, 1);
      }
    else
      for (var p of r[s]) {
        var c;
        this.collapsedIds.includes(p) ||
          FamilyTree2.private.systemIds.includes(p) ||
          this.collapsedIds.push(p),
          -1 != (c = FlowChart.private.safeIndexOf(this.expandedIds, p)) &&
            this.expandedIds.splice(c, 1);
      }
    if (a.length) {
      var f = { ids: a };
      FamilyTree2.events.publish('demand', [this.familyTree, f]);
    } else
      this.draw(null, null, () => {
        this.makeNodesVisible(l);
      });
  }),
  (FamilyTree2.private.prototype.makeNodesVisible = function (t, e) {
    var i = [];
    if (t.length) {
      for (var r of t) {
        var a = this.chart.nodes.get(r);
        a && i.push(a);
      }
      i.length &&
        this.chart.makeShapesVisible(i, function () {
          e && e.call(this.familyTree);
        });
    }
  }),
  (FamilyTree2.private.prototype.removeActionNodes = function () {
    (this.editId = null),
      this.remove('system_add_child')
        .remove('system_add_spouse')
        .remove('system_add_sibling')
        .remove('system_add_mother')
        .remove('system_add_father');
  }),
  (FamilyTree2.private.prototype.edit = function (t, e) {
    if (1 != this.familyTree.readOnly) {
      this.removeActionNodes();
      var i = this.chart.nodes.get(t);
      i &&
        ((this.editId = t),
        ('focus' != i.relationshipType && 'parent' != i.relationshipType) ||
          this.familyTree.addSibling(i.id, {
            isActionNode: !0,
            id: 'system_add_sibling',
            functionName: 'addSibling',
            functionArgs: [i.id],
          }),
        ('child' != i.relationshipType &&
          'focus' != i.relationshipType &&
          'childInLaw' != i.relationshipType &&
          'spouse' != i.relationshipType) ||
          this.familyTree.addChild(i.id, i.spouse, {
            isActionNode: !0,
            id: 'system_add_child',
            functionName: 'addChild',
            functionArgs: [i.id, i.spouse],
          }),
        ('focus' != i.relationshipType &&
          'parent' != i.relationshipType &&
          'child' != i.relationshipType) ||
          this.familyTree.addSpouse(i.id, {
            isActionNode: !0,
            id: 'system_add_spouse',
            functionName: 'addSpouse',
            functionArgs: [i.id],
          }),
        ('spouse' != i.relationshipType &&
          'sibling' != i.relationshipType &&
          'parentSibling' != i.relationshipType &&
          'parentInLaw' != i.relationshipType &&
          'focus' != i.relationshipType &&
          'parent' != i.relationshipType) ||
          (null == i.motherId &&
            this.familyTree.addMother(i.id, {
              isActionNode: !0,
              id: 'system_add_mother',
              functionName: 'addMother',
              functionArgs: [i.id],
            }),
          null == i.fatherId &&
            this.familyTree.addFather(i.id, {
              isActionNode: !0,
              id: 'system_add_father',
              functionName: 'addFather',
              functionArgs: [i.id],
            })),
        this.familyTree.draw(null, i.id, function () {
          var t = [];
          for (var i of FamilyTree2.private.systemIds) {
            var r = this._.chart.nodes.get(i);
            r && t.push(r);
          }
          this._.chart.makeShapesVisible(t, e);
        }));
    }
  }),
  (FamilyTree2.private.photoDialog = (t) => {
    var e = document.createElement('input');
    (e.type = 'file'),
      (e.id = 'fileElement'),
      (e.accept = 'image/*'),
      (e.style.display = 'none'),
      document.body.appendChild(e),
      e.addEventListener(
        'change',
        function () {
          var e = this.files,
            i = window.URL.createObjectURL(e[0]);
          FlowChart.private.createImageElementForUpload(i, t);
        },
        !1
      ),
      e && e.click();
  }),
  (FamilyTree2.private.prototype.showEditor = function (t) {
    var e = document.createElement('from');
    e.classList.add('bft2-editor'),
      this.familyTree.readOnly && e.classList.add('bft2-editor-readonly');
    var i = null;
    for (var r of this.familyTree.family)
      if (r.id == t) {
        i = r;
        break;
      }
    var a = this.chart.nodes.get(t),
      o = i.motherId,
      s = i.fatherId,
      l = i.stepParentIds ? JSON.parse(JSON.stringify(i.stepParentIds)) : [],
      h = i.siblingIds ? JSON.parse(JSON.stringify(i.siblingIds)) : [],
      n = i.spouseIds ? JSON.parse(JSON.stringify(i.spouseIds)) : [],
      d = i.unmarriedPartnerIds ? JSON.parse(JSON.stringify(i.unmarriedPartnerIds)) : [],
      p = i.childIds ? JSON.parse(JSON.stringify(i.childIds)) : [],
      c = {
        mother: null,
        father: null,
        stepParents: [],
        siblings: [],
        spouses: [],
        unmarriedPartners: [],
        children: [],
      };
    for (var r of (null == o && (o = null),
    null == s && (s = null),
    null == l && (l = []),
    null == h && (h = []),
    null == n && (n = []),
    null == d && (d = []),
    null == p && (p = []),
    this.familyTree.family))
      r.motherId != t || p.includes(r.id) || p.push(r.id),
        r.fatherId != t || p.includes(r.id) || p.push(r.id),
        r.siblingIds && r.siblingIds.includes(t) && !h.includes(r.id) && h.push(r.id),
        r.spouseIds && r.spouseIds.includes(t) && !n.includes(r.id) && n.push(r.id),
        r.unmarriedPartnerIds &&
          r.unmarriedPartnerIds.includes(t) &&
          !d.includes(r.id) &&
          d.push(r.id),
        'female' == r.sexOrGender && r.childIds && r.childIds.includes(t) && (o = r.id),
        'male' == r.sexOrGender && r.childIds && r.childIds.includes(t) && (s = r.id);
    for (var r of this.familyTree.family) {
      o == r.id && (c.mother = r), s == r.id && (c.father = r);
      for (var f = 0; f < l.length; f++) l[f] == r.id && c.stepParents.push(r);
      for (f = 0; f < h.length; f++) h[f] == r.id && c.siblings.push(r);
      for (f = 0; f < n.length; f++) n[f] == r.id && c.spouses.push(r);
      for (f = 0; f < d.length; f++) d[f] == r.id && c.unmarriedPartners.push(r);
      for (f = 0; f < p.length; f++) p[f] == r.id && c.children.push(r);
    }
    (e.innerHTML = `\n    <div class="bft2-editor-header">${this.familyTree.template.editor.header(r)}</div>\n    <div class="bft2-editor-buttons">${this.familyTree.template.editor.buttons(r)}</div>\n    <div class="bft2-editor-content">${this.familyTree.readOnly ? this.familyTree.template.editor.readOnlyContent(a, c) : this.familyTree.template.editor.content(a, c)}</div>\n  `),
      this.element.appendChild(e);
  }),
  (FamilyTree2.private.prototype.hideEditor = (t) => {}),
  (FamilyTree2.private.prototype.onLinkPoints = function (t) {
    if (
      this.graph &&
      this.graph.verticesWithPosition &&
      this.graph.verticesWithPosition[t.fromShape.id] &&
      this.graph.verticesWithPosition[t.toShape.id]
    ) {
      var e = t.fromShape,
        i = t.toShape,
        r = [];
      if (
        ((r = [
          { x: e.x, y: e.top },
          { x: e.x, y: i.bottom + 25 },
          { x: i.x, y: i.bottom + 25 },
          { x: i.x, y: i.bottom },
        ]),
        'parent' == i.relationshipType)
      ) {
        var a = this.graph.parentsLevels[i.level],
          o = this.getTemplate().separations;
        r = [
          { x: e.x, y: e.top },
          { x: e.x, y: a.bottom + o.parentLevel / 2 },
          { x: i.x, y: a.bottom + o.parentLevel / 2 },
          { x: i.x, y: i.bottom },
        ];
      } else if ('child' == i.relationshipType) {
        var s = this.chart.nodes.get(i.secondaryParentId),
          l = this.chart.nodes.get(i.primaryParentId);
        a = this.graph.childrenLevels[i.level];
        if (s) {
          var h = this.chart.nodes.get(s.children[0]),
            n = s.left - 15,
            d = a.top - 25;
          h && n > h.x ? (d += 8) : l && (d -= 8),
            (r = [
              { x: (n -= 15 * s.spouseWithChildrenIndex), y: s.y },
              { x: n, y: d },
              { x: i.x, y: d },
              { x: i.x, y: i.top },
            ]);
        } else
          r = [
            { x: e.x, y: e.bottom },
            { x: e.x, y: a.top - 25 },
            { x: i.x, y: a.top - 25 },
            { x: i.x, y: i.top },
          ];
      } else if ('sibling' == i.relationshipType || 'pibling' == i.relationshipType) {
        (p = (e.left - i.right) / 2) > 25 && (p = 25),
          (r = [
            { x: e.left, y: e.y },
            { x: e.left - p, y: e.y },
            { x: e.left - p, y: i.y },
            { x: i.right, y: i.y },
          ]);
      } else if (
        'spouse' == i.relationshipType ||
        'childInLaw' == i.relationshipType ||
        'stepParent' == i.relationshipType
      ) {
        var p;
        (p = (i.left - e.right) / 2) > 25 && (p = 25),
          (r =
            (e.relationshipType,
            [
              { x: e.right, y: e.y },
              { x: e.right + p, y: e.y },
              { x: e.right + p, y: i.y },
              { x: i.left, y: i.y },
            ]));
      } else
        'parentInLaw' == i.relationshipType
          ? (r = [
              { x: e.right, y: e.y },
              { x: e.right + 25, y: e.y },
              { x: e.right + 25, y: i.y },
              { x: i.left, y: i.y },
            ])
          : 'parentSibling' == i.relationshipType &&
            (r = [
              { x: e.left, y: e.y },
              { x: e.left - 25, y: e.y },
              { x: e.left - 25, y: i.y },
              { x: i.right, y: i.y },
            ]);
      t.points = r;
    }
  }),
  (FamilyTree2.icon = FlowChart.icon),
  (FamilyTree2.icon.parent = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}" fill="${i}" height="${t}" width="${e}"  \n\t viewBox="0 0 449.358 449.358">\n\t \n\t<path d="M301.94,102.856c22.987,0,41.613-18.628,41.613-41.613c0-22.986-18.626-41.613-41.613-41.613\n\t\tc-22.988,0-41.614,18.627-41.614,41.613C260.327,84.228,278.952,102.856,301.94,102.856z"/>\n\t<path d="M111.319,102.856c22.986,0,41.612-18.628,41.612-41.613c0-22.986-18.626-41.613-41.612-41.613\n\t\tc-22.988,0-41.614,18.627-41.614,41.613C69.705,84.228,88.331,102.856,111.319,102.856z"/>\n\t<path d="M430.84,237.059c1.314-5.792-0.644-12.088-5.595-16.046l-37.676-30.12l-34.865-84.748\n\t\tc-2.13-5.178-6.667-8.623-11.782-9.606c-9.633,10.629-23.541,17.317-38.982,17.317c-15.441,0-29.349-6.688-38.983-17.317\n\t\tc-5.117,0.982-9.656,4.427-11.787,9.606l-44.544,108.277l-44.544-108.277c-2.13-5.178-6.666-8.624-11.782-9.606\n\t\tc-9.633,10.63-23.541,17.317-38.982,17.317c-15.441,0-29.349-6.688-38.983-17.317c-5.118,0.982-9.657,4.427-11.788,9.606\n\t\tL1.207,250.389c-3.362,8.172,0.538,17.523,8.71,20.884c1.992,0.819,4.053,1.207,6.082,1.207c6.292,0,12.26-3.737,14.803-9.917\n\t\tl30.068-73.09v20.243l-29.849,93.252c-5.02,15.683,6.68,31.713,23.146,31.713h6.702v73.99c0,11.883,9.846,21.467,21.824,21.041\n\t\tc11.409-0.406,20.286-10.129,20.286-21.546v-73.485h16.671v73.99c0,11.883,9.844,21.466,21.822,21.041\n\t\tc11.41-0.405,20.288-10.13,20.288-21.547v-73.484h6.702c16.467,0,28.167-16.03,23.146-31.713l-29.849-93.252v-20.244l24.062,58.492\n\t\tc3.47,8.436,11.69,13.943,20.812,13.943h0c9.124,0,17.345-5.509,20.814-13.948l24.042-58.486v219.199\n\t\tc0,11.883,9.845,21.467,21.824,21.041c11.409-0.406,20.287-10.129,20.287-21.546V294.542c0-4.44,3.35-8.316,7.781-8.603\n\t\tc4.855-0.314,8.889,3.53,8.889,8.317v114.418c0,11.883,9.845,21.467,21.823,21.041c11.41-0.406,20.287-10.13,20.287-21.547V189.474\n\t\tl7.166,17.419c1.033,2.51,2.687,4.716,4.807,6.411l38.057,30.425c-4.899,4.959-7.93,11.767-7.93,19.271v158.417\n\t\tc0,4.073,3.138,7.624,7.209,7.746c4.212,0.126,7.667-3.251,7.667-7.435v-158.36c0-6.537,4.842-12.26,11.35-12.873\n\t\tc7.469-0.704,13.773,5.178,13.773,12.504v18.697c0,4.073,3.138,7.624,7.209,7.746c4.212,0.126,7.667-3.251,7.667-7.434V263\n\t\tC449.358,250.993,441.602,240.77,430.84,237.059z"/>\n</svg>`),
  (FamilyTree2.icon.unmarriedPartner = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}" fill="${i}" height="${t}" width="${e}" viewBox="0 0 100 100">\t\n\t\t\t<circle cx="20" cy="50" r="15" stroke="${i}" stroke-width="10" fill="none"></circle>\n\t\t\t<circle cx="80" cy="50" r="15" stroke="${i}" stroke-width="10" fill="none"></circle>\n\t\t\t<line x1="35" y1="50" x2="65" y2="50" stroke="${i}" stroke-width="10"></line>\n\t\t </svg>`),
  (FamilyTree2.icon.child = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}" fill="${i}" height="${t}" width="${e}"  \n       viewBox="-64 0 512 512" ><path d="M120 72c0-39.765 32.235-72 72-72s72 32.235 72 72c0 39.764-32.235 72-72 72s-72-32.236-72-72zm254.627 1.373c-12.496-12.497-32.758-12.497-45.254 0L242.745 160H141.254L54.627 73.373c-12.496-12.497-32.758-12.497-45.254 0-12.497 12.497-12.497 32.758 0 45.255L104 213.254V480c0 17.673 14.327 32 32 32h16c17.673 0 32-14.327 32-32V368h16v112c0 17.673 14.327 32 32 32h16c17.673 0 32-14.327 32-32V213.254l94.627-94.627c12.497-12.497 12.497-32.757 0-45.254z"/></svg>`),
  (FamilyTree2.icon.sibling = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}" fill="${i}" height="${t}" width="${e}"  viewBox="0 0 457.254 457.254">\n\t<circle cx="333.6" cy="69.265" r="47.409"/>\n\t<path d="M454.413,260.338l-72.963-125.237c-3.495-5.999-10.592-10.239-15.94-10.239c-1.283,0-60.824,0-62.106,0\n\t\tc-5.348,0-12.445,4.24-15.94,10.239l-54.973,94.358l-61.025-104.746c-3.884-6.668-10.897-10.364-18.098-10.351\n\t\tc-0.132-0.008-0.263-0.02-0.397-0.02H94.3c-0.134,0-0.265,0.012-0.397,0.02c-7.201-0.014-14.213,3.682-18.098,10.351L2.841,249.949\n\t\tc-5.804,9.961-2.433,22.741,7.528,28.545c3.306,1.926,6.921,2.841,10.489,2.841c7.185,0,14.178-3.714,18.056-10.369l32.182-55.239\n\t\tv23.65L56.693,343.162c-1.213,8.742,5.578,16.541,14.404,16.541h0v63.527c0,11.944,9.288,22.117,21.224,22.542\n\t\tc12.532,0.446,22.833-9.581,22.833-22.014v-64.056h17.404v63.527c0,11.945,9.288,22.118,21.226,22.542\n\t\tc12.532,0.445,22.83-9.581,22.83-22.014v-64.056h0c8.826,0,15.617-7.799,14.404-16.541l-14.404-103.787v-22.89l31.74,54.481\n\t\tc1.08,1.852,8.574,14.946,13.673,17.917c3.306,1.925,6.921,2.841,10.489,2.841c7.185,0,14.178-3.713,18.056-10.369l31.275-53.683\n\t\tl-0.301,184.769c0,12.166,9.861,22.028,22.027,22.028c0.051,0,0.1-0.007,0.151-0.008c0.051,0,0.1,0.008,0.152,0.008\n\t\tc12.166,0,22.029-9.862,22.029-22.028l-0.302-111.487c0-4.635,3.497-8.682,8.123-8.981c5.068-0.328,9.281,3.685,9.281,8.683\n\t\tl0,111.256c0,11.944,9.288,22.117,21.224,22.543c12.532,0.446,22.833-9.581,22.833-22.014V227.671l31.275,53.683\n\t\tc3.878,6.656,10.871,10.369,18.056,10.369c3.568,0,7.184-0.916,10.489-2.841C456.846,283.078,460.216,270.298,454.413,260.338z"/>\n\t<path d="M49.541,105.344l11.735-1.046c6.748-0.601,11.504-6.909,10.183-13.555c-2.014-10.156-2.71-24.251,5.722-32.967\n\t\tc-0.009,0.367-0.028,0.731-0.028,1.099c0,26.182,21.226,47.408,47.408,47.408c26.181,0,47.407-21.226,47.407-47.408\n\t\tc0-0.368-0.019-0.732-0.029-1.099c8.433,8.717,7.736,22.811,5.721,32.967c-1.318,6.646,3.436,12.954,10.184,13.555l11.734,1.046\n\t\tc6.203,0.553,11.701-3.961,12.365-10.153c1.615-15.035,1.334-37.592-7.169-46.549c-12.551-13.221-28.074-13.355-38.102-11.532\n\t\tc-7.886-15.229-23.777-25.644-42.11-25.644c-18.333,0-34.225,10.414-42.112,25.644c-10.027-1.822-25.553-1.689-38.102,11.532\n\t\tc-8.501,8.957-8.782,31.515-7.171,46.549C37.842,101.383,43.339,105.897,49.541,105.344z"/>\n</svg>`),
  (FamilyTree2.icon.spouse = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}" fill="${i}" height="${t}" width="${e}"\n        viewBox="0 0 465.227 465.227">\n       <path d="M184.324,102.514l-73.268,0.42c-6.975-0.153-13.649,3.913-16.462,10.751L30.126,270.394\n         c-3.652,8.878,0.584,19.036,9.462,22.689c2.164,0.891,4.403,1.312,6.606,1.312c6.836,0,13.32-4.06,16.082-10.774l32.667-79.406\n         v238.139c0,12.91,10.695,23.322,23.709,22.859c12.395-0.441,22.039-11.004,22.039-23.407V318.36c0-4.823,3.641-9.035,8.454-9.346\n         c5.274-0.341,9.657,3.836,9.657,9.036v124.304c0,12.91,10.695,23.322,23.708,22.859c12.395-0.44,22.041-11.005,22.041-23.408\n         V122.741C204.552,111.57,195.496,102.514,184.324,102.514z"/>\n       <path d="M283.375,45.208C283.375,20.236,263.141,0,238.168,0c-22.384,0-40.949,16.26-44.562,37.613\n         c-4.91-19.656-22.676-34.214-43.856-34.214c-24.974,0-45.209,20.236-45.209,45.208c0,24.971,20.235,45.209,45.209,45.209\n         c22.384,0,40.949-16.262,44.561-37.613c4.91,19.656,22.675,34.215,43.857,34.215C263.141,90.418,283.375,70.18,283.375,45.208z"/>\n       <path d="M435.601,350.543c-3.238-11.554-15.233-18.296-26.787-15.054l-52.495,14.72l-1.793-10.052l18.349-5.475\n         c17.143-5.115,24.342-25.439,14.244-40.205l-60.043-87.807l-6.289-21.077l54.009,66.751c3.435,4.246,8.457,6.449,13.523,6.449\n         c3.84,0,7.705-1.266,10.923-3.87c7.463-6.039,8.618-16.984,2.579-24.447L295.236,98.746c-4.65-5.749-12.21-7.737-18.851-5.594\n         c-1.351,0.117-41.855,12.051-41.855,12.051c-9.238,2.756-15.557,11.271-15.516,20.913l0.926,218.249\n         c-0.355,17.885,16.805,30.939,33.947,25.823l5.43-1.62v73.669c0,12,9.728,21.728,21.728,21.728s21.729-9.728,21.729-21.728v-86.636\n         l9.839-2.936l5.127,28.746c1.076,6.033,4.649,11.332,9.841,14.589c3.494,2.193,7.503,3.324,11.551,3.324\n         c1.964,0,3.938-0.266,5.865-0.807l75.548-21.185C432.101,374.091,438.841,362.098,435.601,350.543z"/>\n     </svg>`),
  (FamilyTree2.icon.male = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}"  height="${t}" width="${e}" viewBox="0 0 18 24">\n<circle cx="8" cy="3.5" r="1.75" fill="${i}" stroke="${i}" stroke-width="1.5"/>\n<path d="M5 15.4118V8H6.21865H8.04871H9.99969H11V15.4118H9.99969H9L9.00015 22H7V15.4118H6.21865H5Z" fill="${i}"/>\n<path d="M7 15.4118H6.21865H5V8L6.21865 8H8.04871L9.99969 8L11 8V15.4118H9.99969H9M7 15.4118V22H9.00015L9 15.4118M7 15.4118H9" stroke="${i}" fill="${i}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n</svg>`),
  (FamilyTree2.icon.female = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}"  height="${t}" width="${e}" viewBox="0 0 24 24">\n<path d="M10.5 21V15.5H8L10.2186 7H12.7807L15 15.5H12.5V21H10.5Z" fill="${i}"/>\n<path d="M10.5 15.5H12.5M10.5 15.5V21H12.5V15.5M10.5 15.5H8L10.2186 7H12.7807L15 15.5H12.5"  fill="${i}" stroke="${i}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n<circle cx="11.5" cy="2.5" r="1.75" fill="${i}" stroke="${i}" stroke-width="1.5"/>\n</svg>`),
  (FamilyTree2.icon.camera = (t, e, i, r, a) =>
    `<svg x="${r}" y="${a}"  height="${t}" width="${e}"  viewBox="0 0 24 24" >\n<path fill="${i}" fill-rule="evenodd" clip-rule="evenodd" d="M8 4C8 3.44772 8.41328 3 8.92308 3H15.0769C15.5867 3 16 3.44772 16 4C16 4.55228 15.5867 5 15.0769 5H8.92308C8.41328 5 8 4.55228 8 4Z"/>\n<path fill="${i}" fill-rule="evenodd" clip-rule="evenodd" d="M9.77778 21H14.2222C17.3433 21 18.9038 21 20.0248 20.2777C20.51 19.965 20.9267 19.5632 21.251 19.0953C22 18.0143 22 16.5095 22 13.4999C22 10.4903 21.9998 8.9857 21.2508 7.90473C20.9266 7.43676 20.5099 7.03497 20.0246 6.72228C18.9036 6 17.3431 6 14.2221 6H9.77761C6.65659 6 5.09607 6 3.97508 6.72228C3.48979 7.03497 3.07312 7.43676 2.74886 7.90473C2 8.98547 2 10.4896 2 13.4979L2 13.4999C2 16.5095 2 18.0143 2.74902 19.0953C3.07328 19.5632 3.48995 19.965 3.97524 20.2777C5.09624 21 6.65675 21 9.77778 21ZM7.83333 13.4999C7.83333 11.2808 9.69881 9.48196 12 9.48196C14.3012 9.48196 16.1667 11.2808 16.1667 13.4999C16.1667 15.7189 14.3012 17.5178 12 17.5178C9.69881 17.5178 7.83333 15.7189 7.83333 13.4999ZM9.5 13.4999C9.5 12.1685 10.6193 11.0891 12 11.0891C13.3807 11.0891 14.5 12.1685 14.5 13.4999C14.5 14.8313 13.3807 15.9106 12 15.9106C10.6193 15.9106 9.5 14.8313 9.5 13.4999ZM18.1111 9.48196C17.6509 9.48196 17.2778 9.84174 17.2778 10.2855C17.2778 10.7294 17.6509 11.0891 18.1111 11.0891H18.6667C19.1269 11.0891 19.5 10.7294 19.5 10.2855C19.5 9.84174 19.1269 9.48196 18.6667 9.48196H18.1111Z" />\n</svg>`),
  (FamilyTree2.private.state = {}),
  (FamilyTree2.private.state.buildStateNames = (t) => ({
    paramViewBox: t + '-viewBox',
    paramCollapsedIds: t + '-collapsedIds',
    paramFocusId: t + '-focusId',
    paramEditId: t + '-editId',
    paramOffsetX: t + '-offsetX',
    paramOffsetY: t + '-offsetY',
  })),
  (FamilyTree2.private.state.put = (t, e, i, r, a, o, s) => {
    if (t) {
      var l = FamilyTree2.private.state.get(t);
      l || null != o ? l && null == o && (o = l.offsetX) : (o = 0),
        l || null != s ? l && null == s && (s = l.offsetY) : (s = 0);
      var h = FamilyTree2.private.state.buildStateNames(t.name),
        n = { viewBox: e, collapsedIds: i, focusId: r, editId: a, offsetX: o, offsetY: s };
      if (t.writeToUrlParams) {
        var d = new URLSearchParams(window.location.search);
        d.has(h.paramViewBox)
          ? d.set(h.paramViewBox, n.viewBox.join('*'))
          : d.append(h.paramViewBox, n.viewBox.join('*')),
          d.has(h.paramCollapsedIds)
            ? d.set(h.paramCollapsedIds, n.collapsedIds.join('*'))
            : d.append(h.paramCollapsedIds, n.collapsedIds.join('*')),
          d.has(h.paramFocusId)
            ? d.set(h.paramFocusId, n.focusId)
            : d.append(h.paramFocusId, n.focusId),
          d.has(h.paramEditId) ? d.set(h.paramEditId, n.editId) : d.append(h.paramEditId, n.editId),
          d.has(h.paramOffsetX)
            ? d.set(h.paramOffsetX, n.offsetX)
            : d.append(h.paramOffsetX, n.offsetX),
          d.has(h.paramOffsetY)
            ? d.set(h.paramOffsetY, n.offsetY)
            : d.append(h.paramOffsetY, n.offsetY),
          window.history.replaceState(null, null, '?' + d);
      }
      t.writeToLocalStorage && localStorage.setItem(t.name, JSON.stringify(n)),
        t.writeToSessionStorage && sessionStorage.setItem(t.name, JSON.stringify(n));
    }
  }),
  (FamilyTree2.private.prototype.stateToUrl = (t) =>
    (t = FamilyTree2.private.state.get(t))
      ? ((t.collapsedIds = t.collapsedIds.join('*')),
        (t.offsetX = 0),
        (t.offsetY = 0),
        new URLSearchParams(t).toString())
      : ''),
  (FamilyTree2.private.state.get = (t) => {
    if (!t) return null;
    var e = FamilyTree2.private.state.buildStateNames(t.name);
    if (t.readFromUrlParams) {
      var i = new URLSearchParams(window.location.search);
      if (
        i.has(e.paramViewBox) &&
        i.has(e.paramCollapsedIds) &&
        i.has(e.paramFocusId) &&
        i.has(e.paramEditId) &&
        i.has(e.paramOffsetX) &&
        i.has(e.paramOffsetY)
      ) {
        for (
          var r = { viewBox: [], collapsedIds: [], focusId: null, editId: null },
            a = i.get(e.paramViewBox).split('*'),
            o = 0;
          o < a.length;
          o++
        )
          (a[o] = Number.parseFloat(a[o])), r.viewBox.push(a[o]);
        return (
          (r.collapsedIds = i.get(e.paramCollapsedIds).split('*')),
          (r.focusId = i.get(e.paramFocusId)),
          (r.editId = i.get(e.paramEditId)),
          (r.offsetX = Number.parseFloat(i.get(e.paramOffsetX))),
          (r.offsetY = Number.parseFloat(i.get(e.paramOffsetY))),
          r
        );
      }
    }
    if (t.readFromLocalStorage && null != (r = localStorage.getItem(t.name)))
      return (r = JSON.parse(r));
    if (t.readFromSessionStorage && null != (r = sessionStorage.getItem(t.name)))
      return (r = JSON.parse(r));
    return null;
  }),
  (FamilyTree2.private.state.clear = (t) => {
    if (!t) return !1;
    try {
      localStorage.removeItem(t), sessionStorage.removeItem(t);
      var e = FamilyTree2.private.state.buildStateNames(t),
        i = new URLSearchParams(window.location.search);
      i.has(e.paramViewBox) && i.delete(e.paramViewBox),
        i.has(e.paramCollapsedIds) && i.delete(e.paramCollapsedIds),
        i.has(e.paramFocusId) && i.delete(e.paramFocusId),
        i.has(e.paramEditId) && i.delete(e.paramEditId),
        window.history.replaceState(null, null, '?' + i);
    } catch {}
  }),
  void 0 === FamilyTree2 && (FamilyTree2 = {}),
  (FamilyTree2.VERSION = '2.00.172'),
  'undefined' != typeof module && (module.exports = FamilyTree2),
  (FamilyTree2.private.prototype.addNavigationBar = function () {
    var e = () => {
        var t = document.createElement('div');
        return (
          (t.style.backgroundColor = '#aeaeae'),
          (t.style.width = '52px'),
          (t.style.height = '52px'),
          (t.style.borderRadius = '50%'),
          (t.style.color = '#fff'),
          (t.style.display = 'flex'),
          (t.style.justifyContent = 'center'),
          (t.style.alignItems = 'center'),
          (t.style.cursor = 'pointer'),
          t
        );
      },
      i = document.createElement('div');
    i.setAttribute('data-navigation-bar', ''),
      (i.style.position = 'absolute'),
      (i.style.right = '10px'),
      (i.style.bottom = '20px');
    var r = e();
    (r.style.marginBottom = '10px'),
      r.setAttribute('data-nav-id', 'plus'),
      (r.innerHTML = FlowChart.icon.addPlusNew(24, 24, '#fff', 0, 0)),
      i.appendChild(r),
      r.addEventListener('click', () => {
        this.zoomIn();
      });
    var a = e();
    (a.style.marginBottom = '20px'),
      a.setAttribute('data-nav-id', 'minus'),
      (a.innerHTML = FlowChart.icon.minus(24, 24, '#fff', 0, 0)),
      i.appendChild(a),
      a.addEventListener('click', () => {
        this.zoomOut();
      });
    var o = e();
    o.setAttribute('data-nav-id', 'minus'),
      (o.innerHTML = FlowChart.icon.fit(24, 24, '#fff', 0, 0)),
      i.appendChild(o),
      o.addEventListener('click', () => {
        this.fit(), navigator.vibrate(100);
      }),
      this.element.appendChild(i);
  }),
  (FamilyTree2.private.changeFieldNamesFromGedcom = (t, e) => {
    for (var i of ((null != e && null != e) || (e = {}), t))
      for (var r in e) {
        var a = e[r];
        null != i[r] && ((i[a] = i[r]), delete i[r]);
      }
  }),
  (FamilyTree2.private.convertGedcomToFamilyMembersAI = (t) => {
    const e = t.split(/\r?\n/).map((t) => t.trim()),
      i = {},
      r = {};
    let a = null,
      o = [];
    const s = (t) => {
      const e = t.match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z]+)(?:\s+(.*))?$/);
      if (!e) return null;
      const [, i, r, a, o] = e;
      return { level: Number.parseInt(i, 10), pointer: r, tag: a, data: o || '' };
    };
    for (const t of e) {
      const e = s(t);
      if (!e) continue;
      while (o.length && o[o.length - 1].level >= e.level) o.pop();
      const l = [...o.map((t) => t.tag), e.tag].join('_');
      0 === e.level &&
        ((a =
          'INDI' === e.tag && e.pointer
            ? (i[e.pointer] = {
                id: e.pointer.replace(/@/g, ''),
                childIds: [],
                fatherId: null,
                motherId: null,
                sexOrGender: '',
                siblingIds: [],
                spouseIds: [],
                stepParentIds: [],
                unmarriedPartnerIds: [],
              })
            : 'FAM' === e.tag && e.pointer
              ? (r[e.pointer] = {})
              : null),
        (o = [])),
        a &&
          e.tag &&
          e.level > 0 &&
          (Array.isArray(a[l])
            ? a[l].push(e.data)
            : a.hasOwnProperty(l)
              ? (a[l] = [a[l], e.data])
              : (a[l] = e.data),
          o.push(e));
    }
    for (const [t, e] of Object.entries(r)) {
      const t = e.HUSB,
        r = e.WIFE,
        a = [].concat(e.CHIL || []),
        o = t ? t.replace(/@/g, '') : null,
        s = r ? r.replace(/@/g, '') : null,
        l = a.map((t) => t.replace(/@/g, ''));
      l.forEach((t) => {
        const e = i[`@${t}@`];
        e && (o && (e.fatherId = o), s && (e.motherId = s));
      }),
        o && i[`@${o}@`] && (i[`@${o}@`].spouseIds.push(s), i[`@${o}@`].childIds.push(...l)),
        s && i[`@${s}@`] && (i[`@${s}@`].spouseIds.push(o), i[`@${s}@`].childIds.push(...l));
    }
    for (const t of Object.values(i)) {
      const e = t.SEX;
      (t.sexOrGender = 'M' === e ? 'male' : 'F' === e ? 'female' : ''),
        delete t.SEX,
        (t.spouseIds = [...new Set(t.spouseIds.filter(Boolean))]),
        (t.childIds = [...new Set(t.childIds.filter(Boolean))]),
        (t.siblingIds = [...new Set(t.siblingIds || [])]),
        (t.stepParentIds = [...new Set(t.stepParentIds || [])]),
        (t.unmarriedPartnerIds = [...new Set(t.unmarriedPartnerIds || [])]);
    }
    return Object.values(i);
  }),
  (FamilyTree2.private.convertGedcomToFamilyMembers = (t, e) => {
    var i = FamilyTree2.private.convertGedcomToFamilyMembersAI(t);
    return FamilyTree2.private.changeFieldNamesFromGedcom(i, e), i;
  }),
  (FamilyTree2.private.prototype.exportToGedcom = function () {
    var t = this.family.slice();
    if (
      FamilyTree2.private.allHaveSexOrGender(t) &&
      FamilyTree2.private.validateNodeRelationshipsAI(t)
    )
      return FamilyTree2.private.convertNodesToGedcomAI(t);
    console.error('The data is incomplete.');
  }),
  (FamilyTree2.private.convertNodesToGedcomAI = (t) => {
    const e = {},
      i = {},
      r = new Map();
    let a = 1,
      o = '0 HEAD\n1 GEDC\n2 VERS 5.5.5\n2 FORM LINEAGE-LINKED\n1 CHAR UTF-8\n';
    t.forEach((t) => {
      if (((e[t.id] = t), t.fatherId || t.motherId)) {
        const e = [t.fatherId, t.motherId].sort().join('_');
        r.has(e) || r.set(e, `F${String(a++).padStart(3, '0')}`);
      }
    }),
      t.forEach((t) => {
        t.spouseIds &&
          t.spouseIds.length > 0 &&
          t.spouseIds.forEach((i) => {
            const o = e[i];
            if (o) {
              let e, i;
              if (
                ('male' === t.sexOrGender && 'female' === o.sexOrGender
                  ? ((e = t.id), (i = o.id))
                  : 'female' === t.sexOrGender && 'male' === o.sexOrGender
                    ? ((e = o.id), (i = t.id))
                    : 'male' === t.sexOrGender
                      ? ((e = t.id), (i = o.id))
                      : ((e = o.id), (i = t.id)),
                e || i)
              ) {
                const t = [e, i].sort().join('_');
                r.has(t) || r.set(t, `F${String(a++).padStart(3, '0')}`);
              }
            }
          });
      }),
      r.forEach((t, r) => {
        const [a, o] = r.split('_'),
          s =
            e[a] && 'male' === e[a].sexOrGender
              ? a
              : e[o] && 'male' === e[o].sexOrGender
                ? o
                : null,
          l =
            e[a] && 'female' === e[a].sexOrGender
              ? a
              : e[o] && 'female' === e[o].sexOrGender
                ? o
                : null;
        i[t] = { husb: s, wife: l, children: [] };
      }),
      t.forEach((t) => {
        if (t.fatherId || t.motherId) {
          const e = [t.fatherId, t.motherId].sort().join('_'),
            a = r.get(e);
          a && !i[a].children.includes(t.id) && i[a].children.push(t.id), (t.famc = a);
        }
        t.spouseIds &&
          t.spouseIds.forEach((i) => {
            const a = e[i];
            if (a) {
              let e, i;
              if (
                ('male' === t.sexOrGender && 'female' === a.sexOrGender
                  ? ((e = t.id), (i = a.id))
                  : 'female' === t.sexOrGender && 'male' === a.sexOrGender
                    ? ((e = a.id), (i = t.id))
                    : 'male' === t.sexOrGender
                      ? ((e = t.id), (i = a.id))
                      : ((e = a.id), (i = t.id)),
                e || i)
              ) {
                const a = [e, i].sort().join('_'),
                  o = r.get(a);
                o && (t.fams || (t.fams = []), t.fams.includes(o) || t.fams.push(o));
              }
            }
          });
      }),
      t.forEach((t) => {
        if (((o += `0 @I${t.id}@ INDI\n`), t.name)) {
          o += `1 NAME ${t.name}\n`;
          const e = t.name.split('/');
          e[0] && e[0].trim() && (o += `2 GIVN ${e[0].trim()}\n`),
            e.length > 1 && e[1] && e[1].trim() && (o += `2 SURN ${e[1].trim()}\n`);
        }
        t.sexOrGender && (o += `1 SEX ${t.sexOrGender.charAt(0).toUpperCase()}\n`),
          t.dateOfBirth && (o += `1 BIRT\n2 DATE ${t.dateOfBirth}\n`),
          t.dateOfDeath && (o += `1 DEAT\n2 DATE ${t.dateOfDeath}\n`),
          t.famc && (o += `1 FAMC @${t.famc}@\n`),
          t.fams &&
            t.fams.forEach((t) => {
              o += `1 FAMS @${t}@\n`;
            });
      });
    for (const t in i) {
      const e = i[t];
      (o += `0 @${t}@ FAM\n`),
        e.husb && (o += `1 HUSB @I${e.husb}@\n`),
        e.wife && (o += `1 WIFE @I${e.wife}@\n`),
        e.children &&
          e.children.forEach((t) => {
            o += `1 CHIL @I${t}@\n`;
          });
    }
    return (o += '0 TRLR\n'), o.trim();
  }),
  (FamilyTree2.private.allHaveSexOrGender = (t) => t.every((t) => t.hasOwnProperty('sexOrGender'))),
  (FamilyTree2.private.validateNodeRelationshipsAI = (t) => {
    const e = new Map(t.map((t) => [t.id, t]));
    for (const i of t) {
      if (Array.isArray(i.spouseIds))
        for (const t of i.spouseIds) {
          const r = e.get(t);
          if (!r || !Array.isArray(r.spouseIds) || !r.spouseIds.includes(i.id)) return !1;
        }
      if (null != i.fatherId) {
        const t = e.get(i.fatherId);
        if (!t || !Array.isArray(t.childIds) || !t.childIds.includes(i.id)) return !1;
      }
      if (null != i.motherId) {
        const t = e.get(i.motherId);
        if (!t || !Array.isArray(t.childIds) || !t.childIds.includes(i.id)) return !1;
      }
      if (Array.isArray(i.siblingIds))
        for (const t of i.siblingIds) {
          const i = e.get(t);
          if (!i || null == i.fatherId || null == i.motherId) return !1;
        }
    }
    return !0;
  }),
  (FamilyTree2.remote = {}),
  (FamilyTree2.graphLayout = (t, e) => {
    (t.v = '2.00.126'),
      FamilyTree2.remote.findRegion((i) => {
        fetch(i, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(t),
        })
          .then((t) => t.json())
          .then((t) => {
            e(t);
          })
          .catch((t) => {
            console.error(t);
          });
      });
  }),
  (FamilyTree2.remote.findRegion = (t) => {
    var e = localStorage.getItem('func-url-ft');
    if (e) t(e);
    else {
      var i = [];
      for (var r of [
        'defunc2',
        'cusfunc2',
        'bsfunc2',
        'acfunc2',
        'kcfunc2',
        'safunc2',
        'wifunc2',
      ]) {
        var a = new AbortController();
        fetch(`https://${r}.azurewebsites.net/api/ft`, { method: 'GET', signal: a.signal })
          .then((e) => {
            for (var r of i) r.abort('cancel_request');
            localStorage.setItem('func-url-ft', e.url), t(e.url);
          })
          .catch((t) => {
            'cancel_request' != t && console.error(t);
          }),
          i.push(a);
      }
    }
  });
FamilyTree2.logo = `<svg style="position: absolute; bottom: 7px; left: 7px; font-family: Verdana;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="195" height="27">      
            <text x="0" y="24">
                <tspan fill="#039be5" style="font-size: 14px;font-weight:bold;">BALKAN</tspan>
                <tspan fill="#f57c00" style="font-size: 14px;">FamilyTree JS 2</tspan>
            </text>
        </svg>`;

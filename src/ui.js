// ui.js - Handles the mouse, keyboard and touch events. It also creates the 
//         basic UI around the canvas.


import * as THREE           from 'three' 
import {jst}                from "jayesstee";
import {UISelection}        from './ui-selection.js';
import {UIInputTypes}       from './ui-input-types.js';

export class UI extends jst.Component {
  constructor(app, opts) {
    super();
    this.app           = app;
    this.camera        = opts.camera;
    this.scene         = opts.scene;
    this.uis           = new UISelection(app, opts);

    // State - can be: 'playing', 'paused', 'editing'
    this.state         = 'playing';
  }

  cssGlobal() {
    return {
      body: {
        fontFamily:      '"Helvetica Neue", Helvetica, Arial, sans-serif',
        padding$px:      0,
        margin$px:       0
      },
    
    };
  }

  cssLocal() {
    return {
      uiContainer$i: {
        position:        "fixed",
        top$px:          0,
        left$px:         0,
        bottom$px:       0,
        right$px:        0,
        zIndex:          1000,
        pointerEvents:   "none",
        color:           "white",
      },
      uiLeft$c: {
        position:        "absolute",
        color:           "yellow",
        padding$px:      2,
        top$px:          0,
        left$px:         0,
        zIndex:          1000,
        pointerEvents:   "auto",
      },
      uiRight$c: {
        position:        "absolute",
        color:           "yellow",
        backgroundColor: "#00C895",
        padding$px:      2,
        top$px:          0,
        right$px:         0,
        zIndex:          1000,
        pointerEvents:   "auto",
        dropShadow$px:   [0, 0, 10, 0, jst.rgba(0, 0, 0, 0.5)],
      },
      uiButton$c: {
        padding$px:      [6,10],
        fontSize:        "130%",
        cursor:          "pointer",
        color:           "#fff",
        backgroundColor: "#00C895",
        borderRadius$px: 5,
        border$px:       [1, "solid", "#880"],
      }
    };
  }

  render() {
    return jst.$div(
      {
        id: "-ui-container",
        events: {
        },
      },
      jst.$div(
        {
          cn: "-uiLeft",
          events: {
            click: e => console.log("click", e),
            enter: e => console.log("enter", e),
          },
        },
        jst.$div({cn: "-uiButton", events: {click: e => this.togglePause()}},
          jst.if(this.state == "playing") && jst.$i({cn: "fas fa-pause"}) || jst.$i({cn: "fas fa-play"}),
        ),
      ),
      jst.$div(
        {
          cn: "-uiRight",
          events: {
            click: e => console.log("click", e),
            enter: e => console.log("enter", e),
          },
        },
        jst.$div({cn: "-uiButton"},
          new UIInputTypes.Text(this.app, {value: "", label: "First Name"}),
          new UIInputTypes.Text(this.app, {value: "", label: "Last Name"}),
          new UIInputTypes.Text(this.app, {value: "", label: "Email"}),
          jst.$div({cn: ""}, "Hi there"),
          jst.$div({cn: ""}, "This is the second line"),
          jst.$div({cn: ""}, jst.$input({cn: ""})),
          
        ),
      ),

    );
  }

  togglePause() {
    if (this.state == "playing") {
      this.state = "paused";
      this.app.pause();
    } else {
      this.state = "playing";
      this.app.play();
    }
    this.refresh();
  }

  setScene(scene) {
    this.scene = scene;
    this.uis.setScene(scene);
  }

  setCamera(camera) {
    this.camera = camera;
    this.uis.setCamera(camera);
  }
  

  getUiSelection() {
    return this.uis;
  }

  addPointerEvents(el) {
    this.uis.addPointerEvents(el);
  }

  setCursor(cursor) {
    document.body.style.cursor = cursor || "default";
  }

}

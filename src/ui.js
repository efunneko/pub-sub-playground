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
    this.uis           = new UISelection(app, this, opts);

    // State - can be: 'playing', 'paused'
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
        padding$px:      0,
        top$px:          0,
        right$px:        0,
        zIndex:          1000,
        pointerEvents:   "auto",
        boxShadow$px:   [0, 0, 10, 0, jst.rgba(0, 0, 0, 0.5)],
      },
      uiBottomRight$c: {
        position:        "absolute",
        color:           "yellow",
        padding$px:      0,
        bottom$px:       0,
        right$px:        0,
        zIndex:          1000,
        pointerEvents:   "auto",
      },
      uiButton$c: {
        display:         "inline-block",
        padding$px:      [8,10,8,11],
        margin$px:       4,
        fontSize:        "130%",
        cursor:          "pointer",
        color:           "#fff",
        backgroundColor: "#00C895",
        borderRadius:    '50%',
        border$px:       [1, "solid", "#880"],
      },
      uiDeleteButton$c: {
        backgroundColor: "red",
      },
      uiForm$c: {
        display:         "inline-block",
        padding$px:      [8,10,8,11],
        fontSize:        "130%",
        cursor:          "pointer",
        color:           "#fff",
        backgroundColor: "#00C895",
        opacity:         0.9,
        borderRadius$px: [0, 0, 0, 3],
        //border$px:       [1, "solid", "#880"],
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
        jst.if(this.state != "playing") && jst.$div(
          {cn: "-uiButton", events: {click: e => this.reset()}},
          jst.$i({cn: "fas fa-undo"}),
        ),
        jst.if(0 &&this.pendingSave) && jst.$div(
          {cn: "-uiButton", events: {click: e => this.save()}},
          jst.$i({cn: "fas fa-save"}),
        )
      ),
      jst.$div(
        {
          cn: "-uiRight",
          events: {
            click: e => console.log("click", e),
            enter: e => console.log("enter", e),
          },
        },
        this.currConfigForm,
      ),
      jst.$div(
        {
          cn: "-uiBottomRight",
          events: {
          },
        },
        jst.$div(
          {
            cn: "-uiButton -uiDeleteButton",
            events: {
              click: e => this.deleteClicked(e),
              pointerup: e => this.deletePointerUp(e),
              pointermove: e => this.uis.onMove(e),
            },
          },
          jst.$i({cn: "fas fa-trash-alt"}),
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

  reset() {
    this.app.reset();
  }

  save() {
    this.state = "saving";
    this.app.saveConfig();
    this.refresh();
  }

  setPendingSave(val) {
    this.pendingSave = val;
    console.log("pendingSave", this.pendingSave);
    this.refresh();
  }

  deleteClicked(e) {
    this.uis.deleteSelectedObject();
  }

  deletePointerUp(e) {
    console.log("deletePointerUp", e);
    this.uis.deletePointerUp(e);
  }

  showConfigForm(formInfo) {
    this.currConfigForm = this.generateConfigForm(formInfo);
    this.refresh();
    this.refresh();
  }

  generateConfigForm(formInfo) {
    console.log("EDE generateConfigForm", formInfo);
    let div = jst.$div(
      {
        cn: "-uiForm",
        events: {
        }
      },
      formInfo.fields.map(field => {
        let inputClass = UIInputTypes.typeToClass(field.type);
        if (inputClass) {
          field.input = new inputClass(this.app, formInfo.obj, field);
          return field.input;
        } else {
          return undefined;
        }
      }),
      jst.$div(
        {cn: "-uiFormFooter"},
        jst.$button(
          {events: {click: e => this.acceptConfigForm(formInfo)}},
          "Ok"
        ),
        jst.$button(
          {events: {click: e => this.cancelConfigForm(formInfo)}},
          "Cancel"
        ),
      )
    );
    console.log("EDE generateConfigForm", div);
    return div;
  }

  clearConfigForm() {
    this.currConfigForm = undefined;
    this.uis.unselectObject();
    this.refresh();
  }

  acceptConfigForm(formInfo) {
    let values = {};
    formInfo.fields.forEach(field => {
      if (field.input) {
        values[field.name] = field.input.getValue();
      }
    });
    if (formInfo.save) {
      formInfo.save(values);
    }
    this.clearConfigForm();
  }

  cancelConfigForm(formInfo) {
    this.clearConfigForm();
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

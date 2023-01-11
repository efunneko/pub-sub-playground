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
        maxHeight$vh:    100,
        overflowY:       "auto",
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
        opacity:         0.9,
        borderRadius$px: [0, 0, 0, 3],
        //border$px:       [1, "solid", "#880"],
      },
      uiFormColors$c: {
        color:           "#fff",
        backgroundColor: "#00C895",
      },
      uiFormColorsInverse$c: {
        //color:           "#00c895",
        color:           "#00a875",
        backgroundColor: "#fff",
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
        },
        jst.$div({cn: "-uiButton", events: {click: e => this.togglePause()}},
          jst.if(this.state == "playing") && jst.$i({cn: "fas fa-pause"}) || jst.$i({cn: "fas fa-play"}),
        ),
        jst.if(this.state != "playing") && jst.$div(
          {cn: "-uiButton", title: "Menu", events: {click: e => this.settings()}},
          jst.$i({cn: "fas fa-bars"}),
        ),
        jst.if(this.state != "playing") && jst.$div(
          {cn: "-uiButton", title: "Settings", events: {click: e => this.settings()}},
          jst.$i({cn: "fas fa-cog"}),
        ),
        jst.if(this.state != "playing") && jst.$div(
          {cn: "-uiButton", title: "Add Object", events: {click: e => this.add()}},
          jst.$i({cn: "fas fa-plus"}),
        ),
        jst.if(this.state != "playing") && jst.$div(
          {cn: "-uiButton", title: "Reset", events: {click: e => this.reset()}},
          jst.$i({cn: "fas fa-undo"}),
        ),
        // Temporary div to show the gravity vector
        jst.if(this.app.platform.isMobile) && jst.$div(
          {cn: "-uiButton", title: "Gravity"},
          this.app.world.gravity.x.toFixed(2), ", ", this.app.world.gravity.y.toFixed(2)
        ),
        /*
        jst.if(this.state != "playing") && jst.$div(
          {cn: "-uiButton", title: "Clone selected object", events: {click: e => this.clone()}},
          jst.$i({cn: "fas fa-clone"}),
        ),
        */
        jst.if(this.pendingSave) && jst.$div(
          {cn: "-uiButton", title: "Save", events: {click: e => this.save()}},
          jst.$i({cn: "fas fa-save"}),
        )
      ),
      jst.$div(
        {
          cn: "-uiRight",
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
      this.modal
    );
  }

  togglePause() {
    if (!this.initDone) {
      this.app.world.initOrientationEvents()
      this.initDone = true;
    }
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
    this.app.saveConfig();
    this.refresh();
  }

  add() {
    const obj = {
      addType: null
    }
    const form = {
      save: (data) => this.completeAddEntry(data),
      obj: obj,
      fields: [
        {name: "addType", type: "buttonArray", cols: 3, value: "", label: "TODO - make some images for these", buttons: [
          {label: "Ball", value: "ball", onClick: () => this.completeAdd({addType: "ball"})},  
          {label: "Block", value: "block", onClick: () => this.completeAdd({addType: "block"})},
          {label: "Barrier", value: "barrier", onClick: () => this.completeAdd({addType: "barrier"})},
          {label: "Portal", value: "portal", onClick: () => this.completeAdd({addType: "portal"})},
          {label: "Broker", value: "broker", onClick: () => this.completeAdd({addType: "broker"})},
          {label: "Emitter", value: "emitter", onClick: () => this.completeAdd({addType: "emitter"})},
          {label: "Note", value: "note", onClick: () => this.completeAdd({addType: "note"})},
        ]}
      ]
    }
    this.showModal({
      title: "Add Object",
      form:  form,
    })
  }

  settings() {
    const globalParams = this.app.getGlobalParams();
    const form = {
      save: (data) => this.app.onSettingsChange(data),
      obj: this.app,
      fields: globalParams
    }
    this.showModal({
      title: "Settings",
      form:  form,
    })
  }

  completeAdd(data) {
    this.app.world.addObject(data.addType, {});
    this.closeModal();
  }

  setPendingSave(val) {
    this.pendingSave = val;
    this.refresh();
  }

  deleteClicked(e) {
    this.uis.deleteSelectedMesh();
  }

  deletePointerUp(e) {
    this.uis.deletePointerUp(e);
  }

  showConfigForm(formInfo) {
    this.currConfigForm = this.generateConfigForm(formInfo);
    this.refresh();
    this.refresh();
  }

  generateConfigForm(formInfo, includeFooter = true) {
    let div = jst.$div(
      {
        cn: "-uiForm " + (formInfo.inverseColors ? "-uiFormColorsInverse" : "-uiFormColors"),
        events: {
        }
      },
      formInfo.fields.map(field => {
        let inputClass = UIInputTypes.typeToClass(field.type);
        if (inputClass) {
          field.input = new inputClass(this.app, formInfo.obj, field, formInfo);
          return field.input;
        } else {
          return undefined;
        }
      }),
      jst.if(includeFooter) && jst.$div(
        {cn: "-uiFormFooter"},
        jst.$button(
          {events: {click: e => formInfo.accept ? formInfo.accept(formInfo) : this.acceptConfigForm(formInfo)}},
          "Ok"
        ),
        jst.$button(
          {events: {click: e => formInfo.cancel ? formInfo.cancel(formInfo) : this.cancelConfigForm(formInfo)}},
          "Cancel"
        ),
      )
    );
    return div;
  }

  clearConfigForm() {
    this.currConfigForm = undefined;
    this.uis.unselectMesh();
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

  showModal(opts) {
    this.modal = new UIModal(this, opts);
    this.refresh();
  }

  closeModal(opts) {
    this.modal = undefined
    this.refresh();
  }

}

class UIModal extends jst.Component {
    constructor(ui, opts) {
      super();
      this.ui   = ui;
      this.opts = opts;
      opts.form.inverseColors = true;
      opts.form.accept = (form) => this.accept(form);
      opts.form.cancel = (form) => this.close(form);
      this.form = this.ui.generateConfigForm(opts.form)

    }

    cssLocal() {
      return Object.assign(this.ui.cssLocal(), {
        uiModal$c: {
          position: "fixed",
          zIndex: 9999,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        uiModalContent$c: {
          minWidth: "40%",
          borderRadius: "5px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
        },
        uiModalHeader$c: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px",
          borderBottom: "1px solid #ccc",
        },
        uiModalTitle$c: {
          fontSize: "1.2em",
          fontWeight: "bold",
        },
        uiModalClose$c: {
          cursor: "pointer",
        },
        uiModalBody$c: {
          flex: 1,
          padding: "5px",
        },
        uiModalFooter$c: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "5px",
          borderTop: "1px solid #ccc",
        },
      });
    }

    render() {
      return jst.$div(
        {
          cn: "-uiModal",
          events: {
          },
        },
        jst.$div(
          {
            cn: "-uiModalContent",
            events: {
            },
          },
          jst.$div(
            {
              cn: "-uiModalHeader -uiFormColors",
              events: {
              },
            },
            jst.$div(
              {
                cn: "-uiModalTitle",
                events: {
                },
              },
              this.opts.title,
            ),
            jst.$div(
              {
                cn: "-uiModalClose",
                events: {
                  click: e => this.close(),
                },
              },
              jst.$i({cn: "fas fa-times"}),
            ),
          ),
          jst.$div(
            {
              cn: "-uiModalBody",
              events: {
              },
            },
            this.form,
          ),
          /*
          jst.$div(
            {
              cn: "-uiModalFooter",
              events: {
              },
            },
            this.opts.buttons.map(button => {
              return jst.$button(
                {
                  events: {
                    click: e => button.click(e),
                  },
                },
                button.text,
              );
            }),
          ),
          */
        ),
      );
    }

    close(form) {
      this.ui.closeModal();
    }

    accept(form) {
      let values = {};
      form.fields.forEach(field => {
        if (field.input) {
          values[field.name] = field.input.getValue();
        }
      });
      if (form.save) {
        form.save(values);
      }
      this.ui.closeModal();
    }
  
}

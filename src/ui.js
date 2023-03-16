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

    this.modal         = null;
    this.menu          = null;
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
      uiBottomLeft$c: {
        position:        "absolute",
        color:           "#00C895",
        padding$px:      0,
        bottom$px:       0,
        left$px:         0,
        zIndex:          1000,
      },
      uiSessionName$c: {
        cursor:          "pointer",
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
      uiButtonFlat$c: {
        borderRadius:    ['50%', '50%', '0%', '0%'],
        borderBottom:    'none',
        height$px:       28,
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
    const sessionName = this.app.sessions.getCurrentSessionName();
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
          {cn: `-uiButton ${this.menu ? '-uiButtonFlat' : ''}`, title: "Menu", events: {click: e => this.toggleMenu()}},
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
          cn: "-uiBottomLeft",
        },
        jst.$div(
          {
            cn: "-uiSessionName",
            events: {
              click: e => this.sessionNameClicked(e),
            }
          },
          // sessionName || jst.$i("Unnamed"),
        ),
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
      this.modal,
      this.menu
    );
  }

  togglePause() {
    this.closeMenu();
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

  play() {
    if (this.state != "playing") {
      this.state = "playing";
      this.app.play();
    }
    this.refresh()    
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

  toggleMenu() {
    if (this.menu) {
      this.closeMenu();
    } 
    else {
      this.showMenu();
    }
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
    this.uis.deleteSelectedMeshes();
  }

  sessionNameClicked(e) {
    const form = {
      save: (data) => this.app.onSessionNameChange(data),
      obj: this.createFakeObj({
        sessionName: this.app.sessions.getCurrentSessionName(),
      }),
      fields: [
        {name: "sessionName", type: "text", value: "", label: "Session Name"},
      ]
    }

    this.showModal({
      title: "Change Session Name",
      form:  form,
    })

  }

  deletePointerUp(e) {
    this.uis.deletePointerUp(e);
  }

  showConfigForm(formInfo) {
    this.currConfigForm = this.generateConfigForm(formInfo);
    this.refresh();
    //this.refresh();
  }

  showMultiObjectForm(objects, opts) {
    this.currConfigForm = new UIMultiObjectForm(this.app, this, objects, opts);
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
        jst.if(!formInfo.noOkButton) && jst.$button(
          {events: {click: e => formInfo.accept ? formInfo.accept(formInfo) : this.acceptConfigForm(formInfo)}},
          "Ok"
        ),
        jst.if(!formInfo.noCancelButton) && jst.$button(
          {events: {click: e => formInfo.cancel ? formInfo.cancel(formInfo) : this.cancelConfigForm(formInfo)}},
          "Cancel"
        ),
      )
    );
    return div;
  }

  clearConfigForm(doUnselect = false) {
    this.currConfigForm = undefined;
    if (doUnselect) {
      this.uis.unselectMesh();
    }
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
    this.clearConfigForm(true);
  }

  cancelConfigForm(formInfo) {
    this.clearConfigForm(true);
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
    this.closeMenu();
    this.modal = new UIModal(this, opts);
    this.refresh();
  }

  closeModal(opts) {
    this.modal = undefined
    this.refresh();
  }

  showMenu() {
    //this.menu = new UIMenu(this);
    this.refresh();
  } 

  closeMenu() {
    if (this.menu) {
      this.menu = undefined;
      this.refresh();
    }
  }

  createFakeObj(obj) {
    let fakeObj = {};
    for (let key in obj) {
      fakeObj[key] = obj[key];
    }
    fakeObj.getValue = (key) => {
      return fakeObj[key];
    }
    return fakeObj;
  }

  yesNoModal(opts) {
    const form = {
      ok: () => opts.yes && opts.yes(),
      cancel: () => opts.no && opts.no(),
      obj: this.createFakeObj({}),
      fields: [
        {name: "message", type: "textLine", value: opts.message, label: opts.message},
      ]
    }
    this.showModal({
      title: opts.title,
      form:  form,
    })
  }

}

class UIModal extends jst.Component {
    constructor(ui, opts) {
      super();
      this.ui   = ui;
      this.opts = opts;
      this.callerCancel = opts.form.cancel;
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
      if (this.callerCancel) {
        this.callerCancel(form);
      }
      this.ui.closeModal();
    }

    accept(form) {
      let values = {};
      form.fields.forEach(field => {
        if (field.input && field.input.getValue) {
          values[field.name] = field.input.getValue();
        }
      });
      if (form.save) {
        form.save(values);
      }
      if (form.ok) {
        form.ok(values);
      }
      this.ui.closeModal();
    }
  
}

// Create a JST component for a set of buttons to allow the alignment of
// a group of objects. There are horizontal and vertical alignment buttons,
// each with a left, center, and right alignment option.
// Additionally, there are buttons to distribute the objects evenly, horizontally
// or vertically.
// This component also has a button to group the objects into a single object and
// a button to ungroup the objects.
class UIMultiObjectForm extends jst.Component {
  constructor(app, ui, objects, opts) {
    super();
    this.app     = app;
    this.ui      = ui;
    this.objects = objects;
    this.opts    = opts;
  }

  cssLocal() {
    return Object.assign(this.ui.cssLocal(), {
      uiForm$c: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        height: "100%",
      },
      uiFormRow$c: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      },
      uiFormButton$c: {
        cursor: "pointer",
        padding: "5px",
        margin: "5px",
        width: "30px",
        height: "30px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: "5px",
        border: "1px solid #ccc",
        backgroundColor: "#eee",
      },
      uiFormButtonWide$c: {
        width: "50px",
      },
      uiFormButton$hover$c: {
        backgroundColor: "#ddd",
      },
      uiFormButton$active$c: {
        backgroundColor: "#ccc",
      },
      uiFormButton$selected$c: {
        backgroundColor: "#aaa",
      },
      uiFormButton$disabled$c: {
        backgroundColor: "#eee",
        opacity: 0.5,
        cursor: "default",
      },
    });
  }

  render() {
    return jst.$div(
      {
        cn: "-uiForm " + "-uiFormColors",
        events: {
        }
      },
      jst.$div(
        {
          cn: "-uiFormRow",
          events: {
          },
        },
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.alignLeft(),
            },
          },
          jst.$img({src: "images/icons/align-left.svg"}),
        ),
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.alignCenter(),
            },
          },
          jst.$img({src: "images/icons/align-center-horizontal.svg"}),
        ),
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.alignRight(),
            },
          },
          jst.$img({src: "images/icons/align-right.svg"}),
        ),
      ),
      jst.$div(
        {
          cn: "-uiFormRow",
          events: {
          },
        },
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.alignTop(),
            },
          },
          jst.$img({src: "images/icons/align-top.svg"}),
        ),
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.alignMiddle(),
            },
          },
          jst.$img({src: "images/icons/align-center-vertical.svg"}),
        ),
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.alignBottom(),
            },
          },
          jst.$img({src: "images/icons/align-bottom.svg"}),
        ),
      ),
      jst.$div(
        {
          cn: "-uiFormRow",
          events: {
          },
        },
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.distributeHorizontal(),
            },
          },
          jst.$img({src: "images/icons/distribute-horizontal.svg"}),
        ),
        jst.$div(
          {
            cn: "-uiFormButton",
            events: {
              click: e => this.distributeVertical(),
            },
          },
          jst.$img({src: "images/icons/distribute-vertical.svg"}),
        ),
      ),
      jst.$div(
        {
          cn: "-uiFormRow",
          events: {
          },
        },
        jst.$div(
          {
            cn: "-uiFormButton -uiFormButtonWid",
            events: {
              click: e => this.groupObjects(),
            },
          },
          jst.$img({src: "images/icons/object-group-solid.svg", title: "Group objects"}),
        ),
        jst.$div(
          {
            cn: "-uiFormButton -uiFormButtonWid",
            events: {
              click: e => this.ungroupObjects(),
            },
          },
          jst.$img({src: "images/icons/object-ungroup.svg", title: "Ungroup objects"}),
        ),
      ),
    );
  }

  alignLeft() {
    const minX = this.objects[0].getMinX();
    this.objects.forEach(object => {
      object.setMinX(minX);
    });
  }

  alignCenter() {
    const minX = this.objects[0].getMinX();
    const maxX = this.objects[0].getMaxX();
    const midX = (minX + maxX) / 2;
    this.objects.forEach(object => {
      const width = object.getWidth();
      object.setMinX(midX - width / 2);
    });
  }

  alignRight() {
    const maxX = this.objects[0].getMaxX();
    this.objects.forEach(object => {
      object.setMaxX(maxX);
    });
  }

  alignTop() {
    // Note that the y axis is inverted, so the top of the object is the max y
    const maxY = this.objects[0].getMaxY();
    this.objects.forEach(object => {
      object.setMaxY(maxY);
    });
  }

  alignMiddle() {
    const minY = this.objects[0].getMinY();
    const maxY = this.objects[0].getMaxY();
    const midY = (minY + maxY) / 2;
    this.objects.forEach(object => {
      const height = object.getHeight();
      object.setMinY(midY - height / 2);
    });
  }

  alignBottom() {
    // Note that the y axis is inverted, so the bottom of the object is the min y
    const minY = this.objects[0].getMinY();
    this.objects.forEach(object => {
      object.setMinY(minY);
    });
  }

  distributeHorizontal() {
    // Sort the objects by their x position
    const objects = this.objects.slice();
    objects.sort((a, b) => a.getMinX() - b.getMinX());

    // Calculate the total width of the objects
    const totalWidth = objects.reduce((total, object, i) => {
      console.log("widths: ", total, object.getWidth(), i);
      return total + object.getWidth();
    }, 0);

    objects.forEach(object => {
      console.log("minX: ", object.getMinX(), "maxX: ", object.getMaxX(), "width: ", object.getWidth());
    });

    // Calculate the total width of the space between the objects
    const totalSpace = objects[objects.length - 1].getMaxX() - objects[0].getMinX() - totalWidth;

    // Calculate the space between each object
    const space = totalSpace / (objects.length - 1);

    console.log("totalWidth: ", totalWidth);
    console.log("totalSpace: ", totalSpace);
    console.log("space: ", space);

    // Calculate the new x position of each object
    let x = objects[0].getMinX();
    objects.forEach(object => {
      object.setMinX(x);
      x += object.getWidth() + space;
    });

  }

  distributeVertical() {
    // Sort the objects by their y position
    const objects = this.objects.slice();
    objects.sort((a, b) => a.getMinY() - b.getMinY());

    // Calculate the total height of the objects
    const totalHeight = objects.reduce((total, object) => {
      return total + object.getHeight();
    }, 0);

    // Calculate the total height of the space between the objects
    const totalSpace = objects[objects.length - 1].getMaxY() - objects[0].getMinY() - totalHeight;

    // Calculate the space between each object
    const space = totalSpace / (objects.length - 1);

    // Calculate the new y position of each object
    let y = objects[0].getMinY();
    objects.forEach(object => {
      object.setMinY(y);
      y += object.getHeight() + space;
    });
  }

  groupObjects() {
    // Unselect the objects
    this.objects.forEach(object => {
      this.ui.uis.unselectMesh(object.getMesh());
    })
    let objectGroup = this.app.createObjectGroup(this.objects);
    this.ui.uis.selectMesh(objectGroup.getMesh());
  }

  ungroupObjects() {
    this.objects.forEach(object => {
      this.app.destroyObjectGroup(object);
    });
  }

}


// UI Menu
// 
// This is a drop down menu that can be used to select the following items:
// - New Session
// - Open Session
// - Save Session
// - Save Session As
// - Export Session
// - Import Session

class UIMenu extends jst.Component {
  constructor(ui) {
    super();
    this.ui = ui;
    this.app = ui.app;
  }

  cssLocal() {
    return {
      uiMenuOverlay$c: {
        position: "fixed",
        //zIndex: 9999,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
      uiMenu$c: {
        position: "absolute",
        top$px: 50,
        left$px: 0,
        display: "flex",
        flexDirection: "column",
        //alignItems: "flex-end",
        zIndex: 100,
        backgroundColor: "#00C895",
        //opacity: "0.8",
        border$px: [1, "solid", "#880"],
        borderRadius$px: [10, 10, 10, 10],
        padding$px: [10, 0]
      },
      uiMenuButton$c: {
        // width$px: 40,
        // height$px: 40,
        display: "flex",
        justifyContent: "left",
        //alignItems: "center",
        cursor: "pointer",
        color: "white",
        fontSize$px: 16,
        margin$px: 0,
        padding$px: [3, 30, 5, 30],
        whiteSpace: "nowrap",
      },
      uiMenuButton$c$hover: {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
      },

    }
  }

  render() {
    const menuItems = [      
      {name: "New", action: () => this.newSessionForm()},
      {name: "Open", action: () => this.openSessionForm()},
      {name: "Save", action: () => this.saveSession()},
      {name: "Save As", action: () => this.saveSessionAsForm()},
      {name: "Export", action: () => this.exportSessionForm()},
      {name: "Import", action: () => this.importSessionForm()},
    ]
    return jst.$div(
      {
        cn: "-uiMenuOverlay",
        events: {
          click: () => this.ui.closeMenu(),
        },
      },
      jst.$div(
        {
          cn: "-uiMenu",
        },
        menuItems.map(item => {
          return jst.$div(
            {
              cn: "-uiMenuButton",
              events: {
                click: item.action,
              },
            },
            item.name,
          )
        }),
      ),
    );
  }

  newSessionForm() {
    const form = {
      save: (data) => this.newSession(data),
      obj:  this.ui.createFakeObj({sessionName: "",}),
      fields: [{name: "sessionName", type: "text", label: "Session Name"}]
    }

    this.ui.showModal({
      title: "New Session",
      form:  form,
    })
  }

  newSession(data) {
    let sessionName = data.sessionName;
    console.log("newSession: ", sessionName);
  }


  openSessionForm() {
    this.notYetImplementedForm("Open Session");
  }

  saveSession() {
    const name = this.app.sessions.getCurrentSessionName();
    if (!name || name == "Unnamed") {
      this.saveSessionAsForm();
    } 
    else {
      this.save()
    }
  }

  saveSessionAsForm() {
    const form = {
      save:   (data) => this.saveSessionAs(data),
      obj:    this.ui.createFakeObj({sessionName: "",}),
      fields: [{name: "sessionName", type: "text", label: "Session Name"}]
    }

    this.ui.showModal({
      title: "New Session",
      form:  form,
    })
  }

  exportSessionForm() {
    this.ui.yesNoModal({
      message: "Export Session?",
      yes: () => this.notYetImplementedForm(),
      no: () => {},
    });
    //this.notYetImplementedForm("Export Session");
  }

  importSessionForm() {
    this.notYetImplementedForm("Import Session");
  }

  notYetImplementedForm(title) {
    this.ui.showModal({
      title: title,
      form:  {
        save: (data) => this.notYetImplemented(data),
        obj: this.ui.createFakeObj({
        }),
        noOkButton: true,
        fields: [
          {name: "nyi", type: "textLine", label: "Not Yet Implemented"}
        ]
      },
    })
  }

}




// ui-input-types.js - A collection of JST based inputs

import {jst}      from "jayesstee";

// Common event handlers to stop propagation on text input
const stopPropEvents = {
  keydown: (e) => e.stopPropagation(),
  keyup:   (e) => e.stopPropagation(),
  keypress:(e) => e.stopPropagation(),

};


class Input extends jst.Component {
  constructor(app, obj, opts, formInfo) {
    super();
    this.app         = app;
    this.formInfo    = formInfo;
    this.opts        = opts;
    this.type        = opts.type;
    this.label       = opts.label;
    this.name        = opts.name;
    this.title       = opts.title;
    this.showIf      = opts.showIf;
    this.labelInline = opts.labelInline;
    this.value       = obj.getValue ? obj.getValue(opts.name) : null;
    this.onChange    = opts.onChange;
    this.onBlur      = opts.onBlur;
    this.dependents  = [];

    if (opts.dependsOn) {
      this.dependsOn = opts.dependsOn;
      if (!Array.isArray(this.dependsOn)) {
        this.dependsOn = [this.dependsOn];
      }
      this.dependsOn.forEach((dep) => {
        let field = this.formInfo.fields.find((field) => field.name === dep);
        if (field && field.input) {
          field.input.addDependent(this);
        }
      });
    }

  }

  addDependent(input) {
    this.dependents.push(input);
  }

  /*
  cssGlobal() {
    return {
      uiInput: {
        fontFamily:      '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize$px:     14,
        padding$px:      0,
        margin$px:       [0,0,5,0],
        borderRadius$px: 3,
        backgroundColor: "white",
        color:           "black",
        outline:         "none",
        width$px:        100,
        height$px:       20,
        boxSizing:       "border-box",
      },
      uiInput$c$focus: {
        //border$px:       [1, "solid", "blue"],
      },
      uiInputLabel: {
        display:         "block",
        fontSize:        "65%",
        fontWeight:      "bold",
        whiteSpace:      "nowrap",
        padding$px:      [2,0,0,0],
      },
    };
  }
  */

  cssInstance() {
    return {
      uiInputLabelDiv$c: {
        display:         this.labelInline ? "inline-block" : "block",
        marginTop$px:    this.type == "subObject" ? 15: 0,
        verticalAlign:   "top",
      },        
      uiInputLabel$c: {
        fontSize:        this.labelSize || this.type == "subObject" ? "90%": "65%",
      },
    };
  }

  renderInput(div) {
    if (this.showIf) {
      // Get a list of inputs by name
      const inputs = {};
      this.formInfo.fields.forEach((field) => {
        inputs[field.name] = field.input;
      });
      if (!this.showIf(this.obj, inputs)) {
        return jst.$div();
      }
    }
    return jst.$div(
      {
        cn: "uiInput",
      },
      // Add a label div
      jst.$div(
        {cn: `-uiInputLabelDiv --uiInputLabelDiv`},
        jst.$label({cn: "-uiInputLabel --uiInputLabel", title: this.title}, this.label),
      ),
      // Add the input
      div,
    )
  }

  _onChange(name, value) {
    if (this.onChange) {
      this.onChange(name, value);
    }
    this.dependents.forEach((input) => {
      input.dependencyUpdate(name, value);
    });
  }

  // Called when something that we depend on changes
  dependencyUpdate(name, value) {
    this.refresh();
  }

}


class Text extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.width = opts.width || 24;
  }

  cssLocal() {
    return {
      uiTextInput$c: {
        margin$px:       [-2,0,5,0],
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiTextInput"},
      jst.$input(
        {type: "text", title: this.title, size: this.width, value: this.value, ref: "inputRef", events: { change:   (e) => this._onChange(this.name, e.target.value)}} 
      )
    ));
  }

  getValue() {
    return this.inputRef && this.inputRef.el ? this.inputRef.el.value : this.value;
  }
}

// A simple separator line in the input form
class Separator extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
  }

  cssLocal() {
    return {
      uiSeparator$c: {
        margin$px:       [10,0,10,0],
        borderBottom:    "1px solid #ccc",
      },
    };
  }

  render() {
    return jst.$div({class: "-uiSeparator"});
  }
}

// A text line that is not editable
class TextLine extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
  }

  cssLocal() {
    return {
      uiTextLine$c: {
        margin$px:       [0,0,5,0],
      },
    };
  }

  render() {
    return jst.$div({class: "-uiTextLine"}, this.label);
  }

}

class Password extends Text {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiTextInput"},
      jst.$input(
        {type: "password", title: this.title, value: this.value, ref: "inputRef", events: { change: (e) => this._onChange(this.name, e.target.value)}}
      )
    ));
  }
}

class TextArea extends Text {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.width = opts.width || 24;
  }

  cssLocal() {
    return {
      uiTextInput$c: {
        margin$px:       [-2,0,5,0],
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiTextInput"},
      jst.$textarea(
        {value: this.value, title: this.title, cols: this.width, rows: 4, ref: "inputRef", events: { change: (e) => this._onChange(this.name, e.target.value)}},
        this.value
      )
    ));
  }

}

class Select extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.app      = app;
    this.options  = opts.options;
  }

  cssLocal() {
    return {
      uiSelect$c: {
        margin$px:       [-2,0,5,0],
      },
    };
  }

  render() {
    // If options is function, call it to get the list
    let options = this.options;
    if (typeof options === "function") {
      options = options();
    }
    return super.renderInput(jst.$div(
      {class: "-uiSelect"},
      jst.$select(
        {ref: "inputRef", title: this.title, events: { change: (e) => this._onChange(this.name, e.target.value)}},
        options.map((option) => {
          return jst.$option({value: option.value, properties: [this.value==option.value ? "selected" : ""]}, option.label);
        })
      )
    ));
  }

  getValue() {
    return this.inputRef && this.inputRef.el ? this.inputRef.el.value : this.value;
  }
}

// A checkbox
class Checkbox extends Input {
  constructor(app, obj, opts, formInfo) {
    opts.labelInline = true;
    super(app, obj, opts, formInfo);
  }

  cssLocal() {
    return {
      uiCheckbox$c: {
        display:         "inline-block",
        margin$px:       [1,0,5,10],
      },
      uiInputCheckbox$c: {
        margin$px:       [0,5,0,0],
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiCheckbox"},
      jst.$input(
        {type: "checkbox", cn: "-uiInputCheckbox", title: this.title, checked: this.value, ref: "inputRef", events: { change: (e) => this._onChange(this.name, e.target.checked)}}
      )
    ));
  }

  getValue() {
    return this.inputRef && this.inputRef.el ? this.inputRef.el.checked : this.value;
  }

}
  
class Boolean extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.size = opts.size || 20;
  }

  cssLocal() {
    return {
      booleanDiv$c: {
        margin$px:       [4,0,5,0],
        width$px:        this.size * 2,
      },
      on$c: {
        backgroundColor: "green",
      },
      off$c: {
        backgroundColor: "gray",
      },
      sliderOn$c: {
        backgroundColor: "#00b486",
        borderColor:     "#eee",
      },
      sliderOff$c: {
        backgroundColor: "#aaa",
        borderColor:     "gray",
      },
      path$c: {
        display:         "inline-block",
        width:           "100%",
        height$px:       this.size,
        //backgroundColor: "lightgray",
        borderRadius$px: this.size / 2,
        transition:      "background-color 0.2s",
      },
      slider$c: {
        display:         "inline-block",
        width$px:        this.size - 2,
        height$px:       this.size - 2,
        backgroundColor: "white",
        borderRadius$px: 10,
        borderWidth$px:  1,
        borderStyle:     "solid",
        position:        "relative",
        transition:      "left 0.2s",
      },
    };
  }

  cssInstance() {
    return Object.assign({}, super.cssInstance(), {
      slider$c: {
        left$px:         this.value ? (this.size-1) : 0,
      },
      path$c: {
        backgroundColor: this.value ? "#00b486" : "#aaa",
        borderColor:     this.value ? "#eee" : "gray",
      },
    });
  }

  render() {
    return super.renderInput(jst.$div(
      {
        cn: `-booleanDiv`, 
        events: {
          click: () => {
            this.value = !this.value;
            //this.slider.el.style.left = this.value ? "20px" : "0px";
            this._onChange(this.name, this.value);
            this.refresh();
          },
        }
      },
      jst.$div({cn: `-path --path`, title: this.title},
        jst.$div({cn: `-slider --slider`, ref: "slider"})
      ),
    ));
  }

  getValue() {
    return this.value;
  }
}

class Color extends Text {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.width = opts.width || 32;
  }

  cssLocal() {
    return {
      uiInput$c: {
        margin$px:       [2,0,5,0],
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiInput"},
      jst.$input(
        {value: this.value, type: "color", title: this.title, ref: "inputRef", events: { change: (e) => this._onChange(this.name, e.target.value)}},
        this.value
      )
    ));
  }

}

class ButtonArray extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.cols    = opts.cols || 4;
    this.rows    = opts.rows || 1;
    this.buttons = opts.buttons;
  }

  cssLocal() {
    return {
      uiInput$c: {
        margin$px:       [2,0,5,0],
      },
      uiArray$c: {
        display:         "grid",
        gridTemplateColumns: `repeat(${this.cols}, 1fr)`,
        gridTemplateRows:    `repeat(${this.rows}, 1fr)`,
        gridGap$px:         2,
      },
      uiButton$c: {
        backgroundColor: "lightgray",
        color:           "black",
        border:          "1px solid gray",
        borderRadius$px: 4,
        padding$px:      [2,4],
        cursor:          "pointer",
        transition:      "background-color 0.2s",
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiInput"},
      jst.$div(
        {cn: "-uiArray"},
        this.buttons.map((button) => {
          return jst.$div(
            {
              cn: "-uiButton",
              events: {
                click: () => {
                  button.onClick ? button.onClick() : null;
                },
              }
            },
            button.label
          );
        })
      )
    ));
  }

  onClick() {
    this.onChange ? this.onChange(this.name, this.value) : null;
  }

}

class ColorGrid extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.cols        = opts.cols || 4;
    this.rows        = Math.floor(opts.options.length / this.cols) + 1;
    this.options     = opts.options;
    this.multiSelect = opts.multiSelect || false;
  }

  cssLocal() {
    return {
      uiInput$c: {
        display:         "inline-block",
        margin$px:       [2,0,5,0],
      },
      uiArray$c: {
        display:         "grid",
        gridTemplateColumns: `repeat(${this.cols}, 1fr)`,
        //gridTemplateRows:    `repeat(${this.rows}, 1fr)`,
        gridGap$px:         2,
      },
      selectedBorder$c: {
        border:          "3px solid white",
      },
      unselectedBorder$c: {
        border:          "3px solid rgba(0,0,0,0.1)",
      },
      selected$c: {
        opacity:         1,
      },
      unselected$c: {
        opacity:         0.85,
      },
      uiButton$c: {
        width$px:        40,
        height$px:       40,
        color:           "black",
        //border:          "1px solid gray",
        borderRadius$px: 4,
        padding$px:      [2,4],
        cursor:          "pointer",
        transition:      "background-color 0.2s",
        transition:      "opacity 0.2s",
      },
      outer$c: {
        padding$px: 2,
        borderRadius$px: 6,
        transition:      "border 0.2s",
      },
      inner$c: {
        backgroundColor: "white",
        borderRadius$px: 4,
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiInput"},
      jst.$div(
        {cn: "-uiArray"},
        this.options.map((color) => jst.$div({cn: `-outer ${this.colorSelected(color) ? "-selectedBorder" : "-unselectedBorder"}`},
          jst.$div({cn: '-inner'},
          jst.$div({
            cn: `-uiButton ${this.colorSelected(color) ? "-selected" : "-unselected"}`,
            style: `background-color: ${color};`,
            events: {
              click: () => this.onClick(color),
            }
          })
        )))
      )
    ));
  }

  colorSelected(color) {
    return this.value.includes(color);
  }

  onClick(color) {

    if (this.multiSelect) {
      if (this.value.includes(color)) {
        this.value = this.value.filter((c) => c != color);
      } else {
        this.value.push(color);
      }
    } else {
      this.value = [color];
    }
    this.refresh();
  }

  getValue() {
    return this.value;
  }

}


class List extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.app       = app;
    this.options   = opts.options;
    //this.value     = opts.value;
    this.entryName = opts.entryName;
    this.width     = opts.width || 200;
  }

  cssLocal() {
    return {
      uiList$c: {
        margin$px:       [2,0,5,0],
      },
      createButton$c: {
        display:         "inline-block",
        margin$px:       [2,0,5,0],
        fontSize:        '60%',
        borderRadius$px: 5,
        backgroundColor: "lightgray",
        color:           "black",
        padding$px:      [2,5,2,5],
        cursor:          "pointer",
      },
      tableDiv$c: {
        fontSize:        '68%',
      },
      delete$c: {
      },
      entry$c: {
        width$px:        this.width,
      }


    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiList"},
        jst.$div({cn: '-createButton', events: {click: e => this.addEntry(e)}}, this.entryName ? `Add ${this.entryName}` : "Add Entry", ),
        jst.$div({cn: '-tableDiv'},
          jst.$table(
            this.value.map((entry, i) => 
              jst.$tr(
                jst.$td(jst.$div({cn: '-entry', events: {click: e => this.editEntry(e, i)}}, entry)),
                jst.$td(jst.$div({cn: '-delete', title: 'Remove'}, jst.$i({cn: 'fas fa-minus-circle', events: {click: e => this.deleteEntry(e, i)}})))
              )
            )
          )
        ),
    ));
  }

  addEntry(e) {
    this.newEntry = "";
    const form = {
      save: (data) => this.completeAddEntry(data),
      obj: this,
      fields: [
        {name: "newEntry", type: "text", value: "", label: this.entryName || "Entry Text"},
      ]
    }
    this.app.ui.showModal({
      title: this.entryName ? `Add ${this.entryName}` : "Add Entry",
      form:  form,
    })
  }

  editEntry(e, index) {
    this.newEntry = this.value[index];
    const form = {
      save: (data) => this.completeEditEntry(data, index),
      obj: this,
      fields: [
        {name: "newEntry", type: "text", label: this.entryName || "Entry Text"},
      ]
    }
    this.app.ui.showModal({
      title: this.entryName ? `Edit ${this.entryName}` : "Edit Entry",
      form:  form,
    })
  }

  deleteEntry(e, index) {
    this.value.splice(index, 1);
    this._onChange(this.name, this.value);
    this.refresh();
  }

  completeAddEntry(data) {
    this.value.push(data.newEntry);
    this._onChange(this.name, this.value);
    this.app.ui.closeModal();
    this.refresh();
  }

  completeEditEntry(data, index) {
    this.value[index] = data.newEntry;
    this._onChange(this.name, this.value);
    this.app.ui.closeModal();
    this.refresh();
  }

  getValue(name) {
    if (name === "newEntry") {
      return this.newEntry || "";
    }
    return this.value;
  }
}

// Selection list will display a list of options in a scrollable list
// Only one option can be selected at a time
class SelectionList extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.app       = app;
    this.value     = opts.value;
    this.entryName = opts.entryName;
    this.width     = opts.width || 200;
    this.labelSize = opts.labelSize;

    // Sort the options case-insensitively
    this.options = opts.options.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  cssLocal() {
    return {
      uiList$c: {
        margin$px:       [2,0,5,0],
      },
      tableDiv$c: {
        fontSize:        '95%',
        maxHeight$vh:    50,
        overflowY:       "auto",
        boxShadow$px:    [0,0,5,0,jst.rgba(0,0,0,0.3), 'inset'],
        padding$px:      [8, 15],
      },
      delete$c: {
      },
      selected$c: {
        backgroundColor: "lightgray",
      }
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiList"},
        jst.$div({cn: '-tableDiv'},
            this.options.map((entry, i) => 
                jst.$div(jst.$div({cn: `-entry ${this.value == entry ? "-selected" : ""}`, events: {click: e => this.selectEntry(e, i)}}, entry))),
                //jst.$td(jst.$div({cn: '-delete', title: 'Remove'}, jst.$i({cn: 'fas fa-minus-circle', events: {click: e => this.deleteEntry(e, i)}})))
        ),
    ));
  }

  selectEntry(e, index) {
    this.value = this.options[index];
    this.refresh();
  }

  getValue() {
    return this.value;
  }

}

class FileInput extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.app     = app;
    this.value   = opts.value;
    this.width   = opts.width || 200;
    this.height  = opts.height || 20;
    this.label   = opts.label;
    this.labelSize = opts.labelSize;
    this.accept  = opts.accept;
  }

  cssLocal() {
    return {
      file$c: {
      },
      fileInput$c: {
        //accentColor:     "#69ffd9",
        padding$px:      [10,5,15,0],
        cursor:          "pointer",
      },
      fileLabel$c: {
        fontSize:        '68%',
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
        jst.$div({cn: '-file'},
          jst.$input({type: "file", cn: '-fileInput', events: {change: e => this.fileSelected(e)}, accept: this.accept}),
        ),
    ));
  }

  fileSelected(e) {
    this.value = e.target.files[0];
    this.refresh();
  }

  getValue() {
    return this.value;
  }

}

class NumberRange extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.app     = app;
    this.min     = opts.min;
    this.max     = opts.max;
    this.step    = opts.step || 1;
    this.width   = opts.width || 200;
    this.height  = opts.height || 20;

    if (typeof(this.value) == "number") {
      this.value = Math.round(this.value*100)/100;
    }
  }

  cssLocal() {
    return {
      uiInput$c: {
        margin$px:       [2,0,5,0],
      },
      range$c: {
        width$px:        this.width,
        height$px:       this.height,
      },
      rangeInput$c: {
        //accentColor:     "#69ffd9",
        accentColor:     "#55cca9",
        marginRight$px:  15,
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiInput"},
      jst.$div(
        {cn: "-range"},
        jst.$input(
          {
            cn: "-rangeInput",
            type: "range",
            min: this.min,
            max: this.max,
            step: this.step,
            value: this.value,
            events: {
              input: e => this._onChange(this.name, e.target.value),
            },
          },
        ),
        this.value
      )
    ));
  }

  _onChange(name, value) {
    super._onChange(name, value);
    this.value = value;
    this.refresh();
  }

  getValue(name) {
    return this.value;
  }
}

class SubObject extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.app         = app;

    // For this input type, the value is the sub-object
    this.subFormInfo = {
      save: (form) => obj.saveConfigForm(form),
      obj: this.value,
      fields: this.value.getObjectParams()
    };

    this.subForm = this.app.ui.generateConfigForm(this.subFormInfo, false);
  }

  cssLocal() {
    return {
      uiInput$c: {
        margin$px:       [2,0,5,0],
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiInput"},
      this.subForm
    ));
  }

  getValue() {
    const values = {};
    this.subFormInfo.fields.forEach(field => {
      if (field.input) {
        values[field.name] = field.input.getValue();
      }
    });
    return values;
  }
}

export class UIInputTypes {
  static typeToClass(type) {
    switch(type) {
      case "text": return Text;
      case "textarea": return TextArea;
      case "select": return Select;
      case "password": return Password;
      case "boolean": return Boolean;
      case "checkbox": return Checkbox;
      case "color": return Color;
      case "list": return List;
      case "buttonArray": return ButtonArray;
      case "colorGrid": return ColorGrid;
      case "numberRange": return NumberRange;
      case "subObject": return SubObject;
      case "separator": return Separator;
      case "textLine": return TextLine;
      case "selectionList": return SelectionList;
      case "file": return FileInput;
    }
  }

  static Text           = Text;
  static TextArea       = TextArea;
  static Select         = Select;
  static Password       = Password;
  static Boolean        = Boolean;
  static Checkbox       = Checkbox;
  static Color          = Color;
  static List           = List;
  static ButtonArray    = ButtonArray;
  static ColorGrid      = ColorGrid;
  static NumberRange    = NumberRange;
  static SubObject      = SubObject;
  static Separator      = Separator;
  static TextLine       = TextLine;
  static SelectionList  = SelectionList;
  static FileInput      = FileInput;

}

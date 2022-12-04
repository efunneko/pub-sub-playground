// ui-input-types.js - A collection of JST based inputs

import {jst}      from "jayesstee";


class Input extends jst.Component {
  constructor(app, obj, opts, formInfo) {
    super();
    console.log("EDE Input constructor", app, obj, opts, formInfo);
    this.app        = app;
    this.formInfo   = formInfo;
    this.opts       = opts;
    this.label      = opts.label;
    this.name       = opts.name;
    this.title      = opts.title;
    this.showIf     = opts.showIf;
    this.value      = obj.getValue ? obj.getValue(opts.name) : null;
    this.onChange   = opts.onChange;
    this.onBlur     = opts.onBlur;
    this.dependents = [];

    if (opts.dependsOn) {
      this.dependsOn = opts.dependsOn;
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
      uiInputLabel$c: {
        display:         "block",
        fontSize:        "65%",
        fontWeight:      "bold",
        whiteSpace:      "nowrap",
        padding$px:      [2,0,0,0],
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
      console.log("EDE checking showif, inputs", inputs);
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
        {cn: "uiInputLabelDiv"},
        jst.$label({cn: "uiInputLabel", title: this.title}, this.label),
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
        {type: "text", title: this.title, size: this.width, value: this.value, ref: "inputRef", events: { change: (e) => this._onChange(this.name, e.target.value)}} 
      )
    ));
  }

  getValue() {
    console.log("getValue", this.inputRef);
    return this.inputRef && this.inputRef.el ? this.inputRef.el.value : this.value;
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
    console.log("getValue", this.inputRef, this.value);
    return this.inputRef && this.inputRef.el ? this.inputRef.el.value : this.value;
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
    return {
      slider$c: {
        left$px:         this.value ? (this.size-1) : 0,
      },
      path$c: {
        backgroundColor: this.value ? "#00b486" : "#aaa",
        borderColor:     this.value ? "#eee" : "gray",
      },
    }
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
    console.log("getValue", this.value);
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

class List extends Input {
  constructor(app, obj, opts, formInfo) {
    super(app, obj, opts, formInfo);
    this.app       = app;
    this.options   = opts.options;
    this.value     = opts.value;
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
    console.log("getValue", name, this.value);
    if (name === "newEntry") {
      return this.newEntry || "";
    }
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
        accentColor:     "#69ffd9",
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

export class UIInputTypes {
  static typeToClass(type) {
    switch(type) {
      case "text": return Text;
      case "textarea": return TextArea;
      case "select": return Select;
      case "password": return Password;
      case "boolean": return Boolean;
      case "color": return Color;
      case "list": return List;
      case "buttonArray": return ButtonArray;
      case "numberRange": return NumberRange;
    }
  }

  static Text           = Text;
  static TextArea       = TextArea;
  static Select         = Select;
  static Password       = Password;
  static Boolean        = Boolean;
  static Color          = Color;
  static List           = List;
  static ButtonArray    = ButtonArray;
  static NumberRange    = NumberRange;

  //static NumberInput  = Number;
  //static CheckboxList = CheckboxList;
  //static Toggle       = Toggle;
  //static TextList     = TextList;
  //static Button       = Button;
}

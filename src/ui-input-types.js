// ui-input-types.js - A collection of JST based inputs

import {jst}      from "jayesstee";


class Input extends jst.Component {
  constructor(app, obj, opts) {
    super();
    this.app      = app;
    this.opts     = opts;
    this.label    = opts.label;
    this.name     = opts.name;
    this.value    = obj.getValue(opts.name);
    this.onChange = opts.onChange;
    this.onBlur   = opts.onBlur;
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
    return jst.$div(
      {
        cn: "uiInput",
      },
      // Add a label div
      jst.$div(
        {cn: "uiInputLabelDiv"},
        jst.$label({cn: "uiInputLabel"}, this.label),
      ),
      // Add the input
      div,
    )
  }
}


class Text extends Input {
  constructor(app, obj, opts) {
    super(app, obj, opts);
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
        {type: "text", value: this.value, ref: "inputRef"}
      )
    ));
  }

  getValue() {
    console.log("getValue", this.inputRef);
    return this.inputRef.el.value;
  }
}

class Password extends Text {
  constructor(app, obj, opts) {
    super(app, obj, opts);
  }

  render() {
    return super.renderInput(jst.$div(
      {class: "-uiTextInput"},
      jst.$input(
        {type: "password", value: this.value, ref: "inputRef"}
      )
    ));
  }
}

class TextArea extends Text {
  constructor(app, obj, opts) {
    super(app, obj, opts);
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
        {value: this.value, cols: 50, rows: 4, ref: "inputRef"},
        this.value
      )
    ));
  }

}

class Select extends Input {
  constructor(app, obj, opts) {
    super(app, obj, opts);
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
        {ref: "inputRef"},
        options.map((option) => {
          return jst.$option({value: option.value, properties: [this.value==option.value ? "selected" : ""]}, option.label);
        })
      )
    ));
  }

  getValue() {
    console.log("getValue", this.inputRef);
    return this.inputRef.el.value;
  }
}
  
class Boolean extends Input {
  constructor(app, obj, opts) {
    super(app, obj, opts);
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
        left$px:         this.value ? (this.size-1) : 0,
        transition:      "left 0.2s",
      },
    };
  }

  render() {
    return super.renderInput(jst.$div(
      {
        cn: `-booleanDiv`, 
        events: {
          click: () => {
            console.log("click");
            this.value = !this.value;
            this.slider.el.style.left = this.value ? "20px" : "0px";
            this.onChange ? this.onChange(this.name, this.value) : null;
            this.refresh();
          },
        }
      },
      jst.$div({cn: `-path ${this.value ? "-sliderOn" : "-sliderOff"}`},
        jst.$div({cn: `-slider`, ref: "slider"})
      ),
    ));
  }

  getValue() {
    console.log("getValue", this.inputRef);
    return this.value;
  }
}

class Color extends Text {
  constructor(app, obj, opts) {
    super(app, obj, opts);
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
        {value: this.value, type: "color", ref: "inputRef"},
        this.value
      )
    ));
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
    }
  }

  static Text           = Text;
  static TextArea       = TextArea;
  static Select         = Select;
  static Password       = Password;
  static Boolean        = Boolean;
  static Color          = Color;

  //static NumberInput  = Number;
  //static CheckboxList = CheckboxList;
  //static Toggle       = Toggle;
  //static TextList     = TextList;
  //static Button       = Button;
}

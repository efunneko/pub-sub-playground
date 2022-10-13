// ui-input-types.js - A collection of JST based inputs

import {jst}      from "jayesstee";


class Input extends jst.Component {
  constructor(app, opts) {
    super();
    this.app      = app;
    this.opts     = opts;
    this.value    = opts.value;
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
        border$px:       [1, "solid", "black"],
        borderRadius$px: 3,
        backgroundColor: "white",
        color:           "black",
        outline:         "none",
        width$px:        100,
        height$px:       20,
        boxSizing:       "border-box",
      },
      uiInput$c$focus: {
        border$px:       [1, "solid", "blue"],
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
  constructor(app, opts) {
    super(app, opts);
    this.app      = app;
    this.label    = opts.label;
    this.value    = opts.value;
    this.onChange = opts.onChange;
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
        {type: "text", value: this.value, 
         oninput: e => this.onChange(e.target.value)}
      )
    ));
  }
}


export class UIInputTypes {
  static Text           = Text;
  //static NumberInput  = Number;
  //static CheckboxList = CheckboxList;
  //static Toggle       = Toggle;
  //static TextList     = TextList;
  //static Button       = Button;
}

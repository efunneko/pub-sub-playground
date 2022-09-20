// canvas.js - the main canvas, which fills the full screen

import {jst}        from "jayesstee";

export class Canvas extends jst.Component {

  constructor(app, opts) {
    super();
    this.app           = app;
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

  render() {
    return jst.$div(
      {
        id: "canvas",
        events: {
        },
      },
      this.currPage 
    );
  }

}
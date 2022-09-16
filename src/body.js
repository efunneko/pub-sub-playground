import {jst}        from "jayesstee";

//
// Body - Handles all that is the body
//
export class Body extends jst.Component {
  constructor(app, width, height) {
    super();
    this.app           = app;
    this.width         = width;
    this.height        = height;
    this.setPage("home");
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
        id: "body",
        events: {
        },
      },
      this.currPage 
    );
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.refresh();
  }

  setPage(page) { 
    switch(page) {
      case "home":
        this.currPage = new Home(this.app);
        break;
      case "other":
        // other stuff
        break;
      default:
        this.currPage = new Home(this.app);
        break;
    }
    this.refresh();
  }

}


// Temp home page - you can delete this
export class Home extends jst.Component {
  constructor(app) {
    super();
    this.app = app;
  }

  cssGlobal() {
    return {
      page$i: {
        fontFamily:      '"Helvetica Neue", Helvetica, Arial, sans-serif',
        padding$px:      0,
        margin$px:       0
      },
    
    };
  }

  render() {
    return jst.$div(
      {
        id: "page",
        events: {
        },
      },
      "Hello, World!"
      );
  }

}

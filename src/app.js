import {jst}                   from "jayesstee";
import {Body}                  from "./body";

const DEBUG_MODE = true;

export class App extends jst.Component {
  constructor(specs) {
    super();
    
    this.title              = "Jayesstee Starter";
    this.alerts             = [];
          
    this.width              = window.innerWidth;
    this.height             = window.innerHeight;

    this.debug              = DEBUG_MODE;
 
    this.body               = new Body(this, this.width, this.height, this.fontScale);

    // Listen for window resize events
    window.onresize = e => this.resize();

  }
 
  render() {
    return jst.$div(
      {id: "app"},
      this.body,
    );
  }

  resize() {
    // Need a small timeout for iOS or the dimensions are wrong
    setTimeout(() => {
      this.width        = window.innerWidth;
      this.height       = window.innerHeight;
      this.body.resize(this.width, this.height);
      this.refresh();
    }, 100);
  }


}


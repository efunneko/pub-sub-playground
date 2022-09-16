import {jst}                   from "jayesstee";
import Navigo                  from "navigo";
import {Header}                from "./header";
import {Support}               from "./support";
import {About}                 from "./about";
import {Home}                  from "./home";
import {FAQ}                   from "./faq";
import {Tutorials}             from "./tutorials";

const DEBUG_MODE = false;

export class MainApp extends jst.Component {
  constructor(specs) {
    super();
    
    this.title              = "Hidden Artist";
          
    this.debug              = DEBUG_MODE;

    this.currPage           = undefined;

    this.router             = new Navigo("/", {hash: true});

    this.header             = new Header(this, this.width, this.height);

    // Start the router
    this.initRouter();
    this.router.resolve();

  }

  cssGlobal() {
    return {
      body: {
        fontFamily:      '"Helvetica Neue", Helvetica, Arial, sans-serif',
        color:           'black',
        backgroundColor: 'white',
        padding$px:      0,
        margin$px:       0,
        maxWidth$px:     800,
        margin:          'auto'
      },
      page$c: {
        margin$pt: [30, 15, 0, 15]
      }
      
    };
  }
  
  render() {
    return jst.$div(
      {id: "app"},
      this.header,
      jst.$div(
        {cn: 'page'},
        this.currPage
      )
    );
  }

  initRouter() {
    //let self = this;
    this.router.on("/",          () => {this.router.navigate("/home")});
    this.router.on("/home",      () => {this.currPage = new Home(this);      this.refresh()});
    this.router.on("/faq",       () => {this.currPage = new FAQ(this);       this.refresh()});
    this.router.on("/about",     () => {this.currPage = new About(this);     this.refresh()});
    this.router.on("/support",   () => {this.currPage = new Support(this);   this.refresh()});
    this.router.on("/tutorials", () => {this.currPage = new Tutorials(this); this.refresh()});
  }

  navigate(location) {
    this.router.navigate("/" + location)
  }

  getTitle() {
    return this.title;
  }


}


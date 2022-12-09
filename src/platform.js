// platform.js - Determine and save whether the app is running on a mobile device, what type of device, and what OS

export class Platform {
  constructor() {
    this.isMobile  = false;
    this.isIOS     = false;
    this.isAndroid = false;

    this.isDesktop = false;
    this.isChrome  = false;
    this.isFirefox = false;
    this.isSafari  = false;
    this.isEdge    = false;    

    this.platform  = null;
    this.os        = null;

    this.init();

  }

  init() {
    // Determine and save whether the app is running on a mobile device, what type of device, and what OS
    this.platform = "desktop";
    this.os = "unknown";

    if (navigator.userAgent.match(/Android/i)) {
      this.isMobile = true;
      this.isAndroid = true;
      this.platform = "mobile";
      this.os = "android";
    }
    else if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
      this.isMobile = true;
      this.isIOS = true;
      this.platform = "mobile";
      this.os = "ios";
    }
    else if (navigator.userAgent.match(/BlackBerry/i)) {
      this.isMobile = true;
      this.platform = "mobile";
      this.os = "blackberry";
    }
    else if (navigator.userAgent.match(/IEMobile/i)) {
      this.isMobile = true;
      this.platform = "mobile";
      this.os = "windows";
    }
    else if (navigator.userAgent.match(/Opera Mini/i)) {
      this.isMobile = true;
      this.platform = "mobile";
      this.os = "opera";
    }
    else if (navigator.userAgent.match(/webOS/i)) {
      this.isMobile = true;
      this.platform = "mobile";
      this.os = "webos";
    }
    else if (navigator.userAgent.match(/Windows Phone/i)) {
      this.isMobile = true;
      this.platform = "mobile";
      this.os = "windows";
    }
    else if (navigator.userAgent.match(/Windows/i)) {
      this.isDesktop = true;
      this.platform = "desktop";
      this.os = "windows";
    }
    else if (navigator.userAgent.match(/Mac/i)) {
      this.isDesktop = true;
      this.platform = "desktop";
      this.os = "mac";
    }
    else if (navigator.userAgent.match(/Linux/i)) {
      this.isDesktop = true;
      this.platform = "desktop";
      this.os = "linux";
    }
    else if (navigator.userAgent.match(/CrOS/i)) {
      this.isDesktop = true;
      this.platform = "desktop";
      this.os = "chromeos";
    }
    else if (navigator.userAgent.match(/X11/i)) {
      this.isDesktop = true;
      this.platform = "desktop";
      this.os = "unix";
    }
    else {
      this.isDesktop = true;
      this.platform = "desktop";
      this.os = "unknown";
      console.warn("Unknown platform", navigator.userAgent);
    }
  }

}

// utils.js - utility functions

import * as THREE      from 'three';


export let utils = {

  // Converts a multi-line string to a texture, width and height
  //  Params: opts: {
  //            text: string,
  //            width: number,    // optional - auto-sized if not present
  //            height: number,   // optional - auto-sized if not present
  //            font: string,
  //            fontSize: number,
  //            color: string,
  //            backgroundColor: string,
  //            padding: number,
  //            margin: number,
  //            align: string,
  //            valign: string,
  // } 
  textToTexture: (opts) => {

    // Set defaults
    opts.fontSize        = opts.fontSize || 12;
    opts.font            = opts.font || 'Arial';
    opts.color           = opts.color || 'black';
    opts.backgroundColor = opts.backgroundColor || 'white';
    opts.padding         = opts.padding || 0;
    opts.margin          = opts.margin || 0;
    opts.align           = opts.align || 'left';
    opts.valign          = opts.valign || 'top';
    
    // Convert fontSize to a number if it is a string
    if (typeof opts.fontSize === 'string') {
      opts.fontSize = parseInt(opts.fontSize);
    }

    let canvas = document.createElement("canvas");
    let ctx    = canvas.getContext("2d");
    let font   = opts.fontSize + "px " + opts.font;
    ctx.font   = font;
    let lines  = opts.text.split(/\n/);
    let width  = 0;
    let height = 0;

    for (let i=0; i<lines.length; i++) {
      let w = ctx.measureText(lines[i]).width;
      if (w > width) width = w;
      height += opts.fontSize;
    }

    width  += opts.padding * 2 + opts.margin * 2;
    height += opts.padding * 2 + opts.margin * 2 + opts.fontSize/4;

    if (opts.width) width = opts.width;
    if (opts.height) height = opts.height;

    canvas.width  = width;
    canvas.height = height;

    ctx.font      = font;

    // Fill the background
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = opts.color;

    let x = opts.padding + opts.margin;
    let y = opts.fontSize + opts.padding + opts.margin;

    // Add the text
    for (let i=0; i<lines.length; i++) {
      let w = ctx.measureText(lines[i]).width;
      if (opts.align == "center") x = (width - w) / 2;
      if (opts.align == "right") x = width - w;
      ctx.fillText(lines[i], x, y);
      y += opts.fontSize;
    }

    let texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return {texture: texture, width: width, height: height};
  },

  // Using FontAwesome, create a texture from a font awesome icon
  //  Params: opts: {
  //            icon: string,
  //            width: number,    // optional - auto-sized if not present
  //            height: number,   // optional - auto-sized if not present
  //            fontSize: number,
  //            color: string,
  //            backgroundColor: string,
  //            padding: number,
  //            margin: number,
  //            align: string,
  //            valign: string,
  // }
  getFontAwesomeIconChar: (name) => {
    var stylesheets = Array.from(document.styleSheets);
    var rules = stylesheets.map(function(ss) {
      return ss && ss.cssRules ? Array.from(ss.cssRules) : [];
    })
    rules = [].concat.apply([], rules);
  
    var style = rules.find(function (r) {
      return r.selectorText && r.selectorText.endsWith(name + "::before");
    }).style;
    return style.content.substr(1,1);
  },

  faToTexture: (opts) => {
    opts.text = '\uf047';
    opts.font = '14px FontAwesome';
    return utils.textToTexture(opts);
  },

  createRoundedBoxGeometry: (width, height, depth, radius0, smoothness) => {
    let shape = new THREE.Shape();
    let eps = 0.00001;
    let radius = radius0 - eps;
    shape.absarc( eps, eps, eps, -Math.PI / 2, -Math.PI, true );
    shape.absarc( eps, height -  radius * 2, eps, Math.PI, Math.PI / 2, true );
    shape.absarc( width - radius * 2, height -  radius * 2, eps, Math.PI / 2, 0, true );
    shape.absarc( width - radius * 2, eps, eps, 0, -Math.PI / 2, true );
    let geometry = new THREE.ExtrudeGeometry( shape, {
      steps: 1,
      depth: depth - radius0 * 2,
      bevelEnabled: true,
      bevelSegments: smoothness * 2,
      bevelSize: radius,
      bevelThickness: radius0,
      curveSegments: smoothness
    });
    
    geometry.center();
    
    return geometry;
  },
  
  // Rotates a point around a specified point given by an angle in radians
  rotatePoint: (cx, cy, x, y, angle) => {
    var s = Math.sin(angle);
    var c = Math.cos(angle);

    // translate point back to origin:
    x -= cx;
    y -= cy;

    // rotate point
    var xnew = x * c - y * s;
    var ynew = x * s + y * c;

    // translate point back:
    x = xnew + cx;
    y = ynew + cy;
    return [x, y];
  },

  adjustRotationForPhysics: (angle) => {
    return -angle
  },

  // Return a GUID
  guid: () => {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  },
  

};

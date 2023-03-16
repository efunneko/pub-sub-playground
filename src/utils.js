// utils.js - utility functions

import * as THREE      from 'three';

const seqNums = {};

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
    opts.marginTop       = opts.marginTop || opts.margin;
    opts.marginBottom    = opts.marginBottom || opts.margin;
    opts.marginLeft      = opts.marginLeft || opts.margin;
    opts.marginRight     = opts.marginRight || opts.margin;
    opts.align           = opts.align || 'left';
    opts.valign          = opts.valign || 'top';

    let lines  = opts.text.split(/\n|\\n/);

    if (opts.valign == 'middle') {
      if (opts.height) {
        opts.marginTop = (opts.height - opts.fontSize*lines.length) / 2;
        opts.marginBottom = opts.marginTop;
      }
      else {
        opts.marginTop = opts.marginBottom = opts.margin;
      }
    }
    
    // Convert fontSize to a number if it is a string
    if (typeof opts.fontSize === 'string') {
      opts.fontSize = parseInt(opts.fontSize);
    }

    let canvas = document.createElement("canvas");
    let ctx    = canvas.getContext("2d");
    let font   = opts.fontSize + "px " + opts.font;
    ctx.font   = font;
    let width  = 0;
    let height = 0;

    for (let i=0; i<lines.length; i++) {
      let w = ctx.measureText(lines[i]).width;
      if (w > width) width = w;
      height += opts.fontSize;
    }

    width  += opts.padding * 2 + opts.marginLeft + opts.marginRight;
    height += opts.padding * 2 + opts.marginTop + opts.marginBottom + opts.fontSize/4;

    if (opts.width) width = opts.width;
    if (opts.height) height = opts.height;

    canvas.width  = width;
    canvas.height = height;

    ctx.font      = font;

    // Fill the background
    // If the color is specified as "color-color", then do half and half
    let colors = opts.backgroundColor.split('-');
    if (colors.length == 2) {
      // Fill half the background with the first color
      ctx.fillStyle = colors[0];
      ctx.fillRect(0, 0, width/2, height);

      // Fill the other half with the second color
      ctx.fillStyle = colors[1];
      ctx.fillRect(width/2, 0, width/2, height);
    }
    else {
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = opts.color;

    let x = opts.padding + opts.marginLeft;
    let y = opts.fontSize + opts.padding + opts.marginTop;

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

  // Resolve the expression by substituting the variables and sub-expressions
  // Sub-expressions are in the form of ${functionName(arg1, arg2, ...)}
  // The following functions are supported:
  //   - seqNum(name, start, step) - returns the next sequential number
  //   - random(start, end) - returns a random number between start and end
  //   - topicLevel(level) - returns the text at that topic level 
  //   - now() - returns the current date/time is milliseconds since epoch

  // Variables are in the form of ${varname}
  resolveExpression: (expression, variables) => {
    let re = /\$\{([^}]+)\}/g;
    let match;
    let result = expression;
    while (match = re.exec(expression)) {
      let expr = match[1];
      let value = utils.resolveSubExpression(expr, variables);
      result = result.replace(match[0], value);
    }
    return result;
  },

  resolveSubExpression: (expr, variables) => {
    let re = /([^(]+)\(([^)]*)\)/;
    let match = re.exec(expr);
    if (match) {
      let func = match[1];
      let args = match[2].split(',').map((arg) => {return arg.trim()});
      switch (func) {
        case 'seqNum':
          return utils.seqNum(args[0], args[1], args[2]);
        case 'random':
          return utils.random(args[0], args[1]);
        case 'var':
          return variables[args[0]];
        case 'attr':
          return variables[args[0]];
        case 'topicLevel':
          return utils.topicLevel(args[0], variables.topic);
        case 'now':
          return utils.now();
        default:
          console.log('Unknown function: ' + func);
          return '';
      }
    } else {
      return variables[expr];
    }
  },

  seqNum: (name, start = 1, step = 1) => {
    if (!seqNums[name]) {
      seqNums[name] = utils.toInt(start, 1);
    } else {
      seqNums[name] += utils.toInt(step, 1);
    }
    return seqNums[name];
  },

  random: (start, end) => {
    return Math.random() * (end - start) + start;
  },

  topicLevel: (level, topic) => {
    let parts = topic.split('/');
    return parts[level];
  },

  now: () => {
    return Date.now();
  },

  toInt: (str, defaultVal) => {
    let val = parseInt(str);
    if (isNaN(val)) {
      return defaultVal;
    } else {
      return val;
    }
  },

  serdes: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },

  getComplementaryColor: (color) => {
    const lookup = {
      'red': 'white',
      'darkred': 'white',
      'green': 'white',
      'blue': 'white',
      'yellow': 'black',
      'cyan': 'white',
      'magenta': 'white',
      'white': 'black',
      'black': 'white',
      'orange': 'black',
      'purple': 'white',
      'pink': 'black',
      'brown': 'white',
      'grey': 'black',
      'lightblue': 'black',
    };
    return lookup[color];
  }

  

};

// note.js - A note is a floating object that can be dragged around containing text


import * as THREE      from 'three'
import {StaticObject}  from './static-object.js'
import {Assets}        from '../assets.js'
import {utils}         from '../utils.js'

const noteZPos       = 10;

export class Note extends StaticObject {
  constructor(app, opts) {
    super(app, opts, [
      {name: "text", type: "textarea", label: "Text", default: "Note"},
      {name: "fontSize", type: "text", label: "Font Size", default: "24"},
      {name: "color", type: "color", label: "Color", default: "#5555ff"},
      {name: "z", type: "numberRange", label: "Height", min: 10, max: 150, default: 10, step: 10},
      {name: "x", type: "hidden"},
      {name: "y", type: "hidden"},
      {name: "rotation", type: "hidden"},      
    ],
    // UI Selection parameters
    {
      moveable: true,
      selectable: true,
      onMove: (obj, pos, info) => this.onMove(obj, pos, info),
      onDown: (obj, pos, info) => this.onDown(obj, pos, info),
      onUp:   (obj, pos, info) => this.onUp(obj, pos, info),
      onDelete: (obj) => this.removeFromWorld(),
    });

    this.type        = "note";

    this.uis    = app.ui.getUiSelection();

    this.create();

  }


  create() {
    super.create();
      
    if (!this.texture) {    
      // Get the texture for the note
      const {texture, height, width} = utils.textToTexture({
        text: this.text, 
        width: this.width, 
        height: this.height,
        fontSize: this.fontSize,
        padding: 5,
        color: 'white',
        backgroundColor: this.color,
      });

      this.texture = texture;
      this.width   = width;
      this.height  = height;
    }

    // Create the geometry for the note
    const geometry = new THREE.BoxGeometry(this.width, this.height, 2);

    // Create the material
    const material = new THREE.MeshStandardMaterial({
      map:               this.texture,
      metalness:         0,
      roughness:         1,
      //transmission:      0.3,
      //thickness:         0.5,
    });

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

    // If useShadows is true, then cast and receive shadows
    mesh.castShadow    = this.useShadows;
    mesh.receiveShadow = this.useShadows;

    // Add the mesh to the dynamic group
    this.group.add(mesh);

    // Add the frame
    this.createFrame(this.width, this.height);

    // Add the stick
    //this.createStick();

    //this.z = this.zPos;
    this.group.position.set(this.x, this.y, this.z);

  }

  createStick() {
    const stickMaterial = new THREE.MeshStandardMaterial({
      map:               Assets.textures.woodTexture.albedo,
      roughnessMap:      Assets.textures.woodTexture.rough,
      metalness:         0.1,
      roughness:         1,
    });

    const stick = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, noteZPos, 32), stickMaterial);
    stick.position.set(0, 0, -noteZPos/2-10);
    stick.rotation.x = Math.PI/2;
    stick.castShadow    = this.useShadows;
    stick.receiveShadow = this.useShadows;
    this.group.add(stick);
  }

  saveConfigForm(form) {
    super.saveConfigForm(form);
    this.redraw();
  }

  destroy() {
    super.destroy();
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    this.width   = null;
    this.height  = null;
  }

  createFrame(width, height) {
    // Build a simple wood textured frame around the note, using 4 cylinders
    const radius = 3;

    const frameMaterial = new THREE.MeshStandardMaterial({
      map:               Assets.textures.woodTexture.albedo,
      roughnessMap:      Assets.textures.woodTexture.rough,
      metalness:         0.1,
      roughness:         1,
    });

    const ballMaterial = new THREE.MeshStandardMaterial({
      map:          Assets.textures.brass.albedo,
      roughnessMap: Assets.textures.brass.roughness,
      metalnessMap: Assets.textures.brass.metallic,      
      normalMap:    Assets.textures.brass.normal,
      envMap:            Assets.textures.envMap,
      envMapIntensity:   0.35,
      //metalness: 0.3,
      //roughness: 0,
    });

    // Create the top and bottom frames
    const topFrame = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width + 2 * radius, 32), frameMaterial);
    topFrame.position.set(0, height/2 + radius, 0);
    topFrame.rotation.z = Math.PI/2;
    topFrame.castShadow    = this.useShadows;
    topFrame.receiveShadow = this.useShadows;
    this.group.add(topFrame);

    const bottomFrame = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width + 2 * radius, 32), frameMaterial);
    bottomFrame.position.set(0, -height/2 - radius, 0);
    bottomFrame.rotation.z = Math.PI/2;
    bottomFrame.castShadow    = this.useShadows;
    bottomFrame.receiveShadow = this.useShadows;
    this.group.add(bottomFrame);

    // Create the left and right frames
    const leftFrame = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height + 2 * radius, 32), frameMaterial);
    leftFrame.position.set(-width/2 - radius, 0, 0);
    leftFrame.castShadow    = this.useShadows;
    leftFrame.receiveShadow = this.useShadows;
    this.group.add(leftFrame);

    const rightFrame = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height + 2 * radius, 32), frameMaterial);
    rightFrame.position.set(width/2 + radius, 0, 0);
    rightFrame.castShadow    = this.useShadows;
    rightFrame.receiveShadow = this.useShadows;
    this.group.add(rightFrame);

    // Add four balls on the corners

    const balls = [];
    balls.push(new THREE.Mesh(new THREE.SphereGeometry(radius*1.6, 32, 32), ballMaterial));
    balls.push(new THREE.Mesh(new THREE.SphereGeometry(radius*1.6, 32, 32), ballMaterial));
    balls.push(new THREE.Mesh(new THREE.SphereGeometry(radius*1.6, 32, 32), ballMaterial));
    balls.push(new THREE.Mesh(new THREE.SphereGeometry(radius*1.6, 32, 32), ballMaterial));

    balls[0].position.set(-width/2 - radius, height/2 + radius, 0);
    balls[1].position.set(width/2 + radius, height/2 + radius, 0);
    balls[2].position.set(-width/2 - radius, -height/2 - radius, 0);
    balls[3].position.set(width/2 + radius, -height/2 - radius, 0);

    balls.forEach(ball => {
      ball.castShadow    = this.useShadows;
      ball.receiveShadow = this.useShadows;
      this.group.add(ball);
    });


  }
      

}
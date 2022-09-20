// board.js - Object definition for the main board in which all the action happens

import * as THREE     from 'three' 
import {StaticObject}         from './static-object.js'
import {Block}                from './block.js'


const backgroundTextureUrl = "images/textures/..."
const edgeWidth            = 0.5
const edgeDepth            = 1

export class Board extends StaticObject {
  constructor(app, opts) {
    super(app, opts)

    // Dimensions of board are given with two corners
    this.x1       = opts.x1;
    this.y1       = opts.y1;
    this.x2       = opts.x2;
    this.y2       = opts.y2;

    // The board never rotates
    this.rotation = 0;

    this.create()

  }

  create() {

    const loader = new THREE.TextureLoader();

    this.woodTexture = {};
    
    this.woodTexture.albedo = loader.load("images/textures/TexturesCom_Wood_Rough_1K_albedo.png");
    this.woodTexture.normal = loader.load("images/textures/TexturesCom_Wood_Rough_1K_normal.png");
    this.woodTexture.rough  = loader.load("images/textures/TexturesCom_Wood_Rough_1K_roughness.png");

    this.createBack();
    this.createEdge(this.x1, this.y1, this.x2, this.y1);
    this.createEdge(this.x1, this.y1, this.x1, this.y2);
    this.createEdge(this.x1, this.y2, this.x2, this.y2);
    this.createEdge(this.x2, this.y1, this.x2, this.y2);
  }

  createBack() {

    // Back of the board
    const width    = this.x2 - this.x1;
    const height   = this.y2 - this.y1;
    const depth    = 1;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    //const geometry = new THREE.TorusGeometry(4, 0.5, 8, 26, 3.14);
    const material = new THREE.MeshStandardMaterial({
      map:          this.woodTexture.albedo,
      normalMap:    this.woodTexture.normal,
      normalScale:  new THREE.Vector2( 1, - 1 ), 
      roughnessMap: this.woodTexture.rough,
      metalness:    0,
      roughness:    1,
    });
    const back     = new THREE.Mesh(geometry, material);

    // Position it so that the top left corner is at x1, y1
    back.position.x = this.x1 + width / 2;
    back.position.y = this.y1 + height / 2;
    back.position.z = -depth / 2;

    // Receive shadows if turned on
    back.receiveShadow = this.useShadows;

    // Add it to the scene
    this.scene.add(back);
    
  }

  createEdge(x1, y1, x2, y2) {

    // Create a box for the edge
    let width;
    let height;
    const depth    = edgeDepth;

    if (x1 == x2) {
      width  = edgeWidth;
      height = Math.abs(y2 - y1) - edgeWidth;
    } else {
      width  = Math.abs(x2 - x1) + edgeWidth;
      height = edgeWidth;
    }

    const geometry = new THREE.BoxGeometry(width, height, depth);

    const material = new THREE.MeshStandardMaterial({
      map:          this.woodTexture.albedo,
      normalMap:    this.woodTexture.normal,
      normalScale:  new THREE.Vector2( 1, - 1 ),
      roughnessMap: this.woodTexture.rough,
      metalness:    0,
      roughness:    1,
    });

    // Tile the texture
    material.map.wrapS = THREE.RepeatWrapping;
    material.map.wrapT = THREE.RepeatWrapping;
    

    const edge     = new THREE.Mesh(geometry, material);

    // Position it so that the top left corner is at x1, y1
    edge.position.x = (x1 + x2) / 2;
    edge.position.y = (y1 + y2) / 2;
    edge.position.z = edgeDepth / 2;

    // Receive shadows if turned on
    edge.receiveShadow = this.useShadows;
    edge.castShadow    = this.useShadows;

    this.scene.add(edge);

  }

}
// assets.js - central place to load all assets

import * as THREE     from 'three'
import {FBXLoader}    from 'three/examples/jsm/loaders/FBXLoader'

export class Assets {
  static textures = {}
  static models   = {}

  static loadAssets() {
    return Promise.all([
      Assets.loadTextures(),
      Assets.loadModels(),
    ])
  }
  
  static loadTextures() {    
    const loader = new THREE.TextureLoader();

    // Load all textures
    Assets.textures = {
      woodTexture: {}
    };

    return Promise.all([
      loader.loadAsync("images/textures/TexturesCom_Wood_Rough_1K_albedo.png").then((texture) => {
        Assets.textures.woodTexture.albedo = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Wood_Rough_1K_normal.png").then((texture) => {
        Assets.textures.woodTexture.normal = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Wood_Rough_1K_roughness.png").then((texture) => {
        Assets.textures.woodTexture.rough = texture;
      })
    ])
  }

  static loadModels() {
    let loader = new FBXLoader();
    return Promise.all([
      // Load the screw head
      loader.loadAsync("images/models/bolts_and_screws.fbx").then((model) => {
        const screwHead = model.children.find((child) => child.name === 'Sphere04')
        Assets.models.screwHead = screwHead
      }),
    ])
  }

}
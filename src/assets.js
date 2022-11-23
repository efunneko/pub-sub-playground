// assets.js - central place to load all assets

import * as THREE     from 'three'
import {FBXLoader}    from 'three/examples/jsm/loaders/FBXLoader'
import {RGBELoader}         from 'three/examples/jsm/loaders/RGBELoader.js';

export class Assets {
  static textures = {}
  static models   = {}

  static loadAssets() {
    return Promise.all([
      Assets.loadTextures(),
      Assets.loadModels(),
      Assets.loadRGBEnvMap(),
    ])
  }
  
  static loadTextures() {    
    const loader = new THREE.TextureLoader();

    // Load all textures
    Assets.textures = {
      woodTexture: {},
      stainlessSteelTexture: {},
      brass: {},
    };

    return Promise.all([
      loader.loadAsync("images/textures/TexturesCom_Metal_BrassPolished_1K_albedo2.png").then((texture) => {
        Assets.textures.brass.albedo = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Metal_BrassPolished_1K_normal.png").then((texture) => {
        Assets.textures.brass.normal = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Metal_BrassPolished_1K_roughness.png").then((texture) => {
        Assets.textures.brass.roughness = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Metal_BrassPolished_1K_metallic.png").then((texture) => {
        Assets.textures.brass.metallic = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Wood_Rough_1K_albedo.png").then((texture) => {
        Assets.textures.woodTexture.albedo = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Wood_Rough_1K_normal.png").then((texture) => {
        Assets.textures.woodTexture.normal = texture;
      }),
      loader.loadAsync("images/textures/TexturesCom_Wood_Rough_1K_roughness.png").then((texture) => {
        Assets.textures.woodTexture.rough = texture;
      }),
      loader.loadAsync("images/textures/used-stainless-steel2_small_albedo.png").then((texture) => {
        Assets.textures.stainlessSteelTexture.albedo = texture;
      }),
      loader.loadAsync("images/textures/used-stainless-steel2_small_roughness.png").then((texture) => {
        Assets.textures.stainlessSteelTexture.rough = texture;
      }),
    ])
  }

  static loadRGBEnvMap() {
    //let env = "studio_small_08_2k.hdr";
    let env = "studio_country_hall_2k.hdr";

    return new Promise((resolve, reject) => {  
      new RGBELoader()
      .setPath( 'images/textures/' )
      .load(env, (texture) => {

        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.flipY = true;

        Assets.textures.envMap = texture;

        //this.scene.background = new THREE.Color(0xccccaa);
        //this.renderer.setClearColor(0xccccaa, 1);
        //this.scene.environment = texture;

        resolve();

      });
    });

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
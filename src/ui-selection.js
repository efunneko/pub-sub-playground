// ui-selection.js - Handles the selection and movement of objects in the world

// This class supports the registration of objects that can be selected and moved
// Each object has the following properties, stored in their userData property:
//  - moveable:          true if the object can be moved
//  - rotatable:         true if the object can be rotated
//  - selectable:        true if the object can be clicked on to have a persistent selection
//  - selectedMaterial:  The material to use when the object is selected
//  - onDown:            A callback function that is called when the object has the mouse down event
//  - onDragStart:       A callback function that is called when the object has the mouse drag start event
//  - onRotateStart:     A callback function that is called when the object has the mouse rotate start event
//  - onRotate:          A callback function that is called when the object has the mouse rotate event
//  - onMove:            A callback function that is called when the object has the mouse move event
//  - onUp:              A callback function that is called when the object has the mouse up event
//  - onSelected:        A callback function that is called when the object has been selected
//  - onUnselected:      A callback function that is called when the object has been unselected
// TBD - add support for scaling
// TBD - add property for settings menu

import * as THREE from 'three'


export class UISelection {
  constructor(app, opts) {
    this.app                = app;
    this.camera             = opts.camera;
    this.scene              = opts.scene;
    this.selectAllowedRange = opts.selectAllowedRange || 5;
    
    this.state = {
      selectedObject: null,
      isDragging:     false,
      posAtMouseDown: null,
      rotAtMouseDown: null,
    }

  }

  setScene(scene) {
    this.scene = scene;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  // Register an object for selection
  registerObject(obj, opts) {
    let uisInfo = {
      moveable:      opts.moveable,
      rotatable:     opts.rotatable,
      selectable:    opts.selectable,
      onDown:        opts.onDown,
      onDelete:      opts.onDelete,
      onDragStart:   opts.onDragStart,
      onRotateStart: opts.onRotateStart,
      onRotate:      opts.onRotate,
      onMove:        opts.onMove,
      onUp:          opts.onUp,
      onSelected:    opts.onSelected,
      onUnselected:  opts.onUnselected,
      selectedMaterial: opts.selectedMaterial,
    };

    this.setUisInfo(obj, uisInfo);

  }

  // Unregister the object
  unregisterObject(obj) {
    this.setUisInfo(obj, null);
  }

  // Register for specific pointer events
  addPointerEvents(el) {
    // Register all the pointer events
    el.addEventListener("pointerdown", (e) => this.onDown(e));
    el.addEventListener("pointerup",   (e) => this.onUp(e));
    el.addEventListener("pointermove", (e) => this.onMove(e));

    // Also register for key events to know when Delete is pressed
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  // Handle the mouse down event
  onDown(e) {

    // Get the object that was clicked on
    const intersect = this.getObjectIntersectFromEvent(e);
    const obj       = intersect.object;

    // If there is a persistent selection, then we want to unselect it unless it was clicked on
    if (this.state.persistentSelected && obj !== this.state.selectedObject) {
      this.unselectObject(this.state.selectedObject);
    }

    // Only handle the event if the object is selectable
    if (obj && obj.userData && obj.userData.uisInfo) {
      const uisInfo = obj.userData.uisInfo;

      // Save the object that was clicked on
      this.state.selectedObject = obj;

      // Mark this as persistent selectable - it will be set to false if the mouse moves too much
      this.state.persistentSelectable = uisInfo.selectable;

      // Get the x,y in 3d space for the z of the object
      this.state.posAtMouseDown = this.getMousePosGivenZ(e, intersect.point.z);
      this.state.rotAtMouseDown = obj.rotation.clone();

      if (uisInfo.moveable) {
        this.state.isDragging = true;
      }

      // Call the onDown callback if present
      if (uisInfo.onDown) {
        uisInfo.onDown(obj, this.state.posAtMouseDown, this.state);
      }
    }

  }

  // Handle the mouse up event - note that we only care about the object that was clicked on
  onUp(e) {

    // Get the object that was clicked on
    const obj = this.state.selectedObject;

    if (obj && obj.userData && obj.userData.uisInfo) {
      const uisInfo = obj.userData.uisInfo;

      // Call the onUp callback if present
      if (uisInfo.onUp) {
        const pos = this.getMousePosGivenZ(e, this.state.posAtMouseDown.z);
        uisInfo.onUp(obj, pos, this.state);
      }

      // If the object is selectable remember that we have a persistent selection
      if (uisInfo.selectable && this.state.persistentSelectable) {
        this.selectObject(obj);
      }
      else {
        this.state.selectedObject = null;
        this.state.persistentSelected = false;
      }

    }

    this.state.isDragging = false;

  }

  // Handle the mouse move event
  onMove(e) {

    if (!this.state.isDragging) {
      return;
    }

    // Get the object that was clicked on
    const obj = this.state.selectedObject;

    if (obj && obj.userData && obj.userData.uisInfo) {
      const uisInfo = obj.userData.uisInfo;

      const pos = this.getMousePosGivenZ(e, this.state.posAtMouseDown.z);

      // If the object is selectable, check to see if the mouse has moved too much
      if (uisInfo.selectable) {
        const dx = pos.x - this.state.posAtMouseDown.x;
        const dy = pos.y - this.state.posAtMouseDown.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 5) {
          this.state.persistentSelectable = false;
        }
      }

      // Call the onMove callback if present
      if (uisInfo.onMove) {
        uisInfo.onMove(obj, pos, this.state);
      }

    }

  }

  onKeyDown(e) {
    if (e.key === "Delete" || e.key === "Backspace") {
      this.deleteSelectedObject();
    }
  }

  // Select an object
  selectObject(obj) {
    if (obj && obj.userData && obj.userData.uisInfo) {
      const uisInfo = obj.userData.uisInfo;

      // Call the onSelected callback if present
      if (uisInfo.onSelected) {
        uisInfo.onSelected(obj);
      }

      // Remember that this object is selected
      this.state.selectedObject     = obj;
      this.state.persistentSelected = true;

      // If the object has a selected material, then use it
      if (uisInfo.selectedMaterial) {
        uisInfo.unselectedMaterial = obj.material;
        obj.material               = uisInfo.selectedMaterial;
      }
    }
  }


  // Unselect the object
  unselectObject(obj) {
    if (obj && obj.userData && obj.userData.uisInfo) {
      const uisInfo = obj.userData.uisInfo;

      // Call the onUnselected callback if present
      if (uisInfo.onUnselected) {
        uisInfo.onUnselected(obj);
      }

      // Clear the persistent selection
      this.state.persistentSelected = false;

      // If there is an unselcted material, then set it
      if (uisInfo.unselectedMaterial) {
        obj.material = uisInfo.unselectedMaterial;
      }
    }
  }

  // Delete the selected object
  deleteSelectedObject() {
    const obj = this.state.selectedObject;
    if (obj && obj.userData && obj.userData.uisInfo && this.state.persistentSelected) {
      const uisInfo = obj.userData.uisInfo;

      // Call the onDelete callback if present
      if (uisInfo.onDelete) {
        uisInfo.onDelete(obj);
      }
    }
  }


  // Given a mouse event, return the object under the mouse
  getObjectIntersectFromEvent(e) {
    // Get the mouse position
    let mouse = new THREE.Vector2();
    mouse.x = (e.offsetX / e.target.clientWidth) * 2 - 1;
    mouse.y = -(e.offsetY / e.target.clientHeight) * 2 + 1;

    // Get the raycaster
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Get the intersected object
    let intersects = raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      return intersects[0]
    }
  }

  // This will return the x,y position of the mouse in 3d space given the z
  // It does not use an intersect, but rather a raycast from the camera
  getMousePosGivenZ(event, targetZ) {
    let vec = new THREE.Vector3();
    let pos = new THREE.Vector3();
    
    vec.set(
        ( event.clientX / window.innerWidth ) * 2 - 1,
        - ( event.clientY / window.innerHeight ) * 2 + 1,
        0.5 );
    
    vec.unproject( this.camera );
    
    vec.sub( this.camera.position ).normalize();
    
    var distance = (targetZ - this.camera.position.z) / vec.z;
    
    pos.copy( this.camera.position ).add( vec.multiplyScalar( distance ) );    
    return pos;
  }

  getUisInfo(obj) {
    if (obj && obj.userData && obj.userData.uisInfo) {
      return obj.userData.uisInfo;
    }
    return null;
  }

  setUisInfo(obj, uisInfo) {
    if (obj && obj.userData) {
      obj.userData.uisInfo = uisInfo;
    }
  }


}


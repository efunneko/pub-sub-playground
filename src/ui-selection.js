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

const defaultSelectAllowedRange = 15

export class UISelection {
  constructor(app, ui, opts) {
    this.app                = app;
    this.ui                 = ui;
    this.camera             = opts.camera;
    this.scene              = opts.scene;
    this.selectAllowedRange = opts.selectAllowedRange || defaultSelectAllowedRange;
    
    this.state = {
      selectedMesh:   null,
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

  // Register a mesh for selection
  registerMesh(mesh, opts) {
    let uisInfo = {
      moveable:         opts.moveable,
      rotatable:        opts.rotatable,
      selectable:       opts.selectable,
      onDown:           opts.onDown,
      onDelete:         opts.onDelete,
      onDragStart:      opts.onDragStart,
      onRotateStart:    opts.onRotateStart,
      onRotate:         opts.onRotate,
      onMove:           opts.onMove,
      onUp:             opts.onUp,
      onSelected:       opts.onSelected,
      onUnselected:     opts.onUnselected,
      selectedMaterial: opts.selectedMaterial,
      configForm:       opts.configForm,
      object:           opts.object,
    };

    if (!opts.configForm && opts.object) {
      uisInfo.configForm = {
        save: (form) => opts.object.saveConfigForm(form),
        obj: opts.object,
        fields: opts.object.getObjectParams(),
      }
    }

    this.setUisInfo(mesh, uisInfo);

  }

  // Unregister the mesh
  unregisterMesh(mesh) {
    this.setUisInfo(mesh, null);
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

    this.mouseDown = true;

    // Get the mesh that was clicked on
    const intersect = this.getMeshIntersectFromEvent(e);
    if (!intersect) {
      return;
    }

    const mesh       = intersect.object;

    // If there is a persistent selection, then we want to unselect it unless it was clicked on
    if (this.state.persistentSelected && mesh !== this.state.selectedMesh) {
      this.unselectMesh(this.state.selectedMesh);
    }

    // Only handle the event if the object is selectable
    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      const uisInfo = mesh.userData.uisInfo;

      // Save the mesh that was clicked on
      this.state.selectedMesh = mesh;

      // Mark this as persistent selectable - it will be set to false if the mouse moves too much
      this.state.persistentSelectable = uisInfo.selectable;

      // Get the x,y in 3d space for the z of the mesh
      this.state.posAtMouseDown = this.getMousePosGivenZ(e, intersect.point.z);
      this.state.rotAtMouseDown = mesh.rotation.clone();
      this.state.prevPos        = this.state.posAtMouseDown.clone();

      if (uisInfo.moveable) {
        this.state.isDragging     = true;
      }

      // Call the onDown callback if present
      if (uisInfo.onDown) {
        this.state.ctrlKey  = e.ctrlKey;
        uisInfo.onDown(mesh, this.state.posAtMouseDown, this.state);
      }
    }

  }

  // Handle the mouse up event - note that we only care about the mesh that was clicked on
  onUp(e) {

    if (!this.mouseDown) {
      return;
    }

    this.mouseDown = false;

    // Get the mesh that was clicked on
    const mesh = this.state.selectedMesh;

    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      const uisInfo = mesh.userData.uisInfo;

      // If the mesh is selectable remember that we have a persistent selection
      if (uisInfo.selectable && this.state.persistentSelectable) {
        this.selectMesh(mesh);
      }
      else {
        this.state.selectedMesh = null;
        this.state.persistentSelected = false;
      }

      // Call the onUp callback if present
      if (uisInfo.onUp) {
        const pos = this.getMousePosGivenZ(e, this.state.posAtMouseDown.z);
        this.state.ctrlKey = e.ctrlKey;
        uisInfo.onUp(mesh, pos, this.state);
      }

    }

    this.state.isDragging     = false;

  }

  // Handle the mouse move event
  onMove(e) {

    if (!this.state.isDragging) {
      return;
    }

    // Get the mesh that was clicked on
    const mesh = this.state.selectedMesh;

    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      const uisInfo = mesh.userData.uisInfo;

      const pos = this.getMousePosGivenZ(e, this.state.posAtMouseDown.z);

      // If the mesh is selectable, check to see if the mouse has moved too much
      if (uisInfo.selectable) {
        const dx = pos.x - this.state.posAtMouseDown.x;
        const dy = pos.y - this.state.posAtMouseDown.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.selectAllowedRange) {
          this.state.persistentSelectable = false;
        }
      }

      // Call the onMove callback if present
      if (uisInfo.onMove) {
        this.state.deltaPos = pos.clone().sub(this.state.prevPos);
        this.state.ctrlKey  = e.ctrlKey;
        uisInfo.onMove(mesh, pos, this.state);
        this.state.prevPos = pos;
      }

    }

  }

  onKeyDown(e) {
    //if (e.key === "Delete" || e.key === "Backspace") {
    //  this.deleteSelectedMesh();
    //}
  }

  // Select an mesh
  selectMesh(mesh) {
    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      const uisInfo = mesh.userData.uisInfo;

      // Call the onSelected callback if present
      if (uisInfo.onSelected) {
        uisInfo.onSelected(mesh);
      }

      // Remember that this mesh is selected
      this.state.selectedMesh     = mesh;
      this.state.persistentSelected = true;

      // If the mesh has a selected material, then use it
      if (uisInfo.selectedMaterial) {
        uisInfo.unselectedMaterial = mesh.material;
        mesh.material               = uisInfo.selectedMaterial;
      }

      // If there is a config form, then show it
      if (uisInfo.configForm) {
        this.ui.showConfigForm(uisInfo.configForm);
      }

      if (uisInfo.deleteable) {
        this.ui.showDeleteButton();
      }

    }
  }


  // Unselect the mesh
  unselectMesh(mesh) {

    if (!mesh) {
      mesh = this.state.selectedMesh;
    }

    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      const uisInfo = mesh.userData.uisInfo;

      // Call the onUnselected callback if present
      if (uisInfo.onUnselected) {
        uisInfo.onUnselected(mesh);
      }

      // Clear the persistent selection
      this.state.persistentSelected = false;
      this.state.selectedMesh     = null;

      // If there is a config form, then hide it
      this.ui.clearConfigForm();
      
      // If there is an unselcted material, then set it
      if (uisInfo.unselectedMaterial) {
        mesh.material = uisInfo.unselectedMaterial;
      }
    }
  }

  // Delete the selected mesh
  deleteSelectedMesh(force) {
    const mesh = this.state.selectedMesh;
    if (mesh && mesh.userData && mesh.userData.uisInfo && (this.state.persistentSelected || force)) {
      const uisInfo = mesh.userData.uisInfo;

      this.unselectMesh(mesh);

      // Call the onDelete callback if present
      if (uisInfo.onDelete) {
        uisInfo.onDelete(mesh);
      }
    }
  }

  // Called when the pointer up event happens within the delete/trash button
  deletePointerUp(e) {
    // If we are dragging an mesh over the delete button, then delete it
    if (this.state.isDragging) {
      this.deleteSelectedMesh(true);
    }
  }


  // Given a mouse event, return the mesh under the mouse
  getMeshIntersectFromEvent(e) {
    // Get the mouse position
    let mouse = new THREE.Vector2();
    mouse.x = (e.offsetX / e.target.clientWidth) * 2 - 1;
    mouse.y = -(e.offsetY / e.target.clientHeight) * 2 + 1;

    // Get the raycaster
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Get the intersected mesh
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

  getUisInfo(mesh) {
    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      return mesh.userData.uisInfo;
    }
    return null;
  }

  setUisInfo(mesh, uisInfo) {
    if (mesh && mesh.userData) {
      mesh.userData.uisInfo = uisInfo;
    }
  }


}


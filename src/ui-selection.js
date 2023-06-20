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
//  - configForm:        A form to display when the object is selected
//  - object:            The object that is being registered

// Selections come in two types:
//  - Persistent selections: The objects are selected and remain selected
//     o The selection occurs by either clicking on the object or by dragging a selection box over the object
//  - Temporary selections:  The objects are selected and unselected when the mouse is released
//     o The selection occurs by clicking on the object and dragging it
//     o The object is unselected when the mouse is released
//     o The object is moved or rotated when the mouse is dragged
//
// Persistent selections can be either for a single object or for multiple objects. If multiple objects are selected,
// then the selection box is shown and the objects can be moved together. The config form contains a UI that lets the user
// perform alignment operations on the selected objects. If a single object is selected, then the config form is shown
// for that object with the object's configuration parameters.

// Objects vs Meshes
// In the context of this class, an object is a moveable object in the scene such as a barrier or a portal. A mesh is a 3D object that
// is part of the object. A mesh can be clicked on to select the object, however it can have its own callback, which is
// used for things like rotating an object by clicking on a screwhead

import * as THREE from 'three'
import {Group}    from './objects/group.js'

const defaultSelectAllowedRange = 15
const selectionBoxDepth         = 120

export class UISelection {
  constructor(app, ui, opts) {
    this.app                = app;
    this.ui                 = ui;
    this.camera             = opts.camera;
    this.scene              = opts.scene;
    this.selectAllowedRange = opts.selectAllowedRange || defaultSelectAllowedRange;
    
    this.state = {
      selectedMeshes: [],
      isDragging:     false,
      posAtMouseDown: null,
      rotAtMouseDown: null,
      boundingBoxes:  [],
      selectionBox:   null,
    }

  }

  setScene(scene) {
    this.scene = scene;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  // Register meshes or objects for selection
  // The following options are supported:

  // Register an object for selection
  // It is almost the same as registering a mesh, but it also
  // adds the object to a list of selectable objects
  registerObject(object, opts) {
    this.registerMesh(object, opts);
    // Mark this object as globally selectable
    object.userData.uisInfo.globallySelectable = true;
  }

  // Unregister an object
  unregisterObject(object) {
    this.unregisterMesh(object);
  }

  // Register a mesh for selection
  registerMesh(mesh, opts) {
    let uisInfo = Object.assign({}, opts);
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
    el.addEventListener("pointerleave", (e) => this.onUp(e));

    // Handled the mouse scroll event
    el.addEventListener("wheel", (e) => this.onWheel(e));

    // Also register for key events to know when Delete is pressed
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  // Handle the mouse down event
  onDown(e) {

    // Need to know if the shift or control keys are pressed
    const shiftKey = e.shiftKey;
    const ctrlKey  = this.ctrlKey(e)

    // Remember that the mouse is down so we can detect a drag onMove
    this.mouseDown = true;

    // Get the mesh that was clicked on
    const intersect = this.getMeshIntersectFromEvent(e);

    // If there is no intersect with a selectable object, then we are starting a selection box and go no further
    if (!intersect.selectable && !intersect.onDown) {

      // If the control key is pressed, then we are moving the camera
      if (ctrlKey) {
        this.cameraMoveStart(e);
        return;
      }

      this.startSelectionBox(e);

      // If shift is not held down, then unselect all the objects
      if (!shiftKey) {
        this.unselectMeshes();
      }

      return
    }
    
    const mesh    = this.getMeshOrObjectGroup(intersect.mesh);
    const uisInfo = mesh && mesh.userData && mesh.userData.uisInfo;

    this.originalClickedMesh = intersect.mesh;

    // If the mesh is in the list of selected meshes, then don't unselect anything    
    const isAlreadySelected = this.state.selectedMeshes.find(m => {
      const obj1 = this.getObjectFromMesh(m);
      const obj2 = this.getObjectFromMesh(mesh);
      return obj1 != null && obj1 === obj2;
    });
    if (!isAlreadySelected && !shiftKey) {
      this.unselectMeshes();
    }

    // Only handle the event if the object is selectable or needs a callback
    if (intersect.selectable || (uisInfo && uisInfo.onDown)) {

      // Save the mesh that was clicked on
      if (!isAlreadySelected) {
        this.state.activeMesh = mesh;
      }

      // Mark this as persistent selectable - it will be set to false if the mouse moves too much
      this.state.persistentSelectable = uisInfo.selectable;

      // Get the x,y in 3d space for the z of the mesh
      this.state.posAtMouseDown = this.getMousePosGivenZ(e, intersect.point.z);
      this.state.rotAtMouseDown = mesh.rotation.clone();
      this.state.prevPos        = this.state.posAtMouseDown.clone();

      if (uisInfo.moveable) {
        this.state.isDragging     = true;

        // Hide the config form for while we are dragging
        this.ui.hideConfigForm();
      }

      // Call the onDown callback if present
      this.callOnHandlers([mesh, ...this.state.selectedMeshes], "onDown", this.state.posAtMouseDown, this.state);
      // if (uisInfo && uisInfo.onDown) {
      //   this.state.ctrlKey  = e.ctrlKey;
      //   uisInfo.onDown(mesh, this.state.posAtMouseDown, this.state);
      // }

    }

  }

  // Handle the mouse up event - note that we only care about the mesh that was clicked on
  onUp(e) {

    this.state.cameraMoving = false;
    this.ui.unhideConfigForm();

    if (!this.mouseDown) {
      return;
    }

    let selectedMeshes;
    if (this.state.selectionBox) {

      // If the shift key is not pressed, then unselect all the objects
      if (!e.shiftKey) {
        this.unselectMeshes();
      }

      selectedMeshes = this.getMeshesInSelectionBox();

    }
    else if (this.state.activeMesh) {
      selectedMeshes = [this.state.activeMesh];
    }

    this.clearSelectionBox();

    this.mouseDown = false;

    // If we have any selected meshes, handle them
    if (!selectedMeshes || selectedMeshes.length == 0) {
      selectedMeshes = this.state.selectedMeshes;
    }

    selectedMeshes.forEach((mesh) => {

      if (mesh && mesh.userData && mesh.userData.uisInfo) {
        const uisInfo = mesh.userData.uisInfo;

        // If the mesh is selectable remember that we have a persistent selection
        if (uisInfo && uisInfo.selectable && 
          (this.state.persistentSelectable || this.state.selectionBox || this.state.selectedMeshes.length)) {
          this.selectMesh(mesh, selectedMeshes.length == 1);
        }

        // Call the onUp callback if present
        if (uisInfo.onUp) {
          // TODO - this fails if we are in this loop because of a selection box
          const pos = this.getMousePosGivenZ(e, this.state.posAtMouseDown.z);
          this.state.ctrlKey = this.ctrlKey(e);
          uisInfo.onUp(mesh, pos, this.state);
        }

      }

    });

    this.state.isDragging   = false;
    this.state.activeMesh   = null;

  }

  // Handle the mouse move event
  onMove(e) {

    // If we are moving the camera, then do that
    if (this.state.cameraMoving) {
      this.cameraMove(e);
      return;
    }

    if (!this.state.isDragging) {
      if (this.state.selectionBox) {
        this.state.selectionBox.end = this.getMousePosGivenZ(e, selectionBoxDepth);
        this.updateSelectionBox();
      }
      return;
    }

    // Determine how far the mouse has moved
    const pos  = this.getMousePosGivenZ(e, this.state.posAtMouseDown.z);
    const dx   = pos.x - this.state.posAtMouseDown.x;
    const dy   = pos.y - this.state.posAtMouseDown.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // If the mouse has moved too far, then we it isn't eligible for a persistent selection
    if (dist > this.selectAllowedRange && this.state.selectedMeshes.length == 0) {
      this.state.persistentSelectable = false;
    }

    // Find the delta position
    this.state.deltaPos = pos.clone().sub(this.state.prevPos);
    this.state.ctrlKey  = this.ctrlKey(e);
    this.state.prevPos = pos;

    [this.state.activeMesh, ...this.state.selectedMeshes].forEach((mesh, i) => {
      if (!mesh) {
        return;
      }
      if (mesh && mesh.userData && mesh.userData.uisInfo) {
        const uisInfo = mesh.userData.uisInfo;

        // Call the onMove callback if present
        if (uisInfo.onMove) {
          uisInfo.onMove(mesh, pos, this.state);
        }

      }
    })

  }

  // Handle the mouse wheel event
  onWheel(e) {
    // If the control key is pressed, then we are moving the camera
    if (this.ctrlKey(e)) {
      this.app.zoomCamera(e.deltaY);
      // stop propagation so that the page doesn't scroll
      e.stopPropagation();
      e.preventDefault();
    }
    return false;
  }

  // Loop over the meshes and call the given handler on each one
  callOnHandlers(meshes, handlerName, ...args) {
    meshes.forEach((mesh) => {
      if (mesh && mesh.userData && mesh.userData.uisInfo) {
        const uisInfo = mesh.userData.uisInfo;
        if (uisInfo[handlerName]) {
          uisInfo[handlerName](mesh, ...args);
        }
      }
    });
  }

  onKeyDown(e) {
    // Handle CTRL-Z for undo
    if (this.ctrlKey(e) && e.key === "z") {
      this.app.undo();
    }
    //if (e.key === "Delete" || e.key === "Backspace") {
    //  this.deleteSelectedMesh();
    //}
  }

  // Start the camera move
  cameraMoveStart(e) {
    // Remember the mouse position at the start of the move
    this.state.cameraLastCoords = {x: e.clientX, y: e.clientY};
    this.state.cameraMoving     = true;
  }

  // Move the camera
  cameraMove(e) {
    //console.log("cameraMove", pos, this.state.cameraLastCoords);
    const dx  = e.clientX - this.state.cameraLastCoords.x;
    const dy  = e.clientY - this.state.cameraLastCoords.y;

    //this.app.moveCamera(dx, dy);
    this.app.moveCamera(-dx, dy);
    this.state.cameraLastCoords = {x: e.clientX, y: e.clientY};
  }

  // Start the selection box
  startSelectionBox(e) {

    const start = this.getMousePosGivenZ(e, selectionBoxDepth);
    const end   = start;
    start.z     = 0;
    this.state.selectionBox = {
      start: start,
      end:   end,
    }

    this.state.posAtMouseDown = start.clone();

    // Make a list of all the selectable meshes and
    // create a bounding box for each one. This will be used
    // to determine if the selection box contains a mesh
    this.state.selectableObjectsBbox = [];

    // Go over all the groups in the scene and find ones that are globally selectable
    this.scene.children.forEach((group) => {
      if (group.userData && group.userData.uisInfo && group.userData.uisInfo.globallySelectable) {      
        const bbox = new THREE.Box3().setFromObject(group);
        bbox.userData = {mesh: group};
        this.state.selectableObjectsBbox.push(bbox);
      }
    });

  }


  // Select a specific mesh
  // singleSelection - if true, then only a single mesh has been selected
  selectMesh(mesh, singleSelection) {

    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      let uisInfo = mesh.userData.uisInfo;

      // Check if the mesh is in an object group
      const objectGroup = this.getObjectGroupForMesh(mesh);
      if (objectGroup) {
        mesh    = objectGroup.getMesh();
        uisInfo = mesh.userData.uisInfo;
      }

      // If this is a single selection and the mesh is a group, then check
      // if the group is already selected. 
      if (singleSelection && uisInfo.object instanceof Group && this.originalClickedMesh) {        
        // Is the group already selected?
        if (uisInfo.selected) {
          this.unselectMeshes();
          mesh = this.originalClickedMesh;
          uisInfo = mesh.userData.uisInfo;
        }
      }

      // Check if the mesh is already selected
      if (uisInfo.selected) {
        return;
      }

      // Remember that the mesh is selected
      uisInfo.selected = true;

      // Draw a box around the mesh
      //this.drawBoundingBox(mesh);

      // Call the onSelected callback if present
      if (uisInfo.onSelected) {
        uisInfo.onSelected(mesh);
      }

      // Remember that this mesh is selected
      this.state.selectedMeshes.push(mesh);

      // If the mesh has a selected material, then use it
      if (uisInfo.selectedMaterial) {
        uisInfo.unselectedMaterial = mesh.material;
        mesh.material              = uisInfo.selectedMaterial;
      }

      // If there is a config form and there is only one selected mesh, then show the form
      if (uisInfo.configForm && this.state.selectedMeshes.length === 1) {
        this.ui.showConfigForm(uisInfo.configForm);
      }
      else if (this.state.selectedMeshes.length > 1 || (uisInfo.object && uisInfo.object.isGroup)) {
        this.ui.clearConfigForm();
        // Convert the selected meshes into a list of their objects
        const objects = this.state.selectedMeshes.map(mesh => mesh.userData.uisInfo.object);
        this.ui.showMultiObjectForm(objects, {});
      }

      if (uisInfo.deleteable) {
        this.ui.showDeleteButton();
      }

      if (uisInfo.object) {
        uisInfo.object.addBoundingBox();
      }

    }

  }

  // Unselect all selected meshes
  unselectMeshes() {
    this.state.selectedMeshes.forEach(mesh => {
      this.unselectMesh(mesh);
    });
    this.state.selectedMeshes = [];
    this.ui.clearConfigForm();
  }

  // Unselect the mesh - note that this does not take the mesh out of the
  // selectedMeshes array
  unselectMesh(mesh) {

    if (!mesh && this.state.selectedMeshes.length == 1) {
      mesh = this.state.selectedMeshes.pop();
    }

    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      const uisInfo = mesh.userData.uisInfo;

      // Call the onUnselected callback if present
      if (uisInfo.onUnselected) {
        uisInfo.onUnselected(mesh);
      }

      // If there is a config form, then hide it
      this.ui.clearConfigForm();
      
      // If there is an unselcted material, then set it
      if (uisInfo.unselectedMaterial) {
        mesh.material = uisInfo.unselectedMaterial;
      }

      // Remove the selected flag
      uisInfo.selected = false;

      // Remove the bounding box
      if (uisInfo.object) {
        uisInfo.object.removeBoundingBox();
      }

      // Remove from the selected meshes array
      this.state.selectedMeshes = this.state.selectedMeshes.filter(m => m !== mesh);

    }

  }

  // Delete the selected mesh
  deleteSelectedMeshes() {
    this.state.selectedMeshes.forEach(mesh => {

      if (mesh && mesh.userData && mesh.userData.uisInfo) {
        const uisInfo = mesh.userData.uisInfo;

        this.unselectMesh(mesh);

        // Call the onDelete callback if present
        if (uisInfo.onDelete) {
          uisInfo.onDelete(mesh);
        }
      }
    
    })
    this.state.selectedMeshes = [];
  }

  // Called when the pointer up event happens within the delete/trash button
  deletePointerUp(e) {
    // If we are dragging an mesh over the delete button, then delete it
    if (this.state.isDragging) {
      this.deleteSelectedMeshes();
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
    if (intersects.length == 0) {
      return {
        object:     null,
        mesh:       null,
        selectable: false,
        onDown:     null,
      }
    }

    // Find the first mesh that has uisInfo in its userData by traversing up the tree
    let mesh = intersects[0].object;
    while (mesh) {
      if (mesh.userData && mesh.userData.uisInfo) {
        return {
          point:      intersects[0].point,
          object:     mesh.userData.uisInfo.object,
          mesh:       mesh,
          selectable: mesh.userData.uisInfo.selectable,
          onDown:     mesh.userData.uisInfo.onDown,
        }
      }
      mesh = mesh.parent;
    }

    return {
      object:     null,
      selectable: false,
      onDown:     null,
    }

  }

  // Given a mesh, get the object that is buried in the userData
  getObjectFromMesh(mesh) {
    if (mesh && mesh.userData && mesh.userData.uisInfo) {
      return mesh.userData.uisInfo.object;
    }
    return null;
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

  // Draw a bounding box around the group that the mesh is in. If it
  // has no parent, then draw a bounding box around the mesh itself
  drawBoundingBox(mesh) {
    if (mesh) {
      let bbox;
      let bboxHoldingMesh;
      if (mesh.parent && mesh.parent.type !== "Scene") {
        bbox = new THREE.Box3().setFromObject(mesh.parent);
        bboxHoldingMesh = mesh.parent;
      }
      else {
        bbox = new THREE.Box3().setFromObject(mesh);
        bboxHoldingMesh = mesh;
      }

      // Add some padding to the bounding box in the x and y directions
      const padding = 10;
      bbox.min.x -= padding;
      bbox.min.y -= padding;
      bbox.max.x += padding;
      bbox.max.y += padding;
      bbox.max.z += padding;

      const boxHelper = new THREE.Box3Helper(bbox, 0xffff00);
      this.scene.add(boxHelper);

      // Remember the bounding box so we can remove it later
      this.state.boundingBoxes.push(boxHelper);
      bboxHoldingMesh.userData.boundingBox = boxHelper;
    }
  } 

  // Remove all the bounding boxes
  clearBoundingBoxes() {
    this.state.boundingBoxes.forEach(box => {
      this.scene.remove(box);
    });
    this.state.boundingBoxes = [];
  }

  clearBoundingBox(mesh) {
    if (mesh) {
      // Get the bbox mesh from the passed in mesh's userData
      if (mesh.parent && mesh.parent.type !== "Scene") {
        mesh = mesh.parent;
      }
      if (mesh.userData && mesh.userData.boundingBox) {
        this.scene.remove(mesh.userData.boundingBox);
        // Find and remove the bounding box from the list
        const index = this.state.boundingBoxes.indexOf(mesh.userData.boundingBox);
        if (index > -1) {
          this.state.boundingBoxes.splice(index, 1);
        }
        mesh.userData.boundingBox = null;
      }
    }
  }

  // Update the selection box, drawing a new one if needed
  updateSelectionBox() {

    if (!this.state.selectionBox) {
      return;
    }

    if (this.state.selectionBox.mesh) {
      this.scene.remove(this.state.selectionBox.mesh);
    }

    if (this.state.selectionBox.start && this.state.selectionBox.end) {

      // Create a mesh that is a box between the start and end points
      const start  = this.state.selectionBox.start;
      const end    = this.state.selectionBox.end;

      const width  = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      const depth  = Math.abs(end.z - start.z);

      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshBasicMaterial({color: 0xffff00, transparent: true, opacity: 0.5});
      const mesh     = new THREE.Mesh(geometry, material);

      // Position the mesh
      mesh.position.x = (start.x + end.x) / 2;
      mesh.position.y = (start.y + end.y) / 2;
      mesh.position.z = (start.z + end.z) / 2;

      // Draw the bounding box around the mesh
      let bbox        = new THREE.Box3().setFromObject(mesh);
      const boxHelper = new THREE.Box3Helper(bbox, 0xffff00);
      this.scene.add(boxHelper);

      this.state.selectionBox.mesh = boxHelper;

    }
  }

  // Remove the selection box
  clearSelectionBox() {
    if (!this.state.selectionBox) {
      return;
    }

    if (this.state.selectionBox.mesh) {
      this.scene.remove(this.state.selectionBox.mesh);
    }
    this.state.selectionBox = null;
  }

  // Get the list of meshes that are within the selection box
  getMeshesInSelectionBox() {
    const meshes = [];
    if (this.state.selectionBox.start && this.state.selectionBox.end) {
      const start = this.state.selectionBox.start;
      const end   = this.state.selectionBox.end;

      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const minZ = Math.min(start.z, end.z);
      const maxX = Math.max(start.x, end.x);
      const maxY = Math.max(start.y, end.y);
      const maxZ = Math.max(start.z, end.z);
      
      // Create a bounding box from the start and end points
      const bbox = new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));

      // Loop through all the selectable meshes in the scene that we calculated earlier
      this.state.selectableObjectsBbox.forEach(meshBbox => {
        // Check if the x and y of the bounding box are within the selection box
        if (bbox.min.x <= meshBbox.min.x && meshBbox.max.x <= bbox.max.x && 
            bbox.min.y <= meshBbox.min.y && meshBbox.max.y <= bbox.max.y) {
          meshes.push(meshBbox.userData.mesh);
        }

      });
    }
    return meshes;
  }

  // Get the object group that the mesh is in - it might be in a group that is in a group
  getObjectGroupForMesh(mesh) {
    let objectGroup = null;
    if (mesh && mesh.userData && mesh.userData.uisInfo && mesh.userData.uisInfo.object) {
      objectGroup = mesh.userData.uisInfo.object.getObjectGroup();
      if (objectGroup && !objectGroup.objectIds) {
        mesh.userData.uisInfo.object.setObjectGroup(null);
        return null;
      }
    }

    while (objectGroup) {
      if (objectGroup.objectGroupId) {
        objectGroup = objectGroup.getObjectGroup();
      }
      else {
        break;
      }
    }
    return objectGroup;
  }

  getMeshOrObjectGroup(mesh) {
    let objectGroup = this.getObjectGroupForMesh(mesh);
    if (objectGroup) {
      return objectGroup.getMesh();
    }
    return mesh;
  }

  // Return true if the control key is down on PCs or the command key is down on Macs
  ctrlKey(e) {
    if (this.app.platform.os === "Mac") {
      return e.metaKey;
    }
    else {
      return e.ctrlKey;
    }
  }

}


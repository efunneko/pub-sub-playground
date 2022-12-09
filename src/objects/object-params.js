// object-params.js - Holds parameter definitions for objects

// This file contains the definitions for the parameters that can be
// set on objects.  The definitions are used to create the UI for
// setting the parameters and to validate the parameters when they
// are set.

// This class will not store any values of the parameters, but will
// facilitate the setting and getting of the parameter values. To avoid
// circular references, the object itself is not stored.

// The definitions are stored in the params array.  There is also 
// an object whose keys are the param name that point to the parameter definition.  
// Each parameter contains the following properties:

//   name: The name of the parameter.  

//   type: The type of the parameter.  This is used to determine the
//         type of UI element to create for the parameter.  The
//         following types are supported:

//         text: A text input field
//         textarea: A text area input field
//         numberRange: A number input field that is rendered as a range
//         boolean: A checkbox
//         color: A color picker
//         select: A dropdown list
//         subObject: The value is an object that has its own objectParams - the UI will render the subObject's params
//         password: A password input field
//         hidden: A hidden input field
//         readonly: A readonly input field

//   label: The label to use for the parameter.  If not specified,
//          the parameter name is used.

//   width: The width of the parameter.  This is only used for
//          text and textarea parameters.

//   title: The title to use for the parameter. It will show up as a tooltip.

//   default: The default value for the parameter.  If not specified,
//            the value is undefined.

//   min: The minimum value for the parameter.  This is only used
//        for number parameters.

//   max: The maximum value for the parameter.  This is only used
//        for number parameters.

//   step: The step value for the parameter.  This is only used
//         for number parameters.

//   options: An array of options for the parameter.  This is only
//            used for select parameters.

//   eventLabels: An array of labels for the events that should be
//                triggered when the parameter is changed.  

//   showIf: A function that returns true if the parameter should be
//           shown.  The function is passed the object that the
//           parameter is being set on.

//   dependsOn: An array of parameter names that this parameter depends
//              on.  If any of the parameters in the array are changed,
//              the parameter will be updated.

export class ObjectParams {
  constructor(obj, params, initialValues) {

    // !! Note that we don't store the object here.  We don't want to
    // create a circular reference between the object and the objectParams which
    // would prevent the object from being garbage collected.

    this.params           = [];
    this.paramMap         = {};
    this.paramEventLabels = {};

    params = params || [];
    console.log(`Creating object params for ${obj.constructor.name}`, params, initialValues);

    // Copy the parameters into the params array
    params.forEach((param) => {
      this.params.push(Object.assign({}, param));
      this.paramMap[param.name] = param;

      // Set the initial value or the default value if there is no initial value
      if (initialValues && initialValues[param.name] !== undefined) {
        console.log(`Setting ${param.name} to ${initialValues[param.name]}`);
        obj[param.name] = initialValues[param.name];
      }
      else if (param.default !== undefined && obj[param.name] === undefined) {
        console.log(`Setting ${param.name} to default ${param.default}`);
        obj[param.name] = param.default;
      }

      // Handle event handlers
      if (param.eventLabels) {
        this.paramEventLabels[param.name] = [];
        param.eventLabels.forEach(label => {
          // Capitalize the first letter
          const handlerName = "on" + label.charAt(0).toUpperCase() + label.slice(1) + "Change";
          if (obj[handlerName]) {
            this.paramEventLabels[param.name].push(handlerName);
          }
          else {
            console.warn(`No handler found for ${handlerName} which is referenced in ${param.name}`);
          }
        });
      }
    });

  }

  // Get a parameter value given the parameter name
  getValue(obj, name) {
    return obj[name];
  }

  // Set the parameter values given an object and the map of parameter names and values
  setValues(obj, values) {
    const eventLabels = {};
    Object.keys(values).forEach(paramName => {
      const value = values[paramName];
      const param = this.paramMap[paramName];

      if (param && param.type == "subObject") {
        obj[paramName].setValues(value);
          return;
      }

      obj[paramName] = value;      
      if (this.paramEventLabels[paramName]) {
        this.paramEventLabels[paramName].forEach(label => {
          eventLabels[label] = true;
        });
      }
    });

    // Call the event handlers
    Object.keys(eventLabels).forEach(label => {
      if (typeof(obj[label]) === "function") {
        obj[label]();
      }
    });

  }

  // Get the parameter definition given the parameter name
  getParam(name) {
    return this.paramMap[name];
  }

  // Get the parameter definitions
  getParams() {
    return this.params;
  }

  // Get the full configuration for the object
  getConfig(obj) {
    const config = {};
    this.params.forEach(param => {
      if (param.type == "subObject") {
        config[param.name] = obj[param.name].getConfig();
      }
      else {
        let val = obj[param.name];
        if (typeof(val) === "number") {
          val = Math.round(val * 100) / 100;
        }
        config[param.name] = val;
      }
    });
    return config;
  }
  
}

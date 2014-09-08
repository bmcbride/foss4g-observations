/* Webshim options for browsers that don't support required HTML5 elements */
webshim.setOptions("forms", {
  replaceValidationUI: true,
  lazyCustomMessages: true,
  iVal: {
    sel: ".ws-validate",
    handleBubble: "hide",
    errorMessageClass: "help-block",
    errorWrapperClass: "has-error"
  },
  //customDatalist: "auto",
  list: {
    "focus": true,
    "highlight": true
  }
});

webshim.setOptions("forms-ext", {
  replaceUI: false,
  types: "date range number",
  date: {
    startView: 2,
    openOnFocus: true
  },
  number: {
    calculateWidth: false
  },
  range: {
    classes: "show-activevaluetooltip"
  }
});
webshim.polyfill("forms forms-ext");

const getExtension = function(name) {
  return name.substring(name.lastIndexOf(".") + 1);
}

export {
  getExtension
}

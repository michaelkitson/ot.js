(function (exports) {

  const TextOperation = require('../lib/text-operation');

  function randomInt (n) {
    return Math.floor(Math.random() * n);
  }

  function randomString (n) {
    let str = '';
    while (n--) {
      if (Math.random() < 0.15) {
        str += '\n';
      } else {
        const chr = randomInt(26) + 97;
        str += String.fromCharCode(chr);
      }
    }
    return str;
  }

  function randomOperation (str) {
    const operation = new TextOperation();
    let left;
    while (true) {
      left = str.length - operation.baseLength;
      if (left === 0) { break; }
      const r = Math.random();
      const l = 1 + randomInt(Math.min(left - 1, 20));
      if (r < 0.2) {
        operation.insert(randomString(l));
      } else if (r < 0.4) {
        operation['delete'](l);
      } else {
        operation.retain(l);
      }
    }
    if (Math.random() < 0.3) {
      operation.insert(1 + randomString(10));
    }
    return operation;
  }

  exports.randomString = randomString;
  exports.randomOperation = randomOperation;

})(typeof exports === 'object' ? exports : this);

var TextOperation = require('../../lib/text-operation');
var h = require('../helpers');

var n = 500;

test('lengths', () => {
  const o = new TextOperation();
  expect(o.baseLength).toBe(0);
  expect(o.targetLength).toBe(0);
  o.retain(5);
  expect(o.baseLength).toBe(5);
  expect(o.targetLength).toBe(5);
  o.insert("abc");
  expect(o.baseLength).toBe(5);
  expect(o.targetLength).toBe(8);
  o.retain(2);
  expect(o.baseLength).toBe(7);
  expect(o.targetLength).toBe(10);
  o.delete(2);
  expect(o.baseLength).toBe(9);
  expect(o.targetLength).toBe(10);
});

test('unicode character lengths', () => {
  const o = new TextOperation();
  o.insert('🚀');
  expect(o.targetLength).toBe(1);
});

test('chaining', () => {
  const o = new TextOperation()
  .retain(5)
  .retain(0)
  .insert("lorem")
  .insert("")
    .delete("abc")
    .delete(3)
    .delete(0)
    .delete("");
  expect(o.ops.length).toBe(3);
})

describe('apply', () => {
  test('basic', () => {
    for (let i = 0; i < n; i++) {
      const str = h.randomString(50);
      const o = h.randomOperation(str);
      expect(o.baseLength).toBe(str.length)
      expect(o.targetLength).toBe(o.apply(str).length)
    }
  });

  test('unicode', () => {
    const str = "console.log('Hello World!');\n👨🏼\n\n";
    const o = new TextOperation().delete(1).retain(32);
    const newStr = o.apply(str)
    expect(o.baseLength).toBe(Array.from(str).length)
    expect(o.targetLength).toBe(Array.from(str).length - 1)
    expect(o.targetLength).toBe(Array.from(newStr).length)
  })
})

describe('invert', () => {
  test('basic', () => {
    for (let i = 0; i < n; i++) {
      const str = h.randomString(50);
      const o = h.randomOperation(str);
      const p = o.invert(str);
      expect(o.targetLength).toBe(p.baseLength);
      expect(o.baseLength).toBe(p.targetLength);
      expect(p.apply(o.apply(str))).toBe(str);
    }
  });

  test('unicode', () => {
    const str = "🍔12345";
    const o = new TextOperation().delete(3).retain(3);
    const p = o.invert(str);
    expect(o.targetLength).toBe(p.baseLength);
    expect(o.baseLength).toBe(p.targetLength);
    expect(p.apply(o.apply(str))).toBe(str);
  })
});

test('emptyOps', () => {
  const o = new TextOperation();
  o.retain(0);
  o.insert('');
  o.delete('');
  expect(o.ops.length).toBe(0);
})

test('equals', () => {
  const op1 = new TextOperation().delete(1).insert("lo").retain(2).retain(3);
  const op2 = new TextOperation().delete(-1).insert("l").insert("o").retain(5);
  expect(op1.equals(op2)).toBeTruthy();
  op1.delete(1);
  op2.retain(1);
  expect(op1.equals(op2)).toBeFalsy();
});

test('opsMerging', () => {
  function last (arr) { return arr[arr.length-1]; }
  var o = new TextOperation();
  expect(o.ops.length).toBe(0);
  o.retain(2);
  expect(o.ops.length).toBe(1);
  expect(last(o.ops)).toBe(2);
  o.retain(3);
  expect(o.ops.length).toBe(1);
  expect(last(o.ops)).toBe(5);
  o.insert("abc");
  expect(o.ops.length).toBe(2);
  expect(last(o.ops)).toBe("abc");
  o.insert("xyz");
  expect(o.ops.length).toBe(2);
  expect(last(o.ops)).toBe("abcxyz");
  o.delete("d");
  expect(o.ops.length).toBe(3);
  expect(last(o.ops)).toBe(-1);
  o.delete("d");
  expect(o.ops.length).toBe(3);
  expect(last(o.ops)).toBe(-2);
});

test('isNoop', () => {
  const o = new TextOperation();
  expect(o.isNoop()).toBeTruthy();
  o.retain(5);
  expect(o.isNoop()).toBeTruthy();
  o.retain(3);
  expect(o.isNoop()).toBeTruthy();
  o.insert("lorem");
  expect(o.isNoop()).toBeFalsy();

});

test('toString', () => {
  const o = new TextOperation();
  o.retain(2);
  o.insert('lorem');
  o.delete('ipsum');
  o.retain(5);
  expect(o.toString()).toBe("retain 2, insert 'lorem', delete 5, retain 5");
});

test('idJSON', () => {
  for (let i = 0; i < n; i++) {
    const doc = h.randomString(50);
    const operation = h.randomOperation(doc);
    expect(operation.equals(TextOperation.fromJSON(operation.toJSON()))).toBeTruthy();
  }
});

test('fromJSON', () => {
  const ops = [2, -1, -1, 'cde'];
  const o = TextOperation.fromJSON(ops);
  expect(o.ops.length).toBe(3);
  expect(o.baseLength).toBe(4);
  expect(o.targetLength).toBe(5);

  function assertIncorrectAfter (fn) {
    const ops2 = ops.slice(0);
    fn(ops2);
    expect(() => {TextOperation.fromJSON(ops2)}).toThrow();
  }

  assertIncorrectAfter(function (ops2) { ops2.push({ insert: 'x' }); });
  assertIncorrectAfter(function (ops2) { ops2.push(null); });
});

test('shouldBeComposedWith', () => {
  const make = () => new TextOperation()
  let a, b;

  a = make().retain(3);
  b = make().retain(1).insert("tag").retain(2);
  expect(a.shouldBeComposedWith(b)).toBeTruthy();
  expect(b.shouldBeComposedWith(a)).toBeTruthy();

  a = make().retain(1).insert("a").retain(2);
  b = make().retain(2).insert("b").retain(2);
  expect(a.shouldBeComposedWith(b)).toBeTruthy();
  a.delete(3);
  expect(a.shouldBeComposedWith(b)).toBeFalsy();

  a = make().retain(1).insert("b").retain(2);
  b = make().retain(1).insert("a").retain(3);
  expect(a.shouldBeComposedWith(b)).toBeFalsy();

  a = make().retain(4).delete(3).retain(10);
  b = make().retain(2).delete(2).retain(10);
  expect(a.shouldBeComposedWith(b)).toBeTruthy();
  b = make().retain(4).delete(7).retain(3);
  expect(a.shouldBeComposedWith(b)).toBeTruthy();
  b = make().retain(2).delete(9).retain(3);
  expect(a.shouldBeComposedWith(b)).toBeFalsy();

});

test('shouldBeComposedWithInverted', () => {
  for (let i = 0; i < n; i++) {
    // invariant: shouldBeComposedWith(a, b) = shouldBeComposedWithInverted(b^{-1}, a^{-1})
    const str = h.randomString();
    const a = h.randomOperation(str);
    const aInv = a.invert(str);
    const afterA = a.apply(str);
    const b = h.randomOperation(afterA);
    const bInv = b.invert(afterA);
    expect(a.shouldBeComposedWith(b)).toBe(bInv.shouldBeComposedWithInverted(aInv));
  }
});

describe('compose', () => {
  test('basic', () => {
    for (let i = 0; i < n; i++) {
      // invariant: apply(str, compose(a, b)) === apply(apply(str, a), b)
      const str = h.randomString(20);
      const a = h.randomOperation(str);
      const afterA = a.apply(str);
      expect(a.targetLength).toBe(afterA.length);
      const b = h.randomOperation(afterA);
      const afterB = b.apply(afterA);
      expect(b.targetLength).toBe(afterB.length);
      const ab = a.compose(b);
      expect(ab.meta).toBe(a.meta);
      expect(ab.targetLength).toBe(b.targetLength);
      const afterAB = ab.apply(str);
      expect(afterB).toBe(afterAB);
    }
  });

  test('unicode', () => {
    const str = '12345'
    // invariant: apply(str, compose(a, b)) === apply(apply(str, a), b)
    const a = new TextOperation().insert("🍔🍔").retain(5);
    const b = new TextOperation().retain(1).delete(1).retain(5);
    const afterA = a.apply(str);
    expect(a.targetLength).toBe(Array.from(afterA).length);
    const afterB = b.apply(afterA);
    expect(b.targetLength).toBe(Array.from(afterB).length);
    const ab = a.compose(b);
    expect(ab.targetLength).toBe(b.targetLength);
    const afterAB = ab.apply(str);
    expect(afterB).toBe(afterAB);
  });
});

test('transform', () => {
  for (let i = 0; i < n; i++) {
    // invariant: compose(a, b') = compose(b, a')
    // where (a', b') = transform(a, b)
    const str = h.randomString(20);
    const a = h.randomOperation(str);
    const b = h.randomOperation(str);
    const primes = TextOperation.transform(a, b);
    const aPrime = primes[0];
    const bPrime = primes[1];
    const abPrime = a.compose(bPrime);
    const baPrime = b.compose(aPrime);
    const afterAbPrime = abPrime.apply(str);
    const afterBaPrime = baPrime.apply(str);
    expect(abPrime.equals(baPrime)).toBeTruthy();
    expect(afterAbPrime).toBe(afterBaPrime);
  }
});

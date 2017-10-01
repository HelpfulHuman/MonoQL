var assert = require("chai").assert;
var sinon = require("sinon");
var { objToString } = require("../");

describe("objToString()", function () {

  it("returns an empty string when given an empty object", function () {
    var actual = objToString({}, () => "");
    assert.equal(actual, "");
  });

  it("invokes the toString function once for each key/value pair at the top level of the object", function () {
    var toString = sinon.spy(() => "");
    var actual = objToString({ foo: "", bar: "" }, toString);
    assert.equal(toString.callCount, 2);
  });

  it("provides the key, value and index arguments to the toString function", function () {
    var toString = (k, v, i) => {
      assert.equal(k, "foo");
      assert.equal(v, "bar");
      assert.equal(i, 0);
    }
    objToString({ foo: "bar" }, toString);
  });

  it("returns a single string using the returned values from each function in order", function () {
    var toString  = (k, v) => `[${k}::${v}]`;
    var actual    = objToString({ foo: "bar", baz: 5 }, toString);
    var expected  = "[foo::bar][baz::5]";
    assert.equal(actual, expected);
  });

});
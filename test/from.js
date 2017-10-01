var assert = require("chai").assert;
var sinon = require("sinon");
var { from } = require("../");

describe("from()", function() {

  it("returns an alias string when just a string is provided", function() {
    var actual = from("foo")();
    assert.equal(actual, ":foo");
  });

  it("returns (key:$key) when an array of argument names is provided", function() {
    var actual = from(["foo","bar"])();
    assert.equal(actual, "(foo:$foo,bar:$bar)");
  });

  it("returns (key:value) when an object of arguments is provided", function() {
    var actual = from({ foo: "bar", baz: 5 })();
    assert.equal(actual, "(foo:bar,baz:5)");
  });

  it("returns (key:$key) when an object of arguments with a $ for the value is provided", function() {
    var actual = from({ foo: "bar", baz: "$" })();
    assert.equal(actual, "(foo:bar,baz:$baz)");
  });

  it("returns an alias along with the arguments when 2 arguments are provided", function() {
    var actual = from("test", ["foo","bar"])();
    assert.equal(actual, ":test(foo:$foo,bar:$bar)");

    var actual2 = from("test", { foo: "bar", baz: 5 })();
    assert.equal(actual2, ":test(foo:bar,baz:5)");
  });

  it("returns the field signature along with any given child fields", function() {
    var actual = from("test", ["foo","bar"])(["one","two","three"]);
    assert.equal(actual, ":test(foo:$foo,bar:$bar){one,two,three}");
  });

});
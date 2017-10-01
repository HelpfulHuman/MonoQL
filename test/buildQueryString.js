var assert = require("chai").assert;
var { buildQueryString } = require("../");

describe("buildQueryString()", function () {

  it("throws an error if no schema object is provided");

  it("creates an unnamed schema when a name string is not present", function () {
    var expected  = "{foo}";
    var actual    = buildQueryString({ foo: "" });
    assert.equal(actual, expected);
  });

  it("creates a named schema when a name string is present", function () {
    var expected  = "Foo{foo}";
    var actual    = buildQueryString("Foo", { foo: "" });
    assert.equal(actual, expected);
  });

  it("adds variable declarations to the schema when $vars field is present", function () {
    var expected  = "($foo:String){bar}";
    var actual    = buildQueryString({ $: { foo: "String" }, bar: "" });
    assert.equal(actual, expected);
  });

});
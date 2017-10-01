var assert = require("chai").assert;
var sinon = require("sinon");
var { processFields } = require("../");

describe("processFields()", function() {

    it("returns the given string as is", function() {
      var str = "helloworld";
      assert.equal(processFields(str), str);
    });

  it("returns an empty string when unsupported values are provided", function() {
    assert.equal(processFields(), "");
    assert.equal(processFields(false), "");
    assert.equal(processFields(true), "");
    assert.equal(processFields(null), "");
    assert.equal(processFields(9), "");
  });

  it("returns a join string of values wrapped in {} when an array of strings is provided", function() {
    var actual = processFields(["foo","bar","baz"]);
    assert.equal(actual, "{foo,bar,baz}");
  });

  it("returns a joined string of values wrapped in {} when an object is provided", function() {
    var actual = processFields({ foo: ":bar", baz: null });
    assert.equal(actual, "{foo:bar,baz}");
  });

  it("invokes functions found on field defintions and processes the results", function() {
    var actual = processFields({ foo: () => (["bar","baz"]) })
    assert.equal(actual, "{foo{bar,baz}}");
  });

  it("supports recursive processing of nested field types", function() {
    var actual = processFields({ foo: "", bar: { baz: ["one","two"] } })
    assert.equal(actual, "{foo,bar{baz{one,two}}}");
  });

});
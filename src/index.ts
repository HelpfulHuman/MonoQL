export interface Headers {
  [key: string]: string;
}

export interface Request {
  url: string;
  headers: Headers;
  query: string;
  variables?: object;
}

export interface NextFunction {
  (): Promise<any>;
}

export interface Middleware {
  (req: Request, next: NextFunction): Promise<any>;
}

export interface VarsMap {
  [key: string]: string;
}

export interface InlineArgsMap {
  [key: string]: boolean|number|string;
}

export interface RenderField {
  (fields: any): string;
}

export interface ConvertKeyValue {
  (key: string, value: any, index: number): string;
}

export interface RunFunction {
  (vars?: VarsMap): Promise<any>;
}

/**
 * Maps an object's keys and values using a function.
 */
export function objToString(obj: object, toString: ConvertKeyValue): string {
  var str = "";
  Object.keys(obj).forEach(function (k, i) {
    str += toString(k, obj[k], i);
  });
  return str;
}

/**
 * Get the field type.
 */
function getType(val: any): string {
  if (Array.isArray(val)) return "array";
  if (!val) return "empty";
  return (typeof val);
}

/**
 * Process a single object key/value pairing.
 */
function processKeyVal(k: string, v: any, i: number): string {
  var prefix = (i > 0 ? "," : "") + k;
  var child = processFields(v);
  if (child === "") return prefix;
  return `${prefix}${child}`;
}

/**
 * Renders any type of field representation into a single string.
 */
export function processFields(fields: any): string {
  switch (getType(fields)) {
    case "string":
      return fields;
    case "array":
      let arr = fields.map(processFields).filter(f => !!f).join(",");
      return `{${arr}}`;
    case "function":
      return processFields(fields());
    case "object":
      let obj = objToString(fields, processKeyVal);
      return (obj ? `{${obj}}` : "");
    default:
      return "";
  }
}

/**
 * Creates a more expressive field syntax with actual field name
 * and arguments support.
 */
export function from(args: string[]|InlineArgsMap): RenderField;
export function from(name: string, args?: string[]|InlineArgsMap): RenderField;
export function from(): RenderField {
  // Song and dance to support argument overloading
  var field, args, argString;
  if (typeof arguments[0] === "string") {
    field = ":" + arguments[0];
    args = (arguments[1] || null);
  } else {
    field = "";
    args = (arguments[0] || null);
  }

  // If we have args, we need to create a string out of them
  if (Array.isArray(args)) {
    // key:$key,key:$key
    argString = args.map(k => `${k}:$${k}`).join(",");
  } else if (!!args && typeof args === "object") {
    // key:value,key:value
    argString = objToString(args, (k, v, i) => {
      return (i > 0 ? "," : "") + `${k}:`+(v === "$" ? `$${k}` : v);
    });
  }

  // Add the args (with parentheses) to the field string
  if (argString) {
    field += `(${argString})`;
  }

  // Return the function that can be invoked with child elements
  return function (fields) {
    return field + processFields(fields);
  };
}

/**
 * Join arguments from an args object into a single string.
 */
function joinVars(vars: VarsMap): string {
  var str = objToString(vars, function (k, v, i) {
    k = "$" + k.replace(/^\$*/, "");
    return (i > 0 ? "," : "") + `${k}:${v}`;
  });
  return (!!str ? `(${str})` : "");
}

/**
 * Top-level function for generating GraphQL strings.
 */
export function buildQueryString(schema: object): string;
export function buildQueryString(name: string, schema: object): string;
export function buildQueryString(...args: any[]): string {
  var name = (args.length > 1 ? args[0] : "");
  var schema = (args.length > 1 ? args[1] : args[0]) as any;
  var { $: vars = {}, ...fields } = schema;
  return `${name}${joinVars(vars)}${processFields(fields)}`;
}

/**
 * Run a POST request using the given url, headers and body.
 */
export function POST(url: string, headers: Headers, body: string): Promise<any> {
  return new Promise(function (accept, reject) {
    // Set up the XHR call for this request
    var req = new XMLHttpRequest();
    req.open("POST", url, true);

    // Loop through the headers and set each one
    Object.keys(headers).forEach(k => req.setRequestHeader(k, headers[k]));

    // Handle the response from the server
    req.onload = function onResponse() {
      try {
        // Check if the response was not a 200/300 series code
        if (req.status < 200 || req.status > 399) {
          throw new Error("Received Non-OK status code from server: " + req.status);
        }

        // Attempt to parse the body of the request
        var parsed = JSON.parse(req.responseText);

        // If we have any errors, this is considered a failed response
        if (parsed.errors !== null && parsed.errors.length > 0) {
          throw new Error(parsed.errors[0].message || "One or more errors occurred while attempting to process the request");
        }
        accept(parsed.data);
      } catch (err) {
        reject(err);
      }
    };

    // Handle unknown/catastrophic failure
    req.onerror = function onError() {
      reject(new Error("An error occurred while attempting to make a request to API."));
    };

    // Prepare the request body and send
    req.send(body);
  });
}

export class Client {

  private _url:   string;
  private _mw:    Middleware[];
  public headers: Headers;

  /**
   * Creates a new client instance.
   */
  constructor(url: string, headers: Headers = {}) {
    this._url = url;
    this.headers = Object.assign({
      "Content-Type": "application/json",
      "Accept": "application/json",
    }, headers);
    this._mw = [];
  }

  /**
   * Add middleware for manipulating outgoing requests.
   */
  use(...middleware: Middleware[]): this {
    this._mw = this._mw.concat(...middleware);
    return this;
  }

  /**
   * Generates a new request object.
   */
  private createRequest(query: string, vars?: object): Request {
    return {
      url: this._url,
      headers: Object.assign({}, this.headers),
      query: query,
      variables: vars,
    };
  }

  /**
   * Creates a function that builds a GraphQL query and then
   * binds it to the run() method.
   */
  query(schema: object): RunFunction;
  query(name: string, schema: object): RunFunction;
  query(): RunFunction {
    var q = ("query " + buildQueryString.apply(null, arguments));
    return this.run.bind(this, q);
  }

  /**
   * Creates a function that builds a GraphQL mutation and then
   * binds it to the run() method.
   */
  mutate(schema: object): RunFunction;
  mutate(name: string, schema: object): RunFunction;
  mutate(): RunFunction {
    var q = ("mutation " + buildQueryString.apply(null, arguments));
    return this.run.bind(this, q);
  }

  /**
   * Runs the GraphQL query with any given variables.
   */
  run(query: string, vars?: object): Promise<any> {
    // Create the request object for query
    var req = this.createRequest(query, vars);

    // Get a copy of our middleware array so we don't
    // mutate the original
    var mw = this._mw.slice(0);

    // The function that is called when we reach the end
    // of our middleware stack
    function done() {
      return POST(req.url, req.headers, JSON.stringify({
        query: req.query,
        variables: req.variables
      }));
    }

    // Wrapper function that is next() for handling end of
    // stack POST call and middleware errors
    function callNext() {
      var next = mw.shift();
      if (!next) next = done;
      try {
        return Promise.resolve(next(req, callNext));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    // Kick off the stack calls!
    return callNext();
  }

}
const test = require("node:test");
const assert = require("node:assert/strict");

const { requestNamesInCollection, uniqueRequestName, requestToCurl } = require("./sidebar-request-actions.js");

test("requestNamesInCollection: returns every request name in the matching collection", () => {
  global.consoleState = {
    collectionsCache: [{ slug: "lending", requests: [{ name: "Get Order" }, { name: "Post Order" }] }],
  };
  assert.deepEqual(requestNamesInCollection("lending"), new Set(["Get Order", "Post Order"]));
});

test("requestNamesInCollection: an unknown slug yields an empty set rather than throwing", () => {
  global.consoleState = { collectionsCache: [{ slug: "lending", requests: [{ name: "Get Order" }] }] };
  assert.deepEqual(requestNamesInCollection("ghost"), new Set());
});

test("uniqueRequestName: returns the base name unchanged when there is no collision", () => {
  global.consoleState = { collectionsCache: [{ slug: "lending", requests: [] }] };
  assert.equal(uniqueRequestName("lending", "Get Order copy"), "Get Order copy");
});

test("uniqueRequestName: appends the next free \" (n)\" suffix on collision", () => {
  global.consoleState = {
    collectionsCache: [
      { slug: "lending", requests: [{ name: "Get Order copy" }, { name: "Get Order copy (2)" }] },
    ],
  };
  assert.equal(uniqueRequestName("lending", "Get Order copy"), "Get Order copy (3)");
});

test("requestToCurl: renders method, url, and only enabled headers", () => {
  const curl = requestToCurl({
    method: "POST",
    url: "https://api.example.com/orders",
    headers: [
      { key: "Authorization", value: "Bearer token" },
      { key: "X-Disabled", value: "nope", enabled: false },
    ],
  });
  assert.equal(
    curl,
    "curl -X POST 'https://api.example.com/orders' \\\n  -H 'Authorization: Bearer token'"
  );
});

test("requestToCurl: a header with no enabled property at all still counts as enabled", () => {
  const curl = requestToCurl({
    method: "GET",
    url: "https://api.example.com/orders",
    headers: [{ key: "Accept", value: "application/json" }],
  });
  assert.match(curl, /-H 'Accept: application\/json'/);
});

test("requestToCurl: urlencoded body mode reads bodyParams, not body", () => {
  const curl = requestToCurl({
    method: "POST",
    url: "https://api.example.com/orders",
    bodyMode: "urlencoded",
    body: "ignored-raw-body",
    bodyParams: [{ key: "amount", value: "100" }, { key: "skip", value: "x", enabled: false }],
  });
  assert.match(curl, /-d 'amount=100'/);
  assert.doesNotMatch(curl, /ignored-raw-body/);
});

test("requestToCurl: raw body mode reads body verbatim", () => {
  const curl = requestToCurl({ method: "POST", url: "https://api.example.com/orders", body: '{"amount":100}' });
  assert.match(curl, /-d '\{"amount":100\}'/);
});

test("requestToCurl: defaults to GET when no method is set", () => {
  assert.match(requestToCurl({ url: "https://api.example.com/orders" }), /^curl -X GET /);
});

var test = require("tape");
var timeline = require("../");


test("dummy test", function(assert) {
    var temp = new timeline.viewModel();
    assert.equal(0, temp.nighttimeEvents(null, null));
    assert.end();
});

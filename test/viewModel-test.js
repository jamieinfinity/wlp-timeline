var test = require("tape");
var timeline = require("../");


test("nightimeEvents has expected data structure", function(assert) {
    var model = new timeline.viewModel();
    var minDate = new Date("1/1/2016");
    var maxDate = new Date("1/3/2016");
    var events = model.nighttimeEvents(minDate, maxDate);

    assert.equal(events.length, 3);
    events.forEach(function(d) {
        assert.equal(Object.keys(d).length, 2);
    });

    assert.end();
});

test("nightimeEvents gives the expected start and end times", function(assert) {
    var model = new timeline.viewModel();
    var minDate = new Date("1/1/2016");
    var maxDate = new Date("1/3/2016");
    var events = model.nighttimeEvents(minDate, maxDate);

    assert.equal(events[0].startTime.getTime(), new Date("1/1/2016 18:00").getTime());
    assert.equal(events[0].endTime.getTime(), new Date("1/2/2016 6:00").getTime());

    assert.equal(events[1].startTime.getTime(), new Date("1/2/2016 18:00").getTime());
    assert.equal(events[1].endTime.getTime(), new Date("1/3/2016 6:00").getTime());

    assert.equal(events[2].startTime.getTime(), new Date("1/3/2016 18:00").getTime());
    assert.equal(events[2].endTime.getTime(), new Date("1/4/2016 6:00").getTime());

    assert.end();
});

test("nightimeEvents gives the expected start and end times when minDate and maxDate are equal", function(assert) {
    var model = new timeline.viewModel();
    var minDate = new Date("1/2/2016");
    var maxDate = new Date("1/2/2016");
    var events = model.nighttimeEvents(minDate, maxDate);

    assert.equal(events[0].startTime.getTime(), new Date("1/2/2016 18:00").getTime());
    assert.equal(events[0].endTime.getTime(), new Date("1/3/2016 6:00").getTime());

    assert.end();
});

test("nightimeEvents handles month boundary correctly", function(assert) {
    var model = new timeline.viewModel();
    var minDate = new Date("1/31/2016");
    var maxDate = new Date("1/31/2016");
    var events = model.nighttimeEvents(minDate, maxDate);

    assert.equal(events[0].startTime.getTime(), new Date("1/31/2016 18:00").getTime());
    assert.equal(events[0].endTime.getTime(), new Date("2/1/2016 6:00").getTime());

    assert.end();
});
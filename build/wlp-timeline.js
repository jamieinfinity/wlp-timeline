(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define('wlp-timeline', ['exports'], factory) :
    (factory((global.wlp_timeline = {})));
}(this, function (exports) { 'use strict';

    function viewModel() {

        function nighttimeEvents(minDate, maxDate) {
            var events = [];
            for (var d = new Date(minDate.getTime()); d <= maxDate; d.setDate(d.getDate() + 1)) {
                events.push({
                    startTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0),
                    endTime: new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 6, 0, 0)
                });
            }

            return events;
        }

        return {
            nighttimeEvents: nighttimeEvents
        }
    }

    var model = viewModel();

    var timelineMargin = {top: 20, right: 20, bottom: 30, left: 20};
    var timelineHeight = 70 - timelineMargin.top - timelineMargin.bottom;
    var timelineWidth;

    var svgRootTimeline;
    var svgInnerTimeline;
    var svgOuterTimeline;
    var svgAxesTimeline;

    var timelineXAxisMain;
    var timelineXAxisDays;
    var timelineXAxisWeeks;
    var timelineXAxisDayNames;
    var timelineXAxisHidden;

    var sharedTimeScale;
    var zoom;

    var pointsSelection;
    var pointsData;

    var nightData;
    var nightSelection;


    function makeTimeFormat(mil, sec, min, hr, day, day2, month, year) {
        return d3.time.format.multi([
            [mil, function(d) { return d.getMilliseconds(); }],
            [sec, function(d) { return d.getSeconds(); }],
            [min, function(d) { return d.getMinutes(); }],
            [hr, function(d) { return d.getHours(); }],
            [day, function(d) { return d.getDay() && d.getDate() != 1; }],
            [day2, function(d) { return d.getDate() != 1; }],
            [month, function(d) { return d.getMonth(); }],
            [year, function() { return true; }]
        ]);
    }

    function makeTimelineAxis(scale, format, orient, size, padding) {
            return d3.svg.axis()
            .scale(scale)
            .tickFormat(format)
            .orient(orient)
            .tickSize(size)
            .tickPadding(padding);
    }

    function setUpCommonTimeAxis(minDate, maxDate) {

        sharedTimeScale = d3.time.scale().domain([minDate, maxDate]).range([0, timelineWidth]);

        var customTimeFormat = makeTimeFormat(".%L", ":%S", "%_I:%M", "%_I %p", "%b %-d", "%b %-d", "%b", "%Y");
        var customTimeFormatDayNames = makeTimeFormat(" ", " ", " ", " ", "%a", "%a", "%a", " ");

        timelineXAxisMain = makeTimelineAxis(sharedTimeScale, customTimeFormat, "bottom", -timelineHeight, 6);
        timelineXAxisDayNames = makeTimelineAxis(sharedTimeScale, customTimeFormatDayNames, "bottom", -timelineHeight, 18);
        timelineXAxisDays = makeTimelineAxis(sharedTimeScale, "", "bottom", -timelineHeight, 0).ticks(d3.time.days, 1);
        timelineXAxisWeeks = makeTimelineAxis(sharedTimeScale, "", "bottom", -timelineHeight, 0).ticks(d3.time.weeks, 1);
        timelineXAxisHidden = makeTimelineAxis(sharedTimeScale, "", "bottom", 0, 0).ticks(d3.time.years, 1);
    }

    // TODO: move this to viewModel, taking in args scale and width, then test it
    function timelineSpanInDays() {
        var minDate = sharedTimeScale.invert(0);
        var maxDate = sharedTimeScale.invert(timelineWidth);
        return (maxDate.getTime() - minDate.getTime())/1000/3600/24;
    }

    function resetTimeAxis(axisPath, axisFunction, visibleMaxDays) {
        if (visibleMaxDays > 0 && timelineSpanInDays() > visibleMaxDays) {
            svgAxesTimeline.select(axisPath).call(timelineXAxisHidden);
        } else {
            svgAxesTimeline.select(axisPath).call(axisFunction);
        }
    }

    function updateTimeline() {
        updateNightRects();

        if(pointsData) {
            updatePoints();
        }

        resetTimeAxis(".x.axisMain", timelineXAxisMain, 0);
        resetTimeAxis(".x.axis-day-names", timelineXAxisDayNames, 60);
        resetTimeAxis(".x.axis-days", timelineXAxisDays, 60);
        resetTimeAxis(".x.axis-weeks", timelineXAxisWeeks, 60);
    }

    function appendAxisGroup(selection, axisPath, yOffset) {
        selection.append("g")
            .attr("class", axisPath)
            .attr("transform", "translate(0," + yOffset + ")");
    }



    function drawTimeline(domElement, width) {

        timelineWidth = width - timelineMargin.left - timelineMargin.right;

        var today = new Date();
        var minDate = new Date(today.getTime() - 3600*24*1000);
        var maxDate = new Date(today.getTime() + 3600*24*1000);
        setUpCommonTimeAxis(minDate, maxDate);

        zoom = d3.behavior.zoom()
            .x(sharedTimeScale)
            .scaleExtent([-3000, 3000])
            .on("zoom", function() {
                updateTimeline();
            });

        var rootMargin = 20;
        d3.select(domElement)
            .style("font-family", "Avenir")
            .style("font-size", "10px")
            .style("top", rootMargin+"px")
            .style("bottom", rootMargin+"px")
            .style("left", rootMargin+"px")
            .style("right", rootMargin+"px")
            .style("position", "absolute");

        svgRootTimeline = d3.select(domElement).append("svg")
            .attr("width", timelineWidth + timelineMargin.left + timelineMargin.right)
            .attr("height", timelineHeight + timelineMargin.top/2 + timelineMargin.bottom);

        svgAxesTimeline = svgRootTimeline.append("g")
            .attr("pointer-events", "none")
            .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top/2 + ")");

        appendAxisGroup(svgAxesTimeline, "x axisMain", timelineHeight);
        appendAxisGroup(svgAxesTimeline, "x axis-day-names", timelineHeight);
        appendAxisGroup(svgAxesTimeline, "x axis-days", timelineHeight);
        appendAxisGroup(svgAxesTimeline, "x axis-weeks", timelineHeight);


        svgInnerTimeline = svgRootTimeline.append("svg")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("width",  timelineWidth)
            .attr("height", timelineHeight)
            .attr("x", timelineMargin.left)
            .attr("y", timelineMargin.top/2)
            .attr("viewBox", "0 0 " + timelineWidth + " " + timelineHeight)
            .call(zoom);
            // .call(tip);

        nightData = model.nighttimeEvents(minDate, maxDate);
        nightSelection = svgInnerTimeline.append('g');
        updateTimeline();

        svgInnerTimeline.append("rect")
            .attr("fill", "white")
            .attr("fill-opacity", 0)
            .attr("width", timelineWidth)
            .attr("height", timelineHeight)
            .attr("class", "innertimelinebackground");

        svgOuterTimeline = svgRootTimeline.append("g")
            .attr("pointer-events", "none")
            .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top/2 + ")");

        svgOuterTimeline.append("rect")
            .attr("fill", "white")
            .attr("fill-opacity", 0.0)
            .attr("width", timelineWidth)
            .attr("height", timelineHeight)
            .attr("stroke", "#eee")
            .attr("stroke-width", 3)
            .attr("class", "outertimelinebackground");

    }

    function initNightRectAttributes(selection) {
        return selection
            .attr("height", timelineHeight)
            .attr("class", "nightrect");
    }
    function updateNightRectAttributes(selection) {
        selection.attr("y", 0)
            .attr("x", function(d) {
                return sharedTimeScale(d.startTime);
            })
            .attr("width", function(d) {
                return sharedTimeScale(d.endTime) - sharedTimeScale(d.startTime);
            });

    }

    function updateNightRects() {
        var data;
        if (timelineSpanInDays() > 14) {
            data = [];
        } else {
            data = nightData;
        }
        var rectsDOMData = nightSelection.selectAll('rect.nightrect').data(data);
        initNightRectAttributes(rectsDOMData.enter().append('rect')); // enter
        updateNightRectAttributes(rectsDOMData); // update
        rectsDOMData.exit().remove(); // exit
    }



    function initPointAttributes(selection) {
        return selection
                .attr("r", 5)
                .attr("fill", "#555");
    }
    function updatePointAttributes(selection) {
        selection.attr("cy", timelineHeight/2)
            .attr("cx", function(d) {
                return sharedTimeScale(d);
            });
    }

    function updatePoints() {
        var pointsDOMData = pointsSelection.selectAll('circle').data(pointsData);
        initPointAttributes(pointsDOMData.enter().append('circle')); // enter
        updatePointAttributes(pointsDOMData); // update
        pointsDOMData.exit().remove(); // exit
    }

    function addData(data) {

        pointsData = data;
        pointsSelection = svgInnerTimeline.append('g');

        var datespan = d3.extent(data);
        nightData = model.nighttimeEvents(datespan[0], datespan[1]);

        updatePoints();

        animateTimelineToDateSpan(data, datespan);
    }

    function animateTimelineToDateSpan(data, datespan) {
        d3.transition().duration(500).tween("zoom", function() {
            var ix = d3.interpolate(sharedTimeScale.domain(), datespan);
            return function(t) {
                zoom.x(sharedTimeScale.domain(ix(t)));
                updateTimeline();
            };
        });
    }

    var version = "0.0.1";

    exports.version = version;
    exports.drawTimeline = drawTimeline;
    exports.addData = addData;
    exports.viewModel = viewModel;

}));
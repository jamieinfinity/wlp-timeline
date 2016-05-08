/*global d3*/
/*global d3_tip*/


import viewModel from "./viewModel";
import d3 from "d3";
import d3Tip from "d3-tip";

export {drawTimeline, addData, resizeTimeline};


const model = viewModel();

const timelineMargin = {top: 20, right: 20, bottom: 30, left: 20};
const timelineSize = {height: 70 - timelineMargin.top - timelineMargin.bottom,
                      width: 0};

let sharedTimeScale;
let zoom;

let pointsData;

let timelineXAxisMain;
let timelineXAxisDays;
let timelineXAxisWeeks;
let timelineXAxisDayNames;
let timelineXAxisHidden;

let prettyDateFormat = d3.time.format("%a %b %e, %Y at %_I:%M %p");
let pointTooltip;


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

function makeTooltipHtmlRowSingleColumn(label, text, redbackground) {
    var cellstyle = redbackground ? 'style="color:#fff; background-color: rgba(255, 0, 0, 0.7);"' : 'style="color:#fff;"';
    var labelcolon = label=='' ? '' : ':';
    return '<tr>' +
        '<td>' + label + labelcolon + '</td>' +
        '<td colspan="4" class="tabcol1"' + cellstyle + '>' + text + '</td>' +
        '</tr>';
}

function setUpCommonTimeAxis(minDate, maxDate) {

    sharedTimeScale = d3.time.scale().domain([minDate, maxDate]).range([0, timelineSize.width]);

    var customTimeFormat = makeTimeFormat(".%L", ":%S", "%_I:%M", "%_I %p", "%b %-d", "%b %-d", "%b", "%Y");
    var customTimeFormatDayNames = makeTimeFormat(" ", " ", " ", " ", "%a", "%a", "%a", " ");

    timelineXAxisMain = makeTimelineAxis(sharedTimeScale, customTimeFormat, "bottom", -timelineSize.height, 6);
    timelineXAxisDayNames = makeTimelineAxis(sharedTimeScale, customTimeFormatDayNames, "bottom", -timelineSize.height, 18);
    timelineXAxisDays = makeTimelineAxis(sharedTimeScale, "", "bottom", -timelineSize.height, 0).ticks(d3.time.days, 1);
    timelineXAxisWeeks = makeTimelineAxis(sharedTimeScale, "", "bottom", -timelineSize.height, 0).ticks(d3.time.weeks, 1);
    timelineXAxisHidden = makeTimelineAxis(sharedTimeScale, "", "bottom", 0, 0).ticks(d3.time.years, 1);
}

function timelineExtentDates() {
    var minDate = sharedTimeScale.invert(0);
    var maxDate = sharedTimeScale.invert(timelineSize.width);
    return [minDate, maxDate];
}
function timelineSpanInDays() {
    let dates = timelineExtentDates();
    return (dates[1].getTime() - dates[0].getTime())/1000/3600/24;
}

function resetTimeAxis(axisPath, axisFunction, visibleMaxDays) {
    let svgAxesTimeline = d3.select('#timelineAxes');
    if (visibleMaxDays > 0 && timelineSpanInDays() > visibleMaxDays) {
        svgAxesTimeline.select(axisPath).call(timelineXAxisHidden);
    } else {
        svgAxesTimeline.select(axisPath).call(axisFunction);
    }
}

function updateTimeline() {

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

    pointTooltip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-7, 0])
        // .direction(function(d) {
        //     return 's';
        // })
        .html(function(d) {
            return  '' +
               '<table class="tooltiptable">' +
                    makeTooltipHtmlRowSingleColumn('time', prettyDateFormat(d), false) +
                '</table>';
    });

    timelineSize.width = width - timelineMargin.left - timelineMargin.right;

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

    let svgRootTimeline = d3.select(domElement).append("svg")
        .attr("class", "timelineRoot")
        .attr("width", timelineSize.width + timelineMargin.left + timelineMargin.right)
        .attr("height", timelineSize.height + timelineMargin.top/2 + timelineMargin.bottom);

    let svgAxesTimeline = svgRootTimeline.append("g")
        .attr("id", "timelineAxes")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top/2 + ")");

    appendAxisGroup(svgAxesTimeline, "x axisMain", timelineSize.height);
    appendAxisGroup(svgAxesTimeline, "x axis-day-names", timelineSize.height);
    appendAxisGroup(svgAxesTimeline, "x axis-days", timelineSize.height);
    appendAxisGroup(svgAxesTimeline, "x axis-weeks", timelineSize.height);


    let svgInnerTimeline = svgRootTimeline.append("svg")
        .attr("id", "timelineInner")
        .attr("vector-effect", "non-scaling-stroke")
        .attr("width",  timelineSize.width)
        .attr("height", timelineSize.height)
        .attr("x", timelineMargin.left)
        .attr("y", timelineMargin.top/2)
        .attr("viewBox", "0 0 " + timelineSize.width + " " + timelineSize.height)
        .call(zoom)
        .call(pointTooltip);

    svgInnerTimeline.append("rect")
        .attr("id", "innertimelinebackground")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height);

    let svgOuterTimeline = svgRootTimeline.append("g")
        .attr("id", "timelineOuter")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top/2 + ")");

    svgOuterTimeline.append("rect")
        .attr("id", "outertimelinebackground")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height);

}


function initPointAttributes(selection) {
    return selection
            .on('mouseover', function(d) {
                return pointTooltip.show(d)
            })
            .attr("r", 5)
            .attr("fill", "#555");
}
function updatePointAttributes(selection) {
    selection.attr("cy", timelineSize.height/2)
        .attr("cx", function(d) {
            return sharedTimeScale(d);
        })
        .on('mouseover', function(d) {
            return pointTooltip.show(d)
        })
        .on('mouseleave', function(d) {
            return pointTooltip.hide(d)
        })
        .on("click", function(d) {
            var minDate = new Date(d.getTime() - 12*3600000);
            var maxDate = new Date(d.getTime() + 12*3600000);
            resetTimelineSpan([minDate, maxDate]);
        });
}

function updatePoints() {
    var pointsDOMData = d3.select('#eventPointGroup').selectAll('circle').data(pointsData);
    initPointAttributes(pointsDOMData.enter().append('circle')); // enter
    updatePointAttributes(pointsDOMData); // update
    pointsDOMData.exit().remove(); // exit
}

function addData(data) {

    pointsData = data;
    d3.select('#timelineInner').append('g').attr('id', 'eventPointGroup');

    var datespan = d3.extent(data);

    updatePoints();

    resetTimelineSpan(datespan);
}

function resetTimelineSpan(datespan) {
    d3.transition().duration(500).tween("zoom", function() {
        var ix = d3.interpolate(sharedTimeScale.domain(), datespan);
        return function(t) {
            zoom.x(sharedTimeScale.domain(ix(t)));
            updateTimeline();
        };
    });
}



function resizeTimeline(width) {
    // TODO: most of this is duplicated in drawTimeline...try to pull out sharable code

    timelineSize.width = width - timelineMargin.left - timelineMargin.right;

    d3.select('svg.timelineRoot')
        .attr("width", timelineSize.width + timelineMargin.left + timelineMargin.right);
    let svgInnerTimeline = d3.select('#timelineInner')
        .attr("width", timelineSize.width)
        .attr("viewBox", "0 0 " + timelineSize.width + " " + timelineSize.height);
    svgInnerTimeline.select("#innertimelinebackground")
        .attr("width", timelineSize.width);
    let svgOuterTimeline = d3.select("#timelineOuter")
        .attr("width", timelineSize.width)
        .attr("viewBox", "0 0 " + timelineSize.width + " " + timelineSize.height);
    svgOuterTimeline.select("#outertimelinebackground")
        .attr("width", timelineSize.width);
    d3.select('#timelineAxes')
        .attr("width", timelineSize.width)
        .attr("viewBox", "0 0 " + timelineSize.width + " " + timelineSize.height);

    let minmax = timelineExtentDates();
    sharedTimeScale.domain(minmax).range([0, timelineSize.width]);

    timelineXAxisMain.scale(sharedTimeScale);
    timelineXAxisDays.scale(sharedTimeScale);
    timelineXAxisWeeks.scale(sharedTimeScale);
    timelineXAxisDayNames.scale(sharedTimeScale);
    timelineXAxisHidden.scale(sharedTimeScale);

    zoom = d3.behavior.zoom()
        .x(sharedTimeScale)
        .scaleExtent([-3000, 3000])
        .on("zoom", function() {
            updateTimeline();
        });
    svgInnerTimeline.call(zoom);

    updateTimeline();
}

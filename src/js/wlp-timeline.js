import {select, event} from "d3-selection";
import {scaleLinear, scaleTime} from "d3-scale";
import {timeFormat} from "d3-time-format";
import {timeSecond, timeMinute, timeHour, timeDay, timeWeek, timeMonth, timeYear} from "d3-time";
import {axisBottom} from "d3-axis";
import {zoom, zoomIdentity} from "d3-zoom";
import {html} from "d3-request";
import {max, extent} from "d3-array";

const rootMargin = 40,
    timelineMargin = {top: 20, right: 20, bottom: 30, left: 20},
    timelineSize = {
        height: 80 - timelineMargin.top - timelineMargin.bottom,
        width: 0
    },
    dataFeeds = [];

let timelineSpan = [new Date('2016-01-01'), new Date('2018-01-02')],
    zoomAxis,
    sharedTimeScale,
    sharedTimeScale0,
    timelineXAxisMain,
    timelineXAxisDays,
    timelineXAxisWeeks,
    timelineXAxisDayNames,
    timelineXAxisHidden;

function makeTimeTickFormat(millisecond, second, minute, hour, day, week, month, year) {
    return (function (date) {
        return (timeSecond(date) < date ? timeFormat(millisecond)
            : timeMinute(date) < date ? timeFormat(second)
                : timeHour(date) < date ? timeFormat(minute)
                    : timeDay(date) < date ? timeFormat(hour)
                        : timeMonth(date) < date ? (timeWeek(date) < date ? timeFormat(day) : timeFormat(week))
                            : timeYear(date) < date ? timeFormat(month)
                                : timeFormat(year))(date);
    });
}

function appendAxisGroup(selection, timeAxis, axisPath, yOffset) {
    selection.append("g")
        .attr("class", axisPath)
        .attr("transform", "translate(0," + yOffset + ")")
        .call(timeAxis);
}

function makeTimelineAxis(scale, format, size, padding) {
    return axisBottom(scale)
        .tickFormat(format)
        .tickSize(size)
        .tickPadding(padding);
}

function setUpCommonTimeAxis() {
    sharedTimeScale = scaleTime().domain(timelineSpan).range([0, timelineSize.width]);
    sharedTimeScale0 = scaleTime().domain(timelineSpan).range([0, timelineSize.width]);

    const customTimeFormat = makeTimeTickFormat(".%L", ":%S", "%_I:%M", "%_I %p", "%b %_d", "%b %_d", "%b", "%Y"),
        customTimeFormatDayNames = makeTimeTickFormat(" ", " ", " ", " ", "%a", "%a", "%a", " ");

    timelineXAxisMain = makeTimelineAxis(sharedTimeScale, customTimeFormat, -timelineSize.height, 6);
    timelineXAxisDayNames = makeTimelineAxis(sharedTimeScale, customTimeFormatDayNames, -timelineSize.height, 18);
    timelineXAxisDays = makeTimelineAxis(sharedTimeScale, "", -timelineSize.height, 0).ticks(timeDay.every(1));
    timelineXAxisWeeks = makeTimelineAxis(sharedTimeScale, "", -timelineSize.height, 0).ticks(timeWeek.every(1));
    timelineXAxisHidden = makeTimelineAxis(sharedTimeScale, "", 0, 0).ticks(timeYear.every(1));
}

function timelineExtentDates() {
    let minDate = sharedTimeScale.invert(0),
        maxDate = sharedTimeScale.invert(timelineSize.width);
    return [minDate, maxDate];
}
function timelineSpanInDays() {
    let dates = timelineExtentDates();
    return (dates[1].getTime() - dates[0].getTime()) / 1000 / 3600 / 24;
}

function resetTimeAxis(axisPath, axisFunction, visibleMaxDays) {
    let svgAxesTimeline = select('#timelineAxes');
    if (visibleMaxDays > 0 && timelineSpanInDays() > visibleMaxDays) {
        svgAxesTimeline.select(axisPath).call(timelineXAxisHidden);
    } else {
        svgAxesTimeline.select(axisPath).call(axisFunction);
    }
}

function updateTimeAxes() {
    resetTimeAxis(".axis-x.main-axis", timelineXAxisMain, 0);
    resetTimeAxis(".axis-x.day-names-axis", timelineXAxisDayNames, 60);
    resetTimeAxis(".axis-x.days-axis", timelineXAxisDays, 60);
    resetTimeAxis(".axis-x.weeks-axis", timelineXAxisWeeks, 60);
}

function zoomed() {
    const t = event.transform;
    sharedTimeScale.domain(t.rescaleX(sharedTimeScale0).domain());
    updateTimeAxes();
    updateFeed(dataFeeds[0]);

}

// https://github.com/d3/d3-zoom
// https://bl.ocks.org/mbostock/db6b4335bf1662b413e7968910104f0f
// https://bl.ocks.org/mbostock/431a331294d2b5ddd33f947cf4c81319
function resetTimelineSpan(timespan) {
    select('#timelineInner').transition()
      .duration(750)
//    .call(zoomAxis.transform, zoomIdentity);
      .call(zoomAxis.transform, zoomIdentity
          .scale(timelineSize.width / (sharedTimeScale0(timespan[1]) - sharedTimeScale0(timespan[0])))
          .translate(-sharedTimeScale0(timespan[0]), 0));
}

function makeTimeline(domElementID, width) {

    timelineSize.width = width - timelineMargin.left - timelineMargin.right;

    zoomAxis = zoom()
        .scaleExtent([1, 64])
        .translateExtent([[0, 0], [timelineSize.width, timelineSize.height]])
        .extent([[0, 0], [timelineSize.width, timelineSize.height]])
        .on("zoom", zoomed);

     const root = select(domElementID).append("div")
        .attr("id", "timelineRootDiv")
        .style("top", rootMargin + "px")
        .style("bottom", rootMargin + "px")
        .style("left", rootMargin + "px")
        .style("right", rootMargin + "px"),

        rightDiv = root.append("div")
        .attr("id", "timelineRightDiv")
        .style("position", "absolute")
        .style("top", "8px")
        .style("left", (timelineSize.width + timelineMargin.left + timelineMargin.right - 3) + "px"),

        svgRootTimeline = root.append("svg")
        .attr("id", "timelineRootSVG")
        .attr("width", timelineSize.width + timelineMargin.left + timelineMargin.right)
        .attr("height", timelineSize.height + timelineMargin.top / 2 + timelineMargin.bottom),

        svgAxesTimeline = svgRootTimeline.append("g")
        .attr("id", "timelineAxes")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top / 2 + ")"),

        svgInnerTimeline = svgRootTimeline.append("svg")
        .attr("id", "timelineInner")
        .attr("vector-effect", "non-scaling-stroke")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height)
        .attr("x", timelineMargin.left)
        .attr("y", timelineMargin.top / 2)
        .attr("viewBox", "0 0 " + timelineSize.width + " " + timelineSize.height)
        .call(zoomAxis),

        svgOuterTimeline = svgRootTimeline.append("g")
        .attr("id", "timelineOuter")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top / 2 + ")");

    setUpCommonTimeAxis();

    appendAxisGroup(svgAxesTimeline, timelineXAxisMain, "axis-x main-axis", timelineSize.height);
    appendAxisGroup(svgAxesTimeline, timelineXAxisDayNames, "axis-x day-names-axis", timelineSize.height);
    appendAxisGroup(svgAxesTimeline, timelineXAxisDays, "axis-x days-axis", timelineSize.height);
    appendAxisGroup(svgAxesTimeline, timelineXAxisWeeks, "axis-x weeks-axis", timelineSize.height);

    updateTimeAxes();

    svgInnerTimeline.append("rect")
        .attr("id", "innertimelinebackground")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height);

    svgOuterTimeline.append("rect")
        .attr("id", "outertimelinebackground")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height);

    function loadSVG(svgData) {
        let rightSVG = rightDiv.append("svg")
            .attr("id", "resetTimelineSpan")
            .attr("class", "zoomButton")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 28)
            .attr("height", 28)
            .attr("viewBox", "0 0 126.308 148.41");
        select(svgData).selectAll("path").each(function () {
            let node = rightSVG.node();
            node.appendChild(this.cloneNode(true));
        });
        rightSVG
            .on("click", function () {
                resetTimelineSpan(timelineSpan);
            });
    }
    html("build/zoom_reset.svg", loadSVG);
}

function updateFeed(feed) {
    const maxMeasurement = max(feed.data, d => d.measurementValue);
    const measurementScale = scaleLinear().range([timelineSize.height, 0]).domain([0, maxMeasurement]);
    const measurements = select('#'+feed.feedInfo.feedId).selectAll('rect').data(feed.data);

    measurements.enter().append('rect')
        .attr("fill", "#555") // static attribute applied to newly added data
        .merge(measurements)  // merge causes below to be applied to new and existing data
        .attr("x", function (d) {
            return sharedTimeScale(d.timestamp);
        })
        .attr("y", function (d) {
            return measurementScale(d.measurementValue);
        })
        .attr("width", function (d) {
            return sharedTimeScale(timeDay.offset(d.timestamp)) - sharedTimeScale(d.timestamp) - 1;
        })
        .attr("height", function (d) {
            return timelineSize.height - measurementScale(d.measurementValue);
        });
    measurements.exit().remove();
}

function addFeed(feed) {
    dataFeeds.push(feed);

    select('#timelineInner').append('g').attr('id', feed.feedInfo.feedId);

    timelineSpan = extent(feed.data, d => d.timestamp);
    sharedTimeScale0 = scaleTime().domain(timelineSpan).range([0, timelineSize.width]);
    resetTimelineSpan(timelineSpan);

    updateFeed(feed);
}


export {makeTimeline, addFeed};

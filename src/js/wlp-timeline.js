import {select, event} from "d3-selection";
import {scaleLinear, scaleTime} from "d3-scale";
import {line, curveLinear} from "d3-shape";
import {format} from "d3-format";
import {timeFormat} from "d3-time-format";
import {timeSecond, timeMinute, timeHour, timeDay, timeWeek, timeMonth, timeYear} from "d3-time";
import {axisBottom, axisLeft} from "d3-axis";
import {zoom, zoomIdentity} from "d3-zoom";
import {max, min, extent} from "d3-array";
import d3Tip from "d3-tip";
// import {html} from "d3-request";

const timelineMargin = {top: 5, right: 25, bottom: 30, left: 100},
    timelineSize = {
        height: 0,
        width: 0
    },
    feedPadding = 20,
    dataFeeds = [],
    feedIndices = {};

let timelineSpan = [new Date('2012-07-01'), new Date('2018-07-01')],
    prettyDateFormat = timeFormat("%a %b %e, %Y"), // prettyTimestampFormat = timeFormat("%a %b %e, %Y at %_I:%M %p")
    feedHeight = (timelineSize.height - feedPadding) - feedPadding,
    selectedFeed = '',
    zoomAxis,
    sharedTimeScale,
    sharedTimeScale0,
    timelineXAxisMain,
    timelineXAxisDays,
    timelineXAxisWeeks,
    timelineXAxisDayNames,
    timelineXAxisHidden,
    dataFeedSelectedRef;


function makeTooltipHtmlRowSingleColumn(label, text) {
    let labelcolon = label === '' ? '' : ':';
    return '<tr>' +
        '<td>' + label + labelcolon + '</td>' +
        '<td colspan="4" class="tabcol1"' + '>' + text + '</td>' +
        '</tr>';
}

// eslint-disable-next-line
const measurementTooltip = d3Tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(d => ('' +
        '<table class="tooltiptable">' +
        makeTooltipHtmlRowSingleColumn('date', prettyDateFormat(d.timestamp)) +
        makeTooltipHtmlRowSingleColumn('value', d.measurementValue > 0. ? d.measurementValue : 'Missing') +
        '</table>')
    );

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

function filterByDateRange(d) {
    const timelineMinMax = timelineExtentDates();
    return d.timestamp > timelineMinMax[0] && d.timestamp < timelineMinMax[1];
}

function updateFeed(feed) {

    const filteredData = feed.data.filter(d => (filterByDateRange(d) && d.measurementValue > 0)),
        filteredTrendData = feed.trendData.filter(d => (filterByDateRange(d) && d.measurementValue > 0)),
        maxMeasurement = max(filteredData, d => d.measurementValue),
        minMeasurement = min(filteredData, d => d.measurementValue),
        yBase = feedPadding * (feedIndices[feed.feedInfo.feedId] + 1) + feedHeight * feedIndices[feed.feedInfo.feedId],
        yTickFormat = (maxMeasurement > 1000) ? ".2s" : ".3",
        measurementScale = scaleLinear().range([feedHeight, 0]).domain([minMeasurement, maxMeasurement]),
        baselineDataY = [yBase, yBase + feedHeight],
        labelData = [yBase + feedHeight],
        baseLine = select('#baseLine' + feed.feedInfo.feedId).selectAll('line.baseline').data(baselineDataY),
        label = select('#label' + feed.feedInfo.feedId).selectAll('text').data(labelData),
        measurements = select('#data' + feed.feedInfo.feedId).selectAll('circle').data(filteredData),
        trendLine = select('#trend' + feed.feedInfo.feedId).selectAll('path').data([filteredTrendData]),
        yAxis = select("#yAxis" + feed.feedInfo.feedId),
        yAxisSettings = axisLeft(measurementScale)
            .tickSize(-4)
            .tickFormat(format(yTickFormat))
            .ticks(5)
            .tickPadding(5);

    baseLine.enter().append('line')
        .attr('class', 'baseline')
        .attr("x1", 0)
        .attr("x2", timelineSize.width)
        .attr("stroke", "#eee")
        .attr("stroke-width", 1)
        .merge(baseLine)
        .attr("y1", d => d)
        .attr("y2", d => d);
    baseLine.exit().remove();

    label.enter().append('text')
        .attr("class", "feedLabel")
        .attr('text-anchor', 'end')
        .attr("x", -35)
        .on('click', function () {
                selectedFeed = feed.feedInfo.feedId;
                select('#timelineOuter').selectAll('text.selected').classed('selected', false);
                select(this).classed('selected', true);
                select('#timelineInner').selectAll('circle.selected').classed('selected', false);
                select('#timelineInner').selectAll('path.selected').classed('selected', false);
                select('#data' + feed.feedInfo.feedId).selectAll('circle').classed('selected', true);
                select('#trend' + feed.feedInfo.feedId).selectAll('path').classed('selected', true);
                dataFeedSelectedRef(feed);
            }
        )
        .merge(label)
        .attr("y", d => (d - feedHeight * 0.5))
        .text(feed.feedInfo.measurementLabel);
    label.exit().remove();

    measurements.enter().append('circle')
        .merge(measurements)  // merge causes below to be applied to new and existing data
        .classed('selected', feed.feedInfo.feedId === selectedFeed)
        .on('mouseover', function (d) {
            return measurementTooltip.show(d);
        })
        .on('mouseleave', function (d) {
            return measurementTooltip.hide(d);
        })
        .attr("cx", function (d) {
            return sharedTimeScale(d.timestamp);
        })
        .attr("cy", function (d) {
            return measurementScale(d.measurementValue) + yBase;
        });
    measurements.exit().remove();

    let interpLine = line()
        .x(function (d) {
            return sharedTimeScale(d.timestamp);
        })
        .y(function (d) {
            return measurementScale(d.measurementValue) + yBase;
        })
        .curve(curveLinear);

    trendLine.enter().append('path')
        .merge(trendLine)
        .classed('selected', feed.feedInfo.feedId === selectedFeed)
        .attr("d", d => interpLine(d));
    trendLine.exit().remove();

    yAxis.attr("transform", "translate(" + timelineMargin.left + "," + (timelineMargin.top / 2 + yBase) + ")");

    yAxis.select("g.axis-y")
        .call(yAxisSettings);

}

// https://github.com/d3/d3-zoom
// https://bl.ocks.org/mbostock/db6b4335bf1662b413e7968910104f0f
// https://bl.ocks.org/mbostock/431a331294d2b5ddd33f947cf4c81319
function resetTimelineSpan(timespan) {
    select('#timelineInner').transition()
        .duration(450)
        .call(zoomAxis.transform, zoomIdentity
            .scale(timelineSize.width / (sharedTimeScale0(timespan[1]) - sharedTimeScale0(timespan[0])))
            .translate(-sharedTimeScale0(timespan[0]), 0));
}

function addFeed(feed) {
    dataFeeds.push(feed);

    const feedIndex = Object.keys(feedIndices).length,
        newTimelineSpan = extent(feed.data, d => d.timestamp),
        yAxis = select("#timelineRootSVG").append("g");

    select('#timelineInner').append('g').attr('id', 'data' + feed.feedInfo.feedId);
    select('#timelineInner').append('g').attr('id', 'trend' + feed.feedInfo.feedId);
    select('#timelineInner').append('g').attr('id', 'baseLine' + feed.feedInfo.feedId);
    select('#timelineOuter').append('g')
        .attr('id', 'label' + feed.feedInfo.feedId)
        .attr('pointer-events', 'auto');

    feedIndices[feed.feedInfo.feedId] = feedIndex;
    timelineSpan = dataFeeds.length === 0 ? newTimelineSpan : [Math.min(timelineSpan[0], newTimelineSpan[0]), Math.max(timelineSpan[1], newTimelineSpan[1])];
    sharedTimeScale0 = scaleTime().domain(timelineSpan).range([0, timelineSize.width]);
    resetTimelineSpan(timelineSpan);

    feedHeight = (timelineSize.height - feedPadding) / Object.keys(feedIndices).length - feedPadding;

    yAxis
        .attr("id", "yAxis" + feed.feedInfo.feedId)
        .attr("pointer-events", "none");

    yAxis.append("g")
        .attr("class", "axis-y");

    updateFeed(feed);
}

function zoomed() {
    const t = event.transform;
    sharedTimeScale.domain(t.rescaleX(sharedTimeScale0).domain());
    updateTimeAxes();
    dataFeeds.forEach(d => updateFeed(d));
}

function makeTimeline(domElementID, width, height, dataFeedSelected) {
    dataFeedSelectedRef = dataFeedSelected;

    timelineSize.width = width - timelineMargin.left - timelineMargin.right;
    timelineSize.height = height - timelineMargin.top - timelineMargin.bottom;

    zoomAxis = zoom()
        .scaleExtent([1, 1000])
        .translateExtent([[0, 0], [timelineSize.width, timelineSize.height]])
        .extent([[0, 0], [timelineSize.width, timelineSize.height]])
        .on("zoom", zoomed);

    const container = select(domElementID).append("div").attr("id", "timelineContainer"),
        root = container.append("div")
            .attr("id", "timelineRootDiv"),
        svgRootTimeline = root.append("svg")
            .attr("id", "timelineRootSVG")
            .attr("width", timelineSize.width + timelineMargin.left + timelineMargin.right + 35)
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
            .call(zoomAxis)
            .call(measurementTooltip),
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

}


export {makeTimeline, addFeed, resetTimelineSpan};

import {select, event} from "d3-selection";
import {scaleTime} from "d3-scale";
import {timeFormat} from "d3-time-format";
import {timeSecond, timeMinute, timeHour, timeDay, timeWeek, timeMonth, timeYear} from "d3-time";
import {axisBottom} from "d3-axis";
import {zoom} from "d3-zoom";

const minTimelineDate = new Date('2016-01-01'),
    maxTimelineDate = new Date('2018-01-02'),
    rootMargin = 40,
    timelineMargin = {top: 20, right: 20, bottom: 30, left: 20},
    timelineSize = {
        height: 70 - timelineMargin.top - timelineMargin.bottom,
        width: 0
    };

let sharedTimeScale,
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
    sharedTimeScale = scaleTime().domain([minTimelineDate, maxTimelineDate]).range([0, timelineSize.width]);
    sharedTimeScale0 = scaleTime().domain([minTimelineDate, maxTimelineDate]).range([0, timelineSize.width]);

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

function makeTimeline(domElementID, width) {

    timelineSize.width = width - timelineMargin.left - timelineMargin.right;

    function zoomed() {
        const t = event.transform;
        sharedTimeScale.domain(t.rescaleX(sharedTimeScale0).domain());
        updateTimeAxes();
    }

    const zoomAxis = zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [timelineSize.width, timelineSize.height]])
        .extent([[0, 0], [timelineSize.width, timelineSize.height]])
        .on("zoom", zoomed),

        root = select(domElementID).append("div")
        .attr("id", "timelineRootDiv")
        .style("top", rootMargin + "px")
        .style("bottom", rootMargin + "px")
        .style("left", rootMargin + "px")
        .style("right", rootMargin + "px"),

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

}

export default makeTimeline;

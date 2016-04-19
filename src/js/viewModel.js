
export default function viewModel() {

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

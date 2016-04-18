export {drawTimeline, addData} from "./src/js/timeline";
// I don't want to expose viewModel on public interface, but I don't know how else
// to do set things up
export {default as viewModel} from "./src/js/viewModel";
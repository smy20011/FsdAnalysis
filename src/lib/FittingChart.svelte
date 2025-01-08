<script lang="ts">
    import { fit_fsd_data, type ExpCurve } from "./fsd_data";
    import { fsd_data_to_fit } from "./store.svelte";
    import * as Plot from "@observablehq/plot";
    import * as _ from "lodash";

    let div: HTMLElement | undefined = $state();
    let selected_data = fsd_data_to_fit();
    let fsd_date: Date | null = $state(null);

    $effect(() => {
        fit_fsd_data(selected_data.data).then((fit_data) => {
            if (!fit_data) {
                return;
            }
            let curve = fit_data;
            fsd_date = curve.fsdDate;
            div?.firstChild?.remove();
            div?.append(Plot.plot({
                marks: [
                    Plot.line(selected_data.data, {x: "min_date", y: "mttf"}),
                    Plot.line(_.zip(curve.newX, curve.pred).map(([x, y]) => ({x: new Date(x ?? 0), y})), {"x": "x", "y":"y"})
                ]
            }));
        });
    });
</script>

<div>
    <div bind:this={div} role="img" style="place-items: center"></div>
    <div>Fsd Date: {fsd_date?.toDateString()}</div>
</div>
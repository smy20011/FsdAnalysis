<script lang="ts">
    import {
        aggregate_data,
        fetch_fsd_data,
        fit_fsd_data,
        type FsdData,
    } from "./fsd_data";
    import * as Plot from "@observablehq/plot";
    import * as _ from "lodash";
    import "../app.css";

    let div: HTMLElement | undefined = $state();
    let fsd_data: FsdData[] = $state([]);
    let fsd_date: Date | null = $state(null);
    let agg_method: "sum" | "best" = $state("sum");
    let agg_data = $derived.by(() => aggregate_data(fsd_data, agg_method));
    let yoy_rate = $state(0);

    $effect(() => {
        fetch_fsd_data().then((d) => (fsd_data = d));
    });

    $effect(() => {
        fit_fsd_data(agg_data).then((fit_data) => {
            if (!fit_data) {
                return;
            }
            let curve = _.zip(fit_data.newX, fit_data.pred).map(([x, y]) => ({
                x: new Date(x ?? 0),
                y,
            }));
            yoy_rate = Math.exp(365 * 1000 * 3600 * 24 * fit_data.b);
            fsd_date = fit_data.fsdDate;
            div?.firstChild?.remove();
            div?.append(
                Plot.plot({
                    inset: 10,
                    grid: true,
                    x: { label: "Release Date" },
                    y: { label: "Mean Time Between Failure" },
                    width: 800,
                    height: 600,
                    style: "margin: auto",
                    marks: [
                        Plot.line(agg_data, {
                            x: "min_date",
                            y: "mttf",
                            stroke: "lightblue",
                            strokeWidth: 5,
                        }),
                        Plot.dot(agg_data, {
                            x: "min_date",
                            y: "mttf",
                            tip: true,
                            fill: "blue",
                        }),
                        Plot.text(agg_data, {
                            x: "min_date",
                            y: "mttf",
                            text: "version",
                            dy: -10,
                        }),
                        Plot.line(curve, {
                            x: "x",
                            y: "y",
                            strokeDasharray: 3,
                            stroke: "grey",
                        }),
                    ],
                }),
            );
        });
    });
</script>

<div class="p-6">
    <div bind:this={div} role="img" class="items-center"></div>
    <div>
        <label for="method">Aggregation Method: </label>
        <select name="method" id="method" bind:value={agg_method}>
            <option value="sum">Sum</option>
            <option value="best">Best</option>
        </select>
    </div>

    <div>Fsd Date: {fsd_date?.toDateString()}</div>
    <div>Yoy Improvement Rate: {Math.round((yoy_rate - 1) * 100)} %</div>
</div>

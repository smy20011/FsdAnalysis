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
    let mttf_target = $state(17000);

    $effect(() => {
        fetch_fsd_data().then((d) => (fsd_data = d));
    });

    $effect(() => {
        let fit_data = fit_fsd_data(agg_data, mttf_target);
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
                height: 400,
                style: {
                    margin: "auto",
                    width: "100%",
                },
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
</script>

<div
    class="m-6 bg-slate-200 rounded-md p-6 max-w-7xl mx-auto py-24 text-center"
>
    <div class="text-3xl font-bold text-gray-900 sm:text-4xl">
        Tesla Full Self Drive Data & Prediction
    </div>
    <div class="my-10 flex flex-row flex-wrap">
        <div class="mx-auto max-w-xs lg:gap-y-4 gap-y-1 min-w-xs">
            <div
                class="order-first font-semibold tracking-tight text-gray-900 text-3xl"
            >
                <span>{fsd_date?.toDateString()}</span>
            </div>
            <div class="text-base leading-7 text-gray-600">
                Date When MTTF Reach
                <input
                    type="text"
                    bind:value={mttf_target}
                    class="outline-none bg-transparent w-14 inline-block border-b-black border-b text-center"
                />
            </div>
        </div>
        <div class="mx-auto max-w-xs lg:gap-y-4 gap-y-1">
            <div
                class="order-first font-semibold tracking-tight text-gray-900 text-3xl"
            >
                <span>{Math.round((yoy_rate - 1) * 100)} %</span>
            </div>
            <div class="text-base leading-7 text-gray-600">
                Year over Year Improvement Rate:
            </div>
        </div>

        <div class="mx-auto max-w-xs lg:gap-y-4 gap-y-1">
            <div class="inline-flex items-center rounded-md bg-slate-200 p-1.5">
                {#each ["Sum", "Best"] as option}
                    <button
                        class={"rounded px-3 py-1 text-xs font-medium text-black shadow-card hover:bg-white hover:shadow-card " +
                            (agg_method === option.toLocaleLowerCase()
                                ? "bg-white"
                                : "")}
                        onclick={() =>
                            (agg_method = option.toLocaleLowerCase() as any)}
                    >
                        {option}
                    </button>
                {/each}
            </div>
            <div class="text-base leading-7 text-gray-600">
                Sub Version Aggregation Method
            </div>
        </div>
    </div>
    <div bind:this={div} role="img" class=""></div>
</div>

<script lang="ts">
  import * as _ from "lodash";
  import { aggregate_data, fetch_fsd_data, type FsdData } from "./fsd_data";
  import { fsd_data_to_fit } from "./store.svelte";

  let aggMethod: "sum" | "best" = $state("sum");
  let fsdData: FsdData[] = $state([]);
  let aggregatedFsdData = $derived.by(() => aggregate_data(fsdData, aggMethod));
  let fitData = fsd_data_to_fit();
  let checked: boolean[] = $state([]);

  $effect(() => {
    fetch_fsd_data().then((data) => {
      fsdData = data;
    });
  });

  $effect(() => {
    checked = Array(aggregatedFsdData.length).fill(true);
  });

  $effect(() => {
    let selected_fsd_data = aggregatedFsdData.filter((_, i) => checked[i]);
    fitData.data = selected_fsd_data;
  });

  function mttf_string(data: FsdData) {
    if (data.mttf) {
      return `${Math.round(data.mttf)}`;
    }
    const estimate = Math.round(data.city_miles / 1.5);
    return `${estimate} (Estimate)`;
  }
</script>

<label for="method">Aggregation Method: </label>
<select name="method" id="method" bind:value={aggMethod}>
    <option value="sum">Sum</option>
    <option value="best">Best</option>
</select>

<table>
  <thead>
    <tr>
      <th>Version</th>
      <th>Release Date</th>
      <th>MTTF (Or Estimation)</th>
      <th>Included</th>
    </tr>
  </thead>
  <tbody>
    {#each aggregatedFsdData as data, i}
      <tr>
        <th>{data.version}</th>
        <th>{data.min_date.toDateString()}</th>
        <th>{mttf_string(data)}</th>
        <th><input type="checkbox" bind:checked={checked[i]} /></th>
      </tr>
    {/each}
  </tbody>
</table>

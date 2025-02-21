import * as _ from "lodash";
import regression from "regression";

export interface FsdData {
  version: string;
  min_date: Date;
  success_rate: number;
  runs: number;
  failure: number;
  city_miles: number;
  mttf: number;
}

export async function fetch_fsd_data(): Promise<FsdData[]> {
  const response = await fetch(
    "https://raw.githubusercontent.com/smy20011/ScrapingFsd/refs/heads/main/extracted/latest.json")
  const json = await response.json();

  return json.map((data: any) => ({
    ...data,
    min_date: new Date(data['min_date']),
  }))
}

export interface ExpCurve {
  a: number,
  b: number,
  newX: number[],
  pred: number[],
  fsdDate: Date,
}

export function aggregate_data(data: FsdData[], aggregation_method: "sum" | "best"): FsdData[] {
  let aggregated: FsdData[] = _.chain(data)
    .groupBy(d => d.version.split(".").slice(0, 2).join("."))
    .map((values, version) => {
      if (aggregation_method === "sum") {
        const total_miles = _.sum(values.map(v => v.city_miles));
        const total_failure = _.sum(values.map(v => Math.round(v.runs * (1 - v.success_rate))));
        const runs = _.sum(values.map(v => v.runs));
        const min_date = _.min(values.map(v => v.min_date))!!;

        return {
          version,
          min_date,
          success_rate: 1 - total_failure * 1.0 / runs,
          runs,
          failure: total_failure,
          city_miles: total_miles,
          mttf: total_miles / total_failure
        }
      } else {
        let filtered = values.filter(d => d.failure >= 5);
        return _.maxBy(filtered, d => d.mttf);
      }
    })
    .filter(d => d !== undefined)
    .filter(d => d.failure > 5)
    .sortBy(d => d.min_date)
    .value();
  return aggregated;
}

export function fit_fsd_data(data: FsdData[], mttf_target: number): ExpCurve | null {
  let x = data.map(d => d.min_date.getTime());
  let minX = _.min(x)!!;
  let maxX = _.max(x)!!;
  let y = data.map(d => d.mttf);
  if (x.length == 0 || y.length == 0) {
    return null;
  }
  const result = regression.exponential(_.zip(x, y) as [number, number][], { precision: 30 });
  const [a, b] = result.equation;
  const newX = _.range(minX, maxX * 1.02, (maxX * 1.02 - minX) / 50);
  const pred = newX.map((x) => result.predict(x)[1]);
  const fsdDate = (Math.log(mttf_target) - Math.log(a)) / b;
  let fit: ExpCurve = {
    a, b,
    newX,
    pred,
    fsdDate: new Date(fsdDate),
  };
  return fit;
}

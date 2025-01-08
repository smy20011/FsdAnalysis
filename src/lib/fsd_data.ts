import * as _ from "lodash";
import { WebR } from "webr";

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
  .value();
  return aggregated;
}

export async function fit_fsd_data(data: FsdData[]): Promise<ExpCurve | null> {
  let x = data.map(d => d.min_date.getTime());
  let y = data.map(d => d.mttf);
  if (x.length == 0 || y.length == 0) {
    return null;
  }
  const webR = new WebR();
  await webR.init();
  const r_code = `
  x <- c(${x.join(",")})
  y <- c(${y.join(",")})
  y_log <- log(y)
  linear_model <- lm(y_log ~ x)
  b_est <- coef(linear_model)[2]
  a_est <- exp(coef(linear_model)[1])
  fsd_day <- (log(17000) - log(a_est)) / b_est
  new_x <- seq(from=min(x), to=max(x) * 1.01, length.out=50)
  new_y <- a_est * exp(b_est * new_x)
  list(a_est, b_est, fsd_day, new_x, new_y)
  `;
  console.log(r_code);
  const result = await webR.evalR(r_code);
  const result_js: any = await result.toJs();
  const [a, b, [fsdDate], newX, pred] = result_js.values.map((i: any) => i.values);
  let fit: ExpCurve = {
    a, b,
    newX,
    pred,
    fsdDate: new Date(fsdDate),
  };
  return fit;
}

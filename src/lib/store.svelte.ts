import { type FsdData } from "./fsd_data";

let _selected_fsd_data: FsdData[] = $state([]);

export function fsd_data_to_fit() {
  return {
    get data() {
      return _selected_fsd_data;
    },
    set data(value: FsdData[]) {
      _selected_fsd_data = value;
    }
  }
}

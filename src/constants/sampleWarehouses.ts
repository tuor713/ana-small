import { SampleWarehouse } from "../types";

export const SAMPLE_WAREHOUSES: SampleWarehouse[] = [
  {
    id: "SAMPLE-4",
    name: "Meteorite Landings",
    description:
      "An extensive dataset of meteorite falls and finds across the globe in DuckDB table `meteorite`, including detailed information about their mass, composition, classification, and discovery circumstances.",
    schema: "main",
  },
  {
    id: "TRINO-RISK",
    name: "Market Risk",
    description:
      "A sample database of market risk data for a financial institution particularly risk on individual positions and account rollup data. The data is in Trino catalog `memory`, schema `default` with tables `risk` and `account`.",
    schema: "default",
  },
];

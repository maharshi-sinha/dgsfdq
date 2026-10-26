export interface ForecastPointDTO {
  start_time: string;
  generation_mw: number;
}

export interface ForecastAtGateDTO {
  publish_time: string;
  delivery_date: string;
  points: ForecastPointDTO[];
}
